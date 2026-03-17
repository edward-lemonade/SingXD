import { ChartDraft } from '@/src/lib/types/models';
import { useState, useEffect, useRef, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Lyric state machine

export interface LyricWord {
    text: string;
    isPast: boolean;
    isActive: boolean;
}

export interface LyricLineState {
    words: LyricWord[];
    isCurrent: boolean;
    lineIdx: number;
}

export enum LyricStateKind {
    ACTIVE_WORD, INACTIVE_WORD, SMALL_LINE_GAP, LARGE_LINE_GAP
}
interface BaseLyricState {
    displayedLines: LyricLineState[];
    visible: boolean;
}
export interface ActiveWordState extends BaseLyricState {
    kind: LyricStateKind.ACTIVE_WORD;
    activeWordStart: number;
    activeWordEnd: number;
    activeWordKey: string;
}
export interface InactiveWordState extends BaseLyricState {
    kind: LyricStateKind.INACTIVE_WORD;
}
export interface SmallLineGapState extends BaseLyricState {
    kind: LyricStateKind.SMALL_LINE_GAP;
}
export interface LargeLineGapState extends BaseLyricState {
    kind: LyricStateKind.LARGE_LINE_GAP;
}

export type LyricState =
    | ActiveWordState
    | InactiveWordState
    | SmallLineGapState
    | LargeLineGapState;

// ---------------------------------------------------------------------------
// ChartEngine public interface

export interface ChartEngine {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    audioElement: HTMLAudioElement | null;
    currentTime: number;
    isPlaying: boolean;
    play: () => void;
    pause: () => void;
    togglePlayPause: () => void;
    seek: (time: number) => void;
    lyricState: LyricState;
}

// ---------------------------------------------------------------------------
// Constants

const LARGE_GAP_THRESHOLD_S = 3;
const LARGE_GAP_LEAD_IN_S = 1;
const DISPLAY_WINDOW = { before: 1, after: 1 };

// ---------------------------------------------------------------------------
// Hook

export function useChartEngine(
    chart: ChartDraft,
    options: {
        game?: boolean;
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

    const play = () => { audioRef.current?.play(); setIsPlaying(true); };
    const pause = () => { audioRef.current?.pause(); setIsPlaying(false); };
    const togglePlayPause = () => (isPlaying ? pause() : play());
    const seek = (time: number) => {
        setCurrentTime(time);
        if (audioRef.current) audioRef.current.currentTime = time;
    };

    const handleEnded = () => { setIsPlaying(false); onEnded?.(); };
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    });

    // Compute start and end time for lines
    const lineRanges = useMemo(() => {
        const { lines, timings } = chart;
        const ranges: { start: number; end: number }[] = [];
        let wordOffset = 0;
        for (const line of lines) {
            const firstTiming = timings[wordOffset];
            const lastTiming = timings[wordOffset + line.words.length - 1];
            ranges.push({
                start: firstTiming?.start ?? 0,
                end: lastTiming?.end ?? 0,
            });
            wordOffset += line.words.length;
        }
        return ranges;
    }, [chart.lines, chart.timings]);

    // Compute line groups, separated by large gaps
    const lineGroups = useMemo(() => {
        const groups: { start: number; end: number }[] = [];
        let groupStart = 0;
        for (let i = 1; i < chart.lines.length; i++) {
            const gap = (lineRanges[i]?.start ?? 0) - (lineRanges[i - 1]?.end ?? 0);
            if (gap >= LARGE_GAP_THRESHOLD_S) {
                groups.push({ start: groupStart, end: i - 1 });
                groupStart = i;
            }
        }
        groups.push({ start: groupStart, end: chart.lines.length - 1 });
        return groups;
    }, [chart.lines, lineRanges]);

    // Compute state
    const lyricState = useMemo((): LyricState => {
        const { lines, timings } = chart;

        if (timings.length === 0 || lines.length === 0) {
            return { kind: LyricStateKind.INACTIVE_WORD, displayedLines: [], visible: false };
        }

        const firstWordStart = timings[0].start;
        const lastWordEnd = timings[timings.length - 1].end;

        // 1. Find the active global word index (word currently being sung).

        let activeGlobalIdx = -1;
        for (let i = 0; i < timings.length; i++) {
            if (currentTime >= timings[i].start && currentTime < timings[i].end) {
                activeGlobalIdx = i;
                break;
            }
        }

        // 2. Find the active line and word indices.

        let activeLineIdx = -1;
        let activeWordIdx = -1;
        if (activeGlobalIdx !== -1) {
            let wordCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (activeGlobalIdx < wordCount + lines[i].words.length) {
                    activeLineIdx = i;
                    activeWordIdx = activeGlobalIdx - wordCount;
                    break;
                }
                wordCount += lines[i].words.length;
            }
        }

        // 3. When no word is active, determine which line we're closest to.

        let focusLineIdx: number;

        if (activeLineIdx !== -1) {
            focusLineIdx = activeLineIdx;
        } else if (currentTime < firstWordStart) {
            focusLineIdx = 0;
        } else if (currentTime >= lastWordEnd) {
            focusLineIdx = lines.length - 1;
        } else {
            const withinLine = lines.findIndex(
                (_, i) => currentTime >= lineRanges[i].start && currentTime < lineRanges[i].end
            );
            if (withinLine !== -1) {
                focusLineIdx = withinLine;
            } else {
                focusLineIdx = lines.length - 1;
                for (let i = 0; i < lines.length; i++) {
                    if (lineRanges[i].start > currentTime) {
                        focusLineIdx = i;
                        break;
                    }
                }
            }
        }

        const gapBefore = (lineIdx: number): number => {
            const lineStart = lineRanges[lineIdx]?.start ?? 0;
            const prevEnd = lineIdx > 0 ? lineRanges[lineIdx - 1].end : 0;
            return lineStart - prevEnd;
        };

        // 4. Determine past words in focus line

        const pastWordCountInFocusLine = (() => {
            if (activeLineIdx !== -1) return activeWordIdx;

            if (focusLineIdx < lines.length) {
                let wordOffset = 0;
                for (let i = 0; i < focusLineIdx; i++) wordOffset += lines[i].words.length;
                let count = 0;
                for (let w = 0; w < lines[focusLineIdx].words.length; w++) {
                    if (timings[wordOffset + w]?.end <= currentTime) count++;
                    else break;
                }
                return count;
            }
            return 0;
        })();

        // 5. Build the display window of lines.

        const buildLines = (
            startIdx: number,
            endIdx: number,
            currentFocusIdx: number,
            pastWordsInFocus: number,
            activeWIdx: number,
        ): LyricLineState[] => {
            const result: LyricLineState[] = [];
            for (let li = startIdx; li <= endIdx; li++) {
                const line = lines[li];
                const isCurrent = li === currentFocusIdx;
                const isFullyPast = li < currentFocusIdx;

                const words: LyricWord[] = line.words.map((w, wi) => {
                    const isPast = isFullyPast || (isCurrent && wi < pastWordsInFocus);
                    const isActive = isCurrent && wi === activeWIdx;
                    return { text: w.text, isPast, isActive };
                });

                result.push({ words, isCurrent, lineIdx: li });
            }
            return result;
        };

        // 6. Group-aware window builder — clamps display window to the line's group.

        const groupOf = (lineIdx: number) =>
            lineGroups.find(g => lineIdx >= g.start && lineIdx <= g.end)
            ?? { start: 0, end: lines.length - 1 };

        const buildLinesInGroup = (
            focusIdx: number,
            pastWordsInFocus: number,
            activeWIdx: number,
        ) => {
            const group = groupOf(focusIdx);
            const windowStart = Math.max(group.start, focusIdx - DISPLAY_WINDOW.before);
            const windowEnd   = Math.min(group.end,   focusIdx + DISPLAY_WINDOW.after);
            return buildLines(windowStart, windowEnd, focusIdx, pastWordsInFocus, activeWIdx);
        };

        // 7. Assemble the final LyricState.

        if (activeLineIdx !== -1) {
            // ---- ActiveWord or InactiveWord ----
            const builtLines = buildLinesInGroup(focusLineIdx, activeWordIdx, activeWordIdx);

            if (activeGlobalIdx !== -1) {
                return {
                    kind: LyricStateKind.ACTIVE_WORD,
                    displayedLines: builtLines,
                    visible: true,
                    activeWordStart: timings[activeGlobalIdx].start,
                    activeWordEnd: timings[activeGlobalIdx].end,
                    activeWordKey: `${activeLineIdx}-${activeWordIdx}`,
                };
            }
            return { kind: LyricStateKind.INACTIVE_WORD, displayedLines: builtLines, visible: true };
        }

        const gap = gapBefore(focusLineIdx);
        const isLargeGap = gap >= LARGE_GAP_THRESHOLD_S;

        if (isLargeGap) {
            // ---- LargeLineGap ----
            const nextLineStart = lineRanges[focusLineIdx]?.start ?? Infinity;

            if (currentTime < nextLineStart - LARGE_GAP_LEAD_IN_S) {
                const prevIdx = focusLineIdx - 1;
                if (prevIdx < 0) {
                    return { kind: LyricStateKind.LARGE_LINE_GAP, displayedLines: [], visible: false };
                }
                return {
                    kind: LyricStateKind.LARGE_LINE_GAP,
                    displayedLines: buildLinesInGroup(prevIdx, lines[prevIdx].words.length, -1),
                    visible: false,
                };
            }

            return {
                kind: LyricStateKind.LARGE_LINE_GAP,
                displayedLines: buildLinesInGroup(focusLineIdx, 0, -1),
                visible: true,
            };
        }

        // ---- SmallLineGap or InactiveWord ----
        const builtLines = buildLinesInGroup(focusLineIdx, pastWordCountInFocusLine, -1);

        if (currentTime < firstWordStart) {
            return { kind: LyricStateKind.SMALL_LINE_GAP, displayedLines: builtLines, visible: gap < LARGE_GAP_THRESHOLD_S };
        }
        if (currentTime >= lastWordEnd) {
            return { kind: LyricStateKind.INACTIVE_WORD, displayedLines: builtLines, visible: true };
        }

        return { kind: LyricStateKind.SMALL_LINE_GAP, displayedLines: builtLines, visible: true };
    }, [chart.lines, chart.timings, lineRanges, lineGroups, currentTime]);

    return {
        audioRef,
        get audioElement() { return audioRef.current; },
        currentTime,
        isPlaying,
        play,
        pause,
        togglePlayPause,
        seek,
        lyricState,
    };
}