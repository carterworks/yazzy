import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { getArticleLocale } from "./article-locale";

function extract(html: string) {
	return getArticleLocale(parseHTML(html).document);
}

describe("getArticleLocale", () => {
	test("derives Persian direction from language", () => {
		expect(extract('<html lang="fa"><body></body></html>')).toEqual({
			language: "fa",
			direction: "rtl",
		});
	});

	test("derives direction using locale data", () => {
		expect(extract('<html lang="ar"><body></body></html>')).toEqual({
			language: "ar",
			direction: "rtl",
		});
		expect(extract('<html lang="en-US"><body></body></html>')).toEqual({
			language: "en-US",
			direction: "ltr",
		});
	});

	test("preserves explicit direction and body overrides", () => {
		expect(
			extract('<html lang="en" dir="ltr"><body dir="RTL"></body></html>'),
		).toEqual({ language: "en", direction: "rtl" });
		expect(extract('<html lang="fa" dir="auto"><body></body></html>')).toEqual({
			language: "fa",
			direction: "auto",
		});
	});

	test("uses article-local metadata before page defaults", () => {
		expect(
			extract(
				'<html lang="en" dir="ltr"><body><article lang="fa" dir="rtl"><h1>خبر</h1></article></body></html>',
			),
		).toEqual({ language: "fa", direction: "rtl" });
	});

	test("finds direction inherited by the heading on pages without article markup", () => {
		expect(
			extract(
				'<html lang="en"><body><div dir="rtl"><h1>خبر</h1><p>متن خبر</p></div></body></html>',
			),
		).toEqual({ language: "en", direction: "rtl" });
	});

	test("matches extracted prose instead of an unrelated page heading", () => {
		const { document } = parseHTML(
			'<html lang="en"><body><h1>Site name</h1><div dir="rtl"><p>متن خبر</p></div><aside dir="ltr"><p>Sidebar</p></aside></body></html>',
		);
		expect(getArticleLocale(document, "<p>متن خبر</p>")).toEqual({
			language: "en",
			direction: "rtl",
		});
	});

	test("falls back to body language and Open Graph locale", () => {
		expect(extract('<html><body lang="he"></body></html>')).toEqual({
			language: "he",
			direction: "rtl",
		});
		expect(
			extract(
				'<html><head><meta property="og:locale" content="fa_IR"></head><body></body></html>',
			),
		).toEqual({ language: "fa-IR", direction: "rtl" });
	});

	test("leaves absent or invalid metadata unknown", () => {
		expect(extract("<html><body></body></html>")).toEqual({
			language: null,
			direction: null,
		});
		expect(
			extract(
				'<html lang="not a language" dir="sideways"><body></body></html>',
			),
		).toEqual({
			language: null,
			direction: null,
		});
	});
});
