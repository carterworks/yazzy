import type { FC, PropsWithChildren } from "hono/jsx";
import { Hourglass } from "./icons/refactoring-ui";


const AISummaryError: FC<PropsWithChildren> = ({ children }) => (
	<aside className="prose">
		<details>
			<summary className="cursor-pointer select-none">
				<h2 className="inline">Failed to retrieve AI summary</h2>
			</summary>
			<p className="bg-base-50 dark:bg-base-950 rounded px-4 py-2">
				{children}
			</p>
		</details>
	</aside>
);

const AISummary: FC<{
	url: string;
	summary?: string | null;
	error?: string;
}> = ({ url, summary, error }) => {
	if (error) {
		return <AISummaryError>{error}</AISummaryError>;
	}

	if (summary) {
		return (
			<aside className="prose">
				<details>
					<summary className="cursor-pointer select-none">
						<h2 class="inline">AI-generated summary</h2>
					</summary>
					{/* biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
					<div dangerouslySetInnerHTML={{ __html: summary }} />
				</details>
			</aside>
		);
	}

	return (
		<aside
			hx-trigger="load"
			hx-get="/api/summary"
			hx-vals={JSON.stringify({ url })}
			hx-swap="outerHTML"
			className="prose js-only"
		>
			<details>
				<summary className="cursor-pointer select-none">
					<h2 class="inline-block">
						AI-generated summary{" "}
						<Hourglass className="h-4 inline animate-springy-spin" />
					</h2>
				</summary>
				<div class="flex flex-col gap-1 @container htmx-indicator">
					<div className="w-[40cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
					<div className="w-[87cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
					<div className="w-[93cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
					<div className="w-[74cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
					<div className="w-[90cqi] bg-base-50 dark:bg-base-950 px-4 py-2 h-4 animate-pulse" />
				</div>
			</details>
		</aside>
	);
};

export default AISummary;
