package handler

import (
	"net/http"
	"strconv"

	"singxd/internal/apperror"
	scorepkg "singxd/internal/domain/score"

	"github.com/gin-gonic/gin"
)

type ScoreService = scorepkg.ScoreService

type ScoreHandler struct {
	scoreService *scorepkg.ScoreService
}

func NewScoreHandler(service *scorepkg.ScoreService) *ScoreHandler {
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
		apperror.ServiceError(c, err)
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
		apperror.ServiceError(c, apperror.InvalidInput("invalid chart id", err))
		return
	}

	scores, err := h.scoreService.GetByUIDAndChartID(c.Request.Context(), uid, uint(id))
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"scores": scores})
}

func (h *ScoreHandler) GetTopScoresForChart(c *gin.Context) { // eventually make this paginated
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		apperror.ServiceError(c, apperror.InvalidInput("invalid chart id", err))
		return
	}

	scores, err := h.scoreService.GetBestByChartID(c.Request.Context(), uint(id), 10)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"scores": scores})
}
