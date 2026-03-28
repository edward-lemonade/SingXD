'use client';

import { Card } from '@/src/components/Card/Card';
import { AudioUrls } from '../useDraftForm';
import FileInputButton from '@/src/components/FileInputButton/FileInputButton';
import { useState } from 'react';
import { Button } from '@/src/components/Button/Button';

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
    const [combinedFile, setCombinedFile] = useState<File | null>(null);

    const onCombinedFile = (file: File) => {
        setCombinedFile(file);
        setAudioUrls(prev => ({ ...prev, combined: URL.createObjectURL(file) }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Option A: AI separation */}
            <Card label="Option A — AI separation" desc="Upload a combined audio file and we'll automatically split it into vocals and instrumental.">
                <div style={{ padding: '0px 24px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                        <FileInputButton
                            label="Combined Audio"
                            accept="audio/*"
                            onFile={onCombinedFile}
                            fileName={combinedFile?.name ?? null}
                            size={148}
                        />

                        {audioUrls.combined && (
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <p style={{ margin: '0 0 10px', fontSize: 11, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-wide)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Preview</p>
                                <audio controls src={audioUrls.combined} style={{ width: '100%', marginBottom: 16 }} />
                                <Button
                                    onClick={handleSeparateAudio}
                                    disabled={separateLoading}
                                    className="text-black flex flex-col"
                                    borderless
                                >
                                    {separateLoading && (
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                            <circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                            <path d="M6 1a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                        </svg>
                                    )}
                                    {separateLoading ? 'Separating…' : 'Separate Stems'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Option B: manual upload */}
            <Card label="Option B — Manual upload" desc="Upload pre-separated stems directly. Both are required to publish.">
                <div style={{ padding: '0px 24px 20px' }}>
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                        {/* instrumental */}
                        <div>
                            <FileInputButton
                                label="Instrumental"
                                accept="audio/*"
                                onFile={handleUploadInstrumental}
                                loading={instrumentalUploading}
                                fileName={audioUrls.instrumental ? 'instrumental' : null}
                                size={148}
                            />
                            {audioUrls.instrumental && (
                                <audio controls src={audioUrls.instrumental} style={{ width: 148, marginTop: 10, display: 'block' }} />
                            )}
                        </div>

                        {/* vocals */}
                        <div>
                            <FileInputButton
                                label="Vocals"
                                accept="audio/*"
                                onFile={handleUploadVocals}
                                loading={vocalsUploading}
                                fileName={audioUrls.vocals ? 'vocals' : null}
                                size={148}
                            />
                            {audioUrls.vocals && (
                                <audio controls src={audioUrls.vocals} style={{ width: 148, marginTop: 10, display: 'block' }} />
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}