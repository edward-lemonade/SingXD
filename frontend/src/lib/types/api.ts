import { Chart, Timing } from './models';

export interface SeparateAudioResponse {
    vocalsUrl: string;
    instrumentalUrl: string;
    sessionId: string;
}

export interface GenerateTimingsResponse {
    timings: Timing[];
}

export interface UploadImageResponse {
    imageUrl: string;
}

export interface ChartResponse {
    chart: Chart;
}

export interface ListChartsResponse {
    charts: Chart[];
    total: number;
    page: number;
    limit: number;
}