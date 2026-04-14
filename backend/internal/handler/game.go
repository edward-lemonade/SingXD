package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"singxd/internal/service/game"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type GameService = game.GameService

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type GameHandler struct {
	gameService  *GameService
	chartService *ChartService
	vocalsCache  map[uint][]byte
	vocalsMu     sync.RWMutex
}

func NewGameHandler(gameService *GameService, chartService *ChartService) *GameHandler {
	return &GameHandler{
		gameService:  gameService,
		chartService: chartService,
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

type wsScoreMsg struct {
	Type              string  `json:"type"`
	Timestamp         float64 `json:"timestamp"`
	Detected          float64 `json:"detected"`
	Reference         float64 `json:"reference"`
	DetectedSemitone  float64 `json:"detectedSemitone"`
	ReferenceSemitone float64 `json:"referenceSemitone"`
	Score             float64 `json:"score"`
}

type wsSummaryMsg struct {
	Type        string            `json:"type"`
	TotalScore  float64           `json:"totalScore"`
	ChunkScores []game.ChunkScore `json:"chunkScores"`
}

// ====================================================================================
// Handlers

func (g *GameHandler) PreloadVocals(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		transport.BadRequest(c, "invalid chart id")
		return
	}
	data, err := g.chartService.FindVocalsFileByID(context.Background(), uint(id))
	if err != nil {
		transport.ServiceError(c, game.ErrVocalsUnavailable)
		return
	}
	g.vocalsMu.Lock()
	g.vocalsCache[uint(id)] = data
	g.vocalsMu.Unlock()
	c.Status(http.StatusNoContent)
}

func (g *GameHandler) GameSocket(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		transport.BadRequest(c, "invalid chart id")
		return
	}

	vocalsData, err := g.getOrLoadVocals(uint(id))
	if err != nil {
		transport.ServiceError(c, err)
		return
	}
	session := g.gameService.NewSession(vocalsData)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		transport.ServiceError(c, game.ErrUpgradeFailed)
		return
	}
	defer conn.Close()

	writeSummary := func() {
		summary := g.gameService.Summarise(session)
		out := make([]game.ChunkScore, len(summary.ChunkScores))
		for i, c := range summary.ChunkScores {
			out[i] = game.ChunkScore{
				Timestamp:         c.Timestamp,
				Detected:          c.Detected,
				Reference:         c.Reference,
				DetectedSemitone:  c.DetectedSemitone,
				ReferenceSemitone: c.ReferenceSemitone,
				Score:             c.Score,
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
			Type:              "score",
			Timestamp:         chunk.Timestamp,
			Detected:          chunk.Detected,
			Reference:         chunk.Reference,
			DetectedSemitone:  chunk.DetectedSemitone,
			ReferenceSemitone: chunk.ReferenceSemitone,
			Score:             chunk.Score,
		}); err != nil {
			log.Printf("[GameSocket] failed to write score message for chart %d: %v", id, err)
			break
		}
	}
}
