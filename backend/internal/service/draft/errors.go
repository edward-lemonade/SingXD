package draft

import "errors"

var (
	ErrDbNotConfigured           = errors.New("gorm not configured")
	ErrMissingUUID               = errors.New("missing uuid")
	ErrInvalidAudioType          = errors.New("invalid audio type")
	ErrInvalidImageType          = errors.New("invalid image type")
	ErrSeparationFailed          = errors.New("separation failed")
	ErrVocalsNotGenerated        = errors.New("vocals file not generated")
	ErrInstrumentalNotGenerated  = errors.New("instrumental file not generated")
	ErrAlignmentFailed           = errors.New("alignment failed")
	ErrParsingLyrics             = errors.New("failed to parse lyrics")
	ErrPythonInterpreterNotFound = errors.New("python interpreter not found")
	ErrDraftNotFound             = errors.New("draft not found")
)
