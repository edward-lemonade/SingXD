package editor

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"singxd/internal/storage"
	t "singxd/internal/types"
	"strings"
	"time"
)

type S3Client = storage.S3Client

type EditorService struct {
	s3Client *S3Client
}

func NewEditorService(s3Client *S3Client) *EditorService {
	return &EditorService{s3Client: s3Client}
}

const TempExpiryMinutes = 60 * 24
const TempURLMinutes = 60 * 24

const PythonScriptsDir = "./internal/service/draft/scripts"
const (
	SeparatorScript = "separator.py"
	AlignScript     = "align.py"
)
const PythonVenv = "./internal/service/draft/scripts/.venv/bin/python"

// =========================================================
// Jobs

func (s *EditorService) SeparateAudio(ctx context.Context, draftUUID string, file *multipart.FileHeader) (vocals, instrumental string, err error) {
	if draftUUID == "" {
		return "", "", ErrMissingUUID
	}

	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", "", fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := storage.SaveMultipartFile(file, inputPath); err != nil {
		return "", "", fmt.Errorf("saving uploaded file: %w", err)
	}

	venvPython, scriptPath, err := resolvePythonEnv(SeparatorScript)
	if err != nil {
		return "", "", err
	}

	cmd := exec.Command(venvPython, scriptPath, inputPath, tempDir)
	cmd.Env = os.Environ()
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("%w: %s: %w", ErrSeparationFailed, string(output), err)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	instPath := filepath.Join(tempDir, "instrumental.wav")
	if _, err := os.Stat(vocalsPath); err != nil {
		return "", "", fmt.Errorf("%w: %w", ErrVocalsNotGenerated, err)
	}
	if _, err := os.Stat(instPath); err != nil {
		return "", "", fmt.Errorf("%w: %w", ErrInstrumentalNotGenerated, err)
	}

	vocalsFile, err := os.Open(vocalsPath)
	if err != nil {
		return "", "", fmt.Errorf("opening vocals: %w", err)
	}
	defer vocalsFile.Close()
	if _, err := saveFile(ctx, s.s3Client, draftUUID, vocalsPrefix, ".wav", vocalsFile, TempExpiryMinutes); err != nil {
		return "", "", fmt.Errorf("uploading vocals: %w", err)
	}

	instFile, err := os.Open(instPath)
	if err != nil {
		return "", "", fmt.Errorf("opening instrumental: %w", err)
	}
	defer instFile.Close()
	if _, err := saveFile(ctx, s.s3Client, draftUUID, instrumentalPrefix, ".wav", instFile, TempExpiryMinutes); err != nil {
		return "", "", fmt.Errorf("uploading instrumental: %w", err)
	}

	vocalsURL, err := getURL(ctx, s.s3Client, draftUUID, vocalsPrefix, TempURLMinutes)
	if err != nil {
		return "", "", fmt.Errorf("getting vocals url: %w", err)
	}
	instrumentalURL, err := getURL(ctx, s.s3Client, draftUUID, instrumentalPrefix, TempURLMinutes)
	if err != nil {
		return "", "", fmt.Errorf("getting instrumental url: %w", err)
	}

	return vocalsURL, instrumentalURL, nil
}

func (s *EditorService) UploadInstrumental(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
	if draftUUID == "" {
		return "", ErrMissingUUID
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".mp3"
	}
	if !map[string]bool{".mp3": true, ".wav": true}[ext] {
		return "", ErrInvalidAudioType
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("opening audio: %w", err)
	}
	defer src.Close()

	if _, err = saveFile(ctx, s.s3Client, draftUUID, instrumentalPrefix, ext, src, TempExpiryMinutes); err != nil {
		return "", fmt.Errorf("uploading instrumental: %w", err)
	}

	return getURL(ctx, s.s3Client, draftUUID, instrumentalPrefix, TempURLMinutes)
}

func (s *EditorService) UploadVocals(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
	if draftUUID == "" {
		return "", ErrMissingUUID
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".mp3"
	}
	if !map[string]bool{".mp3": true, ".wav": true}[ext] {
		return "", ErrInvalidAudioType
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("opening audio: %w", err)
	}
	defer src.Close()

	if _, err = saveFile(ctx, s.s3Client, draftUUID, vocalsPrefix, ext, src, TempExpiryMinutes); err != nil {
		return "", fmt.Errorf("uploading vocals: %w", err)
	}

	return getURL(ctx, s.s3Client, draftUUID, vocalsPrefix, TempURLMinutes)
}

func (s *EditorService) UploadImage(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
	if draftUUID == "" {
		return "", ErrMissingUUID
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	if !map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}[ext] {
		return "", ErrInvalidImageType
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("opening image: %w", err)
	}
	defer src.Close()

	if _, err := saveFile(ctx, s.s3Client, draftUUID, backgroundPrefix, ext, src, TempExpiryMinutes); err != nil {
		return "", fmt.Errorf("uploading image: %w", err)
	}

	return getURL(ctx, s.s3Client, draftUUID, backgroundPrefix, TempURLMinutes)
}

func (s *EditorService) GenerateTimings(ctx context.Context, draftUUID string, lyrics string) ([]t.Timing, error) {
	if draftUUID == "" {
		return nil, ErrMissingUUID
	}

	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	vocalsData, err := downloadFile(ctx, s.s3Client, draftUUID, vocalsPrefix)
	if err != nil {
		return nil, fmt.Errorf("downloading vocals uuid=%s: %w", draftUUID, err)
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
