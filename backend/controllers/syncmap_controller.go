package controllers

import (
	"errors"
	"net/http"

	"singxd/services"
	models "singxd/types"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SyncMapController struct {
	creationService *services.SyncMapService
}

func NewSyncMapController(service *services.SyncMapService) *SyncMapController {
	return &SyncMapController{creationService: service}
}

func (a *SyncMapController) GetSyncMap(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "Missing uuid", nil))
		return
	}
	syncMap, err := a.creationService.GetByUUID(c.Request.Context(), uuid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			RespondServiceError(c, services.NewServiceError(http.StatusNotFound, "SyncMap not found", err))
			return
		}
		RespondServiceError(c, services.NewServiceError(http.StatusInternalServerError, "Failed to get syncmap", err))
		return
	}
	c.JSON(http.StatusOK, syncMap)
}

func (a *SyncMapController) SeparateAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "No audio file provided", err))
		return
	}

	result, err := a.creationService.SeparateAudio(c.Request.Context(), file)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	type SeparateAudioResponse struct {
		VocalsURL       string `json:"vocalsUrl"`
		InstrumentalURL string `json:"instrumentalUrl"`
		SessionID       string `json:"sessionId"`
	}
	c.JSON(http.StatusOK, SeparateAudioResponse{
		VocalsURL:       result.VocalsURL,
		InstrumentalURL: result.InstrumentalURL,
		SessionID:       result.SessionID,
	})
}

func (a *SyncMapController) UploadImage(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	file, err := c.FormFile("image")
	if err != nil {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "No image file provided", err))
		return
	}

	imageURL, err := a.creationService.UploadImage(c.Request.Context(), sessionID, file)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	type UploadImageResponse struct {
		ImageURL string `json:"imageUrl"`
	}
	c.JSON(http.StatusOK, UploadImageResponse{ImageURL: imageURL})
}

func (a *SyncMapController) GenerateTimings(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	lyrics := c.PostForm("lyrics")
	if sessionID == "" || lyrics == "" {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "Missing sessionID or lyrics", nil))
		return
	}

	timings, err := a.creationService.GenerateTimings(c.Request.Context(), sessionID, lyrics)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	type GenerateTimingsResponse struct {
		Timings []models.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, GenerateTimingsResponse{Timings: timings})
}

type CreateMapRequest struct {
	SessionID string         `json:"sessionId"`
	SyncMap   models.SyncMap `json:"syncMap"`
}

func (a *SyncMapController) CreateMap(c *gin.Context) {
	var request CreateMapRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "Invalid request body", err))
		return
	}
	if request.SessionID == "" {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "Missing sessionId", nil))
		return
	}

	syncMap, err := a.creationService.CreateMap(c.Request.Context(), request.SessionID, request.SyncMap)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	type CreateMapResponse struct {
		SyncMap models.SyncMap `json:"syncMap"`
	}
	c.JSON(http.StatusOK, CreateMapResponse{SyncMap: syncMap})
}
