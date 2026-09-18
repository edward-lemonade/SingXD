package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"google.golang.org/grpc"

	gamepb "singxd/grpc/gamepb"
)

type server struct {
	gamepb.UnimplementedGameManagerServer
	mu          sync.RWMutex
	tokenToSess map[string]string
}

func newServer() *server {
	return &server{tokenToSess: make(map[string]string)}
}

func (s *server) CreateSession(ctx context.Context, req *gamepb.CreateSessionRequest) (*gamepb.CreateSessionResponse, error) {
	sid := uuid.NewString()
	token := uuid.NewString()
	s.mu.Lock()
	s.tokenToSess[token] = sid
	s.mu.Unlock()
	// ws address is read from env or default
	host := os.Getenv("GAME_WS_HOST")
	if host == "" {
		host = "localhost:9090"
	}
	wsAddr := fmt.Sprintf("ws://%s/ws?session=%s", host, sid)
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
		// allow token via query for convenience
		token = r.URL.Query().Get("token")
	}
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	s.mu.RLock()
	sid, ok := s.tokenToSess[token]
	s.mu.RUnlock()
	if !ok {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}
	defer conn.Close()
	// simple echo loop for skeleton
	for {
		mt, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		log.Printf("[ws %s] recv %d bytes", sid, len(msg))
		if err := conn.WriteMessage(mt, msg); err != nil {
			break
		}
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
