export type WallpaperColors = 'peach' | 'lavender';

const wallpaperColorMap: Record<WallpaperColors, string> = {
    peach: 'from-red-200 to-orange-100',
    lavender: 'from-purple-200 to-cyan-100',
};

export default function Wallpaper({ children, color }: { children: React.ReactNode; color: WallpaperColors }) {
    return (
        <div className={`flex-1 bg-linear-to-b ${wallpaperColorMap[color]} font-sans dark:bg-black`}>
            <div className="absolute inset-0 bg-diamond-overlay pointer-events-none" />
            <div className="relative z-10 h-full">{children}</div>
        </div>
    );
}