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
			<script src="/htmx.js" />
			<script src="/scripts.mjs" type="module" defer />
			<script src="/wc-minimap.js" type="module" defer />
		</head>

		<body className="text-base px-4 lg:px-0">
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
						className="border p-2 rounded m-auto"
					>
						<Settings />
					</div>
				</header>
				<div className={className}>{children}</div>
				<footer className="border-t-2 py-2 border-neutral-400 flex justify-between items-start">
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
							<a href="/api/dump" className="underline">
								Download db dump
							</a>
						</li>
					</ul>
					{/* <ArticleCount className="text-right" server:defer>
					<ArticleCount className="text-right" slot="fallback" />
				</ArticleCount> */}
				</footer>
			</div>
		</body>
	</html>
);

export default BasePage;
