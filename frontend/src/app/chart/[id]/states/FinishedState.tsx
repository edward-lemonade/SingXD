import { WsSummaryMsg } from '@/src/lib/api/GameAPI';
import { Chart } from '@/src/lib/types/models';
import { IntroPane } from './shared';

function formatPercent(x: number) {
    if (!Number.isFinite(x)) return '—';
    return `${(x * 100).toFixed(1)}%`;
}

function SummaryPane({ summary }: { summary: WsSummaryMsg | null }) {
    const scores = summary?.chunkScores?.map(s => s.score).filter(Number.isFinite) ?? [];
    const chunkCount = scores.length;
    const avg = chunkCount > 0 ? scores.reduce((a, b) => a + b, 0) / chunkCount : null;
    const sorted = chunkCount > 0 ? [...scores].sort((a, b) => a - b) : [];
    const median =
        chunkCount === 0
            ? null
            : chunkCount % 2 === 1
              ? sorted[(chunkCount - 1) / 2]
              : (sorted[chunkCount / 2 - 1] + sorted[chunkCount / 2]) / 2;
    const min = chunkCount > 0 ? sorted[0] : null;
    const max = chunkCount > 0 ? sorted[sorted.length - 1] : null;

    return (
        <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-6 text-white shadow-2xl">
            <h2 className="text-2xl font-bold drop-shadow">Summary</h2>
            <div className="mt-4 grid grid-cols-1 gap-4">
                <div className="rounded-xl bg-black/25 border border-white/10 p-4">
                    <div className="text-white/70 text-xs uppercase tracking-wide">Total score</div>
                    <div className="mt-1 text-3xl font-extrabold">{formatPercent(summary?.totalScore ?? NaN)}</div>
                </div>
                <div className="rounded-xl bg-black/25 border border-white/10 p-4">
                    <div className="text-white/70 text-xs uppercase tracking-wide">Average</div>
                    <div className="mt-1 text-2xl font-bold">{avg == null ? '—' : formatPercent(avg)}</div>
                </div>
            </div>
            {summary == null && (
                <p className="mt-4 text-white/70 text-sm">
                    No summary available yet. Finish a run to see stats here.
                </p>
            )}
        </div>
    );
}

export default function FinishedState({
    chart,
    summary,
    onPlay,
}: {
    chart: Chart;
    summary: WsSummaryMsg | null;
    onPlay: () => void;
}) {
    return (
        <div className="relative z-10 w-full flex flex-col md:flex-row items-stretch gap-6 md:gap-0">
            <div className="flex-1 flex items-center justify-center p-6">
                <IntroPane chart={chart} isFinished={true} onPlay={onPlay} />
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-xl">
                    <SummaryPane summary={summary} />
                </div>
            </div>
        </div>
    );
}

