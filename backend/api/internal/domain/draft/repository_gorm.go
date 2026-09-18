package draft

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	chartpkg "singxd/internal/domain/chart"
)

func (DraftRecord) TableName() string {
	return "drafts"
}

type DraftRecord struct {
	UUID       string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	AuthorUID  *string        `gorm:"index"`
	Lines      datatypes.JSON `gorm:"type:jsonb;default:'[]'"`
	Timings    datatypes.JSON `gorm:"type:jsonb;default:'[]'"`
	Properties datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&DraftRecord{})
}

// ==============================================================================
// Operations

func initOne(ctx context.Context, db *gorm.DB, uid *string) (DraftRecord, error) {
	record := DraftRecord{
		AuthorUID: uid,
	}
	if err := db.WithContext(ctx).Create(&record).Error; err != nil {
		return DraftRecord{}, err
	}
	return record, nil
}

func updateByUUIDAndUID(ctx context.Context, db *gorm.DB, uuid string, uid *string, draft chartpkg.ChartBase) (DraftRecord, error) {
	lines, timings, props, err := marshalDraft(draft)
	if err != nil {
		return DraftRecord{}, err
	}
	var record DraftRecord
	if err := db.WithContext(ctx).Where("uuid = ? AND (author_uid = ? OR author_uid IS NULL)", uuid, uid).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return DraftRecord{}, ErrDraftNotFound.WithCause(err)
		}
		return DraftRecord{}, err
	}
	record.Lines = lines
	record.Timings = timings
	record.Properties = props
	record.AuthorUID = uid
	if err := db.WithContext(ctx).Save(&record).Error; err != nil {
		return DraftRecord{}, err
	}
	return record, nil
}

func listByUID(ctx context.Context, db *gorm.DB, uid string) ([]DraftRecord, error) {
	var records []DraftRecord
	if err := db.WithContext(ctx).Where("author_uid = ?", uid).Order("updated_at DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func findByUUIDAndUID(ctx context.Context, db *gorm.DB, uuid string, uid *string) (*DraftRecord, error) {
	var record DraftRecord
	if err := db.WithContext(ctx).
		Where("uuid = ? AND (author_uid = ? OR author_uid IS NULL)", uuid, uid).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDraftNotFound.WithCause(err)
		}
		return nil, err
	}
	return &record, nil
}

func deleteByUUIDAndUID(ctx context.Context, db *gorm.DB, uuid, uid string) error {
	return db.WithContext(ctx).Where("uuid = ? AND author_uid = ?", uuid, uid).Delete(&DraftRecord{}).Error
}

func deleteByUUID(ctx context.Context, db *gorm.DB, uuid string) error {
	return db.WithContext(ctx).Where("uuid = ?", uuid).Delete(&DraftRecord{}).Error
}

// ==============================================================================
// Helpers

func marshalDraft(draft chartpkg.ChartBase) (lines, timings, props datatypes.JSON, err error) {
	if lines, err = json.Marshal(draft.Lines); err != nil {
		return
	}
	if timings, err = json.Marshal(draft.Timings); err != nil {
		return
	}
	props, err = json.Marshal(draft.Properties)
	return
}

func unmarshalDraft(lines, timings, props datatypes.JSON, dst *chartpkg.ChartBase) error {
	if err := json.Unmarshal(lines, &dst.Lines); err != nil {
		return err
	}
	if err := json.Unmarshal(timings, &dst.Timings); err != nil {
		return err
	}
	return json.Unmarshal(props, &dst.Properties)
}

func (r *DraftRecord) toDraftChart() (chartpkg.DraftChart, error) {
	var d chartpkg.DraftChart
	d.UUID = r.UUID
	d.AuthorUID = r.AuthorUID
	d.CreatedAt = r.CreatedAt
	d.UpdatedAt = r.UpdatedAt

	if err := unmarshalDraft(r.Lines, r.Timings, r.Properties, &d.ChartBase); err != nil {
		return chartpkg.DraftChart{}, err
	}
	return d, nil
}
