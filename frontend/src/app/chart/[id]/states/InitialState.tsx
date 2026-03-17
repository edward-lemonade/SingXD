import { Chart } from '@/src/lib/types/models';
import { IntroPane } from './shared';

export default function InitialState({ chart, onPlay }: { chart: Chart; onPlay: () => void }) {
    return (
        <div className="relative z-10 flex flex-col items-center justify-center gap-6">
            <IntroPane chart={chart} isFinished={false} onPlay={onPlay} />
        </div>
    );
}
