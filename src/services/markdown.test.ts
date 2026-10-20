import { describe, expect, test } from "bun:test";
import convertHtmlToMarkdown from "./markdown";

const convert = (html: string) =>
	convertHtmlToMarkdown(html, "https://example.test/article");

describe("HTML table conversion", () => {
	test("converts each nested table's content only once", () => {
		let html = "SYNTHETICTOKEN";
		for (let depth = 0; depth < 6; depth++) {
			html = `<table><tr><td>${html}</td></tr></table>`;
		}
		const markdown = convert(html);
		expect(markdown.match(/SYNTHETICTOKEN/g)).toHaveLength(1);
		expect(markdown.length).toBeLessThan(4096);
	});

	test("flattens nested layout cells in reading order without duplication", () => {
		const markdown = convert(
			"<table><tr><td>OUTERONE<table><tr><td>INNERONE</td></tr></table></td><td>OUTERTWO</td></tr></table>",
		);
		for (const token of ["OUTERONE", "INNERONE", "OUTERTWO"]) {
			expect(markdown.match(new RegExp(token, "g"))).toHaveLength(1);
		}
		expect(markdown).toBe("OUTERONE\n\nINNERONE\n\nOUTERTWO");
	});

	test("counts actual columns rather than pipes inside cell content", () => {
		expect(
			convert(
				"<table><tr><th>left|right</th><th>other</th></tr><tr><td>one</td><td>two</td></tr></table>",
			),
		).toBe("| left\\|right | other |\n| --- | --- |\n| one | two |");
	});

	test("treats a one-cell wrapper as layout rather than a data table", () => {
		expect(convert("<table><tr><td>plain text</td></tr></table>")).toBe(
			"plain text",
		);
	});

	test("preserves headings, cell formatting and links", () => {
		const markdown = convert(
			'<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td><strong>one</strong></td><td><a href="https://example.test/resource">two</a></td></tr></tbody></table>',
		);
		expect(markdown).toContain("| A | B |\n| --- | --- |");
		expect(markdown).toContain("**one**");
		expect(markdown).toContain("[two](https://example.test/resource)");
	});

	test("preserves blank cells and multiline content", () => {
		const markdown = convert(
			"<table><tr><td></td><td><p>first</p><p>second</p></td></tr></table>",
		);
		expect(markdown).toContain("first");
		expect(markdown).toContain("second");
		expect(markdown.split("\n")[1]).toBe("| --- | --- |");
	});

	test("keeps a valid separator when the leading HTML row has no cells", () => {
		expect(convert("<table><tr></tr><tr><td>a</td></tr></table>")).toBe(
			"|  |\n| --- |\n| a |",
		);
	});

	test("keeps complex span tables as cleaned HTML", () => {
		const markdown = convert(
			'<table class="layout"><tr><td colspan="2">spanning data</td></tr><tr><td>left</td><td>right</td></tr></table>',
		);
		expect(markdown).toContain('colspan="2"');
		expect(markdown).toContain("spanning data");
		expect(markdown).not.toContain('class="layout"');
	});

	test("preserves the equation-table path", () => {
		expect(
			convert(
				'<table class="ltx_equation"><tr><td><math alttext="x+y"><mi>x</mi></math></td></tr></table>',
			),
		).toBe("$$\nx+y\n$$");
	});

	test.each([
		'<td class="katex" data-latex="x+y">x+y</td>',
		'<td class="mwe-math-element"><math alttext="x+y">x+y</math></td>',
		'<th class="math" data-latex="x+y">x+y</th>',
	])(
		"retains cell content handled by a higher-priority math rule: %s",
		(cell) => {
			const markdown = convert(`<table><tr>${cell}<td>kept</td></tr></table>`);
			expect(markdown).toContain("x+y");
			expect(markdown).toContain("kept");
			expect(markdown.split("\n")[1]).toBe("| --- | --- |");
		},
	);

	test("converts cell children rather than the cell's own math wrapper", () => {
		expect(
			convert(
				'<table><tr><td class="katex" data-latex="different">literal</td><td>kept</td></tr></table>',
			),
		).toBe("| literal | kept |\n| --- | --- |");
	});

	test("keeps conversion state isolated between calls", () => {
		const html = "<table><tr><td>single</td></tr></table>";
		expect(convert(html)).toBe(convert(html));
		expect(convert("<p>plain text</p>")).toBe("plain text");
	});
});
