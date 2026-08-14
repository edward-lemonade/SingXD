package main

import (
	"net/http"
	"strconv"

	"singxd/internal/domain/auth"
	"singxd/internal/grpcclient"
	"singxd/internal/handler"
	"singxd/internal/middleware"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	User   *handler.UserHandler
	Draft  *handler.DraftHandler
	Editor *handler.EditorHandler
	Chart  *handler.ChartHandler
	Game   *handler.GameHandler
	Score  *handler.ScoreHandler
}

func SetupRoutes(router *gin.Engine, c Handlers, authService *auth.AuthService, gameClient *grpcclient.GameClient) {
	auth := middleware.Auth(authService)
	optAuth := middleware.OptionalAuth(authService)

	api := router.Group("/api")
	{
		api.GET("/chart/:id", c.Chart.GetChart)
		api.GET("/charts", c.Chart.ListCharts)
		api.GET("/charts/mine", auth, c.Chart.ListMyCharts)
		api.GET("/chart/:id/leaderboard", c.Score.GetTopScoresForChart)

		api.GET("/game/:id/load", c.Game.PreloadVocals)
		// Start a session: API gateway delegates allocation to Game Service and returns ws connection info
		api.POST("/game/:id/start", auth, func(ctx *gin.Context) {
			idStr := ctx.Param("id")
			id, err := strconv.ParseUint(idStr, 10, 64)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid chart id"})
				return
			}
			uidVal, exists := ctx.Get(middleware.UIDKey)
			if !exists {
				ctx.JSON(http.StatusUnauthorized, gin.H{"error": "missing uid"})
				return
			}
			userUID, _ := uidVal.(string)
			// optional: samples param from query
			samples := uint32(0)
			resp, err := gameClient.CreateSession(ctx.Request.Context(), id, userUID, samples)
			if err != nil {
				ctx.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
				return
			}
			ctx.JSON(http.StatusOK, gin.H{
				"sessionId": resp.SessionId,
				"wsAddress": resp.WsAddress,
				"wsToken":   resp.WsToken,
				"tokenTtl":  resp.TokenTtl,
			})
		})
		// legacy gateway-hosted websocket (can be removed after migration)
		api.GET("/game/:id/run", c.Game.GameSocket)

		api.GET("/auth/me", optAuth, c.User.Me)

		api.GET("/draft", auth, c.Draft.ListDrafts)
		api.GET("/draft/:uuid", auth, c.Draft.GetDraft)
		api.POST("/draft", optAuth, c.Draft.InitDraft)
		api.POST("/draft/:uuid/publish", auth, c.Draft.PublishDraft)
		api.PUT("/draft/:uuid", optAuth, c.Draft.UpdateDraft)
		api.DELETE("/draft/:uuid", auth, c.Draft.DeleteDraft)
		api.POST("/draft/:uuid/separate-audio", c.Editor.SeparateAudio)
		api.POST("/draft/:uuid/upload-instrumental", c.Editor.UploadInstrumental)
		api.POST("/draft/:uuid/upload-vocals", c.Editor.UploadVocals)
		api.POST("/draft/:uuid/upload-image", c.Editor.UploadImage)
		api.POST("/draft/:uuid/generate-timings", c.Editor.GenerateTimings)

		api.GET("/scores/me", auth, c.Score.GetMyScores)
		api.GET("/scores/me/chart/:id", auth, c.Score.GetMyScoresForChart)
	}
}
