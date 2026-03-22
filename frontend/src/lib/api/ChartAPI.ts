import { ChartResponse, ListChartsResponse } from '../types/api';
import { ChartBase, DraftChart } from '../types/models';
import { ROUTE_CONFIG } from './routes';
import { API } from '../axios';

export const createChart = async (
    uuid: string,
    chartBase: ChartBase
): Promise<ChartResponse> => {
    const url = ROUTE_CONFIG.chart.create();
    const response = await API.post<ChartResponse>(url, { uuid, chartBase });
    return response.data;
};

export const getChart = async (id: number): Promise<ChartResponse> => {
    const url = ROUTE_CONFIG.chart.get(id);
    const response = await API.get<ChartResponse>(url);
    return response.data;
};

export const listCharts = async (
    page = 1,
    limit = 12,
    search = ''
): Promise<ListChartsResponse> => {
    const url = ROUTE_CONFIG.chart.list(page, limit, search);
    const response = await API.get<ListChartsResponse>(url);
    return response.data;
};