package draft

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"singxd/internal/storage"
	"strings"
)

type S3Client = storage.S3Client

const draftPrefix = "draft"

func draftAudioKey(UUID string, fileType string) string {
	return fmt.Sprintf("%s/%s/%s.wav", draftPrefix, UUID, fileType)
}

// ----------------------------------------------------------------
// Draft Audio File (vocals / inst / combined)

func SaveAudioFile(ctx context.Context, s3Client *S3Client, UUID string, fileType string, data io.Reader, expiryMinutes uint) (string, error) {
	key := draftAudioKey(UUID, fileType)
	if err := s3Client.UploadFileWithExpiry(ctx, key, data, expiryMinutes); err != nil {
		return "", err
	}
	return key, nil
}

func GetAudioFileURL(ctx context.Context, s3Client *S3Client, UUID string, fileType string, expiryMinutes uint) (string, error) {
	key := draftAudioKey(UUID, fileType)
	return s3Client.GetPresignedURL(ctx, key, expiryMinutes)
}

func DownloadAudioFile(ctx context.Context, s3Client *S3Client, UUID string, fileType string) ([]byte, error) {
	key := draftAudioKey(UUID, fileType)
	return s3Client.DownloadFile(ctx, key)
}

func DeleteAudioFile(ctx context.Context, s3Client *S3Client, UUID string, fileType string) error {
	key := draftAudioKey(UUID, fileType)
	return s3Client.DeleteFile(ctx, key)
}

func ListAudioFiles(ctx context.Context, s3Client *S3Client, UUID string) ([]string, error) {
	prefix := fmt.Sprintf("%s/%s/", draftPrefix, UUID)
	return s3Client.ListFiles(ctx, prefix)
}

func GetDraftURLs(ctx context.Context, s3Client *S3Client, UUID string, expiryMinutes uint) (instrumental, vocals, background *string, err error) {
	toPtr := func(url string, e error) *string {
		if e != nil || url == "" {
			return nil
		}
		return &url
	}

	instURL, instErr := GetAudioFileURL(ctx, s3Client, UUID, "instrumental", expiryMinutes)
	vocalsURL, vocalsErr := GetAudioFileURL(ctx, s3Client, UUID, "vocals", expiryMinutes)

	files, listErr := ListAudioFiles(ctx, s3Client, UUID)
	var bgURL string
	if listErr == nil {
		for _, f := range files {
			if strings.Contains(filepath.Base(f), "background") {
				bgURL, _ = GetBackgroundImageURL(ctx, s3Client, f, expiryMinutes)
				break
			}
		}
	}

	return toPtr(instURL, instErr), toPtr(vocalsURL, vocalsErr), toPtr(bgURL, nil), nil
}

// ----------------------------------------------------------------
// Draft Background Image

func SaveBackgroundImage(ctx context.Context, s3Client *S3Client, UUID string, ext string, data io.Reader) (string, error) {
	key := fmt.Sprintf("%s/%s/background%s", draftPrefix, UUID, ext)
	if err := s3Client.UploadFile(ctx, key, data); err != nil {
		return "", err
	}
	return key, nil
}

func GetBackgroundImageURL(ctx context.Context, s3Client *S3Client, key string, expiryMinutes uint) (string, error) {
	return s3Client.GetPresignedURL(ctx, key, expiryMinutes)
}
