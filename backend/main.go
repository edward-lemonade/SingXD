package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"

	"singish/controllers"
	"singish/db"
	"singish/routes"

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
	s3Client, err := db.NewS3Client(ctx, bucket)
	if err != nil {
		log.Fatalf("Failed to create S3 client: %v", err)
	}
	controllers.SetS3Client(s3Client)

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // frontend URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	routes.SetupRoutes(router)

	router.Run(":8080")
}
