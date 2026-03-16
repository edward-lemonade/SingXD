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
	return &ChartService{s3Client: s3Client, db: db}
}

// =========================================================
// Operations

func (s *ChartService) Create(ctx context.Context, sessionId string, chartDraft t.ChartDraft) (*t.Chart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	record, err := SaveChart(ctx, s.db, chartDraft)
	if err != nil {
		return nil, fmt.Errorf("saving chart: %w", err)
	}

	chart := &t.Chart{
		Author:    record.Author,
		CreatedAt: record.CreatedAt,
		UpdatedAt: record.UpdatedAt,
	}
	chart.ID = record.ID

	if err := json.Unmarshal(record.Lines, &chart.Lines); err != nil {
		return nil, fmt.Errorf("unmarshal lines: %w", err)
	}
	if err := json.Unmarshal(record.Timings, &chart.Timings); err != nil {
		return nil, fmt.Errorf("unmarshal timings: %w", err)
	}
	if err := json.Unmarshal(record.Properties, &chart.Properties); err != nil {
		return nil, fmt.Errorf("unmarshal properties: %w", err)
	}

	movedKeys, err := MoveTempToChart(ctx, s.s3Client, sessionId, chart.ID)
	if err != nil {
		return nil, err
	}
	if len(movedKeys) == 0 {
		return nil, ErrNoAudioFilesForSession
	}
	if findKeyByPrefix(movedKeys, instrumentalPrefix) == "" {
		return nil, ErrNoInstrumentalFile
	}
	if findKeyByPrefix(movedKeys, vocalsPrefix) == "" {
		return nil, ErrNoVocalsFile
	}

	return chart, nil
}

func (s *ChartService) FindByID(ctx context.Context, id uint) (*t.Chart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := GetChart(ctx, s.db, id)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrChartNotFound, err)
	}

	audioURL, err := GetInstrumentalURL(ctx, s.s3Client, chart.ID, 3600)
	if err != nil {
		return nil, err
	}
	chart.Properties.AudioURL = &audioURL

	bgURL, err := GetBackgroundURL(ctx, s.s3Client, chart.ID, 3600)
	if err != nil {
		return nil, err
	}
	if bgURL != "" {
		chart.Properties.BackgroundImageURL = &bgURL
	}

	return chart, nil
}

func (s *ChartService) FindVocalsFileByID(ctx context.Context, id uint) ([]byte, error) {
	return GetVocalsFile(ctx, s.s3Client, id)
}
