package routes

import (
	"singxd/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.POST("/separate-audio", controllers.SeparateAudio)
		api.POST("/generate-timings", controllers.GenerateTimings)
	}
}
