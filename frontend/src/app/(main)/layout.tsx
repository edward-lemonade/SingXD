import MainNavBar from '@/src/components/MainNavBar/MainNavBar';
import Wallpaper from '@/src/components/Wallpaper/Wallpaper';
import * as UserAPI from '@/src/lib/api/UserAPI';
import { COOKIE } from '@/src/lib/types/enums';
import { cookies } from 'next/headers';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = await cookieStore.get(COOKIE.TOKEN);
    const user = await (token ? UserAPI.getCurrentUser() : null);

    return (
        <div className="relative flex flex-row min-h-screen">
            <Wallpaper color="lavender" />
            <MainNavBar user={user} />
            <div className="flex flex-1 min-h-screen px-8">{children}</div>
        </div>
    );
}
