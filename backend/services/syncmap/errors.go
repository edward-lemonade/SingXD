package syncmap

import "errors"

var (
	ErrDbNotConfigured        = errors.New("gorm not configured")
	ErrSyncMapNotFound        = errors.New("syncmap not found")
	ErrNoAudioFilesForSession = errors.New("no audio files found for session")
	ErrNoInstrumentalFile     = errors.New("no instrumental audio file found")
)
