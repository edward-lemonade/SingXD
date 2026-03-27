import { ChartBase } from "./models";

export type Serialized<T> = Omit<T, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }

export function parseChart<T extends ChartBase>(raw: Serialized<T>): T {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    } as any as T;
}
export function parseCharts<T extends ChartBase>(raw: Serialized<T>[]): T[] {
    return raw.map(c => parseChart(c))
}