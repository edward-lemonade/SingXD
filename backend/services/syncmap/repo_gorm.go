package syncmap

import (
	"context"
	"encoding/json"
	t "singxd/services/types"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ==============================================================================
// Model

func (SyncMapRecord) TableName() string {
	return "syncmaps"
}

type SyncMapRecord struct {
	ID         uint           `gorm:"primaryKey;column:id"`
	Lines      datatypes.JSON `gorm:"type:jsonb;column:lines;not null"`
	Timings    datatypes.JSON `gorm:"type:jsonb;column:timings;not null"`
	Properties datatypes.JSON `gorm:"type:jsonb;column:properties;not null"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	Author     *string        `json:"author"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&SyncMapRecord{})
}

// ==============================================================================
// Operations

func SaveSyncMap(ctx context.Context, db *gorm.DB, syncMap t.SyncMapDraft) (SyncMapRecord, error) {
	linesJSON, err := json.Marshal(syncMap.Lines)
	if err != nil {
		return SyncMapRecord{}, err
	}

	timingsJSON, err := json.Marshal(syncMap.Timings)
	if err != nil {
		return SyncMapRecord{}, err
	}

	propertiesJSON, err := json.Marshal(syncMap.Properties)
	if err != nil {
		return SyncMapRecord{}, err
	}

	record := SyncMapRecord{
		Lines:      datatypes.JSON(linesJSON),
		Timings:    datatypes.JSON(timingsJSON),
		Properties: datatypes.JSON(propertiesJSON),
		Author:     nil, // blank for now
	}

	if err := db.WithContext(ctx).Create(&record).Error; err != nil {
		return SyncMapRecord{}, err
	}

	return record, nil
}

func GetSyncMap(ctx context.Context, db *gorm.DB, id uint) (*t.SyncMap, error) {
	var record SyncMapRecord
	if err := db.WithContext(ctx).First(&record, id).Error; err != nil {
		return nil, err
	}

	var syncMap t.SyncMap
	syncMap.ID = record.ID

	if err := json.Unmarshal(record.Lines, &syncMap.Lines); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Timings, &syncMap.Timings); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Properties, &syncMap.Properties); err != nil {
		return nil, err
	}

	// Keep Author blank in SyncMapDraft (the draft does not track Author)
	return &syncMap, nil
}
