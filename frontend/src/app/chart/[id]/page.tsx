import ChartPageClient from './ChartPageClient';
import * as ChartAPI from '@/src/lib/api/ChartAPI';

interface PageProps {
  id: string;
}

export default async function Page({ params }: { params: Promise<PageProps> }) {
  const { id } = await params;
  const chartId = Number(id);

  let chart;
  try {
    const res = await ChartAPI.getChart(chartId);
    chart = res.chart;
  } catch (err) {
    chart = null;
  }
  return <ChartPageClient chart={chart} chartId={chartId} />;
}
