package chart

import "errors"

var (
	ErrDbNotConfigured     = errors.New("gorm not configured")
	ErrChartNotFound       = errors.New("chart not found")
	ErrNoAudioFilesForUUID = errors.New("no audio files found for draft uuid")
	ErrNoInstrumentalFile  = errors.New("no instrumental audio file found")
	ErrNoVocalsFile        = errors.New("no vocals audio file found")
)
