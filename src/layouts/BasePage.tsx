import type { Child, FC, PropsWithChildren } from "hono/jsx";
import { version } from "../../package.json" with { type: "json" };

interface BasePageProps {
	title?: string;
	classes?: string;
	head?: Child;
}

const BasePage: FC<PropsWithChildren<BasePageProps>> = ({
	title = "",
	classes = "",
	head: Head,
	children,
}) => (
	<html lang="en" className="md:text-lg">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<meta name="color-scheme" content="light dark" />
			<title>{title}</title>
			<link rel="manifest" href="/manifest.webmanifest" />
			<link rel="icon" href="/scissors.svg" type="image/svg+xml" />
			{Head}
			<link rel="stylesheet" href="/styles.css" />
			<script
				src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"
				integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+"
				crossorigin="anonymous"
			/>
			<script src="/scripts.mjs" type="module" defer async />
			<meta
				name="htmx-config"
				content={JSON.stringify({
					responseHandling: [{ code: ".*", swap: true }],
				})}
			/>
		</head>

		<body className="text-base bg-paper font-geometric-humanist dark:bg-black text-black dark:text-base-200 px-4 py-2 space-y-8 max-w-prose mx-auto">
			<header
				className="flex items-center gap-4 print:hidden"
				style={{ viewTransitionName: "header" }}
			>
				<div className="mr-auto">
					<h1 className="text-2xl font-didone">
						<a
							href="/"
							className="transition-colors rounded hover:bg-base-100 dark:hover:bg-base-800"
						>
							yazzy
						</a>
					</h1>
					<p className="text-xs">Plain ol' reading</p>
				</div>
			</header>
			<div className={classes}>{children}</div>
			<footer
				className="flex justify-between items-start print:hidden"
				style={{ viewTransitionName: "footer" }}
			>
				<ul>
					<li>
						<a
							href="https://github.com/carterworks/yazzy"
							target="_blank"
							rel="noreferrer"
							className="underline transition-colors rounded hover:bg-base-100 dark:hover:bg-base-800"
						>
							Github
						</a>
					</li>
					<li>
						<a
							href="/api/db-dump"
							className="underline transition-colors rounded hover:bg-base-100 dark:hover:bg-base-800"
						>
							Download db dump
						</a>
					</li>
				</ul>
				<div className="text-right">
					<div>v{version}</div>
					<div>
						Article count:{" "}
						<span hx-trigger="load" hx-get="/api/article-count">
							0
						</span>
					</div>
				</div>
			</footer>
		</body>
	</html>
);

export default BasePage;
