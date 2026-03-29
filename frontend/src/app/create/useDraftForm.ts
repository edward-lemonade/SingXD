'use client';

import axios from 'axios';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChartBase,
    ChartProperties,
    DEFAULT_CHART_PROPERTIES,
    DraftChart,
    Line,
    Timing,
    User,
} from '@/src/lib/types/models';
import { useAuth } from '@/src/lib/context/AuthContext';
import * as DraftAPI from '@/src/lib/api/DraftAPI';

export interface AudioUrls {
    combined: string | null;
    instrumental: string | null;
    vocals: string | null;
}

function linesToString(lines: { words: { text: string }[] }[]): string {
    return lines.map(line => line.words.map(w => w.text).join(' ')).join('\n');
}

function parseLines(lyricsString: string): Line[] {
    return lyricsString
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            let wordIndex = 0;
            return {
                words: line
                    .replaceAll('-', '- ')
                    .replaceAll('—', '- ')
                    .split(' ')
                    .filter(w => w !== '')
                    .map(w => ({ text: w, index: wordIndex++ })),
            };
        });
}

export interface DraftFormState {
    // data
    lyricsString: string;
    lines: Line[];
    timings: Timing[];
    chartProps: ChartProperties;
    audioUrls: AudioUrls;
    chartBase: ChartBase;
    draftChart: DraftChart;

    // status
    hasUnsavedChanges: boolean;
    draftLoading: boolean;
    separateAudioLoading: boolean;
    instrumentalUploading: boolean;
    vocalsUploading: boolean;
    backgroundImageUploading: boolean;
    generateAlignmentLoading: boolean;
    saveDraftLoading: boolean;
    saveDraftError: string | null;
    saveDraftSuccess: boolean;
    publishLoading: boolean;
    publishError: string | null;

    // setters
    setLyricsString: (s: string) => void;
    setTimings: React.Dispatch<React.SetStateAction<Timing[]>>;
    setChartProps: React.Dispatch<React.SetStateAction<ChartProperties>>;
    setAudioUrls: React.Dispatch<React.SetStateAction<AudioUrls>>;

    // handlers
    handleSeparateAudio: () => Promise<void>;
    handleUploadInstrumental: (file: File) => Promise<void>;
    handleUploadVocals: (file: File) => Promise<void>;
    handleUploadBackgroundImage: (file: File) => Promise<void>;
    handleGenerateAlignment: () => Promise<void>;
    handleSaveDraft: () => Promise<void>;
    handlePublish: () => Promise<void>;
}

