package handler

import (
	"net/http"
	"singxd/internal/service/editor"
	"singxd/internal/transport"
	t "singxd/internal/types"

	"github.com/gin-gonic/gin"
)

type EditorService = editor.EditorService

type EditorHandler struct {
	editorService *EditorService
}

func NewEditorHandler(editorService *EditorService) *EditorHandler {
	return &EditorHandler{editorService: editorService}
}

// ====================================================================================
// Handlers

func (a *EditorHandler) SeparateAudio(c *gin.Context) {
	UUID := c.Param("uuid")
	file, err := c.FormFile("audio")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}
	vocalsURL, instrumentalURL, err := a.editorService.SeparateAudio(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
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
		transport.BadRequest(c, "no audio file provided")
		return
	}
	audioURL, err := a.editorService.UploadInstrumental(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
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
		transport.BadRequest(c, "no audio file provided")
		return
	}
	audioURL, err := a.editorService.UploadVocals(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
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
		transport.BadRequest(c, "no image file provided")
		return
	}
	imageURL, err := a.editorService.UploadImage(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
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
		transport.BadRequest(c, "missing uuid")
		return
	}
	if lyrics == "" {
		transport.BadRequest(c, "missing lyrics")
		return
	}
	timings, err := a.editorService.GenerateTimings(c.Request.Context(), UUID, lyrics)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	type Response struct {
		Timings []t.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, Response{Timings: timings})
}
