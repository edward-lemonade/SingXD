'use client';

import { Card } from '@/src/components/Card/Card';
import { Line, Timing } from '../../../lib/types/models';
import { AudioUrls } from '../useDraftForm';
import { SetStateAction, useMemo, useState } from 'react';
import ChartTimingEditor from '../components/ChartTimingEditor';
import { Button } from '@/src/components/Button/Button';

interface LyricsStepProps {
    lyricsString: string;
    setLyricsString: (lyrics: string) => void;
    lines: Line[];
    audioUrls: AudioUrls;
    timings: Timing[];
    setTimings: (syncPoints: SetStateAction<Timing[]>) => void;
    loading: boolean;
    handleGenerateAlignment: () => void;
}

export default function LyricsStep({
    lyricsString,
    setLyricsString,
    lines,
    audioUrls,
    timings,
    setTimings,
    loading,
    handleGenerateAlignment,
}: LyricsStepProps) {
    const [vocalsOnly, setVocalsOnly] = useState(false);
    const audioUrl = vocalsOnly ? audioUrls.vocals : audioUrls.combined;

    const flatWords = useMemo(
        () => lines.flatMap(line => line.words.map(w => w.text)),
        [lines]
    );
    const [selectedTimingIndex, setSelectedTimingIndex] = useState<number | null>(null);
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Lyrics input */}
            <Card label='Lyrics'>
                <div style={{ padding: '0px 24px 20px' }}>
                    <textarea
                        value={lyricsString}
                        onChange={e => setLyricsString(e.target.value)}
                        placeholder="Paste or enter lyrics here…&#10;Each line becomes a lyric line."
                        style={{
                            width: '100%',
                            minHeight: 180,
                            padding: '12px 14px',
                            fontFamily: 'var(--font-wide)',
                            fontSize: 13,
                            lineHeight: 1.7,
                            letterSpacing: '0.02em',
                            color: 'rgba(0,0,0,0.85)',
                            background: 'rgba(0,0,0,0.03)',
                            border: '2px solid rgba(0,0,0,0.12)',
                            outline: 'none',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.15s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,0,0,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.12)'}
                    />

                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Button
                            onClick={handleGenerateAlignment}
                            disabled={loading}
                            variant='dark'
                            borderless
                        >
                            {loading && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                    <circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                    <path d="M6 1a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                </svg>
                            )}
                            {loading ? 'Aligning…' : 'Auto-align with AI'}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Timing editor */}
            <Card label="Timing Editor">
                <div style={{ padding: '0px 24px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
                        
                        {/* vocals toggle */}
                        <button
                            onClick={() => setVocalsOnly(v => !v)}
                            disabled={!audioUrls.vocals}
                            style={{
                                marginBottom: 12,
                                padding: '5px 12px',
                                fontFamily: 'var(--font-wide)',
                                fontWeight: 700,
                                fontSize: 10,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                background: vocalsOnly ? 'var(--color-dark-base)' : 'transparent',
                                border: '2px solid rgba(0,0,0,0.2)',
                                color: vocalsOnly ? '#fff' : 'rgba(0,0,0,0.45)',
                                cursor: audioUrls.vocals ? 'pointer' : 'not-allowed',
                                opacity: audioUrls.vocals ? 1 : 0.35,
                                transition: 'all 0.15s',
                            }}
                        >
                            {vocalsOnly ? '♪ Vocals' : '♫ Combined'}
                        </button>
                    </div>

                    <ChartTimingEditor
                        key={audioUrl}
                        audioUrl={audioUrl ?? null}
                        timings={timings}
                        setTimings={setTimings}
                        words={flatWords}
                        selectedIndex={selectedTimingIndex}
                        setSelectedIndex={setSelectedTimingIndex}
                    />
                </div>
            </Card>
        </div>
    );
}