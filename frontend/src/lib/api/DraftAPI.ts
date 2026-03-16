import axios from "axios";
import { GenerateTimingsResponse, SeparateAudioResponse, UploadImageResponse } from "../types/api";
import { Line, Timing } from "../types/types";
import { ROUTE_CONFIG } from "./routes";

export const separateAudio = async (
    audioCombined: Blob
): Promise<SeparateAudioResponse> => {
    const url = ROUTE_CONFIG.draft.separateAudio();
    const formData = new FormData();
    formData.append('audio', audioCombined);

    const response = await axios.post<SeparateAudioResponse>(
        url,
        formData,
        { timeout: 5 * 60 * 1000 }
    );
    return response.data;
};

export const uploadImage = async (sessionId: string, image: Blob): Promise<string> => {
    const url = ROUTE_CONFIG.draft.uploadImage();
    const formData = new FormData();
    formData.append("sessionID", sessionId);
    formData.append("image", image);

    const response = await axios.post<UploadImageResponse>(
        url,
        formData
    );
    return response.data.imageUrl;
};

export const generateTimings = async (
    sessionId: string,
    lines: Line[],
): Promise<Timing[]> => {
    const url = ROUTE_CONFIG.draft.generateTimings();
    const formData = new FormData();
    formData.append('sessionID', sessionId);
    formData.append('lyrics', JSON.stringify(lines));

    const response = await axios.post<GenerateTimingsResponse>(
        url,
        formData,
        { timeout: 5 * 60 * 1000 }
    );
    return response.data.timings;
};