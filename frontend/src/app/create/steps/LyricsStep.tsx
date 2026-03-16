'use client';

import Card from '@/src/components/Card';
import { Line, Timing } from '../../../lib/types/types';
import { AudioUrls } from '../CreatePageClient';
import { SetStateAction, useMemo, useState } from 'react';
import ChartTimingEditor from '../components/ChartTimingEditor';

interface LyricsStepProps {
    lyricsString: string;
    setLyricsString: (lyrics: string) => void;
    lines: Line[];
    audioUrls: AudioUrls;
    timings: Timing[];
    setTimings: (syncPoints: SetStateAction<Timing[]>) => void;
    loading: boolean;
    handleGenerateAlignment: () => void;
}

export default function LyricsStep({
    lyricsString,
    setLyricsString,
    lines,
    audioUrls,
    timings,
    setTimings,
    loading,
    handleGenerateAlignment,
}: LyricsStepProps) {
    const [vocalsOnly, setVocalsOnly] = useState(false);
    const audioUrl = vocalsOnly ? audioUrls.vocals : audioUrls.combined;

    const flatWords = useMemo(
        () => lines.flatMap((line, lineIndex) => line.words.map(word => word.text)),
        [lines]
    );

    const [selectedTimingIndex, setSelectedTimingIndex] = useState<number | null>(null);

    return (
        <section>
            <div className="space-y-6">
                <Card className="p-6">
                    <textarea
                        value={lyricsString}
                        onChange={e => setLyricsString(e.target.value)}
                        className="w-full min-h-48 p-4 border-2 border-gray-200 rounded-md resize-y"
                        placeholder="Paste or enter lyrics here..."
                    />
                    {lyricsString && (
                        <button
                            onClick={handleGenerateAlignment}
                            disabled={loading}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            {loading ? 'Aligning...' : 'Align lyrics to audio with AI'}
                        </button>
                    )}
                </Card>

                <Card className="p-6 gap-6 flex flex-col">
                    <ChartTimingEditor
                        key={audioUrl}
                        audioUrl={audioUrl}
                        timings={timings}
                        setTimings={setTimings}
                        words={flatWords}
                        selectedIndex={selectedTimingIndex}
                        setSelectedIndex={setSelectedTimingIndex}
                    />

                    {/* Controls */}
                    <div className="flex flex-col gap-2 justify-center">
                        <button
                            onClick={() => setVocalsOnly(v => !v)}
                            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                                vocalsOnly
                                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Vocals Only
                        </button>
                    </div>
                </Card>
            </div>
        </section>
    );
}