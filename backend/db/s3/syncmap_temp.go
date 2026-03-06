package s3

import (
	"context"
	"fmt"
	"io"
)

const syncmapTempPrefix = "syncmap_temp"

func syncMapTempAudioKey(tempID, fileType string) string {
	// We store separated audio as WAV files named by type: vocals.wav, instrumental.wav, etc.
	return fmt.Sprintf("%s/%s/%s.wav", syncmapTempPrefix, tempID, fileType)
}

// ----------------------------------------------------------------
// SyncMap Temp Audio File (vocals / inst / combined)
// ----------------------------------------------------------------

// SaveSyncMapTempAudioFile uploads a temp audio file of the given type
// (e.g. "vocals", "inst", "combined") and returns its S3 key.
func SaveSyncMapTempAudioFile(ctx context.Context, s3Client *S3Client, tempID string, fileType string, data io.Reader, expiryMinutes int) (string, error) {
	key := syncMapTempAudioKey(tempID, fileType)
	if err := s3Client.UploadFileWithExpiry(ctx, key, data, expiryMinutes); err != nil {
		return "", err
	}
	return key, nil
}

func GetSyncMapTempAudioFileURL(ctx context.Context, s3Client *S3Client, tempID string, fileType string, expirySeconds int64) (string, error) {
	key := syncMapTempAudioKey(tempID, fileType)
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}

func DownloadSyncMapTempAudioFile(ctx context.Context, s3Client *S3Client, tempID string, fileType string) ([]byte, error) {
	key := syncMapTempAudioKey(tempID, fileType)
	return s3Client.DownloadFile(ctx, key)
}

func DeleteSyncMapTempAudioFile(ctx context.Context, s3Client *S3Client, tempID string, fileType string) error {
	key := syncMapTempAudioKey(tempID, fileType)
	return s3Client.DeleteFile(ctx, key)
}
func ListSyncMapTempAudioFiles(ctx context.Context, s3Client *S3Client, tempID string) ([]string, error) {
	prefix := fmt.Sprintf("%s/%s/", syncmapTempPrefix, tempID)
	return s3Client.ListFiles(ctx, prefix)
}

// ----------------------------------------------------------------
// SyncMap Temp Background Image
// ----------------------------------------------------------------

// SaveSyncMapTempBackgroundImage uploads a background image for a temp syncmap
// session and returns the S3 key.
func SaveSyncMapTempBackgroundImage(ctx context.Context, s3Client *S3Client, tempID string, ext string, data io.Reader) (string, error) {
	key := fmt.Sprintf("%s/%s/background%s", syncmapTempPrefix, tempID, ext)
	if err := s3Client.UploadFile(ctx, key, data); err != nil {
		return "", err
	}
	return key, nil
}

// GetSyncMapTempBackgroundImageURL returns a presigned URL for a temp background image.
func GetSyncMapTempBackgroundImageURL(ctx context.Context, s3Client *S3Client, key string, expirySeconds int64) (string, error) {
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}
