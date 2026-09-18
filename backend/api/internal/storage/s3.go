package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Client struct {
	client *s3.Client
	bucket string
}

func NewS3Client(ctx context.Context, bucket string) (*S3Client, error) {
	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithRegion(os.Getenv("AWS_REGION")))
	if err != nil {
		return nil, err
	}

	return &S3Client{
		client: s3.NewFromConfig(cfg),
		bucket: bucket,
	}, nil
}

func (sc *S3Client) UploadFile(ctx context.Context, key string, body io.Reader) error {
	_, err := sc.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(sc.bucket),
		Key:    aws.String(key),
		Body:   body,
	})
	return err
}

func (sc *S3Client) UploadFileWithExpiry(ctx context.Context, key string, body io.Reader, expiryMinutes uint) error {
	_, err := sc.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:  aws.String(sc.bucket),
		Key:     aws.String(key),
		Body:    body,
		Expires: aws.Time(time.Now().Add(time.Duration(expiryMinutes) * time.Minute)),
	})
	return err
}

func (sc *S3Client) DownloadFile(ctx context.Context, key string) ([]byte, error) {
	result, err := sc.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(sc.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()

	return io.ReadAll(result.Body)
}

func (sc *S3Client) DeleteFile(ctx context.Context, key string) error {
	_, err := sc.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(sc.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (sc *S3Client) GetPresignedURL(ctx context.Context, key string, expiryMinutes uint) (string, error) {
	presigner := s3.NewPresignClient(sc.client)
	result, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(sc.bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expiryMinutes) * time.Minute
	})
	if err != nil {
		return "", err
	}
	return result.URL, nil
}

func (sc *S3Client) GetPresignedURLs(ctx context.Context, keys []string, expiryMinutes uint) map[string]string {
	presigner := s3.NewPresignClient(sc.client)
	expiry := time.Duration(expiryMinutes) * time.Minute
	result := make(map[string]string, len(keys))
	for _, key := range keys {
		r, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(sc.bucket),
			Key:    aws.String(key),
		}, func(opts *s3.PresignOptions) {
			opts.Expires = expiry
		})
		if err != nil {
			continue
		}
		result[key] = r.URL
	}
	return result
}

func (sc *S3Client) ListFiles(ctx context.Context, prefix string) ([]string, error) {
	result, err := sc.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(sc.bucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return nil, err
	}

	var keys []string
	for _, obj := range result.Contents {
		keys = append(keys, *obj.Key)
	}
	return keys, nil
}

func FindByPrefix(keys []string, prefix string) string {
	for _, k := range keys {
		if strings.HasPrefix(strings.ToLower(filepath.Base(k)), prefix) {
			return k
		}
	}
	return ""
}

func (sc *S3Client) MoveObject(ctx context.Context, sourceKey string, destKey string) error {
	copySource := url.PathEscape(fmt.Sprintf("%s/%s", sc.bucket, sourceKey))
	_, err := sc.client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     aws.String(sc.bucket),
		CopySource: aws.String(copySource),
		Key:        aws.String(destKey),
	})
	if err != nil {
		return err
	}

	return sc.DeleteFile(ctx, sourceKey)
}
