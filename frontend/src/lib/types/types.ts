export interface Line {
    words: {
        text: string,
        index: number,
    }[];
};
export interface Timing {
    start: number; 
    end: number;
}
export interface SyncMapSettings {
	font: string;
	textSize: number;
	textColor: string;
	backgroundImageUrl: string | null;
    audioUrl: string | null;
}
export const DEFAULT_SYNC_MAP_SETTINGS : SyncMapSettings = {
    font: "Arial",
	textSize: 24,
	textColor: '#000000',
    backgroundImageUrl: null,
    audioUrl: null,
}

export interface SyncMapMetadata {
    title: string;
    artist: string;
    songTitle: string;
    duration: number; // in seconds
}
export const DEFAULT_SYNC_MAP_METADATA : SyncMapMetadata = {
    title: "",
    artist: "",
    songTitle: "",
    duration: 0,
}

export interface SyncMap {
    uuid: "",
    lines: Line[];
    timings: Timing[];
    settings: SyncMapSettings;
    metadata: SyncMapMetadata;
} 