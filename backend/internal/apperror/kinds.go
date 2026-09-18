package apperror

import (
	"net/http"

	"google.golang.org/grpc/codes"
)

// apperror/kinds.go — the ~6-8 fixed categories, set once, never touched again
func NotFound(msg string, err error) *AppError {
	return New("not_found", msg, http.StatusNotFound, codes.NotFound, err)
}
func Conflict(msg string, err error) *AppError {
	return New("conflict", msg, http.StatusConflict, codes.AlreadyExists, err)
}
func InvalidInput(msg string, err error) *AppError {
	return New("invalid_input", msg, http.StatusBadRequest, codes.InvalidArgument, err)
}
func Unauthenticated(msg string, err error) *AppError {
	return New("unauthenticated", msg, http.StatusUnauthorized, codes.Unauthenticated, err)
}
func Unprocessable(msg string, err error) *AppError {
	return New("unprocessable", msg, http.StatusUnprocessableEntity, codes.Internal, err)
}
func Internal(msg string, err error) *AppError {
	return New("internal", msg, http.StatusInternalServerError, codes.Internal, err)
}
