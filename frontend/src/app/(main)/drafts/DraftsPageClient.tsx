'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/lib/context/AuthContext';
import * as DraftAPI from '@/src/lib/api/DraftAPI';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { DraftChart, PublicChart } from '@/src/lib/types/models';
import { ChartCard } from '@/src/components/ChartCard/ChartCard';

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function DraftsPageClient() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [drafts, setDrafts] = useState<DraftChart[]>([]);
    const [charts, setCharts] = useState<PublicChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/');
            return;
        }
        Promise.all([DraftAPI.listDrafts(), ChartAPI.listMyCharts()])
            .then(([d, c]) => {
                setDrafts(d);
                setCharts(c);
            })
            .catch(() => setError('Failed to load your content.'))
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
        <div className="flex flex-col min-h-screen">
            <div className="bg-purple-800 text-white px-6 py-4 shrink-0 flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Charts</h1>
                <Link
                    href="/create"
                    className="text-sm px-4 py-1.5 rounded bg-white/15 hover:bg-white/25 transition-colors"
                >
                    + New Chart
                </Link>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-10">
                {loading ? (
                    <p className="text-gray-500">Loading…</p>
                ) : error ? (
                    <p className="text-red-600">{error}</p>
                ) : (
                    <>
                        {/* Published charts */}
                        <section>
                            <h2 className="text-lg font-bold text-gray-800 mb-4">
                                Published Charts
                            </h2>
                            {charts.length === 0 ? (
                                <p className="text-gray-500 text-sm">No published charts yet.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {charts.map(chart => (
                                        <ChartCard key={chart.id} chart={chart} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Drafts */}
                        <section>
                            <h2 className="text-lg font-bold text-gray-800 mb-4">Drafts</h2>
                            {drafts.length === 0 ? (
                                <div className="flex flex-col items-start gap-3">
                                    <p className="text-gray-500 text-sm">No saved drafts yet.</p>
                                    <Link
                                        href="/create"
                                        className="text-sm px-4 py-1.5 bg-purple-700 text-white font-semibold rounded hover:bg-purple-600 transition-colors"
                                    >
                                        Start a new chart
                                    </Link>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {drafts.map(draft => (
                                        <li
                                            key={draft.uuid}
                                            className="bg-white border-2 border-black flex items-center justify-between px-4 py-3"
                                        >
                                            <div>
                                                <p className="font-semibold text-black text-sm">
                                                    {draft.properties.title || 'Untitled'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {draft.properties.songTitle
                                                        ? `${draft.properties.songTitle}${draft.properties.artist ? ` — ${draft.properties.artist}` : ''}`
                                                        : 'No song info'}
                                                    {' · '}Updated {formatDate(draft.updatedAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Link
                                                    href={`/create?draft=${draft.uuid}`}
                                                    className="text-xs px-3 py-1 border-2 border-black font-semibold hover:bg-gray-100 transition-colors"
                                                >
                                                    Resume
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(draft.uuid)}
                                                    disabled={deletingId === draft.uuid}
                                                    className="text-xs px-3 py-1 border-2 border-red-400 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === draft.uuid ? '…' : 'Delete'}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}