module singxd/game-service

go 1.25.3

require (
	github.com/google/uuid v1.6.0
	github.com/gorilla/websocket v1.5.3
	google.golang.org/grpc v1.72.0
	singxd v0.0.0
)

require (
	golang.org/x/net v0.47.0 // indirect
	golang.org/x/sys v0.38.0 // indirect
	golang.org/x/text v0.31.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250505200425-f936aa4a68b2 // indirect
	google.golang.org/protobuf v1.36.10 // indirect
)

replace singxd => ../api
