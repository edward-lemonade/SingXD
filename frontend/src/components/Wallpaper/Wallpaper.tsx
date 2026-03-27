import styles from './Wallpaper.module.css';

const wallpaperColorMap = {
    peach: styles.peach,
    lavender: styles.lavender,
} as const;

export type WallpaperColors = keyof typeof wallpaperColorMap;

interface WallpaperProps {
    color: WallpaperColors;
    invert?: boolean;
}

export default function Wallpaper({ color, invert = false }: WallpaperProps) {
    return (
        <div style={{
            position: 'absolute',
            height: '100vh',
            width: '100vw',
            zIndex: -1000,
            overflow: 'hidden',
            ...(invert && { filter: 'invert(1) hue-rotate(180deg)' }),
        }}>
            <div className={`${styles.wallpaper} ${wallpaperColorMap[color]}`}>
                <div className={styles.overlayOutlines} />
                <div className={styles.overlayFill} />
            </div>
        </div>
    );
}