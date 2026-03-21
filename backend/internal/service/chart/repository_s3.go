package chart

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"singxd/internal/storage"
	"strings"
)

type S3Client = storage.S3Client

const (
	chartPrefix     = "chart"
	chartTempPrefix = "chart_temp"
)

const (
	instrumentalPrefix = "instrumental"
	vocalsPrefix       = "vocals"
	backgroundPrefix   = "background"
)

func ChartPrefix(id uint) string {
	return fmt.Sprintf("%s/%d/", chartPrefix, id)
}

func ChartKey(id uint, filename string) string {
	return fmt.Sprintf("%s/%d/%s", chartPrefix, id, filename)
}

// ====================================================================================
// Operations

func ListChartFiles(ctx context.Context, s3Client *S3Client, id uint) ([]string, error) {
	return s3Client.ListFiles(ctx, ChartPrefix(id))
}

func MoveTempToChart(ctx context.Context, s3Client *S3Client, sessionId string, id uint) ([]string, error) {
	prefix := fmt.Sprintf("%s/%s/", chartTempPrefix, sessionId)

	keys, err := s3Client.ListFiles(ctx, prefix)
	if err != nil {
		return nil, fmt.Errorf("listing temp files for session=%s: %w", sessionId, err)
	}

	var movedKeys []string
	for _, key := range keys {
		trimmed := strings.TrimPrefix(key, prefix)
		if trimmed == "" {
			log.Printf("skipping moving key %s, trimmed was empty", key)
			continue
		}
		destKey := ChartKey(id, trimmed)
		if err := s3Client.MoveObject(ctx, key, destKey); err != nil {
			return nil, fmt.Errorf("moving %s -> %s: %w", key, destKey, err)
		}
		movedKeys = append(movedKeys, destKey)
	}

	return movedKeys, nil
}

func GetInstrumentalURL(ctx context.Context, s3Client *S3Client, id uint, expiryMinutes uint) (string, error) {
	files, err := s3Client.ListFiles(ctx, ChartPrefix(id))
	if err != nil {
		return "", fmt.Errorf("listing files for id=%d: %w", id, err)
	}
	key := findKeyByPrefix(files, instrumentalPrefix)
	if key == "" {
		return "", ErrNoInstrumentalFile
	}
	url, err := s3Client.GetPresignedURL(ctx, key, expiryMinutes)
	if err != nil {
		return "", fmt.Errorf("getting presigned url for instrumental id=%d: %w", id, err)
	}
	return url, nil
}

func GetVocalsURL(ctx context.Context, s3Client *S3Client, id uint, expiryMinutes uint) (string, error) {
	files, err := s3Client.ListFiles(ctx, ChartPrefix(id))
	if err != nil {
		return "", fmt.Errorf("listing files for id=%d: %w", id, err)
	}
	key := findKeyByPrefix(files, vocalsPrefix)
	if key == "" {
		return "", ErrNoVocalsFile
	}
	url, err := s3Client.GetPresignedURL(ctx, key, expiryMinutes)
	if err != nil {
		return "", fmt.Errorf("getting presigned url for vocals id=%d: %w", id, err)
	}
	return url, nil
}

func GetBackgroundURL(ctx context.Context, s3Client *S3Client, id uint, expiryMinutes uint) (string, error) {
	files, err := s3Client.ListFiles(ctx, ChartPrefix(id))
	if err != nil {
		return "", fmt.Errorf("listing files for id=%d: %w", id, err)
	}
	key := findKeyByPrefix(files, backgroundPrefix)
	if key == "" {
		log.Printf("No background key found for chart id=%d", id)
		return "", nil
	}
	url, err := s3Client.GetPresignedURL(ctx, key, expiryMinutes)
	if err != nil {
		return "", fmt.Errorf("getting presigned url for background id=%d: %w", id, err)
	}
	return url, nil
}

func GetVocalsFile(ctx context.Context, s3Client *S3Client, id uint) ([]byte, error) {
	file := fmt.Sprintf("%s.%s", vocalsPrefix, "wav")
	return downloadFile(ctx, s3Client, ChartKey(id, file))
}

func GetInstrumentalFile(ctx context.Context, s3Client *S3Client, id uint) ([]byte, error) {
	file := fmt.Sprintf("%s.%s", instrumentalPrefix, "wav")
	return downloadFile(ctx, s3Client, ChartKey(id, file))
}

func GetBackgroundFile(ctx context.Context, s3Client *S3Client, id uint) ([]byte, error) {
	files, err := s3Client.ListFiles(ctx, ChartPrefix(id))
	if err != nil {
		return nil, fmt.Errorf("listing files for id=%d: %w", id, err)
	}
	key := findKeyByPrefix(files, backgroundPrefix)
	if key == "" {
		return nil, nil
	}
	return downloadFile(ctx, s3Client, key)
}

// ====================================================================================
// Helpers

func findKeyByPrefix(keys []string, prefix string) string {
	for _, k := range keys {
		if strings.HasPrefix(strings.ToLower(filepath.Base(k)), prefix) {
			return k
		}
	}
	return ""
}

func downloadFile(ctx context.Context, s3Client *S3Client, key string) ([]byte, error) {
	data, err := s3Client.DownloadFile(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("downloading key=%s: %w", key, err)
	}
	return data, nil
}
