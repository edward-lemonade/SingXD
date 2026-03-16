function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface ChartControlsProps {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isGame?: boolean;
    onTogglePlayPause?: () => void;
    onSeek?: (time: number) => void;
}

export default function ChartControls({
    currentTime,
    duration,
    isPlaying,
    isGame = false,
    onTogglePlayPause,
    onSeek,
}: ChartControlsProps) {
    return (
        <div
            style={{
                padding: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }}
        >
            <input
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={currentTime}
                onChange={
                    isGame || !onSeek
                        ? undefined
                        : e => onSeek(parseFloat(e.target.value))
                }
                disabled={isGame}
                style={{
                    width: '100%',
                    ...(isGame ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                }}
                aria-label="progress"
            />

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#fff',
                }}
            >
                <span>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {!isGame && onTogglePlayPause && (
                    <button
                        onClick={onTogglePlayPause}
                        style={{
                            padding: '10px 30px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backgroundColor: '#FFD700',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                        }}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                )}
            </div>
        </div>
    );
}