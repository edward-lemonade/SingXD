import { useState } from 'react';
import { useChartEngine } from '../internal/useChartEngine';
import ChartLyrics from '../internal/ChartLyrics';
import ChartControls from './Controls';
import { ChartDraft } from '@/src/lib/types/models';

export interface ChartPreviewSettings {
    width: number;
    height: number;
}

const defaultPlayerSettings: ChartPreviewSettings = {
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

interface ChartPreviewProps {
    chart: ChartDraft;
    playerSettings?: Partial<ChartPreviewSettings>;
    onEnded?: () => void;
}

export default function ChartPreview({ chart, playerSettings: partial, onEnded }: ChartPreviewProps) {
    const settings = { ...defaultPlayerSettings, ...partial };
    const engine = useChartEngine(chart, { onEnded });
    const [isHovered, setIsHovered] = useState(false);

    const { lineHeightPx, fontSize } = computePlayerLyricSizes(settings.height);

    const showOverlay = !engine.isPlaying;
    const showButton = !engine.isPlaying || isHovered;

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

                    {/* Play/pause overlay */}
                    <div
                        onClick={engine.togglePlayPause}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            cursor: 'pointer',
                            transition: 'background-color backdrop-filter opacity 0.2s ease',
                            backgroundColor: showOverlay ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
                            backdropFilter: showOverlay ? 'blur(2px)' : '',
                            pointerEvents: 'all',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            paddingTop: '20%', // pushes it into the upper half
                        }}
                    >
                        {/* Preview label */}
                        <span
                            style={{
                                color: 'white',
                                fontSize: 20,
                                textShadow: '0 0 4px #000000',
                                opacity: showOverlay ? 1 : 0,
                                transition: 'opacity 0.15s ease',
                                userSelect: 'none',
                            }}
                        >
                            Preview
                        </span>
                    </div>

                    {/* Play/pause button */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: showButton ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                            pointerEvents: 'none',
                        }}
                    >
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
                                transition: 'transform opacity 0.15s ease',
                                transform: engine.isPlaying ? 'scale(0.85)' : 'scale(1)',
                                opacity: engine.isPlaying ? 0.75 : 1,
                            }}
                        >
                            {engine.isPlaying ? (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                    <rect x="5" y="3" width="4" height="18" rx="1" />
                                    <rect x="15" y="3" width="4" height="18" rx="1" />
                                </svg>
                            ) : (
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