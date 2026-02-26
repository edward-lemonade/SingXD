import { SetStateAction, useEffect, useRef, useState } from "react";
import Card from "./Card";
import WaveSurfer from "wavesurfer.js";
import { Line, SyncMapMetadata, Timing } from "../lib/types/types";
import SyncMapAlignmentEditorRegion from "./SyncMapAlignmentEditorRegion";

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

interface SyncMapAlignmentEditorProps {
    audioUrl: string | null;
    timings: Timing[];
    setTimings: (syncPoints: SetStateAction<Timing[]>) => void;
    words: string[];
}

const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 500;

export default function SyncMapAlignmentEditor({
    audioUrl,
    timings,
    setTimings,
    words,
}: SyncMapAlignmentEditorProps) {

    // Refs
    const wsContainerRef = useRef<HTMLDivElement | null>(null);
    const wsScrollContainerRef = useRef<HTMLElement | null>(null);
    const regionsScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const regionsContainerRef = useRef<HTMLDivElement | null>(null);

    // Wavesurfer state
    const wsRef = useRef<WaveSurfer | null>(null);
    const [isWsCreated, setWsCreated] = useState<boolean>(false);
    const [isWsLoading, setWsLoading] = useState<boolean>(false);
    const [isWsReady, setWsReady] = useState<boolean>(false);

    const [waveformWidth, setWaveformWidth] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Zoom state
    const [minPxPerSec, setMinPxPerSec] = useState<number>(50);
    const minPxPerSecRef = useRef<number>(50);

    // Selection state — holds the index of the selected region, or null
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const togglePlayPause = () => {
        if (!wsRef.current) return;
        if (isPlaying) {
            wsRef.current.pause();
            setIsPlaying(false);
        } else {
            wsRef.current.play();
            setIsPlaying(true);
        }
    };

    // Called by a region when the user drags it or resizes it
    const handleTimingChange = (index: number, newStart: number, newEnd: number) => {
        setTimings((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], start: newStart, end: newEnd };
            return next;
        });
    };

    // Create wavesurfer
    useEffect(() => {
        const ws = WaveSurfer.create({
            container: wsContainerRef.current!,
            waveColor: '#d9c1ca',
            progressColor: '#a17485',
            cursorColor: '#f54789',
            height: 100,
            normalize: false,
            minPxPerSec: 50,
        });
        wsRef.current = ws;
        wsScrollContainerRef.current = ws.getWrapper().parentElement;

        setWsCreated(true);

        return () => {
            ws.unAll();
            ws.destroy();
        }
    }, [])

    // Load wavesurfer audio
    useEffect(() => {
        if (!isWsCreated || !audioUrl) return;

        const ws = wsRef.current!;

        setWsLoading(true);
        ws.load(audioUrl);

        ws.on("ready", () => {
            setWsLoading(false);
            setWsReady(true);
            ws.getWrapper().parentElement!.style.overflow = 'hidden';
        });

        ws.on("play", () => { setIsPlaying(true); });
        ws.on("pause", () => { setIsPlaying(false); });
        ws.on("finish", () => { setIsPlaying(false); });

        return () => {
            ws.unAll();
            setWsReady(false);
        };
    }, [isWsCreated, audioUrl]);

    // Sync scroll positions between wavesurfer and regions containers
    useEffect(() => {
        const ws = wsRef.current!;
        if (!ws) return;
        const waveformElement = ws.getWrapper();
        const width = isWsReady ? waveformElement.scrollWidth : 0;
        setWaveformWidth(width);

        const wsScroll = wsScrollContainerRef.current;
        const regionsScroll = regionsScrollContainerRef.current;
        if (!wsScroll || !regionsScroll) return;

        let isWsSyncing = false;
        let isRegionsSyncing = false;

        const syncWsToRegions = () => {
            if (isRegionsSyncing) return;
            isWsSyncing = true;
            regionsScroll.scrollLeft = wsScroll.scrollLeft;
            requestAnimationFrame(() => { isWsSyncing = false; });
        };
        const syncRegionsToWs = () => {
            if (isWsSyncing) return;
            isRegionsSyncing = true;
            wsScroll.scrollLeft = regionsScroll.scrollLeft;
            requestAnimationFrame(() => { isRegionsSyncing = false; });
        };

        wsScroll.addEventListener('scroll', syncWsToRegions);
        regionsScroll.addEventListener('scroll', syncRegionsToWs);
        return () => {
            wsScroll.removeEventListener('scroll', syncWsToRegions);
            regionsScroll.removeEventListener('scroll', syncRegionsToWs);
        };
    }, [isWsReady]);

    // Fix waveform width bug
    useEffect(() => {
        if (!wsContainerRef.current || !wsRef.current) return;

        const container = wsContainerRef.current;

        const syncWidth = () => {
            if (!wsContainerRef.current || !wsRef.current) return;
            const widthPx = container.clientWidth;
            wsRef.current.setOptions({ width: widthPx });
        };
        syncWidth();

        const observer = new ResizeObserver(syncWidth);
        observer.observe(container);
        return () => { observer.disconnect(); };
    }, [isWsReady]);

    // Update waveformWidth whenever minPxPerSec changes (after zoom)
    useEffect(() => {
        if (!isWsReady || !wsRef.current) return;
        const ws = wsRef.current;
        requestAnimationFrame(() => {
            const width = ws.getWrapper().scrollWidth;
            setWaveformWidth(width);
        });
    }, [minPxPerSec, isWsReady]);

    // Pinch-to-zoom on regionsScrollContainer
    useEffect(() => {
        if (!isWsReady) return;

        const el = regionsScrollContainerRef.current;
        if (!el) return;

        let initialPinchDist: number | null = null;
        let initialPxPerSec: number = minPxPerSecRef.current;

        const getPinchDist = (touches: TouchList) =>
            Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                initialPinchDist = getPinchDist(e.touches);
                initialPxPerSec = minPxPerSecRef.current;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || initialPinchDist === null) return;
            e.preventDefault();

            const currentDist = getPinchDist(e.touches);
            const scale = currentDist / initialPinchDist;
            const newPxPerSec = Math.min(
                MAX_PX_PER_SEC,
                Math.max(MIN_PX_PER_SEC, initialPxPerSec * scale)
            );

            if (Math.abs(newPxPerSec - minPxPerSecRef.current) < 0.5) return;

            const container = regionsScrollContainerRef.current!;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const rect = container.getBoundingClientRect();
            const pinchOffsetX = midX - rect.left + container.scrollLeft;
            const ratio = pinchOffsetX / (wsRef.current!.getWrapper().scrollWidth || 1);

            minPxPerSecRef.current = newPxPerSec;
            setMinPxPerSec(newPxPerSec);
            wsRef.current!.setOptions({ minPxPerSec: newPxPerSec });

            requestAnimationFrame(() => {
                const newWidth = wsRef.current!.getWrapper().scrollWidth;
                setWaveformWidth(newWidth);
                const newScrollLeft = ratio * newWidth - (midX - rect.left);
                container.scrollLeft = Math.max(0, newScrollLeft);
                if (wsScrollContainerRef.current) {
                    wsScrollContainerRef.current.scrollLeft = container.scrollLeft;
                }
            });
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                initialPinchDist = null;
            }
        };

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();

            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newPxPerSec = Math.min(
                MAX_PX_PER_SEC,
                Math.max(MIN_PX_PER_SEC, minPxPerSecRef.current * zoomFactor)
            );

            if (Math.abs(newPxPerSec - minPxPerSecRef.current) < 0.5) return;

            const container = regionsScrollContainerRef.current!;
            const rect = container.getBoundingClientRect();
            const cursorOffsetX = e.clientX - rect.left + container.scrollLeft;
            const ratio = cursorOffsetX / (wsRef.current!.getWrapper().scrollWidth || 1);

            minPxPerSecRef.current = newPxPerSec;
            setMinPxPerSec(newPxPerSec);
            wsRef.current!.setOptions({ minPxPerSec: newPxPerSec });

            requestAnimationFrame(() => {
                const newWidth = wsRef.current!.getWrapper().scrollWidth;
                setWaveformWidth(newWidth);
                const newScrollLeft = ratio * newWidth - (e.clientX - rect.left);
                container.scrollLeft = Math.max(0, newScrollLeft);
                if (wsScrollContainerRef.current) {
                    wsScrollContainerRef.current.scrollLeft = container.scrollLeft;
                }
            });
        };

        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('wheel', onWheel);
        };
    }, [isWsReady]);

    return (
        <Card className="p-6 gap-6 flex flex-row">
            {/* Controls */}
            {isWsReady && (
                <div className="flex flex-col gap-2 justify-center">
                    <button
                        onClick={togglePlayPause}
                        className="w-12 h-12 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center transition-colors"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {!isPlaying ? (
                            <PlayArrowIcon/>
                        ) : (
                            <PauseIcon/>
                        )}
                    </button>
                </div>
            )}

            {/* Content */}
            <div
                className="flex grow relative"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.code === 'Space') {
                        e.preventDefault();
                        togglePlayPause();
                    }
                    // Pressing Escape deselects
                    if (e.code === 'Escape') {
                        setSelectedIndex(null);
                    }
                }}
                style={{ backgroundColor: '#F4F4F4', overflow: 'hidden' }}
            >
                {/* Wavesurfer */}
                <div
                    ref={wsContainerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                    }}
                />

                {/* Regions */}
                <div
                    ref={regionsScrollContainerRef}
                    style={{
                        width: '100%',
                        height: '100px',
                        position: 'absolute',
                        inset: 0,
                        overflow: 'auto',
                        touchAction: 'pan-x',
                    }}
                    onPointerDown={(e) => {
                        // Click on empty area: deselect & seek
                        const target = e.target as HTMLElement;
                        const isRegionClick = target.closest('[data-region]');
                        if (!isRegionClick) {
                            setSelectedIndex(null);
                        }

                        const container = regionsScrollContainerRef.current!;
                        const rect = container.getBoundingClientRect();
                        const clickX = e.clientX - rect.left + container.scrollLeft;
                        wsRef.current?.setTime(
                            wsRef.current.getDuration() * (clickX / waveformWidth)
                        );
                    }}
                >
                    <div
                        ref={regionsContainerRef}
                        style={{ width: waveformWidth || '100%', height: '100%' }}
                    >
                        {isWsReady && timings.map((timing, index) => (
                            <SyncMapAlignmentEditorRegion
                                key={index}
                                index={index}
                                start={timing.start}
                                end={timing.end}
                                text={words[index]}
                                duration={wsRef.current?.getDuration()!}
                                waveformWidth={waveformWidth}
                                isSelected={selectedIndex === index}
                                onSelect={setSelectedIndex}
                                onTimingChange={handleTimingChange}
                                prevEnd={index > 0 ? timings[index - 1].end : 0}
                                nextStart={index < timings.length - 1 ? timings[index + 1].start : wsRef.current?.getDuration()!}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}