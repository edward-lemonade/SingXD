'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import AudioStep from '@/src/app/create/steps/AudioStep';
import LyricsStep from '@/src/app/create/steps/LyricsStep';
import VideoStep from './steps/VideoStep';
import PublishStep from './steps/PublishStep';
import Sidebar from '../../components/DraftSidebar/Sidebar';
import { useDraftForm } from './useDraftForm';
import { User } from '@/src/lib/types/models';
import Wallpaper from '@/src/components/Wallpaper/Wallpaper';
import { Button } from '@/src/components/Button/Button';
import { Step } from '@/src/components/DraftSidebar/StepNode';

export type StepId = 1 | 2 | 3 | 4;

interface CreateClientProps {
    currentUser: User | null;
    initialDraftUuid?: string;
}

const steps: Step[] = [
    { id: 1, name: 'Audio',   description: 'Upload stems' },
    { id: 2, name: 'Lyrics',  description: 'Align timing' },
    { id: 3, name: 'Video',   description: 'Style & art' },
    { id: 4, name: 'Publish', description: 'Release it' },
] as const;

export default function CreateClient({ currentUser: user, initialDraftUuid }: CreateClientProps) {
    const [currentStep, setCurrentStep] = useState<StepId>(1);

    const state = useDraftForm(user, initialDraftUuid);

    if (state.draftLoading) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-wide)', letterSpacing: '0.1em', fontSize: 13 }}>
                LOADING…
            </div>
        );
    }

    const stepMissing: Record<StepId, string[]> = {
        1: [
            ...(!state.audioUrls.instrumental ? ['Instrumental track'] : []),
            ...(!state.audioUrls.vocals       ? ['Vocals track']       : []),
        ],
        2: [],
        3: [...(!state.chartProps.backgroundImageUrl ? ['Background image'] : [])],
        4: [
            ...(!state.chartProps.title     ? ['Chart title']  : []),
            ...(!state.chartProps.artist    ? ['Song artist']  : []),
            ...(!state.chartProps.songTitle ? ['Song title']   : []),
        ],
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Wallpaper color='lavender' invert />

            <Sidebar
                steps={steps}
                currentStep={currentStep}
                stepMissing={stepMissing}
                user={user}
                hasUnsavedChanges={state.hasUnsavedChanges}
                saveDraftLoading={state.saveDraftLoading}
                saveDraftSuccess={state.saveDraftSuccess}
                saveDraftError={state.saveDraftError}
                onStepClick={setCurrentStep as Dispatch<SetStateAction<number>>}
                onSaveDraft={state.handleSaveDraft}
            />

            <main className="flex-1 flex-row overflow-auto" style={{ display: 'flex', minHeight: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 20, flex: 1, minHeight: '100vh' }}>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        width: 48,
                        flexShrink: 0,
                        paddingTop: 4,
                        marginLeft: 80,
                        alignSelf: 'stretch',
                    }}>
                        <span
                            style={{
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                fontFamily: 'var(--font-wide)',
                                fontWeight: 900,
                                fontStyle: 'italic',
                                fontSize: 100,
                                letterSpacing: '-0.02em',
                                lineHeight: 1,
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                                paddingTop: 100,
                                paddingBottom: 100,
                                background: 'linear-gradient(180deg, var(--color-blue-accent), var(--color-lavender-accent))',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            {steps[currentStep - 1].name}
                        </span>
                    </div>

                    <div style={{ flex: 1, margin: '0 auto', padding: '40px 40px', display: 'flex', flexDirection: 'column' }}>

                        <div style={{ flex: 1 }}>
                            {currentStep === 1 && (
                                <AudioStep
                                    audioUrls={state.audioUrls}
                                    setAudioUrls={state.setAudioUrls}
                                    separateLoading={state.separateAudioLoading}
                                    instrumentalUploading={state.instrumentalUploading}
                                    vocalsUploading={state.vocalsUploading}
                                    handleSeparateAudio={state.handleSeparateAudio}
                                    handleUploadInstrumental={state.handleUploadInstrumental}
                                    handleUploadVocals={state.handleUploadVocals}
                                />
                            )}
                            {currentStep === 2 && (
                                <LyricsStep
                                    lyricsString={state.lyricsString}
                                    setLyricsString={state.setLyricsString}
                                    lines={state.lines}
                                    audioUrls={state.audioUrls}
                                    timings={state.timings}
                                    setTimings={state.setTimings}
                                    loading={state.generateAlignmentLoading}
                                    handleGenerateAlignment={state.handleGenerateAlignment}
                                />
                            )}
                            {currentStep === 3 && (
                                <VideoStep
                                    chart={state.draftChart}
                                    chartProps={state.chartProps}
                                    setChartProps={state.setChartProps}
                                    onBackgroundImageFileSelect={state.handleUploadBackgroundImage}
                                    backgroundImageUploading={state.backgroundImageUploading}
                                />
                            )}
                            {currentStep === 4 && (
                                <PublishStep
                                    chart={state.draftChart}
                                    chartProps={state.chartProps}
                                    setChartProps={state.setChartProps}
                                    loading={state.publishLoading}
                                    handlePublish={state.handlePublish}
                                    publishError={state.publishError}
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid rgba(0,0,0,0.08)' }}>
                            <Button
                                onClick={() => setCurrentStep(s => Math.max(1, s - 1) as StepId)}
                                disabled={currentStep === 1}
                                borderless
                            >
                                ← Back
                            </Button>
                            <Button
                                onClick={() => setCurrentStep(s => Math.min(4, s + 1) as StepId)}
                                disabled={currentStep === 4}
                                borderless
                            >
                                Next →
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}