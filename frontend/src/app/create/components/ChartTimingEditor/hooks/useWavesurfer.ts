import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import Timeline from "wavesurfer.js/dist/plugins/timeline.js";

const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 500;

interface UseWaveSurferOptions {
    audioUrl: string | null;
    wsContainerRef: React.RefObject<HTMLDivElement | null>;
    timelineContainerRef: React.RefObject<HTMLDivElement | null>;
    timelineScrollContainerRef: React.RefObject<HTMLDivElement | null>;
    regionsScrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseWaveSurferReturn {
    wsRef: React.RefObject<WaveSurfer | null>;
    isReady: boolean;
    isPlaying: boolean;
    waveformWidth: number;
    minPxPerSec: number;
    togglePlayPause: () => void;
    seekTo: (time: number) => void;
}

export function useWaveSurfer({
    audioUrl,
    wsContainerRef,
    timelineContainerRef,
    timelineScrollContainerRef,
    regionsScrollContainerRef,
}: UseWaveSurferOptions): UseWaveSurferReturn {
    const wsRef = useRef<WaveSurfer | null>(null);
    const wsScrollContainerRef = useRef<HTMLElement | null>(null);

    const [isCreated, setIsCreated] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [waveformWidth, setWaveformWidth] = useState(0);
    const [minPxPerSec, setMinPxPerSec] = useState(50);
    const minPxPerSecRef = useRef(50);

    // ── Create ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!wsContainerRef.current || !timelineContainerRef.current) return;

        const timelinePlugin = Timeline.create({
            container: timelineContainerRef.current,
            height: 20,
            timeInterval: 0.1,
            primaryLabelInterval: 1,
            secondaryLabelInterval: 0.5,
            style: { fontSize: "11px", color: "#6b7280" },
        });

        const ws = WaveSurfer.create({
            container: wsContainerRef.current,
            waveColor: "#ebd8df",
            progressColor: "#c493a6",
            cursorColor: "#f54789",
            height: 100,
            normalize: false,
            minPxPerSec: 50,
            plugins: [timelinePlugin],
        });

        wsRef.current = ws;
        wsScrollContainerRef.current = ws.getWrapper().parentElement;
        setIsCreated(true);

        return () => {
            ws.unAll();
            ws.destroy();
        };
    }, []);

    // ── Load audio ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isCreated || !audioUrl) return;
        const ws = wsRef.current!;
        ws.load(audioUrl);

        ws.on("ready", () => {
            setIsReady(true);
            // Hide WaveSurfer's internal scrollbar — we drive scrolling ourselves
            const shadow =
                ws.getWrapper().parentElement?.shadowRoot ??
                (ws.getWrapper().getRootNode() as ShadowRoot);
            if (shadow) {
                const style = document.createElement("style");
                style.textContent = `
                    :host, div[part="scroll"] { overflow: hidden !important; scrollbar-width: none !important; }
                    div[part="scroll"]::-webkit-scrollbar { display: none !important; }
                `;
                shadow.appendChild(style);
            }
        });
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));

        return () => {
            ws.unAll();
            setIsReady(false);
        };
    }, [isCreated, audioUrl]);

    // ── Sync scroll positions ─────────────────────────────────────────────────
    useEffect(() => {
        const ws = wsRef.current;
        if (!ws) return;
        setWaveformWidth(isReady ? ws.getWrapper().scrollWidth : 0);

        const wsScroll = wsScrollContainerRef.current;
        const regionsScroll = regionsScrollContainerRef.current;
        const timelineScroll = timelineScrollContainerRef.current;
        if (!wsScroll || !regionsScroll || !timelineScroll) return;

        let wsLock = false;
        let regionsLock = false;

        const syncToWs = () => {
            if (regionsLock) return;
            wsLock = true;
            regionsScroll.scrollLeft = wsScroll.scrollLeft;
            timelineScroll.scrollLeft = wsScroll.scrollLeft;
            requestAnimationFrame(() => { wsLock = false; });
        };
        const syncToRegions = () => {
            if (wsLock) return;
            regionsLock = true;
            wsScroll.scrollLeft = regionsScroll.scrollLeft;
            timelineScroll.scrollLeft = regionsScroll.scrollLeft;
            requestAnimationFrame(() => { regionsLock = false; });
        };

        wsScroll.addEventListener("scroll", syncToWs);
        regionsScroll.addEventListener("scroll", syncToRegions);
        return () => {
            wsScroll.removeEventListener("scroll", syncToWs);
            regionsScroll.removeEventListener("scroll", syncToRegions);
        };
    }, [isReady]);

    // ── Fix WaveSurfer canvas width on container resize ───────────────────────
    useEffect(() => {
        if (!wsContainerRef.current || !wsRef.current) return;
        const container = wsContainerRef.current;
        const syncWidth = () => {
            if (!wsContainerRef.current || !wsRef.current) return;
            wsRef.current.setOptions({ width: container.clientWidth });
        };
        syncWidth();
        const observer = new ResizeObserver(syncWidth);
        observer.observe(container);
        return () => observer.disconnect();
    }, [isReady]);

    // ── Update waveformWidth after zoom ───────────────────────────────────────
    useEffect(() => {
        if (!isReady || !wsRef.current) return;
        const ws = wsRef.current;
        requestAnimationFrame(() => setWaveformWidth(ws.getWrapper().scrollWidth));
    }, [minPxPerSec, isReady]);

    // ── Pinch-to-zoom + ctrl/meta + wheel zoom ────────────────────────────────
    useEffect(() => {
        if (!isReady) return;
        const el = regionsScrollContainerRef.current;
        if (!el) return;

        let initialPinchDist: number | null = null;
        let initialPxPerSec = minPxPerSecRef.current;

        const getPinchDist = (t: TouchList) =>
            Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

        const applyZoom = (newPxPerSec: number, pivotClientX: number) => {
            if (Math.abs(newPxPerSec - minPxPerSecRef.current) < 0.5) return;
            const rect = el.getBoundingClientRect();
            const ratio =
                (pivotClientX - rect.left + el.scrollLeft) /
                (wsRef.current!.getWrapper().scrollWidth || 1);

            minPxPerSecRef.current = newPxPerSec;
            setMinPxPerSec(newPxPerSec);
            wsRef.current!.setOptions({ minPxPerSec: newPxPerSec });

            requestAnimationFrame(() => {
                const newWidth = wsRef.current!.getWrapper().scrollWidth;
                setWaveformWidth(newWidth);
                el.scrollLeft = Math.max(0, ratio * newWidth - (pivotClientX - rect.left));
                if (wsScrollContainerRef.current)
                    wsScrollContainerRef.current.scrollLeft = el.scrollLeft;
            });
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                initialPinchDist = getPinchDist(e.touches);
                initialPxPerSec = minPxPerSecRef.current;
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || initialPinchDist === null) return;
            e.preventDefault();
            const scale = getPinchDist(e.touches) / initialPinchDist;
            const newPxPerSec = Math.min(
                MAX_PX_PER_SEC,
                Math.max(MIN_PX_PER_SEC, initialPxPerSec * scale)
            );
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            applyZoom(newPxPerSec, midX);
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) initialPinchDist = null;
        };
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const newPxPerSec = Math.min(
                MAX_PX_PER_SEC,
                Math.max(MIN_PX_PER_SEC, minPxPerSecRef.current * factor)
            );
            applyZoom(newPxPerSec, e.clientX);
        };

        el.addEventListener("touchstart", onTouchStart, { passive: false });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd);
        el.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
            el.removeEventListener("wheel", onWheel);
        };
    }, [isReady]);

    // ── Public API ────────────────────────────────────────────────────────────
    const togglePlayPause = () => {
        if (!wsRef.current) return;
        isPlaying ? wsRef.current.pause() : wsRef.current.play();
    };

    const seekTo = (time: number) => {
        wsRef.current?.setTime(time);
    };

    return { wsRef, isReady, isPlaying, waveformWidth, minPxPerSec, togglePlayPause, seekTo };
}