package draft

import (
	"context"
	"fmt"
	"singxd/internal/storage"
)

type S3Client = storage.S3Client

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

func getDraftURLs(ctx context.Context, s3Client *S3Client, uuid string, expiryMinutes uint) (instrumental, vocals, background *string, err error) {
	files, err := s3Client.ListFiles(ctx, dirPrefix(uuid))
	if err != nil {
		return nil, nil, nil, fmt.Errorf("listing files for uuid=%s: %w", uuid, err)
	}

	toPtr := func(p string) *string {
		k := storage.FindByPrefix(files, p)
		if k == "" {
			return nil
		}
		url, e := s3Client.GetPresignedURL(ctx, k, expiryMinutes)
		if e != nil {
			return nil
		}
		return &url
	}

	return toPtr(instrumentalPrefix), toPtr(vocalsPrefix), toPtr(backgroundPrefix), nil
}

func deleteDraftFiles(ctx context.Context, s3Client *S3Client, uuid string) error {
	files, err := s3Client.ListFiles(ctx, dirPrefix(uuid))
	if err != nil {
		return err
	}
	for _, k := range files {
		if err := s3Client.DeleteFile(ctx, k); err != nil {
			return fmt.Errorf("deleting %s: %w", k, err)
		}
	}
	return nil
}
