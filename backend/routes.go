package main

import (
	"singxd/internal/handler"
	"singxd/internal/middleware"
	"singxd/internal/service/auth"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth  *handler.AuthHandler
	User  *handler.UserHandler
	Draft *handler.DraftHandler
	Chart *handler.ChartHandler
	Game  *handler.GameHandler
}

func SetupRoutes(router *gin.Engine, c Handlers, authService *auth.AuthService) {
	authMiddleware := middleware.Auth(authService)

	api := router.Group("/api")
	{
		api.GET("/chart/:id", c.Chart.GetChart)
		api.POST("/chart", c.Chart.CreateChart)
		api.GET("/charts", authMiddleware, c.Chart.ListCharts)

		api.GET("/game/:id/load", c.Game.PreloadVocals)
		api.GET("/game/:id/run", c.Game.GameSocket)

		api.POST("/auth/session", c.Auth.CreateSession)
		api.DELETE("/auth/session", c.Auth.ClearSession)
		api.GET("/auth/me", authMiddleware, c.User.Me)

		api.POST("/drafts/init", c.Draft.InitDraft)
		api.POST("/drafts/:uuid/publish", c.Draft.PublishDraft)
		userDraftApi := router.Group("/", authMiddleware)
		{
			userDraftApi.GET("/drafts", c.Draft.ListDrafts)
			userDraftApi.GET("/drafts/:id", c.Draft.GetDraft)
			userDraftApi.PUT("/drafts/:id", c.Draft.UpdateDraft)
			userDraftApi.DELETE("/drafts/:id", c.Draft.DeleteDraft)
		}
		api.POST("/draft/separate-audio", c.Draft.SeparateAudio)
		api.POST("/draft/upload-instrumental", c.Draft.UploadInstrumental)
		api.POST("/draft/upload-vocals", c.Draft.UploadVocals)
		api.POST("/draft/upload-image", c.Draft.UploadImage)
		api.POST("/draft/generate-timings", c.Draft.GenerateTimings)
	}
}
