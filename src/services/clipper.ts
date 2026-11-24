import { Defuddle } from "defuddle/node";
import createDomPurify from "dompurify";
import { parseHTML } from "linkedom";
import type { ReadablePage } from "../types";
import { getArticleLocale } from "./article-locale";
import convertHtmlToMarkdown from "./markdown";
import { NonPublicUrlError, fetchPublic } from "./public-fetch";
import { facet } from "./telemetry";

type ClipFields = {
	host: string;
	upstream_status: number;
	content_type: string;
	content_length: number;
	html_bytes: number;
	markdown_chars: number;
	invalid_urls: number;
};
const telemetry = facet<ClipFields>("clip");

/** The site being clipped responded with an error status. */
export class UpstreamHttpError extends Error {
	override name = "UpstreamHttpError";
}

/** The site being clipped couldn't be reached at all. */
export class UpstreamFetchError extends Error {
	override name = "UpstreamFetchError";
}

export class UnsupportedContentTypeError extends Error {
	override name = "UnsupportedContentTypeError";
}

export class ExtractionError extends Error {
	override name = "ExtractionError";
}

/** The site didn't finish responding within CLIP_TIMEOUT_MS. */
export class UpstreamTimeoutError extends Error {
	override name = "UpstreamTimeoutError";
}

/** The page is bigger than CLIP_MAX_HTML_BYTES. */
export class ResponseTooLargeError extends Error {
	override name = "ResponseTooLargeError";
}

// One deadline covers every redirect hop and the body, so a slow or endless
// response can't hold a request open. The size cap applies to decoded bytes,
// which also bounds compressed responses that expand far beyond their length.
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_HTML_BYTES = 13 * 1024 * 1024;

