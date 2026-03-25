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
	"singxd/internal/service/game"
	"singxd/internal/service/user"
	"singxd/internal/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}
	ctx := context.Background()

	// Initialize S3 client
	s3Client := setupS3(ctx)

	// Initialize Postgres client
	gormDB := setupGorm()

	// Initialize Firebase and AuthService
	authService := setupAuth(ctx)

	userService := user.NewUserService(s3Client, gormDB)
	chartService := chart.NewChartService(s3Client, gormDB)
	draftService := draft.NewDraftService(s3Client, gormDB)
	gameService := game.NewGameService(44100, 0.2)

	handlers := Handlers{
		Auth:  handler.NewAuthHandler(authService),
		User:  handler.NewUserHandler(userService),
		Chart: handler.NewChartHandler(chartService),
		Draft: handler.NewDraftHandler(draftService, chartService),
		Game:  handler.NewGameHandler(gameService, chartService),
	}

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // frontend URL
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

func setupAuth(ctx context.Context) *auth.AuthService {
	authCreds := os.Getenv("FIREBASE_CREDENTIALS_FILE")
	authService, err := auth.NewAuthService(ctx, authCreds)
	if err != nil {
		log.Fatalf("Failed to create auth service: %v", err)
	}
	return authService
}
