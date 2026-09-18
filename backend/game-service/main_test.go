package main

import (
	"context"
	"strings"
	"testing"

	gamepb "singxd/grpc/gamepb"
)

func TestCreateSessionIncludesTokenInWsAddress(t *testing.T) {
	s := newServer()
	resp, err := s.CreateSession(context.Background(), &gamepb.CreateSessionRequest{ChartId: 42, UserUid: "u1", SamplesInChunk: 2048})
	if err != nil {
		t.Fatalf("CreateSession returned error: %v", err)
	}
	if resp == nil {
		t.Fatal("CreateSession returned nil response")
	}
	if !strings.Contains(resp.WsAddress, "token=") {
		t.Fatalf("WsAddress should include token query parameter, got %q", resp.WsAddress)
	}
	if !strings.Contains(resp.WsAddress, resp.WsToken) {
		t.Fatalf("WsAddress should include the ws token, got %q; token=%q", resp.WsAddress, resp.WsToken)
	}
}
