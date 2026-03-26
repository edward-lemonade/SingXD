package draft

import (
	"context"
	"fmt"
	"log"

	"gorm.io/gorm"

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

func (s *DraftService) InitDraft(ctx context.Context, uid *string) (string, error) {
	record, err := initOne(ctx, s.db, uid)
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
	CreateChart(ctx context.Context, uuid string, uid string, draft t.ChartBase) (*t.PublicChart, error)
}

func (s *DraftService) PublishDraft(ctx context.Context, uuid string, uid string, draft t.ChartBase, chartSvc ChartCreator) (*t.PublicChart, error) {
	created, err := chartSvc.CreateChart(ctx, uuid, uid, draft)
	if err != nil {
		return nil, err
	}
	_ = deleteByUUID(ctx, s.db, uuid)
	return created, nil
}
