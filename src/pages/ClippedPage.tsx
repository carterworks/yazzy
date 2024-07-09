import type { ReadablePage } from "../types";
import PageWrapper from "./PageWrapper";

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
	return (
		title
			// make title windows-friendly
			.replace(":", "")
			.replace(/[/\\?%*|"<>]/g, "-")
			// get rid of spaces
			.replace(/\s+/g, "-")
			// lowercase is bestcase
			.toLocaleLowerCase()
	);
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
		<PageWrapper pageTitle={`yazzy | ${article.title}`}>
			<div id="controls" class="flex gap-3 mb-4 items-center">
				<div class="border border-arc-focus py-1 px-2 rounded-lg hover:bg-arc-hover active:bg-arc-focus transition bg-transparent text-center">
					<a href={generateObsidianUri(article)} class="">
						Save to Obsidian
					</a>
				</div>
				<div class="flex">
					<label
						for="view-html"
						class="cursor-pointer border border-arc-focus first:border-r-0 last:border-l-0 px-2 py-1 active:bg-arc-focus first:rounded-l-lg last:rounded-r-lg hover:bg-arc-hover bg-transparent transition has-[:checked]:bg-arc-focus"
					>
						<input
							type="radio"
							name="viewtype"
							id="view-html"
							checked
							class="sr-only"
						/>
						&nbsp;HTML
					</label>
					<label
						for="view-plaintext"
						class="cursor-pointer border border-arc-focus first:border-r-0 last:border-l-0 px-2 py-1 active:bg-arc-focus first:rounded-l-lg last:rounded-r-lg hover:bg-arc-hover bg-transparent transition has-[:checked]:bg-arc-focus"
					>
						<input
							type="radio"
							name="viewtype"
							id="view-plaintext"
							class="sr-only"
						/>
						&nbsp;Text
					</label>
					<label
						for="view-markdown"
						class="cursor-pointer border border-arc-focus first:border-r-0 last:border-l-0 px-2 py-1 active:bg-arc-focus first:rounded-l-lg last:rounded-r-lg hover:bg-arc-hover bg-transparent transition has-[:checked]:bg-arc-focus"
					>
						<input
							type="radio"
							name="viewtype"
							id="view-markdown"
							class="sr-only"
						/>
						&nbsp;Markdown
					</label>
				</div>
			</div>
			<header class="max-w-prose">
				<h2 class="text-3xl">
					<a href={article.url}>{article.title}</a>
				</h2>
				{article.author && <p class="text-2xl">{article.author}</p>}
			</header>
			<main>
				<section id="html-content">
					<article class="prose lg:prose-xl font-humanist">
						{article.htmlContent}
					</article>
				</section>
				<section id="plaintext-content" class="mt-6">
					<pre class="whitespace-pre-wrap">{article.textContent}</pre>
				</section>
				<section id="markdown-content" class="mt-6">
					<pre class="whitespace-pre-wrap">{article.markdownContent}</pre>
				</section>
			</main>
		</PageWrapper>
	);
}
