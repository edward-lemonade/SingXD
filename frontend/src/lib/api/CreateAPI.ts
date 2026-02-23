import axios from "axios";
import { GenerateTimingsResponse, GenerateVideoResponse, SeparateAudioResponse } from "../types/api";
import { Line, SyncMap, Timing } from "../types/types";


export const separateAudio = async (
    audioCombined: Blob
): Promise<SeparateAudioResponse> => {
    const formData = new FormData();
    formData.append('audio', audioCombined);

    const response = await axios.post<SeparateAudioResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/separate-audio`, 
        formData, 
        { timeout: 5 * 60 * 1000 } // 5 min timeout
    );

    return response.data
}

export const generateTimings = async (
    sessionId: string, 
    lines: Line[],
): Promise<Timing[]> => {
    const formData = new FormData();
    formData.append('sessionID', sessionId);
    formData.append('lyrics', JSON.stringify(lines));

    const response = await axios.post<GenerateTimingsResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/generate-timings`, 
        formData, 
        { timeout: 5 * 60 * 1000 } // 5 min timeout
    );

    console.log(response.data.timings)
    return response.data.timings;
}