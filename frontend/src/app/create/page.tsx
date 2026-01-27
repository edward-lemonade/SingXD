"use client";

import { useRef, useState } from "react";
import axios from "axios";
import Wallpaper from "@/src/components/wallpaper";
import AudioStep from "@/src/app/create/steps/AudioStep";
import LyricsStep from "@/src/app/create/steps/LyricsStep";
import VideoStep from "@/src/app/create/steps/VideoStep";
import ExportStep from "@/src/app/create/steps/ExportStep";
import { AudioFiles, SyncLines, SyncLine, SyncPoint } from "../../lib/types/types";
import * as CreateAPI from "@/src/lib/api/CreateAPI";

const steps = [
	{ id: 1, name: "Audio" },
	{ id: 2, name: "Lyrics" },
	{ id: 3, name: "Video" },
	{ id: 4, name: "Export" },
];

interface VideoSettings {
	font: string;
	textSize: number;
	textColor: string;
	backgroundImage?: File;
}


export default function CreatePage() {
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
	const [audio, setAudio] = useState<AudioFiles>({});
	const [lyrics, setLyrics] = useState('');
	const [alignment, setAlignment] = useState<SyncPoint[]>([]);
	const [videoSettings, setVideoSettings] = useState<VideoSettings>({
		font: 'Arial',
		textSize: 24,
		textColor: '#000000',
	});
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const sessionId = useRef<string | null>(null);

	const lineSyncs: SyncLines = {
		lines: lyrics.split(/[.,!?;\n]/).reduce<SyncLine[]>(
			(lines, line) => {
				const words = line.trim().split(/\s+/).filter(Boolean);

				const firstWordIndex = lines.reduce(
					(sum, l) => sum + l.words.length,
					0
				);

				lines.push({
					words,
					firstWordIndex,
					start: alignment[firstWordIndex]?.start ?? 0,
					end: alignment[firstWordIndex + words.length - 1]?.end ?? 0,
				});

				return lines;
			},
			[]
		),
	};

	const [separateAudioLoading, setSeparateAudioLoading] = useState(false);
	const handleSeparateAudio = async () => {
		if (!audio.combined) return;
		setSeparateAudioLoading(true);
		try {
			const res = await CreateAPI.separateAudio(audio.combined);

			sessionId.current = res.sessionId;

			// Fetch audio files from URLs
			const [vocalsResponse, instResponse] = await Promise.all([
				fetch(res.vocalsUrl),
				fetch(res.instrumentalUrl),
			]);
			const vocalsBlob = await vocalsResponse.blob();
			const vocalsFile = new File([vocalsBlob], 'vocals.wav', { type: 'audio/wav' });
			const instBlob = await instResponse.blob();
			const instFile = new File([instBlob], 'inst.wav', { type: 'audio/wav' });
			setAudio(prev => ({ 
				...prev, 
				vocals: vocalsFile, 
				instrumental: instFile, 
				vocalsURL: res.vocalsUrl, 
				instrumentalURL: res.instrumentalUrl
			}));
		} catch (error) {
			console.error('Failed to separate audio', error);
		} finally {
			setSeparateAudioLoading(false);
		}
	};

	const [generateAlignmentLoading, setGenerateAlignmentLoading] = useState(false);
	const handleGenerateAlignment = async() => {
		if (!audio.vocals || !lyrics) return;
		setGenerateAlignmentLoading(true);
		try {
			const syncPoints = await CreateAPI.generateAlignment(sessionId.current!, lyrics);
			setAlignment(syncPoints);
		} catch (error) {
			console.error('Failed to generate alignment', error);
		} finally {
			setGenerateAlignmentLoading(false);
		}
	}

	const [generateVideoLoading, setGenerateVideoLoading] = useState(false);
	const handleGenerateVideo = async () => {
		setGenerateVideoLoading(true);
		try {
			if (!audio.instrumental || !audio.vocals || !lineSyncs || !videoSettings.backgroundImage) {
				throw new Error('Missing required data for export');
			} 

            const url = await CreateAPI.generateVideo(
                audio.instrumental,
                audio.vocals,
                videoSettings.backgroundImage,
                lineSyncs,
                alignment
            )

			setVideoUrl(url);
			//window.open(url, '_blank');
		} catch (error) {
			console.error('Failed to generate video', error);
		} finally {
			setGenerateVideoLoading(false);
		}
	};

	return (
		<Wallpaper color="lavender">
			<div className="flex flex-col h-screen">
				{/* Topbar */}
				<div className=" bg-purple-800 text-white p-4 flex-shrink-0">
					<h1 className="text-2xl font-bold">
						{steps.find(step => step.id === currentStep)?.name}
					</h1>
				</div>

				{/* Container with Navbar and Content */}
				<div className="flex flex-1 overflow-hidden">
					{/* Vertical Navbar - Fixed Left */}
					<div className="w-40 bg-linear-to-b from-purple-900 to-blue-900 p-4 flex-shrink-0">
						<nav className="space-y-2">
							{steps.map((step) => (
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

					{/* Content - Fills remaining space */}
					<div className="flex-1 overflow-auto p-8">
						{currentStep === 1 && (
							<AudioStep
								audio={audio}
								setAudio={setAudio}
								loading={separateAudioLoading}
								onSeparate={handleSeparateAudio}
							/>
						)}

						{currentStep === 2 && (
							<LyricsStep
								lyrics={lyrics}
								setLyrics={setLyrics}
								audio={audio}
								alignment={alignment}
								loading={generateAlignmentLoading}
								onAlign={handleGenerateAlignment}
							/>
						)}

						{currentStep === 3 && (
							<VideoStep
								videoSettings={videoSettings}
								setVideoSettings={setVideoSettings}
							/>
						)}

						{currentStep === 4 && (
							<ExportStep
								videoUrl={videoUrl}
								loading={generateVideoLoading}
								onExport={handleGenerateVideo}
							/>
						)}
					</div>
				</div>
			</div>
		</Wallpaper>
	);
}