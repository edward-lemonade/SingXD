package handler

import (
	"net/http"
	"strconv"

	"singxd/internal/service/score"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

type ScoreService = score.ScoreService

type ScoreHandler struct {
	scoreService *ScoreService
}

func NewScoreHandler(service *ScoreService) *ScoreHandler {
	return &ScoreHandler{scoreService: service}
}

// =========================================================
// Operations

func (h *ScoreHandler) GetMyScores(c *gin.Context) {
	uid := getRequiredUID(c)
	if uid == "" {
		return
	}

	scores, err := h.scoreService.GetByUID(c.Request.Context(), uid)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"scores": scores})
}

func (h *ScoreHandler) GetMyScoresForChart(c *gin.Context) {
	uid := getRequiredUID(c)
	if uid == "" {
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		transport.BadRequest(c, "invalid chart id")
		return
	}

	scores, err := h.scoreService.GetByUIDAndChartID(c.Request.Context(), uid, uint(id))
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"scores": scores})
}

func (h *ScoreHandler) GetTopScoresForChart(c *gin.Context) { // eventually make this paginated
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		transport.BadRequest(c, "invalid chart id")
		return
	}

	scores, err := h.scoreService.GetBestByChartID(c.Request.Context(), uint(id), 10)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"scores": scores})
}
