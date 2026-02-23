"use client";

import Card from "@/src/components/Card";
import { AudioUrls } from "../page";

interface AudioStepProps {
	audioUrls: AudioUrls;
	setAudioUrls: React.Dispatch<React.SetStateAction<AudioUrls>>;
	loading: boolean;
	handleSeparateAudio: () => void;
}

export default function AudioStep({ audioUrls, setAudioUrls, loading, handleSeparateAudio }: AudioStepProps) {
    const onCombinedFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioUrls((prev) => {
                return {
                    ...prev,
                    combined: url,
                }
            })
        }
    }

    const onInstrumentalFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioUrls((prev) => {
                return {
                    ...prev,
                    instrumental: url,
                }
            })
        }
    }

    const onVocalsFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioUrls((prev) => {
                return {
                    ...prev,
                    vocals: url,
                }
            })
        }
    }

	return (
		<section>
			<div className="space-y-6">
				<Card className="p-6">
					<h3 className="text-xl font-semibold mb-4">Upload Combined Audio (Optional - for AI Separation)</h3>
					<input
						type="file"
						accept="audio/*"
						onChange={onCombinedFileInputChange}
						className="mb-4"
					/>
					{audioUrls.combined && (
                        <>
                            <div className="mt-2">
                                <audio controls src={audioUrls.combined} className="mt-1" />
                            </div>
                            <button
                                onClick={handleSeparateAudio}
                                disabled={loading}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                {loading ? 'Separating...' : 'Separate into Stems'}
                            </button>
                        </>
					)}
				</Card>
				<Card className="p-6">
					<h3 className="text-xl font-semibold mb-4">Audio Stems</h3>
					<div className="space-y-4">
						<div>
							<label className="block mb-2">Instrumental</label>
							<input
								type="file"
								accept="audio/*"
								onChange={onInstrumentalFileInputChange}
							/>
							{audioUrls.instrumental && (
								<div className="mt-2">
									<audio controls src={audioUrls.instrumental} className="mt-1" />
								</div>
							)}
						</div>
						<div>
							<label className="block mb-2">Vocals</label>
							<input
								type="file"
								accept="audio/*"
								onChange={onVocalsFileInputChange}
							/>
							{audioUrls.vocals && (
								<div className="mt-2">
									<audio controls src={audioUrls.vocals} className="mt-1" />
								</div>
							)}
						</div>
					</div>
				</Card>
			</div>
		</section>
	);
}
