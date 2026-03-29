import { Logo } from "@/src/components/Logo";
import Wallpaper from "@/src/components/Wallpaper/Wallpaper";
import Link from "next/link";
import styles from './auth.module.css';
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE } from "@/src/lib/types/enums";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = await cookieStore.get(COOKIE.TOKEN);
    if (token) {
        redirect('/')
    }

    return (
        <div className="flex flex-row min-h-screen justify-center">
            <Wallpaper color="peach"/>
            <div className={styles.logoWrap}>
                <Link href="/">
                    <Logo fontSize={50}/>
                </Link>
            </div>
            {children}
        </div>
    )
}