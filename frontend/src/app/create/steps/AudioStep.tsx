'use client';

import Card from '@/src/components/Card';
import { AudioUrls } from '../CreatePageClient';

interface AudioStepProps {
    audioUrls: AudioUrls;
    setAudioUrls: React.Dispatch<React.SetStateAction<AudioUrls>>;
    separateLoading: boolean;
    instrumentalUploading: boolean;
    vocalsUploading: boolean;
    handleSeparateAudio: () => void;
    handleUploadInstrumental: (file: File) => void;
    handleUploadVocals: (file: File) => void;
}

export default function AudioStep({
    audioUrls,
    setAudioUrls,
    separateLoading,
    instrumentalUploading,
    vocalsUploading,
    handleSeparateAudio,
    handleUploadInstrumental,
    handleUploadVocals,
}: AudioStepProps) {
    return (
        <section>
            <div className="space-y-6">
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">
                        Upload Combined Audio (Optional - for AI Separation)
                    </h3>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file)
                                setAudioUrls(prev => ({
                                    ...prev,
                                    combined: URL.createObjectURL(file),
                                }));
                        }}
                        className="mb-4"
                    />
                    {audioUrls.combined && (
                        <>
                            <div className="mt-2">
                                <audio controls src={audioUrls.combined} className="mt-1" />
                            </div>
                            <button
                                onClick={handleSeparateAudio}
                                disabled={separateLoading}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                {separateLoading ? 'Separating...' : 'Separate into Stems'}
                            </button>
                        </>
                    )}
                </Card>
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Audio Stems</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-2">Instrumental</label>
                            <input
                                type="file"
                                accept="audio/*"
                                disabled={instrumentalUploading}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadInstrumental(file);
                                }}
                            />
                            {instrumentalUploading && (
                                <p className="text-sm text-gray-500 mt-1">Uploading…</p>
                            )}
                            {audioUrls.instrumental && (
                                <audio controls src={audioUrls.instrumental} className="mt-2" />
                            )}
                        </div>
                        <div>
                            <label className="block mb-2">Vocals</label>
                            <input
                                type="file"
                                accept="audio/*"
                                disabled={vocalsUploading}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadVocals(file);
                                }}
                            />
                            {vocalsUploading && (
                                <p className="text-sm text-gray-500 mt-1">Uploading…</p>
                            )}
                            {audioUrls.vocals && (
                                <audio controls src={audioUrls.vocals} className="mt-2" />
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </section>
    );
}
