// models/syncmap.go
package models

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

type SyncMapSettings struct {
	Font               string  `json:"font"`
	TextSize           int     `json:"textSize"`
	TextColor          string  `json:"textColor"`
	BackgroundImageURL *string `json:"backgroundImageUrl"` // nullable
	AudioURL           *string `json:"audioUrl"`           // nullable
}

func DefaultSyncMapSettings() SyncMapSettings {
	return SyncMapSettings{
		Font:               "Arial",
		TextSize:           24,
		TextColor:          "#000000",
		BackgroundImageURL: nil,
		AudioURL:           nil,
	}
}

type SyncMapMetadata struct {
	Title     string  `json:"title"`
	Artist    string  `json:"artist"`
	SongTitle string  `json:"songTitle"`
	Duration  float64 `json:"duration"` // in seconds
}

func DefaultSyncMapMetadata() SyncMapMetadata {
	return SyncMapMetadata{
		Title:     "",
		Artist:    "",
		SongTitle: "",
		Duration:  0,
	}
}

type SyncMap struct {
	UUID     string          `json:"uuid"`
	Lines    []Line          `json:"lines"`
	Timings  []Timing        `json:"timings"`
	Settings SyncMapSettings `json:"settings"`
	Metadata SyncMapMetadata `json:"metadata"`
}
