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
