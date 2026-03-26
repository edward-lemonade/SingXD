import { PublicChart, Timing } from './models';
import { Serialized } from './transformers';

export interface SeparateAudioResponse {
	vocalsUrl: string;
	instrumentalUrl: string;
}

export interface GenerateTimingsResponse {
	timings: Timing[];
}

export interface UploadAudioResponse {
	audioUrl: string;
}

export interface UploadImageResponse {
	imageUrl: string;
}

export interface SerializedChartResponse {
	chart: Serialized<PublicChart>;
}

export interface ListChartsResponse {
	charts: PublicChart[];
	total: number;
	page: number;
	limit: number;
}
export type SerializedListChartsResponse = Omit<ListChartsResponse, "charts"> & {charts: Serialized<PublicChart>[];};