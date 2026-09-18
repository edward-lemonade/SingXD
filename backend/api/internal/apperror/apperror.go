package apperror

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AppError struct {
	Code    string
	Message string
	HTTP    int
	GRPC    codes.Code
	Err     error
}

func (e *AppError) Error() string { return e.Err.Error() }
func (e *AppError) Unwrap() error { return e.Err }

func New(code, message string, httpStatus int, grpcCode codes.Code, err error) *AppError {
	if err == nil {
		err = errors.New(message)
	}
	return &AppError{Code: code, Message: message, HTTP: httpStatus, GRPC: grpcCode, Err: err}
}

// ToHTTP / ToGRPC only ever need to unwrap *AppError now — no registry lookup.
func ToHTTP(err error) (int, string) {
	var a *AppError
	if errors.As(err, &a) {
		return a.HTTP, a.Message
	}
	return http.StatusInternalServerError, "An unexpected error occurred. Please try again."
}

func ToGRPC(err error) *status.Status {
	var a *AppError
	if errors.As(err, &a) {
		return status.New(a.GRPC, a.Message)
	}
	return status.New(codes.Internal, "Internal Server Error")
}

func ServiceError(c *gin.Context, err error) {
	log.Printf("[Service Error]: %v", err)
	status, msg := ToHTTP(err)
	c.JSON(status, gin.H{"error": msg})
}

func (e *AppError) WithCause(cause error) *AppError {
	clone := *e
	clone.Err = cause
	return &clone
}

func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Code == t.Code
}

func WrapUnknown(err error, fallbackMsg string) error {
	if err == nil {
		return nil
	}
	var appErr *AppError
	if errors.As(err, &appErr) {
		return err
	}
	return Internal(fallbackMsg, err)
}
