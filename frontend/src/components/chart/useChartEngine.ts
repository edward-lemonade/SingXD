import { ChartDraft } from '@/src/lib/types/types';
import { useState, useEffect, useRef, useMemo } from 'react';

export interface ChartEngine {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    audioElement: HTMLAudioElement | null;
    currentTime: number;
    isPlaying: boolean;
    play: () => void;
    pause: () => void;
    togglePlayPause: () => void;
    seek: (time: number) => void;
    currentLineIndex: number;
    currentWordIndex: number;
    displayLines: ChartDraft['lines'];
}

export function useChartEngine(
    chart: ChartDraft,
    options: {
        game?: boolean; // auto-plays on mount and disallows manual controls
        onEnded?: () => void;
    } = {}
): ChartEngine {
    const { game = false, onEnded } = options;

    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const animationFrameRef = useRef<number>(null);

    // Auto-play (game mode).
    useEffect(() => {
        if (!game) return;
        const audio = audioRef.current;
        if (!audio) return;
        const p = audio.play();
        if (p) p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        else setIsPlaying(true);
    }, [game]);

    // rAF loop — keeps currentTime in sync without relying solely on onTimeUpdate.
    const tick = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            animationFrameRef.current = requestAnimationFrame(tick);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(tick);
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying]);


    const play = () => {
        audioRef.current?.play();
        setIsPlaying(true);
    };
    const pause = () => {
        audioRef.current?.pause();
        setIsPlaying(false);
    };
    const togglePlayPause = () => (
        isPlaying ? pause() : play()
    );
    const seek = (time: number) => {
        setCurrentTime(time);
        if (audioRef.current) audioRef.current.currentTime = time;
    };

    const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
    };
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    });

    // Timing index 
    const getCurrentIndices = useMemo(() => {
        return (time: number) => {
            const { lines, timings } = chart;
            let globalWordIndex = -1;

            for (let i = 0; i < timings.length; i++) {
                if (time >= timings[i].start && time < timings[i].end) {
                    globalWordIndex = i;
                    break;
                }
            }
            if (globalWordIndex === -1 && timings.length > 0) {
                if (time >= timings[timings.length - 1].end) {
                    globalWordIndex = timings.length - 1;
                }
            }

            let lineIndex = -1;
            let wordIndex = -1;
            if (globalWordIndex !== -1) {
                let wordCount = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (globalWordIndex < wordCount + lines[i].words.length) {
                        lineIndex = i;
                        wordIndex = globalWordIndex - wordCount;
                        break;
                    }
                    wordCount += lines[i].words.length;
                }
            }

            return { lineIndex, wordIndex };
        };
    }, [chart.lines, chart.timings]);

    const { lineIndex: currentLineIndex, wordIndex: currentWordIndex } =
        getCurrentIndices(currentTime);

    const displayLines = useMemo(() => {
        if (currentLineIndex === -1) return [];
        const start = Math.max(0, currentLineIndex - 1);
        const end = Math.min(chart.lines.length, currentLineIndex + 2);
        return chart.lines.slice(start, end);
    }, [chart.lines, currentLineIndex]);

    return {
        audioRef,
        get audioElement() {return audioRef.current;},
        currentTime,
        isPlaying,
        play,
        pause,
        togglePlayPause,
        seek,
        currentLineIndex,
        currentWordIndex,
        displayLines,
    };
}