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
	BackgroundImageURL *string `json:"backgroundImageUrl"`
	AudioURL           *string `json:"audioUrl"`
}

type ChartBase struct {
	Lines      []Line          `json:"lines"`
	Timings    []Timing        `json:"timings"`
	Properties ChartProperties `json:"properties"`
}

type PublicChart struct {
	ID        uint      `json:"id"`
	AuthorUID *string   `json:"authorUid"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ChartBase
}

type DraftChart struct {
	UUID      string    `json:"uuid"`
	AuthorUID *string   `json:"authorUid"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ChartBase
}

type DraftChartWithURLs struct {
	BackgroundImageURL *string `json:"backgroundImageUrl"`
	CombinedURL        *string `json:"combinedUrl"`
	InstrumentalURL    *string `json:"instrumentalUrl"`
	VocalsURL          *string `json:"vocalsUrl"`
	DraftChart
}
