package controllers

import (
	"net/http"

	"singxd/services/syncmap_draft"
	t "singxd/services/types"
	"singxd/transport"

	"github.com/gin-gonic/gin"
)

type SyncMapDraftService = syncmap_draft.SyncMapDraftService

type SyncMapDraftController struct {
	syncmapDraftService *SyncMapDraftService
}

func NewSyncMapDraftController(service *SyncMapDraftService) *SyncMapDraftController {
	return &SyncMapDraftController{syncmapDraftService: service}
}

// ============================================================================================
// Handlers

func (a *SyncMapDraftController) SeparateAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}

	result, err := a.syncmapDraftService.SeparateAudio(c.Request.Context(), file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		VocalsURL       string `json:"vocalsUrl"`
		InstrumentalURL string `json:"instrumentalUrl"`
		SessionID       string `json:"sessionId"`
	}
	c.JSON(http.StatusOK, Response{
		VocalsURL:       result.VocalsURL,
		InstrumentalURL: result.InstrumentalURL,
		SessionID:       result.SessionID,
	})
}

func (a *SyncMapDraftController) UploadImage(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	file, err := c.FormFile("image")
	if err != nil {
		transport.BadRequest(c, "no image file provided")
		return
	}

	imageURL, err := a.syncmapDraftService.UploadImage(c.Request.Context(), sessionID, file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		ImageURL string `json:"imageUrl"`
	}
	c.JSON(http.StatusOK, Response{ImageURL: imageURL})
}

func (a *SyncMapDraftController) GenerateTimings(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	lyrics := c.PostForm("lyrics")
	if sessionID == "" {
		transport.BadRequest(c, "missing sessionID")
		return
	}
	if lyrics == "" {
		transport.BadRequest(c, "missing lyrics")
		return
	}

	timings, err := a.syncmapDraftService.GenerateTimings(c.Request.Context(), sessionID, lyrics)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Timings []t.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, Response{Timings: timings})
}
