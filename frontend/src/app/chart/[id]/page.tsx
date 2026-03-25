import ChartPageClient from './ChartPageClient';
import * as ChartAPI from '@/src/lib/api/ChartAPI';

interface PageProps {
    id: number;
}

export default async function ChartPage({ params }: { params: Promise<PageProps> }) {
    // TODO: check user, fetch stats/history, pass into Client
    // TODO: display "info", such as lyrics (good for SEO)
    // TODO: display "social", such as comments and leaderboards

    const { id } = await params;
    const chartId = id;

    let chart;
    try {
        const res = await ChartAPI.getChart(chartId);
        chart = res.chart;
    } catch (err) {
        chart = null;
    }
    return <ChartPageClient chart={chart} chartId={chartId} />;
}
