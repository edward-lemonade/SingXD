package handler

import (
	"net/http"

	"singxd/internal/apperror"
	chartpkg "singxd/internal/domain/chart"
	editorpkg "singxd/internal/domain/editor"

	"github.com/gin-gonic/gin"
)

type EditorService = editorpkg.EditorService

type EditorHandler struct {
	editorService *editorpkg.EditorService
}

func NewEditorHandler(editorService *editorpkg.EditorService) *EditorHandler {
	return &EditorHandler{editorService: editorService}
}

// ====================================================================================
// Handlers

func (a *EditorHandler) SeparateAudio(c *gin.Context) {
	UUID := c.Param("uuid")
	file, err := c.FormFile("audio")
	if err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("no audio file provided", err))
		return
	}
	vocalsURL, instrumentalURL, err := a.editorService.SeparateAudio(c.Request.Context(), UUID, file)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	type Response struct {
		VocalsURL       string `json:"vocalsUrl"`
		InstrumentalURL string `json:"instrumentalUrl"`
	}
	c.JSON(http.StatusOK, Response{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instrumentalURL,
	})
}

func (a *EditorHandler) UploadInstrumental(c *gin.Context) {
	UUID := c.Param("uuid")
	file, err := c.FormFile("instrumental")
	if err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("no audio file provided", err))
		return
	}
	audioURL, err := a.editorService.UploadInstrumental(c.Request.Context(), UUID, file)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	type Response struct {
		AudioURL string `json:"audioUrl"`
	}
	c.JSON(http.StatusOK, Response{AudioURL: audioURL})
}

func (a *EditorHandler) UploadVocals(c *gin.Context) {
	UUID := c.Param("uuid")
	file, err := c.FormFile("vocals")
	if err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("no audio file provided", err))
		return
	}
	audioURL, err := a.editorService.UploadVocals(c.Request.Context(), UUID, file)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	type Response struct {
		AudioURL string `json:"audioUrl"`
	}
	c.JSON(http.StatusOK, Response{AudioURL: audioURL})
}

func (a *EditorHandler) UploadImage(c *gin.Context) {
	UUID := c.Param("uuid")
	file, err := c.FormFile("image")
	if err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("no image file provided", err))
		return
	}
	imageURL, err := a.editorService.UploadImage(c.Request.Context(), UUID, file)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	type Response struct {
		ImageURL string `json:"imageUrl"`
	}
	c.JSON(http.StatusOK, Response{ImageURL: imageURL})
}

func (a *EditorHandler) GenerateTimings(c *gin.Context) {
	UUID := c.Param("uuid")
	lyrics := c.PostForm("lyrics")
	if UUID == "" {
		apperror.ServiceError(c, apperror.InvalidInput("missing uuid", nil))
		return
	}
	if lyrics == "" {
		apperror.ServiceError(c, apperror.InvalidInput("missing lyrics", nil))
		return
	}
	timings, err := a.editorService.GenerateTimings(c.Request.Context(), UUID, lyrics)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	type Response struct {
		Timings []chartpkg.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, Response{Timings: timings})
}
