package chart

import (
	"context"
	"fmt"
	"log"
	"singxd/internal/storage"
	"strings"
)

type S3Client = storage.S3Client

const chartPrefix = "chart"

const (
	instrumentalPrefix = "instrumental"
	vocalsPrefix       = "vocals"
	backgroundPrefix   = "background"
)

func dirPrefix(id uint) string {
	return fmt.Sprintf("%s/%d/", chartPrefix, id)
}

func key(id uint, filename string) string {
	return fmt.Sprintf("%s/%d/%s", chartPrefix, id, filename)
}

func moveDraftToChart(ctx context.Context, s3Client *S3Client, uuid string, id uint) error {
	draftPrefix := fmt.Sprintf("draft/%s/", uuid)

	keys, err := s3Client.ListFiles(ctx, draftPrefix)
	if err != nil {
		return fmt.Errorf("listing files for draft uuid=%s: %w", uuid, err)
	}
	if len(keys) == 0 {
		return ErrNoAudioFilesForUUID
	}

	var movedKeys []string
	for _, k := range keys {
		trimmed := strings.TrimPrefix(k, draftPrefix)
		if trimmed == "" {
			log.Printf("skipping moving key %s, trimmed was empty", k)
			continue
		}
		dest := key(id, trimmed)
		if err := s3Client.MoveObject(ctx, k, dest); err != nil {
			return fmt.Errorf("moving %s -> %s: %w", k, dest, err)
		}
		movedKeys = append(movedKeys, dest)
	}

	if storage.FindByPrefix(movedKeys, instrumentalPrefix) == "" {
		return ErrNoInstrumentalFile
	}
	if storage.FindByPrefix(movedKeys, vocalsPrefix) == "" {
		return ErrNoVocalsFile
	}
	if storage.FindByPrefix(movedKeys, backgroundPrefix) == "" {
		log.Println("No background moved")
	}

	return nil
}

func getVocalsFile(ctx context.Context, s3Client *S3Client, id uint) ([]byte, error) {
	files, err := s3Client.ListFiles(ctx, dirPrefix(id))
	if err != nil {
		return nil, fmt.Errorf("listing files for id=%d: %w", id, err)
	}
	k := storage.FindByPrefix(files, vocalsPrefix)
	if k == "" {
		return nil, ErrNoVocalsFile
	}
	data, err := s3Client.DownloadFile(ctx, k)
	if err != nil {
		return nil, fmt.Errorf("downloading vocals id=%d: %w", id, err)
	}
	return data, nil
}

func getChartURLs(ctx context.Context, s3Client *S3Client, id uint, expiryMinutes uint) (audio, background *string, err error) {
	files, err := s3Client.ListFiles(ctx, dirPrefix(id))
	if err != nil {
		return nil, nil, fmt.Errorf("listing files for id=%d: %w", id, err)
	}

	toPtr := func(p string) *string {
		k := storage.FindByPrefix(files, p)
		if k == "" {
			return nil
		}
		url, err := s3Client.GetPresignedURL(ctx, k, expiryMinutes)
		if err != nil {
			return nil
		}
		return &url
	}

	return toPtr(instrumentalPrefix), toPtr(backgroundPrefix), nil
}

func getChartThumbnails(ctx context.Context, s3Client *S3Client, ids []uint, expiryMinutes uint) (map[uint]*string, error) {
	type result struct {
		id  uint
		key string
		err error
	}

	ch := make(chan result, len(ids))
	for _, id := range ids {
		go func(id uint) {
			files, err := s3Client.ListFiles(ctx, dirPrefix(id))
			if err != nil {
				ch <- result{id: id, err: err}
				return
			}
			ch <- result{id: id, key: storage.FindByPrefix(files, backgroundPrefix)}
		}(id)
	}

	bgKeys := make(map[uint]string, len(ids))
	for range ids {
		r := <-ch
		if r.err != nil {
			return nil, fmt.Errorf("listing files for id=%d: %w", r.id, r.err)
		}
		if r.key != "" {
			bgKeys[r.id] = r.key
		}
	}

	keys := make([]string, 0, len(bgKeys))
	for _, k := range bgKeys {
		keys = append(keys, k)
	}

	urls := s3Client.GetPresignedURLs(ctx, keys, expiryMinutes)

	out := make(map[uint]*string, len(bgKeys))
	for id, k := range bgKeys {
		if url, ok := urls[k]; ok {
			u := url
			out[id] = &u
		}
	}
	return out, nil
}
