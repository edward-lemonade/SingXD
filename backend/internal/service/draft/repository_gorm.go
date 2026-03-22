package draft

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

func (DraftRecord) TableName() string {
	return "charts"
}

type DraftRecord struct {
	UUID       string         `json:"uuid" gorm:"type:uuid;default:gen_random_uuid();uniqueIndex;not null"` // public id
	Lines      datatypes.JSON `json:"lines" gorm:"type:jsonb;not null"`
	Timings    datatypes.JSON `json:"timings" gorm:"type:jsonb;not null"`
	Properties datatypes.JSON `json:"properties" gorm:"type:jsonb;not null"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	Author     *string        `json:"author"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&DraftRecord{})
}

// ==============================================================================
// Operations

func SaveDraft(ctx context.Context, db *gorm.DB, chartDraft t.ChartDraft) (DraftRecord, error) {
	linesJSON, err := json.Marshal(chartDraft.Lines)
	if err != nil {
		return DraftRecord{}, err
	}

	timingsJSON, err := json.Marshal(chartDraft.Timings)
	if err != nil {
		return DraftRecord{}, err
	}

	propertiesJSON, err := json.Marshal(chartDraft.Properties)
	if err != nil {
		return DraftRecord{}, err
	}

	record := DraftRecord{
		Lines:      datatypes.JSON(linesJSON),
		Timings:    datatypes.JSON(timingsJSON),
		Properties: datatypes.JSON(propertiesJSON),
		Author:     nil, // blank for now
	}

	if err := db.WithContext(ctx).Create(&record).Error; err != nil {
		return DraftRecord{}, err
	}

	return record, nil
}
