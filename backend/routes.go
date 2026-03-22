package main

import (
	"singxd/internal/handler"
	"singxd/internal/middleware"
	"singxd/internal/service/auth"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
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
		api.GET("/charts", c.Chart.ListCharts)

		api.POST("/draft/separate-audio", c.Draft.SeparateAudio)
		api.POST("/draft/upload-instrumental", c.Draft.UploadInstrumental)
		api.POST("/draft/upload-vocals", c.Draft.UploadVocals)
		api.POST("/draft/upload-image", c.Draft.UploadImage)
		api.POST("/draft/generate-timings", c.Draft.GenerateTimings)

		api.GET("/game/:id/load", c.Game.PreloadVocals)
		api.GET("/game/:id/run", c.Game.GameSocket)

		api.GET("/auth/me", c.User.Me)

		api.POST("/draft/init", c.Draft.InitDraft)
		authApi := router.Group("/", authMiddleware)
		{
			authApi.GET("/drafts", c.Draft.ListDrafts)
			authApi.GET("/drafts/:id", c.Draft.GetDraft)
			authApi.PUT("/drafts/:id", c.Draft.UpdateDraft)
			authApi.DELETE("/drafts/:id", c.Draft.DeleteDraft)
			authApi.POST("/drafts/:id/publish-as-user", c.Draft.PublishDraftAsUser)
		}
		api.POST("/drafts/:uuid/publish-as-guest", c.Draft.PublishDraftAsGuest)
	}
}
