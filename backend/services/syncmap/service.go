package syncmap

import (
	"context"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"

	t "singxd/services/types"
)

type SyncMapService struct {
	s3Client *S3Client
	db       *gorm.DB
}

func NewSyncMapService(s3Client *S3Client, db *gorm.DB) *SyncMapService {
	return &SyncMapService{
		s3Client: s3Client,
		db:       db,
	}
}

// =========================================================
// Operations

func (s *SyncMapService) CreateMap(ctx context.Context, sessionId string, syncMap t.SyncMapDraft) (*t.SyncMap, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	// SaveSyncMap returns the DB record
	record, err := SaveSyncMap(ctx, s.db, syncMap)
	if err != nil {
		return nil, fmt.Errorf("saving syncmap: %w", err)
	}

	// Convert DB record to typed t.SyncMap
	newSyncMap := &t.SyncMap{
		Author:    record.Author,
		CreatedAt: record.CreatedAt,
		UpdatedAt: record.UpdatedAt,
	}
	newSyncMap.ID = record.ID
	json.Unmarshal(record.Lines, &newSyncMap.Lines)
	json.Unmarshal(record.Timings, &newSyncMap.Timings)
	json.Unmarshal(record.Properties, &newSyncMap.Properties)

	if err := json.Unmarshal(record.Lines, &newSyncMap.Lines); err != nil {
		return nil, fmt.Errorf("unmarshal lines: %w", err)
	}
	if err := json.Unmarshal(record.Timings, &newSyncMap.Timings); err != nil {
		return nil, fmt.Errorf("unmarshal timings: %w", err)
	}
	if err := json.Unmarshal(record.Properties, &newSyncMap.Properties); err != nil {
		return nil, fmt.Errorf("unmarshal properties: %w", err)
	}

	// Prepare media in S3
	if _, _, err := PrepareSyncMapMedia(ctx, s.s3Client, sessionId, newSyncMap.ID); err != nil {
		return nil, err
	}

	return newSyncMap, nil
}
func (s *SyncMapService) FindByID(ctx context.Context, id uint) (*t.SyncMap, error) {
	if s.db == nil {
		return nil, ErrDbNotConfigured
	}

	syncMap, err := GetSyncMap(ctx, s.db, id)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrSyncMapNotFound, err)
	}

	files, err := ListSyncMapFiles(ctx, s.s3Client, syncMap.ID)
	if err != nil {
		return nil, fmt.Errorf("listing files id=%d: %w", syncMap.ID, err)
	}

	instKey, bgKey, err := resolveMediaKeys(files, syncMap.ID)
	if err != nil {
		return nil, err
	}

	audioURL, err := GetSyncMapMediaURL(ctx, s.s3Client, instKey, 3600)
	if err != nil {
		return nil, err
	}
	syncMap.Properties.AudioURL = &audioURL

	if bgKey != nil {
		bgURL, err := GetSyncMapMediaURL(ctx, s.s3Client, *bgKey, 3600)
		if err != nil {
			return nil, err
		}
		syncMap.Properties.BackgroundImageURL = &bgURL
	}

	return syncMap, nil
}
