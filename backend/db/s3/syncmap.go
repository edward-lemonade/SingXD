package s3

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

const syncmapPrefix = "syncmap"

type SongAudioType string

const (
	Instrumental SongAudioType = "instrumental"
	Vocals       SongAudioType = "vocals"
	Combined     SongAudioType = "combined"
)

func SyncMapPrefix(uuid string) string {
	return fmt.Sprintf("%s/%s/", syncmapPrefix, uuid)
}
func SyncMapKey(uuid, filename string) string {
	return fmt.Sprintf("%s/%s/%s", syncmapPrefix, uuid, filename)
}

// ----------------------------------------------------------------
// SyncMap Temp Audio File
// ----------------------------------------------------------------

func CreateSyncMapFolder(ctx context.Context, s3Client *S3Client, uuid string) error {
	key := SyncMapPrefix(uuid)
	return s3Client.UploadFile(ctx, key, bytes.NewReader(nil))
}

func ListSyncMapFiles(ctx context.Context, s3Client *S3Client, uuid string) ([]string, error) {
	return s3Client.ListFiles(ctx, SyncMapPrefix(uuid))
}

func MoveTempToSyncMap(ctx context.Context, s3Client *S3Client, tempID string, uuid string) ([]string, error) {
	var movedKeys []string
	prefixes := []string{
		fmt.Sprintf("syncmap_temp/%s/", tempID),
	}

	for _, prefix := range prefixes {
		keys, err := s3Client.ListFiles(ctx, prefix)
		if err != nil {
			return nil, err
		}

		for _, key := range keys {
			trimmed := strings.TrimPrefix(key, prefix)
			if trimmed == "" {
				continue
			}
			destKey := SyncMapKey(uuid, trimmed)
			if err := s3Client.MoveObject(ctx, key, destKey); err != nil {
				return nil, err
			}
			movedKeys = append(movedKeys, destKey)
		}
	}

	return movedKeys, nil
}

// Domain-specific errors for syncmap media preparation.
var (
	ErrNoAudioFilesForSession = errors.New("no audio files found for session")
	ErrNoInstrumentalFile     = errors.New("no instrumental audio file found")
)

// PrepareSyncMapMedia ensures the syncmap folder exists, moves any temp
// files for tempID into the syncmap if needed, and returns the key for
// the instrumental audio plus an optional background image key.
func PrepareSyncMapMedia(ctx context.Context, s3Client *S3Client, tempID, uuid string) (instKey string, backgroundKey *string, err error) {
	if err := CreateSyncMapFolder(ctx, s3Client, uuid); err != nil {
		return "", nil, err
	}

	destKeys, err := ListSyncMapFiles(ctx, s3Client, uuid)
	if err != nil {
		return "", nil, err
	}

	// If destination already has files (e.g. retry after a partial publish),
	// don't try to move again from temp.
	audioKeys := make([]string, 0, len(destKeys))
	destPrefix := SyncMapPrefix(uuid)
	for _, k := range destKeys {
		if k == destPrefix || strings.HasSuffix(k, "/") {
			continue
		}
		audioKeys = append(audioKeys, k)
	}

	if len(audioKeys) == 0 {
		movedKeys, err := MoveTempToSyncMap(ctx, s3Client, tempID, uuid)
		if err != nil {
			return "", nil, err
		}
		if len(movedKeys) == 0 {
			return "", nil, ErrNoAudioFilesForSession
		}
		audioKeys = movedKeys
	}

	instKey = findInstKey(audioKeys)
	if instKey == "" {
		return "", nil, ErrNoInstrumentalFile
	}

	if bgKey := findBackgroundImageKey(audioKeys); bgKey != "" {
		backgroundKey = &bgKey
	}

	return instKey, backgroundKey, nil
}

// GetSyncMapMediaURL returns a presigned URL for a syncmap media object.
func GetSyncMapMediaURL(ctx context.Context, s3Client *S3Client, key string, expirySeconds int64) (string, error) {
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}

// findInstKey returns the key for the instrumental audio file.
func findInstKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.Contains(base, "instrumental") {
			return k
		}
	}
	return ""
}

// findBackgroundImageKey returns the key for the background image file, if any.
func findBackgroundImageKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.HasPrefix(base, "background") {
			return k
		}
	}
	return ""
}
