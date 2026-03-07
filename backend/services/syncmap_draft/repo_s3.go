package syncmap_draft

import (
	"context"
	"fmt"
	"io"
	"singxd/storage"
)

type S3Client = storage.S3Client

const syncmapTempPrefix = "syncmap_temp"

func syncMapTempAudioKey(sessionID string, fileType string) string {
	return fmt.Sprintf("%s/%s/%s.wav", syncmapTempPrefix, sessionID, fileType)
}

// ----------------------------------------------------------------
// SyncMap Draft Audio File (vocals / inst / combined)

func SaveSyncMapTempAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string, data io.Reader, expiryMinutes int) (string, error) {
	key := syncMapTempAudioKey(sessionID, fileType)
	if err := s3Client.UploadFileWithExpiry(ctx, key, data, expiryMinutes); err != nil {
		return "", err
	}
	return key, nil
}

func GetSyncMapTempAudioFileURL(ctx context.Context, s3Client *S3Client, sessionID string, fileType string, expirySeconds int64) (string, error) {
	key := syncMapTempAudioKey(sessionID, fileType)
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}

func DownloadSyncMapTempAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string) ([]byte, error) {
	key := syncMapTempAudioKey(sessionID, fileType)
	return s3Client.DownloadFile(ctx, key)
}

func DeleteSyncMapTempAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string) error {
	key := syncMapTempAudioKey(sessionID, fileType)
	return s3Client.DeleteFile(ctx, key)
}

func ListSyncMapTempAudioFiles(ctx context.Context, s3Client *S3Client, sessionID string) ([]string, error) {
	prefix := fmt.Sprintf("%s/%s/", syncmapTempPrefix, sessionID)
	return s3Client.ListFiles(ctx, prefix)
}

// ----------------------------------------------------------------
// SyncMap Draft Background Image

func SaveSyncMapTempBackgroundImage(ctx context.Context, s3Client *S3Client, sessionID string, ext string, data io.Reader) (string, error) {
	key := fmt.Sprintf("%s/%s/background%s", syncmapTempPrefix, sessionID, ext)
	if err := s3Client.UploadFile(ctx, key, data); err != nil {
		return "", err
	}
	return key, nil
}

func GetSyncMapTempBackgroundImageURL(ctx context.Context, s3Client *S3Client, key string, expirySeconds int64) (string, error) {
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}
