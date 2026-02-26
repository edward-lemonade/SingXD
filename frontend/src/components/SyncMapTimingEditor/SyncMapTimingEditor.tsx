import { SetStateAction, useEffect, useRef } from "react";
import Card from "../Card";
import { Timing } from "../../lib/types/types";
import SyncMapTimingEditorRegion, { DragMode } from "./Region";
import { useWaveSurfer } from "./hooks/useWavesurfer";
import { useRegionUpdate } from "./hooks/useRegionUpdate";
import { useRegionDraw } from "./hooks/useRegionDraw";

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

const WAVEFORM_HEIGHT = 100;
const TIMELINE_HEIGHT = 25;

function SyncMapTimingEditor({
    audioUrl,
    timings,
    setTimings,
    words,
    selectedIndex,
    setSelectedIndex,
}: SyncMapTimingEditorProps) {

    // DOM refs
    const wsContainerRef = useRef<HTMLDivElement | null>(null);
    const regionsScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const regionsContainerRef = useRef<HTMLDivElement | null>(null);
    const timelineScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const timelineContainerRef = useRef<HTMLDivElement | null>(null);

    // Region refs
    const regionRefs = useRef<React.RefObject<HTMLDivElement | null>[]>([]);
    const getRegionRef = (index: number): React.RefObject<HTMLDivElement | null> => {
        if (!regionRefs.current[index]) {
            regionRefs.current[index] = { current: null };
        }
        return regionRefs.current[index];
    };

    // Stable timing ref for hooks
    const timingsRef = useRef(timings);
    useEffect(() => { timingsRef.current = timings; }, [timings]);

    const handleTimingChange = (index: number, newStart: number, newEnd: number) => {
        setTimings((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], start: newStart, end: newEnd };
            return next;
        });
    };

    // =====================================================================================
    // Wavesurfer

    const { wsRef, isReady, isPlaying, waveformWidth, togglePlayPause, seekTo } = useWaveSurfer({
        audioUrl,
        wsContainerRef,
        timelineContainerRef,
        regionsScrollContainerRef,
        timelineScrollContainerRef,
    });

    const waveformWidthRef = useRef(waveformWidth);
    useEffect(() => { waveformWidthRef.current = waveformWidth; }, [waveformWidth]);

    const getDuration = () => wsRef.current?.getDuration() ?? 1;

    // =====================================================================================
    // Region move + resize

    const { handleDragStart, handlePointerMove, handlePointerUp, handlePointerCancel } = useRegionUpdate({
        timingsRef,
        waveformWidthRef,
        getDuration,
        regionRefs,
        regionsScrollContainerRef,
        onTimingChange: handleTimingChange,
    });

    useEffect(() => {
        if (!isReady) return;
        const el = regionsScrollContainerRef.current!;
        const onMove = (e: PointerEvent) => handlePointerMove(e);
        const onUp = (e: PointerEvent) => handlePointerUp(e);
        const onCancel = (e: PointerEvent) => handlePointerCancel(e);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onCancel);
        return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            el.removeEventListener("pointercancel", onCancel);
        };
    }, [isReady, handlePointerMove, handlePointerUp, handlePointerCancel]);

    // =====================================================================================
    // Region draw

    useRegionDraw({
        isReady,
        timingsRef,
        waveformWidthRef,
        getDuration,
        regionsScrollContainerRef,
        regionsContainerRef,
        onCreateRegion: (start, end) => {
            setTimings((prev) => {
                const next = [...prev, { start, end }];
                next.sort((a, b) => a.start - b.start);
                return next;
            });
        },
    });

    // =====================================================================================

    return (
        <Card className="p-6 gap-6 flex flex-row">
            {/* Controls */}
            {isReady && (
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
                    if (e.code === "Space") { e.preventDefault(); togglePlayPause(); }
                    if (e.code === "Escape") setSelectedIndex(null);
                }}
                style={{ backgroundColor: "#F4F4F4", overflow: "hidden" }}
            >
                <div
                    className="relative"
                    style={{ height: `${WAVEFORM_HEIGHT + TIMELINE_HEIGHT}px` }}
                >
                    {/* Timeline */}
                    <div
                        ref={timelineScrollContainerRef}
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: `${TIMELINE_HEIGHT}px`,
                            top: 0,
                            overflow: "hidden",
                            touchAction: "none",
                        }}
                        onPointerDown={(e) => {
                            const container = timelineScrollContainerRef.current!;
                            const rect = container.getBoundingClientRect();
                            const clickX = e.clientX - rect.left + container.scrollLeft;
                            seekTo(getDuration() * (clickX / waveformWidth));
                        }}
                    >
                        <div
                            ref={timelineContainerRef}
                            style={{
                                width: waveformWidth || "100%",
                                overflow: "hidden",
                                cursor: "pointer",
                                borderTop: "1px solid #e5e7eb",
                                backgroundColor: "#fafafa",
                                pointerEvents: "all",
                                flexShrink: 0,
                            }}
                        />
                    </div>

                    {/* WaveSurfer canvas */}
                    <div
                        ref={wsContainerRef}
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: `${WAVEFORM_HEIGHT}px`,
                            top: `${TIMELINE_HEIGHT}px`,
                            overflow: "hidden",
                            pointerEvents: "none",
                            zIndex: 1,
                        }}
                    />

                    {/* Regions scroll container */}
                    <div
                        ref={regionsScrollContainerRef}
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: `${WAVEFORM_HEIGHT}px`,
                            top: `${TIMELINE_HEIGHT}px`,
                            overflow: "auto",
                            touchAction: "pan-x",
                            zIndex: 2,
                            cursor: "default",
                        }}
                        onPointerDown={(e) => {
                            const isRegionClick = !!(e.target as HTMLElement).closest("[data-region]");
                            if (!isRegionClick) {
                                setSelectedIndex(null);
                                const container = regionsScrollContainerRef.current!;
                                const rect = container.getBoundingClientRect();
                                const clickX = e.clientX - rect.left + container.scrollLeft;
                                seekTo(getDuration() * (clickX / waveformWidth));
                            }
                        }}
                    >
                        <div
                            ref={regionsContainerRef}
                            style={{
                                width: waveformWidth || "100%",
                                height: `${WAVEFORM_HEIGHT}px`,
                            }}
                        >
                            {isReady && timings.map((timing, index) => (
                                <SyncMapTimingEditorRegion
                                    key={index}
                                    index={index}
                                    start={timing.start}
                                    end={timing.end}
                                    text={words[index] ?? ""}
                                    duration={getDuration()}
                                    waveformWidth={waveformWidth}
                                    selected={selectedIndex === index}
                                    onSelect={setSelectedIndex}
                                    onDragStart={(idx: number, mode: DragMode, clientX: number, pointerId: number) =>
                                        handleDragStart(idx, mode, clientX, pointerId)
                                    }
                                    regionRef={getRegionRef(index)}
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