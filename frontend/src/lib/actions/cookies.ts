'use server';

import { cookies } from 'next/headers';
import { COOKIE } from '../types/enums';

interface CookieOptions {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
}

const defaultOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
};

export async function setCookie(type: COOKIE, value: string, options?: CookieOptions) {
    const cookieStore = await cookies();
    cookieStore.set(type, value, { ...defaultOptions, ...options });
}

export async function getCookie(type: COOKIE): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(type)?.value ?? null;
}

export async function deleteCookie(type: COOKIE) {
    const cookieStore = await cookies();
    cookieStore.delete(type);
}

export async function hasCookie(type: COOKIE): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.has(type);
}