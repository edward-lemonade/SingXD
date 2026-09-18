// domain/chart/errors.go
package chart

import "singxd/internal/apperror"

var (
	ErrChartNotFound       = apperror.NotFound("The requested chart could not be found.", nil)
	ErrNoAudioFilesForUUID = apperror.NotFound("No audio files were found for this draft.", nil)
	ErrNoInstrumentalFile  = apperror.NotFound("No instrumental track was found for this draft.", nil)
	ErrNoVocalsFile        = apperror.NotFound("No vocals track was found for this draft.", nil)
	ErrDbNotConfigured     = apperror.Internal("The server is not configured correctly. Please contact support.", nil)
)
