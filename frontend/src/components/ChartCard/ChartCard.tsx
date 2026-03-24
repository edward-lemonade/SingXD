import { PublicChart } from "@/src/lib/types/models";
import Link from "next/link";
import styles from "./ChartCard.module.css";

export function ChartCard({ chart }: { chart: PublicChart }) {
    const title = chart.properties.title || 'Untitled';
    const artist = chart.properties.artist || '';
    const songTitle = chart.properties.songTitle || '';
    const bg = chart.properties.backgroundImageUrl;

    return (
        <Link href={`/chart/${chart.id}`} className={styles.link}>
            <div className={styles.card}>
                {/* Thumbnail */}
                <div
                    className={styles.thumbnail}
                    style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                    {/* HUD orbit ring */}
                    <div className={styles.orbitRing} />

                    {/* Corner brackets */}
                    <div className={`${styles.bracket} ${styles.bracketTL}`} />
                    <div className={`${styles.bracket} ${styles.bracketTR}`} />
                    <div className={`${styles.bracket} ${styles.bracketBL}`} />
                    <div className={`${styles.bracket} ${styles.bracketBR}`} />

                    {!bg && (
                        <div className={styles.placeholder}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                            </svg>
                        </div>
                    )}
                    {bg && <div className={styles.overlay} />}
                </div>

                {/* Info row */}
                <div className={styles.info}>
                    <div className={styles.infoInner}>
                        <p className={styles.title}>{songTitle}{` — ${artist}`}</p>
                        <p className={styles.subtitle}>
                            {title}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}