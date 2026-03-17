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
                flexShrink: 0,
                padding: '12px 20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
            }}
        >
            {!isGame && onTogglePlayPause && (
                <button
                    onClick={onTogglePlayPause}
                    style={{
                        flexShrink: 0,
                        padding: '8px 20px',
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
                    flex: 1,
                    minWidth: 0,
                    ...(isGame ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                }}
                aria-label="progress"
            />

            <span style={{ flexShrink: 0, color: '#fff', fontSize: '14px' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
        </div>
    );
}