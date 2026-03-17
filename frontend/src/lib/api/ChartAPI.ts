import axios from 'axios';
import { ChartResponse } from '../types/api';
import { ChartDraft } from '../types/models';
import { ROUTE_CONFIG } from './routes';

export const createChart = async (
    sessionId: string,
    chartDraft: ChartDraft
): Promise<ChartResponse> => {
    const url = ROUTE_CONFIG.chart.create();
    const response = await axios.post<ChartResponse>(url, { sessionId, chartDraft });
    return response.data;
};

export const getChart = async (id: number): Promise<ChartResponse> => {
    const url = ROUTE_CONFIG.chart.get(id);
    const response = await axios.get<ChartResponse>(url);
    return response.data;
};
