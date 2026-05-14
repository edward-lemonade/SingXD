'use client';

import { useEffect, useState } from 'react';
import { Score } from '@/src/lib/types/models';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';
import { Logo } from '@/src/components/Logo';
import Link from 'next/link';

function formatScore(score: number) {
    if (!Number.isFinite(score)) return '—';
    return `${(score * 100).toFixed(1)}%`;
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
}

export default function LeaderboardState({
    chart,
    chartId,
    onBack,
}: {
    chart: PublicChart;
    chartId: number;
    onBack: () => void;
}) {
    const [leaderboard, setLeaderboard] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                setError(null);
                const scores = await ChartAPI.getChartLeaderboard(chartId);
                setLeaderboard(scores);
            } catch (err) {
                setError('Failed to load leaderboard');
                console.error('Failed to load leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [chartId]);

    return (
        <div className="relative z-10 w-full flex flex-col items-center gap-6 p-6">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Logo fontSize={40}/>
                </Link>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Leaderboard</h1>
            </div>

            <button
                onClick={onBack}
                className="px-6 py-2 rounded-full text-sm font-semibold bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-sm border border-white/30"
            >
                ← Back
            </button>

            <div className="w-full max-w-2xl rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-6 text-white shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 drop-shadow">Top 10 Scores</h2>

                {loading && (
                    <div className="text-center text-white/70 py-8">
                        Loading leaderboard...
                    </div>
                )}

                {error && (
                    <div className="text-center text-red-400 py-8">
                        {error}
                    </div>
                )}

                {!loading && leaderboard.length === 0 && (
                    <div className="text-center text-white/70 py-8">
                        No scores yet. Be the first to play!
                    </div>
                )}

                {!loading && leaderboard.length > 0 && (
                    <div className="space-y-2">
                        {leaderboard.map((score, index) => (
                            <div
                                key={score.id}
                                className="flex items-center gap-4 p-4 rounded-lg bg-black/25 border border-white/10 hover:bg-black/40 transition-colors"
                            >
                                <div className="shrink-0 w-8 text-center font-bold text-lg">
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                    {index > 2 && <span className="text-white/70">#{index + 1}</span>}
                                </div>
                                <div className="grow">
                                    <div className="text-sm text-white/70">User ID: {score.uid}</div>
                                    <div className="text-xs text-white/50">{formatDate(score.createdAt)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{formatScore(score.score)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
