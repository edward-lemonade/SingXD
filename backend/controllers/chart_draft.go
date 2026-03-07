package controllers

import (
	"net/http"

	"singxd/services/chart_draft"
	t "singxd/services/types"
	"singxd/transport"

	"github.com/gin-gonic/gin"
)

type ChartDraftService = chart_draft.ChartDraftService

type ChartDraftController struct {
	chartDraftService *ChartDraftService
}

func NewChartDraftController(service *ChartDraftService) *ChartDraftController {
	return &ChartDraftController{chartDraftService: service}
}

// ============================================================================================
// Handlers

func (a *ChartDraftController) SeparateAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}

	result, err := a.chartDraftService.SeparateAudio(c.Request.Context(), file)
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

func (a *ChartDraftController) UploadImage(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	file, err := c.FormFile("image")
	if err != nil {
		transport.BadRequest(c, "no image file provided")
		return
	}

	imageURL, err := a.chartDraftService.UploadImage(c.Request.Context(), sessionID, file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		ImageURL string `json:"imageUrl"`
	}
	c.JSON(http.StatusOK, Response{ImageURL: imageURL})
}

func (a *ChartDraftController) GenerateTimings(c *gin.Context) {
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

	timings, err := a.chartDraftService.GenerateTimings(c.Request.Context(), sessionID, lyrics)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Timings []t.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, Response{Timings: timings})
}
