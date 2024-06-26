import type { ReadablePage } from "../types";

function formatDate(date: Date | undefined): string {
	if (!date) {
		return "";
	}
	return Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function getFilename(title: string): string {
	return title.replace(":", "").replace(/[/\\?%*|"<>]/g, "-");
}

function generateObsidianUri(
	article: ReadablePage,
	folder = "Clippings/",
	vault = "",
): string {
	const today = formatDate(new Date());
	const fileName = getFilename(article.title);
	const vaultName = vault ? `&vault=${encodeURIComponent(vault)}` : "";

	// Check if there's an author and add brackets
	const authorBrackets = article.author ? `"[[${article.author}]]"` : "";
	const fileContent = `---
category: "[[Clippings]]"
author: ${authorBrackets}
title: "${article.title}"
url: ${article.url}
clipped: ${today}
published: ${formatDate(article.published)}
topics: 
tags: [${article.tags.join(" ")}]
---
${article.markdownContent}`;

	return `obsidian://new?file=${encodeURIComponent(folder + fileName)}&content=${encodeURIComponent(fileContent)}${vaultName}`;
}

export default function ClippedPage({ article }: { article: ReadablePage }) {
	const obsidianUri = generateObsidianUri(article);

	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{article.title} | yazzy</title>
			</head>

			<body>
				<nav>
					<h1>
						<a href="/">yazzy</a>
					</h1>
				</nav>
				<header>
					<h2>
						<a href={article.url}>{article.title}</a>
					</h2>
					{article.author && <p>{article.author}</p>}
				</header>
				<main>
					<a href={generateObsidianUri(article)}>
						Save to Obsidian
					</a>
					<textarea readonly style={{ fieldSizing: "content", maxHeight: "50vh" }}>
						{article.markdownContent}
					</textarea>
				</main>
			</body>
		</html>
	);
}
