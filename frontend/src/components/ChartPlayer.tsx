import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ChartDraft } from '../lib/types/types';

export interface ChartPlayerSettings {
  width: number;
  height: number;
}

const defaultPlayerSettings: ChartPlayerSettings = {
  width: 720,
  height: 720,
};

export interface ChartPlayerHandle {
  audioElement: HTMLAudioElement | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const ChartPlayer = forwardRef<
  ChartPlayerHandle,
  {
    chart: ChartDraft;
    playerSettings?: Partial<ChartPlayerSettings>;
    game?: boolean;
    onEnded?: () => void;
  }
>(function ChartPlayer(
  { chart, playerSettings: partialSettings, game: locked = false, onEnded },
  ref
) {
  const playerSettings = { ...defaultPlayerSettings, ...partialSettings };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(null);

  // Expose the audio element so ChartGame can drive playback externally.
  useImperativeHandle(ref, () => ({
    get audioElement() {
      return audioRef.current;
    },
  }));

  // Auto-play when locked (ChartGame drives it; no user gesture needed there).
  useEffect(() => {
    if (!locked) return;
    const audio = audioRef.current;
    if (!audio) return;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
  }, [locked]);

  // ── timing index ──────────────────────────────────────────────────────────
  const getCurrentIndices = useMemo(() => {
    return (time: number) => {
      const lines = chart.lines;
      const timings = chart.timings;
      let lineIndex = -1;
      let wordIndex = -1;
      let globalWordIndex = -1;

      for (let i = 0; i < timings.length; i++) {
        if (time >= timings[i].start && time < timings[i].end) {
          globalWordIndex = i;
          break;
        }
      }

      if (globalWordIndex === -1 && timings.length > 0) {
        if (time >= timings[timings.length - 1].end) {
          globalWordIndex = timings.length - 1;
        }
      }

      if (globalWordIndex !== -1) {
        let wordCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (globalWordIndex < wordCount + line.words.length) {
            lineIndex = i;
            wordIndex = globalWordIndex - wordCount;
            break;
          }
          wordCount += line.words.length;
        }
      }

      return { lineIndex, wordIndex };
    };
  }, [chart.lines, chart.timings]);

  const { lineIndex: currentLineIndex, wordIndex: currentWordIndex } =
    getCurrentIndices(currentTime);

  const displayLines = useMemo(() => {
    if (currentLineIndex === -1) return [];
    const start = Math.max(0, currentLineIndex - 1);
    const end = Math.min(chart.lines.length, currentLineIndex + 2);
    return chart.lines.slice(start, end);
  }, [chart, currentLineIndex]);

  // ── animation frame loop ──────────────────────────────────────────────────
  const updateTime = () => {
    if (audioRef.current && isPlaying) {
      setCurrentTime(audioRef.current.currentTime);
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // ── controls (only used in unlocked mode) ─────────────────────────────────
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: playerSettings.width,
        height: playerSettings.height,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000',
        backgroundImage: chart.properties.backgroundImageUrl
          ? `url(${chart.properties.backgroundImageUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {chart.properties.audioUrl && (
        <audio
          ref={audioRef}
          src={chart.properties.audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onEnded={handleEnded}
        />
      )}

      {/* Lyrics display */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          gap: '20px',
        }}
      >
        {displayLines.map(line => {
          const lineIdx = chart.lines.indexOf(line);
          const isCurrentLine = lineIdx === currentLineIndex;

          return (
            <div
              key={lineIdx}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
                opacity: isCurrentLine ? 1 : 0.5,
                transform: isCurrentLine ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s ease',
                fontFamily: chart.properties.font,
                fontSize: chart.properties.textSize,
              }}
            >
              {line.words.map((word, wordIdx) => {
                const isCurrentWord = isCurrentLine && wordIdx === currentWordIndex;
                return (
                  <span
                    key={wordIdx}
                    style={{
                      color: isCurrentWord ? '#FFD700' : chart.properties.textColor,
                      fontWeight: isCurrentWord ? 'bold' : 'normal',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      transition: 'all 0.2s ease',
                      transform: isCurrentWord ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Controls */}
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
          max={chart.properties.duration}
          step="0.01"
          value={currentTime}
          onChange={locked ? undefined : handleSeek}
          disabled={locked}
          style={{
            width: '100%',
            ...(locked ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
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
            {formatTime(currentTime)} / {formatTime(chart.properties.duration)}
          </span>

          {/* Play/pause only shown in normal (unlocked) mode */}
          {!locked && (
            <button
              onClick={togglePlayPause}
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
    </div>
  );
});

export default ChartPlayer;
