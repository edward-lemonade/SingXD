"use client";

import Box from "@/src/components/Box";
import SyncMapPlayer from "@/src/components/SyncMapPlayer";
import { SyncMap, SyncMapSettings } from "@/src/lib/types/types";
import { SetStateAction } from "react";
import { AudioUrls } from "../page";

interface VideoStepProps {
	syncMap: SyncMap;
	videoSettings: SyncMapSettings;
	setVideoSettings: (video: SetStateAction<SyncMapSettings>) => void;
}

export default function VideoStep({ syncMap, videoSettings, setVideoSettings }: VideoStepProps) {
    const onBackgroundImageFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileUrl = URL.createObjectURL(file);
        setVideoSettings((prev) => ({
            ...prev,
            backgroundImage: fileUrl,
        }));
    }

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
						onChange={onBackgroundImageFileInputChange}
					/>
				</div>
			</Box>

			<SyncMapPlayer
				syncMap={syncMap}
			/>
		</section>
	);
}
