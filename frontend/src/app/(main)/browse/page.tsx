import BrowsePageClient from './BrowsePageClient';
import * as ChartAPI from '@/src/lib/api/ChartAPI';

const PAGE_SIZE = 12;

export default async function BrowsePage() {
    const res = await ChartAPI.listCharts(1, PAGE_SIZE, '');

    return (
        <BrowsePageClient initialData={res} />
    );
}