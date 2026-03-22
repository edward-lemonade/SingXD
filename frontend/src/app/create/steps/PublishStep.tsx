'use client';

import Card from '@/src/components/Card';
import { DraftChart, ChartProperties } from '@/src/lib/types/models';
import { SetStateAction } from 'react';

interface PublishStepProps {
    chart: DraftChart;
    chartProps: ChartProperties;
    setChartProps: (video: SetStateAction<ChartProperties>) => void;
    loading: boolean;
    handlePublish: () => void;
}

export default function PublishStep({
    chart,
    chartProps,
    setChartProps,
    loading,
    handlePublish,
}: PublishStepProps) {
    return (
        <section>
            <Card className="p-6 space-y-4 flex flex-row">
                <div className="flex flex-col">
                    <div>
                        <label className="block mb-2">Chart Title</label>
                        <input
                            type="text"
                            value={chartProps.title}
                            onChange={e =>
                                setChartProps(prev => ({ ...prev, title: e.target.value }))
                            }
                            className="border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Song Title</label>
                        <input
                            type="text"
                            value={chartProps.songTitle}
                            onChange={e =>
                                setChartProps(prev => ({ ...prev, songTitle: e.target.value }))
                            }
                            className="border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Song Artist</label>
                        <input
                            type="text"
                            value={chartProps.artist}
                            onChange={e =>
                                setChartProps(prev => ({ ...prev, artist: e.target.value }))
                            }
                            className="border p-2 rounded"
                        />
                    </div>
                    <button
                        onClick={handlePublish}
                        disabled={loading}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        {loading ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </Card>
        </section>
    );
}
