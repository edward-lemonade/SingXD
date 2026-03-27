'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/lib/context/AuthContext';
import * as DraftAPI from '@/src/lib/api/DraftAPI';
import { DraftChart, PublicChart } from '@/src/lib/types/models';
import { ChartCard } from '@/src/components/ChartCard/ChartCard';
import { Card } from '@/src/components/Card/Card';

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function DraftsPageClient({
    initialDrafts,
    initialCharts,
}: {
    initialDrafts: DraftChart[];
    initialCharts: PublicChart[];
}) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [drafts, setDrafts] = useState<DraftChart[]>(initialDrafts);
    const [charts] = useState<PublicChart[]>(initialCharts);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/');
        }
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
        <div className="flex flex-col w-full h-screen py-6 gap-6">
            {error ? (
                <p className="text-red-600">{error}</p>
            ) : (
                <>
                    {/* Published charts */}
                    <div className="flex-1 basis-1/3 h-full">
                        <Card>
                            <h2 className="text-lg font-bold text-gray-800 mb-2">Published Charts</h2>
                            {charts.length === 0 ? (
                                <p className="text-gray-500 text-sm">No published charts yet.</p>
                            ) : (
                                <ScrollFade direction='x' className='pt-1 h-full'>
                                    <div className="grid grid-rows-1 grid-flow-col h-full auto-cols-[calc(25%-12px)] gap-4 overflow-visible">
                                        {charts.map(chart => (
                                            <ChartCard key={chart.id} chart={chart} />
                                        ))}
                                    </div>
                                </ScrollFade>
                            )}
                        </Card>
                    </div>

                    {/* Drafts */}
                    <div className="flex-1 basis-2/3 min-h-0 flex flex-col">
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-800">Drafts</h2>
                                <Link
                                    href="/create"
                                    className="text-xs px-3 py-1 border-2 border-green-500 text-green-600 font-semibold hover:bg-green-100 transition-colors cursor-pointer"
                                >
                                    + New Chart
                                </Link>
                            </div>
                            {drafts.length === 0 ? (
                                <div className="flex flex-col items-start gap-3">
                                    <p className="text-gray-500 text-sm">No saved drafts yet.</p>
                                </div>
                            ) : (
                                <ScrollFade direction="y">
                                    <ul className="flex flex-col gap-2 w-full">
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
                                                        className="text-xs px-3 py-1 border-2 border-black text-gray-400 font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                                                    >
                                                        Resume
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(draft.uuid)}
                                                        disabled={deletingId === draft.uuid}
                                                        className="text-xs px-3 py-1 border-2 border-red-400 text-red-600 font-semibold hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                                                    >
                                                        {deletingId === draft.uuid ? '…' : 'Delete'}
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollFade>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

function ScrollFade({ children, direction = 'y', className }: { children: React.ReactNode; direction?: 'x' | 'y'; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    const update = () => {
        const el = ref.current;
        if (!el) return;
        if (direction === 'y') {
            setAtStart(el.scrollTop <= 0);
            setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
        } else {
            setAtStart(el.scrollLeft <= 0);
            setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
        }
    };

    useEffect(() => { update(); }, []);

    const startFade = atStart ? 'black' : 'transparent';
    const endFade = atEnd ? 'black' : 'transparent';

    const mask = direction === 'y'
        ? `linear-gradient(to bottom, ${startFade} 0%, black 8%, black 92%, ${endFade} 100%)`
        : `linear-gradient(to right, ${startFade} 0%, black 8%, black 92%, ${endFade} 100%)`;

    return (
        <div
            ref={ref}
            onScroll={update}
            className={`flex-1 min-h-0 ${direction === 'y' ? 'overflow-y-auto' : 'overflow-x-auto'} ${className ?? ''}`}
            style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
            {children}
        </div>
    );
}