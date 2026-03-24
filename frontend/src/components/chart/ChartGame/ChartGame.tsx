import { useEffect, useRef, useCallback, useState } from 'react';
import {
    connectChartGameSocket,
    WsMsg,
    WsSummaryMsg,
    type ChartGameSocketHandle,
} from '@src/lib/api/GameAPI';
import { PublicChart } from '@/src/lib/types/models';
import { LyricStateKind, useChartEngine } from '../internal/useChartEngine';
import ChartLyrics from '../internal/ChartLyrics';
import GameProgressBar, { GAME_PROGRESS_BAR_HEIGHT_PX } from './ProgressBar';

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
    new Blob([PCM_WORKLET_SOURCE], { type: 'application/javascript' })
);

// Top/bottom padding inside ChartLyrics (40px each side)
const LYRICS_PADDING_PX = 80;

const SLOTS = 3;
const GAP_RATIO = 0.33;

function computeGameLyricSizes(viewportHeight: number) {
    const available = viewportHeight - GAME_PROGRESS_BAR_HEIGHT_PX - LYRICS_PADDING_PX;
    const lineHeightPx = Math.floor(available / (SLOTS + GAP_RATIO * (SLOTS - 1)));
    const fontSize = `${Math.floor(lineHeightPx * 0.3)}px`;
    return { lineHeightPx, fontSize };
}

