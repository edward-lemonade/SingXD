import { useState } from "react";
import { Step } from "../../CreatePageClient";

export interface StepNodeProps {
    step: Step;
    status: 'done' | 'active' | 'upcoming';
    hasError: boolean;
    missingItems: string[];
    isLast: boolean;
    onClick: () => void;
}

export function StepNode({ step, status, hasError, missingItems, isLast, onClick }: StepNodeProps) {
    const isDone   = status === 'done';
    const isActive = status === 'active';
    const [hovered, setHovered] = useState(false);

    return (
        <div className="relative flex gap-4 items-start" style={{ paddingBottom: isLast ? 0 : 36 }}>
            {/* connector line */}
            {!isLast && (
                <div
                    className="absolute"
                    style={{
                        left: 19,
                        top: 40,
                        width: 2,
                        bottom: 0,
                        background: 
                            isDone
                                ? 'rgba(255,255,255,0.6)'
                                : 'rgba(255,255,255,0.3)',
                        transition: 'background 0.4s ease',
                    }}
                />
            )}

            {/* circle */}
            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: isActive
                        ? '2px solid rgba(255,220,0,0.9)'
                        : isDone
                            ? '2px solid rgba(255,255,255,0.6)'
                            : '2px solid rgba(255,255,255,0.3)',
                    background: isActive
                        ? 'rgba(0,0,0,0.6)'
                        : isDone
                            ? 'rgba(0,0,0,0.4)'
                            : 'rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    backdropFilter: 'blur(4px)',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* error badge */}
                {hasError && (
                    <span
                        style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#ff4d4f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fff',
                            lineHeight: 1,
                            zIndex: 2,
                            boxShadow: '0 0 0 2px var(--color-dark-base)',
                        }}
                    >
                        !
                    </span>
                )}

                {/* tooltip */}
                {hasError && hovered && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 'calc(100% + 12px)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: '#1a1a22',
                            border: '1px solid rgba(255,77,79,0.4)',
                            borderRadius: 4,
                            padding: '8px 12px',
                            whiteSpace: 'nowrap',
                            zIndex: 50,
                            pointerEvents: 'none',
                        }}
                    >
                        {/* arrow */}
                        <div style={{
                            position: 'absolute',
                            left: -5,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 0,
                            height: 0,
                            borderTop: '5px solid transparent',
                            borderBottom: '5px solid transparent',
                            borderRight: '5px solid rgba(255,77,79,0.4)',
                        }} />
                        <p style={{ margin: '0 0 6px', fontSize: 10, fontFamily: 'var(--font-wide)', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff4d4f' }}>
                            Missing
                        </p>
                        {missingItems.map(item => (
                            <p key={item} style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#ff4d4f', fontSize: 9 }}>▸</span>
                                {item}
                            </p>
                        ))}
                    </div>
                )}

                {isDone && !hasError ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3.5" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <span
                        style={{
                            fontFamily: 'var(--font-wide)',
                            fontWeight: 700,
                            fontSize: 13,
                            color: isActive
                                ? 'rgba(255,255,255,0.95)'
                                : 'rgba(255,255,255,0.35)',
                        }}
                    >
                        {step.id}
                    </span>
                )}
            </button>

            {/* label */}
            <div>
                <p
                    style={{
                        margin: 0,
                        fontFamily: 'var(--font-wide)',
                        fontWeight: isActive ? 900 : 700,
                        fontSize: 20,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: isActive
                            ? 'rgba(255,220,100,0.95)'
                            : isDone
                                ? 'rgba(255,255,255,0.7)'
                                : 'rgba(255,255,255,0.5)',
                        textShadow: isActive 
                            ? '0 0 4px rgba(0,0,0,0.6)'
                            : 'none',
                        transition: 'color 0.25s ease',
                    }}
                >
                    {step.name}
                </p>
                <p
                    style={{
                        margin: '2px 0 0',
                        fontSize: 14,
                        letterSpacing: '0.05em',
                        color: isActive
                            ? 'rgba(255,220,100,0.9)'
                            : 'rgba(255,255,255,0.7)',
                        textShadow: isActive 
                            ? '0 0 4px rgba(0,0,0,0.6)'
                            : 'none',
                        transition: 'color 0.25s ease',
                    }}
                >
                    {step.description}
                </p>
            </div>
        </div>
    );
}