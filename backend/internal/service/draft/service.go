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
	if err := AutoMigrateDrafts(db); err != nil {
		log.Fatal(err)
	}
	return &DraftService{
		s3Client: s3Client,
		db:       db,
	}
}

const TempExpiryMinutes = 60 * 24
const TempURLMinutes = 60 * 24

const PythonScriptsDir = "./internal/service/draft/scripts"
const (
	SeparatorScript = "separator.py"
	AlignScript     = "align.py"
)
const PythonVenv = "./internal/service/draft/scripts/.venv/bin/python"

// ─── Separate Audio ───────────────────────────────────────────────────────────

type SeparateAudioResult struct {
	VocalsURL       string
	InstrumentalURL string
}

func (s *DraftService) SeparateAudio(ctx context.Context, draftUUID string, file *multipart.FileHeader) (SeparateAudioResult, error) {

	if draftUUID == "" {
		return SeparateAudioResult{}, ErrMissingUUID
	}
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

	vocalsFile, err := os.Open(vocalsPath)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("opening vocals: %w", err)
	}
	defer vocalsFile.Close()
	if _, err := SaveAudioFile(ctx, s.s3Client, draftUUID, "vocals", vocalsFile, TempExpiryMinutes); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("uploading vocals: %w", err)
	}

	instFile, err := os.Open(instPath)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("opening instrumental: %w", err)
	}
	defer instFile.Close()
	if _, err := SaveAudioFile(ctx, s.s3Client, draftUUID, "instrumental", instFile, TempExpiryMinutes); err != nil {
		return SeparateAudioResult{}, fmt.Errorf("uploading instrumental: %w", err)
	}

	vocalsURL, err := GetAudioFileURL(ctx, s.s3Client, draftUUID, "vocals", TempURLMinutes)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("getting vocals url: %w", err)
	}
	instrumentalURL, err := GetAudioFileURL(ctx, s.s3Client, draftUUID, "instrumental", TempURLMinutes)
	if err != nil {
		return SeparateAudioResult{}, fmt.Errorf("getting instrumental url: %w", err)
	}

	return SeparateAudioResult{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instrumentalURL,
	}, nil
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

	if _, err = SaveAudioFile(ctx, s.s3Client, draftUUID, "instrumental", src, TempExpiryMinutes); err != nil {
		return "", fmt.Errorf("uploading instrumental: %w", err)
	}

	return GetAudioFileURL(ctx, s.s3Client, draftUUID, "instrumental", TempURLMinutes)
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

	if _, err = SaveAudioFile(ctx, s.s3Client, draftUUID, "vocals", src, TempExpiryMinutes); err != nil {
		return "", fmt.Errorf("uploading vocals: %w", err)
	}

	return GetAudioFileURL(ctx, s.s3Client, draftUUID, "vocals", TempURLMinutes)
}

func (s *DraftService) UploadImage(ctx context.Context, draftUUID string, file *multipart.FileHeader) (string, error) {
	if draftUUID == "" {
		return "", ErrMissingUUID
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

	key, err := SaveBackgroundImage(ctx, s.s3Client, draftUUID, ext, src)
	if err != nil {
		return "", fmt.Errorf("uploading image: %w", err)
	}

	url, err := GetBackgroundImageURL(ctx, s.s3Client, key, TempURLMinutes)
	if err != nil {
		return "", fmt.Errorf("getting image url: %w", err)
	}
	return url, nil
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

	vocalsData, err := DownloadAudioFile(ctx, s.s3Client, draftUUID, "vocals")
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

// ─── Draft CRUD ────────────────────────────────────────────────────────────

func (s *DraftService) InitDraft(ctx context.Context) (string, error) {
	record, err := InitOne(ctx, s.db)
	if err != nil {
		return "", err
	}
	return record.UUID, nil
}

func (s *DraftService) ListDrafts(ctx context.Context, uid string) ([]t.DraftChart, error) {
	records, err := ListByUID(ctx, s.db, uid)
	if err != nil {
		return nil, err
	}
	drafts := make([]t.DraftChart, 0, len(records))
	for _, r := range records {
		d, err := r.ToDraftChart()
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, d)
	}
	return drafts, nil
}

func (s *DraftService) GetDraft(ctx context.Context, uuid, uid string) (*t.DraftChartWithURLs, error) {
	record, err := FindByUUIDAndUID(ctx, s.db, uuid, uid)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}
	d, err := record.ToDraftChart()
	if err != nil {
		return nil, err
	}

	instURL, vocalsURL, bgURL, err := GetDraftURLs(ctx, s.s3Client, uuid, TempURLMinutes)
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
	if _, err := FindByUUIDAndUID(ctx, s.db, uuid, uid); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}
	record, err := UpdateByUUIDAndUID(ctx, s.db, uuid, uid, draft)
	if err != nil {
		return nil, err
	}
	d, err := record.ToDraftChart()
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *DraftService) DeleteDraft(ctx context.Context, uuid, uid string) error {
	if _, err := FindByUUIDAndUID(ctx, s.db, uuid, uid); err != nil {
		return fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}
	return DeleteByUUIDAndUID(ctx, s.db, uuid, uid)
}

type ChartCreator interface {
	CreateChart(ctx context.Context, uuid string, draft t.ChartBase) (*t.PublicChart, error)
}

func (s *DraftService) PublishDraftAsUser(ctx context.Context, uid, uuid string, chartSvc ChartCreator) (*t.PublicChart, error) {
	record, err := FindByUUIDAndUID(ctx, s.db, uuid, uid)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrDraftNotFound, err)
	}

	var base t.ChartBase
	if err := UnmarshalDraft(record.Lines, record.Timings, record.Properties, &base); err != nil {
		return nil, err
	}

	created, err := chartSvc.CreateChart(ctx, uuid, base)
	if err != nil {
		return nil, err
	}

	_ = DeleteByUUIDAndUID(ctx, s.db, uuid, uid)

	return created, nil
}

func (s *DraftService) PublishDraftAsGuest(ctx context.Context, uuid string, draft t.ChartBase, chartSvc ChartCreator) (*t.PublicChart, error) {
	created, err := chartSvc.CreateChart(ctx, uuid, draft)
	if err != nil {
		return nil, err
	}

	_ = DeleteByUUID(ctx, s.db, uuid)

	return created, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

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
