import axios from "axios";
import { GenerateTimingsResponse, GenerateVideoResponse, SeparateAudioResponse, UploadImageResponse } from "../types/api";
import { Line, SyncMap, Timing } from "../types/types";

const PREFIX = `${process.env.NEXT_PUBLIC_API_URL}/syncmap`;

export const getSyncMap = async (uuid: string): Promise<SyncMap> => {
    const response = await axios.get<SyncMap>(`${PREFIX}/${uuid}`);
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
        { timeout: 5 * 60 * 1000 } // 5 min timeout
    );

    return response.data
}

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
        { timeout: 5 * 60 * 1000 } // 5 min timeout
    );

    return response.data.timings;
}

export const createMap = async (
    sessionId: string,
    syncMap: SyncMap
): Promise<SyncMap> => {
    const response = await axios.post<SyncMap>(
        `${PREFIX}/create`,
        { sessionId, syncMap }
    );
    return response.data;
}