import { describe, expect, test } from "bun:test";
import type { ReadablePage } from "./types";
import { getOgDescription, getPlainTextSummary } from "./utils";

function articleWithSummary(summary: string): ReadablePage {
	return {
		title: "Title",
		url: "https://example.test/article",
		author: null,
		tags: [],
		markdownContent: null,
		textContent: null,
		htmlContent: null,
		summary,
	};
}

const summaryWithVariantModel =
	"<p><em>Generated on 11/24/2026 04:53 PM using openai/gpt-oss-120b:presto</em></p><p>Black Friday streaming discounts unveiled.</p>\n<ul>\n<li>📌 Ad-free tier: saves $84/year.</li>\n</ul>";

describe("getPlainTextSummary", () => {
	test("removes the generation notice for model IDs with a variant suffix", () => {
		expect(
			getPlainTextSummary(articleWithSummary(summaryWithVariantModel), 30),
		).toStartWith("Black Friday streaming discounts unveiled.");
	});

	test("keeps text that follows the notice when it mentions 'using'", () => {
		const summary =
			"<p><em>Generated on 02/06/2025 08:21 PM using google/gemini-2.0-flash-001</em></p><p>Teams using Rust/C++ ship faster.</p>";
		expect(getPlainTextSummary(articleWithSummary(summary), 30)).toStartWith(
			"Teams using Rust/C++ ship faster.",
		);
	});
});

describe("getOgDescription", () => {
	test("removes the generation notice for model IDs with a variant suffix", () => {
		expect(
			getOgDescription(articleWithSummary(summaryWithVariantModel)),
		).toStartWith("Black Friday streaming discounts unveiled.");
	});
});
