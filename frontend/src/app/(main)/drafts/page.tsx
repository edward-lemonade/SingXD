import { redirect } from 'next/navigation';
import * as DraftAPI from '@/src/lib/api/DraftAPI';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import DraftsPageClient from './DraftsPageClient';

export default async function DraftsPage() {
    const [drafts, charts] = await Promise.all([
        DraftAPI.listDrafts(),
        ChartAPI.listMyCharts(),
    ]).catch(() => {
        redirect('/');
    });

    return <DraftsPageClient initialDrafts={drafts} initialCharts={charts} />;
}