import '@/src/lib/middleware/auth';
import Navbar from '@/src/components/Navbar';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            {children}
        </div>
    );
}