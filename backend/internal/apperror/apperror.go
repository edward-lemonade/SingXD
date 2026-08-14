package apperror

import (
	"errors"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// AppError wraps an underlying error with transport metadata.
type AppError struct {
	Code    string
	Message string // safe, user-facing message
	HTTP    int
	GRPC    codes.Code
	Err     error
}

func (e *AppError) Error() string { return e.Err.Error() }
func (e *AppError) Unwrap() error { return e.Err }

// New creates a new AppError. The returned value implements error.
func New(code, message string, http int, grpc codes.Code, err error) *AppError {
	if err == nil {
		err = errors.New(message)
	}
	return &AppError{Code: code, Message: message, HTTP: http, GRPC: grpc, Err: err}
}

// Wrap wraps an existing error into an AppError with the provided metadata.
func Wrap(err error, code, message string, http int, grpc codes.Code) error {
	return &AppError{Code: code, Message: message, HTTP: http, GRPC: grpc, Err: err}
}

// ToHTTP maps an error to an HTTP status and safe message. If the error is an
// AppError those values are returned. Otherwise a generic 500 and message are returned.
func ToHTTP(err error) (int, string) {
	var a *AppError
	if errors.As(err, &a) {
		return a.HTTP, a.Message
	}
	// Check registered sentinels
	for _, r := range registry {
		if errors.Is(err, r.sentinel) {
			return r.http, r.message
		}
	}
	return 500, "An unexpected error occurred. Please try again."
}

// ToGRPC maps an error to a gRPC status. If the error is an AppError its GRPC code
// and message are used. Otherwise codes.Internal is returned.
func ToGRPC(err error) *status.Status {
	var a *AppError
	if errors.As(err, &a) {
		return status.New(a.GRPC, a.Message)
	}
	// Check registry for a matching sentinel
	for _, r := range registry {
		if errors.Is(err, r.sentinel) {
			return status.New(r.grpc, r.message)
		}
	}
	return status.New(codes.Internal, "Internal Server Error")
}

// Registry for sentinel mapping
type regEntry struct {
	sentinel error
	http     int
	grpc     codes.Code
	message  string
}

var registry []regEntry

// Register associates a sentinel error with transport metadata. Use this during
// init to register domain sentinel mappings (e.g. ErrNotFound -> 404).
func Register(sentinel error, http int, grpc codes.Code, message string) {
	registry = append(registry, regEntry{sentinel: sentinel, http: http, grpc: grpc, message: message})
}
