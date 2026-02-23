import WaveSurfer from "wavesurfer.js";
import { Timing } from "../lib/types/types"
import { useEffect, useRef, useState } from "react";

interface SyncMapAlignmentEditorRegionProps {
    index: number;
    start: number;
    end: number;
    text: string;
    duration: number;
    waveformWidth: number;
}

// 6 heights that snake up and down (as % from top of the region container)
const SNAKE_HEIGHTS = [5, 20, 35, 50, 65, 80];

export default function SyncMapAlignmentEditorRegion({
    index,
    start,
    end,
    text,
    duration,
    waveformWidth,
}: SyncMapAlignmentEditorRegionProps) {
    const regionRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);

    const startPosition = (start / duration) * waveformWidth;
    const endPosition = (end / duration) * waveformWidth;

    const cycle = (SNAKE_HEIGHTS.length - 1) * 2;
    const pos = index % cycle;
    const heightIndex = pos < SNAKE_HEIGHTS.length ? pos : cycle - pos;
    const topPercent = SNAKE_HEIGHTS[heightIndex];

    return (
        <div
            ref={regionRef}
            className="absolute top-0 bottom-0 cursor-ew-resize transition-opacity duration-150"
            style={{
                left: `${startPosition}px`,
                width: `${endPosition - startPosition}px`,
                zIndex: hovered ? 20 : 5,
                opacity: hovered ? 0.7 : 0.5,
                outline: "1px solid rgba(0, 0, 0, 0.5)",
                background: hovered
                    ? `linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.18) 100%),
                       rgba(234, 179, 8, 0.45)`
                    : `linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.18) 100%),
                       rgba(156, 163, 175, 0.25)`,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span
                className="absolute text-xs whitespace-nowrap pointer-events-none"
                style={{ top: `${topPercent}%`, left: 4 }}
            >
                {text}
            </span>
        </div>
    );
}