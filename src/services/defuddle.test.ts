import { describe, expect, test } from "bun:test";
import { createMarkdownContent } from "defuddle/node";

describe("Defuddle Node Markdown entry", () => {
	test("converts standalone HTML without browser globals", () => {
		expect(
			createMarkdownContent(
				"<p>Hello <strong>world</strong>.</p>",
				"https://example.test",
			),
		).toBe("Hello **world**.");
	});

	test("preserves trailing columns in ragged tables", () => {
		const markdown = createMarkdownContent(
			"<table><tr><th>A</th></tr><tr><td>B</td><td>C</td></tr></table>",
			"https://example.test",
		);
		expect(markdown).toContain("| --- | --- |");
		expect(markdown).toContain("| B | C |");
	});
});
