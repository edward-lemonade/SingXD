package routes

import (
	"singxd/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, syncmapController *controllers.SyncMapController) {
	api := router.Group("/api")
	{
		api.GET("/syncmap/:uuid", syncmapController.GetSyncMap)
		api.POST("/syncmap/separate-audio", syncmapController.SeparateAudio)
		api.POST("/syncmap/upload-image", syncmapController.UploadImage)
		api.POST("/syncmap/generate-timings", syncmapController.GenerateTimings)
		api.POST("/syncmap/create", syncmapController.CreateMap)
	}
}
