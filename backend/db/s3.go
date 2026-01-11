package db

import (
	"context"
	"io"
	"os"
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

func (sc *S3Client) UploadFileWithExpiry(ctx context.Context, key string, body io.Reader, expiryMinutes int) error {
	_, err := sc.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(sc.bucket),
		Key:    aws.String(key),
		Body:   body,
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

func (sc *S3Client) GetPresignedURL(ctx context.Context, key string, expirySeconds int64) (string, error) {
	presigner := s3.NewPresignClient(sc.client)
	result, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(sc.bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expirySeconds) * time.Second
	})
	if err != nil {
		return "", err
	}
	return result.URL, nil
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

// SetObjectLifecycleExpiry sets an object expiration policy (for a session)
// Note: This is simplified; in production, use lifecycle policies on the bucket
func (sc *S3Client) SetObjectExpiry(ctx context.Context, key string, expiryDays int) error {
	// S3 object tagging or lifecycle policies would handle this
	// For now, this is a placeholder for future implementation
	return nil
}
