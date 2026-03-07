package chart

import "errors"

var (
	ErrDbNotConfigured        = errors.New("gorm not configured")
	ErrChartNotFound          = errors.New("chart not found")
	ErrNoAudioFilesForSession = errors.New("no audio files found for session")
	ErrNoInstrumentalFile     = errors.New("no instrumental audio file found")
)
