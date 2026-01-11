package routes

import (
	"singish/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.POST("/separate-audio", controllers.SeparateAudio)
		api.POST("/generate-alignment", controllers.GenerateAlignment)
		api.POST("/generate-video", controllers.GenerateVideo)
	}
}
