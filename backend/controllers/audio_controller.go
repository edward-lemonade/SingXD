package controllers

import (
	"net/http"

	"singxd/services"

	"github.com/gin-gonic/gin"
)

type AudioController struct {
	audioService *services.AudioService
}

func NewAudioController(service *services.AudioService) *AudioController {
	return &AudioController{audioService: service}
}

// handles audio file separation request
func (a *AudioController) SeparateAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "No audio file provided", err))
		return
	}

	response, err := a.audioService.SeparateAudio(c.Request.Context(), file)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, response)
}

// handles generating timings for lyrics and audio
func (a *AudioController) GenerateTimings(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	lyrics := c.PostForm("lyrics")

	response, err := a.audioService.GenerateTimings(c.Request.Context(), sessionID, lyrics)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, response)
}
