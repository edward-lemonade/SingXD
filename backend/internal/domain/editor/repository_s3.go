package editor

import (
	"context"
	"fmt"
	"singxd/internal/storage"
)

const draftPrefix = "draft"

const (
	instrumentalPrefix = "instrumental"
	vocalsPrefix       = "vocals"
	backgroundPrefix   = "background"
)

func dirPrefix(uuid string) string {
	return fmt.Sprintf("%s/%s/", draftPrefix, uuid)
}

func audioKey(uuid, fileType, ext string) string {
	return fmt.Sprintf("%s/%s/%s%s", draftPrefix, uuid, fileType, ext)
}

func saveFile(ctx context.Context, s3Client *S3Client, uuid, fileType, ext string, data interface{ Read([]byte) (int, error) }, expiryMinutes uint) (string, error) {
	k := audioKey(uuid, fileType, ext)
	if err := s3Client.UploadFileWithExpiry(ctx, k, data, expiryMinutes); err != nil {
		return "", err
	}
	return k, nil
}

func getURL(ctx context.Context, s3Client *S3Client, uuid, fileType string, expiryMinutes uint) (string, error) {
	files, err := s3Client.ListFiles(ctx, dirPrefix(uuid))
	if err != nil {
		return "", fmt.Errorf("listing files for uuid=%s: %w", uuid, err)
	}
	k := storage.FindByPrefix(files, fileType)
	if k == "" {
		return "", fmt.Errorf("no %s file found for uuid=%s", fileType, uuid)
	}
	return s3Client.GetPresignedURL(ctx, k, expiryMinutes)
}

func downloadFile(ctx context.Context, s3Client *S3Client, uuid, fileType string) ([]byte, error) {
	files, err := s3Client.ListFiles(ctx, dirPrefix(uuid))
	if err != nil {
		return nil, fmt.Errorf("listing files for uuid=%s: %w", uuid, err)
	}
	k := storage.FindByPrefix(files, fileType)
	if k == "" {
		return nil, fmt.Errorf("no %s file found for uuid=%s", fileType, uuid)
	}
	return s3Client.DownloadFile(ctx, k)
}
