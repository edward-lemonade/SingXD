"use client";

import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import Wallpaper from "@/src/components/Wallpaper";
import AudioStep from "@/src/app/create/steps/AudioStep";
import LyricsStep from "@/src/app/create/steps/LyricsStep";
import VideoStep from "./steps/VideoStep";
import { SyncMapDraft, Timing, SyncMapProperties, Line, DEFAULT_SYNCMAP_PROPERTIES } from "@/src/lib/types/types" ;
import * as CreateAPI from "@/src/lib/api/SyncMapAPI";
import PublishStep from "./steps/PublishStep";

const steps = [
  { id: 1, name: "Audio" },
  { id: 2, name: "Lyrics" },
  { id: 3, name: "Video" },
  { id: 4, name: "Publish" },
];

export interface AudioUrls {
	combined: string | null;
	instrumental: string | null;
	vocals: string | null;
}

export default function CreatePage() {

	// Page state

	const sessionId = useRef<string | null>(null);
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

	// Syncmap Construction

	const [lyricsString, setLyricsString] = useState('');
	const lines: Line[] = lyricsString
		.split('\n')
		.filter(line => line.trim() !== '')   // remove empty/blank lines
		.map(line => {
			let wordIndex = 0;
			return {
				words: line
					.replaceAll("-", "- ")
					.replaceAll("—", "- ")
					.split(' ')
					.filter(word => word !== '')  // remove empty strings from consecutive spaces
					.map((word) => {
						return {
							text: word,
							index: wordIndex++,
						}
					}),
			}
		})
	const [timings, setTimings] = useState<Timing[]>([]);

	const [syncMapProps, setSyncMapProps] = useState<SyncMapProperties>(DEFAULT_SYNCMAP_PROPERTIES);

	const [audioUrls, setAudioUrls] = useState<AudioUrls>({
		combined: null,
		instrumental: null,
		vocals: null,
	});

	const syncMap: SyncMapDraft = {
		lines: lines,
		timings: timings,
		properties: syncMapProps,
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
		return () => {
			const url = syncMapProps.backgroundImageUrl;
			if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
		};
	}, [syncMapProps.backgroundImageUrl]);

	useEffect(() => {
		const setMetadataAndSettings = async () => {
			if (audioUrls.vocals) {
				const res = await fetch(audioUrls.vocals);
				const arrayBuffer = await res.arrayBuffer();
				const audioCtx = new AudioContext();
				const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
				const duration = audioBuffer.duration;
				setSyncMapProps((prev) => {
					return {
						...prev,
						duration
					}
				});
				setSyncMapProps((prev) => {
					return {
						...prev,
						audioUrl: audioUrls.vocals,
					}
				})
			} else {
				setSyncMapProps((prev) => {
					return {
						...prev,
						duration: 0,
					}
				});
				setSyncMapProps((prev) => {
					return {
						...prev,
						audioUrl: null,
					}
				})
			}
		}
		setMetadataAndSettings();
	}, [audioUrls.vocals]); 

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
		if (!audioUrls.vocals || !lines) return;
		setGenerateAlignmentLoading(true);
		try {
			const timings = await CreateAPI.generateTimings(sessionId.current!, lines);
			setTimings(timings);
		} catch (error) {
			console.error('Failed to generate alignment', error);
		} finally {
			setGenerateAlignmentLoading(false);
		}
	}

	const [backgroundImageUploading, setBackgroundImageUploading] = useState(false);
	const [backgroundImageError, setBackgroundImageError] = useState<string | null>(null);
	const handleUploadBackgroundImage = async (file: File) => {
		const sid = sessionId.current;
		if (!sid) {
			setBackgroundImageError("Complete the Audio step first");
			return;
		}
		setBackgroundImageError(null);
		setBackgroundImageUploading(true);
		try {
			const imageUrl = await CreateAPI.uploadImage(sid, file);
			setSyncMapProps((prev) => ({ ...prev, backgroundImageUrl: imageUrl }));
		} catch (err) {
			const message = axios.isAxiosError(err) && err.response?.data?.error
				? err.response.data.error
				: err instanceof Error ? err.message : "Failed to upload image";
			setBackgroundImageError(message);
		} finally {
			setBackgroundImageUploading(false);
		}
	};

	const [publishLoading, setPublishLoading] = useState(false);
	const handlePublish = async () => {
		if (!audioUrls.vocals || !lines) return;
		setPublishLoading(true);
		try {
			const success = await CreateAPI.createMap(sessionId.current!, syncMap);
			if (success) {
				console.log("Syncmap created");
			}
		} catch (error) {
			console.error('Failed to generate alignment', error);
		} finally {
			setPublishLoading(false);
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
								handleSeparateAudio={handleSeparateAudio}
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
								syncMap={syncMap}
								syncMapProps={syncMapProps}
								setSyncMapProps={setSyncMapProps}
								onBackgroundImageFileSelect={handleUploadBackgroundImage}
								backgroundImageUploading={backgroundImageUploading}
								backgroundImageError={backgroundImageError}
							/>
						)}

						{currentStep === 4 && (
							<PublishStep
								syncMap={syncMap}
								syncMapProps={syncMapProps}
								setSyncMapProps={setSyncMapProps}
								loading={publishLoading}
								handlePublish={handlePublish}
							/>
						)}
					</div>
				</div>
			</div>
		</Wallpaper>
  	);
}