export default function ChartGame({
    chartId,
    chart,
    onQuit,
    onFinished,
}: {
    chartId: number;
    chart: PublicChart;
    onQuit?: (summary?: WsSummaryMsg) => void;
    onFinished?: (summary?: WsSummaryMsg) => void;
}) {
    const [justStarted, setJustStarted] = useState(true);
    const [vignetteOpacity, setVignetteOpacity] = useState(0);

    useEffect(() => {
        setJustStarted(false);
    }, []);

    const socketRef = useRef<ChartGameSocketHandle | null>(null);
    const endedRef = useRef(false);
    const pendingCloseRef = useRef<'quit' | 'ended' | null>(null);
    const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    const finishCallbackRef = useRef<() => void>(null!);

    const engine = useChartEngine(chart, {
        game: true,
        onEnded: () => finishCallbackRef.current?.(),
    });

    const closeSocket = useCallback(
        (reason: string) => {
            const handle = socketRef.current;
            if (!handle) return;
            handle.sendJSON({ type: 'close', reason });

            const SUMMARY_TIMEOUT_MS = 3000;

            summaryTimeoutRef.current = setTimeout(() => {
                summaryTimeoutRef.current = null;
                socketRef.current = null;
                handle.close(reason);

                const pending = pendingCloseRef.current;
                pendingCloseRef.current = null;

                if (pending === 'quit') onQuit?.();
                else if (pending === 'ended') onFinished?.();
            }, SUMMARY_TIMEOUT_MS);
        },
        [onQuit, onFinished]
    );

    const teardownMic = useCallback(() => {
        workletNodeRef.current?.port.close();
        workletNodeRef.current?.disconnect();
        workletNodeRef.current = null;

        audioContextRef.current?.close();
        audioContextRef.current = null;

        mediaStreamRef.current?.getAudioTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
    }, []);

    const quit = useCallback(() => {
        if (endedRef.current) return;

        endedRef.current = true;
        pendingCloseRef.current = 'quit';

        teardownMic();

        const audio = engine.audioElement;
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch {}
        }

        closeSocket('quit');
    }, [closeSocket, teardownMic, engine]);

    const finish = useCallback(() => {
        if (endedRef.current) return;

        endedRef.current = true;
        pendingCloseRef.current = 'ended';

        teardownMic();
        closeSocket('ended');
    }, [closeSocket, teardownMic]);

    finishCallbackRef.current = finish;

    const handleMessage = useCallback(
        (evt: MessageEvent) => {
            let msg: WsMsg;

            try {
                msg = JSON.parse(evt.data as string) as WsMsg;
            } catch {
                console.warn('[ChartGame ws] failed to parse message', evt.data);
                return;
            }

            if (msg.type === 'score') {
                const opacity = Math.min(1, 2 - 2 * msg.score);
                setVignetteOpacity(opacity);
                console.log(msg.referenceSemitone, msg.detectedSemitone);
                return;
            }

            if (msg.type === 'summary') {
                const summary = msg;

                console.log(
                    `[ChartGame ws] summary — total score: ${summary.totalScore.toFixed(
                        4
                    )}, chunks: ${summary.chunkScores.length}`
                );

                if (summaryTimeoutRef.current) {
                    clearTimeout(summaryTimeoutRef.current);
                    summaryTimeoutRef.current = null;
                }

                const handle = socketRef.current;
                socketRef.current = null;
                handle?.close('summary received');

                const pending = pendingCloseRef.current;
                pendingCloseRef.current = null;

                if (pending === 'quit') onQuit?.(summary);
                else if (pending === 'ended') onFinished?.(summary);
            }
        },
        [onQuit, onFinished]
    );

    useEffect(() => {
        if (!chart.properties.audioUrl) return;

        const handle = connectChartGameSocket({
            chartId,
            onMessage: handleMessage,
            onError: evt => console.warn('[ChartGame ws] error', evt),
            onClose: evt => console.debug('[ChartGame ws] closed', evt.code, evt.reason),
        });

        socketRef.current = handle;

        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then(async stream => {
                mediaStreamRef.current = stream;

                const ctx = new AudioContext({ sampleRate: 44100 });
                audioContextRef.current = ctx;

                await ctx.audioWorklet.addModule(PCM_WORKLET_BLOB_URL);

                if (audioContextRef.current !== ctx) return;

                const node = new AudioWorkletNode(ctx, 'pcm-processor');
                workletNodeRef.current = node;

                const BYTES_PER_CHUNK = 4096;
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
            .catch(err => console.error('[ChartGame] mic error', err));

        return () => {
            if (summaryTimeoutRef.current) {
                clearTimeout(summaryTimeoutRef.current);
                summaryTimeoutRef.current = null;
            }

            teardownMic();

            const h = socketRef.current;
            socketRef.current = null;

            h?.close('unmount');
        };
    }, [chartId, chart.properties.audioUrl, handleMessage, teardownMic]);

    const { lineHeightPx, fontSize } = computeGameLyricSizes(
        typeof window !== 'undefined' ? window.innerHeight : 900
    );

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundImage: chart.properties.backgroundImageUrl
                    ? `url(${chart.properties.backgroundImageUrl})`
                    : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Dark overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    opacity:
                        !justStarted && engine.lyricState.kind === LyricStateKind.LARGE_LINE_GAP
                            ? 0
                            : 1,
                    transition: 'opacity 1s ease',
                }}
            />

            {/* Red score vignette */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: `radial-gradient(
                        ellipse at center,
                        rgba(255,0,0,0) 40%,
                        rgba(255,0,0,1) 100%
                    )`,
                    opacity: vignetteOpacity,
                    transition: 'opacity 800ms ease-out',
                }}
            />

            {chart.properties.audioUrl && (
                <audio ref={engine.audioRef} src={chart.properties.audioUrl} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
                <GameProgressBar
                    currentTime={engine.currentTime}
                    duration={chart.properties.duration ?? 0}
                />
            </div>

            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex' }}>
                <ChartLyrics
                    chart={chart}
                    engine={engine}
                    lineHeightPx={lineHeightPx}
                    fontSize={fontSize}
                />
            </div>

            <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 2 }}>
                <button
                    onClick={quit}
                    style={{
                        padding: '10px 18px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        backgroundColor: '#ff4d4f',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        color: '#fff',
                    }}
                >
                    Quit
                </button>
            </div>
        </div>
    );
}
