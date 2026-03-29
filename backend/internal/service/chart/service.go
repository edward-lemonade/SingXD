package chart

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"

	t "singxd/internal/types"
)

type ChartService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewChartService(s3Client *S3Client, db *gorm.DB) *ChartService {
	if err := db.AutoMigrate(&ChartRecord{}); err != nil {
		log.Fatal(err)
	}
	return &ChartService{s3Client: s3Client, db: db}
}

const ChartURLMinutes = 60

// =========================================================
// Operations

func (s *ChartService) CreateChart(ctx context.Context, draftUUID string, UID string, chartBase t.ChartBase) (*t.PublicChart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := save(ctx, s.db, UID, chartBase)
	if err != nil {
		return nil, fmt.Errorf("saving chart: %w", err)
	}

	if err := moveDraftToChart(ctx, s.s3Client, draftUUID, chart.ID); err != nil {
		return nil, err
	}

	return chart, nil
}

func (s *ChartService) FindChartByID(ctx context.Context, id uint) (*t.PublicChart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := findByID(ctx, s.db, id)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrChartNotFound, err)
	}

	audioURL, bgURL, err := getChartURLs(ctx, s.s3Client, chart.ID, ChartURLMinutes)
	if err != nil {
		return nil, err
	}
	chart.Properties.AudioURL = audioURL
	chart.Properties.BackgroundImageURL = bgURL

	return chart, nil
}

func (s *ChartService) FindVocalsFileByID(ctx context.Context, id uint) ([]byte, error) {
	return getVocalsFile(ctx, s.s3Client, id)
}

func (s *ChartService) ListCharts(ctx context.Context, page, limit int, search string) ([]t.PublicChart, int, error) {
	if s.db == nil {
		return nil, 0, ErrDbNotConfigured
	}

	t0 := time.Now()
	charts, total, err := list(ctx, s.db, page, limit, search)
	log.Printf("[ListCharts] db query: %v", time.Since(t0))
	if err != nil {
		return nil, 0, err
	}

	ids := make([]uint, len(charts))
	for i, c := range charts {
		ids[i] = c.ID
	}

	t1 := time.Now()
	thumbnails, err := getChartThumbnails(ctx, s.s3Client, ids, ChartURLMinutes)
	log.Printf("[ListCharts] thumbnails: %v", time.Since(t1))
	if err != nil {
		log.Printf("warn: batch thumbnails for list: %v", err)
	} else {
		for i := range charts {
			charts[i].Properties.BackgroundImageURL = thumbnails[charts[i].ID]
		}
	}

	return charts, total, nil
}

func (s *ChartService) ListChartsByUID(ctx context.Context, uid string) ([]t.PublicChart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	records, err := listByUID(ctx, s.db, uid)
	if err != nil {
		return nil, err
	}

	charts := make([]t.PublicChart, 0, len(records))
	for _, r := range records {
		c, err := r.toPublicChart()
		if err != nil {
			return nil, err
		}
		charts = append(charts, *c)
	}

	ids := make([]uint, len(charts))
	for i, c := range charts {
		ids[i] = c.ID
	}

	thumbnails, err := getChartThumbnails(ctx, s.s3Client, ids, ChartURLMinutes)
	if err != nil {
		log.Printf("warn: batch thumbnails for uid=%s: %v", uid, err)
	} else {
		for i := range charts {
			charts[i].Properties.BackgroundImageURL = thumbnails[charts[i].ID]
		}
	}

	return charts, nil
}
