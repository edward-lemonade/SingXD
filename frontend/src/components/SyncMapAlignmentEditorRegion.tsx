import { useEffect, useRef, useState } from "react";
import { Timing } from "../lib/types/types";

interface SyncMapAlignmentEditorRegionProps {
    index: number;
    start: number;
    end: number;
    text: string;
    duration: number;
    waveformWidth: number;
    isSelected: boolean;
    onSelect: (index: number) => void;
    onTimingChange: (index: number, newStart: number, newEnd: number) => void;
    /** Neighbouring timing bounds to prevent overlap */
    prevEnd: number;   // 0 if no previous region
    nextStart: number; // duration if no next region
}

// 6 heights that snake up and down (as % from top of the region container)
const SNAKE_HEIGHTS = [5, 20, 35, 50, 65, 80];

type DragMode = "move" | "resize-left" | "resize-right";

export default function SyncMapAlignmentEditorRegion({
    index,
    start,
    end,
    text,
    duration,
    waveformWidth,
    isSelected,
    onSelect,
    onTimingChange,
    prevEnd,
    nextStart,
}: SyncMapAlignmentEditorRegionProps) {
    const regionRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);

    const startPosition = (start / duration) * waveformWidth;
    const endPosition = (end / duration) * waveformWidth;

    const cycle = (SNAKE_HEIGHTS.length - 1) * 2;
    const pos = index % cycle;
    const heightIndex = pos < SNAKE_HEIGHTS.length ? pos : cycle - pos;
    const topPercent = SNAKE_HEIGHTS[heightIndex];

    // Drag state stored in refs to avoid re-renders during drag
    const dragState = useRef<{
        mode: DragMode;
        startX: number;
        origStart: number;
        origEnd: number;
    } | null>(null);

    const pxToSec = (px: number) => (px / waveformWidth) * duration;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
        e.stopPropagation(); // prevent wavesurfer seek
        if (!isSelected) {
            onSelect(index);
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        dragState.current = {
            mode,
            startX: e.clientX,
            origStart: start,
            origEnd: end,
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
            // clamp to neighbour bounds
            if (newStart < prevEnd) {
                newStart = prevEnd;
                newEnd = newStart + regionDuration;
            }
            if (newEnd > nextStart) {
                newEnd = nextStart;
                newStart = newEnd - regionDuration;
            }
            // clamp to [0, duration]
            newStart = Math.max(0, newStart);
            newEnd = Math.min(duration, newEnd);
        } else if (ds.mode === "resize-left") {
            newStart = Math.max(prevEnd, Math.min(ds.origEnd - 0.01, ds.origStart + deltaSec));
        } else if (ds.mode === "resize-right") {
            newEnd = Math.min(nextStart, Math.max(ds.origStart + 0.01, ds.origEnd + deltaSec));
        }

        onTimingChange(index, newStart, newEnd);
    };

    const handlePointerUp = () => {
        dragState.current = null;
    };

    const EDGE_WIDTH = 8; // px, hit area for resize handles

    const bgColor = isSelected
        ? "rgba(253, 224, 71, 0.45)"  // yellow-300 @ 45%
        : hovered
        ? "rgba(250, 250, 250, 0.25)"
        : "rgba(150, 150, 150, 0.25)";

    const outlineColor = isSelected
        ? "rgba(202, 138, 4, 0.8)"  // yellow-600
        : "rgba(0, 0, 0, 0.5)";

    return (
        <div
            ref={regionRef}
            className="absolute top-0 bottom-0 transition-opacity duration-150"
            style={{
                left: `${startPosition}px`,
                width: `${endPosition - startPosition}px`,
                zIndex: isSelected ? 30 : hovered ? 20 : 5,
                opacity: hovered || isSelected ? 0.85 : 0.6,
                outline: `${isSelected ? 2 : 1}px solid ${outlineColor}`,
                background: `linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.18) 100%), ${bgColor}`,
                cursor: isSelected ? "grab" : "default",
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
                style={{
                    left: 0,
                    width: EDGE_WIDTH,
                    cursor: isSelected ? "ew-resize" : "default",
                    zIndex: 2,
                }}
                onPointerDown={(e) => handlePointerDown(e, "resize-left")}
            />

            {/* Right resize handle */}
            <div
                className="absolute top-0 bottom-0"
                style={{
                    right: 0,
                    width: EDGE_WIDTH,
                    cursor: isSelected ? "ew-resize" : "default",
                    zIndex: 2,
                }}
                onPointerDown={(e) => handlePointerDown(e, "resize-right")}
            />

            <span
                className="absolute text-xs whitespace-nowrap pointer-events-none"
                style={{
                    top: `${topPercent}%`,
                    left: 4,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "#713f12" : "inherit", // yellow-900
                }}
            >
                {text}
            </span>
        </div>
    );
}