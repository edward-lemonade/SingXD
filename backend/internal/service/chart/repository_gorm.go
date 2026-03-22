package chart

import (
	"context"
	"encoding/json"
	t "singxd/internal/types"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func (ChartRecord) TableName() string {
	return "charts"
}

type ChartRecord struct {
	ID         uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	AuthorUID  *string        `json:"authorUid"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	Lines      datatypes.JSON `json:"lines" gorm:"type:jsonb;not null"`
	Timings    datatypes.JSON `json:"timings" gorm:"type:jsonb;not null"`
	Properties datatypes.JSON `json:"properties" gorm:"type:jsonb;not null"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&ChartRecord{})
}

func (r *ChartRecord) ToPublicChart() (*t.PublicChart, error) {
	chart := &t.PublicChart{
		ID:        r.ID,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
		AuthorUID: r.AuthorUID,
	}
	if err := json.Unmarshal(r.Lines, &chart.Lines); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(r.Timings, &chart.Timings); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(r.Properties, &chart.Properties); err != nil {
		return nil, err
	}
	return chart, nil
}

func marshalChart(chart t.ChartBase) (lines, timings, props datatypes.JSON, err error) {
	if lines, err = json.Marshal(chart.Lines); err != nil {
		return
	}
	if timings, err = json.Marshal(chart.Timings); err != nil {
		return
	}
	props, err = json.Marshal(chart.Properties)
	return
}

// ==============================================================================
// Operations

func Save(ctx context.Context, db *gorm.DB, authorUID *string, chart t.ChartBase) (*t.PublicChart, error) {
	lines, timings, props, err := marshalChart(chart)
	if err != nil {
		return nil, err
	}
	record := ChartRecord{
		Lines:      lines,
		Timings:    timings,
		Properties: props,
		AuthorUID:  authorUID,
	}
	if err := db.WithContext(ctx).Create(&record).Error; err != nil {
		return nil, err
	}
	return record.ToPublicChart()
}

func FindByID(ctx context.Context, db *gorm.DB, id uint) (*t.PublicChart, error) {
	var record ChartRecord
	if err := db.WithContext(ctx).First(&record, id).Error; err != nil {
		return nil, err
	}
	return record.ToPublicChart()
}

func List(ctx context.Context, db *gorm.DB, page, limit int, search string) ([]t.PublicChart, int, error) {
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

	charts := make([]t.PublicChart, 0, len(records))
	for _, r := range records {
		chart, err := r.ToPublicChart()
		if err != nil {
			return nil, 0, err
		}
		charts = append(charts, *chart)
	}

	return charts, int(total), nil
}
