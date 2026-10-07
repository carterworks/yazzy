import { parseHTML } from "linkedom";
import type { ReadablePage } from "../types";

// TypeScript's Intl declarations do not yet include this standard API.
interface TextLocale extends Intl.Locale {
	getTextInfo(): { direction: "ltr" | "rtl" };
}

function parseLocale(languageTag: string): TextLocale | undefined {
	try {
		return new Intl.Locale(languageTag.replaceAll("_", "-")) as TextLocale;
	} catch {
		// Invalid source metadata should not prevent reading an article.
		return undefined;
	}
}

export function applyLocalDirections(content: string): string {
	const { document } = parseHTML("<html><body></body></html>");
	document.body.innerHTML = content;
	for (const element of Array.from(
		document.body.querySelectorAll("[lang]:not([dir])"),
	)) {
		if (element.closest("pre, code, bdi, bdo")) continue;
		const language = element.getAttribute("lang")?.trim();
		const direction =
			language && parseLocale(language)?.getTextInfo().direction;
		if (direction) element.setAttribute("dir", direction);
	}
	return document.body.innerHTML;
}

export function getArticleLocale(
	document: Document,
	content?: string,
): Pick<ReadablePage, "language" | "direction"> {
	const normalizeText = (text: string | null) =>
		text?.replace(/\s+/g, " ").trim() ?? "";
	const contentParagraph = content
		? Array.from(parseHTML(content).document.querySelectorAll("p"))
				.map((paragraph) => normalizeText(paragraph.textContent))
				.sort((a, b) => b.length - a.length)[0]
		: undefined;
	const sourceParagraph = contentParagraph
		? Array.from(document.querySelectorAll("p")).find(
				(paragraph) =>
					normalizeText(paragraph.textContent) === contentParagraph,
			)
		: undefined;
	const articleRoot =
		sourceParagraph ||
		document.querySelector("article") ||
		document.querySelector("main") ||
		document.querySelector("h1") ||
		document.body;
	const languageTag =
		articleRoot.closest("[lang]")?.getAttribute("lang")?.trim() ||
		document
			.querySelector('meta[property="og:locale"]')
			?.getAttribute("content")
			?.trim();
	const locale = languageTag ? parseLocale(languageTag) : undefined;

	const sourceDirection = (
		articleRoot.closest("[dir]")?.getAttribute("dir") || ""
	)
		.trim()
		.toLowerCase();
	const direction =
		sourceDirection === "rtl" ||
		sourceDirection === "ltr" ||
		sourceDirection === "auto"
			? sourceDirection
			: locale?.getTextInfo().direction;

	return { language: locale?.toString() ?? null, direction: direction ?? null };
}
