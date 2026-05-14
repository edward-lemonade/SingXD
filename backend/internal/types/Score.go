package types

import "time"

type Score struct {
	ID        string    `json:"id"`
	UID       string    `json:"uid"`
	ChartID   uint      `json:"chartId"`
	CreatedAt time.Time `json:"createdAt"`
	Score     float32   `json:"score"`
}
