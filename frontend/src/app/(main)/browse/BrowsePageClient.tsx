'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChartCard } from '@/src/components/ChartCard/ChartCard';
import SearchBar from '@/src/components/SearchBar/SearchBar';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';
import { Card } from '@/src/components/Card/Card';

const PAGE_SIZE = 12;

export interface BrowsePageProps {
    initialCharts: PublicChart[],
    initialTotal: number,
    initialPage: number,
    initialSearch: string,
}

export default function BrowsePage({ initialCharts, initialTotal, initialPage, initialSearch }: BrowsePageProps) {
    const [charts, setCharts] = useState<PublicChart[]>(initialCharts);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(initialPage);
    const [search, setSearch] = useState(initialSearch);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isInitialRender = useRef(true);
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
        if (isInitialRender.current) {
            isInitialRender.current = false;
            setLoading(false);
            return;
        }

        fetchCharts(page, search);
    }, [page, search, fetchCharts]);

    const handleSearch = (query: string) => {
        setPage(1);
        setSearch(query);
    };

    return (
        <div className="flex-1 p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full h-dvh">
            <SearchBar onSearch={handleSearch} />

            <Card>
                <div className="flex-1 min-h-0 p-4">
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
                        <div className="grid grid-rows-3 grid-cols-4 gap-4 h-full">
                            {charts.map(chart => (
                                <ChartCard key={chart.id} chart={chart} />
                            ))}
                        </div>
                    )}
                </div>
            </Card>
            
            <div className="flex items-center justify-center gap-4 mt-auto">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-2 border-black text-black bg-blend-color px-4 font-bold disabled:opacity-40 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
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
                    className="border-2 border-black text-black bg-white px-4 font-bold disabled:opacity-40 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
                    aria-label="Next page"
                >
                    →
                </button>
            </div>
        </div>
    );
}
