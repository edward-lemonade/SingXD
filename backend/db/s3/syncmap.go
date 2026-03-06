package s3

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"singxd/db"
)

const syncmapPrefix = "syncmap"

// Prefix returns the S3 key prefix for a syncmap (e.g. "syncmap/uuid/").
func SyncMapPrefix(uuid string) string {
	return fmt.Sprintf("%s/%s/", syncmapPrefix, uuid)
}

// Key returns the full S3 key for a file in a syncmap (e.g. "syncmap/uuid/vocals.wav").
func SyncMapKey(uuid, filename string) string {
	return fmt.Sprintf("%s/%s/%s", syncmapPrefix, uuid, filename)
}

// CreateFolder creates the syncmap folder placeholder in S3.
func CreateSyncMapFolder(ctx context.Context, s3Client *db.S3Client, uuid string) error {
	key := SyncMapPrefix(uuid)
	return s3Client.UploadFile(ctx, key, bytes.NewReader(nil))
}

// ListFiles returns all object keys under the syncmap prefix.
func ListSyncMapFiles(ctx context.Context, s3Client *db.S3Client, uuid string) ([]string, error) {
	return s3Client.ListFiles(ctx, SyncMapPrefix(uuid))
}

// MoveTempToSyncMap moves audio files from creates/:tempID/ and syncmap_temp/:tempID/audio/
// into syncmap/:uuid/. Returns the list of destination keys.
func MoveTempToSyncMap(ctx context.Context, s3Client *db.S3Client, tempID, uuid string) ([]string, error) {
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
