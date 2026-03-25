import '@/src/lib/middleware/auth';
import NavBar from '@/src/components/NavBar/NavBar';
import Wallpaper from '@/src/components/Wallpaper/Wallpaper';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    // TODO: fetch cookie here, pass into children and navbar as prop
    // might use a UserContext/CookieContext instead
    return (
        <div className="flex flex-row min-h-screen">
            <Wallpaper color="lavender" />
            <NavBar />
            <div className="flex flex-1 min-h-screen px-8">{children}</div>
        </div>
    );
}