function positiveNumberFromEnv(name: string, fallback: number): number {
	const value = Number(process.env[name]);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

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

/** Polyfill APIs that linkedom doesn't implement but defuddle expects. */
function patchLinkedomDocument(doc: Document, url: string): void {
	const d = doc as unknown as Record<string, unknown>;
	if (!d["styleSheets"]) d["styleSheets"] = [];
	const dv = d["defaultView"] as Record<string, unknown> | null;
	if (dv && !dv["getComputedStyle"]) {
		dv["getComputedStyle"] = () => ({ display: "" });
	}
	d["URL"] = url;
}

async function readBody(
	response: Response,
	url: URL,
	maxBytes: number,
): Promise<Uint8Array> {
	const tooLarge = (detail: string) =>
		new ResponseTooLargeError(
			`${url.toString()} ${detail}; the limit is ${maxBytes} bytes`,
		);
	const declared = Number(response.headers.get("content-length"));
	if (declared > 0) telemetry.set({ content_length: declared });
	if (declared > maxBytes) {
		await response.body?.cancel();
		throw tooLarge(`declares ${declared} bytes`);
	}
	if (!response.body) return new Uint8Array();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			throw tooLarge(`sent more than ${maxBytes} bytes`);
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

async function download(url: URL): Promise<{ html: string; url: URL }> {
	const timeoutMs = positiveNumberFromEnv(
		"CLIP_TIMEOUT_MS",
		DEFAULT_TIMEOUT_MS,
	);
	const maxBytes = positiveNumberFromEnv(
		"CLIP_MAX_HTML_BYTES",
		DEFAULT_MAX_HTML_BYTES,
	);
	const signal = AbortSignal.timeout(timeoutMs);
	const timedOut = (cause: unknown) =>
		new UpstreamTimeoutError(
			`${url.toString()} didn't finish responding within ${timeoutMs} ms`,
			{ cause },
		);
	let response: Response;
	let finalUrl: URL;
	try {
		({ response, url: finalUrl } = await fetchPublic(url, {
			headers: {
				"User-Agent": "YazzyWebClipper/0.0.1",
			},
			signal,
		}));
	} catch (err) {
		if (err instanceof NonPublicUrlError) throw err;
		if (signal.aborted) throw timedOut(err);
		throw new UpstreamFetchError(`Failed to fetch ${url.toString()}`, {
			cause: err,
		});
	}
	telemetry.set({ upstream_status: response.status });
	if (!response.ok) {
		throw new UpstreamHttpError(
			`Failed to fetch ${url.toString()}: ${response.status} ${response.statusText}`,
		);
	}
	const contentType = response.headers.get("content-type");
	if (!contentType) {
		throw new UnsupportedContentTypeError(
			`No content type specified for ${url.toString()}`,
		);
	}
	// Extract the base content type without parameters
	const baseContentType = contentType.split(";")[0].trim().toLowerCase();
	telemetry.set({ content_type: baseContentType });
	if (!supportedContentTypes.includes(baseContentType)) {
		throw new UnsupportedContentTypeError(
			`URL "${url.toString()}" has unsupported content type: ${baseContentType}`,
		);
	}
	let bytes: Uint8Array;
	try {
		bytes = await readBody(response, url, maxBytes);
	} catch (err) {
		if (signal.aborted && !(err instanceof ResponseTooLargeError)) {
			throw timedOut(err);
		}
		throw err;
	}
	telemetry.set({ html_bytes: bytes.byteLength });
	return { html: new TextDecoder().decode(bytes), url: finalUrl };
}

async function fetchPage(
	requestedUrl: URL,
): Promise<{ document: Document; url: URL }> {
	const { html, url } = await telemetry.time("fetch", () =>
		download(requestedUrl),
	);

	const { document, window } = await telemetry.time("parse", () => {
		const parsed = parseHTML(html);
		patchLinkedomDocument(parsed.document, url.toString());
		return parsed;
	});

	await telemetry.time("sanitize", () => {
		const DOMPurify = createDomPurify(window);
		document.body.innerHTML = DOMPurify.sanitize(document.body.innerHTML);
	});

	// force lazy-loaded images to load
	const LAZY_DATA_ATTRS = [
		"data-src",
		"data-lazy-src",
		"data-srcset",
		"data-td-src-property",
	];
	for (const dataAttr of LAZY_DATA_ATTRS) {
		const images = Array.from(document.querySelectorAll(`img[${dataAttr}]`));
		for (const img of images) {
			const src = img.getAttribute(dataAttr);
			if (src) {
				img.setAttribute("src", src);
			}
		}
	}
	// make all images and videos absolute referencers
	const selectorsToNormalize = [
		["img", "src"],
		["video", "src"],
		["a", "href"],
		["img", "srcset"],
		["video", "poster"],
		["source", "src"],
		["object", "data"],
		["iframe", "src"],
		["input", "src"],
		["track", "src"],
		["embed", "src"],
	];
	let invalidUrls = 0;
	for (const [selector, attribute] of selectorsToNormalize) {
		invalidUrls += normalizeResourceUrls(document, url, selector, attribute);
	}
	telemetry.set({ invalid_urls: invalidUrls });

	return { document, url };
}

function normalizeResourceUrls(
	document: Document,
	url: URL,
	selector: string,
	attribute: string,
): number {
	let invalid = 0;
	for (const element of Array.from(document.querySelectorAll(selector))) {
		const value = element.getAttribute(attribute);
		if (!value) {
			continue;
		}

		if (attribute === "srcset") {
			// Handle srcset which can have multiple URLs and descriptors
			const newSrcset = value
				.split(",")
				.map((part: string) => {
					const trimmedPart = part.trim();
					const urlMatch = trimmedPart.match(/^(\S+)(\s+.*)?$/);
					if (urlMatch?.[1]) {
						try {
							const absoluteUrl = new URL(urlMatch[1], url.href).href;
							return absoluteUrl + (urlMatch[2] || "");
						} catch {
							invalid++;
							return "";
						}
					}
					return ""; // Return empty for parts that don't match expected format
				})
				.filter((part: string) => part !== "") // Remove parts that were invalid or empty
				.join(", ");
			if (newSrcset) {
				element.setAttribute(attribute, newSrcset);
			} else {
				// If all parts were invalid, remove the attribute
				element.removeAttribute(attribute);
			}
		} else {
			// Handle single URL attributes like src, href, poster
			try {
				const absoluteUrl = new URL(value, url.href).href;
				element.setAttribute(attribute, absoluteUrl);
			} catch {
				invalid++;
				element.removeAttribute(attribute);
			}
		}
	}
	return invalid;
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
	telemetry.set({ host: url.hostname });
	const { document: pageDocument, url: pageUrl } = await fetchPage(url);

	const article = await telemetry.time("extract", () =>
		Defuddle(pageDocument, pageUrl.toString()),
	);

	if (!article) {
		throw new ExtractionError(
			`Failed to parse article contents of "${url.toString()}"`,
		);
	}
	const locale = getArticleLocale(pageDocument, article.content);

	// TODO: reimplement code syntax highlighting with shiki
	// TODO: reimplement header linking

	const markdownBody = await telemetry.time("markdown", () =>
		convertHtmlToMarkdown(article.content, pageUrl.toString()),
	);
	telemetry.set({ markdown_chars: markdownBody.length });
	if (!markdownBody.trim()) {
		throw new ExtractionError(
			`No readable content found at "${url.toString()}"`,
		);
	}

	// Fetch byline, meta author, property author, or site name
	const author =
		article.author ||
		getMetaContent(pageDocument, "name", "author") ||
		getMetaContent(pageDocument, "property", "author") ||
		getMetaContent(pageDocument, "property", "og:site_name");

	const tags = [
		"clippings",
		...(
			pageDocument
				.querySelector("meta[name='keywords' i]")
				?.getAttribute("content")
				?.split(",") ?? []
		).map((keyword) => keyword.split(" ").join("")),
		...(article.schemaOrgData?.articleSection ?? []),
	];

	/* Try to get published date */
	let published =
		article.published ||
		article.schemaOrgData?.datePublished ||
		pageDocument.querySelector("time")?.getAttribute("datetime");
	if (typeof published === "string") {
		published = published.trim().split(/,\s+/gi)[0];
	}
	if (published) {
		published = new Date(published);
	}

	const title =
		article.title ||
		article.schemaOrgData.headline ||
		article.schemaOrgData.name ||
		pageDocument.title;

	return {
		title,
		...locale,
		url: url.toString(),
		published,
		createdAt: new Date(),
		author,
		tags,
		markdownContent: markdownBody,
		textContent: await telemetry.time("plaintext", () =>
			convertMarkdownToPlainText(markdownBody),
		),
		htmlContent: article.content,
	};
}

export async function clip(url: URL): Promise<ReadablePage> {
	return clipArticle(url);
}
