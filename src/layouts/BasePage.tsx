import type { FC, PropsWithChildren } from "hono/jsx";
import Button from "../components/Button";
import Settings from "../components/Settings";

interface BasePageProps {
	title?: string;
	className?: string;
	head?: FC;
}

const BasePage: FC<PropsWithChildren<BasePageProps>> = ({
	title = "",
	className = "",
	head: Head,
	children,
}) => (
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<meta name="color-scheme" content="light dark" />
			<title>{title}</title>
			<link rel="manifest" href="/manifest.webmanifest" />
			<link rel="icon" href="/scissors.svg" type="image/svg+xml" />
			{Head && <Head />}
			<link rel="stylesheet" href="/styles.css" />
			<script
				src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"
				integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+"
				crossorigin="anonymous"
			/>
			<script src="/scripts.mjs" type="module" defer async />
			<script
				src="https://unpkg.com/wc-minimap@0.1.1/wc-minimap.js"
				integrity="sha384-/2H4ZWwvl8I+zlaydkj25HA1904mLGlWuniHPBxq+f9G80sL85UTKMYCQz2ADm34"
				crossorigin="anonymous"
				defer
				async
			/>
			<meta
				name="htmx-config"
				content={JSON.stringify({
					responseHandling: [{ code: ".*", swap: true }],
				})}
			/>
		</head>

		<body className="text-base bg-paper dark:bg-black text-black dark:text-base-200 px-4 lg:px-0">
			<div className="m-auto max-w-prose space-y-2">
				<header
					className="flex items-center mb-4 gap-4 print:hidden"
					transition:animate="slide"
				>
					<div className="mr-auto">
						<h1 className="text-2xl font-transitional">
							<a href="/">yazzy</a>
						</h1>
						<p className="text-xs">Plain ol' reading</p>
					</div>
					<Button type="button" popovertarget="settings-dialog">
						Settings
					</Button>
					<div
						popover="auto"
						id="settings-dialog"
						className="p-4 rounded m-auto bg-paper dark:bg-black drop-shadow-lg"
					>
						<Settings />
					</div>
				</header>
				<div className={className}>{children}</div>
				<footer className="flex justify-between py-8 my-8 items-start border-t border-base-100 dark:border-base-900">
					<ul>
						<li>
							<a
								href="https://github.com/carterworks/yazzy"
								target="_blank"
								rel="noreferrer"
								className="underline"
							>
								Github
							</a>
						</li>
						<li>
							<a href="/api/db-dump" className="underline">
								Download db dump
							</a>
						</li>
					</ul>
					<div className="text-right">
						Article count:{" "}
						<span hx-trigger="load" hx-get="/api/article-count">
							0
						</span>
					</div>
				</footer>
			</div>
		</body>
	</html>
);

export default BasePage;
