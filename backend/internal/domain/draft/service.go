package draft

import (
	"context"
	"log"

	"gorm.io/gorm"

	"singxd/internal/apperror"
	chartpkg "singxd/internal/domain/chart"
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
		return "", apperror.WrapUnknown(err, "failed to create draft")
	}
	return record.UUID, nil
}

func (s *DraftService) ListDrafts(ctx context.Context, uid string) ([]chartpkg.DraftChart, error) {
	records, err := listByUID(ctx, s.db, uid)
	if err != nil {
		return nil, apperror.WrapUnknown(err, "failed to list drafts")
	}
	drafts := make([]chartpkg.DraftChart, 0, len(records))
	for _, r := range records {
		d, err := r.toDraftChart()
		if err != nil {
			return nil, apperror.WrapUnknown(err, "failed to parse draft data")
		}
		drafts = append(drafts, d)
	}
	return drafts, nil
}

func (s *DraftService) GetDraft(ctx context.Context, uuid string, uid *string) (*chartpkg.DraftChartWithURLs, error) {
	record, err := findByUUIDAndUID(ctx, s.db, uuid, uid)
	if err != nil {
		return nil, apperror.WrapUnknown(err, "failed to fetch draft")
	}
	d, err := record.toDraftChart()
	if err != nil {
		return nil, apperror.WrapUnknown(err, "failed to parse draft data")
	}

	instURL, vocalsURL, bgURL, err := getDraftURLs(ctx, s.s3Client, uuid, TempURLMinutes)
	if err != nil {
		return nil, apperror.WrapUnknown(err, "failed to load draft media")
	}

	return &chartpkg.DraftChartWithURLs{
		DraftChart:         d,
		InstrumentalURL:    instURL,
		VocalsURL:          vocalsURL,
		BackgroundImageURL: bgURL,
	}, nil
}

func (s *DraftService) UpdateDraft(ctx context.Context, uuid string, uid *string, draft chartpkg.ChartBase) (*chartpkg.DraftChart, error) {
	if _, err := findByUUIDAndUID(ctx, s.db, uuid, uid); err != nil {
		return nil, apperror.WrapUnknown(err, "failed to update draft")
	}
	record, err := updateByUUIDAndUID(ctx, s.db, uuid, uid, draft)
	if err != nil {
		return nil, apperror.WrapUnknown(err, "failed to update draft")
	}
	d, err := record.toDraftChart()
	if err != nil {
		return nil, apperror.WrapUnknown(err, "failed to parse draft data")
	}
	return &d, nil
}

func (s *DraftService) DeleteDraft(ctx context.Context, uuid, uid string) error {
	if _, err := findByUUIDAndUID(ctx, s.db, uuid, &uid); err != nil {
		return apperror.WrapUnknown(err, "failed to delete draft")
	}
	return apperror.WrapUnknown(deleteByUUIDAndUID(ctx, s.db, uuid, uid), "failed to delete draft")
}

type ChartCreator interface {
	CreateChart(ctx context.Context, uuid string, uid string, draft chartpkg.ChartBase) (*chartpkg.PublicChart, error)
}

func (s *DraftService) PublishDraft(ctx context.Context, uuid string, uid string, draft chartpkg.ChartBase, chartSvc ChartCreator) (*chartpkg.PublicChart, error) {
	created, err := chartSvc.CreateChart(ctx, uuid, uid, draft)
	if err != nil {
		return nil, err // already an AppError from ChartService, per the last file
	}
	_ = deleteByUUID(ctx, s.db, uuid)
	return created, nil
}
