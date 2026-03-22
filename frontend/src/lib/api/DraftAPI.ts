import { GenerateTimingsResponse, SeparateAudioResponse, UploadImageResponse } from '../types/api';
import { Line, Timing } from '../types/models';
import { ROUTE_CONFIG } from './routes';
import { API } from '../axios';

export const separateAudio = async (audioCombined: Blob): Promise<SeparateAudioResponse> => {
    const url = ROUTE_CONFIG.draft.separateAudio();
    const formData = new FormData();
    formData.append('audio', audioCombined);

    const response = await API.post<SeparateAudioResponse>(url, formData, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};

export const uploadImage = async (sessionId: string, image: Blob): Promise<string> => {
    const url = ROUTE_CONFIG.draft.uploadImage();
    const formData = new FormData();
    formData.append('sessionID', sessionId);
    formData.append('image', image);

    const response = await API.post<UploadImageResponse>(url, formData);
    return response.data.imageUrl;
};

export const generateTimings = async (sessionId: string, lines: Line[]): Promise<Timing[]> => {
    const url = ROUTE_CONFIG.draft.generateTimings();
    const formData = new FormData();
    formData.append('sessionID', sessionId);
    formData.append('lyrics', JSON.stringify(lines));

    const response = await API.post<GenerateTimingsResponse>(url, formData, {
        timeout: 5 * 60 * 1000,
    });
    return response.data.timings;
};
