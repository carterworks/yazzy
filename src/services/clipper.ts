import { Readability } from "@mozilla/readability";
import createDomPurify from "dompurify";
import { JSDOM } from "jsdom";
import Turndown from "turndown";
import type { ReadablePage } from "../types";
import { type VideoInfo, fetchTranscript } from "./youtubeExtractor";

const DOMPurify = createDomPurify(new JSDOM("<!DOCTYPE html>").window);

const supportedContentTypes = [
	"text/html",
	"application/xhtml+xml",
	"text/plain",
	"application/xml", // XML that might contain HTML
	"text/xml", // XML that might contain HTML
	// text/plain is already included and handles:
	// - text/markdown
	// - text/csv
	// - other text formats
];

async function fetchPage(url: URL): Promise<JSDOM> {
	const response = await fetch(url.toString(), {
		headers: {
			"User-Agent": "YazzyWebClipper/0.0.1",
		},
	});
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${url.toString()}: ${response.status} ${response.statusText}`,
		);
	}
	const contentType = response.headers.get("content-type");
	if (!contentType) {
		throw new Error(`No content type specified for ${url.toString()}`);
	}
	// Extract the base content type without parameters
	const baseContentType = contentType.split(";")[0].trim().toLowerCase();
	if (!supportedContentTypes.includes(baseContentType)) {
		throw new Error(
			`URL "${url.toString()}" has unsupported content type: ${baseContentType}`,
		);
	}
	const page = new JSDOM(await response.text(), { url: url.toString() });
	// force lazy-loaded images to load
	const LAZY_DATA_ATTRS = [
		"data-src",
		"data-lazy-src",
		"data-srcset",
		"data-td-src-property",
	];
	for (const dataAttr of LAZY_DATA_ATTRS) {
		const images = page.window.document.querySelectorAll(`img[${dataAttr}]`);
		for (const img of images) {
			const src = img.getAttribute(dataAttr);
			if (src) {
				img.setAttribute("src", src);
			}
		}
	}
	return page;
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

export function convertHtmlToMarkdown(html: string): string {
	const turndown = new Turndown({
		headingStyle: "atx",
		hr: "---",
		bulletListMarker: "-",
		codeBlockStyle: "fenced",
		emDelimiter: "*",
	});
	turndown.keep([
		"iframe",
		"sub",
		"sup",
		"u",
		"ins",
		"del",
		"small",
		"big" as keyof HTMLElementTagNameMap,
	]);
	return turndown.turndown(html);
}

async function clipArticle(url: URL): Promise<ReadablePage> {
	const page = await fetchPage(url);
	if (!page || !page.window.document) {
		throw new Error(`Failed to fetch page "${url.toString()}"`);
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

	const article = new Readability(page.window.document, {
		keepClasses: true,
	}).parse();
	if (!article) {
		throw new Error(`Failed to parse article contents of "${url.toString()}"`);
	}

	article.content = DOMPurify.sanitize(article.content);

	const markdownBody = convertHtmlToMarkdown(article.content);
	// Fetch byline, meta author, property author, or site name
	const author =
		article.byline ||
		getMetaContent(page.window.document, "name", "author") ||
		getMetaContent(page.window.document, "property", "author") ||
		getMetaContent(page.window.document, "property", "og:site_name");

	/* Try to get published date */
	const publishedDate =
		article.publishedTime ??
		page.window.document.querySelector("time")?.getAttribute("datetime");
	const published = publishedDate ? new Date(publishedDate) : undefined;

	return {
		title: article.title,
		url: url.toString(),
		published,
		createdAt: new Date(),
		author,
		tags,
		markdownContent: markdownBody,
		textContent: article.textContent,
		htmlContent: article.content,
	};
}

function createEmbedElementHtml(videoInfo: VideoInfo): string {
	return `<lite-youtube videoid="${videoInfo.id}" style="background-image: url('${videoInfo.thumbnailUrl}');">
  <a href="${videoInfo.url}" class="lyt-playbtn" title="Play Video">
    <span class="lyt-visually-hidden">${videoInfo.title} | ${videoInfo.author}</span>
  </a>
</lite-youtube>`;
}

function createEmbedElementMarkdown(videoInfo: VideoInfo): string {
	return `[![${videoInfo.title} | ${videoInfo.author}](${videoInfo.thumbnailUrl})](${videoInfo.url})`;
}

async function clipYoutube(url: URL): Promise<ReadablePage> {
	const videoInfo = await fetchTranscript(url.toString());
	const transcriptContent = videoInfo.transcript.map((t) => t.text).join("\n");
	return {
		title: videoInfo.title,
		url: url.toString(),
		published: videoInfo.published,
		author: videoInfo.author,
		tags: ["clippings", "youtube"],
		markdownContent: `${createEmbedElementMarkdown(videoInfo)}\n\n---\n\n${transcriptContent}`,
		textContent: transcriptContent,
		htmlContent: `<p>${createEmbedElementHtml(videoInfo)}</p>${videoInfo.transcript.map((t) => `<p>${t.text}</p > `).join("\n")}`,
		createdAt: videoInfo.createdAt,
	};
}

export async function clip(url: URL): Promise<ReadablePage> {
	if (url.hostname.includes("youtu")) {
		return clipYoutube(url);
	}
	return clipArticle(url);
}
