'use client';

import Card from '@/src/components/Card';
import ChartPlayer from '@/src/components/ChartPlayer';
import { ChartDraft, ChartProperties } from '@/src/lib/types/types';
import { SetStateAction } from 'react';

type VideoStepProps = {
    chart: ChartDraft;
    chartProps: ChartProperties;
    setChartProps: (video: SetStateAction<ChartProperties>) => void;
    onBackgroundImageFileSelect: (file: File) => void | Promise<void>;
    backgroundImageUploading: boolean;
    backgroundImageError: string | null;
};

export default function VideoStep({
    chart,
    chartProps,
    setChartProps,
    onBackgroundImageFileSelect,
    backgroundImageUploading,
    backgroundImageError,
}: VideoStepProps) {
    const onBackgroundImageFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onBackgroundImageFileSelect(file);
        e.target.value = '';
    };

    return (
        <section>
            <Card className="p-6 space-y-4 flex flex-row">
                <div className="flex flex-col">
                    <div>
                        <label className="block mb-2">Font</label>
                        <select
                            value={chartProps.font}
                            onChange={e =>
                                setChartProps(prev => ({ ...prev, font: e.target.value }))
                            }
                            className="border p-2 rounded"
                        >
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2">Text Size</label>
                        <input
                            type="number"
                            value={chartProps.textSize}
                            onChange={e =>
                                setChartProps(prev => ({
                                    ...prev,
                                    textSize: parseInt(e.target.value),
                                }))
                            }
                            className="border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Text Color</label>
                        <input
                            type="color"
                            value={chartProps.textColor}
                            onChange={e =>
                                setChartProps(prev => ({ ...prev, textColor: e.target.value }))
                            }
                            className="border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block mb-2">Background Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onBackgroundImageFileInputChange}
                            disabled={backgroundImageUploading}
                        />
                        {backgroundImageUploading && (
                            <p className="text-sm text-gray-500 mt-1">Uploading…</p>
                        )}
                        {backgroundImageError && (
                            <p className="text-sm text-red-500 mt-1">{backgroundImageError}</p>
                        )}
                    </div>
                </div>

                <ChartPlayer chart={chart} />
            </Card>
        </section>
    );
}
