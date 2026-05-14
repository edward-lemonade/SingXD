import { API } from '../axios';
import { ROUTE_CONFIG } from '../routes';
import { Score } from '../types/models';

export const getMyScores = async (): Promise<Score[]> => {
    const url = ROUTE_CONFIG.score.me();
    const response = await API.get<{ scores: Score[] }>(url);
    return response.data.scores;
};

export const getMyScoresForChart = async (chartId: number): Promise<Score[]> => {
    const url = ROUTE_CONFIG.score.meForChart(chartId);
    const response = await API.get<{ scores: Score[] }>(url);
    return response.data.scores;
};