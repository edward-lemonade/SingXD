package main

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"google.golang.org/grpc"

	gamesvc "singxd/game-service/internal/service/game"
	gamepb "singxd/grpc/gamepb"
)

type gameSession struct {
	id      string
	chartID uint64
	userUID string
	service *gamesvc.GameService
	session *gamesvc.GameSession
}

type server struct {
	gamepb.UnimplementedGameManagerServer
	mu          sync.RWMutex
	tokenToSess map[string]string
	sessions    map[string]*gameSession
}

func newServer() *server {
	return &server{tokenToSess: make(map[string]string), sessions: make(map[string]*gameSession)}
}

func buildReferenceTone(freq float64, seconds float64) []byte {
	const sampleRate = gamesvc.DefaultSampleRate
	totalSamples := int(float64(sampleRate) * seconds)
	pcm := make([]byte, totalSamples*2)
	for i := 0; i < totalSamples; i++ {
		t := float64(i) / float64(sampleRate)
		v := math.Sin(2 * math.Pi * freq * t)
		val := int16(v * 30000)
		binary.LittleEndian.PutUint16(pcm[i*2:i*2+2], uint16(val))
	}
	return pcm
}

func (s *server) CreateSession(ctx context.Context, req *gamepb.CreateSessionRequest) (*gamepb.CreateSessionResponse, error) {
	sid := uuid.NewString()
	token := uuid.NewString()
	chunkSize := int(req.SamplesInChunk)
	if chunkSize <= 0 {
		chunkSize = 2048
	}

	gs := gamesvc.NewGameService(gamesvc.DefaultSampleRate, gamesvc.DefaultThreshold)
	reference := buildReferenceTone(220.0, 8.0)
	sess := gs.NewSession(reference, chunkSize)

	s.mu.Lock()
	s.tokenToSess[token] = sid
	s.sessions[sid] = &gameSession{
		id:      sid,
		chartID: req.ChartId,
		userUID: req.UserUid,
		service: gs,
		session: sess,
	}
	s.mu.Unlock()

	host := os.Getenv("GAME_WS_HOST")
	if host == "" {
		host = "localhost:9090"
	}
	wsAddr := fmt.Sprintf("ws://%s/ws?session=%s&token=%s", host, sid, token)
	return &gamepb.CreateSessionResponse{
		SessionId: sid,
		WsAddress: wsAddr,
		WsToken:   token,
		TokenTtl:  60,
	}, nil
}

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func (s *server) wsHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("X-WS-Token")
	if token == "" {
		token = r.URL.Query().Get("token")
	}
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}

	s.mu.RLock()
	sid, ok := s.tokenToSess[token]
	if !ok {
		s.mu.RUnlock()
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	session := s.sessions[sid]
	s.mu.RUnlock()
	if session == nil || session.session == nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}
	defer conn.Close()

	for {
		mt, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if mt == websocket.BinaryMessage {
			score := session.service.ProcessChunk(session.session, msg)
			payload := map[string]any{
				"type":             "score",
				"timestamp":        score.Timestamp,
				"detected":         score.Detected,
				"reference":        score.Reference,
				"detectedSemitone": score.DetectedSemitone,
				"referenceSemitone": score.ReferenceSemitone,
				"score":           score.Score,
			}
			if err := conn.WriteJSON(payload); err != nil {
				break
			}
			continue
		}

		if mt == websocket.TextMessage {
			var control map[string]any
			if err := json.Unmarshal(msg, &control); err == nil {
				if control["type"] == "close" {
					break
				}
			}
		}
	}

	summary := session.service.Summarise(session.session)
	if len(summary.ChunkScores) > 0 {
		out := map[string]any{
			"type":       "summary",
			"totalScore": summary.TotalScore,
			"chunkScores": func() []map[string]any {
				items := make([]map[string]any, 0, len(summary.ChunkScores))
				for _, chunk := range summary.ChunkScores {
					items = append(items, map[string]any{
						"type":             "score",
						"timestamp":        chunk.Timestamp,
						"detected":         chunk.Detected,
						"reference":        chunk.Reference,
						"detectedSemitone": chunk.DetectedSemitone,
						"referenceSemitone": chunk.ReferenceSemitone,
						"score":           chunk.Score,
					})
				}
				return items
			}(),
		}
		_ = conn.WriteJSON(out)
	}

	s.mu.Lock()
	delete(s.tokenToSess, token)
	delete(s.sessions, sid)
	s.mu.Unlock()
	if session.service != nil {
		session.service.CloseSession(session.session)
	}
}

func main() {
	// start gRPC server
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	grpcSrv := grpc.NewServer()
	srv := newServer()
	gamepb.RegisterGameManagerServer(grpcSrv, srv)

	go func() {
		log.Println("starting gRPC server on :50051")
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("grpc serve: %v", err)
		}
	}()

	// start WS server
	wsHost := os.Getenv("GAME_WS_HOST")
	if wsHost == "" {
		wsHost = ":9090"
	}
	http.HandleFunc("/ws", srv.wsHandler)
	log.Printf("starting WS server on %s", wsHost)
	if err := http.ListenAndServe(wsHost, nil); err != nil {
		log.Fatalf("ws serve: %v", err)
	}
}
