import { ChartPreview } from '@/src/components/Chart';
import { PublicChart } from '@/src/lib/types/models';
import { Logo } from '@/src/components/Logo';
import Link from 'next/link';

export function IntroPane({
    chart,
    isFinished,
    onPlay,
}: {
    chart: PublicChart;
    isFinished: boolean;
    onPlay: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <Link href="/">
                <Logo fontSize={50}/>
            </Link>
            
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                {chart.properties.title ?? 'Chart'}
            </h1>

            <div className="w-full flex items-center justify-center">
                <ChartPreview chart={chart} playerSettings={{ width: 420, height: 420 }} />
            </div>

            <button
                onClick={onPlay}
                className="flex items-center gap-3 px-8 py-4 rounded-full text-xl font-bold shadow-2xl transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: '#FFD700', color: '#000' }}
            >
                <span
                    style={{
                        display: 'inline-block',
                        width: 0,
                        height: 0,
                        borderTop: '10px solid transparent',
                        borderBottom: '10px solid transparent',
                        borderLeft: '18px solid #000',
                        marginRight: '2px',
                    }}
                />
                {isFinished ? 'Play Again' : 'Play'}
            </button>
        </div>
    );
}
