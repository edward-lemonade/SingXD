'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Wallpaper from '@/src/components/Wallpaper';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';

const PAGE_SIZE = 12;

function ChartCard({ chart }: { chart: PublicChart }) {
    const title = chart.properties.title || 'Untitled';
    const artist = chart.properties.artist || '';
    const songTitle = chart.properties.songTitle || '';
    const bg = chart.properties.backgroundImageUrl;

    return (
        <Link href={`/chart/${chart.id}`} className="group block">
            <div className="bg-white border-4 border-black overflow-hidden transition-transform duration-150 group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div
                    className="h-40 bg-purple-900 relative overflow-hidden"
                    style={
                        bg
                            ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : undefined
                    }
                >
                    {!bg && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <svg viewBox="0 0 24 24" fill="white" className="w-16 h-16">
                                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                            </svg>
                        </div>
                    )}
                    {bg && <div className="absolute inset-0 bg-black/30" />}
                </div>
                <div className="p-3">
                    <p className="font-bold text-black truncate leading-tight">{title}</p>
                    {songTitle && (
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                            {songTitle}{artist ? ` — ${artist}` : ''}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default function BrowsePageClient() {
    const [charts, setCharts] = useState<PublicChart[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const fetchCharts = useCallback(async (p: number, q: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await ChartAPI.listCharts(p, PAGE_SIZE, q);
            setCharts(res.charts);
            setTotal(res.total);
        } catch {
            setError('Failed to load charts.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCharts(page, search);
    }, [page, search, fetchCharts]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(inputValue.trim());
    };

    return (
        <Wallpaper color="lavender">
            <div className="flex flex-col min-h-screen">
                {/* Top bar */}
                <div className="bg-purple-800 text-white px-6 py-4 shrink-0">
                    <h1 className="text-2xl font-bold">Browse</h1>
                </div>

                <div className="flex-1 p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Search by title, song, or artist…"
                            className="flex-1 border-4 border-black bg-white px-4 py-2 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            type="submit"
                            className="bg-purple-800 text-white border-4 border-black px-5 py-2 font-bold hover:bg-purple-700 transition-colors"
                        >
                            Search
                        </button>
                    </form>

                    {/* Results meta */}
                    {!loading && !error && (
                        <p className="text-sm text-gray-600 -mt-2">
                            {total === 0
                                ? 'No charts found.'
                                : `${total} chart${total !== 1 ? 's' : ''}${search ? ` for "${search}"` : ''}`}
                        </p>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-gray-500 font-medium">Loading…</p>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-red-600 font-medium">{error}</p>
                        </div>
                    ) : charts.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-gray-500 font-medium">No charts found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {charts.map(chart => (
                                <ChartCard key={chart.id} chart={chart} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && !error && totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-auto pt-4">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-4 border-black bg-white px-4 py-2 font-bold disabled:opacity-40 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                ←
                            </button>
                            <span className="font-semibold text-black">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="border-4 border-black bg-white px-4 py-2 font-bold disabled:opacity-40 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Wallpaper>
    );
}