import { Chart, Timing } from "./types";

export interface SeparateAudioResponse {
    vocalsUrl: string,
    instrumentalUrl: string,
    sessionId: string,
}

export interface GenerateTimingsResponse {
    timings: Timing[],
}

export interface UploadImageResponse {
    imageUrl: string,
}

export interface GenerateVideoResponse {
    videoUrl: string,
}

export interface ChartResponse {
    chart: Chart,
}