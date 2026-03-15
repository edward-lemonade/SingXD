import { useRef } from "react";
import { Timing } from "../../../lib/types/types";
import { DragMode } from "../Region";

interface UseRegionUpdateOptions {
    timingsRef: React.RefObject<Timing[]>;
    waveformWidthRef: React.RefObject<number>;
    getDuration: () => number;
    regionRefs: React.RefObject<React.RefObject<HTMLDivElement | null>[]>;
    regionsScrollContainerRef: React.RefObject<HTMLDivElement | null>;
    onTimingChange: (index: number, newStart: number, newEnd: number) => void;
}

interface UseRegionUpdateReturn {
    handleDragStart: (index: number, mode: DragMode, clientX: number, pointerId: number) => void;
    handlePointerMove: (e: PointerEvent) => boolean;
    handlePointerUp: (e: PointerEvent) => boolean;
    handlePointerCancel: (e: PointerEvent) => boolean;
}

export function useRegionUpdate({
    timingsRef,
    waveformWidthRef,
    getDuration,
    regionRefs,
    regionsScrollContainerRef,
    onTimingChange,
}: UseRegionUpdateOptions): UseRegionUpdateReturn {
    const dragState = useRef<{
        index: number;
        mode: DragMode;
        pointerId: number;
        startX: number;
        origStart: number;
        origEnd: number;
        liveStart: number;
        liveEnd: number;
    } | null>(null);

    const pxToSec = (px: number) =>
        (px / (waveformWidthRef.current || 1)) * getDuration();

    const secToPx = (sec: number) =>
        (sec / getDuration()) * (waveformWidthRef.current || 1);

    const applyStyle = (index: number, newStart: number, newEnd: number) => {
        const el = regionRefs.current[index]?.current;
        if (!el) return;
        el.style.left = `${secToPx(newStart)}px`;
        el.style.width = `${secToPx(newEnd - newStart)}px`;
    };

    const handleDragStart = (
        index: number,
        mode: DragMode,
        clientX: number,
        pointerId: number
    ) => {
        const t = timingsRef.current[index];
        // Capture on the stable scroll container — pointer events keep flowing
        // even when the cursor moves far outside the region element.
        regionsScrollContainerRef.current?.setPointerCapture(pointerId);
        dragState.current = {
            index,
            mode,
            pointerId,
            startX: clientX,
            origStart: t.start,
            origEnd: t.end,
            liveStart: t.start,
            liveEnd: t.end,
        };
    };

    const handlePointerMove = (e: PointerEvent): boolean => {
        const ds = dragState.current;
        if (!ds || e.pointerId !== ds.pointerId) return false;

        const duration = getDuration();
        const ts = timingsRef.current;
        const prevEnd = ds.index > 0 ? ts[ds.index - 1].end : 0;
        const nextStart = ds.index < ts.length - 1 ? ts[ds.index + 1].start : duration;
        const deltaSec = pxToSec(e.clientX - ds.startX);
        const regionDuration = ds.origEnd - ds.origStart;

        let newStart = ds.origStart;
        let newEnd = ds.origEnd;

        if (ds.mode === "move") {
            newStart = ds.origStart + deltaSec;
            newEnd = ds.origEnd + deltaSec;
            if (newStart < prevEnd) { newStart = prevEnd; newEnd = newStart + regionDuration; }
            if (newEnd > nextStart) { newEnd = nextStart; newStart = newEnd - regionDuration; }
            newStart = Math.max(0, newStart);
            newEnd = Math.min(duration, newEnd);
        } else if (ds.mode === "resize-left") {
            newStart = Math.max(prevEnd, Math.min(ds.origEnd - 0.01, ds.origStart + deltaSec));
        } else if (ds.mode === "resize-right") {
            newEnd = Math.min(nextStart, Math.max(ds.origStart + 0.01, ds.origEnd + deltaSec));
        }

        ds.liveStart = newStart;
        ds.liveEnd = newEnd;
        applyStyle(ds.index, newStart, newEnd);
        return true;
    };

    const handlePointerUp = (e: PointerEvent): boolean => {
        const ds = dragState.current;
        if (!ds || e.pointerId !== ds.pointerId) return false;

        dragState.current = null;
        if (ds.liveStart !== ds.origStart || ds.liveEnd !== ds.origEnd) {
            onTimingChange(ds.index, ds.liveStart, ds.liveEnd);
        }
        return true;
    };

    const handlePointerCancel = (e: PointerEvent): boolean => {
        const ds = dragState.current;
        if (!ds || e.pointerId !== ds.pointerId) return false;

        applyStyle(ds.index, ds.origStart, ds.origEnd);
        dragState.current = null;
        return true;
    };

    return { handleDragStart, handlePointerMove, handlePointerUp, handlePointerCancel };
}