import { useEffect, useState } from 'react';
import { Score } from '@/src/lib/types/models';
import * as ScoreAPI from '@/src/lib/api/ScoreAPI';

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

export function UserScoresPane({ chartId }: { chartId: number }) {
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchScores = async () => {
            try {
                setLoading(true);
                setError(null);
                const userScores = await ScoreAPI.getMyScoresForChart(chartId);
                // Sort by score descending and take top 3
                const topScores = userScores.sort((a, b) => b.score - a.score).slice(0, 3);
                setScores(topScores);
            } catch (err) {
                setError('Failed to load your scores');
                console.error('Failed to load user scores:', err);
                setScores([]);
            } finally {
                setLoading(false);
            }
        };

        fetchScores();
    }, [chartId]);

    return (
        <div className="w-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-6 text-white shadow-2xl">
            <h2 className="text-xl font-bold drop-shadow mb-4">Your Best Scores</h2>

            {loading && (
                <div className="text-white/70 text-sm py-4">Loading your scores...</div>
            )}

            {error && (
                <div className="text-red-400 text-sm py-4">{error}</div>
            )}

            {!loading && scores.length === 0 && (
                <div className="text-white/70 text-sm py-4">No scores yet. Play to set your first score!</div>
            )}

            {!loading && scores.length > 0 && (
                <div className="space-y-2">
                    {scores.map((score, index) => (
                        <div
                            key={score.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-black/25 border border-white/10"
                        >
                            <div className="text-sm">
                                <span className="font-semibold">#{index + 1}</span>
                                <span className="text-white/70 ml-2 text-xs">{formatDate(score.createdAt)}</span>
                            </div>
                            <div className="text-lg font-bold">{formatScore(score.score)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
