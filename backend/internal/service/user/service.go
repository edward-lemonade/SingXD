package user

import "gorm.io/gorm"

type UserService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewUserService(s3Client *S3Client, db *gorm.DB) *UserService {
	return &UserService{s3Client: s3Client, db: db}
}

// =========================================================
// Operations
