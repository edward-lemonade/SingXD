'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from '../lib/context/AuthContext';

export const makeQueryClient = () => new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 min
		}
	}
})

export default function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => makeQueryClient());
	return (
		<AuthProvider>
			<QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
		</AuthProvider>
	);
}
