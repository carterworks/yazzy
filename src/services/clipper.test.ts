import { describe, expect, test } from "bun:test";
import { clip } from "./clipper";

const prose =
	"This is the article text used to verify extraction and locale handling. ".repeat(
		20,
	);

async function clipHtml(html: string) {
	const url = new URL("https://example.test/article");
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		const requestedUrl = input instanceof Request ? input.url : String(input);
		if (requestedUrl !== url.toString()) {
			throw new Error("Unexpected network request during extraction test");
		}
		return new Response(html, { headers: { "content-type": "text/html" } });
	}) as typeof fetch;
	try {
		return await clip(url);
	} finally {
		globalThis.fetch = originalFetch;
	}
}

describe("clip article locale", () => {
	test.each([
		{
			name: "article-local RTL rather than English page metadata",
			attributes: 'lang="en" dir="ltr"',
			head: "",
			body: `<article lang="fa" dir="rtl"><h1>Article</h1><p>${prose}</p></article>`,
			expected: { language: "fa", direction: "rtl" },
		},
		{
			name: "explicit ancestor direction",
			attributes: 'lang="en" dir="rtl"',
			head: "",
			body: `<main dir="auto"><h1>Article</h1><p>${prose}</p></main>`,
			expected: { language: "en", direction: "auto" },
		},
		{
			name: "Open Graph locale fallback",
			attributes: "",
			head: '<meta property="og:locale" content="fa_IR">',
			body: `<article><h1>Article</h1><p>${prose}</p></article>`,
			expected: { language: "fa-IR", direction: "rtl" },
		},
		{
			name: "unknown locale rather than adopting schema language",
			attributes: "",
			head: '<script type="application/ld+json">{"@type":"Article","inLanguage":"fa","headline":"Article"}</script>',
			body: `<article><h1>Article</h1><p>${prose}</p></article>`,
			expected: { language: null, direction: null },
		},
	])("preserves $name after extraction", async (fixture) => {
		const article = await clipHtml(
			`<!doctype html><html ${fixture.attributes}><head><title>Article</title>${fixture.head}</head><body>${fixture.body}</body></html>`,
		);
		expect(article.language).toBe(fixture.expected.language);
		expect(article.direction).toBe(fixture.expected.direction);
		expect(article.htmlContent).toContain("article text");
	});
});

test("clipping preserves all ragged-table columns in Markdown exports", async () => {
	const article = await clipHtml(
		`<html><head><title>Article</title></head><body><article><h1>Article</h1><p>${prose}</p><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td><td>C</td></tr></tbody></table></article></body></html>`,
	);
	expect(article.markdownContent).toContain(
		"| A |  |\n| --- | --- |\n| B | C |",
	);
});
