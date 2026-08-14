package draft

import "errors"

var (
	ErrDbNotConfigured = errors.New("gorm not configured")
	ErrMissingUUID     = errors.New("missing uuid")
	ErrDraftNotFound   = errors.New("draft not found")
)
