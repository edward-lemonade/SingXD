import WaveSurfer from "wavesurfer.js";
import { SyncPoint } from "../lib/types/types"
import { useEffect, useRef, useState } from "react";

interface SyncMapAlignmentEditorRegionProps {
    syncPoint: SyncPoint;
    index: number;
    wavesurferRef: React.RefObject<WaveSurfer | null>;
    
    // Selection state
    isSelected: boolean;
    
    // Callbacks for user interactions
    onSelect: (index: number, addToSelection: boolean) => void;
    onDragStart: (index: number) => void;
    onDrag: (index: number, newTime: number) => void;
    onDragEnd: (index: number, newTime: number) => void;
    
    // Optional: if you want multi-select drag
    isDragging?: boolean;
}

export default function SyncMapAlignmentEditorRegion({
    syncPoint,
    index,
    wavesurferRef,
    isSelected,
    onSelect,
    onDragStart,
    onDrag,
    onDragEnd,
    isDragging = false
}: SyncMapAlignmentEditorRegionProps) {
    const regionRef = useRef<HTMLDivElement>(null);
    const dragStartX = useRef<number>(0);
    const dragStartTime = useRef<number>(0);

    const [startPosition, setStartPosition] = useState<number>(0);
    const [endPosition, setEndPosition] = useState<number>(0);

    useEffect(() => {
        const ws = wavesurferRef.current!;        
        const duration = ws.getDuration();

        const containerWidth = ws.getWrapper().scrollWidth;

        setStartPosition((syncPoint.start / duration) * containerWidth);
        setEndPosition((syncPoint.end / duration) * containerWidth);
    }, [syncPoint.start, syncPoint.end]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check for modifier keys (Ctrl/Cmd for multi-select)
        const addToSelection = e.ctrlKey || e.metaKey;
        
        onSelect(index, addToSelection);
        onDragStart(index);
        
        dragStartX.current = e.clientX;
        dragStartTime.current = syncPoint.start;
        
        // Attach global mouse move and mouse up listeners
        const handleMouseMove = (e: MouseEvent) => {
            if (!wavesurferRef.current) return;
            
            const ws = wavesurferRef.current;
            const duration = ws.getDuration();
            const containerWidth = ws.getWrapper().scrollWidth;
            
            // Calculate delta in pixels
            const deltaX = e.clientX - dragStartX.current;
            
            // Convert to time delta
            const deltaTime = (deltaX / containerWidth) * duration;
            let newTime = dragStartTime.current + deltaTime;
            
            // Clamp to valid range
            newTime = Math.max(0, Math.min(duration, newTime));
            
            onDrag(index, newTime);
        };
        
        const handleMouseUp = (e: MouseEvent) => {
            if (!wavesurferRef.current) return;
            
            const ws = wavesurferRef.current;
            const duration = ws.getDuration();
            const containerWidth = ws.getWrapper().scrollWidth;
            
            const deltaX = e.clientX - dragStartX.current;
            const deltaTime = (deltaX / containerWidth) * duration;
            let newTime = dragStartTime.current + deltaTime;
            newTime = Math.max(0, Math.min(duration, newTime));
            
            onDragEnd(index, newTime);
            
            // Clean up listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={regionRef}
            onMouseDown={handleMouseDown}
            className={`absolute top-0 bottom-0 w-1 cursor-ew-resize opacity-30 transition-colors ${
                isSelected 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-gray-400 hover:bg-gray-500'
            } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
                left: `${startPosition}px`,
                width: `${endPosition - startPosition}px`,
                zIndex: isSelected ? 10 : 5,
            }}
            title={`${syncPoint.start.toFixed(2)}s - ${syncPoint.text || ''}`}
        >
        </div>
    );
}