import { ChartDraft } from "@/src/lib/types/types";

interface ChartLyricsProps {
    chart: ChartDraft;
    currentLineIndex: number;
    currentWordIndex: number;
    displayLines: ChartDraft['lines'];
}

export default function ChartLyrics({
    chart,
    currentLineIndex,
    currentWordIndex,
    displayLines,
}: ChartLyricsProps) {
    return (
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
                                        display: 'inline-block',
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
    );
}