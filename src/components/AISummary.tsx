import type { FC } from "hono/jsx";

const AISummary: FC<{ url: string; summary?: string }> = ({ url, summary }) => {
	const proseClasses =
		"prose dark:prose-invert font-humanist mt-2 prose-p:mt-0 prose-headings:font-transitional prose-headings:my-0 prose-h2:text-lg";
	if (summary) {
		return (
			<aside className={proseClasses}>
				<h2>AI-generated summary</h2>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
				<div dangerouslySetInnerHTML={{ __html: summary }} />
			</aside>
		);
	}

	return (
		<aside
			hx-trigger="load"
			hx-get="/api/summary"
			hx-vals={JSON.stringify({ url })}
			hx-swap="outerHTML"
			className={proseClasses}
		>
			<div class="flex flex-col gap-1 @container htmx-indicator">
				<div className="w-[40cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[87cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[93cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[74cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				<div className="w-[90cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
			</div>
		</aside>
	);
};

export default AISummary;
