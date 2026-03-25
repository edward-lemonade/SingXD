import NavBar from '@/src/components/NavBar/NavBar';
import Wallpaper from '@/src/components/Wallpaper/Wallpaper';
import { getSessionUser } from '@/src/lib/server/CookieService';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
    const currentUser = await getSessionUser();

    return (
        <div className="flex flex-row min-h-screen">
            <Wallpaper color="lavender" />
            <NavBar user={currentUser} />
            <div className="flex flex-1 min-h-screen px-8">{children}</div>
        </div>
    );
}
