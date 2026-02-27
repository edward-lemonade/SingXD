package controllers

import (
	"net/http"

	"singxd/services"

	"github.com/gin-gonic/gin"
)

type CreationController struct {
	creationService *services.CreationService
}

func NewCreationController(service *services.CreationService) *CreationController {
	return &CreationController{creationService: service}
}

// handles audio file separation request
func (a *CreationController) SeparateAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		RespondServiceError(c, services.NewServiceError(http.StatusBadRequest, "No audio file provided", err))
		return
	}

	response, err := a.creationService.SeparateAudio(c.Request.Context(), file)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, response)
}

// handles generating timings for lyrics and audio
func (a *CreationController) GenerateTimings(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	lyrics := c.PostForm("lyrics")

	response, err := a.creationService.GenerateTimings(c.Request.Context(), sessionID, lyrics)
	if err != nil {
		RespondServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, response)
}
