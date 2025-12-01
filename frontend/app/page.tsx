import Image from "next/image";

export default function Home() {
	return (
		<div className="flex flex-col min-h-screen items-center justify-center bg-linear-to-b from-red-200 to-orange-100 font-sans dark:bg-black">
      <div className="absolute inset-0 bg-diamond-overlay pointer-events-none"></div>

      <div className="relative z-10 text-center">
        <h1 className="tall-outline text-6xl md:text-8xl leading-tight">
          Singish
        </h1>

        <h2 className="text-black text-lg md:text-2xl font-semibold mt-6 max-w-2xl">
          Create karaoke videos, create covers to your favorite songs, and compete
          for the highest karaoke score.
        </h2>
      </div>
		</div>
	);
}
