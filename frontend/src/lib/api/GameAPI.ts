const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export type GameSocketCloseReason = "quit" | "ended" | "unmount" | string;

export interface WsScoreMsg {
    type: "score";
    timestamp: number;
    detected: number;
    reference: number;
    score: number;
}
export interface WsSummaryMsg {
    type: "summary";
    totalScore: number;
    chunkScores: WsScoreMsg[];
}
export type WsMsg = WsScoreMsg | WsSummaryMsg;

export async function preloadVocals(chartId: number): Promise<void> {
    const url = `${API_BASE}/game/load/${chartId}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Preload vocals failed: ${res.status} ${res.statusText}`);
    }
}

export interface ChartGameSocketHandle {
    sendBinary: (data: ArrayBuffer) => void;
    sendJSON: (data: unknown) => void;
    close: (reason: GameSocketCloseReason) => void;
}

export function connectChartGameSocket(options: {
    chartId: number;
    onMessage: (evt: MessageEvent) => void;
    onError: (evt: Event) => void;
    onClose: (evt: CloseEvent) => void;
}): ChartGameSocketHandle {
    const wsUrl = API_BASE.replace(/^http/, "ws") + `/game/ws/${options.chartId}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    ws.onmessage = options.onMessage;
    ws.onerror = options.onError;
    ws.onclose = options.onClose;

    return {
        close(reason: string) {
            if (ws.readyState === WebSocket.CONNECTING) {
                const prevOnOpen = ws.onopen;
                ws.onopen = (evt) => {
                    prevOnOpen?.call(ws, evt);
                    ws.close(1000, reason);
                };
            } else {
                ws.close(1000, reason);
            }
        },

        sendBinary(data: ArrayBuffer) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        },

        sendJSON(data: unknown) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        },
    };
}