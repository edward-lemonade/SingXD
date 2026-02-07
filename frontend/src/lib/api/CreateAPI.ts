import axios from "axios";
import { GenerateAlignmentResponse, GenerateVideoResponse, SeparateAudioResponse } from "../types/api";
import { SyncMap, SyncPoint, SyncPointWithText } from "../types/types";


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

export const generateAlignment = async (
    sessionId: string, 
    lyrics: string
): Promise<SyncPointWithText[]> => {
    const formData = new FormData();
    formData.append('sessionID', sessionId);
    formData.append('lyrics', lyrics);

    const response = await axios.post<GenerateAlignmentResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/generate-alignment`, 
        formData, 
        { timeout: 5 * 60 * 1000 } // 5 min timeout
    );
    return response.data.syncPoints;
}

export const generateVideo = async (
    instrumental: File,
    vocals: File,
    backgroundImage: File,
    syncLines: SyncMap,
    syncPoints: SyncPoint[],
): Promise<string> => {
    const formData = new FormData();

    formData.append('instrumental', instrumental);
    formData.append('vocals', vocals);
    formData.append('backgroundImage', backgroundImage);
    formData.append('alignment', JSON.stringify(syncLines));
    formData.append('syncPoints', JSON.stringify(syncPoints));

    //formData.append('font', video.font);
    //formData.append('textSize', video.textSize.toString());
    //formData.append('textColor', video.textColor);
    
    const response = await axios.post<GenerateVideoResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/generate-video`, 
        formData,
        { timeout: 20 * 60 * 1000 } 
    );

    return response.data.videoUrl;
}