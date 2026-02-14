"use client";

import Box from "@/src/components/Box";
import { SyncMapMetadata, SyncPoint } from "../../../lib/types/types";
import { AudioUrls } from "../page";
import React, { SetStateAction, useEffect, useRef, useState } from "react";
import SyncMapAlignmentEditor from "@/src/components/SyncMapAlignmentEditor";

interface LyricsStepProps {
	lyrics: string;
	setLyrics: (lyrics: string) => void;
	audioUrls: AudioUrls;
	syncPoints: SyncPoint[];
	setSyncPoints: (syncPoints: SetStateAction<SyncPoint[]>) => void;
	loading: boolean;
	onAlign: () => void;
}

export default function LyricsStep({ 
	lyrics, 
	setLyrics, 
	audioUrls, 
	syncPoints, 
	setSyncPoints, 
	loading, 
	onAlign,
}: LyricsStepProps) {
	const [useInstrumental, setUseInstrumental] = useState(false);
	const audioUrl = useInstrumental ? audioUrls.instrumental : audioUrls.combined;

	return (
		<section>
			<div className="space-y-6">
				<Box className="p-6">
					<textarea
						value={lyrics}
						onChange={(e) => setLyrics(e.target.value)}
						className="w-full min-h-48 p-4 border-2 border-gray-200 rounded-md resize-y"
						placeholder="Paste or enter lyrics here..."
					/>
					{lyrics && (
						<button
							onClick={onAlign}
							disabled={loading}
							className="bg-blue-500 text-white px-4 py-2 rounded"
						>
							{loading ? 'Aligning...' : 'Align lyrics to audio with AI'}
						</button>
					)}
				</Box>

				<SyncMapAlignmentEditor
					audioUrl={audioUrl}
					syncPoints={syncPoints}
					setSyncPoints={setSyncPoints}
				/>
			</div>
		</section>
	);
}