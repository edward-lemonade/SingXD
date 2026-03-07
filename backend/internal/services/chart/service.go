package chart

import (
	"context"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"

	t "singxd/internal/services/types"
)

type ChartService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewChartService(s3Client *S3Client, db *gorm.DB) *ChartService {
	return &ChartService{
		s3Client: s3Client,
		db:       db,
	}
}

// =========================================================
// Operations

func (s *ChartService) CreateMap(ctx context.Context, sessionId string, chartDraft t.ChartDraft) (*t.Chart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	// SaveChart returns the DB record
	record, err := SaveChart(ctx, s.db, chartDraft)
	if err != nil {
		return nil, fmt.Errorf("saving chart: %w", err)
	}

	// Convert DB record to typed t.Chart
	newChart := &t.Chart{
		Author:    record.Author,
		CreatedAt: record.CreatedAt,
		UpdatedAt: record.UpdatedAt,
	}
	newChart.ID = record.ID
	json.Unmarshal(record.Lines, &newChart.Lines)
	json.Unmarshal(record.Timings, &newChart.Timings)
	json.Unmarshal(record.Properties, &newChart.Properties)

	if err := json.Unmarshal(record.Lines, &newChart.Lines); err != nil {
		return nil, fmt.Errorf("unmarshal lines: %w", err)
	}
	if err := json.Unmarshal(record.Timings, &newChart.Timings); err != nil {
		return nil, fmt.Errorf("unmarshal timings: %w", err)
	}
	if err := json.Unmarshal(record.Properties, &newChart.Properties); err != nil {
		return nil, fmt.Errorf("unmarshal properties: %w", err)
	}

	// Prepare media in S3
	if _, _, err := PrepareChartMedia(ctx, s.s3Client, sessionId, newChart.ID); err != nil {
		return nil, err
	}

	return newChart, nil
}
func (s *ChartService) FindByID(ctx context.Context, id uint) (*t.Chart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := GetChart(ctx, s.db, id)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrChartNotFound, err)
	}

	files, err := ListChartFiles(ctx, s.s3Client, chart.ID)
	if err != nil {
		return nil, fmt.Errorf("listing files id=%d: %w", chart.ID, err)
	}

	instKey, bgKey, err := resolveMediaKeys(files, chart.ID)
	if err != nil {
		return nil, err
	}

	audioURL, err := GetChartMediaURL(ctx, s.s3Client, instKey, 3600)
	if err != nil {
		return nil, err
	}
	chart.Properties.AudioURL = &audioURL

	if bgKey != nil {
		bgURL, err := GetChartMediaURL(ctx, s.s3Client, *bgKey, 3600)
		if err != nil {
			return nil, err
		}
		chart.Properties.BackgroundImageURL = &bgURL
	}

	return chart, nil
}
