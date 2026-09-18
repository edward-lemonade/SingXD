package editor

import (
	"singxd/internal/apperror"
)

// editor/errors.go — sentinel AppErrors for the editor package
var (
	ErrMissingUUID               = apperror.InvalidInput("missing uuid", nil)
	ErrInvalidAudioType          = apperror.InvalidInput("invalid audio type", nil)
	ErrInvalidImageType          = apperror.InvalidInput("invalid image type", nil)
	ErrSeparationFailed          = apperror.Internal("separation failed", nil)
	ErrVocalsNotGenerated        = apperror.Internal("vocals file not generated", nil)
	ErrInstrumentalNotGenerated  = apperror.Internal("instrumental file not generated", nil)
	ErrAlignmentFailed           = apperror.Internal("alignment failed", nil)
	ErrParsingLyrics             = apperror.Unprocessable("failed to parse lyrics", nil)
	ErrPythonInterpreterNotFound = apperror.Internal("python interpreter not found", nil)
)
