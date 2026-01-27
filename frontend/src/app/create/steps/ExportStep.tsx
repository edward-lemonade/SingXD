"use client";

import Box from "@/src/components/box";

interface ExportStepProps {
	loading: boolean;
	videoUrl: string | null;
	onExport: () => void;
}

export default function ExportStep({ loading, videoUrl, onExport }: ExportStepProps) {
	return (
		<section className="space-y-6">
			<Box className="p-6 flex flex-col items-center gap-4">
				<button
					onClick={onExport}
					disabled={loading}
					className="bg-green-500 text-white px-6 py-3 rounded disabled:opacity-50"
				>
					{loading ? "Generating..." : "Generate Video"}
				</button>

				{videoUrl && (
					<div className="w-full max-w-3xl border-4 border-black rounded-lg overflow-hidden">
						<video
							src={videoUrl}
							controls
							className="w-full h-auto bg-black"
						/>
					</div>
				)}
			</Box>
		</section>
	);
}
