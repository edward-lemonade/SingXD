package db

import (
	"context"
	"fmt"
	"io"
)

// ----------------------------------------------------------------
// Audio File
// ----------------------------------------------------------------
func SaveAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string, data io.Reader) (string, error) {
	// fileType: "instrumental", "vocals", or "combined"
	key := fmt.Sprintf("sessions/%s/audio/%s.mp3", sessionID, fileType)
	if err := s3Client.UploadFile(ctx, key, data); err != nil {
		return "", err
	}
	return key, nil
}
func GetAudioFileURL(ctx context.Context, s3Client *S3Client, sessionID string, fileType string) (string, error) {
	key := fmt.Sprintf("sessions/%s/audio/%s.mp3", sessionID, fileType)
	return s3Client.GetPresignedURL(ctx, key, 3600)
}
func DeleteAudioFile(ctx context.Context, s3Client *S3Client, sessionID string, fileType string) error {
	key := fmt.Sprintf("sessions/%s/audio/%s.mp3", sessionID, fileType)
	return s3Client.DeleteFile(ctx, key)
}
func ListAudioFiles(ctx context.Context, s3Client *S3Client, sessionID string) ([]string, error) {
	prefix := fmt.Sprintf("sessions/%s/audio/", sessionID)
	return s3Client.ListFiles(ctx, prefix)
}
