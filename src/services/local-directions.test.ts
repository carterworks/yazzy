import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { applyLocalDirections } from "./article-locale";

function render(content: string) {
	return parseHTML(applyLocalDirections(content)).document;
}

describe("applyLocalDirections", () => {
	test("derives local directions from paragraph languages", () => {
		const document = render(
			'<p lang="fa">OpenAI امروز خبر داد.</p><p lang="en">English quotation.</p><p lang="he">עברית</p>',
		);
		expect(
			Array.from(document.querySelectorAll("p"), (p) => p.getAttribute("dir")),
		).toEqual(["rtl", "ltr", "rtl"]);
	});

	test("preserves explicit directions even when they disagree with language", () => {
		const document = render(
			'<p lang="fa" dir="ltr">English-led text</p><p lang="en" dir="rtl">RTL override</p><p lang="fa" dir="auto">Auto</p>',
		);
		expect(
			Array.from(document.querySelectorAll("p"), (p) => p.getAttribute("dir")),
		).toEqual(["ltr", "rtl", "auto"]);
	});

	test("unmarked paragraphs inherit while nested language overrides remain local", () => {
		const document = render(
			'<section lang="fa"><p>OpenAI امروز خبر داد.</p><blockquote lang="en"><p>English quotation.</p><p lang="fa">توضیح فارسی</p></blockquote><p>ادامه خبر</p></section>',
		);
		expect(document.querySelector("section")?.getAttribute("dir")).toBe("rtl");
		expect(document.querySelector("blockquote")?.getAttribute("dir")).toBe(
			"ltr",
		);
		expect(
			Array.from(document.querySelectorAll("p"), (p) => p.getAttribute("dir")),
		).toEqual([null, null, "rtl", null]);
	});

	test("does not guess direction from English-leading Persian text", () => {
		const document = render("<p>OpenAI امروز نسخه جدیدی منتشر کرد.</p>");
		expect(document.querySelector("p")?.hasAttribute("dir")).toBe(false);
	});

	test("leaves invalid or empty languages alone", () => {
		const document = render(
			'<p lang="">Unknown</p><p lang="not a language">Invalid</p>',
		);
		expect(document.querySelectorAll("[dir]").length).toBe(0);
	});

	test("preserves code and native bidi isolation", () => {
		const document = render(
			'<pre lang="fa"><code lang="fa">const x = "سلام";</code></pre><bdi lang="fa">نام</bdi><bdo lang="fa">متن</bdo>',
		);
		expect(document.querySelectorAll("[dir]").length).toBe(0);
	});

	test("preserves text, inline markup, and existing source overrides", () => {
		const content =
			'<p lang="en">Read <a href="https://example.com">this &amp; that</a>.</p><div dir="rtl"><p>خبر</p></div>';
		const document = render(content);
		expect(document.querySelector("a")?.getAttribute("href")).toBe(
			"https://example.com",
		);
		expect(document.querySelector("p")?.textContent).toBe("Read this & that.");
		expect(document.querySelector("div")?.getAttribute("dir")).toBe("rtl");
		expect(applyLocalDirections(applyLocalDirections(content))).toBe(
			applyLocalDirections(content),
		);
	});
});
