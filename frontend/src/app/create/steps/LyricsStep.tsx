"use client";

import Card from "@/src/components/Card";
import { Line, Timing } from "../../../lib/types/types";
import { AudioUrls } from "../page";
import React, { SetStateAction, useMemo, useState } from "react";
import SyncMapAlignmentEditor from "@/src/components/SyncMapAlignmentEditor";
import SyncMapLyricsEditor from "@/src/components/SyncMapLyricsEditor";

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

	const flatWords = useMemo(
		() => lines.flatMap((line) => line.words.map((word) => word.text)),
		[lines]
	);

	/**
	 * When a timed word-brick is clicked, seek the audio player to that timing.
	 * Extend this to call into your SyncMapAlignmentEditor / audio player as needed.
	 */
	const handleWordTimingClick = (timing: Timing, wordFlatIndex: number) => {
		// Example: seek audio to timing.start
		// audioPlayerRef.current?.seekTo(timing.start);
		console.log(`Word #${wordFlatIndex} clicked — start: ${timing.start}s, end: ${timing.end}s`);
	};

	return (
		<section>
			<div className="space-y-6">
				<Card className="p-6 space-y-4">
					<label className="block text-sm font-medium text-gray-700">
						Lyrics
					</label>

					<SyncMapLyricsEditor
						lyricsString={lyricsString}
						onChange={setLyricsString}
						timings={timings}
						onWordTimingClick={handleWordTimingClick}
						placeholder="Paste or type lyrics here…"
					/>

					{lyricsString && (
						<button
							onClick={generateAlignment}
							disabled={loading}
							className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
						>
							{loading ? "Aligning…" : "Align lyrics to audio with AI"}
						</button>
					)}
				</Card>

				<SyncMapAlignmentEditor
					audioUrl={audioUrl}
					timings={timings}
					setTimings={setTimings}
					words={flatWords}
				/>
			</div>
		</section>
	);
}