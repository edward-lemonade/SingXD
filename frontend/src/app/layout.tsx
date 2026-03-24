import type { Metadata } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';
import Providers from './providers';

import '@/src/lib/middleware/auth';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700', '900'],
    variable: '--font-inter',
    display: 'swap',
});

const bebas = Bebas_Neue({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-bebas',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'SingXD',
    description: 'Create and play karaoke charts',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
