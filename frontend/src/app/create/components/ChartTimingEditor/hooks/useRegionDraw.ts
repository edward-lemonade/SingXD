import { useEffect, useRef } from "react";
import { Timing } from "../../../lib/types/types";

const MIN_DRAG_PX = 5;

interface UseRegionDrawOptions {
    isReady: boolean;
    timingsRef: React.RefObject<Timing[]>;
    waveformWidthRef: React.RefObject<number>;
    getDuration: () => number;
    regionsScrollContainerRef: React.RefObject<HTMLDivElement | null>;
    regionsContainerRef: React.RefObject<HTMLDivElement | null>;
    onCreateRegion: (start: number, end: number) => void;
}

export function useRegionDraw({
    isReady,
    timingsRef,
    waveformWidthRef,
    getDuration,
    regionsScrollContainerRef,
    regionsContainerRef,
    onCreateRegion,
}: UseRegionDrawOptions): void {
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const dragState = useRef<{
        anchorX: number;
        anchorSec: number;
        isDragging: boolean;
        pointerId: number;
    } | null>(null);

    const pxToSec = (px: number) =>
        (px / (waveformWidthRef.current || 1)) * getDuration();

    const secToPx = (sec: number) =>
        (sec / getDuration()) * (waveformWidthRef.current || 1);

    const clampToFreeSpace = (rawStart: number, rawEnd: number): [number, number] | null => {
        const duration = getDuration();
        const sorted = [...timingsRef.current].sort((a, b) => a.start - b.start);

        let s = Math.max(0, Math.min(rawStart, rawEnd));
        let e = Math.min(duration, Math.max(rawStart, rawEnd));

        for (const t of sorted) {
            if (t.end > s && t.start < e) {
                if (rawEnd >= rawStart) {
                    e = Math.min(e, t.start);
                } else {
                    s = Math.max(s, t.end);
                }
            }
        }

        if (e - s < 0.01) return null;
        return [s, e];
    };

    const ensureGhost = (): HTMLDivElement => {
        if (ghostRef.current) return ghostRef.current;
        const el = document.createElement("div");
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
            ghost.style.display = "none";
            return;
        }
        const [s, e] = clamped;
        ghost.style.display = "block";
        ghost.style.left = `${secToPx(s)}px`;
        ghost.style.width = `${secToPx(e - s)}px`;
    };

    useEffect(() => {
        if (!isReady) return;
        const container = regionsScrollContainerRef.current!;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            // Ignore clicks that land on an existing region — those are handled by useRegionDrag
            if ((e.target as HTMLElement).closest("[data-region]")) return;

            const rect = container.getBoundingClientRect();
            const offsetX = e.clientX - rect.left + container.scrollLeft;
            dragState.current = {
                anchorX: e.clientX,
                anchorSec: pxToSec(offsetX),
                isDragging: false,
                pointerId: e.pointerId,
            };
        };

        const onPointerMove = (e: PointerEvent) => {
            const ds = dragState.current;
            if (!ds || e.pointerId !== ds.pointerId) return;

            if (!ds.isDragging) {
                if (Math.abs(e.clientX - ds.anchorX) < MIN_DRAG_PX) return;
                container.setPointerCapture(e.pointerId);
                container.style.cursor = "crosshair";
                ds.isDragging = true;
            }

            const rect = container.getBoundingClientRect();
            const currentOffsetX = e.clientX - rect.left + container.scrollLeft;
            updateGhost(ds.anchorSec, pxToSec(currentOffsetX));
        };

        const onPointerUp = (e: PointerEvent) => {
            const ds = dragState.current;
            if (!ds || e.pointerId !== ds.pointerId) return;

            if (ds.isDragging) {
                const rect = container.getBoundingClientRect();
                const currentOffsetX = e.clientX - rect.left + container.scrollLeft;
                const clamped = clampToFreeSpace(ds.anchorSec, pxToSec(currentOffsetX));
                if (clamped) {
                    onCreateRegion(clamped[0], clamped[1]);
                }
            }

            removeGhost();
            container.style.cursor = "default";
            dragState.current = null;
        };

        const onPointerCancel = (e: PointerEvent) => {
            if (dragState.current?.pointerId !== e.pointerId) return;
            removeGhost();
            container.style.cursor = "default";
            dragState.current = null;
        };

        container.addEventListener("pointerdown", onPointerDown);
        container.addEventListener("pointermove", onPointerMove);
        container.addEventListener("pointerup", onPointerUp);
        container.addEventListener("pointercancel", onPointerCancel);

        return () => {
            container.removeEventListener("pointerdown", onPointerDown);
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerup", onPointerUp);
            container.removeEventListener("pointercancel", onPointerCancel);
            removeGhost();
        };
    }, [isReady]);
}