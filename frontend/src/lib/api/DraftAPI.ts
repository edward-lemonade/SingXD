import { ChartBase, DraftChart, DraftChartWithURLs, Line, Timing } from '../types/models';
import {
    GenerateTimingsResponse,
    SeparateAudioResponse,
    UploadAudioResponse,
    UploadImageResponse,
} from '../types/api';
import { ROUTE_CONFIG } from '../routes';
import { API } from '../axios';
import { parseChart, parseCharts, Serialized } from '../types/transformers';

// CRUD

export const initDraft = async (): Promise<string> => {
    const res = await API.post<{ uuid: string }>(ROUTE_CONFIG.draft.init());
    return res.data.uuid;
};

export const updateDraft = async (uuid: string, chartBase: ChartBase): Promise<DraftChart> => {
    const res = await API.put<{ draft: Serialized<DraftChart> }>(ROUTE_CONFIG.draft.update(uuid), {
        chartBase,
    });
    return parseChart(res.data.draft);
};

export const listDrafts = async (): Promise<DraftChart[]> => {
    const res = await API.get<{ drafts: Serialized<DraftChart>[] }>(ROUTE_CONFIG.draft.list());
    return parseCharts(res.data.drafts);
};

export const getDraft = async (uuid: string): Promise<DraftChartWithURLs> => {
    const res = await API.get<{ draft: Serialized<DraftChartWithURLs> }>(ROUTE_CONFIG.draft.get(uuid));
    return parseChart(res.data.draft);
};

export const deleteDraft = async (uuid: string): Promise<void> => {
    await API.delete(ROUTE_CONFIG.draft.delete(uuid));
};

export const publishDraft = async (uuid: string, chartBase: ChartBase): Promise<{ id: number }> => {
    const res = await API.post<{ chart: { id: number } }>(ROUTE_CONFIG.draft.publish(uuid), {
        chartBase,
    });
    return res.data.chart;
};

// Long Work

export const separateAudio = async (
    uuid: string,
    audioCombined: Blob
): Promise<SeparateAudioResponse> => {
    const url = ROUTE_CONFIG.draft.separateAudio(uuid);
    const formData = new FormData();
    formData.append('audio', audioCombined);
    const response = await API.post<SeparateAudioResponse>(url, formData, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};

export const uploadInstrumental = async (uuid: string, audio: Blob): Promise<string> => {
    const url = ROUTE_CONFIG.draft.uploadInstrumental(uuid);
    const formData = new FormData();
    formData.append('instrumental', audio);
    const response = await API.post<UploadAudioResponse>(url, formData);
    return response.data.audioUrl;
};

export const uploadVocals = async (uuid: string, audio: Blob): Promise<string> => {
    const url = ROUTE_CONFIG.draft.uploadVocals(uuid);
    const formData = new FormData();
    formData.append('vocals', audio);
    const response = await API.post<UploadAudioResponse>(url, formData);
    return response.data.audioUrl;
};

export const uploadImage = async (uuid: string, image: Blob): Promise<string> => {
    const url = ROUTE_CONFIG.draft.uploadImage(uuid);
    const formData = new FormData();
    formData.append('image', image);
    const response = await API.post<UploadImageResponse>(url, formData);
    return response.data.imageUrl;
};

export const generateTimings = async (uuid: string, lines: Line[]): Promise<Timing[]> => {
    const url = ROUTE_CONFIG.draft.generateTimings(uuid);
    const formData = new FormData();
    formData.append('lyrics', JSON.stringify(lines));
    const response = await API.post<GenerateTimingsResponse>(url, formData, {
        timeout: 5 * 60 * 1000,
    });
    return response.data.timings;
};
