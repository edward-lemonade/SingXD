import BrowsePageClient from './BrowsePageClient';
import * as ChartAPI from '@/src/lib/api/ChartAPI';

const PAGE_SIZE = 12;

export default async function BrowsePage() {
	const page = 1;
	const search = '';
	const res = await ChartAPI.listCharts(page, PAGE_SIZE, search);

	return (
		<BrowsePageClient
			initialCharts={res.charts}
			initialTotal={res.total}
			initialPage={page}
			initialSearch={search}
		/>
	);
}