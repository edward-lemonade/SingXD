package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"

	"singxd/controllers"
	"singxd/routes"
	"singxd/services/syncmap"
	"singxd/services/syncmap_draft"
	"singxd/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Initialize S3 client
	ctx := context.Background()
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		log.Fatal("S3_BUCKET environment variable not set")
	}
	s3Client, err := storage.NewS3Client(ctx, bucket)
	if err != nil {
		log.Fatalf("Failed to create S3 client: %v", err)
	}

	// Initialize Postgres client
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}
	gormDB, err := storage.NewGormDB(databaseURL)
	if err != nil {
		log.Fatalf("Failed to create Postgres connection: %v", err)
	}

	// Run migrations
	if err := gormDB.AutoMigrate(
		&syncmap.SyncMapRecord{},
	); err != nil {
		log.Fatal(err)
	}

	syncMapService := syncmap.NewSyncMapService(s3Client, gormDB)
	syncMapDraftService := syncmap_draft.NewSyncMapDraftService(s3Client, gormDB)

	controllers := routes.Controllers{
		SyncMap:      controllers.NewSyncMapController(syncMapService),
		SyncMapDraft: controllers.NewSyncMapDraftController(syncMapDraftService),
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

	routes.SetupRoutes(router, controllers)

	router.Run(":8080")
}
