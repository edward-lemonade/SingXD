#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR"
API_DIR="$BACKEND_DIR/api"
GAMESVC_DIR="$BACKEND_DIR/game-service"
PROTO_DIR="$BACKEND_DIR/proto"
GEN_DIR="$API_DIR/grpc"
LOG_DIR="$ROOT_DIR/../.logs"
mkdir -p "$LOG_DIR"

export PATH="$PATH:$(go env GOPATH)/bin"

if ! command -v protoc >/dev/null 2>&1; then
  echo "[backend] protoc not found. Install with: brew install protobuf" >&2
  exit 1
fi
if ! command -v protoc-gen-go >/dev/null 2>&1; then
  echo "[backend] protoc-gen-go not found. Install with: go install google.golang.org/protobuf/cmd/protoc-gen-go@latest" >&2
  exit 1
fi
if ! command -v protoc-gen-go-grpc >/dev/null 2>&1; then
  echo "[backend] protoc-gen-go-grpc not found. Install with: go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest" >&2
  exit 1
fi

mkdir -p "$PROTO_DIR" "$GEN_DIR"

printf '[backend] cleaning stale generated stubs\n'
rm -rf "$ROOT_DIR/../singxd/proto/gamepb" "$BACKEND_DIR/singxd" "$API_DIR/proto" "$API_DIR/grpc" "$BACKEND_DIR/proto/gamepb" "$BACKEND_DIR/backend" "$API_DIR/api"

printf '[backend] generating proto stubs\n'
protoc -I"$BACKEND_DIR" --go_out="$API_DIR" --go-grpc_out="$API_DIR" \
  --go_opt=module=singxd --go-grpc_opt=module=singxd \
  "$PROTO_DIR/game.proto"

printf '[backend] generated game stubs under %s\n' "$GEN_DIR"

printf '[backend] clearing any stale gRPC port listeners\n'
if command -v lsof >/dev/null 2>&1; then
  lsof -ti tcp:50051 | xargs -r kill -9 || true
fi

printf '[backend] building backend modules\n'
cd "$API_DIR"
go build ./...
cd "$GAMESVC_DIR"
go build ./...

export GAME_WS_HOST="${GAME_WS_HOST:-localhost:9090}"
export GAME_SERVICE_ADDR="${GAME_SERVICE_ADDR:-localhost:50051}"
export PORT="${PORT:-8080}"
export GATEWAY_PORT="${GATEWAY_PORT:-$PORT}"

check_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "[backend] port ${port} is already in use."
      echo "[backend] suggested command: lsof -ti tcp:${port} | xargs -r kill -9"
      return 1
    fi
  elif command -v fuser >/dev/null 2>&1; then
    if fuser "$port/tcp" >/dev/null 2>&1; then
      echo "[backend] port ${port} is already in use."
      echo "[backend] suggested command: fuser -k ${port}/tcp"
      return 1
    fi
  else
    python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket()
s.settimeout(0.5)
try:
    s.bind(('0.0.0.0', port))
except OSError:
    print('PORT_IN_USE')
    sys.exit(1)
else:
    s.close()
    sys.exit(0)
PY
    if [ $? -ne 0 ]; then
      echo "[backend] port ${port} is already in use."
      echo "[backend] suggested command: lsof -ti tcp:${port} | xargs -r kill -9"
      return 1
    fi
  fi

  return 0
}

if ! check_port_in_use "$PORT"; then
  exit 1
fi

printf '[backend] starting game service on %s\n' "$GAME_SERVICE_ADDR"
GAMESVC_LOG="$LOG_DIR/game-service.log"
API_LOG="$LOG_DIR/api.log"

# Start in the background and keep the terminal attached so the app stays live.
( cd "$GAMESVC_DIR" && go run . > "$GAMESVC_LOG" 2>&1 ) &
GAME_PID=$!
( cd "$API_DIR" && GAME_SERVICE_ADDR="$GAME_SERVICE_ADDR" PORT="$PORT" GATEWAY_PORT="$GATEWAY_PORT" go run . > "$API_LOG" 2>&1 ) &
GATEWAY_PID=$!

cleanup() {
  printf '\n[backend] stopping background services\n'
  kill "$GAME_PID" "$GATEWAY_PID" 2>/dev/null || true
  wait "$GAME_PID" 2>/dev/null || true
  wait "$GATEWAY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

printf '[backend] running. logs: %s and %s\n' "$GAMESVC_LOG" "$API_LOG"
wait "$GAME_PID"
