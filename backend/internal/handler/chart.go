package handler

import (
	"net/http"
	"strconv"

	"singxd/internal/service/chart"
	"singxd/internal/transport"
	t "singxd/internal/types"

	"github.com/gin-gonic/gin"
)

type ChartService = chart.ChartService

type ChartHandler struct {
	chartService *ChartService
}

func NewChartHandler(service *ChartService) *ChartHandler {
	return &ChartHandler{chartService: service}
}

// ============================================================================================
// Handlers

func (a *ChartHandler) CreateMap(c *gin.Context) {
	type Request struct {
		SessionID  string       `json:"sessionId"`
		ChartDraft t.ChartDraft `json:"chartDraft"`
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

	chart, err := a.chartService.Create(c.Request.Context(), request.SessionID, request.ChartDraft)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Chart t.Chart `json:"chart"`
	}
	c.JSON(http.StatusOK, Response{Chart: *chart})
}

func (a *ChartHandler) GetChart(c *gin.Context) {
	idStr := c.Param("id")
	if idStr == "" {
		transport.BadRequest(c, "missing id")
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		transport.BadRequest(c, "invalid id")
		return
	}

	chart, err := a.chartService.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Chart t.Chart `json:"chart"`
	}

	c.JSON(http.StatusOK, Response{
		Chart: *chart,
	})
}

func (a *ChartHandler) ListCharts(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "12")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 12
	}

	search := c.Query("search")

	charts, total, err := a.chartService.List(c.Request.Context(), page, limit, search)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Charts []t.Chart `json:"charts"`
		Total  int       `json:"total"`
		Page   int       `json:"page"`
		Limit  int       `json:"limit"`
	}
	c.JSON(http.StatusOK, Response{
		Charts: charts,
		Total:  total,
		Page:   page,
		Limit:  limit,
	})
}
