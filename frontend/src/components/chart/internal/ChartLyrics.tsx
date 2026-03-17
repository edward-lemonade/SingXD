import { ChartDraft } from '@/src/lib/types/models';
import { useCallback, useRef, useEffect, useState } from 'react';
import { ChartEngine, ActiveWordState, LyricLineState, LyricStateKind } from './useChartEngine';

const STYLE_ID = 'karaoke-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @keyframes karaokeFlood {
            from { background-position-x: 100%; }
            to   { background-position-x:   0%; }
        }
    `;
    document.head.appendChild(style);
}

interface ChartLyricsProps {
    chart: ChartDraft;
    engine: ChartEngine;
    lineHeightPx: number;
    fontSize: string;
}

const TRANSITION_MS = 350;
const SLOTS = 3; // always render this many slots so focus line stays centered

type Slot =
    | { kind: 'line'; line: LyricLineState }
    | { kind: 'empty'; key: string };

export default function ChartLyrics({ chart, engine, lineHeightPx, fontSize }: ChartLyricsProps) {
    const { lyricState } = engine;
    const baseColor = chart.properties.textColor ?? '#ffffff';
    const highlightColor = '#FFD700';

    const activeState = lyricState.kind === LyricStateKind.ACTIVE_WORD ? (lyricState as ActiveWordState) : null;
    const durationSec = activeState
        ? Math.max(0.05, activeState.activeWordEnd - activeState.activeWordStart)
        : 0.05;

    const activeSpanRef = useCallback(
        (node: HTMLSpanElement | null) => {
            if (!node || !activeState || !engine.audioElement) return;
            const freshElapsed = Math.max(
                0,
                Math.min(engine.audioElement.currentTime - activeState.activeWordStart, durationSec)
            );
            node.style.animationDuration = `${durationSec}s`;
            node.style.animationDelay = `${-(freshElapsed * 1000)}ms`;
            node.style.animationName = 'karaokeFlood';
            node.style.animationTimingFunction = 'linear';
            node.style.animationIterationCount = '1';
            node.style.animationFillMode = 'forwards';
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeState?.activeWordKey]
    );

    // Build padded slots so focus line always occupies the center slot.
    const slots = ((): Slot[] => {
        const lines = lyricState.displayedLines;
        const focusIdx = lines.findIndex(l => l.isCurrent);

        // No current line (e.g. large gap fade-out) — just fill slots with lines or empties.
        if (focusIdx === -1) {
            const result: Slot[] = lines.map(l => ({ kind: 'line', line: l }));
            while (result.length < SLOTS) result.push({ kind: 'empty', key: `empty-pad-${result.length}` });
            return result.slice(0, SLOTS);
        }

        const before = focusIdx; // lines above focus in window
        const after = lines.length - 1 - focusIdx; // lines below focus in window
        const centerSlot = Math.floor(SLOTS / 2); // index 1 for SLOTS=3

        const emptyAbove = centerSlot - before; // padding slots needed above
        const emptyBelow = centerSlot - after;  // padding slots needed below

        const result: Slot[] = [];

        for (let i = 0; i < emptyAbove; i++) {
            result.push({ kind: 'empty', key: `empty-above-${i}` });
        }
        for (const line of lines) {
            result.push({ kind: 'line', line });
        }
        for (let i = 0; i < emptyBelow; i++) {
            result.push({ kind: 'empty', key: `empty-below-${i}` });
        }

        return result;
    })();

    const activeLine = lyricState.displayedLines.find(l => l.isCurrent);
    const currentLineIdx = activeLine?.lineIdx ?? -1;

    const prevFocusRef = useRef<number | null>(null);
    const [offsetPx, setOffsetPx] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!lyricState.visible) {
            prevFocusRef.current = null;
        }
    }, [lyricState.visible]);

    useEffect(() => {
        const prev = prevFocusRef.current;
        const curr = currentLineIdx;

        if (curr === -1) return;

        prevFocusRef.current = curr;

        if (prev === null || prev === curr) return;

        setOffsetPx(lineHeightPx);
        setIsAnimating(false);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setOffsetPx(0);
                setIsAnimating(true);
            });
        });
    }, [currentLineIdx, lineHeightPx]);

    const gap = Math.round(lineHeightPx * 0.33);
    const containerHeight = lineHeightPx * SLOTS + gap * (SLOTS - 1);

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                opacity: lyricState.visible ? 1 : 0,
                transition: 'opacity 1s ease',
            }}
        >
            <div
                style={{
                    height: `${containerHeight}px`,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'center',
                    WebkitMaskImage: `linear-gradient(
                        to bottom,
                        transparent 0%,
                        black ${100 / SLOTS}%,
                        black ${100 - 100 / SLOTS}%,
                        transparent 100%
                    )`,
                    maskImage: `linear-gradient(
                        to bottom,
                        transparent 0%,
                        black ${100 / SLOTS}%,
                        black ${100 - 100 / SLOTS}%,
                        transparent 100%
                    )`,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        gap: `${gap}px`,
                        transform: `translateY(${offsetPx}px)`,
                        transition: isAnimating
                            ? `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                            : 'none',
                    }}
                >
                    {slots.map((slot) => {
                        if (slot.kind === 'empty') {
                            return (
                                <div
                                    key={slot.key}
                                    style={{ minHeight: `${lineHeightPx}px`, width: '100%' }}
                                />
                            );
                        }

                        const lineState = slot.line;
                        return (
                            <div
                                key={lineState.lineIdx}
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    opacity: lineState.isCurrent ? 1 : 0.5,
                                    transform: lineState.isCurrent ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                                    fontFamily: chart.properties.font,
                                    fontSize,
                                    minHeight: `${lineHeightPx}px`,
                                    alignItems: 'center',
                                }}
                            >
                                {lineState.words.map((word, wordIdx) => {
                                    if (word.isActive && activeState) {
                                        return (
                                            <span
                                                key={activeState.activeWordKey}
                                                ref={activeSpanRef}
                                                style={{
                                                    backgroundImage: `linear-gradient(to right, ${highlightColor} 50%, ${baseColor} 50%)`,
                                                    backgroundSize: '200% 100%',
                                                    WebkitBackgroundClip: 'text',
                                                    backgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    color: 'transparent',
                                                    display: 'inline-block',
                                                }}
                                            >
                                                {word.text}
                                            </span>
                                        );
                                    }
                                    return (
                                        <span
                                            key={wordIdx}
                                            style={{
                                                color: word.isPast ? highlightColor : baseColor,
                                                display: 'inline-block',
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
            </div>
        </div>
    );
}