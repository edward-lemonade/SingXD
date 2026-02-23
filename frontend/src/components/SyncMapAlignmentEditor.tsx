import { SetStateAction, useEffect, useRef, useState } from "react";
import Box from "./Box";
import WaveSurfer from "wavesurfer.js";
import { SyncMapMetadata, Timing } from "../lib/types/types";
import SyncMapAlignmentEditorRegion from "./SyncMapAlignmentEditorRegion";

interface SyncMapAlignmentEditorProps {
    audioUrl: string | null;
    timings: Timing[];
    setTimings: (syncPoints: SetStateAction<Timing[]>) => void;
}

export default function SyncMapAlignmentEditor({
    audioUrl,
    timings,
    setTimings,
}: SyncMapAlignmentEditorProps) {

    // Refs
    const wsContainerRef = useRef<HTMLDivElement | null>(null);
    const wsScrollContainerRef = useRef<HTMLElement | null>(null);
    const regionsScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const regionsContainerRef = useRef<HTMLDivElement | null>(null);

    // Wavesurfer state
    const wsRef = useRef<WaveSurfer | null>(null); // wavesurfer
    const [isWsCreated, setWsCreated] = useState<boolean>(false); // true when wavesurfer created
    const [isWsLoading, setWsLoading] = useState<boolean>(false); // true when wavesurfer LOADING, false otherwise
    const [isWsReady, setWsReady] = useState<boolean>(false); // true when wavesurfer LOADED, false otherwise
    const [waveformWidth, setWaveformWidth] = useState<number>(0);

    // Selection state
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    
    // Box-select state
    const [boxSelectStart, setBoxSelectStart] = useState<{x: number, y: number} | null>(null);
    const [boxSelectEnd, setBoxSelectEnd] = useState<{x: number, y: number} | null>(null);
    
    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<number>(0);

    const handleRegionSelect = (index: number, addToSelection: boolean) => {
        setSelectedIndices(prev => {
            const newSet = new Set(addToSelection ? prev : []);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleDragStart = (index: number) => {
        // If dragging a non-selected region, select only that one
        if (!selectedIndices.has(index)) {
            setSelectedIndices(new Set([index]));
        }
        setIsDragging(true);
    };

    const handleDrag = (index: number, newStart: number) => {
        // Calculate offset from the dragged region
        const draggedPoint = timings[index];
        if (!draggedPoint) return;
        
        const offset = newStart - draggedPoint.start;
        
        // Update all selected regions by the same offset
        setTimings(prev => prev.map((sp, i) => 
            selectedIndices.has(i) 
                ? { ...sp, time: sp.start + offset }
                : sp
        ));
    };

    const handleDragEnd = (index: number, newTime: number) => {
        setIsDragging(false);
        // Final update already handled in handleDrag
    };

    const handleBoxSelect = (start: {x: number, y: number}, end: {x: number, y: number}) => {
        // Calculate which regions fall within the box
        // ... box selection logic ...
    };

    // Create wavesurfer
    useEffect(() => {
        const ws = WaveSurfer.create({
            container: wsContainerRef.current!,
            waveColor: '#f5dae5',
            progressColor: '#a17485',
            cursorColor: '#f54789',
            barWidth: 5,
            barGap: 2,
            barRadius: 5,
            height: 100,
            normalize: true,
            minPxPerSec: 50,
        });
        wsRef.current = ws;
        wsScrollContainerRef.current = ws.getWrapper().parentElement;

        setWsCreated(true);

        return () => {
            ws.unAll();
            ws.destroy();
        }
    }, [])
    
    // Load wavesurfer audio
    useEffect(() => {
        if (!isWsCreated || !audioUrl) return;

        const ws = wsRef.current!;

        setWsLoading(true);
        ws.load(audioUrl);

        ws.on("ready", () => {
            setWsLoading(false);
            setWsReady(true);
        });

        return () => {
            ws.unAll();
            setWsReady(false);
        };
    }, [isWsCreated, audioUrl]);

    // Sync scroll positions between wavesurfer and regions containers
    useEffect(() => {
        const wsScroll = wsScrollContainerRef.current;
        const regionsScroll = regionsScrollContainerRef.current;

        if (!wsScroll || !regionsScroll) return;

        let isWsSyncing = false;
        let isRegionsSyncing = false;

        const syncWsToRegions = () => {
            console.log("scrolling")
            if (isRegionsSyncing) return;
            isWsSyncing = true;
            regionsScroll.scrollLeft = wsScroll.scrollLeft;
            requestAnimationFrame(() => {
                isWsSyncing = false;
            });
        };

        const syncRegionsToWs = () => {
            if (isWsSyncing) return;
            isRegionsSyncing = true;
            wsScroll.scrollLeft = regionsScroll.scrollLeft;
            requestAnimationFrame(() => {
                isRegionsSyncing = false;
            });
        };

        wsScroll.addEventListener('scroll', syncWsToRegions);
        //regionsScroll.addEventListener('scroll', syncRegionsToWs);

        return () => {
            wsScroll.removeEventListener('scroll', syncWsToRegions);
            //regionsScroll.removeEventListener('scroll', syncRegionsToWs);
        };
    }, [isWsReady]);

    // Sync scroll container widths
    useEffect(() => {
        if (!wsRef.current) return;

        const ws = wsRef.current;
        const waveformElement = ws.getWrapper();

        const updateWidth = () => {
            const width = isWsReady ? waveformElement.scrollWidth : 0;
            setWaveformWidth(width);
        };

        updateWidth();

        ws.on('zoom', updateWidth);
        ws.on('redraw', updateWidth);
        window.addEventListener('resize', updateWidth);

        return () => {
            ws.un('zoom', updateWidth);
            ws.un('redraw', updateWidth);
            window.removeEventListener('resize', updateWidth);
        };
    }, [isWsReady]);
    

    return (
        <Box className="p-6">
            <div style={{ position: 'relative' }}>
                {/* Wavesurfer */}
                <div ref={wsContainerRef} style={{ minWidth: '100%', height: '100%', position: 'relative' }}></div>

                {/* Regions */}
                <div 
                    ref={regionsScrollContainerRef} 
                    style={{ 
                        width: '100%',
                        height: '100px',
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        pointerEvents: 'none'
                    }}
                >
                    <div ref={regionsContainerRef} style={{ width: waveformWidth || '100%', height: '100%' }}>
                        {isWsReady && timings.map((syncPoint, index) => 
                            <SyncMapAlignmentEditorRegion 
                                key={index}
                                index={index}
                                syncPoint={syncPoint}
                                wavesurferRef={wsRef}
                                isSelected={selectedIndices.has(index)}
                                onSelect={handleRegionSelect}
                                onDragStart={handleDragStart}
                                onDrag={handleDrag}
                                onDragEnd={handleDragEnd}
                                isDragging={isDragging}
                            />
                        )}
                    </div>
                </div>

                {/* Box select visual */}
                {boxSelectStart && boxSelectEnd && (
                    <div 
                        className="absolute border-2 border-blue-500 bg-blue-100 opacity-30"
                        style={{
                            left: Math.min(boxSelectStart.x, boxSelectEnd.x),
                            top: Math.min(boxSelectStart.y, boxSelectEnd.y),
                            width: Math.abs(boxSelectEnd.x - boxSelectStart.x),
                            height: Math.abs(boxSelectEnd.y - boxSelectStart.y),
                        }}
                    />
                )}
            </div>
        </Box>
    )
}