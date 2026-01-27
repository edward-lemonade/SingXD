"use client";

import Box from "@/src/components/box";
import { AudioFiles } from "../../../lib/types/types";

interface AudioStepProps {
	audio: AudioFiles;
	setAudio: (audio: any) => void;
	loading: boolean;
	onSeparate: () => void;
}

export default function AudioStep({ audio, setAudio, loading, onSeparate }: AudioStepProps) {
	return (
		<section>
			<div className="space-y-6">
				<Box className="p-6">
					<h3 className="text-xl font-semibold mb-4">Upload Combined Audio (Optional - for AI Separation)</h3>
					<input
						type="file"
						accept="audio/*"
						onChange={(e) => setAudio((prev: any) => ({ ...prev, combined: e.target.files?.[0] }))}
						className="mb-4"
					/>
					{audio.combined && (
						<button
							onClick={onSeparate}
							disabled={loading}
							className="bg-blue-500 text-white px-4 py-2 rounded"
						>
							{loading ? 'Separating...' : 'Separate into Stems'}
						</button>
					)}
				</Box>
				<Box className="p-6">
					<h3 className="text-xl font-semibold mb-4">Audio Stems</h3>
					<div className="space-y-4">
						<div>
							<label className="block mb-2">Instrumental</label>
							<input
								type="file"
								accept="audio/*"
								onChange={(e) => setAudio((prev: any) => ({ ...prev, instrumental: e.target.files?.[0] }))}
							/>
							{audio.instrumental && (
								<div className="mt-2">
									<p className="text-sm text-gray-600">{audio.instrumental.name}</p>
									<audio controls src={URL.createObjectURL(audio.instrumental)} className="mt-1" />
								</div>
							)}
						</div>
						<div>
							<label className="block mb-2">Vocals</label>
							<input
								type="file"
								accept="audio/*"
								onChange={(e) => setAudio((prev: any) => ({ ...prev, vocals: e.target.files?.[0] }))}
							/>
							{audio.vocals && (
								<div className="mt-2">
									<p className="text-sm text-gray-600">{audio.vocals.name}</p>
									<audio controls src={URL.createObjectURL(audio.vocals)} className="mt-1" />
								</div>
							)}
						</div>
					</div>
				</Box>
			</div>
		</section>
	);
}
