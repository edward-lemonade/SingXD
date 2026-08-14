package score

import (
	"context"
	"log"

	"singxd/internal/types"

	"gorm.io/gorm"
)

type ScoreService struct {
	db *gorm.DB
}

func NewScoreService(db *gorm.DB) *ScoreService {
	if err := db.AutoMigrate(&ScoreRecord{}); err != nil {
		log.Fatal(err)
	}
	return &ScoreService{db: db}
}

// =========================================================
// Operations

func (s *ScoreService) Save(ctx context.Context, uid string, cid uint, score float32) (*types.Score, error) {
	record, err := Save(ctx, s.db, uid, cid, score)
	if err != nil {
		return nil, err
	}
	return recordToScore(record), nil
}

func (s *ScoreService) GetByChartID(ctx context.Context, cid uint) ([]types.Score, error) {
	records, err := GetByChartID(ctx, s.db, cid)
	if err != nil {
		return nil, err
	}
	return recordsToScores(records), nil
}

func (s *ScoreService) GetByUID(ctx context.Context, uid string) ([]types.Score, error) {
	records, err := GetByUID(ctx, s.db, uid)
	if err != nil {
		return nil, err
	}
	return recordsToScores(records), nil
}

func (s *ScoreService) GetByUIDAndChartID(ctx context.Context, uid string, cid uint) ([]types.Score, error) {
	records, err := GetByUIDAndChartID(ctx, s.db, uid, cid)
	if err != nil {
		return nil, err
	}
	return recordsToScores(records), nil
}

func (s *ScoreService) GetBestByChartID(ctx context.Context, cid uint, limit int) ([]types.Score, error) {
	records, err := GetBestByChartID(ctx, s.db, cid, limit)
	if err != nil {
		return nil, err
	}
	return recordsToScores(records), nil
}

func (s *ScoreService) DeleteByID(ctx context.Context, id string) error {
	return DeleteByID(ctx, s.db, id)
}

// =========================================================
// Helpers

func recordToScore(r *ScoreRecord) *types.Score {
	return &types.Score{
		ID:        r.ID,
		UID:       r.UID,
		ChartID:   r.CID,
		CreatedAt: r.CreatedAt,
		Score:     r.Score,
	}
}

func recordsToScores(records []ScoreRecord) []types.Score {
	scores := make([]types.Score, len(records))
	for i, r := range records {
		scores[i] = *recordToScore(&r)
	}
	return scores
}
