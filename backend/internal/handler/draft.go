package handler

import (
	"net/http"

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

func (a *DraftHandler) InitDraft(c *gin.Context) {
	uid := getUID(c)
	uuid, err := a.draftService.InitDraft(c.Request.Context(), uid)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"uuid": uuid})
}

func (a *DraftHandler) ListDrafts(c *gin.Context) {
	uid := getRequiredUID(c)
	drafts, err := a.draftService.ListDrafts(c.Request.Context(), uid)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"drafts": drafts})
}

func (a *DraftHandler) GetDraft(c *gin.Context) {
	uid := getRequiredUID(c)
	uuid := c.Param("uuid")
	draft, err := a.draftService.GetDraft(c.Request.Context(), uuid, &uid)
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
	uid := getRequiredUID(c)
	uuid := c.Param("uuid")
	if err := a.draftService.DeleteDraft(c.Request.Context(), uuid, uid); err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (a *DraftHandler) PublishDraft(c *gin.Context) {
	uid := getRequiredUID(c)
	uuid := c.Param("uuid")
	type Request struct {
		ChartBase t.ChartBase `json:"chartBase"`
	}
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		transport.BadRequest(c, "invalid request body")
		return
	}
	//_, err := a.draftService.UpdateDraft(c.Request.Context(), uuid, uid, req.ChartBase)
	//if err != nil {
	//	transport.ServiceError(c, err)
	//	return
	//}
	chart, err := a.draftService.PublishDraft(c.Request.Context(), uuid, uid, req.ChartBase, a.chartService)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"chart": chart})
}
