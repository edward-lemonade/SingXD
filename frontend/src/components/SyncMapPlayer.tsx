import { useState, useEffect, useRef, useMemo } from "react";
import { SyncMap } from "../lib/types/types";

export interface SyncMapPlayerSettings {
    width: number;
    height: number;
}

const defaultPlayerSettings: SyncMapPlayerSettings = {
    width: 720,
    height: 720,
}

export default function SyncMapPlayer({
    syncMap,
    playerSettings: partialSettings,
}: {
    syncMap: SyncMap;
    playerSettings?: Partial<SyncMapPlayerSettings>;
}) {
    const playerSettings = { ...defaultPlayerSettings, ...partialSettings };
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameRef = useRef<number>(null);

    // Find current line and word based on time
    const getCurrentIndices = useMemo(() => {
        return (time: number) => {
            const lines = syncMap.lines;
            const timings = syncMap.timings;
            let lineIndex = -1;
            let wordIndex = -1;
            let globalWordIndex = -1;
            
            // Find the current word based on timing
            for (let i = 0; i < timings.length; i++) {
                if (time >= timings[i].start && time < timings[i].end) {
                    globalWordIndex = i;
                    break;
                }
            }
            
            // If no active word found, check if we're past all timings
            if (globalWordIndex === -1 && timings.length > 0) {
                if (time >= timings[timings.length - 1].end) {
                    globalWordIndex = timings.length - 1;
                }
            }
            
            // If we found a word, determine which line and word index it belongs to
            if (globalWordIndex !== -1) {
                let wordCount = 0;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (globalWordIndex < wordCount + line.words.length) {
                        lineIndex = i;
                        wordIndex = globalWordIndex - wordCount;
                        break;
                    }
                    wordCount += line.words.length;
                }
            }
            
            return { lineIndex, wordIndex };
        };
    }, [syncMap.lines, syncMap.timings]);
    const { 
        lineIndex: currentLineIndex, 
        wordIndex: currentWordIndex 
    } = getCurrentIndices(currentTime);

    // Get lines to display (current + context)
    const getDisplayLines = () => {
        if (currentLineIndex === -1) return [];
        
        const start = Math.max(0, currentLineIndex - 1);
        const end = Math.min(syncMap.lines.length, currentLineIndex + 2);
        return syncMap.lines.slice(start, end);
    };
    const displayLines = useMemo(getDisplayLines, [syncMap, currentLineIndex]);

    // Update current time on animation frame
    const updateTime = () => {
        if (audioRef.current && isPlaying) {
            setCurrentTime(audioRef.current.currentTime);
            animationFrameRef.current = requestAnimationFrame(updateTime);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateTime);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    return (
        <div 
            style={{
                width: playerSettings.width,
                height: playerSettings.height,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#000',
                backgroundImage: syncMap.settings.backgroundImageUrl 
                    ? `url(${syncMap.settings.backgroundImageUrl})` 
                    : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Audio element */}
            {syncMap.settings.audioUrl && (
                <audio
                    ref={audioRef}
                    src={syncMap.settings.audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                />
            )}

            {/* Lyrics display area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                gap: '20px',
            }}>
                {displayLines.map((line, idx) => {
                    const lineIdx = syncMap.lines.indexOf(line);
                    const isCurrentLine = lineIdx === currentLineIndex;
                    
                    return (
                        <div
                            key={lineIdx}
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: '8px',
                                opacity: isCurrentLine ? 1 : 0.5,
                                transform: isCurrentLine ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                fontFamily: syncMap.settings.font,
                                fontSize: syncMap.settings.textSize,
                            }}
                        >
                            {line.words.map((word, wordIdx) => {
                                const isCurrentWord = isCurrentLine && 
                                    wordIdx === currentWordIndex;
                                
                                return (
                                    <span
                                        key={wordIdx}
                                        style={{
                                            color: isCurrentWord 
                                                ? '#FFD700' // Gold for current word
                                                : syncMap.settings.textColor,
                                            fontWeight: isCurrentWord ? 'bold' : 'normal',
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                            transition: 'all 0.2s ease',
                                            transform: isCurrentWord ? 'scale(1.15)' : 'scale(1)',
                                        }}
                                    >
                                        {word.text}
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Controls */}
            <div style={{
                padding: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }}>
                {/* Progress bar */}
                <input
                    type="range"
                    min="0"
                    max={syncMap.metadata.duration}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    style={{ width: '100%' }}
                />
                
                {/* Time display and play button */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#fff',
                }}>
                    <span>
                        {formatTime(currentTime)} / {formatTime(syncMap.metadata.duration)}
                    </span>
                    
                    <button
                        onClick={togglePlayPause}
                        style={{
                            padding: '10px 30px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backgroundColor: '#FFD700',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                        }}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to format time as MM:SS
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}