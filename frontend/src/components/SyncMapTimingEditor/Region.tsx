import { useRef, useState } from "react";

export type DragMode = "move" | "resize-left" | "resize-right";

interface SyncMapTimingEditorRegionProps {
    index: number;
    start: number;
    end: number;
    text: string;
    duration: number;
    waveformWidth: number;
    selected: boolean;
    onSelect: (index: number) => void;
    onDragStart: (index: number, mode: DragMode, clientX: number, pointerId: number) => void;
    // Imperative handle so parent can mutate DOM directly during drag
    regionRef: React.RefObject<HTMLDivElement | null>;
}

const SNAKE_HEIGHTS = [5, 20, 35, 50, 65, 80];

export default function SyncMapTimingEditorRegion({
    index,
    start,
    end,
    text,
    duration,
    waveformWidth,
    selected,
    onSelect,
    onDragStart,
    regionRef,
}: SyncMapTimingEditorRegionProps) {
    const [hovered, setHovered] = useState(false);

    const startPosition = (start / duration) * waveformWidth;
    const endPosition = (end / duration) * waveformWidth;

    const cycle = (SNAKE_HEIGHTS.length - 1) * 2;
    const pos = index % cycle;
    const heightIndex = pos < SNAKE_HEIGHTS.length ? pos : cycle - pos;
    const topPercent = SNAKE_HEIGHTS[heightIndex];

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
        e.stopPropagation();
        if (!selected) onSelect(index);
        onDragStart(index, mode, e.clientX, e.pointerId);
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
            data-region
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