package chart

import (
	"context"
	"encoding/json"
	t "singxd/internal/types"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ==============================================================================
// Model

func (ChartRecord) TableName() string {
	return "charts"
}

type ChartRecord struct {
	ID         uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	Lines      datatypes.JSON `json:"lines" gorm:"type:jsonb;not null"`
	Timings    datatypes.JSON `json:"timings" gorm:"type:jsonb;not null"`
	Properties datatypes.JSON `json:"properties" gorm:"type:jsonb;not null"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	Author     *string        `json:"author"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&ChartRecord{})
}

// ==============================================================================
// Operations

func SaveChart(ctx context.Context, db *gorm.DB, chartDraft t.ChartDraft) (ChartRecord, error) {
	linesJSON, err := json.Marshal(chartDraft.Lines)
	if err != nil {
		return ChartRecord{}, err
	}

	timingsJSON, err := json.Marshal(chartDraft.Timings)
	if err != nil {
		return ChartRecord{}, err
	}

	propertiesJSON, err := json.Marshal(chartDraft.Properties)
	if err != nil {
		return ChartRecord{}, err
	}

	record := ChartRecord{
		Lines:      datatypes.JSON(linesJSON),
		Timings:    datatypes.JSON(timingsJSON),
		Properties: datatypes.JSON(propertiesJSON),
		Author:     nil, // blank for now
	}

	if err := db.WithContext(ctx).Create(&record).Error; err != nil {
		return ChartRecord{}, err
	}

	return record, nil
}

func GetChartByID(ctx context.Context, db *gorm.DB, id uint) (*t.Chart, error) {
	var record ChartRecord
	if err := db.WithContext(ctx).First(&record, id).Error; err != nil {
		return nil, err
	}

	var chart t.Chart
	chart.ID = record.ID

	if err := json.Unmarshal(record.Lines, &chart.Lines); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Timings, &chart.Timings); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Properties, &chart.Properties); err != nil {
		return nil, err
	}

	// Keep Author blank in Chart for now
	return &chart, nil
}

func ListCharts(ctx context.Context, db *gorm.DB, page, limit int, search string) ([]ChartRecord, int, error) {
	var records []ChartRecord
	var total int64

	q := db.WithContext(ctx).Model(&ChartRecord{})
	if search != "" {
		q = q.Where("properties->>'title' ILIKE ? OR properties->>'songTitle' ILIKE ? OR properties->>'artist' ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, int(total), nil
}
