"use client";

import Card from "@/src/components/Card";
import { Line, Timing } from "../../../lib/types/types";
import { AudioUrls } from "../page";
import React, { SetStateAction, useMemo, useRef, useState } from "react";
import SyncMapAlignmentEditor, { SyncMapAlignmentEditorHandle } from "@/src/components/SyncMapAlignmentEditor";
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

	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const alignmentEditorRef = useRef<SyncMapAlignmentEditorHandle>(null);

	const flatWords = useMemo(
		() => lines.flatMap((line) => line.words.map((word) => word.text)),
		[lines]
	);

	const handleWordTimingClick = (timing: Timing, wordFlatIndex: number) => {
		setSelectedIndex(wordFlatIndex);
		alignmentEditorRef.current?.seekTo(timing.start);
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
						placeholder="Paste or type lyrics here..."
					/>

					{lyricsString && (
						<button
							onClick={generateAlignment}
							disabled={loading}
							className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
						>
							{loading ? "Aligning..." : "Align lyrics to audio with AI"}
						</button>
					)}
				</Card>

				<SyncMapAlignmentEditor
					ref={alignmentEditorRef}
					audioUrl={audioUrl}
					timings={timings}
					setTimings={setTimings}
					words={flatWords}
					selectedIndex={selectedIndex}
					onSelectedIndexChange={setSelectedIndex}
				/>
			</div>
		</section>
	);
}