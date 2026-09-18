import { API } from '../axios';
import { ROUTE_CONFIG } from '../routes';

export type GameSocketCloseReason = 'quit' | 'ended' | 'unmount' | string;

export interface WsScoreMsg {
    type: 'score';
    timestamp: number;
    detected: number;
    reference: number;
    detectedSemitone: number;
    referenceSemitone: number;
    score: number;
}
export interface WsSummaryMsg {
    type: 'summary';
    totalScore: number;
    chunkScores: WsScoreMsg[];
}
export type WsMsg = WsScoreMsg | WsSummaryMsg;

export async function preloadVocals(chartId: number): Promise<void> {
    await API.get(ROUTE_CONFIG.game.load(chartId));
}

export async function startGameSession(chartId: number): Promise<{
    sessionId: string;
    wsAddress: string;
    wsToken: string;
    tokenTtl: number;
}> {
    const response = await API.post(ROUTE_CONFIG.game.start(chartId));
    return response.data;
}

export interface ChartGameSocketHandle {
    sendBinary: (data: ArrayBuffer) => void;
    sendJSON: (data: unknown) => void;
    close: (reason: GameSocketCloseReason) => void;
}

export function connectChartGameSocket(options: {
    wsUrl: string;
    onMessage: (evt: MessageEvent) => void;
    onError: (evt: Event) => void;
    onClose: (evt: CloseEvent) => void;
}): ChartGameSocketHandle {
    const { wsUrl, onMessage, onError, onClose } = options;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    ws.onmessage = onMessage;
    ws.onerror = onError;
    ws.onclose = onClose;

    return {
        close(reason: string) {
            if (ws.readyState === WebSocket.CONNECTING) {
                const prevOnOpen = ws.onopen;
                ws.onopen = evt => {
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
