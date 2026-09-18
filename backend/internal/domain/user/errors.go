package user

import "singxd/internal/apperror"

var (
	ErrUserNotFound = apperror.NotFound("user not found", nil)
)
