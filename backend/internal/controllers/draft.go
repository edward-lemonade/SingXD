package controllers

import (
	"net/http"

	"singxd/internal/services/draft"
	t "singxd/internal/services/types"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

type DraftService = draft.DraftService

type DraftController struct {
	draftService *DraftService
}

func NewDraftController(service *DraftService) *DraftController {
	return &DraftController{draftService: service}
}

// ============================================================================================
// Handlers

func (a *DraftController) SeparateAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}

	result, err := a.draftService.SeparateAudio(c.Request.Context(), file)
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

func (a *DraftController) UploadImage(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	file, err := c.FormFile("image")
	if err != nil {
		transport.BadRequest(c, "no image file provided")
		return
	}

	imageURL, err := a.draftService.UploadImage(c.Request.Context(), sessionID, file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		ImageURL string `json:"imageUrl"`
	}
	c.JSON(http.StatusOK, Response{ImageURL: imageURL})
}

func (a *DraftController) GenerateTimings(c *gin.Context) {
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

	timings, err := a.draftService.GenerateTimings(c.Request.Context(), sessionID, lyrics)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Timings []t.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, Response{Timings: timings})
}
