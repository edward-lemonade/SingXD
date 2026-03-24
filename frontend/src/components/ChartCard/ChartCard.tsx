import { PublicChart } from "@/src/lib/types/models";
import Link from "next/link";

export function ChartCard({ chart }: { chart: PublicChart }) {
    const title = chart.properties.title || 'Untitled';
    const artist = chart.properties.artist || '';
    const songTitle = chart.properties.songTitle || '';
    const bg = chart.properties.backgroundImageUrl;

    return (
        <Link href={`/chart/${chart.id}`} className="group block">
            <div className="bg-white border-4 border-black overflow-hidden transition-transform duration-150
    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
    group-hover:-translate-y-1
    group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div
                    className="h-40 bg-purple-900 relative overflow-hidden"
                    style={
                        bg
                            ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : undefined
                    }
                >
                    {!bg && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <svg viewBox="0 0 24 24" fill="white" className="w-16 h-16">
                                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                            </svg>
                        </div>
                    )}
                    {bg && <div className="absolute inset-0 bg-black/30" />}
                </div>
                <div className="p-3">
                    <p className="font-bold text-black truncate leading-tight">{title}</p>
                    {songTitle && (
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                            {songTitle}{artist ? ` — ${artist}` : ''}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}