import { PublicChart, Timing } from './models';

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
    chart: PublicChart;
}

export interface ListChartsResponse {
    charts: PublicChart[];
    total: number;
    page: number;
    limit: number;
}