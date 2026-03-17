import { useRef } from 'react';
import { Timing } from '@/src/lib/types/models';
import { DragMode } from '../Region';

const TOUCH_THRESHOLD = 0.02; // seconds — "close enough" to be considered touching
const MIN_REGION_DURATION = 0.01;

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
        // Whether the dragged edge was touching the neighbor at drag start
        pushingNext: boolean; // resize-right edge was touching next region's start
        pushingPrev: boolean; // resize-left edge was touching prev region's end
    } | null>(null);

    // Snapshot of all timings at drag start, so we can push neighbors relative to a stable baseline
    const dragBaseTimings = useRef<Timing[]>([]);

    const pxToSec = (px: number) => (px / (waveformWidthRef.current || 1)) * getDuration();
    const secToPx = (sec: number) => (sec / getDuration()) * (waveformWidthRef.current || 1);

    const applyStyle = (index: number, newStart: number, newEnd: number) => {
        const el = regionRefs.current[index]?.current;
        if (!el) return;
        el.style.left = `${secToPx(newStart)}px`;
        el.style.width = `${secToPx(newEnd - newStart)}px`;
    };

    const handleDragStart = (index: number, mode: DragMode, clientX: number, pointerId: number) => {
        const ts = timingsRef.current;
        const t = ts[index];
        regionsScrollContainerRef.current?.setPointerCapture(pointerId);

        const nextTiming = ts[index + 1] ?? null;
        const prevTiming = ts[index - 1] ?? null;

        const pushingNext =
            mode === 'resize-right' &&
            nextTiming !== null &&
            Math.abs(t.end - nextTiming.start) <= TOUCH_THRESHOLD;

        const pushingPrev =
            mode === 'resize-left' &&
            prevTiming !== null &&
            Math.abs(t.start - prevTiming.end) <= TOUCH_THRESHOLD;

        dragBaseTimings.current = ts.map(t => ({ ...t }));

        dragState.current = {
            index,
            mode,
            pointerId,
            startX: clientX,
            origStart: t.start,
            origEnd: t.end,
            liveStart: t.start,
            liveEnd: t.end,
            pushingNext,
            pushingPrev,
        };
    };

    const pushRight = (
        fromIndex: number,
        desiredStart: number,
        base: Timing[]
    ): Map<number, { start: number; end: number }> => {
        const result = new Map<number, { start: number; end: number }>();
        let cursor = desiredStart;
        for (let i = fromIndex; i < base.length; i++) {
            const orig = base[i];
            if (cursor <= orig.start) break; // not overlapping, stop
            // Only move the start edge — end stays fixed
            const minStart = orig.end - MIN_REGION_DURATION;
            const newStart = Math.min(cursor, minStart); // can't compress past min size
            result.set(i, { start: newStart, end: orig.end });
            // Cascade only if compressed to min AND right edge was touching next region
            const isAtMin = newStart >= minStart;
            const nextOrig = base[i + 1];
            const touchingNext =
                nextOrig && Math.abs(orig.end - nextOrig.start) <= TOUCH_THRESHOLD;
            if (isAtMin && touchingNext) {
                cursor = orig.end; // drive next region's start from this one's fixed end
            } else {
                break;
            }
        }
        return result;
    };

    const pushLeft = (
        fromIndex: number,
        desiredEnd: number,
        base: Timing[]
    ): Map<number, { start: number; end: number }> => {
        const result = new Map<number, { start: number; end: number }>();
        let cursor = desiredEnd;
        for (let i = fromIndex; i >= 0; i--) {
            const orig = base[i];
            if (cursor >= orig.end) break;
            // Only move the end edge — start stays fixed
            const maxEnd = orig.start + MIN_REGION_DURATION;
            const newEnd = Math.max(cursor, maxEnd); // can't compress past min size
            result.set(i, { start: orig.start, end: newEnd });
            // Cascade only if compressed to min AND left edge was touching prev region
            const isAtMin = newEnd <= maxEnd;
            const prevOrig = base[i - 1];
            const touchingPrev =
                prevOrig && Math.abs(orig.start - prevOrig.end) <= TOUCH_THRESHOLD;
            if (isAtMin && touchingPrev) {
                cursor = orig.start;
            } else {
                break;
            }
        }
        return result;
    };

    const handlePointerMove = (e: PointerEvent): boolean => {
        const ds = dragState.current;
        if (!ds || e.pointerId !== ds.pointerId) return false;

        const duration = getDuration();
        const base = dragBaseTimings.current;
        const deltaSec = pxToSec(e.clientX - ds.startX);
        const regionDuration = ds.origEnd - ds.origStart;

        let newStart = ds.origStart;
        let newEnd = ds.origEnd;

        if (ds.mode === 'move') {
            const ts = timingsRef.current;
            const prevEnd = ds.index > 0 ? ts[ds.index - 1].end : 0;
            const nextStart = ds.index < ts.length - 1 ? ts[ds.index + 1].start : duration;
            newStart = ds.origStart + deltaSec;
            newEnd = ds.origEnd + deltaSec;
            if (newStart < prevEnd) { newStart = prevEnd; newEnd = newStart + regionDuration; }
            if (newEnd > nextStart) { newEnd = nextStart; newStart = newEnd - regionDuration; }
            newStart = Math.max(0, newStart);
            newEnd = Math.min(duration, newEnd);

            ds.liveStart = newStart;
            ds.liveEnd = newEnd;
            applyStyle(ds.index, newStart, newEnd);

        } else if (ds.mode === 'resize-right') {
            newEnd = ds.origEnd + deltaSec;
            newEnd = Math.max(ds.origStart + MIN_REGION_DURATION, newEnd);

            if (ds.pushingNext) {
                // Can push the neighbor's start, but can never exceed the neighbor's end
                const neighborEnd = base[ds.index + 1].end;
                newEnd = Math.min(neighborEnd - MIN_REGION_DURATION, newEnd);
                newEnd = Math.min(duration, newEnd);
            } else {
                // Hard stop at neighbor's start (using baseline, not live)
                const hardStop = base[ds.index + 1]?.start ?? duration;
                newEnd = Math.min(hardStop, newEnd);
                newEnd = Math.min(duration, newEnd);
            }

            ds.liveEnd = newEnd;
            applyStyle(ds.index, ds.liveStart, newEnd);

            if (ds.pushingNext) {
                const pushed = pushRight(ds.index + 1, newEnd, base);
                pushed.forEach(({ start, end }, i) => applyStyle(i, start, end));
            }

        } else if (ds.mode === 'resize-left') {
            newStart = ds.origStart + deltaSec;
            newStart = Math.min(ds.origEnd - MIN_REGION_DURATION, newStart);

            if (ds.pushingPrev) {
                // Can push the neighbor's end, but can never go before the neighbor's start
                const neighborStart = base[ds.index - 1].start;
                newStart = Math.max(neighborStart + MIN_REGION_DURATION, newStart);
                newStart = Math.max(0, newStart);
            } else {
                // Hard stop at neighbor's end (using baseline, not live)
                const hardStop = base[ds.index - 1]?.end ?? 0;
                newStart = Math.max(hardStop, newStart);
                newStart = Math.max(0, newStart);
            }

            ds.liveStart = newStart;
            applyStyle(ds.index, newStart, ds.liveEnd);

            if (ds.pushingPrev) {
                const pushed = pushLeft(ds.index - 1, newStart, base);
                pushed.forEach(({ start, end }, i) => applyStyle(i, start, end));
            }
        }

        return true;
    };

    const handlePointerUp = (e: PointerEvent): boolean => {
        const ds = dragState.current;
        if (!ds || e.pointerId !== ds.pointerId) return false;

        const base = dragBaseTimings.current;

        if (ds.mode === 'resize-right' && ds.pushingNext) {
            const pushed = pushRight(ds.index + 1, ds.liveEnd, base);
            pushed.forEach(({ start, end }, i) => onTimingChange(i, start, end));
        }
        if (ds.mode === 'resize-left' && ds.pushingPrev) {
            const pushed = pushLeft(ds.index - 1, ds.liveStart, base);
            pushed.forEach(({ start, end }, i) => onTimingChange(i, start, end));
        }

        dragState.current = null;
        if (ds.liveStart !== ds.origStart || ds.liveEnd !== ds.origEnd) {
            onTimingChange(ds.index, ds.liveStart, ds.liveEnd);
        }
        return true;
    };

    const handlePointerCancel = (e: PointerEvent): boolean => {
        const ds = dragState.current;
        if (!ds || e.pointerId !== ds.pointerId) return false;

        const base = dragBaseTimings.current;

        // Restore dragged region
        applyStyle(ds.index, ds.origStart, ds.origEnd);

        // Restore any pushed neighbors
        if (ds.mode === 'resize-right' && ds.pushingNext) {
            for (let i = ds.index + 1; i < base.length; i++) {
                applyStyle(i, base[i].start, base[i].end);
            }
        }
        if (ds.mode === 'resize-left' && ds.pushingPrev) {
            for (let i = ds.index - 1; i >= 0; i--) {
                applyStyle(i, base[i].start, base[i].end);
            }
        }

        dragState.current = null;
        return true;
    };

    return { handleDragStart, handlePointerMove, handlePointerUp, handlePointerCancel };
}