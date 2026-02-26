"use client";

import Card from "@/src/components/Card";
import { Line, SyncMapMetadata, Timing } from "../../../lib/types/types";
import { AudioUrls } from "../page";
import React, { SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import SyncMapTimingEditor from "@/src/components/SyncMapTimingEditor";

interface LyricsStepProps {
	lyricsString: string;
	setLyricsString: (lyrics: string) => void;
	lines: Line[];
	audioUrls: AudioUrls;
	timings: Timing[];
	setTimings: (syncPoints: SetStateAction<Timing[]>) => void;
	loading: boolean;
	generateAlignment: () => void;
}

export default function LyricsStep({ 
	lyricsString, 
	setLyricsString, 
	lines,
	audioUrls, 
	timings, 
	setTimings, 
	loading, 
	generateAlignment,
}: LyricsStepProps) {
	const [useInstrumental, setUseInstrumental] = useState(false);
	const audioUrl = useInstrumental ? audioUrls.instrumental : audioUrls.combined;

	const flatWords = useMemo(() => 
    	lines.flatMap((line, lineIndex) => 
        line.words.map(word => word.text)
    ), [lines]);

	return (
		<section>
			<div className="space-y-6">
				<Card className="p-6">
					<textarea
						value={lyricsString}
						onChange={(e) => setLyricsString(e.target.value)}
						className="w-full min-h-48 p-4 border-2 border-gray-200 rounded-md resize-y"
						placeholder="Paste or enter lyrics here..."
					/>
					{lyricsString && (
						<button
							onClick={generateAlignment}
							disabled={loading}
							className="bg-blue-500 text-white px-4 py-2 rounded"
						>
							{loading ? 'Aligning...' : 'Align lyrics to audio with AI'}
						</button>
					)}
				</Card>

				<SyncMapTimingEditor
					audioUrl={audioUrl}
					timings={timings}
					setTimings={setTimings}
					words={flatWords}
				/>
			</div>
		</section>
	);
}