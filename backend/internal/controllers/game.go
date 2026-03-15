package controllers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"singxd/internal/services/game"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type GameService = game.GameService

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type GameController struct {
	gameService  *GameService
	chartService *ChartService
	vocalsCache  map[uint][]byte
	vocalsMu     sync.RWMutex
}

func NewGameController(gameService *GameService, chartService *ChartService) *GameController {
	return &GameController{
		gameService:  gameService,
		chartService: chartService,
		vocalsCache:  make(map[uint][]byte),
	}
}

func (g *GameController) getOrLoadVocals(id uint) ([]byte, error) {
	g.vocalsMu.RLock()
	cached := g.vocalsCache[id]
	g.vocalsMu.RUnlock()
	if cached != nil {
		return cached, nil
	}
	data, err := g.chartService.GetVocalsFileByID(context.Background(), id)
	if err != nil {
		return nil, err
	}
	g.vocalsMu.Lock()
	g.vocalsCache[id] = data
	g.vocalsMu.Unlock()
	return data, nil
}

// ====================================================================================
// Wire types

type wsInMsg struct {
	Type   string `json:"type"`
	Reason string `json:"reason,omitempty"`
}

type wsScoreMsg struct {
	Type      string  `json:"type"`
	Timestamp float64 `json:"timestamp"`
	Detected  float64 `json:"detected"`
	Reference float64 `json:"reference"`
	Score     float64 `json:"score"`
}

type wsSummaryMsg struct {
	Type        string       `json:"type"`
	TotalScore  float64      `json:"totalScore"`
	ChunkScores []wsScoreMsg `json:"chunkScores"`
}

// ====================================================================================
// Handler

func (g *GameController) PreloadVocals(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": game.ErrInvalidChartID.Error()})
		return
	}
	data, err := g.chartService.GetVocalsFileByID(context.Background(), uint(id))
	if err != nil {
		log.Printf("[PreloadVocals] failed to load vocals for chart %d: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": game.ErrVocalsUnavailable.Error()})
		return
	}
	g.vocalsMu.Lock()
	g.vocalsCache[uint(id)] = data
	g.vocalsMu.Unlock()
	c.Status(http.StatusNoContent)
}

func (g *GameController) GameSocket(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		log.Printf("[GameSocket] invalid chart id %q: %v", idStr, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": game.ErrInvalidChartID.Error()})
		return
	}

	vocalsData, err := g.getOrLoadVocals(uint(id))
	if err != nil {
		log.Printf("[GameSocket] failed to load vocals for chart %d: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": game.ErrVocalsUnavailable.Error()})
		return
	}
	reference := g.gameService.DecodePCM16(vocalsData)
	session := g.gameService.NewSession(reference)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[GameSocket] failed to upgrade connection for chart %d: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": game.ErrUpgradeFailed.Error()})
		return
	}
	defer conn.Close()

	writeSummary := func() {
		summary := g.gameService.Summarise(session)
		out := make([]wsScoreMsg, len(summary.ChunkScores))
		for i, c := range summary.ChunkScores {
			out[i] = wsScoreMsg{
				Type:      "score",
				Timestamp: c.Timestamp,
				Detected:  c.Detected,
				Reference: c.Reference,
				Score:     c.Score,
			}
		}
		_ = conn.WriteJSON(wsSummaryMsg{
			Type:        "summary",
			TotalScore:  summary.TotalScore,
			ChunkScores: out,
		})
	}

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway,
				websocket.CloseNormalClosure,
				websocket.CloseNoStatusReceived,
			) {
				log.Printf("[GameSocket] unexpected read error for chart %d: %v", id, err)
			}
			break
		}

		if msgType == websocket.TextMessage {
			var msg wsInMsg
			if err := json.Unmarshal(data, &msg); err != nil {
				log.Printf("[GameSocket] failed to unmarshal text message for chart %d: %v", id, err)
				continue
			}
			if msg.Type == "close" {
				writeSummary()
				break
			}
			continue
		}

		if msgType != websocket.BinaryMessage {
			continue
		}

		chunk := g.gameService.ProcessChunk(session, data)
		if err := conn.WriteJSON(wsScoreMsg{
			Type:      "score",
			Timestamp: chunk.Timestamp,
			Detected:  chunk.Detected,
			Reference: chunk.Reference,
			Score:     chunk.Score,
		}); err != nil {
			log.Printf("[GameSocket] failed to write score message for chart %d: %v", id, err)
			break
		}
	}
}
