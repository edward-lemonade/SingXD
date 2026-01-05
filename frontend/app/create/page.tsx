"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import Box from "@/components/box";
import Wallpaper from "@/components/wallpaper";

type FormValues = {
	mode: "single" | "split";
	singleFile: FileList | null;
	vocalFile: FileList | null;
	instrumentalFile: FileList | null;
	lyrics: string;
};

export default function CreatePage() {
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		setError,
		clearErrors,
		reset,
		formState: { errors },
	} = useForm<FormValues>({
		defaultValues: {
			mode: "single",
			singleFile: null,
			vocalFile: null,
			instrumentalFile: null,
			lyrics: "",
		},
	});

	const mode = watch("mode");
	const singleFile = watch("singleFile");
	const vocalFile = watch("vocalFile");
	const instrumentalFile = watch("instrumentalFile");

	const onSubmit = async (data: FormValues) => {
		setMessage(null);
		clearErrors();

		// Validation
		if (!data.lyrics.trim()) {
			setError("lyrics", { message: "Please add the song lyrics." });
			setMessage("Please add the song lyrics.");
			return;
		}

		if (data.mode === "single" && (!data.singleFile || data.singleFile.length === 0)) {
			setError("singleFile", { message: "Please upload the audio file." });
			setMessage("Please upload the audio file.");
			return;
		}

		if (data.mode === "split") {
			if (!data.vocalFile || data.vocalFile.length === 0 || !data.instrumentalFile || data.instrumentalFile.length === 0) {
				setMessage("Please upload both vocal and instrumental files.");
				return;
			}
		}

		setSubmitting(true);
		try {
			// Prepare form data
			const fd = new FormData();
			fd.append("lyrics", data.lyrics);
			
			if (data.mode === "single" && data.singleFile && data.singleFile.length > 0) {
				fd.append("audio", data.singleFile[0]);
			}
			
			if (data.mode === "split") {
				if (data.vocalFile && data.vocalFile.length > 0) {
					fd.append("vocal", data.vocalFile[0]);
				}
				if (data.instrumentalFile && data.instrumentalFile.length > 0) {
					fd.append("instrumental", data.instrumentalFile[0]);
				}
			}

			try {
				const response = await axios.post('/api/maps', fd, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});

				if (response.status >= 200 && response.status < 300) {
					setMessage(response.data?.message ?? 'Submitted successfully.');
					reset({ mode: 'single', singleFile: null, vocalFile: null, instrumentalFile: null, lyrics: '' });
				} else {
					setMessage('Submission failed.');
				}
			} catch (err:any) {
				console.error(err);
				setMessage(err?.response?.data?.message ?? err?.message ?? 'Submission failed.');
			}
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Wallpaper color="lavender">
			<div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
				<div>
					<h2 className="text-4xl md:text-6xl font-bold text-gray-800">Create Karaoke Map</h2>
				</div>

				<section>
					<h3 className="text-2xl font-semibold mb-3 text-gray-600">Audio</h3>
					<div className="flex flex-col md:flex-row gap-4">
						<Box className="p-6 flex-1">
							<label className="flex items-center gap-3">
								<input
									{...register("mode")}
									type="radio"
									value="single"
									className="mr-2"
								/>
								<span className="font-medium">Upload a single audio file</span>
							</label>
							<div className="mt-4 flex items-center justify-between gap-4">
								<span className="text-sm text-black">
									{singleFile && singleFile.length > 0 ? `Selected: ${singleFile[0].name}` : "No file selected"}
								</span>
								<input
									{...register("singleFile")}
									className="text-sm text-gray-700 file:border-0 file:bg-black file:text-white file:px-3 file:py-1 file:rounded"
									type="file"
									accept="audio/*"
									disabled={mode !== "single"}
								/>
							</div>
						</Box>

						<Box className="p-6 flex-1">
							<label className="flex items-center gap-3">
								<input
									{...register("mode")}
									type="radio"
									value="split"
									className="mr-2"
								/>
								<span className="font-medium">Upload vocal and instrumental</span>
							</label>
							<div className="mt-4 flex flex-col gap-3">
								<div className="flex items-center justify-between gap-4">
									<span className="text-sm text-black">Vocals</span>
									<input
										{...register("vocalFile")}
										className="text-sm text-gray-700 file:border-0 file:bg-black file:text-white file:px-3 file:py-1 file:rounded ml-4"
										type="file"
										accept="audio/*"
										disabled={mode !== "split"}
									/>
									{vocalFile && vocalFile.length > 0 && (
										<span className="ml-2 text-sm text-gray-600 truncate max-w-48">{vocalFile[0].name}</span>
									)}
								</div>
								<div className="flex items-center justify-between gap-4">
									<span className="text-sm text-black">Instrumental</span>
									<input
										{...register("instrumentalFile")}
										className="text-sm text-gray-700 file:border-0 file:bg-black file:text-white file:px-3 file:py-1 file:rounded ml-4"
										type="file"
										accept="audio/*"
										disabled={mode !== "split"}
									/>
									{instrumentalFile && instrumentalFile.length > 0 && (
										<span className="ml-2 text-sm text-gray-600 truncate max-w-48">{instrumentalFile[0].name}</span>
									)}
								</div>
								{((vocalFile && vocalFile.length > 0) || (instrumentalFile && instrumentalFile.length > 0)) && (
									<p className="mt-2 text-sm text-gray-600">
										{vocalFile && vocalFile.length > 0 ? `Vocal: ${vocalFile[0].name}` : ""}{" "}
										{instrumentalFile && instrumentalFile.length > 0 ? `Instrumental: ${instrumentalFile[0].name}` : ""}
									</p>
								)}
							</div>
						</Box>
					</div>
				</section>

				<section>
					<h3 className="text-2xl font-semibold mb-3 text-gray-600">Lyrics</h3>
					<Box className="p-6">
						<textarea
							{...register("lyrics")}
							className="w-full min-h-48 p-4 border-2 border-gray-200 rounded-md resize-y text-black"
							placeholder="Paste or enter lyrics. Use blank lines to separate verses."
						/>
						<p className="mt-2 text-sm text-gray-500">You can also paste cleaned lyrics from the samples folder.</p>
					</Box>
				</section>

				<div className="flex items-center justify-center gap-4">
					<button
						className="bg-black text-white px-6 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
						type="button"
						disabled={submitting}
						onClick={handleSubmit(onSubmit)}
					>
						{submitting ? "Submitting…" : "Create Map"}
					</button>
					{message && <p className="text-sm text-gray-700">{message}</p>}
				</div>
			</div>
		</Wallpaper>
	);
}