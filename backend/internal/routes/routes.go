package routes

import (
	"singxd/internal/controllers"

	"github.com/gin-gonic/gin"
)

type Controllers struct {
	Draft *controllers.DraftController
	Chart *controllers.ChartController
	Game  *controllers.GameController
}

func SetupRoutes(
	router *gin.Engine,
	c Controllers,
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
	}
}
