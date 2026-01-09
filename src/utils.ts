import type { ReadablePage } from "./types";

export function isUrl(potentialUrl: string): boolean {
	try {
		new URL(decodeURIComponent(potentialUrl));
		return true;
	} catch {
		return false;
	}
}

export function formatDate(date: Date | undefined): string {
	if (!date) {
		return "";
	}
	return date.toISOString().split("T")[0];
}

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
		?.replace(/<[^>]*>/g, " ")
		// remove the "Generated on 02/06/2025 08:21 PM using google/gemini-2.0-flash-001"
		// or "Generated on 2025-02-06T19:48:10.640Z using google/gemini-2.0-flash-001	"
		.replace(/Generated on .+ using \w+\/[\w-\.]+/, "")
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
		// Remove HTML tags
		.replace(/<[^>]*>/g, " ")
		// Remove emojis and other unicode symbols (covers most emoji ranges)
		.replace(
			/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
			"",
		)
		// Remove variation selectors (emoji modifiers)
		.replace(/\u{FE0E}|\u{FE0F}/gu, "")
		// Remove generated timestamp lines
		.replace(/Generated on .+ using \w+\/[\w-\.]+/g, "")
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
