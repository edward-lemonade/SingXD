import NavBar from '@/src/components/NavBar/NavBar';
import Wallpaper from '@/src/components/Wallpaper/Wallpaper';
import { getCurrentUser } from '@/src/lib/api/UserAPI';
import { COOKIE } from '@/src/lib/types/enums';
import { cookies } from 'next/headers';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = await cookieStore.get(COOKIE.TOKEN);
    const user = await (token ? getCurrentUser() : null);

    return (
        <div className="relative flex flex-row min-h-screen">
            <Wallpaper color="lavender" />
            <NavBar user={user} />
            <div className="flex flex-1 min-h-screen px-8">{children}</div>
        </div>
    );
}
