package routes

import (
	"singxd/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, creationController *controllers.CreationController) {
	api := router.Group("/api")
	{
		api.POST("/separate-audio", creationController.SeparateAudio)
		api.POST("/generate-timings", creationController.GenerateTimings)
	}
}
