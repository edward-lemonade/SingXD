import { Logo } from "@/src/components/Logo";
import Wallpaper from "@/src/components/Wallpaper/Wallpaper";
import Link from "next/link";
import styles from './auth.module.css';
import { getSessionUser } from "@/src/lib/server/CookieService";
import { redirect } from "next/navigation";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
    const currentUser = await getSessionUser();
    if (currentUser) {
        redirect('/')
    }

    return (
        <div className="flex flex-row min-h-screen justify-center">
            <Wallpaper color="peach"/>
            <div className={styles.logoWrap}>
                <Link href="/">
                    <Logo />
                </Link>
            </div>
            {children}
        </div>
    )
}