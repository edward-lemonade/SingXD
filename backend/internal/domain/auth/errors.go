package auth

import "errors"

var (
	ErrMissingToken   = errors.New("missing authorization token")
	ErrInvalidToken   = errors.New("invalid authorization token")
	ErrMissingIDToken = errors.New("missing firebase id token")
)
