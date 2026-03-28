'use client';

import { Card } from '@/src/components/Card/Card';
import { ChartPreview } from '@/src/components/Chart';
import { DraftChart, ChartProperties } from '@/src/lib/types/models';
import { SetStateAction } from 'react';
import FileInputButton from '@/src/components/FileInputButton/FileInputButton';

interface VideoStepProps {
    chart: DraftChart;
    chartProps: ChartProperties;
    setChartProps: (video: SetStateAction<ChartProperties>) => void;
    onBackgroundImageFileSelect: (file: File) => void | Promise<void>;
    backgroundImageUploading: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 12,
            fontFamily: 'var(--font-wide)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.7)',
        }}>
            {children}
        </label>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    fontFamily: 'var(--font-wide)',
    fontSize: 13,
    color: 'rgba(0,0,0,0.85)',
    background: 'rgba(0,0,0,0.03)',
    border: '2px solid rgba(0,0,0,0.12)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
};

const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];

export default function VideoStep({
    chart,
    chartProps,
    setChartProps,
    onBackgroundImageFileSelect,
    backgroundImageUploading,
}: VideoStepProps) {
    const bgFileName = chartProps.backgroundImageUrl
        ? chartProps.backgroundImageUrl.split('/').pop()?.split('?')[0] ?? 'background'
        : null;

    return (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Left: controls */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* background */}
                <Card label="Background">
                    <div style={{ padding: '0px 24px 20px' }}>
                        <FileInputButton
                            label="Background Image"
                            accept="image/*"
                            onFile={onBackgroundImageFileSelect}
                            loading={backgroundImageUploading}
                            fileName={bgFileName}
                            size={148}
                        />
                    </div>
                </Card>

                {/* typography */}
                <Card label="Typography">
                    <div style={{ padding: '0px 24px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            <div>
                                <FieldLabel>Font</FieldLabel>
                                <select
                                    value={chartProps.font}
                                    onChange={e => setChartProps(prev => ({ ...prev, font: e.target.value }))}
                                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                                    onFocus={e => (e.target.style.borderColor = 'rgba(0,0,0,0.4)')}
                                    onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                                >
                                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <FieldLabel>Size</FieldLabel>
                                    <input
                                        type="number"
                                        min={12}
                                        max={96}
                                        value={chartProps.textSize}
                                        onChange={e => setChartProps(prev => ({ ...prev, textSize: parseInt(e.target.value) || 24 }))}
                                        style={inputStyle}
                                        onFocus={e => (e.target.style.borderColor = 'rgba(0,0,0,0.4)')}
                                        onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Color</FieldLabel>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="color"
                                            value={chartProps.textColor}
                                            onChange={e => setChartProps(prev => ({ ...prev, textColor: e.target.value }))}
                                            style={{
                                                width: 44,
                                                height: 40,
                                                padding: 2,
                                                border: '2px solid rgba(0,0,0,0.12)',
                                                background: 'rgba(0,0,0,0.03)',
                                                cursor: 'pointer',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div style={{ flex: 3, alignSelf: 'stretch' }}>
                <Card>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ChartPreview chart={chart} playerSettings={{ width: 640, height: 400 }} />
                    </div>
                </Card>
            </div>
        </div>
    );
}