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
				<link rel="stylesheet" href="/global.css" />
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
				<div id="controls" class="flex gap-3">
					<div>
						<a href={generateObsidianUri(article)}>Save to Obsidian</a>
					</div>
					<span>View…</span>
					<div>
						<label for="view-html" class="cursor-pointer">
							<input type="radio" name="viewtype" id="view-html" checked />
							&nbsp;HTML
						</label>
					</div>
					<div>
						<label for="view-plaintext" class="cursor-pointer">
							<input type="radio" name="viewtype" id="view-plaintext" />
							&nbsp;Text
						</label>
					</div>
					<div>
						<label for="view-markdown" class="cursor-pointer">
							<input type="radio" name="viewtype" id="view-markdown" />
							&nbsp;Markdown
						</label>
					</div>
				</div>
				<main>
					<section id="html-content">
						<article class="prose lg:prose-xl">{article.htmlContent}</article>
					</section>
					<section id="plaintext-content">
						<pre class="whitespace-pre-wrap">{article.textContent}</pre>
					</section>
					<section id="markdown-content">
						<pre class="whitespace-pre-wrap">{article.markdownContent}</pre>
					</section>
				</main>
			</body>
		</html>
	);
}
