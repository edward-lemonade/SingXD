package draft

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"singxd/internal/storage"
	t "singxd/internal/types"
)

type DraftService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewDraftService(s3Client *S3Client, db *gorm.DB) *DraftService {
	if err := db.AutoMigrate(&DraftRecord{}); err != nil {
		log.Fatal(err)
	}
	if err := AutoMigrate(db); err != nil {
		log.Fatal(err)
	}
	return &DraftService{s3Client: s3Client, db: db}
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
// CRUD

func (s *DraftService) InitDraft(ctx context.Context) (string, error) {
	record, err := initOne(ctx, s.db)
	if err != nil {
		return "", err
	}
	return record.UUID, nil
}

func (s *DraftService) ListDrafts(ctx context.Context, uid string) ([]t.DraftChart, error) {
	records, err := listByUID(ctx, s.db, uid)
	if err != nil {
		return nil, err
	}
	drafts := make([]t.DraftChart, 0, len(records))
	for _, r := range records {
		d, err := r.toDraftChart()
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, d)
	}
	return drafts, nil
}

func (s *DraftService) GetDraft(ctx context.Context, uuid, uid string) (*t.DraftChartWithURLs, error) {
	record, err := findByUUIDAndUID(ctx, s.db, uuid, uid)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}
	d, err := record.toDraftChart()
	if err != nil {
		return nil, err
	}

	instURL, vocalsURL, bgURL, err := getDraftURLs(ctx, s.s3Client, uuid, TempURLMinutes)
	if err != nil {
		return nil, err
	}

	return &t.DraftChartWithURLs{
		DraftChart:         d,
		InstrumentalURL:    instURL,
		VocalsURL:          vocalsURL,
		BackgroundImageURL: bgURL,
	}, nil
}

func (s *DraftService) UpdateDraft(ctx context.Context, uuid, uid string, draft t.ChartBase) (*t.DraftChart, error) {
	if _, err := findByUUIDAndUID(ctx, s.db, uuid, uid); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}
	record, err := updateByUUIDAndUID(ctx, s.db, uuid, uid, draft)
	if err != nil {
		return nil, err
	}
	d, err := record.toDraftChart()
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *DraftService) DeleteDraft(ctx context.Context, uuid, uid string) error {
	if _, err := findByUUIDAndUID(ctx, s.db, uuid, uid); err != nil {
		return fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}
	return deleteByUUIDAndUID(ctx, s.db, uuid, uid)
}

type ChartCreator interface {
	CreateChart(ctx context.Context, uuid string, draft t.ChartBase) (*t.PublicChart, error)
}

func (s *DraftService) PublishDraft(ctx context.Context, uuid string, draft t.ChartBase, chartSvc ChartCreator) (*t.PublicChart, error) {
	created, err := chartSvc.CreateChart(ctx, uuid, draft)
	if err != nil {
		return nil, err
	}
	_ = deleteByUUID(ctx, s.db, uuid)
	return created, nil
}

// =========================================================
// Long Work

func (s *DraftService) SeparateAudio(ctx context.Context, draftUUID string, file *multipart.FileHeader) (vocals, instrumental string, err error) {
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

func (s *DraftService) UploadInstrumental(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
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

func (s *DraftService) UploadVocals(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
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

func (s *DraftService) UploadImage(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
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

func (s *DraftService) GenerateTimings(ctx context.Context, draftUUID string, lyrics string) ([]t.Timing, error) {
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
