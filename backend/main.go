package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"

	"singxd/controllers"
	"singxd/db/postgres"
	"singxd/db/s3"
	"singxd/routes"
	"singxd/services"

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
	s3Client, err := s3.NewS3Client(ctx, bucket)
	if err != nil {
		log.Fatalf("Failed to create S3 client: %v", err)
	}

	// Initialize Postgres client (GORM) and auto-migrate
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}
	gormDB, err := postgres.NewGormDB(databaseURL)
	if err != nil {
		log.Fatalf("Failed to create Postgres connection: %v", err)
	}
	if err := postgres.AutoMigrate(gormDB); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		log.Fatalf("Failed to get sql db: %v", err)
	}
	defer sqlDB.Close()

	syncMapService := services.NewSyncMapService(s3Client, gormDB)
	syncMapController := controllers.NewSyncMapController(syncMapService)

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // frontend URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	routes.SetupRoutes(router, syncMapController)

	router.Run(":8080")
}
