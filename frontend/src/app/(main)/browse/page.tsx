'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChartCard } from '@/src/components/ChartCard/ChartCard';
import SearchBar from '@/src/components/SearchBar/SearchBar';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';

const PAGE_SIZE = 12;

export default function BrowsePage() {
    const [charts, setCharts] = useState<PublicChart[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
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

    const handleSearch = (query: string) => {
        setPage(1);
        setSearch(query);
    };

    return (
        <div className="flex-1 p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
            <SearchBar onSearch={handleSearch} />

            {!loading && !error && (
                <p className="text-sm text-gray-600 -mt-2">
                    {total === 0
                        ? 'No charts found.'
                        : `${total} chart${total !== 1 ? 's' : ''}${search ? ` for "${search}"` : ''}`}
                </p>
            )}

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
    );
}
