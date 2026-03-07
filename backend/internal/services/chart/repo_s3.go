package chart

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"singxd/internal/storage"
	"strings"
)

type S3Client = storage.S3Client
type SongAudioType string

const (
	Instrumental SongAudioType = "instrumental"
	Vocals       SongAudioType = "vocals"
	Combined     SongAudioType = "combined"
)

const chartPrefix = "chart"

func ChartPrefix(id uint) string {
	return fmt.Sprintf("%s/%d/", chartPrefix, id)
}
func ChartKey(id uint, filename string) string {
	return fmt.Sprintf("%s/%d/%s", chartPrefix, id, filename)
}

// ====================================================================================
// Operations

func CreateChartFolder(ctx context.Context, s3Client *S3Client, id uint) error {
	key := ChartPrefix(id)
	return s3Client.UploadFile(ctx, key, bytes.NewReader(nil))
}

func ListChartFiles(ctx context.Context, s3Client *S3Client, ID uint) ([]string, error) {
	return s3Client.ListFiles(ctx, ChartPrefix(ID))
}

func MoveTempToChart(ctx context.Context, s3Client *S3Client, sessionId string, id uint) ([]string, error) {
	var movedKeys []string
	prefix := fmt.Sprintf("chart_temp/%s/", sessionId)

	keys, err := s3Client.ListFiles(ctx, prefix)
	if err != nil {
		return nil, fmt.Errorf("listing temp files for session=%s: %w", sessionId, err)
	}

	for _, key := range keys {
		trimmed := strings.TrimPrefix(key, prefix)
		if trimmed == "" {
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

func PrepareChartMedia(ctx context.Context, s3Client *S3Client, sessionId string, id uint) (instKey string, backgroundKey *string, err error) {
	if err := CreateChartFolder(ctx, s3Client, id); err != nil {
		return "", nil, fmt.Errorf("creating chart folder id=%d: %w", id, err)
	}

	destKeys, err := ListChartFiles(ctx, s3Client, id)
	if err != nil {
		return "", nil, fmt.Errorf("listing chart files uuid=%d: %w", id, err)
	}

	audioKeys := make([]string, 0, len(destKeys))
	destPrefix := ChartPrefix(id)
	for _, k := range destKeys {
		if k == destPrefix || strings.HasSuffix(k, "/") {
			continue
		}
		audioKeys = append(audioKeys, k)
	}

	if len(audioKeys) == 0 {
		movedKeys, err := MoveTempToChart(ctx, s3Client, sessionId, id)
		if err != nil {
			return "", nil, err
		}
		if len(movedKeys) == 0 {
			return "", nil, ErrNoAudioFilesForSession
		}
		audioKeys = movedKeys
	}

	instKey = findInstrumentalKey(audioKeys)
	if instKey == "" {
		return "", nil, ErrNoInstrumentalFile
	}

	if bgKey := findBackgroundImageKey(audioKeys); bgKey != "" {
		backgroundKey = &bgKey
	}

	return instKey, backgroundKey, nil
}

func GetChartMediaURL(ctx context.Context, s3Client *S3Client, key string, expirySeconds int64) (string, error) {
	url, err := s3Client.GetPresignedURL(ctx, key, expirySeconds)
	if err != nil {
		return "", fmt.Errorf("getting presigned url for key=%s: %w", key, err)
	}
	return url, nil
}

// ====================================================================================
// Helpers

func resolveMediaKeys(keys []string, id uint) (instKey string, bgKey *string, err error) {
	prefix := ChartPrefix(id)
	var fileKeys []string
	for _, k := range keys {
		if k == prefix || strings.HasSuffix(k, "/") {
			continue
		}
		fileKeys = append(fileKeys, k)
	}

	instKey = findInstrumentalKey(fileKeys)
	if instKey == "" {
		return "", nil, ErrNoInstrumentalFile
	}

	if bg := findBackgroundImageKey(fileKeys); bg != "" {
		bgKey = &bg
	}

	return instKey, bgKey, nil
}

func findInstrumentalKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.Contains(base, "instrumental") {
			return k
		}
	}
	return ""
}

func findBackgroundImageKey(keys []string) string {
	for _, k := range keys {
		base := strings.ToLower(filepath.Base(k))
		if strings.HasPrefix(base, "background") {
			return k
		}
	}
	return ""
}
