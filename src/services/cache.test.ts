import { describe, expect, test } from "bun:test";
import type { ReadablePage } from "../types";
import { cache } from "./cache";

function article(url: string, title: string | null): ReadablePage {
	return {
		title,
		url,
		author: null,
		tags: [],
		markdownContent: "Body",
		textContent: "Body",
		htmlContent: "<p>Body</p>",
		createdAt: new Date("2999-01-01T00:00:00Z"),
	};
}

describe("getRecentArticles", () => {
	test("skips articles without a title", async () => {
		await cache.insertArticle(article("https://example.test/titled", "Title"));
		await cache.insertArticle(article("https://example.test/null-title", null));
		await cache.insertArticle(article("https://example.test/empty-title", ""));
		await cache.insertArticle(
			article("https://example.test/blank-title", "  "),
		);

		const urls = (await cache.getRecentArticles()).map(({ url }) => url);

		expect(urls).toContain("https://example.test/titled");
		expect(urls).not.toContain("https://example.test/null-title");
		expect(urls).not.toContain("https://example.test/empty-title");
		expect(urls).not.toContain("https://example.test/blank-title");
	});
});
