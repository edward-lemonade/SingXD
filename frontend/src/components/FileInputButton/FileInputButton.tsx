'use client';

import { useRef, useState } from 'react';
import styles from './FileInputButton.module.css';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckIcon from '@mui/icons-material/Check';
import CircularProgress from '@mui/material/CircularProgress';

interface FileInputButtonProps {
    label: string;
    accept: string;
    onFile: (file: File) => void;
    disabled?: boolean;
    loading?: boolean;
    fileName?: string | null;
    size?: number;
}

export default function FileInputButton({
    label,
    accept,
    onFile,
    disabled,
    loading,
    fileName,
    size = 160,
}: FileInputButtonProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [hovered, setHovered] = useState(false);

    const hasFile = !!fileName;

    const buttonClass = [
        styles.button,
        hasFile ? styles.hasFile : '',
        loading ? styles.isLoading : '',
    ].join(' ');

    return (
        <div className={styles.wrapper}>
            <button
                type="button"
                disabled={disabled || loading}
                onClick={() => inputRef.current?.click()}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={buttonClass}
                style={{ width: size, height: size }}
            >
                <span className={`${styles.bracket} ${styles.bracketTL}`} />
                <span className={`${styles.bracket} ${styles.bracketTR}`} />
                <span className={`${styles.bracket} ${styles.bracketBL}`} />
                <span className={`${styles.bracket} ${styles.bracketBR}`} />

                {loading ? (
                    <CircularProgress size={20} thickness={4} sx={{ color: 'rgba(0,0,0,0.9)' }} />
                ) : hasFile ? (
                    <CheckIcon sx={{ fontSize: 20, color: 'rgba(0,0,0,0.9)' }} />
                ) : (
                    <UploadFileIcon sx={{ fontSize: 20, color: hovered ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)' }} />
                )}

                <span className={styles.label} style={{ maxWidth: size - 28 }}>
                    {loading ? 'Uploading…' : hasFile ? '' : label}
                </span>
                {hasFile && !loading && (
                    <div className={styles.pill} style={{ maxWidth: size }}>
                        {fileName}
                    </div>
                )}
            </button>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = '';
                }}
            />
        </div>
    );
}