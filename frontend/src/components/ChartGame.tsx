import { useEffect, useRef, useCallback } from "react";
import { connectChartGameSocket, WsMsg, WsSummaryMsg, type ChartGameSocketHandle } from "../lib/api/GameAPI";
import { Chart } from "../lib/types/types";
import ChartPlayer, { type ChartPlayerHandle } from "./ChartPlayer";

export interface ChartGameSettings {
    width: number;
    height: number;
}

const PCM_WORKLET_SOURCE = `
class PCMProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const channel = inputs[0]?.[0];
        if (!channel) return true;

        const pcm16 = new Int16Array(channel.length);
        for (let i = 0; i < channel.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, channel[i] * 32768));
        }

        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        return true;
    }
}
registerProcessor("pcm-processor", PCMProcessor);
`;

const PCM_WORKLET_BLOB_URL = URL.createObjectURL(
    new Blob([PCM_WORKLET_SOURCE], { type: "application/javascript" })
);

export default function ChartGame({
    chartId,
    chart,
    gameSettings,
    onQuit,
    onFinished,
}: {
    chartId: number;
    chart: Chart;
    gameSettings?: Partial<ChartGameSettings>;
    onQuit?: (summary?: WsSummaryMsg) => void;
    onFinished?: (summary?: WsSummaryMsg) => void;
}) {
    const playerRef = useRef<ChartPlayerHandle>(null);
    const socketRef = useRef<ChartGameSocketHandle | null>(null);
    const endedRef = useRef(false);
    const pendingCloseRef = useRef<"quit" | "ended" | null>(null);
    const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    const closeSocket = useCallback((reason: string) => {
        const handle = socketRef.current;
        if (!handle) return;
        handle.sendJSON({ type: "close", reason });
        // Don't close yet — wait for summary from server, then close in handleMessage.
        const SUMMARY_TIMEOUT_MS = 3000;
        summaryTimeoutRef.current = setTimeout(() => {
            summaryTimeoutRef.current = null;
            socketRef.current = null;
            handle.close(reason);
            const pending = pendingCloseRef.current;
            pendingCloseRef.current = null;
            if (pending === "quit") onQuit?.();
            else if (pending === "ended") onFinished?.();
        }, SUMMARY_TIMEOUT_MS);
    }, [onQuit, onFinished]);

    const teardownMic = useCallback(() => {
        workletNodeRef.current?.port.close();
        workletNodeRef.current?.disconnect();
        workletNodeRef.current = null;

        audioContextRef.current?.close();
        audioContextRef.current = null;

        mediaStreamRef.current?.getAudioTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
    }, []);

    const quit = useCallback(() => {
        if (endedRef.current) return;
        endedRef.current = true;
        pendingCloseRef.current = "quit";

        teardownMic();

        const audio = playerRef.current?.audioElement;
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch {
                // ignore
            }
        }

        closeSocket("quit");
    }, [closeSocket, teardownMic]);

    const finish = useCallback(() => {
        if (endedRef.current) return;
        endedRef.current = true;
        pendingCloseRef.current = "ended";

        teardownMic();
        closeSocket("ended");
    }, [closeSocket, teardownMic]);

    const handleMessage = useCallback(
        (evt: MessageEvent) => {
            let msg: WsMsg;
            try {
                msg = JSON.parse(evt.data as string) as WsMsg;
            } catch {
                console.warn("[ChartGame ws] failed to parse message", evt.data);
                return;
            }

            if (msg.type === "score") {
                /*
                console.log(
                    `[ChartGame ws] score @ ${msg.timestamp.toFixed(2)}s — ` +
                        `detected: ${msg.detected.toFixed(2)} Hz, ` +
                        `reference: ${msg.reference.toFixed(2)} Hz, ` +
                        `score: ${msg.score.toFixed(4)}`
                );*/
            } else if (msg.type === "summary") {
                const summary = msg;
                console.log(
                    `[ChartGame ws] summary — total score: ${summary.totalScore.toFixed(4)}, ` +
                        `chunks: ${summary.chunkScores.length}`
                );
                /*
                summary.chunkScores.forEach((c) => {
                    console.log(
                        `  @ ${c.timestamp.toFixed(2)}s — ` +
                            `detected: ${c.detected.toFixed(2)} Hz, ` +
                            `reference: ${c.reference.toFixed(2)} Hz, ` +
                            `score: ${c.score.toFixed(4)}`
                    );
                });*/

                if (summaryTimeoutRef.current) {
                    clearTimeout(summaryTimeoutRef.current);
                    summaryTimeoutRef.current = null;
                }
                const handle = socketRef.current;
                socketRef.current = null;
                handle?.close("summary received");

                const pending = pendingCloseRef.current;
                pendingCloseRef.current = null;
                if (pending === "quit") onQuit?.(summary);
                else if (pending === "ended") onFinished?.(summary);
            }
        },
        [onQuit, onFinished]
    );

    useEffect(() => {
        if (!chart.properties.audioUrl) return;

        const handle = connectChartGameSocket({
            chartId,
            onMessage: handleMessage,
            onError:   (evt) => console.warn("[ChartGame ws] error", evt),
            onClose:   (evt) => console.debug("[ChartGame ws] closed", evt.code, evt.reason),
        });
        socketRef.current = handle;

        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then(async (stream) => {
                mediaStreamRef.current = stream;

                const ctx = new AudioContext({ sampleRate: 44100 });
                audioContextRef.current = ctx;

                await ctx.audioWorklet.addModule(PCM_WORKLET_BLOB_URL);
                if (audioContextRef.current !== ctx) return;

                const node = new AudioWorkletNode(ctx, "pcm-processor");
                workletNodeRef.current = node;

                // Yin pitch detection needs enough samples (e.g. ~550+ for 80 Hz).
                // Worklet gives 128 samples per callback; buffer until we have a full chunk.
                const BYTES_PER_CHUNK = 4096; // 2048 samples @ 44.1kHz ~= 46ms
                let buffer = new Uint8Array(0);

                node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
                    const newData = new Uint8Array(e.data);
                    const combined = new Uint8Array(buffer.length + newData.length);
                    combined.set(buffer);
                    combined.set(newData, buffer.length);
                    buffer = combined;

                    while (buffer.length >= BYTES_PER_CHUNK) {
                        const chunk = new Uint8Array(BYTES_PER_CHUNK);
                        chunk.set(buffer.subarray(0, BYTES_PER_CHUNK));
                        buffer = buffer.subarray(BYTES_PER_CHUNK).slice();
                        socketRef.current?.sendBinary(chunk.buffer);
                    }
                };

                ctx.createMediaStreamSource(stream).connect(node);
            })
            .catch((err) => console.error("[ChartGame] mic error", err));

        return () => {
            if (summaryTimeoutRef.current) {
                clearTimeout(summaryTimeoutRef.current);
                summaryTimeoutRef.current = null;
            }
            teardownMic();
            const h = socketRef.current;
            socketRef.current = null;
            h?.close("unmount");
        };
    }, [chartId, chart.properties.audioUrl, handleMessage, teardownMic]);

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <ChartPlayer
                ref={playerRef}
                chart={chart}
                playerSettings={gameSettings}
                game
                onEnded={finish}
            />

            <div style={{ position: "absolute", bottom: "20px", right: "20px" }}>
                <button
                    onClick={quit}
                    style={{
                        padding: "10px 18px",
                        fontSize: "16px",
                        cursor: "pointer",
                        backgroundColor: "#ff4d4f",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: 700,
                        color: "#fff",
                    }}
                >
                    Quit
                </button>
            </div>
        </div>
    );
}