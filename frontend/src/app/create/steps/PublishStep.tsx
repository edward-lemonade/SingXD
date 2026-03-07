"use client";

import Card from "@/src/components/Card";
import SyncMapPlayer from "@/src/components/SyncMapPlayer";
import { SyncMapDraft, SyncMapProperties } from "@/src/lib/types/types";
import { SetStateAction } from "react";
import { AudioUrls } from "../page";

interface PublishStepProps {
	syncMap: SyncMapDraft;
	syncMapProps: SyncMapProperties;
	setSyncMapProps: (video: SetStateAction<SyncMapProperties>) => void;
	loading: boolean;
	handlePublish: () => void;
}

export default function PublishStep({ syncMap, syncMapProps, setSyncMapProps, loading, handlePublish }: PublishStepProps) {

	return (
		<section>
			<Card className="p-6 space-y-4 flex flex-row">
				<div className="flex flex-col">
					<div>
						<label className="block mb-2">SyncMap Title</label>
						<input
							type="text"
							value={syncMapProps.title}
							onChange={(e) => setSyncMapProps((prev) => ({ ...prev, title: e.target.value }))}
							className="border p-2 rounded"
						/>
					</div>
					<div>
						<label className="block mb-2">Song Title</label>
						<input
							type="text"
							value={syncMapProps.songTitle}
							onChange={(e) => setSyncMapProps((prev) => ({ ...prev, songTitle: e.target.value }))}
							className="border p-2 rounded"
						/>
					</div>
					<div>
						<label className="block mb-2">Song Artist</label>
						<input
							type="text"
							value={syncMapProps.artist}
							onChange={(e) => setSyncMapProps((prev) => ({ ...prev, artist: e.target.value }))}
							className="border p-2 rounded"
						/>
					</div>
					<button
						onClick={handlePublish}
						disabled={loading}
						className="bg-blue-500 text-white px-4 py-2 rounded"
					>
						{loading ? 'Publishing...' : 'Publish'}
					</button>
				</div>
			</Card>

		</section>
	);
}
