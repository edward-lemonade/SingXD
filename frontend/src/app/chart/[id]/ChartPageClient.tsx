'use client';

import { useState, useEffect } from 'react';
import ChartGame from '@/src/components/ChartGame';
import { preloadVocals, WsSummaryMsg } from '@/src/lib/api/GameAPI';
import { Chart } from '@/src/lib/types/types';

type GameState = 'idle' | 'playing' | 'finished';

interface ChartPageClientProps {
  chart: Chart | null;
  chartId: number;
}

export default function ChartPageClient({ chart, chartId }: ChartPageClientProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
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

  if (gameState === 'playing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChartGame
          chart={chart}
          chartId={chartId}
          onQuit={summary => {
            if (summary) setLastSummary(summary);
            setGameState('idle');
          }}
          onFinished={summary => {
            if (summary) setLastSummary(summary);
            setGameState('finished');
          }}
        />
      </div>
    );
  }

  const isFinished = gameState === 'finished';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 gap-6"
      style={{
        backgroundImage: chart.properties.backgroundImageUrl
          ? `url(${chart.properties.backgroundImageUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {isFinished && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl">🎉</span>
            <h2 className="text-3xl font-bold text-white drop-shadow">Nice work!</h2>
            <p className="text-white/70 text-sm">You finished the chart</p>
            {lastSummary != null && (
              <p className="text-white font-semibold text-lg mt-2">
                Total score: {(lastSummary.totalScore * 100).toFixed(1)}%
              </p>
            )}
          </div>
        )}

        {!isFinished && (
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            {chart.properties.title ?? 'Chart'}
          </h1>
        )}

        <button
          onClick={() => {
            setLastSummary(null);
            setGameState('playing');
          }}
          className="flex items-center gap-3 px-8 py-4 rounded-full text-xl font-bold shadow-2xl transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: '#FFD700', color: '#000' }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: '18px solid #000',
              marginRight: '2px',
            }}
          />
          {isFinished ? 'Play Again' : 'Play'}
        </button>
      </div>
    </div>
  );
}
