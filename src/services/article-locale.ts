import { parseHTML } from "linkedom";
import type { ReadablePage } from "../types";

// TypeScript's Intl declarations do not yet include this standard API.
interface TextLocale extends Intl.Locale {
	getTextInfo(): { direction: "ltr" | "rtl" };
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
	let locale: Intl.Locale | undefined;
	if (languageTag) {
		try {
			locale = new Intl.Locale(languageTag.replaceAll("_", "-"));
		} catch {
			// Invalid source metadata should not prevent clipping an article.
		}
	}

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
			: (locale as TextLocale | undefined)?.getTextInfo().direction;

	return { language: locale?.toString() ?? null, direction: direction ?? null };
}
