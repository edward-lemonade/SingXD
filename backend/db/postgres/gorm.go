package postgres

import (
	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewGormDB(databaseURL string) (*gorm.DB, error) {
	return gorm.Open(gormpostgres.Open(databaseURL), &gorm.Config{})
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&SyncMapRecord{})
}
