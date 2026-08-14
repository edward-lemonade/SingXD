package handler

import (
	"context"
	"net/http"
	"strconv"
	"sync"

	"singxd/internal/apperror"
	chartpkg "singxd/internal/domain/chart"

	"github.com/gin-gonic/gin"
)

type GameHandler struct {
	chartService *ChartService
	scoreService *ScoreService
	vocalsCache  map[uint][]byte
	vocalsMu     sync.RWMutex
}

func NewGameHandler(chartService *ChartService, scoreService *ScoreService) *GameHandler {
	return &GameHandler{
		chartService: chartService,
		scoreService: scoreService,
		vocalsCache:  make(map[uint][]byte),
	}
}

func (g *GameHandler) getOrLoadVocals(id uint) ([]byte, error) {
	g.vocalsMu.RLock()
	cached := g.vocalsCache[id]
	g.vocalsMu.RUnlock()
	if cached != nil {
		return cached, nil
	}
	data, err := g.chartService.FindVocalsFileByID(context.Background(), id)
	if err != nil {
		return nil, err
	}
	g.vocalsMu.Lock()
	g.vocalsCache[id] = data
	g.vocalsMu.Unlock()
	return data, nil
}

func (g *GameHandler) getOrLoadInstrumentals(id uint) ([]byte, error) {
	data, err := g.chartService.FindInstrumentalsFileByID(context.Background(), id)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// ====================================================================================
// Wire types

type wsInMsg struct {
	Type   string `json:"type"`
	Reason string `json:"reason,omitempty"`
}

// ====================================================================================
// Handlers

func (g *GameHandler) PreloadVocals(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chart id"})
		return
	}
	data, err := g.chartService.FindVocalsFileByID(context.Background(), uint(id))
	if err != nil {
		apperror.ServiceError(c, chartpkg.ErrNoVocalsFile)
		return
	}
	g.vocalsMu.Lock()
	g.vocalsCache[uint(id)] = data
	g.vocalsMu.Unlock()
	c.Status(http.StatusNoContent)
}

func (g *GameHandler) GameSocket(c *gin.Context) {
	// Legacy in-process websocket handler has been removed in favor of the Game Service.
	// Clients should call POST /api/game/:id/start to receive `wsAddress` and `wsToken`.
	c.JSON(http.StatusNotImplemented, gin.H{"error": "deprecated: use POST /api/game/:id/start to connect to Game Service"})
}
