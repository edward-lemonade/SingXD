package user

import (
	"log"

	"gorm.io/gorm"
)

type UserService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewUserService(s3Client *S3Client, db *gorm.DB) *UserService {
	if err := db.AutoMigrate(&UserRecord{}); err != nil {
		log.Fatal(err)
	}
	return &UserService{s3Client: s3Client, db: db}
}

// =========================================================
// Operations
