package grpcclient

import (
	"context"
	"time"

	"google.golang.org/grpc"

	gamepb "singxd/proto/gamepb"
)

type GameClient struct {
	addr string
}

func New(addr string) *GameClient {
	return &GameClient{addr: addr}
}

// CreateSession calls the Game service CreateSession RPC and returns the response.
func (g *GameClient) CreateSession(ctx context.Context, chartID uint64, userUID string, samples uint32) (*gamepb.CreateSessionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, g.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	client := gamepb.NewGameManagerClient(conn)
	req := &gamepb.CreateSessionRequest{ChartId: chartID, UserUid: userUID, SamplesInChunk: samples}
	return client.CreateSession(ctx, req)
}
