"use client";

import React from "react";
import { Timing } from "@/src/lib/types/types";

interface SyncMapLyricsEditorBrickProps {
	word: string;
	timing?: Timing;
	onClickTiming?: (timing: Timing) => void;
	hasTiming: boolean;
	isSelected?: boolean;
}

export default function SyncMapLyricsEditorBrick({ word, timing, onClickTiming, hasTiming, isSelected }: SyncMapLyricsEditorBrickProps) {
	const handleClick = () => {
		if (timing && onClickTiming) {
			onClickTiming(timing);
		}
	};

	return (
		<span
			contentEditable={false}
			onClick={handleClick}
			data-timing-start={timing?.start}
			data-timing-end={timing?.end}
			title={timing ? `${timing.start.toFixed(2)}s – ${timing.end.toFixed(2)}s` : undefined}
			className={[
				"inline-flex items-center",
				"px-2 py-0.5 mx-0.5 my-0.5",
				"rounded border text-sm font-medium select-none",
				"transition-colors duration-100",
				hasTiming
					? "bg-purple-100 border-purple-300 text-purple-900 hover:bg-purple-200 cursor-pointer"
					: "bg-gray-100 border-gray-300 text-gray-700 cursor-default",
				isSelected
					? "bg-blue-200 border-blue-400 text-blue-900"
					: hasTiming
						? "bg-purple-100 border-purple-300 text-purple-900 hover:bg-purple-200"
						: "bg-gray-100 border-gray-300 text-gray-700"
			].join(" ")}
		>
			{word}
		</span>
	);
}