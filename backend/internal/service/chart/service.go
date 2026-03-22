package chart

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

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
	if findKeyByPrefix(movedKeys, backgroundPrefix) == "" {
		log.Println("No background moved")
	}

	return chart, nil
}

func (s *ChartService) FindByID(ctx context.Context, id uint) (*t.Chart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := GetChartByID(ctx, s.db, id)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrChartNotFound, err)
	}

	audioURL, err := GetInstrumentalURL(ctx, s.s3Client, chart.ID, ChartURLMinutes)
	if err != nil {
		return nil, err
	}
	chart.Properties.AudioURL = &audioURL

	bgURL, err := GetBackgroundURL(ctx, s.s3Client, chart.ID, ChartURLMinutes)
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

func (s *ChartService) List(ctx context.Context, page, limit int, search string) ([]t.Chart, int, error) {
	if s.db == nil {
		return nil, 0, ErrDbNotConfigured
	}

	records, total, err := ListCharts(ctx, s.db, page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	charts := make([]t.Chart, 0, len(records))
	for _, record := range records {
		var chart t.Chart
		chart.ID = record.ID
		chart.Author = record.Author
		chart.CreatedAt = record.CreatedAt
		chart.UpdatedAt = record.UpdatedAt

		if err := json.Unmarshal(record.Lines, &chart.Lines); err != nil {
			return nil, 0, fmt.Errorf("unmarshal lines id=%d: %w", record.ID, err)
		}
		if err := json.Unmarshal(record.Timings, &chart.Timings); err != nil {
			return nil, 0, fmt.Errorf("unmarshal timings id=%d: %w", record.ID, err)
		}
		if err := json.Unmarshal(record.Properties, &chart.Properties); err != nil {
			return nil, 0, fmt.Errorf("unmarshal properties id=%d: %w", record.ID, err)
		}

		bgURL, err := GetBackgroundURL(ctx, s.s3Client, chart.ID, ChartURLMinutes)
		if err != nil {
			log.Printf("warn: background url for chart %d: %v", chart.ID, err)
		}
		if bgURL != "" {
			chart.Properties.BackgroundImageURL = &bgURL
		}

		charts = append(charts, chart)
	}

	return charts, total, nil
}
