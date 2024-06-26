import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import Turndown from "turndown";
import type { ReadablePage } from "./types";

async function fetchPage(url: URL): Promise<JSDOM> {
	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url.toString()}`);
	}
	return new JSDOM(await response.text());
}

// Utility function to get meta content by name or property
function getMetaContent(
	document: Document,
	attr: string,
	value: string,
): string {
	const element = document.querySelector(`meta[${attr}='${value}']`);
	const content = element?.getAttribute("content");
	if (!content) {
		return "";
	}
	return content.trim();
}

export async function clip(url: URL): Promise<ReadablePage> {
	const page = await fetchPage(url);
	if (!page || !page.window.document) {
		throw new Error("Failed to fetch page");
	}

	const tags = [
		"clippings",
		...(
			page.window.document
				.querySelector("meta[name='keywords' i]")
				?.getAttribute("content")
				?.split(",") ?? []
		).map((keyword) => keyword.split(" ").join("")),
	];

	const article = new Readability(page.window.document).parse();
	if (!article) {
		throw new Error("Failed to parse article");
	}

	const markdownBody = new Turndown({
		headingStyle: "atx",
		hr: "---",
		bulletListMarker: "-",
		codeBlockStyle: "fenced",
		emDelimiter: "*",
	}).turndown(article.content);

	// Fetch byline, meta author, property author, or site name
	const author =
		article.byline ||
		getMetaContent(page.window.document, "name", "author") ||
		getMetaContent(page.window.document, "property", "author") ||
		getMetaContent(page.window.document, "property", "og:site_name");

	/* Try to get published date */
	const publishedDate = page.window.document
		.querySelector("time")
		?.getAttribute("datetime");
	const published = publishedDate ? new Date(publishedDate) : undefined;

	return {
		title: article.title,
		url: url.toString(),
		published,
		author,
		topics: [],
		tags: tags,
		markdownContent: markdownBody,
		textContent: article.textContent,
		htmlContent: article.content,
	};
}
