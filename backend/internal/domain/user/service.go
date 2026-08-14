package user

import (
	"context"
	"errors"
	"log"

	"singxd/internal/types"

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

func (s *UserService) GetOrCreateByUID(ctx context.Context, uid string) (*types.User, error) {
	if err := UpsertUserByUID(ctx, s.db, uid); err != nil {
		return nil, err
	}

	record, err := GetByUID(ctx, s.db, uid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &types.User{
		ID:          record.ID,
		UID:         record.UID,
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
		LastVisited: record.LastVisited,
		Username:    record.Username,
		Description: record.Description,
	}, nil
}
