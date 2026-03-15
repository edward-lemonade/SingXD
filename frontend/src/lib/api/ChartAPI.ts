import axios from "axios";
import { ChartResponse, GenerateTimingsResponse, GenerateVideoResponse, SeparateAudioResponse, UploadImageResponse } from "../types/api";
import { Line, ChartDraft, Timing, Chart } from "../types/types";

const PREFIX = `${process.env.NEXT_PUBLIC_API_URL}/chart`;

export const getChart = async (id: number): Promise<ChartResponse> => {
    const response = await axios.get<ChartResponse>(`${PREFIX}/${id}`);
    return response.data;
};

export const separateAudio = async (
    audioCombined: Blob
): Promise<SeparateAudioResponse> => {
    const formData = new FormData();
    formData.append('audio', audioCombined);

    const response = await axios.post<SeparateAudioResponse>(
        `${PREFIX}/separate-audio`,
        formData,
        { timeout: 5 * 60 * 1000 }
    );
    return response.data;
};

export const uploadImage = async (sessionId: string, image: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("sessionID", sessionId);
    formData.append("image", image);

    const response = await axios.post<UploadImageResponse>(
        `${PREFIX}/upload-image`,
        formData
    );
    return response.data.imageUrl;
};

export const generateTimings = async (
    sessionId: string,
    lines: Line[],
): Promise<Timing[]> => {
    const formData = new FormData();
    formData.append('sessionID', sessionId);
    formData.append('lyrics', JSON.stringify(lines));

    const response = await axios.post<GenerateTimingsResponse>(
        `${PREFIX}/generate-timings`,
        formData,
        { timeout: 5 * 60 * 1000 }
    );
    return response.data.timings;
};

export const createChart = async (
    sessionId: string,
    chartDraft: ChartDraft
): Promise<ChartResponse> => {
    const response = await axios.post<ChartResponse>(
        `${PREFIX}/create`,
        { sessionId, chartDraft }
    );
    return response.data;
};