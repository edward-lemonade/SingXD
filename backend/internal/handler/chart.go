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

func (a *ChartHandler) CreateChart(c *gin.Context) {
	type Request struct {
		DraftUUID string      `json:"draftUuid"`
		ChartBase t.ChartBase `json:"chartBase"`
	}

	var request Request
	if err := c.ShouldBindJSON(&request); err != nil {
		transport.BadRequest(c, "invalid request body")
		return
	}
	if request.DraftUUID == "" {
		transport.BadRequest(c, "missing draftUuid")
		return
	}

	chart, err := a.chartService.CreateChart(c.Request.Context(), request.DraftUUID, request.ChartBase)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Chart t.PublicChart `json:"chart"`
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

	chart, err := a.chartService.FindChartByID(c.Request.Context(), uint(id))
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Chart t.PublicChart `json:"chart"`
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

	charts, total, err := a.chartService.ListCharts(c.Request.Context(), page, limit, search)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Charts []t.PublicChart `json:"charts"`
		Total  int             `json:"total"`
		Page   int             `json:"page"`
		Limit  int             `json:"limit"`
	}
	c.JSON(http.StatusOK, Response{
		Charts: charts,
		Total:  total,
		Page:   page,
		Limit:  limit,
	})
}
