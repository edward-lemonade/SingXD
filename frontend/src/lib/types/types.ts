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
export interface SyncMapProperties {
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

export interface SyncMapDraft {
    lines: Line[];
    timings: Timing[];
    properties: SyncMapProperties;
} 

export interface SyncMap extends SyncMapDraft {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    author: string | null;
}

export const DEFAULT_SYNCMAP_PROPERTIES : SyncMapProperties = {
    font: "Arial",
	textSize: 24,
	textColor: '#000000',
    backgroundImageUrl: null,
    audioUrl: null,
    title: "",
    artist: "",
    songTitle: "",
    duration: 0,
}