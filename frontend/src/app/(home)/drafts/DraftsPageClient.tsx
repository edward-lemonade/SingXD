'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Wallpaper from '@/src/components/Wallpaper';
import { useAuth } from '@/src/lib/context/AuthContext';
import * as DraftAPI from '@/src/lib/api/DraftAPI';
import { DraftChart } from '@/src/lib/types/models';

function formatDate(date: Date) {
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function DraftsPageClient() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [drafts, setDrafts] = useState<DraftChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/');
            return;
        }
        DraftAPI.listDrafts()
            .then(setDrafts)
            .catch(() => setError('Failed to load drafts.'))
            .finally(() => setLoading(false));
    }, [user, authLoading, router]);

    const handleDelete = async (uuid: string) => {
        if (!confirm('Delete this draft? This cannot be undone.')) return;
        setDeletingId(uuid);
        try {
            await DraftAPI.deleteDraft(uuid);
            setDrafts(prev => prev.filter(d => d.uuid !== uuid));
        } catch {
            alert('Failed to delete draft.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Wallpaper color="lavender">
            <div className="flex flex-col min-h-screen">
                <div className="bg-purple-800 text-white px-6 py-4 shrink-0 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">My Drafts</h1>
                    <Link
                        href="/create"
                        className="text-sm px-4 py-1.5 rounded bg-white/15 hover:bg-white/25 transition-colors"
                    >
                        + New Chart
                    </Link>
                </div>

                <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
                    {loading ? (
                        <p className="text-gray-500">Loading…</p>
                    ) : error ? (
                        <p className="text-red-600">{error}</p>
                    ) : drafts.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 mt-16 text-center">
                            <p className="text-gray-600">No saved drafts yet.</p>
                            <Link
                                href="/create"
                                className="px-5 py-2 bg-purple-700 text-white font-semibold rounded hover:bg-purple-600 transition-colors"
                            >
                                Start a new chart
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {drafts.map(draft => (
                                <li
                                    key={draft.uuid}
                                    className="bg-white border-4 border-black flex items-center justify-between px-5 py-4"
                                >
                                    <div>
                                        <p className="font-bold text-black">
                                            {draft.properties.title || 'Untitled'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {draft.properties.songTitle
                                                ? `${draft.properties.songTitle}${draft.properties.artist ? ` — ${draft.properties.artist}` : ''}`
                                                : 'No song info'}
                                            {' · '}Updated {formatDate(draft.updatedAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={`/create?draft=${draft.uuid}`}
                                            className="text-sm px-4 py-1.5 border-2 border-black font-semibold hover:bg-gray-100 transition-colors"
                                        >
                                            Resume
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(draft.uuid)}
                                            disabled={deletingId === draft.uuid}
                                            className="text-sm px-4 py-1.5 border-2 border-red-400 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            {deletingId === draft.uuid ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Wallpaper>
    );
}