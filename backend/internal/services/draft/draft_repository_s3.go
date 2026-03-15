package draft

import (
	"context"
	"fmt"
	"io"
	"singxd/internal/storage"
)

type S3Client = storage.S3Client

const chartTempPrefix = "chart_temp"

func chartTempAudioKey(sessionID string, fileType string) string {
	return fmt.Sprintf("%s/%s/%s.wav", chartTempPrefix, sessionID, fileType)
}

// ----------------------------------------------------------------
// Draft Audio File (vocals / inst / combined)

func SaveChartTempAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string, data io.Reader, expiryMinutes int) (string, error) {
	key := chartTempAudioKey(sessionID, fileType)
	if err := s3Client.UploadFileWithExpiry(ctx, key, data, expiryMinutes); err != nil {
		return "", err
	}
	return key, nil
}

func GetChartTempAudioFileURL(ctx context.Context, s3Client *S3Client, sessionID string, fileType string, expirySeconds int64) (string, error) {
	key := chartTempAudioKey(sessionID, fileType)
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}

func DownloadChartTempAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string) ([]byte, error) {
	key := chartTempAudioKey(sessionID, fileType)
	return s3Client.DownloadFile(ctx, key)
}

func DeleteChartTempAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string) error {
	key := chartTempAudioKey(sessionID, fileType)
	return s3Client.DeleteFile(ctx, key)
}

func ListChartTempAudioFiles(ctx context.Context, s3Client *S3Client, sessionID string) ([]string, error) {
	prefix := fmt.Sprintf("%s/%s/", chartTempPrefix, sessionID)
	return s3Client.ListFiles(ctx, prefix)
}

// ----------------------------------------------------------------
// Draft Background Image

func SaveChartTempBackgroundImage(ctx context.Context, s3Client *S3Client, sessionID string, ext string, data io.Reader) (string, error) {
	key := fmt.Sprintf("%s/%s/background%s", chartTempPrefix, sessionID, ext)
	if err := s3Client.UploadFile(ctx, key, data); err != nil {
		return "", err
	}
	return key, nil
}

func GetChartTempBackgroundImageURL(ctx context.Context, s3Client *S3Client, key string, expirySeconds int64) (string, error) {
	return s3Client.GetPresignedURL(ctx, key, expirySeconds)
}
