import { useRef, useState } from "react";

interface SyncMapTimingEditorRegionProps {
    index: number;
    start: number;
    end: number;
    text: string;
    duration: number;
    waveformWidth: number;
    selected: boolean;
    onSelect: (index: number) => void;
    onTimingChange: (index: number, newStart: number, newEnd: number) => void;
    prevEnd: number;
    nextStart: number;
}

const SNAKE_HEIGHTS = [5, 20, 35, 50, 65, 80];

type DragMode = "move" | "resize-left" | "resize-right";

export default function SyncMapTimingEditorRegion({
    index,
    start,
    end,
    text,
    duration,
    waveformWidth,
    selected,
    onSelect,
    onTimingChange,
    prevEnd,
    nextStart,
}: SyncMapTimingEditorRegionProps) {
    const regionRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);

    const startPosition = (start / duration) * waveformWidth;
    const endPosition = (end / duration) * waveformWidth;

    const cycle = (SNAKE_HEIGHTS.length - 1) * 2;
    const pos = index % cycle;
    const heightIndex = pos < SNAKE_HEIGHTS.length ? pos : cycle - pos;
    const topPercent = SNAKE_HEIGHTS[heightIndex];

    // All drag state lives in refs — no setState during drag at all
    const dragState = useRef<{
        mode: DragMode;
        startX: number;
        origStart: number;
        origEnd: number;
        // Live computed values updated each pointermove
        liveStart: number;
        liveEnd: number;
    } | null>(null);

    const pxToSec = (px: number) => (px / waveformWidth) * duration;
    const secToPx = (sec: number) => (sec / duration) * waveformWidth;

    // Directly mutate the DOM element's style during drag to avoid any React re-render
    const applyDragStyle = (newStart: number, newEnd: number) => {
        const el = regionRef.current;
        if (!el) return;
        el.style.left = `${secToPx(newStart)}px`;
        el.style.width = `${secToPx(newEnd - newStart)}px`;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
        e.stopPropagation();
        if (!selected) {
            onSelect(index);
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        dragState.current = {
            mode,
            startX: e.clientX,
            origStart: start,
            origEnd: end,
            liveStart: start,
            liveEnd: end,
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const ds = dragState.current;
        if (!ds) return;

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

        applyDragStyle(newStart, newEnd);
    };

    const handlePointerUp = () => {
        const ds = dragState.current;
        if (!ds) return;
        dragState.current = null;

        if (ds.liveStart !== ds.origStart || ds.liveEnd !== ds.origEnd) {
            onTimingChange(index, ds.liveStart, ds.liveEnd);
        }
    };

    const EDGE_WIDTH = 8;

    const bgColor = selected
        ? "rgba(253, 224, 71, 0.45)"
        : hovered
        ? "rgba(250, 250, 250, 0.25)"
        : "rgba(150, 150, 150, 0.25)";
    const bgImage = selected
        ? "none"
        : "linear-gradient(to right, rgba(0,0,255,0.18) 0%, transparent 50%, rgba(0,255,255,0.18) 100%)";
    const outlineColor = selected ? "rgba(202, 138, 4, 0.8)" : "rgba(0, 0, 0, 0.5)";

    return (
        <div
            ref={regionRef}
            className="absolute top-0 bottom-0 transition-opacity duration-150"
            style={{
                left: `${startPosition}px`,
                width: `${endPosition - startPosition}px`,
                zIndex: selected ? 30 : hovered ? 20 : 5,
                opacity: hovered || selected ? 0.85 : 0.6,
                outline: `${selected ? 2 : 1}px solid ${outlineColor}`,
                backgroundColor: bgColor,
                backgroundImage: bgImage,
                cursor: selected ? "grab" : "default",
                userSelect: "none",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerDown={(e) => handlePointerDown(e, "move")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Left resize handle */}
            <div
                className="absolute top-0 bottom-0"
                style={{ left: 0, width: EDGE_WIDTH, cursor: selected ? "ew-resize" : "default", zIndex: 2 }}
                onPointerDown={(e) => handlePointerDown(e, "resize-left")}
            />

            {/* Right resize handle */}
            <div
                className="absolute top-0 bottom-0"
                style={{ right: 0, width: EDGE_WIDTH, cursor: selected ? "ew-resize" : "default", zIndex: 2 }}
                onPointerDown={(e) => handlePointerDown(e, "resize-right")}
            />

            <span
                className="absolute text-xs whitespace-nowrap pointer-events-none"
                style={{
                    top: `${topPercent}%`,
                    left: 4,
                    fontWeight: selected ? 600 : 400,
                    color: selected ? "#713f12" : "inherit",
                }}
            >
                {text}
            </span>
        </div>
    );
}