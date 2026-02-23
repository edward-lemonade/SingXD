import clsx from "clsx";

export default function Card({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={clsx(
				"bg-white border-4 border-black text-black flex flex-col",
				className
			)}
		>
			{children}
		</div>
	);
}