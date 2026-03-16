import { useChartEngine } from './useChartEngine';
import ChartLyrics from './internal/ChartLyrics';
import ChartControls from './internal/ChartControls';
import { ChartDraft } from '@/src/lib/types/types';

export interface ChartPlayerSettings {
    width: number;
    height: number;
}

const defaultPlayerSettings: ChartPlayerSettings = {
    width: 720,
    height: 720,
};

interface ChartPlayerProps {
    chart: ChartDraft;
    playerSettings?: Partial<ChartPlayerSettings>;
    onEnded?: () => void;
}

export default function ChartPlayer({ chart, playerSettings: partial, onEnded }: ChartPlayerProps) {
    const settings = { ...defaultPlayerSettings, ...partial };

    const engine = useChartEngine(chart, { onEnded });

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

            <ChartLyrics
                chart={chart}
                currentLineIndex={engine.currentLineIndex}
                currentWordIndex={engine.currentWordIndex}
                displayLines={engine.displayLines}
            />

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