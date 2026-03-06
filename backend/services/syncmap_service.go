package services

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"singxd/db"
	"singxd/db/postgres"
	"singxd/db/s3"
	"singxd/types"
)

type SyncMapService struct {
	s3Client *db.S3Client
	db       *gorm.DB
}

func NewSyncMapService(s3Client *db.S3Client, db *gorm.DB) *SyncMapService {
	return &SyncMapService{
		s3Client: s3Client,
		db:       db,
	}
}

// =========================================================
// Separate Audio

type SeparateAudioResult struct {
	VocalsURL       string
	InstrumentalURL string
	SessionID       string
}

func (s *SyncMapService) SeparateAudio(ctx context.Context, file *multipart.FileHeader) (SeparateAudioResult, error) {
	fmt.Println("SeparateAudio request received")

	// -------------------------------------------------------------------------
	// Create temp directory and save uploaded file

	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		fmt.Println("Failed to create temp dir:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to create temp directory", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := SaveMultipartFile(file, inputPath); err != nil {
		fmt.Println("Failed to save uploaded file:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to save uploaded file", err)
	}

	// -------------------------------------------------------------------------
	// Look for separation Python script + venv Python binary

	scriptPath, err := filepath.Abs("../ctc/separator.py")
	if err != nil {
		fmt.Println("Failed to resolve script path:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Script path resolution failed", err)
	}

	venvPython := filepath.Join("..", "ctc", ".venv", "bin", "python")
	venvPythonAbs, err := filepath.Abs(venvPython)
	if err != nil {
		fmt.Println("Failed to resolve venv Python path:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Python path resolution failed", err)
	}
	if _, err := os.Stat(venvPythonAbs); err != nil {
		fmt.Println("Python interpreter not found:", venvPythonAbs)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Python interpreter not found", err)
	}

	fmt.Println("Running separator:", scriptPath)
	fmt.Println("Using Python:", venvPythonAbs)

	// -------------------------------------------------------------------------
	// Execute separation script, verify outputs

	cmd := exec.Command(venvPythonAbs, scriptPath, inputPath, tempDir)
	cmd.Env = os.Environ() // ensure PATH, PYTHONPATH exist

	output, err := cmd.CombinedOutput()
	fmt.Println("Python output:\n", string(output))

	if err != nil {
		fmt.Println("Separator failed:", err)
		return SeparateAudioResult{}, NewServiceErrorWithDetails(
			http.StatusInternalServerError,
			"Separation failed",
			string(output),
			err,
		)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	instPath := filepath.Join(tempDir, "inst.wav")

	if _, err := os.Stat(vocalsPath); err != nil {
		fmt.Println("Vocals missing:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Vocals file not generated", err)
	}
	if _, err := os.Stat(instPath); err != nil {
		fmt.Println("Instrumental missing:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Instrumental file not generated", err)
	}

	// -------------------------------------------------------------------------
	// Initialize file uploads

	sessionID := uuid.New().String()

	// -------------------------------------------------------------------------
	// Upload vocals

	vocalsFile, err := os.Open(vocalsPath)
	vocalsKey := fmt.Sprintf("syncmap_temp/%s/vocals.wav", sessionID)
	if err != nil {
		fmt.Println("Failed to open vocals file:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to read vocals file", err)
	}
	defer vocalsFile.Close()
	if err := s.s3Client.UploadFileWithExpiry(ctx, vocalsKey, vocalsFile, 60*24); err != nil {
		fmt.Println("Failed to upload vocals:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to upload vocals", err)
	}

	// -------------------------------------------------------------------------
	// Upload instrumentals

	instFile, err := os.Open(instPath)
	instKey := fmt.Sprintf("syncmap_temp/%s/inst.wav", sessionID)
	if err != nil {
		fmt.Println("Failed to open instrumental file:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to read instrumental file", err)
	}
	defer instFile.Close()
	if err := s.s3Client.UploadFileWithExpiry(ctx, instKey, instFile, 60*24); err != nil {
		fmt.Println("Failed to upload instrumental:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to upload instrumental", err)
	}

	// -------------------------------------------------------------------------
	// Get presigned URLs for client access

	vocalsURL, err := s.s3Client.GetPresignedURL(ctx, vocalsKey, 3600) // 1 hour expiry
	if err != nil {
		fmt.Println("Failed to get vocals URL:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to generate vocals URL", err)
	}
	instURL, err := s.s3Client.GetPresignedURL(ctx, instKey, 3600)
	if err != nil {
		fmt.Println("Failed to get instrumental URL:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to generate instrumental URL", err)
	}

	return SeparateAudioResult{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instURL,
		SessionID:       sessionID,
	}, nil
}

// =========================================================
// Upload Image (background)

const syncmapTempPrefix = "syncmap_temp"
const presignedBackgroundExpirySeconds = 24 * 3600 // 1 day for temp preview

func (s *SyncMapService) UploadImage(ctx context.Context, sessionID string, file *multipart.FileHeader) (string, error) {
	if sessionID == "" {
		return "", NewServiceError(http.StatusBadRequest, "Missing sessionID", nil)
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		return "", NewServiceError(http.StatusBadRequest, "Invalid image type", nil)
	}

	key := fmt.Sprintf("%s/%s/background%s", syncmapTempPrefix, sessionID, ext)
	src, err := file.Open()
	if err != nil {
		return "", NewServiceError(http.StatusInternalServerError, "Failed to read image", err)
	}
	defer src.Close()

	if err := s.s3Client.UploadFile(ctx, key, src); err != nil {
		return "", NewServiceError(http.StatusInternalServerError, "Failed to upload image", err)
	}

	url, err := s.s3Client.GetPresignedURL(ctx, key, int64(presignedBackgroundExpirySeconds))
	if err != nil {
		return "", NewServiceError(http.StatusInternalServerError, "Failed to generate image URL", err)
	}
	return url, nil
}

// =========================================================
// Generate Timings

func (s *SyncMapService) GenerateTimings(ctx context.Context, sessionID string, lyrics string) ([]types.Timing, error) {
	// -------------------------------------------------------------------------
	// Create temp folder

	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		fmt.Println("Failed to create temp dir:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to create temp directory", err)
	}
	defer os.RemoveAll(tempDir)

	// -------------------------------------------------------------------------
	// Download vocals from S3 (use cache in the future)

	vocalsKey := fmt.Sprintf("syncmap_temp/%s/vocals.wav", sessionID)
	vocalsData, err := s.s3Client.DownloadFile(ctx, vocalsKey)
	if err != nil {
		fmt.Println("Failed to download vocals:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to download vocals", err)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	if err := os.WriteFile(vocalsPath, vocalsData, 0644); err != nil {
		fmt.Println("Failed to save vocals:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to save vocals", err)
	}

	// -------------------------------------------------------------------------
	// Save lyrics to temp file

	lyricsPath := filepath.Join(tempDir, "lyrics.txt")

	// Parse the JSON lines array using proper types
	var lines []types.Line
	if err := json.Unmarshal([]byte(lyrics), &lines); err != nil {
		fmt.Println("Failed to parse lyrics JSON:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to parse lyrics", err)
	}

	var allWords []string
	for _, line := range lines {
		for _, word := range line.Words {
			allWords = append(allWords, word.Text)
		}
	}

	lyricsText := strings.Join(allWords, "\n")

	if err := os.WriteFile(lyricsPath, []byte(lyricsText), 0644); err != nil {
		fmt.Println("Failed to save lyrics:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to save lyrics", err)
	}

	// -------------------------------------------------------------------------
	// Find Python script and interpreter

	alignScript, err := filepath.Abs("../ctc/align.py")
	if err != nil {
		fmt.Println("Failed to resolve align script path:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Script path resolution failed", err)
	}

	venvPython, err := filepath.Abs("../ctc/.venv/bin/python")
	if err != nil {
		fmt.Println("Failed to resolve venv Python path:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Python path resolution failed", err)
	}
	if _, err := os.Stat(venvPython); err != nil {
		fmt.Println("Python interpreter not found:", venvPython)
		return nil, NewServiceError(http.StatusInternalServerError, "Python interpreter not found", err)
	}

	// -------------------------------------------------------------------------
	// Execute

	outputJSON := filepath.Join(tempDir, "timings.json")

	fmt.Println("Running alignment script:", alignScript)

	// Run align.py
	cmd := exec.Command(venvPython, alignScript, vocalsPath, lyricsPath, outputJSON)
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	fmt.Println("Align Python output:\n", string(output))

	if err != nil {
		fmt.Println("Alignment failed:", err)
		return nil, NewServiceErrorWithDetails(
			http.StatusInternalServerError,
			"Alignment failed",
			string(output),
			err,
		)
	}

	// -------------------------------------------------------------------------
	// Reformat Output using proper types

	jsonData, err := os.ReadFile(outputJSON)
	if err != nil {
		fmt.Println("Failed to read timings JSON:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to read timings", err)
	}

	var timings []types.Timing
	if err := json.Unmarshal(jsonData, &timings); err != nil {
		fmt.Println("Failed to parse timings JSON:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to parse timings", err)
	}

	return timings, nil
}

// =========================================================
// Get SyncMap by UUID

func (s *SyncMapService) GetByUUID(ctx context.Context, uuid string) (*types.SyncMap, error) {
	if s.db == nil {
		return nil, NewServiceError(http.StatusInternalServerError, "Database not configured", nil)
	}
	return postgres.GetSyncMap(ctx, s.db, uuid)
}

// =========================================================
// Create SyncMap

func (s *SyncMapService) CreateMap(ctx context.Context, sessionID string, syncMap types.SyncMap) (types.SyncMap, error) {
	if s.db == nil {
		return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Database not configured", nil)
	}

	destUUID := syncMap.UUID
	if destUUID == "" {
		destUUID = uuid.New().String()
		syncMap.UUID = destUUID
	}

	if err := s3.CreateSyncMapFolder(ctx, s.s3Client, destUUID); err != nil {
		return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to create syncmap folder", err)
	}

	destKeys, err := s3.ListSyncMapFiles(ctx, s.s3Client, destUUID)
	if err != nil {
		return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to list destination files", err)
	}

	// If destination already has files (e.g. retry after a partial publish),
	// don't try to move again from temp.
	audioKeys := make([]string, 0, len(destKeys))
	destPrefix := s3.SyncMapPrefix(destUUID)
	for _, k := range destKeys {
		if k == destPrefix || strings.HasSuffix(k, "/") {
			continue
		}
		audioKeys = append(audioKeys, k)
	}

	if len(audioKeys) == 0 {
		movedKeys, err := s3.MoveTempToSyncMap(ctx, s.s3Client, sessionID, destUUID)
		if err != nil {
			return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to move audio files", err)
		}
		if len(movedKeys) == 0 {
			return types.SyncMap{}, NewServiceError(http.StatusBadRequest, "No audio files found for session", nil)
		}
		audioKeys = movedKeys
	}

	instKey := findInstKey(audioKeys)
	if instKey == "" {
		return types.SyncMap{}, NewServiceError(http.StatusBadRequest, "No instrumental (inst) audio file found", nil)
	}
	audioURL, err := s.s3Client.GetPresignedURL(ctx, instKey, 3600)
	if err != nil {
		return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to generate audio URL", err)
	}
	syncMap.Settings.AudioURL = &audioURL

	if bgKey := findBackgroundImageKey(audioKeys); bgKey != "" {
		bgURL, err := s.s3Client.GetPresignedURL(ctx, bgKey, 3600)
		if err != nil {
			return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to generate background image URL", err)
		}
		syncMap.Settings.BackgroundImageURL = &bgURL
	}

	if err := postgres.SaveSyncMap(ctx, s.db, syncMap); err != nil {
		return types.SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to save syncmap", err)
	}

	return syncMap, nil
}

func findInstKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.Contains(base, "inst") {
			return k
		}
	}
	return ""
}

func findBackgroundImageKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.HasPrefix(base, "background") {
			return k
		}
	}
	return ""
}
