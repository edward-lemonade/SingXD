import styles from './Wallpaper.module.css';

export type WallpaperColors = 'peach' | 'lavender';

const wallpaperColorMap: Record<WallpaperColors, string> = {
    peach: styles.peach,
    lavender: styles.lavender,
};

export default function Wallpaper({ color }: { color: WallpaperColors }) {
    return (
        <div className={`${styles.container} ${wallpaperColorMap[color]}`}>
            <div className={styles.overlayOutlines} />
            <div className={styles.overlayFill} />
        </div>
    );
}
