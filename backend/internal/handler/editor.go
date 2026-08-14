package handler

import (
	"errors"
	"log"
	"net/http"

	"singxd/internal/apperror"
	chartpkg "singxd/internal/domain/chart"
	editorpkg "singxd/internal/domain/editor"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
)

type EditorService = editorpkg.EditorService

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "no audio file provided"})
		return
	}
	vocalsURL, instrumentalURL, err := a.editorService.SeparateAudio(c.Request.Context(), UUID, file)
	if err != nil {
		// preserve known sentinel mappings and only wrap unexpected errors
		if errors.Is(err, editorpkg.ErrSeparationFailed) || errors.Is(err, editorpkg.ErrPythonInterpreterNotFound) {
			apperror.ServiceError(c, err)
			return
		}
		wrapped := apperror.Wrap(err, "editor.separation_failed", "Failed to process audio", http.StatusInternalServerError, codes.Internal)
		apperror.ServiceError(c, wrapped)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "no audio file provided"})
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
		apperror.BadRequest(c, "no audio file provided")
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "no image file provided"})
		return
	}
	imageURL, err := a.editorService.UploadImage(c.Request.Context(), UUID, file)
	if err != nil {
		log.Printf("[Service Error]: %v", err)
		status, msg := apperror.ToHTTP(err)
		c.JSON(status, gin.H{"error": msg})
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
		apperror.BadRequest(c, "missing uuid")
		return
	}
	if lyrics == "" {
		apperror.BadRequest(c, "missing lyrics")
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
