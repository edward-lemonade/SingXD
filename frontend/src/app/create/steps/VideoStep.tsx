"use client";

import Box from "@/src/components/box";
import { SetStateAction } from "react";

interface VideoSettings {
	font: string;
	textSize: number;
	textColor: string;
	backgroundImage?: File;
}

interface VideoStepProps {
	videoSettings: VideoSettings;
	setVideoSettings: (video: SetStateAction<VideoSettings>) => void;
}

export default function VideoStep({ videoSettings, setVideoSettings }: VideoStepProps) {
	return (
		<section>
			<Box className="p-6 space-y-4">
				<div>
					<label className="block mb-2">Font</label>
					<select
						value={videoSettings.font}
						onChange={(e) => setVideoSettings((prev) => ({ ...prev, font: e.target.value }))}
						className="border p-2 rounded"
					>
						<option value="Arial">Arial</option>
						<option value="Times New Roman">Times New Roman</option>
						<option value="Courier New">Courier New</option>
					</select>
				</div>
				<div>
					<label className="block mb-2">Text Size</label>
					<input
						type="number"
						value={videoSettings.textSize}
						onChange={(e) => setVideoSettings((prev) => ({ ...prev, textSize: parseInt(e.target.value) }))}
						className="border p-2 rounded"
					/>
				</div>
				<div>
					<label className="block mb-2">Text Color</label>
					<input
						type="color"
						value={videoSettings.textColor}
						onChange={(e) => setVideoSettings((prev) => ({ ...prev, textColor: e.target.value }))}
						className="border p-2 rounded"
					/>
				</div>
				<div>
					<label className="block mb-2">Background Image</label>
					<input
						type="file"
						accept="image/*"
						onChange={(e) => setVideoSettings((prev) => ({ ...prev, backgroundImage: e.target.files?.[0] }))}
					/>
				</div>
			</Box>
		</section>
	);
}
