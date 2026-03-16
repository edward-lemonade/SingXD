export interface Line {
  words: {
    text: string;
    index: number;
  }[];
}
export interface Timing {
  start: number;
  end: number;
}

export interface ChartProperties {
  font: string;
  textSize: number;
  textColor: string;
  backgroundImageUrl: string | null;
  audioUrl: string | null;
  title: string;
  artist: string;
  songTitle: string;
  duration: number; // in seconds
}
export const DEFAULT_CHART_PROPERTIES: ChartProperties = {
  font: 'Arial',
  textSize: 24,
  textColor: '#000000',
  backgroundImageUrl: null,
  audioUrl: null,
  title: '',
  artist: '',
  songTitle: '',
  duration: 0,
};

export interface ChartDraft {
  lines: Line[];
  timings: Timing[];
  properties: ChartProperties;
}

export interface Chart extends ChartDraft {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  author: string | null;
  lines: Line[];
  timings: Timing[];
  properties: ChartProperties;
}

export interface GameSettings {
  width: number;
  height: number;
}
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  width: 720,
  height: 720,
};
