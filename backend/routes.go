package main

import (
	"singxd/internal/handler"
	"singxd/internal/service/auth"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	User  *handler.UserHandler
	Draft *handler.DraftHandler
	Chart *handler.ChartHandler
	Game  *handler.GameHandler
}

func SetupRoutes(
	router *gin.Engine,
	c Handlers,
	authService *auth.AuthService,
) {
	api := router.Group("/api")
	{
		api.GET("/chart/:id", c.Chart.GetChart)
		api.POST("/chart", c.Chart.CreateMap)

		api.POST("/draft/separate-audio", c.Draft.SeparateAudio)
		api.POST("/draft/upload-image", c.Draft.UploadImage)
		api.POST("/draft/generate-timings", c.Draft.GenerateTimings)

		api.GET("/game/:id/load", c.Game.PreloadVocals)
		api.GET("/game/:id/run", c.Game.GameSocket)

		api.GET("/auth/me", c.User.Me)

	}
}
