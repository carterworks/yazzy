export default function ClippedPage({ url, markdown }) {
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Your Markdown | yazzy</title>
			</head>

			<body>
				<header>
					<h1>
						<a href="/">yazzy</a>
					</h1>
					<h2>
						Markdown for <a href={url}>{url}</a>
					</h2>
				</header>
				<main>
					<textarea readonly style={{ fieldSizing: "content" }}>
						{markdown}
					</textarea>
				</main>
			</body>
		</html>
	);
}
