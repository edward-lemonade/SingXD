import { getSessionUser } from '@/src/lib/server/CookieService';
import DraftsPageClient from './DraftsPageClient';

export default async function DraftsPage() {
    const currentUser = await getSessionUser();
    return <DraftsPageClient />;
}
