// errors.go
package auth

import "singxd/internal/apperror"

var (
	ErrMissingToken   = apperror.Unauthenticated("Authorization token is required.", nil)
	ErrInvalidToken   = apperror.Unauthenticated("Authorization token is invalid or expired.", nil)
	ErrMissingIDToken = apperror.InvalidInput("Firebase ID token is required.", nil)
)
