'use client';

import { useState } from 'react';
import { User } from '@/src/lib/types/models';
import { Step, StepId } from '../../CreatePageClient';
import { StepNode, StepNodeProps } from './StepNode';
import { Button } from '@/src/components/Button/Button';
import { Logo } from '@/src/components/Logo';
import Link from 'next/link';

export interface CreateSidebarProps {
    steps: Step[];
    currentStep: StepId;
    stepMissing: Record<StepId, string[]>;
    user: User | null;
    saveDraftLoading: boolean;
    saveDraftSuccess: boolean;
    saveDraftError: string | null;
    onStepClick: (id: StepId) => void;
    onSaveDraft: () => void;
}

const sidebarAccent: Record<StepId, string> = {
    1: 'rgba(243, 187, 192, 0.08)', // peach
    2: 'rgba(161, 122, 204, 0.08)', // purple
    3: 'rgba(100, 180, 243, 0.08)', // blue
    4: 'rgba(243, 222, 187, 0.08)', // gold
};

export default function Sidebar({
    steps,
    currentStep,
    stepMissing,
    user,
    saveDraftLoading,
    saveDraftSuccess,
    saveDraftError,
    onStepClick,
    onSaveDraft,
}: CreateSidebarProps) {
    const getStatus = (id: StepId): 'done' | 'active' | 'upcoming' => {
        if (id === currentStep) return 'active';
        if (id < currentStep) return 'done';
        return 'upcoming';
    };

    return (
        <aside
            style={{
                width: 220,
                flexShrink: 0,
                background: 'linear-gradient(180deg, var(--color-lavender-glass) 0%, var(--color-blue-glass) 100%)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                borderRight: '1px solid rgba(255,255,255,0.5)',
                display: 'flex',
                flexDirection: 'column',
                padding: '28px 24px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.4s ease',
            }}
        >
            {/* accent glow */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: sidebarAccent[currentStep],
                    transition: 'background 0.5s ease',
                    pointerEvents: 'none',
                }}
            />

            {/* logo */}
            <div style={{ marginBottom: 48, position: 'relative' }}>
                <Link href="/">
                    <Logo fontSize={50}/>
                </Link>
                <div
                    style={{
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.9)',
                        fontFamily: 'var(--font-wide)',
                    }}
                >
                    Create
                </div>
            </div>

            {/* step nodes */}
            <nav style={{ flex: 1, position: 'relative' }}>
                {steps.map((step, i) => (
                    <StepNode
                        key={step.id}
                        step={step}
                        status={getStatus(step.id)}
                        hasError={stepMissing[step.id].length > 0}
                        missingItems={stepMissing[step.id]}
                        isLast={i === steps.length - 1}
                        onClick={() => onStepClick(step.id)}
                    />
                ))}
            </nav>

            {/* bottom meta */}
            <div style={{ display:'flex', position: 'relative', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.5)', paddingTop: 16 }}>
                {!user ? (
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,1)', lineHeight: 1.5 }}>
                        Working as guest. Publish before leaving, or login to save.
                    </p>
                ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Button
                            onClick={onSaveDraft}
                            disabled={saveDraftLoading}
                        >
                            {saveDraftLoading ? 'Saving…' : saveDraftSuccess ? '✓ Saved' : 'Save Draft'}
                        </Button>
                    </div>
                )}
                {saveDraftError && (
                    <p style={{ margin: '6px 0 0', fontSize: 10, color: '#ff6b6b' }}>
                        {saveDraftError}
                    </p>
                )}
            </div>
        </aside>
    );
}