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

	"singxd/db"
	"singxd/models"
)

type CreationService struct {
	s3Client *db.S3Client
}

func NewCreationService(s3Client *db.S3Client) *CreationService {
	return &CreationService{s3Client: s3Client}
}

// =========================================================
// Separate Audio

type SeparateAudioResponse struct {
	VocalsURL       string `json:"vocalsUrl"`
	InstrumentalURL string `json:"instrumentalUrl"`
	SessionID       string `json:"sessionId"`
}

func (s *CreationService) SeparateAudio(ctx context.Context, file *multipart.FileHeader) (SeparateAudioResponse, error) {
	fmt.Println("SeparateAudio request received")

	if file == nil {
		return SeparateAudioResponse{}, NewServiceError(http.StatusBadRequest, "No audio file provided", nil)
	}

	// -------------------------------------------------------------------------
	// Create temp directory and save uploaded file

	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		fmt.Println("Failed to create temp dir:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to create temp directory", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := SaveMultipartFile(file, inputPath); err != nil {
		fmt.Println("Failed to save uploaded file:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to save uploaded file", err)
	}

	// -------------------------------------------------------------------------
	// Look for separation Python script + venv Python binary

	scriptPath, err := filepath.Abs("../ctc/separator.py")
	if err != nil {
		fmt.Println("Failed to resolve script path:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Script path resolution failed", err)
	}

	venvPython := filepath.Join("..", "ctc", ".venv", "bin", "python")
	venvPythonAbs, err := filepath.Abs(venvPython)
	if err != nil {
		fmt.Println("Failed to resolve venv Python path:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Python path resolution failed", err)
	}
	if _, err := os.Stat(venvPythonAbs); err != nil {
		fmt.Println("Python interpreter not found:", venvPythonAbs)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Python interpreter not found", err)
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
		return SeparateAudioResponse{}, NewServiceErrorWithDetails(
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
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Vocals file not generated", err)
	}
	if _, err := os.Stat(instPath); err != nil {
		fmt.Println("Instrumental missing:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Instrumental file not generated", err)
	}

	// -------------------------------------------------------------------------
	// Initialize file uploads

	sessionID := uuid.New().String()

	// -------------------------------------------------------------------------
	// Upload vocals

	vocalsFile, err := os.Open(vocalsPath)
	vocalsKey := fmt.Sprintf("creates/%s/vocals.wav", sessionID)
	if err != nil {
		fmt.Println("Failed to open vocals file:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to read vocals file", err)
	}
	defer vocalsFile.Close()
	if err := s.s3Client.UploadFileWithExpiry(ctx, vocalsKey, vocalsFile, 60*24); err != nil {
		fmt.Println("Failed to upload vocals:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to upload vocals", err)
	}

	// -------------------------------------------------------------------------
	// Upload instrumentals

	instFile, err := os.Open(instPath)
	instKey := fmt.Sprintf("creates/%s/inst.wav", sessionID)
	if err != nil {
		fmt.Println("Failed to open instrumental file:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to read instrumental file", err)
	}
	defer instFile.Close()
	if err := s.s3Client.UploadFileWithExpiry(ctx, instKey, instFile, 60*24); err != nil {
		fmt.Println("Failed to upload instrumental:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to upload instrumental", err)
	}

	// -------------------------------------------------------------------------
	// Get presigned URLs for client access

	vocalsURL, err := s.s3Client.GetPresignedURL(ctx, vocalsKey, 3600) // 1 hour expiry
	if err != nil {
		fmt.Println("Failed to get vocals URL:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to generate vocals URL", err)
	}
	instURL, err := s.s3Client.GetPresignedURL(ctx, instKey, 3600)
	if err != nil {
		fmt.Println("Failed to get instrumental URL:", err)
		return SeparateAudioResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to generate instrumental URL", err)
	}

	return SeparateAudioResponse{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instURL,
		SessionID:       sessionID,
	}, nil
}

// =========================================================
// Generate Timings

type GenerateTimingsResponse struct {
	Timings []models.Timing `json:"timings"`
}

func (s *CreationService) GenerateTimings(ctx context.Context, sessionID string, lyrics string) (GenerateTimingsResponse, error) {
	if sessionID == "" || lyrics == "" {
		return GenerateTimingsResponse{}, NewServiceError(http.StatusBadRequest, "Missing sessionID or lyrics", nil)
	}

	// -------------------------------------------------------------------------
	// Create temp folder

	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		fmt.Println("Failed to create temp dir:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to create temp directory", err)
	}
	defer os.RemoveAll(tempDir)

	// -------------------------------------------------------------------------
	// Download vocals from S3 (use cache in the future)

	vocalsKey := fmt.Sprintf("creates/%s/vocals.wav", sessionID)
	vocalsData, err := s.s3Client.DownloadFile(ctx, vocalsKey)
	if err != nil {
		fmt.Println("Failed to download vocals:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to download vocals", err)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	if err := os.WriteFile(vocalsPath, vocalsData, 0644); err != nil {
		fmt.Println("Failed to save vocals:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to save vocals", err)
	}

	// -------------------------------------------------------------------------
	// Save lyrics to temp file

	lyricsPath := filepath.Join(tempDir, "lyrics.txt")

	// Parse the JSON lines array using proper types
	var lines []models.Line
	if err := json.Unmarshal([]byte(lyrics), &lines); err != nil {
		fmt.Println("Failed to parse lyrics JSON:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to parse lyrics", err)
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
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to save lyrics", err)
	}

	// -------------------------------------------------------------------------
	// Find Python script and interpreter

	alignScript, err := filepath.Abs("../ctc/align.py")
	if err != nil {
		fmt.Println("Failed to resolve align script path:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Script path resolution failed", err)
	}

	venvPython, err := filepath.Abs("../ctc/.venv/bin/python")
	if err != nil {
		fmt.Println("Failed to resolve venv Python path:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Python path resolution failed", err)
	}
	if _, err := os.Stat(venvPython); err != nil {
		fmt.Println("Python interpreter not found:", venvPython)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Python interpreter not found", err)
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
		return GenerateTimingsResponse{}, NewServiceErrorWithDetails(
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
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to read timings", err)
	}

	var timings []models.Timing
	if err := json.Unmarshal(jsonData, &timings); err != nil {
		fmt.Println("Failed to parse timings JSON:", err)
		return GenerateTimingsResponse{}, NewServiceError(http.StatusInternalServerError, "Failed to parse timings", err)
	}

	return GenerateTimingsResponse{
		Timings: timings,
	}, nil
}
