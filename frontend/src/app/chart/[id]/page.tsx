"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ChartPlayer from "@/src/components/ChartPlayer";
import { ChartDraft } from "@/src/lib/types/types";
import * as ChartAPI from "@/src/lib/api/ChartAPI";

export default function ChartPage() {
	const params = useParams();
	const id = params.id;
	const [chartDraft, setChartDraft] = useState<ChartDraft | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) {
			setLoading(false);
			setError("Missing ID");
			return;
		}
		ChartAPI.getChart(Number(id))
			.then((res) => setChartDraft(res.chart))
			.catch((err) => setError(err?.response?.data?.error ?? err?.message ?? "Failed to load chart"))
			.finally(() => setLoading(false));
	}, [id]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-gray-600">Loading...</p>
			</div>
		);
	}
	if (error || !chartDraft) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-red-600">{error ?? "Chart not found"}</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-8">
			<ChartPlayer chart={chartDraft} />
		</div>
	);
}
