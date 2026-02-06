import Wallpaper from "@/src/components/Wallpaper";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
	return (
		<Wallpaper color="peach">
			<h1 className="tall-outline md:text-8xl">
				Singish
			</h1>

			<h2 className="text-black text-lg md:text-2xl font-semibold mt-6 max-w-2xl">
				Create karaoke videos, create covers to your favorite songs, and compete
				for the highest karaoke score.
			</h2>

			<Link
				href="/create"
				className="inline-block px-4 py-2 border-4 border-black text-black bg-white font-semibold rounded-lg hover:bg-gray-100 transition"
				>
				Create
			</Link>
		</Wallpaper>
	);
}
