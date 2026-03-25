'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, loginWithGoogle } from '@/src/lib/api/AuthAPI';
import styles from '../auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await loginWithEmail(email, password);
            router.push('/');
        } catch {
            setError('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError(null);
        setLoading(true);
        try {
            await loginWithGoogle();
            router.push('/');
        } catch {
            setError('Google sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.sub}>Sign in to continue</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label className={styles.label}>
                        Email
                        <input
                            className={styles.input}
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className={styles.label}>
                        Password
                        <input
                            className={styles.input}
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                        />
                    </label>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} className={styles.btnPrimary}>
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                <button onClick={handleGoogle} disabled={loading} className={styles.btnGoogle}>
                    <GoogleIcon />
                    Continue with Google
                </button>

                <p className={styles.footer}>
                    No account?{' '}
                    <Link href="/register" className={styles.link}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18">
            <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            />
        </svg>
    );
}
