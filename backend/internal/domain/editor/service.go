package editor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"singxd/internal/apperror"
	chartpkg "singxd/internal/domain/chart"
	"singxd/internal/storage"
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

const PythonScriptsDir = "./internal/service/editor/scripts"
const (
	SeparatorScript = "separator.py"
	AlignScript     = "align.py"
)
const PythonVenv = "./internal/service/editor/scripts/.venv/bin/python"

// =========================================================
// Jobs

func (s *EditorService) SeparateAudio(ctx context.Context, draftUUID string, file *multipart.FileHeader) (vocals, instrumental string, err error) {
	if draftUUID == "" {
		return "", "", ErrMissingUUID
	}

	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", "", apperror.Internal("failed to prepare separation workspace", err)
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := storage.SaveMultipartFile(file, inputPath); err != nil {
		return "", "", apperror.Internal("failed to save uploaded file", err)
	}

	venvPython, scriptPath, err := resolvePythonEnv(SeparatorScript)
	if err != nil {
		return "", "", err
	}

	verbose := false
	var buf bytes.Buffer
	cmd := exec.Command(venvPython, scriptPath, inputPath, tempDir)
	cmd.Env = append(os.Environ(), "PYTHONUNBUFFERED=1")

	if verbose {
		cmd.Stdout = io.MultiWriter(os.Stdout, &buf)
		cmd.Stderr = io.MultiWriter(os.Stderr, &buf)
	} else {
		cmd.Stdout = &buf
		cmd.Stderr = &buf
	}

	err = cmd.Run()
	if err != nil {
		return "", "", apperror.Internal("audio separation failed", fmt.Errorf("%s: %w", buf.String(), err))
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	instPath := filepath.Join(tempDir, "instrumental.wav")
	if _, err := os.Stat(vocalsPath); err != nil {
		return "", "", apperror.Internal("vocals file not generated", err)
	}
	if _, err := os.Stat(instPath); err != nil {
		return "", "", apperror.Internal("instrumental file not generated", err)
	}

	vocalsFile, err := os.Open(vocalsPath)
	if err != nil {
		return "", "", apperror.Internal("failed to open vocals", err)
	}
	defer vocalsFile.Close()
	if _, err := saveFile(ctx, s.s3Client, draftUUID, vocalsPrefix, ".wav", vocalsFile, TempExpiryMinutes); err != nil {
		return "", "", apperror.Internal("failed to upload vocals", err)
	}

	instFile, err := os.Open(instPath)
	if err != nil {
		return "", "", apperror.Internal("failed to open instrumental", err)
	}
	defer instFile.Close()
	if _, err := saveFile(ctx, s.s3Client, draftUUID, instrumentalPrefix, ".wav", instFile, TempExpiryMinutes); err != nil {
		return "", "", apperror.Internal("failed to upload instrumental", err)
	}

	vocalsURL, err := getURL(ctx, s.s3Client, draftUUID, vocalsPrefix, TempURLMinutes)
	if err != nil {
		return "", "", apperror.Internal("failed to get vocals url", err)
	}
	instrumentalURL, err := getURL(ctx, s.s3Client, draftUUID, instrumentalPrefix, TempURLMinutes)
	if err != nil {
		return "", "", apperror.Internal("failed to get instrumental url", err)
	}

	return vocalsURL, instrumentalURL, nil
}

func (s *EditorService) GenerateTimings(ctx context.Context, draftUUID string, lyrics string) ([]chartpkg.Timing, error) {
	if draftUUID == "" {
		return nil, ErrMissingUUID
	}

	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, apperror.Internal("failed to prepare alignment workspace", err)
	}
	defer os.RemoveAll(tempDir)

	vocalsData, err := downloadFile(ctx, s.s3Client, draftUUID, vocalsPrefix)
	if err != nil {
		return nil, apperror.Internal(fmt.Sprintf("failed to download vocals for uuid=%s", draftUUID), err)
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	if err := os.WriteFile(vocalsPath, vocalsData, 0644); err != nil {
		return nil, apperror.Internal("failed to save vocals", err)
	}

	var lines []chartpkg.Line
	if err := json.Unmarshal([]byte(lyrics), &lines); err != nil {
		return nil, apperror.Unprocessable("failed to parse lyrics", err)
	}

	var allWords []string
	for _, line := range lines {
		for _, word := range line.Words {
			allWords = append(allWords, word.Text)
		}
	}

	lyricsPath := filepath.Join(tempDir, "lyrics.txt")
	if err := os.WriteFile(lyricsPath, []byte(strings.Join(allWords, "\n")), 0644); err != nil {
		return nil, apperror.Internal("failed to save lyrics", err)
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
		return nil, apperror.Internal("alignment failed", fmt.Errorf("%s: %w", string(output), err))
	}

	jsonData, err := os.ReadFile(outputJSON)
	if err != nil {
		return nil, apperror.Internal("failed to read timings output", err)
	}

	var timings []chartpkg.Timing
	if err := json.Unmarshal(jsonData, &timings); err != nil {
		return nil, apperror.Internal("failed to parse timings", err)
	}

	return timings, nil
}

// =========================================================
// Uploads

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
		return "", apperror.Internal("failed to open audio", err)
	}
	defer src.Close()

	if _, err = saveFile(ctx, s.s3Client, draftUUID, instrumentalPrefix, ext, src, TempExpiryMinutes); err != nil {
		return "", apperror.Internal("failed to upload instrumental", err)
	}

	url, err := getURL(ctx, s.s3Client, draftUUID, instrumentalPrefix, TempURLMinutes)
	if err != nil {
		return "", apperror.Internal("failed to get instrumental url", err)
	}
	return url, nil
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
		return "", apperror.Internal("failed to open audio", err)
	}
	defer src.Close()

	if _, err = saveFile(ctx, s.s3Client, draftUUID, vocalsPrefix, ext, src, TempExpiryMinutes); err != nil {
		return "", apperror.Internal("failed to upload vocals", err)
	}

	url, err := getURL(ctx, s.s3Client, draftUUID, vocalsPrefix, TempURLMinutes)
	if err != nil {
		return "", apperror.Internal("failed to get vocals url", err)
	}
	return url, nil
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
		return "", apperror.Internal("failed to open image", err)
	}
	defer src.Close()

	if _, err := saveFile(ctx, s.s3Client, draftUUID, backgroundPrefix, ext, src, TempExpiryMinutes); err != nil {
		return "", apperror.Internal("failed to upload image", err)
	}

	url, err := getURL(ctx, s.s3Client, draftUUID, backgroundPrefix, TempURLMinutes)
	if err != nil {
		return "", apperror.Internal("failed to get image url", err)
	}
	return url, nil
}

// =========================================================
// Helpers

func resolvePythonEnv(scriptName string) (pythonBin, scriptPath string, err error) {
	scriptPath = filepath.Join(PythonScriptsDir, scriptName)
	scriptPath, err = filepath.Abs(scriptPath)
	if err != nil {
		return "", "", apperror.Internal(fmt.Sprintf("failed to resolve script path %s", scriptName), err)
	}

	pythonBin, err = filepath.Abs(PythonVenv)
	if err != nil {
		return "", "", apperror.Internal("failed to resolve python path", err)
	}

	if _, err := os.Stat(pythonBin); err != nil {
		return "", "", apperror.Internal(fmt.Sprintf("python interpreter not found: %s", pythonBin), err)
	}

	return pythonBin, scriptPath, nil
}
