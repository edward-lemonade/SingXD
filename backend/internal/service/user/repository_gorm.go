package user

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// ==============================================================================
// Model

func (UserRecord) TableName() string {
	return "users"
}

type UserRecord struct {
	ID          string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();uniqueIndex;not null"` // public id
	UID         string    `json:"uid" gorm:"uniqueIndex;not null;column:uid"`                         // firebase id
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	LastVisited time.Time `json:"lastVisited"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&UserRecord{})
}

// ==============================================================================
// Operations

func UpsertUserByUID(ctx context.Context, db *gorm.DB, uid string) error {
	return db.WithContext(ctx).
		Where(UserRecord{UID: uid}).
		FirstOrCreate(&UserRecord{UID: uid}).
		Error
}

func GetByUID(ctx context.Context, db *gorm.DB, uid string) (*UserRecord, error) {
	var record UserRecord
	err := db.WithContext(ctx).Where("uid = ?", uid).First(&record).Error
	return &record, err
}

func GetByID(ctx context.Context, db *gorm.DB, id uint) (*UserRecord, error) {
	var record UserRecord
	err := db.WithContext(ctx).First(&record, id).Error
	return &record, err
}

func UpdateLastVisitedByUID(ctx context.Context, db *gorm.DB, uid string) error {
	return db.WithContext(ctx).
		Model(&UserRecord{}).
		Where("uid = ?", uid).
		Update("last_visited", time.Now()).
		Error
}

func DeleteByUID(ctx context.Context, db *gorm.DB, id uint) error {
	return db.WithContext(ctx).Delete(&UserRecord{}, id).Error
}
