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
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{article.title} | yazzy</title>
				<style>
					{`
#controls:has(#view-html:checked) ~ main {
	> *:not(#html-content) {
		display: none;
	}
	> #html-content {
		display: block;
	}
}

#controls:has(#view-plaintext:checked) ~ main {
	> *:not(#plaintext-content) {
		display: none;
	}
	> #plaintext-content {
		display: block;
	}
}

#controls:has(#view-markdown:checked) ~ main {
	> *:not(#markdown-content) {
		display: none;
	}
	> #markdown-content {
		display: block;
	}
}
#controls {
	display: flex;
	gap: 1rem;
}
label {
	cursor: pointer;
}
pre {
	word-wrap: break-word;
	white-space: pre-wrap;
}
`}
				</style>
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
				<div id="controls">
					<div>
						<a href={generateObsidianUri(article)}>Save to Obsidian</a>
					</div>
					<span>View…</span>
					<div>
						<label for="view-html">
							<input type="radio" name="viewtype" id="view-html" checked />
							HTML
						</label>
					</div>
					<div>
						<label for="view-plaintext">
							<input type="radio" name="viewtype" id="view-plaintext" />
							Text
						</label>
					</div>
					<div>
						<label for="view-markdown">
							<input type="radio" name="viewtype" id="view-markdown" />
							Markdown
						</label>
					</div>
				</div>
				<main>
					<section id="html-content">{article.htmlContent}</section>
					<section id="plaintext-content">
						<pre>{article.textContent}</pre>
					</section>
					<section id="markdown-content">
						<pre>{article.markdownContent}</pre>
					</section>
				</main>
			</body>
		</html>
	);
}
