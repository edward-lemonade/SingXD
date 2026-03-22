'use client';

import { useState } from 'react';
import Wallpaper from '@/src/components/Wallpaper';
import AudioStep from '@/src/app/create/steps/AudioStep';
import LyricsStep from '@/src/app/create/steps/LyricsStep';
import VideoStep from './steps/VideoStep';
import PublishStep from './steps/PublishStep';
import { useAuth } from '@/src/lib/context/AuthContext';
import { useDraftForm } from './useDraftForm';

const steps = [
    { id: 1, name: 'Audio' },
    { id: 2, name: 'Lyrics' },
    { id: 3, name: 'Video' },
    { id: 4, name: 'Publish' },
] as const;

interface CreateClientProps {
    initialDraftUuid?: string;
}

export default function CreateClient({ initialDraftUuid }: CreateClientProps = {}) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

    const state = useDraftForm(initialDraftUuid);

    if (state.draftLoading) {
        return (
            <Wallpaper color="lavender">
                <div className="flex items-center justify-center h-screen text-gray-500">
                    Loading…
                </div>
            </Wallpaper>
        );
    }

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
                                    onClick={state.handleSaveDraft}
                                    disabled={state.saveDraftLoading}
                                    className="text-sm px-4 py-1.5 rounded bg-white/15 hover:bg-white/25 transition-colors disabled:opacity-50"
                                >
                                    {state.saveDraftLoading ? 'Saving…' : state.saveDraftSuccess ? '✓ Saved' : 'Save Draft'}
                                </button>
                            )}
                            {state.saveDraftError && (
                                <span className="text-xs text-red-300">{state.saveDraftError}</span>
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
                                    onClick={() => setCurrentStep(step.id)}
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
                </div>
            </div>
        </Wallpaper>
    );
}