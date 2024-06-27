export default function Index() {
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Yazzy</title>
				<link rel="stylesheet" href="/global.css" />
			</head>

			<body>
				<header>
					<h1>yazzy—plain ol' reading</h1>
					<p>Your Markdown web clipper.</p>
				</header>
				<form action="/" method="get">
					<label for="url">URL</label>
					<input type="url" id="url" name="url" required />
					<button type="submit">Clip</button>
				</form>
			</body>
		</html>
	);
}