import type { FC, PropsWithChildren } from "hono/jsx";
import Button from "../components/Button";

interface BasePageProps {
	title?: string;
	classes?: string;
	head?: FC;
}

const BasePage: FC<PropsWithChildren<BasePageProps>> = ({
	title = "",
	classes = "",
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
			<link rel="stylesheet" href="/styles.min.css" />
		</head>

		<body class="text-base px-4 lg:px-0">
			<div class="m-auto max-w-prose space-y-2">
				<header
					class="flex items-center mb-4 gap-4 print:hidden"
					transition:animate="slide"
				>
					<div class="mr-auto">
						<h1 class="text-2xl font-transitional">
							<a href="/">yazzy</a>
						</h1>
						<p class="text-xs">Plain ol' reading</p>
					</div>
					<Button type="button" popovertarget="settings-dialog">
						Settings
					</Button>
					<div popover id="settings-dialog" class={"border p-2 rounded"}>
						{/* <Settings /> */}
					</div>
				</header>
				<div class={classes}>{children}</div>
				<footer class="border-t-2 py-2 border-neutral-400 flex justify-between items-start">
					<ul>
						<li>
							<a
								href="https://github.com/carterworks/yazzy"
								target="_blank"
								rel="noreferrer"
								class="underline"
							>
								Github
							</a>
						</li>
						<li>
							<a href="/api/dump" class="underline">
								Download db dump
							</a>
						</li>
					</ul>
					{/* <ArticleCount class="text-right" server:defer>
					<ArticleCount class="text-right" slot="fallback" />
				</ArticleCount> */}
				</footer>
			</div>
		</body>
	</html>
);

export default BasePage;
