package syncmap_draft

import "errors"

var (
	ErrMissingSessionID          = errors.New("missing sessionID")
	ErrInvalidImageType          = errors.New("invalid image type")
	ErrSeparationFailed          = errors.New("separation failed")
	ErrVocalsNotGenerated        = errors.New("vocals file not generated")
	ErrInstrumentalNotGenerated  = errors.New("instrumental file not generated")
	ErrAlignmentFailed           = errors.New("alignment failed")
	ErrParsingLyrics             = errors.New("failed to parse lyrics")
	ErrPythonInterpreterNotFound = errors.New("python interpreter not found")
)
