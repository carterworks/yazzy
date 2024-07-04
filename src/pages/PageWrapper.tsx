export default function PageWrapper({
	pageTitle,
	children,
}: { pageTitle: string; children: unknown | unknown[] }) {
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{pageTitle}</title>
				<link rel="stylesheet" href="/global.css" />
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" href="/icon.svg" type="image/svg+xml" />
				<script type="module" src="/index.js" />
			</head>

			<body class="bg-arc-background text-base px-4 lg:px-0">
				<div class="m-auto max-w-prose my-4">
					<nav class="flex items-center mb-4">
						<div class="mr-auto">
							<h1 class="text-2xl text-arc-title">
								<a href="/">yazzy</a>
							</h1>
							<p class="text-xs ">Plain ol' reading</p>
						</div>
						<a
							href="https://github.com/carterworks/yazzy"
							target="_blank"
							rel="noreferrer"
							class="underline"
						>
							Github
						</a>
					</nav>
					{children}
				</div>
			</body>
		</html>
	);
}
