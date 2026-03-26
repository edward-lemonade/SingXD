import { getSessionUser } from '@/src/lib/server/CookieService';
import CreateClient from './CreatePageClient';

interface PageProps {
    searchParams: Promise<{ uuid?: string }>;
}

export default async function CreatePage({ searchParams }: PageProps) {
    const currentUser = await getSessionUser();
    const { uuid } = await searchParams;
    return <CreateClient currentUser={currentUser} initialDraftUuid={uuid} />;
}
