import { Timing } from "./types";

export interface SeparateAudioResponse {
    vocalsUrl: string,
    instrumentalUrl: string,
    sessionId: string,
}

export interface GenerateTimingsResponse {
    timings: Timing[],
}

export interface GenerateVideoResponse {
    videoUrl: string,
}