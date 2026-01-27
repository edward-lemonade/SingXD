import { SyncPoint } from "./types";

export interface SeparateAudioResponse {
    vocalsUrl: string,
    instrumentalUrl: string,
    sessionId: string,
}

export interface GenerateAlignmentResponse {
    syncPoints: SyncPoint[]
}

export interface GenerateVideoResponse {
    videoUrl: string,
}