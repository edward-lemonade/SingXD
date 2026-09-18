package handler

import (
	"net/http"

	"singxd/internal/apperror"
	chartpkg "singxd/internal/domain/chart"
	draftpkg "singxd/internal/domain/draft"

	"github.com/gin-gonic/gin"
)

type DraftService = draftpkg.DraftService

type DraftHandler struct {
	draftService *draftpkg.DraftService
	chartService *chartpkg.ChartService
}

func NewDraftHandler(draftService *draftpkg.DraftService, chartService *chartpkg.ChartService) *DraftHandler {
	return &DraftHandler{draftService: draftService, chartService: chartService}
}

// ====================================================================================
// Handlers

func (a *DraftHandler) InitDraft(c *gin.Context) {
	uid := getUID(c)
	uuid, err := a.draftService.InitDraft(c.Request.Context(), uid)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"uuid": uuid})
}

func (a *DraftHandler) ListDrafts(c *gin.Context) {
	uid := getRequiredUID(c)
	drafts, err := a.draftService.ListDrafts(c.Request.Context(), uid)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"drafts": drafts})
}

func (a *DraftHandler) GetDraft(c *gin.Context) {
	uid := getRequiredUID(c)
	uuid := c.Param("uuid")
	draft, err := a.draftService.GetDraft(c.Request.Context(), uuid, &uid)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"draft": draft})
}

func (a *DraftHandler) UpdateDraft(c *gin.Context) {
	uid := getUID(c)
	uuid := c.Param("uuid")
	type Request struct {
		ChartBase chartpkg.ChartBase `json:"chartBase"`
	}
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("invalid request body", err))
		return
	}
	draft, err := a.draftService.UpdateDraft(c.Request.Context(), uuid, uid, req.ChartBase)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"draft": draft})
}

func (a *DraftHandler) DeleteDraft(c *gin.Context) {
	uid := getRequiredUID(c)
	uuid := c.Param("uuid")
	if err := a.draftService.DeleteDraft(c.Request.Context(), uuid, uid); err != nil {
		apperror.ServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (a *DraftHandler) PublishDraft(c *gin.Context) {
	uid := getRequiredUID(c)
	uuid := c.Param("uuid")
	type Request struct {
		ChartBase chartpkg.ChartBase `json:"chartBase"`
	}
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("invalid request body", err))
		return
	}

	chart, err := a.draftService.PublishDraft(c.Request.Context(), uuid, uid, req.ChartBase, a.chartService)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"chart": chart})
}
