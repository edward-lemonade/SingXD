// errors.go
package draft

import "singxd/internal/apperror"

var (
	ErrDbNotConfigured = apperror.Internal("The server is not configured correctly. Please contact support.", nil)
	ErrMissingUUID     = apperror.InvalidInput("Draft UUID is required.", nil)
	ErrDraftNotFound   = apperror.NotFound("Draft not found.", nil)
	ErrFileNotFound    = apperror.NotFound("Files were not found for this draft.", nil)
)
