'use client';

import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { AuthProvider } from '../lib/context/AuthContext';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </AuthProvider>
    );
}
