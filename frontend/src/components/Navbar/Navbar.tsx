'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/lib/context/AuthContext';
import { logout } from '@/src/lib/api/AuthAPI';
import styles from './NavBar.module.css';

const NAV_ITEMS = [
    { label: 'PLAY', href: '/' },
    { label: 'BROWSE', href: '/browse' },
    { label: 'CREATE', href: '/drafts' },
] as const;

function isActive(href: string, pathname: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
}
 
export default function NavBar() {
    const pathname = usePathname();
    const { user, loading } = useAuth();
 
    return (
        <div className={styles.container}>
            <div className={styles.bg} />
            <div className={styles.accent} />
 
            <nav className={styles.nav}>
                <div className={styles.top}>
                    SingXD
                </div>

                <div className={styles.links}>
                    {NAV_ITEMS.map(({ label, href }) => {
                        const active = isActive(href, pathname);
                        return (
                            <Link
                                key={href}
                                href={href}
                                data-label={label}
                                className={`${styles.item} ${active ? styles.active : ''}`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>
 
                <div className={styles.bottom}>
                    <div className={styles.divider} />
                    {!loading && (
                        user ? (
                            <>
                                <span className={styles.profileLabel}>Signed in as</span>
                                <span className={styles.profileName}>
                                    {user.displayName ?? user.email?.split('@')[0] ?? 'Agent'}
                                </span>
                                <button className={styles.logout} onClick={() => logout()}>
                                    Log out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={styles.authLink}>Login</Link>
                                <Link href="/register" className={`${styles.authLink} ${styles.authLinkSecondary}`}>Register</Link>
                            </>
                        )
                    )}
                </div>
            </nav>
        </div>
    );
}
 