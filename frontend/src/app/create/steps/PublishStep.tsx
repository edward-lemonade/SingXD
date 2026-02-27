"use client";

import Card from "@/src/components/Card";
import SyncMapPlayer from "@/src/components/SyncMapPlayer";
import { SyncMap, SyncMapMetadata, SyncMapSettings } from "@/src/lib/types/types";
import { SetStateAction } from "react";
import { AudioUrls } from "../page";

interface PublishStepProps {
	syncMap: SyncMap;
	syncMapMetadata: SyncMapMetadata;
	setSyncMapMetadata: (video: SetStateAction<SyncMapMetadata>) => void;
}

export default function PublishStep({ syncMap, syncMapMetadata, setSyncMapMetadata }: PublishStepProps) {

	return (
		<section>
			<Card className="p-6 space-y-4 flex flex-row">
				<div className="flex flex-col">
					<div>
						<label className="block mb-2">SyncMap Title</label>
						<input
							type="text"
							value={syncMapMetadata.title}
							onChange={(e) => setSyncMapMetadata((prev) => ({ ...prev, title: e.target.value }))}
							className="border p-2 rounded"
						/>
					</div>
					<div>
						<label className="block mb-2">Song Title</label>
						<input
							type="text"
							value={syncMapMetadata.songTitle}
							onChange={(e) => setSyncMapMetadata((prev) => ({ ...prev, songTitle: e.target.value }))}
							className="border p-2 rounded"
						/>
					</div>
					<div>
						<label className="block mb-2">Song Artist</label>
						<input
							type="text"
							value={syncMapMetadata.artist}
							onChange={(e) => setSyncMapMetadata((prev) => ({ ...prev, artist: e.target.value }))}
							className="border p-2 rounded"
						/>
					</div>
				</div>
			</Card>

		</section>
	);
}
