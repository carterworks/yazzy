import type { FC, PropsWithChildren } from "hono/jsx";
import type { ReadablePage } from "../types";

const AISummary: FC<{ url: string }> = ({ url }) => {
	return (
		<aside
			hx-trigger="load"
			hx-get="/api/summary"
			hx-vals={JSON.stringify({ url })}
			className="prose dark:prose-invert font-humanist mt-2"
		>
			<div class="flex flex-col gap-1">
				<div className="w-[30ch] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[33ch] lg:w-[45ch] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[33ch] lg:w-[40ch] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[39ch] lg:w-[42ch] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
			</div>
		</aside>
	);
};

export default AISummary;
