import HomePageClient from './HomePageClient';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';

const DISPLAYED_CHARTS = [1, 2, 3];

// TODO: check user, fetch level history and pass into Client
export default async function HomePage() {
    const results = await Promise.allSettled(
        DISPLAYED_CHARTS.map(id => ChartAPI.getChart(id))
    );

    const initialSlides: (PublicChart | null)[] = results.map(r =>
        r.status === 'fulfilled' ? r.value : null
    );

    return <HomePageClient initialSlides={initialSlides} />;
}