package types

import "time"

type Word struct {
	Text  string `json:"text"`
	Index int    `json:"index"`
}

type Line struct {
	Words []Word `json:"words"`
}

type Timing struct {
	Start float64 `json:"start"` // in seconds
	End   float64 `json:"end"`   // in seconds
}

type ChartProperties struct {
	Title              string  `json:"title"`
	Artist             string  `json:"artist"`
	SongTitle          string  `json:"songTitle"`
	Duration           float64 `json:"duration"` // in seconds
	Font               string  `json:"font"`
	TextSize           int     `json:"textSize"`
	TextColor          string  `json:"textColor"`
	BackgroundImageURL *string `json:"backgroundImageUrl"` // nullable
	AudioURL           *string `json:"audioUrl"`           // nullable
}

type ChartDraft struct {
	Lines      []Line          `json:"lines"`
	Timings    []Timing        `json:"timings"`
	Properties ChartProperties `json:"properties"`
}

type Chart struct {
	ID        uint      `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Author    *string   `json:"author"`
	ChartDraft
}
