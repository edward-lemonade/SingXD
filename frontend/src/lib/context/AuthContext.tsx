'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getIdToken, type User } from 'firebase/auth';
import { onAuthChanged } from '../api/AuthAPI';
import { COOKIE } from '../types/enums';
import { deleteCookie, setCookie } from '../actions/cookies';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    loggingOut: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    loggingOut: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const router = useRouter();

    useEffect(() => {
        return onAuthChanged(async u => {
            setUser(u);
            try {
                if (u) {
                    const token = await getIdToken(u);
                    if (token) await setCookie(COOKIE.TOKEN, token);
                } else {
                    await deleteCookie(COOKIE.TOKEN);
                }
            } catch (err) {
                console.error('Failed to sync auth cookie', err);
            } finally {
                setLoading(false);
            }
        });
    }, []);

    useEffect(() => {
        const onLogoutStart = () => setLoggingOut(true);
        const onLogoutEnd = () => {
            router.refresh();
            setLoggingOut(false);
        };

        window.addEventListener('singxd:auth-logout-start', onLogoutStart);
        window.addEventListener('singxd:auth-logout-end', onLogoutEnd);
        return () => {
            window.removeEventListener('singxd:auth-logout-start', onLogoutStart);
            window.removeEventListener('singxd:auth-logout-end', onLogoutEnd);
        };
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, loading, loggingOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);