import { PublicChart } from '@/src/lib/types/models';
import { IntroPane } from '../components/IntroPane';
import { UserScoresPane } from '../components/UserScoresPane';

export default function InitialState({
    chart,
    chartId,
    onPlay,
    onViewLeaderboard,
}: {
    chart: PublicChart;
    chartId: number;
    onPlay: () => void;
    onViewLeaderboard: () => void;
}) {
    return (
        <div className="relative z-10 w-full flex flex-col md:flex-row items-stretch gap-6 md:gap-0">
            <div className="flex-1 flex items-center justify-center p-6">
                <IntroPane chart={chart} isFinished={false} onPlay={onPlay} onViewLeaderboard={onViewLeaderboard} />
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-xl">
                    <UserScoresPane chartId={chartId} />
                </div>
            </div>
        </div>
    );
}
