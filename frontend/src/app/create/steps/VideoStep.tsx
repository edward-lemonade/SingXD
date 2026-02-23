"use client";

import Card from "@/src/components/Card";
import SyncMapPlayer from "@/src/components/SyncMapPlayer";
import { SyncMap, SyncMapSettings } from "@/src/lib/types/types";
import { SetStateAction } from "react";
import { AudioUrls } from "../page";

interface VideoStepProps {
	syncMap: SyncMap;
	syncMapSettings: SyncMapSettings;
	setSyncMapSettings: (video: SetStateAction<SyncMapSettings>) => void;
}

export default function VideoStep({ syncMap, syncMapSettings, setSyncMapSettings }: VideoStepProps) {
    const onBackgroundImageFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileUrl = URL.createObjectURL(file);
        setSyncMapSettings((prev) => ({
            ...prev,
            backgroundImageUrl: fileUrl,
        }));
    }

	return (
		<section>
			<Card className="p-6 space-y-4">
				<div>
					<label className="block mb-2">Font</label>
					<select
						value={syncMapSettings.font}
						onChange={(e) => setSyncMapSettings((prev) => ({ ...prev, font: e.target.value }))}
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
						value={syncMapSettings.textSize}
						onChange={(e) => setSyncMapSettings((prev) => ({ ...prev, textSize: parseInt(e.target.value) }))}
						className="border p-2 rounded"
					/>
				</div>
				<div>
					<label className="block mb-2">Text Color</label>
					<input
						type="color"
						value={syncMapSettings.textColor}
						onChange={(e) => setSyncMapSettings((prev) => ({ ...prev, textColor: e.target.value }))}
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
			</Card>

			<SyncMapPlayer
				syncMap={syncMap}
			/>
		</section>
	);
}
