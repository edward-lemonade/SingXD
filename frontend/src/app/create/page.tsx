import CreateClient from './CreatePageClient';
import { cookies } from 'next/headers';
import { COOKIE } from '@/src/lib/types/enums';
import * as UserAPI from '@/src/lib/api/UserAPI';

interface PageProps {
    searchParams: Promise<{ draft?: string }>;
}

export default async function CreatePage({ searchParams }: PageProps) {
    const cookieStore = await cookies();
    const token = await cookieStore.get(COOKIE.TOKEN);
    const user = await (token ? UserAPI.getCurrentUser() : null);

    const { draft } = await searchParams;
    return <CreateClient currentUser={user} initialDraftUuid={draft} />;
}
