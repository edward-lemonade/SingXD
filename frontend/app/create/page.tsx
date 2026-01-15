"use client";

import { useRef, useState } from "react";
import axios from "axios";
import Wallpaper from "@/components/wallpaper";
import AudioStep from "@/app/create/steps/AudioStep";
import LyricsStep from "@/app/create/steps/LyricsStep";
import VideoStep from "@/app/create/steps/VideoStep";
import ExportStep from "@/app/create/steps/ExportStep";
import { AudioFiles, ResolvedAlignment, ResolvedAlignmentLine, SyncPoint } from "./types";

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

	const resolvedAlignment: ResolvedAlignment = {
		lines: lyrics.split("\n").reduce<ResolvedAlignmentLine[]>(
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
			const formData = new FormData();
			formData.append('audio', audio.combined);

			const response = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/separate-audio`, 
				formData, 
				{ timeout: 5 * 60 * 1000 } // 5 min timeout
			);

			sessionId.current = response.data.sessionId;

			// Fetch audio files from URLs
			const [vocalsResponse, instResponse] = await Promise.all([
				fetch(response.data.vocals),
				fetch(response.data.instrumental),
			]);
			const vocalsBlob = await vocalsResponse.blob();
			const vocalsFile = new File([vocalsBlob], 'vocals.wav', { type: 'audio/wav' });
			const instBlob = await instResponse.blob();
			const instFile = new File([instBlob], 'inst.wav', { type: 'audio/wav' });
			setAudio(prev => ({ 
				...prev, 
				vocals: vocalsFile, 
				instrumental: instFile, 
				vocalsURL: response.data.vocals, 
				instrumentalURL: response.data.instrumental
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
			const formData = new FormData();
			formData.append('sessionID', sessionId.current!);
			formData.append('lyrics', lyrics);

			const response = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/generate-alignment`, 
				formData, 
				{ timeout: 5 * 60 * 1000 } // 5 min timeout
			);

			setAlignment(response.data);
		} catch (error) {
			console.error('Failed to generate alignment', error);
		} finally {
			setGenerateAlignmentLoading(false);
		}
	}

	const [exportLoading, setExportLoading] = useState(false);
	const handleExport = async () => {
		setExportLoading(true);
		try {
			const formData = new FormData();
			if (!audio.instrumental || !audio.vocals || !resolvedAlignment || !videoSettings.backgroundImage) {
				throw new Error('Missing required data for export');
			} 

			formData.append('instrumental', audio.instrumental);
			formData.append('vocals', audio.vocals);
			formData.append('backgroundImage', videoSettings.backgroundImage);
			formData.append('alignment', JSON.stringify(resolvedAlignment));
			formData.append('syncPoints', JSON.stringify(alignment));

			//formData.append('font', video.font);
			//formData.append('textSize', video.textSize.toString());
			//formData.append('textColor', video.textColor);
			
			const response = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/generate-video`, 
				formData,
				{ timeout: 20 * 60 * 1000 } 
			);
			
			// Handle download
			const url = response.data.videoUrl;
			setVideoUrl(url);
			//window.open(url, '_blank');
		} catch (error) {
			console.error('Failed to generate video', error);
		} finally {
			setExportLoading(false);
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
								loading={exportLoading}
								onExport={handleExport}
							/>
						)}
					</div>
				</div>
			</div>
		</Wallpaper>
	);
}