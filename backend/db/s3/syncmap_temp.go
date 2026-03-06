package s3

import (
	"context"
	"fmt"
	"io"
	"singxd/db"
)

const syncmapTempPrefix = "syncmap_temp"

// ----------------------------------------------------------------
// SyncMap Temp Audio File
// ----------------------------------------------------------------
func SaveSyncMapTempAudioFile(ctx context.Context, s3Client *db.S3Client, tempID string, fileType string, data io.Reader) (string, error) {
	// fileType: "instrumental", "vocals", or "combined"
	key := fmt.Sprintf("%s/%s/audio/%s.mp3", syncmapTempPrefix, tempID, fileType)
	if err := s3Client.UploadFile(ctx, key, data); err != nil {
		return "", err
	}
	return key, nil
}
func GetSyncMapTempAudioFileURL(ctx context.Context, s3Client *db.S3Client, tempID string, fileType string) (string, error) {
	key := fmt.Sprintf("%s/%s/audio/%s.mp3", syncmapTempPrefix, tempID, fileType)
	return s3Client.GetPresignedURL(ctx, key, 3600)
}
func DeleteSyncMapTempAudioFile(ctx context.Context, s3Client *db.S3Client, tempID string, fileType string) error {
	key := fmt.Sprintf("%s/%s/audio/%s.mp3", syncmapTempPrefix, tempID, fileType)
	return s3Client.DeleteFile(ctx, key)
}
func ListSyncMapTempAudioFiles(ctx context.Context, s3Client *db.S3Client, tempID string) ([]string, error) {
	prefix := fmt.Sprintf("%s/%s/audio/", syncmapTempPrefix, tempID)
	return s3Client.ListFiles(ctx, prefix)
}
