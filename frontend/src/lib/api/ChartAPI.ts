import axios from "axios";
import { ChartResponse } from "../types/api";
import { ChartDraft } from "../types/types";

const PREFIX = `${process.env.NEXT_PUBLIC_API_URL}/chart`;

export const createChart = async (
    sessionId: string,
    chartDraft: ChartDraft
): Promise<ChartResponse> => {
    const response = await axios.post<ChartResponse>(
        `${PREFIX}/create`,
        { sessionId, chartDraft }
    );
    return response.data;
};

export const getChart = async (id: number): Promise<ChartResponse> => {
    const response = await axios.get<ChartResponse>(`${PREFIX}/${id}`);
    return response.data;
};