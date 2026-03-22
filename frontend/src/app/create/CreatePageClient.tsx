'use client';

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Wallpaper from '@/src/components/Wallpaper';
import AudioStep from '@/src/app/create/steps/AudioStep';
import LyricsStep from '@/src/app/create/steps/LyricsStep';
import VideoStep from './steps/VideoStep';
import PublishStep from './steps/PublishStep';
import {
    ChartBase,
    Timing,
    ChartProperties,
    Line,
    DEFAULT_CHART_PROPERTIES,
} from '@/src/lib/types/models';
import { useAuth } from '@/src/lib/context/AuthContext';
import * as DraftAPI from '@/src/lib/api/DraftAPI';

const DRAFT_UUID_KEY = 'draft_uuid';

const steps = [
    { id: 1, name: 'Audio' },
    { id: 2, name: 'Lyrics' },
    { id: 3, name: 'Video' },
    { id: 4, name: 'Publish' },
];

export interface AudioUrls {
    combined: string | null;
    instrumental: string | null;
    vocals: string | null;
}

interface CreateClientProps {
    initialDraftUuid?: string;
}

export default function CreateClient({ initialDraftUuid }: CreateClientProps = {}) {
    const { user } = useAuth();
    const router = useRouter();

    const uuid = useRef<string | null>(initialDraftUuid ?? null);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
    const [draftLoading, setDraftLoading] = useState(true);

    const [lyricsString, setLyricsString] = useState('');
    const [timings, setTimings] = useState<Timing[]>([]);
    const [chartProps, setChartProps] = useState<ChartProperties>(DEFAULT_CHART_PROPERTIES);
    const [audioUrls, setAudioUrls] = useState<AudioUrls>({
        combined: null,
        instrumental: null,
        vocals: null,
    });

    // ====================================================================
    // Initialize / Resume draft 

    useEffect(() => {
        if (!uuid.current) {
            uuid.current = sessionStorage.getItem(DRAFT_UUID_KEY);
        }

        if (uuid.current) {
            DraftAPI.getDraft(uuid.current)
                .then(draft => {
                    setLyricsString(linesToString(draft.lines));
                    setTimings(draft.timings);
                    setChartProps({
                        ...draft.properties,
                        backgroundImageUrl: draft.backgroundImageUrl ?? null
                    });
                    setAudioUrls((prev) => ({ 
                        ...prev,
                        vocals: draft.vocalsUrl ?? null,
                        instrumental: draft.instrumentalUrl ?? null,
                    }));
                })
                .catch(() => {
                    sessionStorage.removeItem(DRAFT_UUID_KEY);
                    uuid.current = null;
                    initDraft();
                })
                .finally(() => setDraftLoading(false));
        } else {
            initDraft();
        }
    }, []);

    const initDraft = async () => {
        try {
            const createdUuid = await DraftAPI.initDraft();
            uuid.current = createdUuid;
            sessionStorage.setItem(DRAFT_UUID_KEY, createdUuid);
        } catch (err) {
            console.error('Failed to init draft', err);
        } finally {
            setDraftLoading(false);
        }
    };

    const lines: Line[] = lyricsString
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            let wordIndex = 0;
            return {
                words: line
                    .replaceAll('-', '- ')
                    .replaceAll('—', '- ')
                    .split(' ')
                    .filter(word => word !== '')
                    .map(word => ({ text: word, index: wordIndex++ })),
            };
        });

    const chartBase: ChartBase = { lines, timings, properties: chartProps };

    // revoke blob URLs on unmount
    useEffect(() => () => { if (audioUrls.combined) URL.revokeObjectURL(audioUrls.combined); }, [audioUrls.combined]);
    useEffect(() => () => { if (audioUrls.instrumental?.startsWith('blob:')) URL.revokeObjectURL(audioUrls.instrumental!); }, [audioUrls.instrumental]);
    useEffect(() => () => { if (audioUrls.vocals) URL.revokeObjectURL(audioUrls.vocals!); }, [audioUrls.vocals]);
    useEffect(() => () => {
        const url = chartProps.backgroundImageUrl;
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    }, [chartProps.backgroundImageUrl]);

    // derive instrumental duration
    useEffect(() => {
        const derive = async () => {
            if (!audioUrls.instrumental) {
                setChartProps(prev => ({ ...prev, duration: 0, audioUrl: null }));
                return;
            }
            try {
                const res = await fetch(audioUrls.instrumental);
                const buf = await res.arrayBuffer();
                const ctx = new AudioContext();
                const decoded = await ctx.decodeAudioData(buf);
                setChartProps(prev => ({ ...prev, duration: decoded.duration, audioUrl: audioUrls.instrumental }));
            } catch {
                setChartProps(prev => ({ ...prev, audioUrl: audioUrls.instrumental }));
            }
        };
        derive();
    }, [audioUrls.instrumental]);

    // ====================================================================
    // Audio Separation 

    const [separateAudioLoading, setSeparateAudioLoading] = useState(false);
    const handleSeparateAudio = async () => {
        if (!audioUrls.combined || !uuid.current) return;
        setSeparateAudioLoading(true);
        try {
            const blob = await fetch(audioUrls.combined).then(r => r.blob());
            const res = await DraftAPI.separateAudio(uuid.current, blob);
            setAudioUrls(prev => ({ ...prev, vocals: res.vocalsUrl, instrumental: res.instrumentalUrl }));
        } catch (err) {
            console.error('Failed to separate audio', err);
        } finally {
            setSeparateAudioLoading(false);
        }
    };

    // ====================================================================
    // Manual Audio Uploads

    const [instrumentalUploading, setInstrumentalUploading] = useState(false);
    const [vocalsUploading, setVocalsUploading] = useState(false);

    const handleUploadInstrumental = async (file: File) => {
        if (!uuid.current) return;
        setInstrumentalUploading(true);
        try {
            const instrumentalUrl = await DraftAPI.uploadInstrumental(uuid.current, file);
            setAudioUrls(prev => ({ ...prev, instrumental: instrumentalUrl }));
        } catch (err) {
            console.error('Failed to upload instrumental', err);
        } finally {
            setInstrumentalUploading(false);
        }
    };

    const handleUploadVocals = async (file: File) => {
        if (!uuid.current) return;
        setVocalsUploading(true);
        try {
            const vocalsUrl = await DraftAPI.uploadVocals(uuid.current, file);
            setAudioUrls(prev => ({ ...prev, vocals: vocalsUrl }));
        } catch (err) {
            console.error('Failed to upload vocals', err);
        } finally {
            setVocalsUploading(false);
        }
    };

    // ====================================================================
    // Alignment 

    const [generateAlignmentLoading, setGenerateAlignmentLoading] = useState(false);
    const handleGenerateAlignment = async () => {
        if (!uuid.current || !lines.length) return;
        setGenerateAlignmentLoading(true);
        try {
            const result = await DraftAPI.generateTimings(uuid.current, lines);
            setTimings(result);
        } catch (err) {
            console.error('Failed to generate alignment', err);
        } finally {
            setGenerateAlignmentLoading(false);
        }
    };

    // ====================================================================
    // Background Image 

    const [backgroundImageUploading, setBackgroundImageUploading] = useState(false);
    const [backgroundImageError, setBackgroundImageError] = useState<string | null>(null);
    const handleUploadBackgroundImage = async (file: File) => {
        if (!uuid.current) return;
        setBackgroundImageError(null);
        setBackgroundImageUploading(true);
        try {
            const imageUrl = await DraftAPI.uploadImage(uuid.current, file);
            setChartProps(prev => ({ ...prev, backgroundImageUrl: imageUrl }));
        } catch (err) {
            const message = axios.isAxiosError(err) && err.response?.data?.error
                ? err.response.data.error
                : err instanceof Error ? err.message : 'Failed to upload image';
            setBackgroundImageError(message);
        } finally {
            setBackgroundImageUploading(false);
        }
    };

    // ====================================================================
    // Save 

    const [saveDraftLoading, setSaveDraftLoading] = useState(false);
    const [saveDraftError, setSaveDraftError] = useState<string | null>(null);
    const [saveDraftSuccess, setSaveDraftSuccess] = useState(false);

    const handleSaveDraft = async () => {
        if (!user || !uuid.current) return;
        setSaveDraftLoading(true);
        setSaveDraftError(null);
        setSaveDraftSuccess(false);
        try {
            await DraftAPI.updateDraft(uuid.current, chartBase);
            setSaveDraftSuccess(true);
            setTimeout(() => setSaveDraftSuccess(false), 2500);
        } catch (err) {
            const message = axios.isAxiosError(err) && err.response?.data?.error
                ? err.response.data.error
                : 'Failed to save draft';
            setSaveDraftError(message);
        } finally {
            setSaveDraftLoading(false);
        }
    };

    // ====================================================================
    // Publish 

    const [publishLoading, setPublishLoading] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    const handlePublish = async () => {
        if (!uuid.current) return;
        setPublishLoading(true);
        setPublishError(null);
        try {
            const res = user
                ? await DraftAPI.publishDraftAsUser(uuid.current)
                : await DraftAPI.publishDraftAsGuest(uuid.current, chartBase);
            sessionStorage.removeItem(DRAFT_UUID_KEY);
            router.push(`/chart/${res.id}`);
        } catch (err) {
            const message = axios.isAxiosError(err) && err.response?.data?.error
                ? err.response.data.error
                : err instanceof Error ? err.message : 'Failed to publish';
            setPublishError(message);
        } finally {
            setPublishLoading(false);
        }
    };

    if (draftLoading) {
        return (
            <Wallpaper color="lavender">
                <div className="flex items-center justify-center h-screen text-gray-500">
                    Loading…
                </div>
            </Wallpaper>
        );
    }

    const draftChart = {
        uuid: uuid.current ?? '',
        authorUid: null,
        lines,
        timings,
        properties: chartProps,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return (
        <Wallpaper color="lavender">
            <div className="flex flex-col h-screen">
                {!user && (
                    <div className="p-4 shrink-0 flex items-center justify-between bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-sm text-yellow-800">
                        You&apos;re working as a guest. Publish before leaving or your progress will be lost.

                        <div className="flex items-center gap-3">
                            {!user && (
                                <span className="text-sm text-yellow-300 bg-yellow-900/40 px-3 py-1 rounded">
                                    Sign in to save your progress
                                </span>
                            )}
                            {user && (
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={saveDraftLoading}
                                    className="text-sm px-4 py-1.5 rounded bg-white/15 hover:bg-white/25 transition-colors disabled:opacity-50"
                                >
                                    {saveDraftLoading ? 'Saving…' : saveDraftSuccess ? '✓ Saved' : 'Save Draft'}
                                </button>
                            )}
                            {saveDraftError && (
                                <span className="text-xs text-red-300">{saveDraftError}</span>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    <div className="w-40 bg-linear-to-b from-purple-900 to-blue-900 p-4 shrink-0">
                        <nav className="space-y-2">
                            {steps.map(step => (
                                <button
                                    key={step.id}
                                    onClick={() => setCurrentStep(step.id as 1 | 2 | 3 | 4)}
                                    className={`w-full text-left px-4 py-2 rounded-md ${
                                        currentStep === step.id
                                            ? 'bg-black text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {step.id}. {step.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex-1 overflow-auto p-8">
                        {currentStep === 1 && (
                            <AudioStep
                                audioUrls={audioUrls}
                                setAudioUrls={setAudioUrls}
                                separateLoading={separateAudioLoading}
                                instrumentalUploading={instrumentalUploading}
                                vocalsUploading={vocalsUploading}
                                handleSeparateAudio={handleSeparateAudio}
                                handleUploadInstrumental={handleUploadInstrumental}
                                handleUploadVocals={handleUploadVocals}
                            />
                        )}
                        {currentStep === 2 && (
                            <LyricsStep
                                lyricsString={lyricsString}
                                setLyricsString={setLyricsString}
                                lines={lines}
                                audioUrls={audioUrls}
                                timings={timings}
                                setTimings={setTimings}
                                loading={generateAlignmentLoading}
                                handleGenerateAlignment={handleGenerateAlignment}
                            />
                        )}
                        {currentStep === 3 && (
                            <VideoStep
                                chart={draftChart}
                                chartProps={chartProps}
                                setChartProps={setChartProps}
                                onBackgroundImageFileSelect={handleUploadBackgroundImage}
                                backgroundImageUploading={backgroundImageUploading}
                                backgroundImageError={backgroundImageError}
                            />
                        )}
                        {currentStep === 4 && (
                            <PublishStep
                                chart={draftChart}
                                chartProps={chartProps}
                                setChartProps={setChartProps}
                                loading={publishLoading}
                                handlePublish={handlePublish}
                                publishError={publishError}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Wallpaper>
    );
}

function linesToString(lines: { words: { text: string }[] }[]): string {
    return lines.map(line => line.words.map(w => w.text).join(' ')).join('\n');
}