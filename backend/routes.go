package main

import (
	"singxd/internal/handler"
	"singxd/internal/middleware"
	"singxd/internal/service/auth"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth   *handler.AuthHandler
	User   *handler.UserHandler
	Draft  *handler.DraftHandler
	Editor *handler.EditorHandler
	Chart  *handler.ChartHandler
	Game   *handler.GameHandler
}

func SetupRoutes(router *gin.Engine, c Handlers, authService *auth.AuthService) {
	auth := middleware.Auth(authService)
	optAuth := middleware.OptionalAuth(authService)

	api := router.Group("/api")
	{
		api.GET("/chart/:id", c.Chart.GetChart)
		api.POST("/chart", c.Chart.CreateChart)
		api.GET("/charts", c.Chart.ListCharts)

		api.GET("/game/:id/load", c.Game.PreloadVocals)
		api.GET("/game/:id/run", c.Game.GameSocket)

		api.POST("/auth/session", c.Auth.CreateSession)
		api.DELETE("/auth/session", c.Auth.ClearSession)
		api.GET("/auth/me", auth, c.User.Me)

		api.GET("/draft", auth, c.Draft.ListDrafts)
		api.GET("/draft/:uuid", auth, c.Draft.GetDraft)
		api.POST("/draft", optAuth, c.Draft.InitDraft)
		api.POST("/draft/:uuid/publish", auth, c.Draft.PublishDraft)
		api.PUT("/draft/:uuid", auth, c.Draft.UpdateDraft)
		api.DELETE("/draft/:uuid", auth, c.Draft.DeleteDraft)
		api.POST("/draft/:uuid/separate-audio", c.Editor.SeparateAudio)
		api.POST("/draft/:uuid/upload-instrumental", c.Editor.UploadInstrumental)
		api.POST("/draft/:uuid/upload-vocals", c.Editor.UploadVocals)
		api.POST("/draft/:uuid/upload-image", c.Editor.UploadImage)
		api.POST("/draft/:uuid/generate-timings", c.Editor.GenerateTimings)
	}
}
