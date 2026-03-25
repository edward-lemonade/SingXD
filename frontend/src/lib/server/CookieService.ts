import { cookies } from 'next/headers';
import { getCurrentUser } from '../api/UserAPI';

export const SESSION_COOKIE_NAME = 'singxd_session';

export async function getSessionCookieValue(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function hasSessionCookie(): Promise<boolean> {
    const value = await getSessionCookieValue();
    return Boolean(value);
}

export async function getSessionUser() {
    const value = await getSessionCookieValue();
    const cookieHeader = value ? `${SESSION_COOKIE_NAME}=${value}` : undefined;
    return getCurrentUser(cookieHeader).catch(() => null);
}