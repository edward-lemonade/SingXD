'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartCard } from '@/src/components/ChartCard/ChartCard';
import SearchBar from '@/src/components/SearchBar/SearchBar';
import * as ChartAPI from '@/src/lib/api/ChartAPI';
import { PublicChart } from '@/src/lib/types/models';
import { Card } from '@/src/components/Card/Card';

const PAGE_SIZE = 12;

interface BrowsePageClientProps {
    initialData: {
        charts: PublicChart[];
        total: number;
    };
}

export default function BrowsePageClient({ initialData }: BrowsePageClientProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const initialDataUpdatedAt = useRef(Date.now());

    const { data, isLoading, isError } = useQuery({
        queryKey: ['charts', page, PAGE_SIZE, search],
        queryFn: () => ChartAPI.listCharts(page, PAGE_SIZE, search),
        initialData: page === 1 && search === '' ? initialData : undefined,
        initialDataUpdatedAt: initialDataUpdatedAt.current,
    });

    const charts = data?.charts ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const handleSearch = (query: string) => {
        setPage(1);
        setSearch(query);
    };

    return (
        <div className="flex-1 p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full h-dvh">
            <SearchBar onSearch={handleSearch} />

            <Card>
                <div className="flex-1 min-h-0 p-4">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-gray-500 font-medium">Loading…</p>
                        </div>
                    ) : isError ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-red-600 font-medium">Failed to load charts.</p>
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