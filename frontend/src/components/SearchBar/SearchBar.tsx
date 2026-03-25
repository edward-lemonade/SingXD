'use client';

import { useState } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(value.trim());
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputWrapper}>
                {/* Corner brackets */}
                <div className={`${styles.bracket} ${styles.bracketTL}`} />
                <div className={`${styles.bracket} ${styles.bracketTR}`} />
                <div className={`${styles.bracket} ${styles.bracketBL}`} />
                <div className={`${styles.bracket} ${styles.bracketBR}`} />

                <input
                    className={styles.input}
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Search by title, song, or artist…"
                />
            </div>

            <button type="submit" className={styles.button}>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="14"
                    height="14"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search</span>
            </button>
        </form>
    );
}
