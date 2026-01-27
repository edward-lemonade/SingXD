"use client";

import Box from "@/src/components/box";
import { AudioFiles, SyncPoint } from "../../../lib/types/types";

interface LyricsStepProps {
	lyrics: string;
	setLyrics: (lyrics: string) => void;
	audio: AudioFiles;
	alignment: SyncPoint[];
	loading: boolean;
	onAlign: () => void;
}

export default function LyricsStep({ lyrics, setLyrics, audio, loading, onAlign }: LyricsStepProps) {
	return (
		<section>
			<Box className="p-6">
				<textarea
					value={lyrics}
					onChange={(e) => setLyrics(e.target.value)}
					className="w-full min-h-48 p-4 border-2 border-gray-200 rounded-md resize-y"
					placeholder="Paste or enter lyrics here..."
				/>
				{lyrics!! &&  (
					<button
						onClick={onAlign}
						disabled={loading}
						className="bg-blue-500 text-white px-4 py-2 rounded"
					>
						{loading ? 'Aligning...' : 'Align lyrics to audio'}
					</button>
				)}
			</Box>
		</section>
	);
}
