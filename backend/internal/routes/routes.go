package routes

import (
	"singxd/internal/controllers"

	"github.com/gin-gonic/gin"
)

type Controllers struct {
	ChartDraft *controllers.ChartDraftController
	Chart      *controllers.ChartController
	Game       *controllers.GameController
}

func SetupRoutes(
	router *gin.Engine,
	c Controllers,
) {
	api := router.Group("/api")
	{
		api.POST("/chart/separate-audio", c.ChartDraft.SeparateAudio)
		api.POST("/chart/upload-image", c.ChartDraft.UploadImage)
		api.POST("/chart/generate-timings", c.ChartDraft.GenerateTimings)

		api.POST("/chart/create", c.Chart.CreateMap)
		api.GET("/chart/:id", c.Chart.GetChart)

		api.GET("/game/load/:id", c.Game.PreloadVocals)
		api.GET("/game/ws/:id", c.Game.GameSocket)
	}
}
