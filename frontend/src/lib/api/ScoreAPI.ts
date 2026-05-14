import { API } from '../axios';
import { ROUTE_CONFIG } from '../routes';
import { Score } from '../types/models';

export const getMyScores = async (): Promise<Score[]> => {
    const response = await API.get<{ scores: Score[] }>(ROUTE_CONFIG.score.me());
    return response.data.scores;
};

export const getMyScoresForChart = async (chartId: number): Promise<Score[]> => {
    const response = await API.get<{ scores: Score[] }>(ROUTE_CONFIG.score.meForChart(chartId));
    return response.data.scores;
};