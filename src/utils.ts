import type { ReadablePage } from "./types";

export function isUrl(potentialUrl: string): boolean {
	try {
		new URL(decodeURIComponent(potentialUrl));
		return true;
	} catch {
		return false;
	}
}

// Astro drops a trailing ".html" from route params, which breaks clipping
// "/https://example.com/page.html", so read the request path and decode it the
// way Astro does.
export function getArticleUrlFromPath(pathname: string): string {
	let decoded = pathname;
	try {
		decoded = decodeURI(pathname);
	} catch {
		// Malformed escapes are passed through, as Astro does.
	}
	return decoded.replace(/^\//, "");
}

export function formatDate(date: Date | undefined): string {
	if (!date || Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().split("T")[0];
}

// summarize() prefixes "<p><em>Generated on <date> using <model></em></p>"; match only
// that leading paragraph so article text that reads similarly survives.
const GENERATION_NOTICE =
	/^\s*<p><em>Generated on [^<]* using [^<]*<\/em><\/p>/;

export function getPlainTextSummary(
	article: ReadablePage,
	length = 100,
): string {
	const fullSummary =
		article.summary ??
		article.textContent?.substring(0, length) ??
		article.htmlContent ??
		"";
	let truncatedSummary = fullSummary
		.replace(GENERATION_NOTICE, "")
		.replace(/<[^>]*>/g, " ")
		.trim()
		.split(/\s+/)
		.slice(0, length)
		.join(" ");
	if (truncatedSummary.length < fullSummary.length) {
		truncatedSummary += "...";
	}
	return truncatedSummary;
}

/**
 * Get a clean description suitable for OG meta tags.
 * Removes emojis, normalizes whitespace, and limits to a reasonable length.
 */
export function getOgDescription(
	article: ReadablePage,
	maxChars = 200,
): string {
	const rawText =
		article.textContent?.substring(0, 2000) ??
		article.summary ??
		article.htmlContent ??
		"";

	const cleaned = rawText
		.replace(GENERATION_NOTICE, "")
		// Remove HTML tags
		.replace(/<[^>]*>/g, " ")
		// Remove emojis and other unicode symbols (covers most emoji ranges)
		.replace(
			/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
			"",
		)
		// Remove variation selectors (emoji modifiers)
		.replace(/\u{FE0E}|\u{FE0F}/gu, "")
		// Normalize whitespace
		.replace(/\s+/g, " ")
		.trim();

	if (cleaned.length <= maxChars) {
		return cleaned;
	}

	// Truncate at word boundary
	const truncated = cleaned.substring(0, maxChars);
	const lastSpace = truncated.lastIndexOf(" ");
	return `${truncated.substring(0, lastSpace > 0 ? lastSpace : maxChars)}…`;
}
