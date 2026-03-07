package syncmap_draft

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

	t "singxd/services/types"
	"singxd/storage"
)

type SyncMapDraftService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewSyncMapDraftService(s3Client *S3Client, db *gorm.DB) *SyncMapDraftService {
	return &SyncMapDraftService{
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

func (s *SyncMapDraftService) SeparateAudio(ctx context.Context, file *multipart.FileHeader) (SeparateAudioResult, error) {
	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := storage.SaveMultipartFile(file, inputPath); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("saving uploaded file: %w", err)
	}

	venvPython, scriptPath, err := resolvePythonEnv("../ctc/separator.py")
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
	if _, err := SaveSyncMapTempAudioFile(ctx, s.s3Client, sessionID, "vocals", vocalsFile, 60*24); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("uploading vocals: %w", err)
	}

	instFile, err := os.Open(instPath)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("opening instrumental: %w", err)
	}
	defer instFile.Close()
	if _, err := SaveSyncMapTempAudioFile(ctx, s.s3Client, sessionID, "inst", instFile, 60*24); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("uploading instrumental: %w", err)
	}

	vocalsURL, err := GetSyncMapTempAudioFileURL(ctx, s.s3Client, sessionID, "vocals", 3600)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("getting vocals url: %w", err)
	}
	instURL, err := GetSyncMapTempAudioFileURL(ctx, s.s3Client, sessionID, "inst", 3600)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("getting instrumental url: %w", err)
	}

	return SeparateAudioResult{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instURL,
		SessionID:       sessionID,
	}, nil
}

// =========================================================
// Upload Background Image

func (s *SyncMapDraftService) UploadImage(ctx context.Context, sessionID string, file *multipart.FileHeader) (string, error) {
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

	key, err := SaveSyncMapTempBackgroundImage(ctx, s.s3Client, sessionID, ext, src)
	if err != nil {
		return "", fmt.Errorf("uploading image: %w", err)
	}

	url, err := GetSyncMapTempBackgroundImageURL(ctx, s.s3Client, key, 24*3600)
	if err != nil {
		return "", fmt.Errorf("getting image url: %w", err)
	}
	return url, nil
}

// =========================================================
// Generate Timings

func (s *SyncMapDraftService) GenerateTimings(ctx context.Context, sessionID string, lyrics string) ([]t.Timing, error) {
	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	vocalsData, err := DownloadSyncMapTempAudioFile(ctx, s.s3Client, sessionID, "vocals")
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

	venvPython, alignScript, err := resolvePythonEnv("../ctc/align.py")
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

func resolvePythonEnv(scriptRelPath string) (pythonBin, scriptPath string, err error) {
	scriptPath, err = filepath.Abs(scriptRelPath)
	if err != nil {
		return "", "", fmt.Errorf("resolving script path %s: %w", scriptRelPath, err)
	}

	pythonBin, err = filepath.Abs("../ctc/.venv/bin/python")
	if err != nil {
		return "", "", fmt.Errorf("resolving python path: %w", err)
	}
	if _, err := os.Stat(pythonBin); err != nil {
		return "", "", fmt.Errorf("%w: %s: %w", ErrPythonInterpreterNotFound, pythonBin, err)
	}

	return pythonBin, scriptPath, nil
}
