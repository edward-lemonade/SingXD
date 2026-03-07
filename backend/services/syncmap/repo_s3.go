package syncmap

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"singxd/storage"
	"strings"
)

type S3Client = storage.S3Client
type SongAudioType string

const (
	Instrumental SongAudioType = "instrumental"
	Vocals       SongAudioType = "vocals"
	Combined     SongAudioType = "combined"
)

const syncmapPrefix = "syncmap"

func SyncMapPrefix(id uint) string {
	return fmt.Sprintf("%s/%d/", syncmapPrefix, id)
}
func SyncMapKey(id uint, filename string) string {
	return fmt.Sprintf("%s/%d/%s", syncmapPrefix, id, filename)
}

// ====================================================================================
// Operations

func CreateSyncMapFolder(ctx context.Context, s3Client *S3Client, id uint) error {
	key := SyncMapPrefix(id)
	return s3Client.UploadFile(ctx, key, bytes.NewReader(nil))
}

func ListSyncMapFiles(ctx context.Context, s3Client *S3Client, ID uint) ([]string, error) {
	return s3Client.ListFiles(ctx, SyncMapPrefix(ID))
}

func MoveTempToSyncMap(ctx context.Context, s3Client *S3Client, sessionId string, id uint) ([]string, error) {
	var movedKeys []string
	prefix := fmt.Sprintf("syncmap_temp/%s/", sessionId)

	keys, err := s3Client.ListFiles(ctx, prefix)
	if err != nil {
		return nil, fmt.Errorf("listing temp files for session=%s: %w", sessionId, err)
	}

	for _, key := range keys {
		trimmed := strings.TrimPrefix(key, prefix)
		if trimmed == "" {
			continue
		}
		destKey := SyncMapKey(id, trimmed)
		if err := s3Client.MoveObject(ctx, key, destKey); err != nil {
			return nil, fmt.Errorf("moving %s -> %s: %w", key, destKey, err)
		}
		movedKeys = append(movedKeys, destKey)
	}

	return movedKeys, nil
}

func PrepareSyncMapMedia(ctx context.Context, s3Client *S3Client, sessionId string, id uint) (instKey string, backgroundKey *string, err error) {
	if err := CreateSyncMapFolder(ctx, s3Client, id); err != nil {
		return "", nil, fmt.Errorf("creating syncmap folder id=%d: %w", id, err)
	}

	destKeys, err := ListSyncMapFiles(ctx, s3Client, id)
	if err != nil {
		return "", nil, fmt.Errorf("listing syncmap files uuid=%d: %w", id, err)
	}

	audioKeys := make([]string, 0, len(destKeys))
	destPrefix := SyncMapPrefix(id)
	for _, k := range destKeys {
		if k == destPrefix || strings.HasSuffix(k, "/") {
			continue
		}
		audioKeys = append(audioKeys, k)
	}

	if len(audioKeys) == 0 {
		movedKeys, err := MoveTempToSyncMap(ctx, s3Client, sessionId, id)
		if err != nil {
			return "", nil, err
		}
		if len(movedKeys) == 0 {
			return "", nil, ErrNoAudioFilesForSession
		}
		audioKeys = movedKeys
	}

	instKey = findInstrumentalKey(audioKeys)
	if instKey == "" {
		return "", nil, ErrNoInstrumentalFile
	}

	if bgKey := findBackgroundImageKey(audioKeys); bgKey != "" {
		backgroundKey = &bgKey
	}

	return instKey, backgroundKey, nil
}

func GetSyncMapMediaURL(ctx context.Context, s3Client *S3Client, key string, expirySeconds int64) (string, error) {
	url, err := s3Client.GetPresignedURL(ctx, key, expirySeconds)
	if err != nil {
		return "", fmt.Errorf("getting presigned url for key=%s: %w", key, err)
	}
	return url, nil
}

// ====================================================================================
// Helpers

func resolveMediaKeys(keys []string, id uint) (instKey string, bgKey *string, err error) {
	prefix := SyncMapPrefix(id)
	var fileKeys []string
	for _, k := range keys {
		if k == prefix || strings.HasSuffix(k, "/") {
			continue
		}
		fileKeys = append(fileKeys, k)
	}

	instKey = findInstrumentalKey(fileKeys)
	if instKey == "" {
		return "", nil, ErrNoInstrumentalFile
	}

	if bg := findBackgroundImageKey(fileKeys); bg != "" {
		bgKey = &bg
	}

	return instKey, bgKey, nil
}

func findInstrumentalKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.Contains(base, "instrumental") {
			return k
		}
	}
	return ""
}

func findBackgroundImageKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.HasPrefix(base, "background") {
			return k
		}
	}
	return ""
}
