import { useState } from 'react';
import { useChartEngine } from '../internal/useChartEngine';
import ChartLyrics from '../internal/ChartLyrics';
import ChartControls from './Controls';
import { ChartDraft } from '@/src/lib/types/models';

export interface ChartPlayerSettings {
    width: number;
    height: number;
}

const defaultPlayerSettings: ChartPlayerSettings = {
    width: 720,
    height: 720,
};

const CONTROLS_HEIGHT_PX = 56;
const LYRICS_PADDING_PX = 80;

const SLOTS = 3;
const GAP_RATIO = 0.33;

function computePlayerLyricSizes(playerHeight: number) {
    const available = playerHeight - CONTROLS_HEIGHT_PX - LYRICS_PADDING_PX;
    const lineHeightPx = Math.floor(available / (SLOTS + GAP_RATIO * (SLOTS - 1)));
    const fontSize = `${Math.floor(lineHeightPx * 0.2)}px`;
    return { lineHeightPx, fontSize };
}

interface ChartPlayerProps {
    chart: ChartDraft;
    playerSettings?: Partial<ChartPlayerSettings>;
    onEnded?: () => void;
}

export default function ChartPlayer({ chart, playerSettings: partial, onEnded }: ChartPlayerProps) {
    const settings = { ...defaultPlayerSettings, ...partial };
    const engine = useChartEngine(chart, { onEnded });
    const [isHovered, setIsHovered] = useState(false);

    const { lineHeightPx, fontSize } = computePlayerLyricSizes(settings.height);

    const showOverlay = !engine.isPlaying || isHovered;
    const overlayBg = engine.isPlaying
        ? 'rgba(0,0,0,0)'
        : 'rgba(0,0,0,0.45)';

    return (
        <div className="max-w-full overflow-hidden rounded-2xl shadow-2xl border border-white/10">
            <div
                style={{
                    width: settings.width,
                    height: settings.height,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#000',
                    backgroundImage: chart.properties.backgroundImageUrl
                        ? `url(${chart.properties.backgroundImageUrl})`
                        : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {chart.properties.audioUrl && (
                    <audio ref={engine.audioRef} src={chart.properties.audioUrl} />
                )}

                {/* Lyrics area */}
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                    <div style={{ flex: 1, display: 'flex', pointerEvents: 'none' }}>
                        <ChartLyrics
                            chart={chart}
                            engine={engine}
                            lineHeightPx={lineHeightPx}
                            fontSize={fontSize}
                        />
                    </div>

                    {/* Play/pause overlay — sits above lyrics, below controls */}
                    <div
                        onClick={engine.togglePlayPause}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: overlayBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background-color backdrop-filter opacity 0.2s ease',
                            backdropFilter: engine.isPlaying ? '' : 'blur(2px)',
                            opacity: showOverlay ? 1 : 0,
                            pointerEvents: 'all',
                        }}
                    >   
                        {/* Play/pause icon — sits above lyrics, below controls */}
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)',
                                transition: 'transform 0.15s ease, opacity 0.15s ease',
                                transform: engine.isPlaying ? 'scale(0.85)' : 'scale(1)',
                                opacity: showOverlay ? (engine.isPlaying ? 0.75 : 1) : 0
                            }}
                        >
                            {engine.isPlaying ? (
                                // Pause icon
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                    <rect x="5" y="3" width="4" height="18" rx="1" />
                                    <rect x="15" y="3" width="4" height="18" rx="1" />
                                </svg>
                            ) : (
                                // Play icon
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 3 }}>
                                    <polygon points="5,3 19,12 5,21" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>

                <ChartControls
                    currentTime={engine.currentTime}
                    duration={chart.properties.duration}
                    isPlaying={engine.isPlaying}
                    onTogglePlayPause={engine.togglePlayPause}
                    onSeek={engine.seek}
                />
            </div>
        </div>
    );
}