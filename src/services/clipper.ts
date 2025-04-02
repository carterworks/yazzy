import { Defuddle } from "defuddle/node";
import createDomPurify from "dompurify";
import { JSDOM, VirtualConsole } from "jsdom";
import Turndown from "turndown";
import type { ReadablePage } from "../types";
import { type VideoInfo, fetchTranscript } from "./youtubeExtractor";

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
	const page = new JSDOM(await response.text(), {
		url: url.toString(),
		resources: "usable",
		pretendToBeVisual: true,
		includeNodeLocations: true,
		storageQuota: 10000000,
		virtualConsole: new VirtualConsole().sendTo(console, {
			omitJSDOMErrors: true,
		}),
	});
	const DOMPurify = createDomPurify(page.window);
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
	page.window.document.body.innerHTML = DOMPurify.sanitize(
		page.window.document.body.innerHTML,
	);
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

/**
 * Convert HTML to Markdown
 * @param html - The HTML to convert
 * @returns The Markdown
 */
export function convertHtmlToMarkdown(html: string): string {
	const turndown = new Turndown({
		headingStyle: "atx",
		hr: "---",
		bulletListMarker: "-",
		codeBlockStyle: "fenced",
		emDelimiter: "*",
		preformattedCode: true,
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

function convertMarkdownToPlainText(markdown: string): string {
	const rules = [
		// Headers
		{ filter: /^\s*#+\s+/gm, replacement: "" },
		// Horizontal rules
		{ filter: /^\s*[-*_]{3,}\s*$/gm, replacement: "" },
		// Code blocks
		{ filter: /^\s*```[\s\S]*?```\s*$/gm, replacement: "" },
		{ filter: /^\s*`[\s\S]*?`\s*$/g, replacement: "" },
		// Links and images
		{ filter: /\[([^\]]+)\]\([^)]+\)/g, replacement: "$1" },
		{ filter: /!\[([^\]]*)\]\([^)]+\)/g, replacement: "" },
		// HTML tags
		{ filter: /<[^>]+>/g, replacement: "" },
		// Bold and italic
		{ filter: /(\*\*|__)(.*?)\1/g, replacement: "$2" },
		{ filter: /(\*|_)(.*?)\1/g, replacement: "$2" },
		// Strikethrough
		{ filter: /~~(.*?)~~/g, replacement: "$1" },
		// Blockquotes
		{ filter: /^\s*>\s*/gm, replacement: "" },
		// Lists
		{ filter: /^\s*[-*+]\s+/gm, replacement: "" },
		{ filter: /^\s*\d+\.\s+/gm, replacement: "" },
		// Tables
		{ filter: /\|.*\|/g, replacement: "" },
		{ filter: /^\s*\|[-|]+\|\s*$/gm, replacement: "" },
		// Line breaks
		{ filter: /\s{2,}$/gm, replacement: " " },
		{ filter: /\\\n/g, replacement: " " },
		// Escaped characters
		{ filter: /\\([\\`*_{}[\]()#+\-.!])/g, replacement: "$1" },
		// Clean up extra whitespace
		{ filter: /\n{3,}/g, replacement: "\n\n" },
		{ filter: /^\s+|\s+$/g, replacement: "" },
	];

	let plainText = markdown;
	for (const rule of rules) {
		plainText = plainText.replace(rule.filter, rule.replacement);
	}
	return plainText;
}

async function clipArticle(url: URL): Promise<ReadablePage> {
	const page = await fetchPage(url);
	if (!page || !page.window.document) {
		throw new Error(`Failed to fetch page "${url.toString()}"`);
	}

	const article = await Defuddle(page);

	if (!article) {
		throw new Error(`Failed to parse article contents of "${url.toString()}"`);
	}

	const markdownBody = convertHtmlToMarkdown(article.content);

	// Fetch byline, meta author, property author, or site name
	const author =
		article.author ||
		getMetaContent(page.window.document, "name", "author") ||
		getMetaContent(page.window.document, "property", "author") ||
		getMetaContent(page.window.document, "property", "og:site_name");

	const tags = [
		"clippings",
		...(
			page.window.document
				.querySelector("meta[name='keywords' i]")
				?.getAttribute("content")
				?.split(",") ?? []
		).map((keyword) => keyword.split(" ").join("")),
		...(article.schemaOrgData?.articleSection ?? []),
	];

	/* Try to get published date */
	const publishedDate =
		article.published ||
		article.schemaOrgData?.datePublished ||
		page.window.document.querySelector("time")?.getAttribute("datetime");
	const published = publishedDate ? new Date(publishedDate) : undefined;

	const title =
		article.title ||
		article.schemaOrgData.headline ||
		article.schemaOrgData.name ||
		page.window.document.title;

	return {
		title,
		url: url.toString(),
		published,
		createdAt: new Date(),
		author,
		tags,
		markdownContent: markdownBody,
		textContent: convertMarkdownToPlainText(markdownBody),
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
