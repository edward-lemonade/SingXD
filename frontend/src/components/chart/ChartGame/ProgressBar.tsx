interface GameProgressBarProps {
    currentTime: number;
    duration: number;
}

function formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
}

export const GAME_PROGRESS_BAR_HEIGHT_PX = 48;

export default function GameProgressBar({ currentTime, duration }: GameProgressBarProps) {
    const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
    console.log(progress)

    return (
        <div
            style={{
                height: `${GAME_PROGRESS_BAR_HEIGHT_PX}px`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 20px',
            }}
        >
            <span
                style={{
                    color: '#fff',
                    fontSize: '13px',
                    fontVariantNumeric: 'tabular-nums',
                    opacity: 0.9,
                    minWidth: '36px',
                    textAlign: 'right',
                }}
            >
                {formatTime(currentTime)}
            </span>

            <div
                style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${progress * 100}%`,
                        backgroundColor: '#FFD700',
                        borderRadius: '2px',
                        transition: 'width 0.25s linear',
                    }}
                />
            </div>

            <span
                style={{
                    color: '#fff',
                    fontSize: '13px',
                    fontVariantNumeric: 'tabular-nums',
                    opacity: 0.9,
                    minWidth: '36px',
                }}
            >
                {formatTime(duration)}
            </span>
        </div>
    );
}