export function useDraftForm(currentUser: User | null, initialDraftUuid?: string): DraftFormState {
    const { user } = useAuth();
    const router = useRouter();

    const uuid = useRef<string | null>(initialDraftUuid ?? null);
    const savedChartBase = useRef<string>('');

    const [draftLoading, setDraftLoading] = useState(true);
    const [lyricsString, setLyricsString] = useState('');
    const [timings, setTimings] = useState<Timing[]>([]);
    const [chartProps, setChartProps] = useState<ChartProperties>(DEFAULT_CHART_PROPERTIES);
    const [audioUrls, setAudioUrls] = useState<AudioUrls>({
        combined: null,
        instrumental: null,
        vocals: null,
    });

    const lines = parseLines(lyricsString);
    const chartBase: ChartBase = { lines, timings, properties: chartProps };
    const draftChart: DraftChart = {
        ...chartBase,
        uuid: uuid.current ?? '',
        authorUid: null as null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const [doClaim, setDoClaim] = useState(false);
    const hasUnsavedChanges = (savedChartBase.current !== JSON.stringify(chartBase)) // maybe good to memoize in the future

    // ======================================================================
    // Lifecycle

    useEffect(() => {
        const initDraft = async () => {
            try {
                const createdUuid = await DraftAPI.initDraft();
                uuid.current = createdUuid;
                savedChartBase.current = JSON.stringify({
                    lines: [],
                    timings: [],
                    properties: DEFAULT_CHART_PROPERTIES,
                });
            } catch (err) {
                console.error('Failed to init draft', err);
            } finally {
                setDraftLoading(false);
            }
        };

        if (uuid.current) {
            DraftAPI.getDraft(uuid.current)
                .then(draft => {
                    setLyricsString(linesToString(draft.lines));
                    setTimings(draft.timings);
                    setChartProps({
                        ...draft.properties,
                        backgroundImageUrl: draft.backgroundImageUrl ?? null,
                    });
                    setAudioUrls(prev => ({
                        ...prev,
                        vocals: draft.vocalsUrl ?? null,
                        instrumental: draft.instrumentalUrl ?? null,
                    }));
                    savedChartBase.current = JSON.stringify({
                        lines: draft.lines,
                        timings: draft.timings,
                        properties: draft.properties,
                    });

                    setDoClaim(true);
                })
                .catch((err) => {
                    uuid.current = null;
                    console.error("Failed to claim unsaved draft: ", err)
                    initDraft();
                })
                .finally(() => setDraftLoading(false));
        } else {
            initDraft();
        }
    }, []);

    useEffect(
        () => () => { if (audioUrls.combined) URL.revokeObjectURL(audioUrls.combined); },
        [audioUrls.combined]
    );
    useEffect(
        () => () => { if (audioUrls.instrumental?.startsWith('blob:')) URL.revokeObjectURL(audioUrls.instrumental!); },
        [audioUrls.instrumental]
    );
    useEffect(
        () => () => { if (audioUrls.vocals) URL.revokeObjectURL(audioUrls.vocals!); },
        [audioUrls.vocals]
    );
    useEffect(
        () => () => {
            const url = chartProps.backgroundImageUrl;
            if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
        },
        [chartProps.backgroundImageUrl]
    );

    useEffect(() => {
        const derive = async () => {
            if (!audioUrls.instrumental) {
                setChartProps(prev => ({ ...prev, duration: 0, audioUrl: null }));
                return;
            }
            try {
                const buf = await fetch(audioUrls.instrumental).then(r => r.arrayBuffer());
                const decoded = await new AudioContext().decodeAudioData(buf);
                setChartProps(prev => ({
                    ...prev,
                    duration: decoded.duration,
                    audioUrl: audioUrls.instrumental,
                }));
            } catch {
                setChartProps(prev => ({ ...prev, audioUrl: audioUrls.instrumental }));
            }
        };
        derive();
    }, [audioUrls.instrumental]);

    // ======================================================================
    // Uploads

    const [instrumentalUploading, setInstrumentalUploading] = useState(false);
    const [vocalsUploading, setVocalsUploading] = useState(false);
    const [backgroundImageUploading, setBackgroundImageUploading] = useState(false);

    const handleUploadInstrumental = async (file: File) => {
        if (!uuid.current) return;
        setInstrumentalUploading(true);
        try {
            const url = await DraftAPI.uploadInstrumental(uuid.current, file);
            setAudioUrls(prev => ({ ...prev, instrumental: url }));
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
            const url = await DraftAPI.uploadVocals(uuid.current, file);
            setAudioUrls(prev => ({ ...prev, vocals: url }));
        } catch (err) {
            console.error('Failed to upload vocals', err);
        } finally {
            setVocalsUploading(false);
        }
    };

    const handleUploadBackgroundImage = async (file: File) => {
        if (!uuid.current) return;
        setBackgroundImageUploading(true);
        try {
            const url = await DraftAPI.uploadImage(uuid.current, file);
            setChartProps(prev => ({ ...prev, backgroundImageUrl: url }));
        } catch (err) {
            console.error('Failed to upload image', err);
        } finally {
            setBackgroundImageUploading(false);
        }
    };

    // ======================================================================
    // Long Work

    const [separateAudioLoading, setSeparateAudioLoading] = useState(false);
    const handleSeparateAudio = async () => {
        if (!audioUrls.combined || !uuid.current) return;
        setSeparateAudioLoading(true);
        try {
            const blob = await fetch(audioUrls.combined).then(r => r.blob());
            const res = await DraftAPI.separateAudio(uuid.current, blob);
            setAudioUrls(prev => ({
                ...prev,
                vocals: res.vocalsUrl,
                instrumental: res.instrumentalUrl,
            }));
        } catch (err) {
            console.error('Failed to separate audio', err);
        } finally {
            setSeparateAudioLoading(false);
        }
    };

    const [generateAlignmentLoading, setGenerateAlignmentLoading] = useState(false);
    const handleGenerateAlignment = async () => {
        if (!uuid.current || !lines.length) return;
        setGenerateAlignmentLoading(true);
        try {
            setTimings(await DraftAPI.generateTimings(uuid.current, lines));
        } catch (err) {
            console.error('Failed to generate alignment', err);
        } finally {
            setGenerateAlignmentLoading(false);
        }
    };

    // ======================================================================
    // Save / Publish

    const [saveDraftLoading, setSaveDraftLoading] = useState(false);
    const [saveDraftError, setSaveDraftError] = useState<string | null>(null);
    const [saveDraftSuccess, setSaveDraftSuccess] = useState(false);

    const handleSaveDraft = async () => {
        if (!uuid.current) return;

        setSaveDraftLoading(true);
        setSaveDraftError(null);
        setSaveDraftSuccess(false);
        let error = null
        try {
            await DraftAPI.updateDraft(uuid.current, chartBase);
            savedChartBase.current = JSON.stringify(chartBase);
            setSaveDraftSuccess(true);
            setTimeout(() => setSaveDraftSuccess(false), 2500);
        } catch (err) {
            setSaveDraftError(
                axios.isAxiosError(err) && err.response?.data?.error
                    ? err.response.data.error
                    : 'Failed to save draft'
            );
            error = err;
        } finally {
            setSaveDraftLoading(false);
            if (!user && !error) {
                localStorage.setItem(DraftAPI.DRAFT_UUID_PENDING_KEY, uuid.current);
                router.push('/login');
                return;
            }
        }
    };
    useEffect(() => {
        if (doClaim) {
            handleSaveDraft();
            setDoClaim(false);
        }
    }, [doClaim])

    const [publishLoading, setPublishLoading] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    const handlePublish = async () => {
        if (!uuid.current) return;
        setPublishLoading(true);
        setPublishError(null);
        try {
            if (user) await DraftAPI.updateDraft(uuid.current, chartBase);
            const res = await DraftAPI.publishDraft(uuid.current, chartBase);
            savedChartBase.current = JSON.stringify(chartBase);
            router.push(`/chart/${res.id}`);
        } catch (err) {
            setPublishError(
                axios.isAxiosError(err) && err.response?.data?.error
                    ? err.response.data.error
                    : err instanceof Error
                      ? err.message
                      : 'Failed to publish'
            );
        } finally {
            setPublishLoading(false);
        }
    };

    return {
        lyricsString,
        lines,
        timings,
        chartProps,
        audioUrls,
        chartBase,
        draftChart,

        hasUnsavedChanges,
        draftLoading,
        separateAudioLoading,
        instrumentalUploading,
        vocalsUploading,
        backgroundImageUploading,
        generateAlignmentLoading,
        saveDraftLoading,
        saveDraftError,
        saveDraftSuccess,
        publishLoading,
        publishError,

        setLyricsString,
        setTimings,
        setChartProps,
        setAudioUrls,

        handleSeparateAudio,
        handleUploadInstrumental,
        handleUploadVocals,
        handleUploadBackgroundImage,
        handleGenerateAlignment,
        handleSaveDraft,
        handlePublish,
    };
}