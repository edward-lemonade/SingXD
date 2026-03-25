'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/lib/context/AuthContext';
import type { User } from '@/src/lib/types/models';
import styles from './NavBar.module.css';
import { Logo } from '../Logo';
import { logout as logoutFromAuthAPI } from '@/src/lib/api/AuthAPI';
import { useState, useEffect } from 'react';

function isActive(href: string, pathname: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
}

export default function NavBar({ user }: { user: User | null }) {
    const pathname = usePathname();
    const isAuthed = Boolean(user);
    const { loggingOut } = useAuth();
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    useEffect(() => {
        setPendingHref(null);
    }, [pathname]);

    const NAV_ITEMS = [
        { label: 'PLAY', href: '/' },
        { label: 'BROWSE', href: '/browse' },
        { label: 'CREATE', href: isAuthed ? '/drafts' : '/create' },
    ] as const;

    return (
        <div className={styles.container}>
            <div className={styles.bg} />
            <div className={styles.accent} />

            <nav className={styles.nav}>
                <Logo />

                <div className={styles.links}>
                    {NAV_ITEMS.map(({ label, href }) => {
                        const active = pendingHref
                            ? pendingHref === href
                            : isActive(href, pathname);
                        return (
                            <Link
                                key={label}
                                href={href}
                                data-label={label}
                                className={`${styles.item} ${active ? styles.active : ''}`}
                                onClick={() => setPendingHref(href)}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>

                <div className={styles.bottom}>
                    <div className={styles.divider} />
                    {isAuthed ? (
                        <>
                            <span className={styles.profileLabel}>Signed in as</span>
                            <span className={styles.profileName}>{user?.username || 'Agent'}</span>
                            <button
                                className={styles.logout}
                                onClick={() => logoutFromAuthAPI()}
                                disabled={loggingOut}
                            >
                                {loggingOut ? 'Logging out…' : 'Log out'}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className={styles.authLink}>
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className={`${styles.authLink} ${styles.authLinkSecondary}`}
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </div>
    );
}