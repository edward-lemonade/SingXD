package controllers

import (
	"net/http"

	"singxd/services/syncmap"
	t "singxd/services/types"
	"singxd/transport"

	"github.com/gin-gonic/gin"
)

type SyncMapService = syncmap.SyncMapService

type SyncMapController struct {
	syncmapService *SyncMapService
}

func NewSyncMapController(service *SyncMapService) *SyncMapController {
	return &SyncMapController{syncmapService: service}
}

// ============================================================================================
// Handlers

func (a *SyncMapController) CreateMap(c *gin.Context) {
	type Request struct {
		SessionID string         `json:"sessionId"`
		SyncMap   t.SyncMapDraft `json:"syncMap"`
	}

	var request Request
	if err := c.ShouldBindJSON(&request); err != nil {
		transport.BadRequest(c, "invalid request body")
		return
	}
	if request.SessionID == "" {
		transport.BadRequest(c, "missing sessionID")
		return
	}

	syncMap, err := a.syncmapService.CreateMap(c.Request.Context(), request.SessionID, request.SyncMap)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		SyncMap t.SyncMap `json:"syncMap"`
	}
	c.JSON(http.StatusOK, Response{SyncMap: *syncMap})
}

func (a *SyncMapController) GetSyncMap(c *gin.Context) {
	type Request struct {
		ID uint `json:"id"`
	}

	var request Request
	if err := c.ShouldBindJSON(&request); err != nil {
		transport.BadRequest(c, "invalid request body")
		return
	}

	syncMap, err := a.syncmapService.FindByID(c.Request.Context(), request.ID)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		SyncMap t.SyncMap `json:"syncMap"`
	}
	c.JSON(http.StatusOK, Response{SyncMap: *syncMap})
}
