package controllers

import (
	"net/http"
	"strconv"

	"singxd/internal/services/chart"
	t "singxd/internal/services/types"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

type ChartService = chart.ChartService

type ChartController struct {
	chartService *ChartService
}

func NewChartController(service *ChartService) *ChartController {
	return &ChartController{chartService: service}
}

// ============================================================================================
// Handlers

func (a *ChartController) CreateMap(c *gin.Context) {
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

	chart, err := a.chartService.CreateMap(c.Request.Context(), request.SessionID, request.ChartDraft)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	type Response struct {
		Chart t.Chart `json:"chart"`
	}
	c.JSON(http.StatusOK, Response{Chart: *chart})
}

func (a *ChartController) GetChart(c *gin.Context) {
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
