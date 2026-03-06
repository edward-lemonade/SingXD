package postgres

import (
	"context"
	"encoding/json"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	models "singxd/types"
)

type SyncMapRecord struct {
	UUID     string         `gorm:"primaryKey;column:uuid"`
	Lines    datatypes.JSON `gorm:"type:jsonb;column:lines;not null"`
	Timings  datatypes.JSON `gorm:"type:jsonb;column:timings;not null"`
	Settings datatypes.JSON `gorm:"type:jsonb;column:settings;not null"`
	Metadata datatypes.JSON `gorm:"type:jsonb;column:metadata;not null"`
}

func (SyncMapRecord) TableName() string {
	return "syncmaps"
}

func SaveSyncMap(ctx context.Context, db *gorm.DB, syncMap models.SyncMap) error {
	linesJSON, err := json.Marshal(syncMap.Lines)
	if err != nil {
		return err
	}
	timingsJSON, err := json.Marshal(syncMap.Timings)
	if err != nil {
		return err
	}
	settingsJSON, err := json.Marshal(syncMap.Settings)
	if err != nil {
		return err
	}
	metadataJSON, err := json.Marshal(syncMap.Metadata)
	if err != nil {
		return err
	}

	record := SyncMapRecord{
		UUID:     syncMap.UUID,
		Lines:    datatypes.JSON(linesJSON),
		Timings:  datatypes.JSON(timingsJSON),
		Settings: datatypes.JSON(settingsJSON),
		Metadata: datatypes.JSON(metadataJSON),
	}

	return db.WithContext(ctx).Create(&record).Error
}

func GetSyncMap(ctx context.Context, db *gorm.DB, uuid string) (*models.SyncMap, error) {
	var record SyncMapRecord
	err := db.WithContext(ctx).First(&record, "uuid = ?", uuid).Error
	if err != nil {
		return nil, err
	}

	var syncMap models.SyncMap
	syncMap.UUID = record.UUID

	if err := json.Unmarshal(record.Lines, &syncMap.Lines); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Timings, &syncMap.Timings); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Settings, &syncMap.Settings); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(record.Metadata, &syncMap.Metadata); err != nil {
		return nil, err
	}
	return &syncMap, nil
}
