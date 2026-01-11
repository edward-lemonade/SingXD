package models

type VideoSettings struct {
	Font            string `json:"font"`
	TextSize        int    `json:"textSize"`
	TextColor       string `json:"textColor"`
	BackgroundImage string `json:"backgroundImage,omitempty"`
}
