import { SerializedChartResponse, ListChartsResponse, SerializedListChartsResponse } from '../types/api';
import { ChartBase, DraftChart, PublicChart, Score } from '../types/models';
import { ROUTE_CONFIG } from '../routes';
import { API } from '../axios';
import { parseChart, parseCharts } from '../types/transformers';

export const getChart = async (id: number): Promise<PublicChart> => {
    const url = ROUTE_CONFIG.chart.get(id);
    const response = await API.get<SerializedChartResponse>(url);
    return parseChart(response.data.chart);
};

export const listCharts = async (
    page = 1,
    limit = 12,
    search = ''
): Promise<ListChartsResponse> => {
    const url = ROUTE_CONFIG.chart.list(page, limit, search);
    const response = await API.get<SerializedListChartsResponse>(url);
    return {...response.data, charts: parseCharts(response.data.charts)};
};

export const listMyCharts = async (): Promise<PublicChart[]> => {
    const url = ROUTE_CONFIG.chart.mine();
    const response = await API.get<{ charts: PublicChart[] }>(url);
    return response.data.charts;
};

export const getChartLeaderboard = async (id: number): Promise<Score[]> => {
    const url = ROUTE_CONFIG.chart.leaderboard(id);
    const response = await API.get<{ scores: Score[] }>(url);
    return response.data.scores;
};
 