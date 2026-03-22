'use client';

import Link from 'next/link';
import { useAuth } from '@/src/lib/context/AuthContext';

export default function Navbar() {
    const { user, loading } = useAuth();

    return (
        <nav className="bg-black/60 backdrop-blur-sm text-white flex items-center gap-6 px-6 py-3 text-sm">
            <Link href="/" className="font-bold text-base tracking-tight hover:text-yellow-300 transition-colors">
                SingXD
            </Link>
            <Link href="/browse" className="hover:text-yellow-300 transition-colors">
                Browse
            </Link>
            <Link href="/create" className="hover:text-yellow-300 transition-colors">
                Create
            </Link>
            {!loading && user && (
                <Link href="/drafts" className="hover:text-yellow-300 transition-colors">
                    My Drafts
                </Link>
            )}
        </nav>
    );
}