# Split: API Gateway + Game Microservice

Goal
- Split only the long-running game logic into a separate Go microservice so it can scale independently from the API gateway. Websocket sessions for gameplay are long-lived and resource-intensive; separating them enables independent autoscaling, resource isolation, and faster iteration on game logic.

High-level architecture
- API Gateway (existing `backend`): handles HTTP REST endpoints, authentication, user data, chart CRUD, and serves frontend assets. Responsible for authorizing requests and allocating game sessions via gRPC.
- Game Service (new): responsible for game session lifecycle, real-time audio processing, scoring, and exposing websocket endpoints for clients to connect. Communicates with API Gateway via gRPC for session allocation, metadata, and lifecycle events.

Service boundaries
- API Gateway responsibilities:
  - Authenticate users and validate permissions.
  - Expose REST endpoints for charts, drafts, users, and other domain APIs.
  - Allocate game sessions by calling GameService.CreateSession over gRPC.
  - Hand-off websocket responsibilities to Game Service (see hand-off options below).
  - Persist minimal session metadata if needed (session ids, owner id, chart id).

- Game Service responsibilities:
  - Create and manage `GameSession` instances.
  - Keep vocals/instrumental data in memory or fetch from object storage as needed.
  - Expose websocket endpoint(s) for real-time audio frames and scoring messages.
  - Provide a gRPC control API for session allocation, preloading, and metrics.

gRPC API (proposal)
-- file: `game.proto` (example)

```proto
syntax = "proto3";
package singxd.game;

import "google/protobuf/empty.proto";

service GameManager {
  // Called by the API gateway to allocate a session and receive connection info
  rpc CreateSession(CreateSessionRequest) returns (CreateSessionResponse);

  // Optional: request the Game Service to preload assets into memory
  rpc PreloadVocals(PreloadRequest) returns (google.protobuf.Empty);

  // Inform game-service to close a session early
  rpc CloseSession(CloseSessionRequest) returns (google.protobuf.Empty);

  // Optional: streaming for metrics / monitoring
  rpc StreamSessionEvents(stream SessionEvent) returns (google.protobuf.Empty);
}

message CreateSessionRequest {
  uint64 chart_id = 1;
  uint64 user_id = 2;
  // Preferred chunk size (samples) or 0 for default
  uint32 samples_in_chunk = 3;
}

message CreateSessionResponse {
  string session_id = 1;
  // Address that clients should connect to for websocket (host:port or LB)
  string ws_address = 2;
  // Short-lived token the client will present when connecting over WS
  string ws_token = 3;
  // Optional: TTL seconds for token
  uint32 token_ttl = 4;
}

message PreloadRequest { uint64 chart_id = 1; }
message CloseSessionRequest { string session_id = 1; }
message SessionEvent { string session_id = 1; string type = 2; string payload = 3; }
```

Websocket hand-off options
- Option A — Direct client -> Game Service websocket (recommended):
  1. Client requests `POST /games/:chartId/start` to API Gateway.
  2. API Gateway verifies auth and calls `GameManager.CreateSession` via gRPC.
  3. Game Service returns `ws_address` + `ws_token`.
  4. Client opens websocket directly to `ws_address`, sending `ws_token` as header or first text message.
  5. Game Service verifies token, binds session, and proceeds with real-time scoring.

  Pros: low latency, no proxying footprint on API gateway. Game service can scale separately and expose sticky routing if necessary.
  Cons: Game service must be reachable by clients (via LB / ingress). Requires secure short-lived tokens.

- Option B — Gateway proxies websocket then tunnels to Game Service (alternative):
  1. Client opens WS to API Gateway.
  2. API Gateway forwards the raw websocket frames to the selected Game Service instance using a bidirectional gRPC stream (or internal TCP proxy).

  Pros: Game services can stay private/internal; single public endpoint.
  Cons: Adds proxying overhead and forces API gateway to handle large I/O; harder to scale.

Recommended hand-off: Option A with short-lived tokens and health-checked LB for Game Service nodes. Use sticky session routing based on `session_id` if server-side state persists in-memory.

Security patterns
- Issue short-lived JWT-like tokens from the API gateway signed with a shared key; the Game Service validates token signature and ensures user_id/chart_id match.
- Mutual TLS between API Gateway and Game Service for gRPC control plane.
- Rate limit CreateSession RPCs per user to avoid allocation abuse.

Persistence and state
- Keep authoritative persistent state (users, charts, saved scores) in the existing DB behind API Gateway.
- Game Service keeps ephemeral session state in-memory; optionally snapshot summary to DB via API calls or a gRPC WriteSummary call.

Deployment & scaling
- Game Service:
  - Deploy behind a Service Load Balancer or Ingress with autoscaling based on CPU, memory, and active websocket connections.
  - Maintain health endpoints and readiness checks.
  - Use consistent hashing or LB session affinity to preserve session-to-instance mapping when necessary.

- API Gateway:
  - Responsible for authentication and routing. Keep small, horizontally scaled.
  - Do not proxy long-lived game traffic (unless choosing Option B).

Migration roadmap (stepwise)
1. Design and add `game.proto` in a new `/proto` folder.
2. Implement minimal Game Service skeleton that supports `CreateSession` and returns mocked `ws_address` and `ws_token`.
3. Update API Gateway with gRPC client to call `CreateSession` and return connection info to frontend.
4. Modify frontend to use the hand-off: call start endpoint then open websocket to `ws_address` with token.
5. Implement real `GameSession` lifecycle and websocket handling in Game Service (port logic from `internal/handler/game.go`).
6. Add metrics, monitoring, and autoscaling rules.
7. Perform canary rollout and gradually shift traffic.

Testing & rollout strategy
- Unit tests for `CreateSession` logic and token generation.
- Integration test: API Gateway -> Game Service gRPC flow returns valid `ws_address`; client successfully connects and performs a short session.
- Load test with simulated many concurrent websocket sessions to measure resource usage and validate autoscaling thresholds.

Runbook & operational notes
- How to revoke or force-close sessions: use `CloseSession` RPC.
- How to inspect active sessions: Game Service should expose a `/debug/sessions` endpoint or streaming events over gRPC.
- Backup plan: if Game Service is unhealthy, API Gateway should reject session creation requests with a clear 503 and fallback UI on frontend.

Open TODOs
- Write architecture overview and diagrams.
- Define detailed protobuf messages and codegen rules.
- Implement Game Service skeleton and CI pipeline.
- Update frontend and API Gateway to perform the hand-off.
- Create monitoring dashboards and HPA rules.

References
- Current game websocket handler: backend/internal/handler/game.go

Dev: codegen & run
- Generate Go protobuf + gRPC code (from repo root):

```bash
protoc --go_out=./ --go-grpc_out=./ proto/game.proto
```

- Build and run the Game Service (defaults shown):

```bash
cd backend
# game service gRPC runs on :50051 and websocket on :9090 by default
GAME_WS_HOST=localhost:9090 GAME_SERVICE_ADDR=localhost:50051 go run ./cmd/game-service
```

- Run API gateway (from `backend`):

```bash
# ensure GAME_SERVICE_ADDR is set so the gateway can call CreateSession
GAME_SERVICE_ADDR=localhost:50051 go run ./
```

Notes: The repository requires `protoc` with the Go plugins (`protoc-gen-go` and `protoc-gen-go-grpc`) installed to generate `proto/gamepb` sources before building the Go services.
