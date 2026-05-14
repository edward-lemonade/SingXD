package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"singxd/internal/handler"
	"singxd/internal/service/auth"
	"singxd/internal/service/chart"
	"singxd/internal/service/draft"
	"singxd/internal/service/editor"
	"singxd/internal/service/game"
	"singxd/internal/service/score"
	"singxd/internal/service/user"
	"singxd/internal/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}
	ctx := context.Background()

	s3Client := setupS3(ctx)
	gormDbClient := setupGorm()
	redisClient := setupRedis()
	authService := setupAuth(ctx)

	userService := user.NewUserService(s3Client, gormDbClient)
	chartService := chart.NewChartService(s3Client, gormDbClient, redisClient)
	draftService := draft.NewDraftService(s3Client, gormDbClient)
	editorService := editor.NewEditorService(s3Client)
	gameService := game.NewGameService(44100, 0.2)
	scoreService := score.NewScoreService(gormDbClient)

	handlers := Handlers{
		User:   handler.NewUserHandler(userService),
		Chart:  handler.NewChartHandler(chartService),
		Draft:  handler.NewDraftHandler(draftService, chartService),
		Editor: handler.NewEditorHandler(editorService),
		Game:   handler.NewGameHandler(gameService, chartService, scoreService),
		Score:  handler.NewScoreHandler(scoreService),
	}

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	SetupRoutes(router, handlers, authService)
	router.Run(":8080")
}

func setupS3(ctx context.Context) *storage.S3Client {
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		log.Fatal("S3_BUCKET environment variable not set")
	}
	s3Client, err := storage.NewS3Client(ctx, bucket)
	if err != nil {
		log.Fatalf("Failed to create S3 client: %v", err)
	}
	return s3Client
}

func setupGorm() *gorm.DB {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}
	gormDB, err := storage.NewGormClient(databaseURL)
	if err != nil {
		log.Fatalf("Failed to create Postgres connection: %v", err)
	}
	return gormDB
}

func setupRedis() *storage.RedisClient {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	return storage.NewRedisClient(addr)
}

func setupAuth(ctx context.Context) *auth.AuthService {
	authCreds := os.Getenv("FIREBASE_CREDENTIALS_FILE")
	authService, err := auth.NewAuthService(ctx, authCreds)
	if err != nil {
		log.Fatalf("Failed to create auth service: %v", err)
	}
	return authService
}
