package routes

import (
	"singxd/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, audioController *controllers.AudioController) {
	api := router.Group("/api")
	{
		api.POST("/separate-audio", audioController.SeparateAudio)
		api.POST("/generate-timings", audioController.GenerateTimings)
	}
}
