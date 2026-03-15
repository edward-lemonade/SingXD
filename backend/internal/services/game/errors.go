package game

import "errors"

var (
	ErrInvalidChartID   = errors.New("invalid chart id")
	ErrVocalsUnavailable = errors.New("vocals unavailable for chart")
	ErrUpgradeFailed    = errors.New("websocket upgrade failed")
)
