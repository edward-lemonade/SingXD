package score

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// ==============================================================================
// Model

func (ScoreRecord) TableName() string {
	return "scores"
}

type ScoreRecord struct {
	ID        string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey;not null"`
	UID       string    `json:"uid" gorm:"index;not null;column:uid"`
	CID       uint      `json:"chartId" gorm:"not null;column:cid"`
	CreatedAt time.Time `json:"createdAt"`
	Score     float32   `json:"score"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&ScoreRecord{})
}

// ==============================================================================
// Operations

func Save(ctx context.Context, db *gorm.DB, uid string, cid uint, score float32) (*ScoreRecord, error) {
	record := ScoreRecord{
		UID:   uid,
		CID:   cid,
		Score: score,
	}
	err := db.WithContext(ctx).Create(&record).Error
	return &record, err
}

func GetByChartID(ctx context.Context, db *gorm.DB, cid uint) ([]ScoreRecord, error) {
	var records []ScoreRecord
	err := db.WithContext(ctx).Where("cid = ?", cid).Order("score DESC").Find(&records).Error
	return records, err
}

func GetByUID(ctx context.Context, db *gorm.DB, uid string) ([]ScoreRecord, error) {
	var records []ScoreRecord
	err := db.WithContext(ctx).Where("uid = ?", uid).Order("created_at DESC").Find(&records).Error
	return records, err
}

func GetByUIDAndChartID(ctx context.Context, db *gorm.DB, uid string, cid uint) ([]ScoreRecord, error) {
	var records []ScoreRecord
	err := db.WithContext(ctx).Where("uid = ? AND cid = ?", uid, cid).Order("score DESC").Find(&records).Error
	return records, err
}

func GetBestByChartID(ctx context.Context, db *gorm.DB, cid uint, limit int) ([]ScoreRecord, error) {
	var records []ScoreRecord
	err := db.WithContext(ctx).Where("cid = ?", cid).Order("score DESC").Limit(limit).Find(&records).Error
	return records, err
}

func DeleteByID(ctx context.Context, db *gorm.DB, id string) error {
	return db.WithContext(ctx).Delete(&ScoreRecord{}, "id = ?", id).Error
}
