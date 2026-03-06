"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SyncMapPlayer from "@/src/components/SyncMapPlayer";
import { SyncMap } from "@/src/lib/types/types";
import * as CreateAPI from "@/src/lib/api/SyncMapAPI";

export default function SyncMapPage() {
	const params = useParams();
	const uuid = params.uuid as string;
	const [syncMap, setSyncMap] = useState<SyncMap | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!uuid) {
			setLoading(false);
			setError("Missing UUID");
			return;
		}
		CreateAPI.getSyncMap(uuid)
			.then(setSyncMap)
			.catch((err) => setError(err?.response?.data?.error ?? err?.message ?? "Failed to load syncmap"))
			.finally(() => setLoading(false));
	}, [uuid]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-gray-600">Loading...</p>
			</div>
		);
	}
	if (error || !syncMap) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-red-600">{error ?? "SyncMap not found"}</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-8">
			<SyncMapPlayer syncMap={syncMap} />
		</div>
	);
}
