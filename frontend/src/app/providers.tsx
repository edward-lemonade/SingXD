'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef, type ReactNode } from 'react';
import { AuthProvider } from '../lib/context/AuthContext';

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5,
            },
        },
    });
}

let browserClient: QueryClient | undefined;

function getQueryClient() {
    if (typeof window === 'undefined') return makeQueryClient(); // server: always fresh
    return (browserClient ??= makeQueryClient());               // browser: singleton
}

export default function Providers({ children }: { children: ReactNode }) {
    const client = useRef(getQueryClient());
    return (
        <AuthProvider>
            <QueryClientProvider client={client.current}>
                {children}
            </QueryClientProvider>
        </AuthProvider>
    );
}