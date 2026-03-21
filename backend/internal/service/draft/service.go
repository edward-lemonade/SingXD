package draft

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"singxd/internal/storage"
	t "singxd/internal/types"
)

type DraftService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewDraftService(s3Client *S3Client, db *gorm.DB) *DraftService {
	return &DraftService{
		s3Client: s3Client,
		db:       db,
	}
}

const TempExpiryMinutes = 60 * 24
const TempURLMinutes = 60 * 24

// =========================================================
// Python Paths

const PythonScriptsDir = "./internal/service/draft/scripts"
const (
	SeparatorScript = "separator.py"
	AlignScript     = "align.py"
)
const PythonVenv = "./internal/service/draft/scripts/.venv/bin/python"

// =========================================================
// Separate Audio

type SeparateAudioResult struct {
	VocalsURL       string
	InstrumentalURL string
	SessionID       string
}

func (s *DraftService) SeparateAudio(ctx context.Context, file *multipart.FileHeader) (SeparateAudioResult, error) {
	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := storage.SaveMultipartFile(file, inputPath); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("saving uploaded file: %w", err)
	}

	venvPython, scriptPath, err := resolvePythonEnv(SeparatorScript)
	if err != nil {
		return SeparateAudioResult{}, err
	}

	cmd := exec.Command(venvPython, scriptPath, inputPath, tempDir)
	cmd.Env = os.Environ()
	output, err := cmd.CombinedOutput()
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("%w: %s: %w", ErrSeparationFailed, string(output), err)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	instPath := filepath.Join(tempDir, "instrumental.wav")
	if _, err := os.Stat(vocalsPath); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("%w: %w", ErrVocalsNotGenerated, err)
	}
	if _, err := os.Stat(instPath); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("%w: %w", ErrInstrumentalNotGenerated, err)
	}

	sessionID := uuid.New().String()

	vocalsFile, err := os.Open(vocalsPath)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("opening vocals: %w", err)
	}
	defer vocalsFile.Close()
	if _, err := SaveChartTempAudioFile(ctx, s.s3Client, sessionID, "vocals", vocalsFile, TempExpiryMinutes); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("uploading vocals: %w", err)
	}

	instFile, err := os.Open(instPath)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("opening instrumental: %w", err)
	}
	defer instFile.Close()
	if _, err := SaveChartTempAudioFile(ctx, s.s3Client, sessionID, "instrumental", instFile, TempExpiryMinutes); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("uploading instrumental: %w", err)
	}

	vocalsURL, err := GetChartTempAudioFileURL(ctx, s.s3Client, sessionID, "vocals", TempURLMinutes)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("getting vocals url: %w", err)
	}
	instrumentalURL, err := GetChartTempAudioFileURL(ctx, s.s3Client, sessionID, "instrumental", TempURLMinutes)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("getting instrumental url: %w", err)
	}

	return SeparateAudioResult{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instrumentalURL,
		SessionID:       sessionID,
	}, nil
}

// =========================================================
// Upload Background Image

func (s *DraftService) UploadImage(ctx context.Context, sessionID string, file *multipart.FileHeader) (string, error) {
	if sessionID == "" {
		return "", ErrMissingSessionID
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		return "", ErrInvalidImageType
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("opening image: %w", err)
	}
	defer src.Close()

	key, err := SaveChartTempBackgroundImage(ctx, s.s3Client, sessionID, ext, src)
	if err != nil {
		return "", fmt.Errorf("uploading image: %w", err)
	}

	url, err := GetChartTempBackgroundImageURL(ctx, s.s3Client, key, TempURLMinutes)
	if err != nil {
		return "", fmt.Errorf("getting image url: %w", err)
	}
	return url, nil
}

// =========================================================
// Generate Timings

func (s *DraftService) GenerateTimings(ctx context.Context, sessionID string, lyrics string) ([]t.Timing, error) {
	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	vocalsData, err := DownloadChartTempAudioFile(ctx, s.s3Client, sessionID, "vocals")
	if err != nil {
		return nil, fmt.Errorf("downloading vocals session=%s: %w", sessionID, err)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	if err := os.WriteFile(vocalsPath, vocalsData, 0644); err != nil {
		return nil, fmt.Errorf("saving vocals: %w", err)
	}

	var lines []t.Line
	if err := json.Unmarshal([]byte(lyrics), &lines); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrParsingLyrics, err)
	}

	var allWords []string
	for _, line := range lines {
		for _, word := range line.Words {
			allWords = append(allWords, word.Text)
		}
	}

	lyricsPath := filepath.Join(tempDir, "lyrics.txt")
	if err := os.WriteFile(lyricsPath, []byte(strings.Join(allWords, "\n")), 0644); err != nil {
		return nil, fmt.Errorf("saving lyrics: %w", err)
	}

	venvPython, alignScript, err := resolvePythonEnv(AlignScript)
	if err != nil {
		return nil, err
	}

	outputJSON := filepath.Join(tempDir, "timings.json")
	cmd := exec.Command(venvPython, alignScript, vocalsPath, lyricsPath, outputJSON)
	cmd.Env = os.Environ()
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%w: %s: %w", ErrAlignmentFailed, string(output), err)
	}

	jsonData, err := os.ReadFile(outputJSON)
	if err != nil {
		return nil, fmt.Errorf("reading timings output: %w", err)
	}

	var timings []t.Timing
	if err := json.Unmarshal(jsonData, &timings); err != nil {
		return nil, fmt.Errorf("parsing timings: %w", err)
	}

	return timings, nil
}

// =========================================================
// Helpers

func resolvePythonEnv(scriptName string) (pythonBin, scriptPath string, err error) {
	scriptPath = filepath.Join(PythonScriptsDir, scriptName)
	scriptPath, err = filepath.Abs(scriptPath)
	if err != nil {
		return "", "", fmt.Errorf("resolving script path %s: %w", scriptName, err)
	}

	pythonBin, err = filepath.Abs(PythonVenv)
	if err != nil {
		return "", "", fmt.Errorf("resolving python path: %w", err)
	}

	if _, err := os.Stat(pythonBin); err != nil {
		return "", "", fmt.Errorf("%w: %s: %w", ErrPythonInterpreterNotFound, pythonBin, err)
	}

	return pythonBin, scriptPath, nil
}
