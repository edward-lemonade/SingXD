package chart

import (
	"context"
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

func (s *ChartService) CreateChart(ctx context.Context, draftUUID string, chartBase t.ChartBase) (*t.PublicChart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := Save(ctx, s.db, nil, chartBase)
	if err != nil {
		return nil, fmt.Errorf("saving chart: %w", err)
	}

	movedKeys, err := MoveDraftToChart(ctx, s.s3Client, draftUUID, chart.ID)
	if err != nil {
		return nil, err
	}
	if len(movedKeys) == 0 {
		return nil, ErrNoAudioFilesForUUID
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

func (s *ChartService) FindChartByID(ctx context.Context, id uint) (*t.PublicChart, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	chart, err := FindByID(ctx, s.db, id)
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

func (s *ChartService) ListCharts(ctx context.Context, page, limit int, search string) ([]t.PublicChart, int, error) {
	if s.db == nil {
		return nil, 0, ErrDbNotConfigured
	}

	charts, total, err := List(ctx, s.db, page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	for i := range charts {
		bgURL, err := GetBackgroundURL(ctx, s.s3Client, charts[i].ID, ChartURLMinutes)
		if err != nil {
			log.Printf("warn: background url for chart %d: %v", charts[i].ID, err)
			continue
		}
		if bgURL != "" {
			charts[i].Properties.BackgroundImageURL = &bgURL
		}
	}

	return charts, total, nil
}
