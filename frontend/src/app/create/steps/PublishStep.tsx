'use client';

import { Button } from '@/src/components/Button/Button';
import { Card } from '@/src/components/Card/Card';
import { DraftChart, ChartProperties } from '@/src/lib/types/models';
import { SetStateAction } from 'react';

interface PublishStepProps {
    chart: DraftChart;
    chartProps: ChartProperties;
    setChartProps: (video: SetStateAction<ChartProperties>) => void;
    loading: boolean;
    handlePublish: () => void;
    publishError?: string | null;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 7,
            fontSize: 12,
            fontFamily: 'var(--font-wide)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.7)',
        }}>
            {children}
            {required && (
                <span style={{ color: '#ff4d4f', fontSize: 10 }}>*</span>
            )}
        </label>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontFamily: 'var(--font-wide)',
    fontSize: 14,
    color: 'rgba(0,0,0,0.85)',
    background: 'rgba(0,0,0,0.03)',
    border: '2px solid rgba(0,0,0,0.12)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
};

export default function PublishStep({
    chartProps,
    setChartProps,
    loading,
    handlePublish,
    publishError,
}: PublishStepProps) {
    const isReady = chartProps.title && chartProps.artist && chartProps.songTitle;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* metadata card */}
            <Card label='Chart Info'>
                <div style={{ padding: '0px 24px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                        <div>
                            <FieldLabel required>Chart Title</FieldLabel>
                            <input
                                type="text"
                                placeholder="e.g. My Weekend Cover"
                                value={chartProps.title}
                                onChange={e => setChartProps(prev => ({ ...prev, title: e.target.value }))}
                                style={inputStyle}
                                onFocus={e => (e.target.style.borderColor = 'rgba(0,0,0,0.5)')}
                                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <FieldLabel required>Song Title</FieldLabel>
                                <input
                                    type="text"
                                    placeholder="e.g. Blinding Lights"
                                    value={chartProps.songTitle}
                                    onChange={e => setChartProps(prev => ({ ...prev, songTitle: e.target.value }))}
                                    style={inputStyle}
                                    onFocus={e => (e.target.style.borderColor = 'rgba(0,0,0,0.5)')}
                                    onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <FieldLabel required>Artist</FieldLabel>
                                <input
                                    type="text"
                                    placeholder="e.g. The Weeknd"
                                    value={chartProps.artist}
                                    onChange={e => setChartProps(prev => ({ ...prev, artist: e.target.value }))}
                                    style={inputStyle}
                                    onFocus={e => (e.target.style.borderColor = 'rgba(0,0,0,0.5)')}
                                    onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* publish card */}
            <Card label="Publish">
                <div style={{ padding: '0px 24px 20px' }}>

                    {!isReady && (
                        <div style={{
                            marginBottom: 20,
                            padding: '10px 14px',
                            background: 'rgba(255,77,79,0.06)',
                            border: '1px solid rgba(255,77,79,0.2)',
                            fontSize: 12,
                            color: 'rgba(0,0,0,0.6)',
                            lineHeight: 1.5,
                        }}>
                            Fill in all required fields above before publishing.
                        </div>
                    )}

                    {publishError && (
                        <div style={{
                            marginBottom: 20,
                            padding: '10px 14px',
                            background: 'rgba(255,77,79,0.06)',
                            border: '1px solid rgba(255,77,79,0.25)',
                            fontSize: 12,
                            color: '#ff4d4f',
                        }}>
                            {publishError}
                        </div>
                    )}

                    <Button
                        onClick={handlePublish}
                        disabled={loading || !isReady}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        variant='success'
                        borderless
                    >
                        {loading && (
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                <path d="M6.5 1a5.5 5.5 0 0 1 5.5 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </svg>
                        )}
                        {loading ? 'Publishing…' : 'Publish Chart'}
                    </Button>

                    <p style={{ margin: '14px 0 0', fontSize: 11, color: 'rgba(0,0,0,0.3)', lineHeight: 1.5, textAlign: 'center' }}>
                        Once published, your chart will be available to all players.
                    </p>
                </div>
            </Card>
        </div>
    );
}