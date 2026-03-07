package routes

import (
	"singxd/controllers"

	"github.com/gin-gonic/gin"
)

type Controllers struct {
	SyncMapDraft *controllers.SyncMapDraftController
	SyncMap      *controllers.SyncMapController
}

func SetupRoutes(
	router *gin.Engine,
	c Controllers,
) {
	api := router.Group("/api")
	{
		api.POST("/syncmap/separate-audio", c.SyncMapDraft.SeparateAudio)
		api.POST("/syncmap/upload-image", c.SyncMapDraft.UploadImage)
		api.POST("/syncmap/generate-timings", c.SyncMapDraft.GenerateTimings)

		api.POST("/syncmap/create", c.SyncMap.CreateMap)
		api.GET("/syncmap/:id", c.SyncMap.GetSyncMap)
	}
}
