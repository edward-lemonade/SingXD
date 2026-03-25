import { Logo } from "@/src/components/Logo";
import Wallpaper from "@/src/components/Wallpaper/Wallpaper";
import Link from "next/link";
import styles from './auth.module.css';
export default function HomeLayout({ children }: { children: React.ReactNode }) {
    // TODO: get cookie, redirect to home page if already logged in
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