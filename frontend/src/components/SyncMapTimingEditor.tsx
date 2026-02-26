import { SetStateAction, useEffect, useRef, useState } from "react";
import Card from "./Card";
import WaveSurfer from "wavesurfer.js";
import Timeline from "wavesurfer.js/dist/plugins/timeline.js";
import { Timing } from "../lib/types/types";
import SyncMapTimingEditorRegion from "./SyncMapTimingEditorRegion";

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

export interface SyncMapTimingEditorHandle {
    seekTo: (time: number) => void;
    selectIndex: (index: number) => void;
}

interface SyncMapTimingEditorProps {
    audioUrl: string | null;
    timings: Timing[];
    setTimings: (syncPoints: SetStateAction<Timing[]>) => void;
    words: string[];
    selectedIndex: number | null;
    setSelectedIndex: (syncPoints: SetStateAction<number | null>) => void;
}

const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 500;

const WAVEFORM_HEIGHT = 100;
const TIMELINE_HEIGHT = 25;

// Minimum drag distance in px before we treat it as a draw drag (not a click)
const MIN_DRAG_PX = 5;

function SyncMapTimingEditor({
    audioUrl,
    timings,
    setTimings,
    words,
    selectedIndex,
    setSelectedIndex,
}: SyncMapTimingEditorProps) {

    // Refs
    const wsContainerRef = useRef<HTMLDivElement | null>(null);
    const wsScrollContainerRef = useRef<HTMLElement | null>(null);
    const regionsScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const regionsContainerRef = useRef<HTMLDivElement | null>(null);
    const timelineScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const timelineContainerRef = useRef<HTMLDivElement | null>(null);

    // Ghost region DOM element — managed imperatively to avoid re-renders during drag
    const ghostRef = useRef<HTMLDivElement | null>(null);

    // Wavesurfer state
    const wsRef = useRef<WaveSurfer | null>(null);
    const [isWsCreated, setWsCreated] = useState<boolean>(false);
    const [isWsReady, setWsReady] = useState<boolean>(false);

    const [waveformWidth, setWaveformWidth] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Zoom state
    const [minPxPerSec, setMinPxPerSec] = useState<number>(50);
    const minPxPerSecRef = useRef<number>(50);

    // Keep refs to latest values so imperative event handlers are never stale
    const timingsRef = useRef(timings);
    useEffect(() => { timingsRef.current = timings; }, [timings]);

    const waveformWidthRef = useRef(waveformWidth);
    useEffect(() => { waveformWidthRef.current = waveformWidth; }, [waveformWidth]);

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

    const handleTimingChange = (index: number, newStart: number, newEnd: number) => {
        setTimings((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], start: newStart, end: newEnd };
            return next;
        });
    };

    const handleTimelineClick = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!wsRef.current || !waveformWidth) return;
        const container = timelineContainerRef.current!;
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left + container.scrollLeft;
        const duration = wsRef.current.getDuration();
        if (!duration) return;
        wsRef.current.setTime(duration * (clickX / waveformWidth));
    };

    // ==================================================================================
    // Wavesurfer

    // Create wavesurfer
    useEffect(() => {
        if (!wsContainerRef.current || !timelineContainerRef.current) return;

        const timelinePlugin = Timeline.create({
            container: timelineContainerRef.current,
            height: 20,
            timeInterval: 0.1,
            primaryLabelInterval: 1,
            secondaryLabelInterval: 0.5,
            style: { fontSize: '11px', color: '#6b7280' },
        });

        const ws = WaveSurfer.create({
            container: wsContainerRef.current!,
            waveColor: '#ebd8df',
            progressColor: '#c493a6',
            cursorColor: '#f54789',
            height: 100,
            normalize: false,
            minPxPerSec: 50,
            plugins: [timelinePlugin],
        });
        wsRef.current = ws;
        wsScrollContainerRef.current = ws.getWrapper().parentElement;
        setWsCreated(true);

        return () => { ws.unAll(); ws.destroy(); };
    }, []);

    // Load wavesurfer audio
    useEffect(() => {
        if (!isWsCreated || !audioUrl) return;
        const ws = wsRef.current!;
        ws.load(audioUrl);

        ws.on("ready", () => {
            setWsReady(true);
            const shadow = ws.getWrapper().parentElement?.shadowRoot ??
                ws.getWrapper().getRootNode() as ShadowRoot;
            if (shadow) {
                const style = document.createElement('style');
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

        return () => { ws.unAll(); setWsReady(false); };
    }, [isWsCreated, audioUrl]);

    // Sync scroll positions
    useEffect(() => {
        const ws = wsRef.current;
        if (!ws) return;
        setWaveformWidth(isWsReady ? ws.getWrapper().scrollWidth : 0);

        const wsScroll = wsScrollContainerRef.current;
        const regionsScroll = regionsScrollContainerRef.current;
        const timelineScroll = timelineScrollContainerRef.current;
        if (!wsScroll || !regionsScroll || !timelineScroll) return;

        let isWsSyncing = false;
        let isRegionsSyncing = false;

        const syncToWs = () => {
            if (isRegionsSyncing) return;
            isWsSyncing = true;
            regionsScroll.scrollLeft = wsScroll.scrollLeft;
            timelineScroll.scrollLeft = wsScroll.scrollLeft;
            requestAnimationFrame(() => { isWsSyncing = false; });
        };
        const syncToRegions = () => {
            if (isWsSyncing) return;
            isRegionsSyncing = true;
            wsScroll.scrollLeft = regionsScroll.scrollLeft;
            timelineScroll.scrollLeft = wsScroll.scrollLeft;
            requestAnimationFrame(() => { isRegionsSyncing = false; });
        };

        wsScroll.addEventListener('scroll', syncToWs);
        regionsScroll.addEventListener('scroll', syncToRegions);
        return () => {
            wsScroll.removeEventListener('scroll', syncToWs);
            regionsScroll.removeEventListener('scroll', syncToRegions);
        };
    }, [isWsReady]);

    // Fix waveform width bug
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
    }, [isWsReady]);

    // Update waveformWidth after zoom
    useEffect(() => {
        if (!isWsReady || !wsRef.current) return;
        const ws = wsRef.current;
        requestAnimationFrame(() => setWaveformWidth(ws.getWrapper().scrollWidth));
    }, [minPxPerSec, isWsReady]);

    // Pinch-to-zoom + scroll-wheel zoom
    useEffect(() => {
        if (!isWsReady) return;
        const el = regionsScrollContainerRef.current;
        if (!el) return;

        let initialPinchDist: number | null = null;
        let initialPxPerSec = minPxPerSecRef.current;

        const getPinchDist = (t: TouchList) =>
            Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

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
            const newPxPerSec = Math.min(MAX_PX_PER_SEC, Math.max(MIN_PX_PER_SEC, initialPxPerSec * scale));
            if (Math.abs(newPxPerSec - minPxPerSecRef.current) < 0.5) return;

            const rect = el.getBoundingClientRect();
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const ratio = (midX - rect.left + el.scrollLeft) / (wsRef.current!.getWrapper().scrollWidth || 1);

            minPxPerSecRef.current = newPxPerSec;
            setMinPxPerSec(newPxPerSec);
            wsRef.current!.setOptions({ minPxPerSec: newPxPerSec });

            requestAnimationFrame(() => {
                const newWidth = wsRef.current!.getWrapper().scrollWidth;
                setWaveformWidth(newWidth);
                el.scrollLeft = Math.max(0, ratio * newWidth - (midX - rect.left));
                if (wsScrollContainerRef.current) wsScrollContainerRef.current.scrollLeft = el.scrollLeft;
            });
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) initialPinchDist = null;
        };

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newPxPerSec = Math.min(MAX_PX_PER_SEC, Math.max(MIN_PX_PER_SEC, minPxPerSecRef.current * zoomFactor));
            if (Math.abs(newPxPerSec - minPxPerSecRef.current) < 0.5) return;

            const rect = el.getBoundingClientRect();
            const ratio = (e.clientX - rect.left + el.scrollLeft) / (wsRef.current!.getWrapper().scrollWidth || 1);

            minPxPerSecRef.current = newPxPerSec;
            setMinPxPerSec(newPxPerSec);
            wsRef.current!.setOptions({ minPxPerSec: newPxPerSec });

            requestAnimationFrame(() => {
                const newWidth = wsRef.current!.getWrapper().scrollWidth;
                setWaveformWidth(newWidth);
                el.scrollLeft = Math.max(0, ratio * newWidth - (e.clientX - rect.left));
                if (wsScrollContainerRef.current) wsScrollContainerRef.current.scrollLeft = el.scrollLeft;
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

    // ==================================================================================
    // Ghost region draw-to-create

    const createDragState = useRef<{
        anchorX: number;
        anchorSec: number;
        isDragging: boolean;
        pointerId: number;
    } | null>(null);

    const pxToSec = (px: number) => (px / waveformWidthRef.current) * (wsRef.current?.getDuration() ?? 1);
    const secToPx = (sec: number) => (sec / (wsRef.current?.getDuration() ?? 1)) * waveformWidthRef.current;

    const clampToFreeSpace = (rawStart: number, rawEnd: number): [number, number] | null => {
        const duration = wsRef.current?.getDuration() ?? 0;
        const sorted = [...timingsRef.current].sort((a, b) => a.start - b.start);

        let s = Math.max(0, Math.min(rawStart, rawEnd));
        let e = Math.min(duration, Math.max(rawStart, rawEnd));

        for (const t of sorted) {
            // If this existing region overlaps our proposed span
            if (t.end > s && t.start < e) {
                if (rawEnd >= rawStart) {
                    // Dragging right, trim our end back to the region's start
                    e = Math.min(e, t.start);
                } else {
                    // Dragging left, trim our start forward to the region's end
                    s = Math.max(s, t.end);
                }
            }
        }

        if (e - s < 0.01) return null;
        return [s, e];
    };

    const ensureGhost = () => {
        if (ghostRef.current) return ghostRef.current;
        const el = document.createElement('div');
        el.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            background: rgba(99, 179, 237, 0.3);
            border: 2px dashed rgba(49, 130, 206, 0.85);
            pointer-events: none;
            z-index: 50;
            box-sizing: border-box;
        `;
        regionsContainerRef.current?.appendChild(el);
        ghostRef.current = el;
        return el;
    };

    const removeGhost = () => {
        ghostRef.current?.remove();
        ghostRef.current = null;
    };

    const updateGhost = (rawStart: number, rawEnd: number) => {
        const clamped = clampToFreeSpace(rawStart, rawEnd);
        const ghost = ensureGhost();
        if (!clamped) {
            ghost.style.display = 'none';
            return;
        }
        const [s, e] = clamped;
        ghost.style.display = 'block';
        ghost.style.left = `${secToPx(s)}px`;
        ghost.style.width = `${secToPx(e - s)}px`;
    };

    // Drag-to-create regions
    useEffect(() => {
        if (!isWsReady) return;

        const container = regionsScrollContainerRef.current!;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            // Do not intercept events that originate on an existing region
            const target = e.target as HTMLElement;
            if (target.closest('[data-region]')) return;

            const rect = container.getBoundingClientRect();
            const offsetX = e.clientX - rect.left + container.scrollLeft;

            createDragState.current = {
                anchorX: e.clientX,
                anchorSec: pxToSec(offsetX),
                isDragging: false,
                pointerId: e.pointerId,
            };
        };

        const onPointerMove = (e: PointerEvent) => {
            const ds = createDragState.current;
            if (!ds || e.pointerId !== ds.pointerId) return;

            if (!ds.isDragging) {
                if (Math.abs(e.clientX - ds.anchorX) < MIN_DRAG_PX) return;
                container.setPointerCapture(e.pointerId);
                container.style.cursor = 'crosshair';
                ds.isDragging = true;
            }

            const rect = container.getBoundingClientRect();
            const currentOffsetX = e.clientX - rect.left + container.scrollLeft;
            updateGhost(ds.anchorSec, pxToSec(currentOffsetX));
        };

        const onPointerUp = (e: PointerEvent) => {
            const ds = createDragState.current;
            if (!ds || e.pointerId !== ds.pointerId) return;

            if (ds.isDragging) {
                const rect = container.getBoundingClientRect();
                const currentOffsetX = e.clientX - rect.left + container.scrollLeft;
                const clamped = clampToFreeSpace(ds.anchorSec, pxToSec(currentOffsetX));
                if (clamped) {
                    const [newStart, newEnd] = clamped;
                    setTimings((prev) => {
                        const next = [...prev, { start: newStart, end: newEnd }];
                        next.sort((a, b) => a.start - b.start);
                        return next;
                    });
                }
            }

            removeGhost();
            container.style.cursor = 'default';
            createDragState.current = null;
        };

        const onPointerCancel = (e: PointerEvent) => {
            if (createDragState.current?.pointerId !== e.pointerId) return;
            removeGhost();
            container.style.cursor = 'default';
            createDragState.current = null;
        };

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerCancel);

        return () => {
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerCancel);
            removeGhost();
        };
    }, [isWsReady]);

    return (
        <Card className="p-6 gap-6 flex flex-row">
            {/* Controls */}
            {isWsReady && (
                <div className="flex flex-col shrink">
                    <div style={{ height: `${TIMELINE_HEIGHT}px`, flexShrink: 0 }} />
                    <div className="flex flex-col gap-2 justify-center grow">
                        <button
                            onClick={togglePlayPause}
                            className="w-12 h-12 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center transition-colors"
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {!isPlaying ? <PlayArrowIcon /> : <PauseIcon />}
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div
                className="flex flex-col grow"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
                    if (e.code === 'Escape') setSelectedIndex(null);
                }}
                style={{ backgroundColor: '#F4F4F4', overflow: 'hidden' }}
            >
                <div
                    className="relative"
                    style={{ height: `${WAVEFORM_HEIGHT + TIMELINE_HEIGHT}px` }}
                >
                    {/* Timeline */}
                    <div
                        ref={timelineScrollContainerRef}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: `${TIMELINE_HEIGHT}px`,
                            top: 0,
                            overflow: 'hidden',
                            touchAction: 'none',
                        }}
                        onPointerDown={(e) => {
                            const container = timelineScrollContainerRef.current!;
                            const rect = container.getBoundingClientRect();
                            const clickX = e.clientX - rect.left + container.scrollLeft;
                            wsRef.current?.setTime(wsRef.current.getDuration() * (clickX / waveformWidth));
                        }}
                    >
                        <div
                            ref={timelineContainerRef}
                            style={{
                                width: waveformWidth || '100%',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                borderTop: '1px solid #e5e7eb',
                                backgroundColor: '#fafafa',
                                pointerEvents: 'all',
                                flexShrink: 0,
                            }}
                            onPointerDown={handleTimelineClick}
                        />
                    </div>

                    {/* Wavesurfer */}
                    <div
                        ref={wsContainerRef}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: `${WAVEFORM_HEIGHT}px`,
                            top: `${TIMELINE_HEIGHT}px`,
                            overflow: 'hidden',
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                    />

                    {/* Regions scroll container — crosshair on empty space hints at draw mode */}
                    <div
                        ref={regionsScrollContainerRef}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: `${WAVEFORM_HEIGHT}px`,
                            top: `${TIMELINE_HEIGHT}px`,
                            overflow: 'auto',
                            touchAction: 'pan-x',
                            zIndex: 2,
                            cursor: 'default',
                        }}
                        onPointerDown={(e) => {
                            const target = e.target as HTMLElement;
                            const isRegionClick = !!target.closest('[data-region]');
                            if (!isRegionClick) {
                                setSelectedIndex(null);
                                // Seek playhead on bare background clicks
                                const container = regionsScrollContainerRef.current!;
                                const rect = container.getBoundingClientRect();
                                const clickX = e.clientX - rect.left + container.scrollLeft;
                                wsRef.current?.setTime(
                                    wsRef.current.getDuration() * (clickX / waveformWidth)
                                );
                            }
                        }}
                    >
                        <div
                            ref={regionsContainerRef}
                            style={{
                                width: waveformWidth || '100%',
                                height: `${WAVEFORM_HEIGHT}px`,
                            }}
                        >
                            {isWsReady && timings.map((timing, index) => (
                                <SyncMapTimingEditorRegion
                                    key={index}
                                    index={index}
                                    start={timing.start}
                                    end={timing.end}
                                    text={words[index] ?? ''}
                                    duration={wsRef.current?.getDuration()!}
                                    waveformWidth={waveformWidth}
                                    selected={selectedIndex === index}
                                    onSelect={setSelectedIndex}
                                    onTimingChange={handleTimingChange}
                                    prevEnd={index > 0 ? timings[index - 1].end : 0}
                                    nextStart={index < timings.length - 1 ? timings[index + 1].start : wsRef.current?.getDuration()!}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default SyncMapTimingEditor;