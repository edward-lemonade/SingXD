package services

import (
	"context"
	"encoding/json"
	"errors"
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

	"singxd/db/postgres"
	"singxd/db/s3"
	"singxd/types"
)

type SyncMap = types.SyncMap
type Timing = types.Timing
type Line = types.Line

type SyncMapService struct {
	s3Client *s3.S3Client
	db       *gorm.DB
}

func NewSyncMapService(s3Client *s3.S3Client, db *gorm.DB) *SyncMapService {
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
	instPath := filepath.Join(tempDir, "instrumental.wav")

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
	if err != nil {
		fmt.Println("Failed to open vocals file:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to read vocals file", err)
	}
	defer vocalsFile.Close()
	if _, err := s3.SaveSyncMapTempAudioFile(ctx, s.s3Client, sessionID, "vocals", vocalsFile, 60*24); err != nil {
		fmt.Println("Failed to upload vocals:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to upload vocals", err)
	}

	// -------------------------------------------------------------------------
	// Upload instrumentals

	instFile, err := os.Open(instPath)
	if err != nil {
		fmt.Println("Failed to open instrumental file:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to read instrumental file", err)
	}
	defer instFile.Close()
	if _, err := s3.SaveSyncMapTempAudioFile(ctx, s.s3Client, sessionID, "inst", instFile, 60*24); err != nil {
		fmt.Println("Failed to upload instrumental:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to upload instrumental", err)
	}

	// -------------------------------------------------------------------------
	// Get presigned URLs for client access

	vocalsURL, err := s3.GetSyncMapTempAudioFileURL(ctx, s.s3Client, sessionID, "vocals", 3600)
	if err != nil {
		fmt.Println("Failed to get vocals URL:", err)
		return SeparateAudioResult{}, NewServiceError(http.StatusInternalServerError, "Failed to generate vocals URL", err)
	}
	instURL, err := s3.GetSyncMapTempAudioFileURL(ctx, s.s3Client, sessionID, "inst", 3600)
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
// Upload Background Image

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

	src, err := file.Open()
	if err != nil {
		return "", NewServiceError(http.StatusInternalServerError, "Failed to read image", err)
	}
	defer src.Close()

	key, err := s3.SaveSyncMapTempBackgroundImage(ctx, s.s3Client, sessionID, ext, src)
	if err != nil {
		return "", NewServiceError(http.StatusInternalServerError, "Failed to upload image", err)
	}

	// 1 day preview URL for the background image
	const expirySeconds int64 = 24 * 3600
	url, err := s3.GetSyncMapTempBackgroundImageURL(ctx, s.s3Client, key, expirySeconds)
	if err != nil {
		return "", NewServiceError(http.StatusInternalServerError, "Failed to generate image URL", err)
	}
	return url, nil
}

// =========================================================
// Generate Timings

func (s *SyncMapService) GenerateTimings(ctx context.Context, sessionID string, lyrics string) ([]Timing, error) {
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

	vocalsData, err := s3.DownloadSyncMapTempAudioFile(ctx, s.s3Client, sessionID, "vocals")
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
	var lines []Line
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

	var timings []Timing
	if err := json.Unmarshal(jsonData, &timings); err != nil {
		fmt.Println("Failed to parse timings JSON:", err)
		return nil, NewServiceError(http.StatusInternalServerError, "Failed to parse timings", err)
	}

	return timings, nil
}

// =========================================================
// Get SyncMap by UUID

func (s *SyncMapService) GetByUUID(ctx context.Context, uuid string) (*SyncMap, error) {
	if s.db == nil {
		return nil, NewServiceError(http.StatusInternalServerError, "Database not configured", nil)
	}
	return postgres.GetSyncMap(ctx, s.db, uuid)
}

// =========================================================
// Create SyncMap

func (s *SyncMapService) CreateMap(ctx context.Context, sessionID string, syncMap SyncMap) (SyncMap, error) {
	if s.db == nil {
		return SyncMap{}, NewServiceError(http.StatusInternalServerError, "Database not configured", nil)
	}

	destUUID := syncMap.UUID
	if destUUID == "" {
		destUUID = uuid.New().String()
		syncMap.UUID = destUUID
	}

	instKey, bgKey, err := s3.PrepareSyncMapMedia(ctx, s.s3Client, sessionID, destUUID)
	if err != nil {
		switch {
		case errors.Is(err, s3.ErrNoAudioFilesForSession):
			return SyncMap{}, NewServiceError(http.StatusBadRequest, "No audio files found for session", err)
		case errors.Is(err, s3.ErrNoInstrumentalFile):
			return SyncMap{}, NewServiceError(http.StatusBadRequest, "No instrumental (inst) audio file found", err)
		default:
			return SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to prepare syncmap media", err)
		}
	}
	audioURL, err := s3.GetSyncMapMediaURL(ctx, s.s3Client, instKey, 3600)
	if err != nil {
		return SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to generate audio URL", err)
	}
	syncMap.Settings.AudioURL = &audioURL

	if bgKey != nil {
		bgURL, err := s3.GetSyncMapMediaURL(ctx, s.s3Client, *bgKey, 3600)
		if err != nil {
			return SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to generate background image URL", err)
		}
		syncMap.Settings.BackgroundImageURL = &bgURL
	}

	if err := postgres.SaveSyncMap(ctx, s.db, syncMap); err != nil {
		return SyncMap{}, NewServiceError(http.StatusInternalServerError, "Failed to save syncmap", err)
	}

	return syncMap, nil
}
