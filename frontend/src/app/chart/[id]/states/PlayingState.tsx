import { ChartGame } from '@/src/components/Chart';
import { WsSummaryMsg } from '@/src/lib/api/GameAPI';
import { PublicChart } from '@/src/lib/types/models';

export default function PlayingState({
    chart,
    chartId,
    onQuit,
    onFinished,
}: {
    chart: PublicChart;
    chartId: number;
    onQuit: (summary?: WsSummaryMsg) => void;
    onFinished: (summary?: WsSummaryMsg) => void;
}) {
    return <ChartGame chart={chart} chartId={chartId} onQuit={onQuit} onFinished={onFinished} />;
}
