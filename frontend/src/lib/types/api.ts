import { PublicChart, Timing } from './models';

export interface SeparateAudioResponse {
    vocalsUrl: string;
    instrumentalUrl: string;
}

export interface GenerateTimingsResponse {
    timings: Timing[];
}

export interface UploadAudioResponse {
    audioUrl: string;
}

export interface UploadImageResponse {
    imageUrl: string;
}

export interface ChartResponse {
    chart: PublicChart;
}

export interface ListChartsResponse {
    charts: PublicChart[];
    total: number;
    page: number;
    limit: number;
}
