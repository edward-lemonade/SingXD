"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Wallpaper from "@/src/components/Wallpaper";
import AudioStep from "@/src/app/create/steps/AudioStep";
import LyricsStep from "@/src/app/create/steps/LyricsStep";
import VideoStep from "@/src/app/create/steps/VideoStep";
import { SyncMap, SyncLine, SyncPoint, SyncMapSettings, SyncMapMetadata, DEFAULT_SYNC_MAP_SETTINGS, DEFAULT_SYNC_MAP_METADATA } from "@/src/lib/types/types" ;
import * as CreateAPI from "@/src/lib/api/CreateAPI";

const steps = [
  { id: 1, name: "Audio" },
  { id: 2, name: "Lyrics" },
  { id: 3, name: "Video" },
];

export interface AudioUrls {
	combined: string | null;
	instrumental: string | null;
	vocals: string | null;
}

const assembleSyncLines = (lyrics: string, syncPoints: SyncPoint[]) => {
	const lines = lyrics.split(/[.,!?;\n]/);

	let syncPointIdx = 0;
	const syncMapLines: SyncLine[] = lines.map((line) => { // mapping words to syncPoints
		const firstWordIndex = syncPointIdx;
		const words = line.trim().split(/\s+/).filter(Boolean);
		const wordSyncPoints = words.map((word) => {
			return {
				text: word,
				...syncPoints[syncPointIdx++]
			}
		})
		return {
			words: wordSyncPoints,
			start: wordSyncPoints[0]?.start ?? 0,
			end: wordSyncPoints[wordSyncPoints.length - 1]?.end ?? 0,
			firstWordIndex
		}
	})

	return syncMapLines;
}

export default function CreatePage() {
	const sessionId = useRef<string | null>(null);
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
	const [lyrics, setLyrics] = useState('');

	const [syncPoints, setSyncPoints] = useState<SyncPoint[]>([]);
	const [syncMapSettings, setSyncMapSettings] = useState<SyncMapSettings>(DEFAULT_SYNC_MAP_SETTINGS);
	const [syncMapMetadata, setSyncMapMetadata] = useState<SyncMapMetadata>(DEFAULT_SYNC_MAP_METADATA);

	const [audioUrls, setAudioUrls] = useState<AudioUrls>({
		combined: null,
		instrumental: null,
		vocals: null,
	})

	const syncLines = useMemo(() => {
		return assembleSyncLines(lyrics, syncPoints);
	}, [lyrics, syncPoints]);

	const syncMap: SyncMap = {
		lines: syncLines,
		settings: syncMapSettings,
		metadata: syncMapMetadata,
	};

	// Cleanup
	useEffect(() => { 
		return () => { 
			if (audioUrls.combined) URL.revokeObjectURL(audioUrls.combined);
		}
	}, [audioUrls.combined]);
	useEffect(() => { 
		return () => { 
			if (audioUrls.instrumental) URL.revokeObjectURL(audioUrls.instrumental);
		}
	}, [audioUrls.instrumental]);
	useEffect(() => { 
		return () => { 
			if (audioUrls.vocals) URL.revokeObjectURL(audioUrls.vocals);
		}
	}, [audioUrls.vocals]);

	useEffect(() => {
		const setMetadataAndSettings = async () => {
			if (audioUrls.combined) {
				const res = await fetch(audioUrls.combined);
				const arrayBuffer = await res.arrayBuffer();
				const audioCtx = new AudioContext();
				const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
				const duration = audioBuffer.duration;
				const newSyncMapMetadata: SyncMapMetadata = {
					duration
				};
				setSyncMapMetadata(newSyncMapMetadata);
				setSyncMapSettings((prev) => {
					return {
						...prev,
						audioUrl: audioUrls.combined,
					}
				})
			} else {
				setSyncMapMetadata(DEFAULT_SYNC_MAP_METADATA);
			}
		}
		setMetadataAndSettings();
	}, [audioUrls.combined]); 

  const [separateAudioLoading, setSeparateAudioLoading] = useState(false);
  const handleSeparateAudio = async () => {
		if (!audioUrls.combined) return;
			setSeparateAudioLoading(true);
		try {
			const combinedFile = await fetch(audioUrls.combined);
			const blob = await combinedFile.blob()
			const res = await CreateAPI.separateAudio(blob);

			sessionId.current = res.sessionId;

			setAudioUrls(prev => ({ 
				...prev, 
				vocals: res.vocalsUrl, 
				instrumental: res.instrumentalUrl, 
			}));
		} catch (error) {
			console.error('Failed to separate audio', error);
		} finally {
			setSeparateAudioLoading(false);
		}
  };

  const [generateAlignmentLoading, setGenerateAlignmentLoading] = useState(false);
  const handleGenerateAlignment = async() => {
		if (!audioUrls.vocals || !lyrics) return;
		setGenerateAlignmentLoading(true);
		try {
			const syncPoints = await CreateAPI.generateAlignment(sessionId.current!, lyrics);
			setSyncPoints(syncPoints);
		} catch (error) {
			console.error('Failed to generate alignment', error);
		} finally {
			setGenerateAlignmentLoading(false);
		}
  }

  return (
		<Wallpaper color="lavender">
			<div className="flex flex-col h-screen">
				{/* Topbar */}
				<div className=" bg-purple-800 text-white p-4 shrink-0">
					<h1 className="text-2xl font-bold">
						{steps.find(step => step.id === currentStep)?.name}
					</h1>
				</div>

				{/* Container with Navbar and Content */}
				<div className="flex flex-1 overflow-hidden">
					{/* Vertical Navbar - Fixed Left */}
					<div className="w-40 bg-linear-to-b from-purple-900 to-blue-900 p-4 shrink-0">
						<nav className="space-y-2">
							{steps.map((step) => (
								<button
									key={step.id}
									onClick={() => setCurrentStep(step.id as 1 | 2 | 3)}
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

					{/* Content - Fills remaining space */}
					<div className="flex-1 overflow-auto p-8">
						{currentStep === 1 && (
							<AudioStep
								audioUrls={audioUrls}
								setAudioUrls={setAudioUrls}
								loading={separateAudioLoading}
								onSeparate={handleSeparateAudio}
							/>
						)}

						{currentStep === 2 && (
							<LyricsStep
								lyrics={lyrics}
								setLyrics={setLyrics}
								audioUrls={audioUrls}
								alignment={syncPoints}
								loading={generateAlignmentLoading}
								onAlign={handleGenerateAlignment}
							/>
						)}

						{currentStep === 3 && (
							<VideoStep
								syncMap={syncMap}
								videoSettings={syncMapSettings}
								setVideoSettings={setSyncMapSettings}
							/>
						)}
					</div>
				</div>
			</div>
		</Wallpaper>
  );
}