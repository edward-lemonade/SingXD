'use client';

import { useState, useEffect } from 'react';
import { preloadVocals, WsSummaryMsg } from '@/src/lib/api/GameAPI';
import { PublicChart } from '@/src/lib/types/models';
import InitialState from './states/InitialState';
import PlayingState from './states/PlayingState';
import FinishedState from './states/FinishedState';
import LeaderboardState from './states/LeaderboardState';

enum GameState {
    INITIAL,
    PLAYING,
    FINISHED,
    LEADERBOARD,
}

interface ChartPageClientProps {
    chart: PublicChart | null;
    chartId: number;
}

export default function ChartPageClient({ chart, chartId }: ChartPageClientProps) {
    const [gameState, setGameState] = useState<GameState>(GameState.INITIAL);
    const [lastSummary, setLastSummary] = useState<WsSummaryMsg | null>(null);

    useEffect(() => {
        if (!chart?.properties.audioUrl) return;
        preloadVocals(chartId).catch(err =>
            console.warn('[ChartPageClient] preload vocals failed', err)
        );
    }, [chartId, chart?.properties.audioUrl]);

    if (!chart) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-600">Chart not found</p>
            </div>
        );
    }

    const onPlay = () => {
        setLastSummary(null);
        setGameState(GameState.PLAYING);
    };

    const onViewLeaderboard = () => {
        setGameState(GameState.LEADERBOARD);
    };

    const onBackFromLeaderboard = () => {
        setGameState(GameState.INITIAL);
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center gap-6"
            style={{
                backgroundImage: chart.properties.backgroundImageUrl
                    ? `url(${chart.properties.backgroundImageUrl})`
                    : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 bg-black/60" />
            {gameState === GameState.INITIAL && <InitialState chart={chart} chartId={chartId} onPlay={onPlay} onViewLeaderboard={onViewLeaderboard} />}
            {gameState === GameState.PLAYING && (
                <PlayingState
                    chart={chart}
                    chartId={chartId}
                    onQuit={summary => {
                        if (summary) setLastSummary(summary);
                        setGameState(GameState.INITIAL);
                    }}
                    onFinished={summary => {
                        if (summary) setLastSummary(summary);
                        setGameState(GameState.FINISHED);
                    }}
                />
            )}
            {gameState === GameState.FINISHED && (
                <FinishedState chart={chart} chartId={chartId} summary={lastSummary} onPlay={onPlay} onViewLeaderboard={onViewLeaderboard} />
            )}
            {gameState === GameState.LEADERBOARD && (
                <LeaderboardState chart={chart} chartId={chartId} onBack={onBackFromLeaderboard} />
            )}
        </div>
    );
}
