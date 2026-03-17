import { useChartEngine } from '../internal/useChartEngine';
import ChartLyrics from '../internal/ChartLyrics';
import ChartControls from './Controls';
import { ChartDraft } from '@/src/lib/types/types';

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

    const { lineHeightPx, fontSize } = computePlayerLyricSizes(settings.height);

    return (
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

            <div style={{ flex: 1, display: 'flex', pointerEvents: 'none' }}>
                <ChartLyrics
                    chart={chart}
                    engine={engine}
                    lineHeightPx={lineHeightPx}
                    fontSize={fontSize}
                />
            </div>

            <ChartControls
                currentTime={engine.currentTime}
                duration={chart.properties.duration}
                isPlaying={engine.isPlaying}
                onTogglePlayPause={engine.togglePlayPause}
                onSeek={engine.seek}
            />
        </div>
    );
}