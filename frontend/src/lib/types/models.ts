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

export interface ChartBase {
    lines: Line[];
    timings: Timing[];
    properties: ChartProperties;
}
export interface PublicChart extends ChartBase {
    readonly id: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    authorUid: string | null;
    playCount: number;
    likeCount: number;
}
export interface DraftChart extends ChartBase {
    readonly uuid: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    authorUid: string | null;
}
export interface DraftChartWithURLs extends DraftChart {
    combinedUrl?: string;
    instrumentalUrl?: string;
    vocalsUrl?: string;
    backgroundImageUrl?: string;
}

export interface User {
    id: string;
    uid: string;
    createdAt: Date;
    updatedAt: Date;
    lastVisited: string;
    username: string;
    description: string;
}

export interface Score {
    id: string;
    uid: string;
    chartId: number;
    createdAt: string;
    score: number;
}