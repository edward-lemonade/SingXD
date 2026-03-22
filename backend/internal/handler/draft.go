package handler

import (
	"net/http"

	"singxd/internal/middleware"
	"singxd/internal/service/draft"
	"singxd/internal/transport"
	t "singxd/internal/types"

	"github.com/gin-gonic/gin"
)

type DraftService = draft.DraftService

type DraftHandler struct {
	draftService *DraftService
	chartService *ChartService
}

func NewDraftHandler(draftService *DraftService, chartService *ChartService) *DraftHandler {
	return &DraftHandler{draftService: draftService, chartService: chartService}
}

// ====================================================================================
// Handlers

func (a *DraftHandler) SeparateAudio(c *gin.Context) {
	UUID := c.PostForm("uuid")
	file, err := c.FormFile("audio")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}
	vocalsURL, instrumentalURL, err := a.draftService.SeparateAudio(c.Request.Context(), UUID, file)
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

func (a *DraftHandler) UploadInstrumental(c *gin.Context) {
	UUID := c.PostForm("uuid")
	file, err := c.FormFile("instrumental")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}
	audioURL, err := a.draftService.UploadInstrumental(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	type Response struct {
		AudioURL string `json:"audioUrl"`
	}
	c.JSON(http.StatusOK, Response{AudioURL: audioURL})
}

func (a *DraftHandler) UploadVocals(c *gin.Context) {
	UUID := c.PostForm("uuid")
	file, err := c.FormFile("vocals")
	if err != nil {
		transport.BadRequest(c, "no audio file provided")
		return
	}
	audioURL, err := a.draftService.UploadVocals(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	type Response struct {
		AudioURL string `json:"audioUrl"`
	}
	c.JSON(http.StatusOK, Response{AudioURL: audioURL})
}

func (a *DraftHandler) UploadImage(c *gin.Context) {
	UUID := c.PostForm("uuid")
	file, err := c.FormFile("image")
	if err != nil {
		transport.BadRequest(c, "no image file provided")
		return
	}
	imageURL, err := a.draftService.UploadImage(c.Request.Context(), UUID, file)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	type Response struct {
		ImageURL string `json:"imageUrl"`
	}
	c.JSON(http.StatusOK, Response{ImageURL: imageURL})
}

func (a *DraftHandler) GenerateTimings(c *gin.Context) {
	UUID := c.PostForm("uuid")
	lyrics := c.PostForm("lyrics")
	if UUID == "" {
		transport.BadRequest(c, "missing uuid")
		return
	}
	if lyrics == "" {
		transport.BadRequest(c, "missing lyrics")
		return
	}
	timings, err := a.draftService.GenerateTimings(c.Request.Context(), UUID, lyrics)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	type Response struct {
		Timings []t.Timing `json:"timings"`
	}
	c.JSON(http.StatusOK, Response{Timings: timings})
}

// Draft CRUD

func (a *DraftHandler) InitDraft(c *gin.Context) {
	uuid, err := a.draftService.InitDraft(c.Request.Context())
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"uuid": uuid})
}

func (a *DraftHandler) ListDrafts(c *gin.Context) {
	uid := getUID(c)
	drafts, err := a.draftService.ListDrafts(c.Request.Context(), uid)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"drafts": drafts})
}

func (a *DraftHandler) GetDraft(c *gin.Context) {
	uid := getUID(c)
	uuid := c.Param("uuid")
	draft, err := a.draftService.GetDraft(c.Request.Context(), uuid, uid)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"draft": draft})
}

func (a *DraftHandler) UpdateDraft(c *gin.Context) {
	uid := getUID(c)
	uuid := c.Param("uuid")
	type Request struct {
		ChartBase t.ChartBase `json:"chartBase"`
	}
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		transport.BadRequest(c, "invalid request body")
		return
	}
	draft, err := a.draftService.UpdateDraft(c.Request.Context(), uuid, uid, req.ChartBase)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"draft": draft})
}

func (a *DraftHandler) DeleteDraft(c *gin.Context) {
	uid := getUID(c)
	uuid := c.Param("uuid")
	if err := a.draftService.DeleteDraft(c.Request.Context(), uuid, uid); err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (a *DraftHandler) PublishDraft(c *gin.Context) {
	uuid := c.Param("uuid")
	type Request struct {
		ChartBase t.ChartBase `json:"chartBase"`
	}
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		transport.BadRequest(c, "invalid request body")
		return
	}
	chart, err := a.draftService.PublishDraft(c.Request.Context(), uuid, req.ChartBase, a.chartService)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"chart": chart})
}

// ====================================================================================
// Helpers

func getUID(c *gin.Context) string {
	uid, _ := c.Get(middleware.UIDKey)
	s, _ := uid.(string)
	return s
}
