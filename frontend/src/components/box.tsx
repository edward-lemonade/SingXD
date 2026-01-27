import clsx from "clsx";

export default function Box({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={clsx(
				"bg-white border-4 border-black rounded-lg text-black flex flex-col",
				className
			)}
		>
			{children}
		</div>
	);
}