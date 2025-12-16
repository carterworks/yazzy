import { beforeAll, describe, expect, it } from "bun:test";
import { cache } from "../../services/cache";
import type { ReadablePage } from "../../types";

describe("Article Count API", () => {
	beforeAll(async () => {
		// Ensure we have a clean state for testing
	});

	it("should return article count", async () => {
		const count = await cache.getArticleCount();
		expect(typeof count).toBe("number");
		expect(count).toBeGreaterThanOrEqual(0);
	});

	it("should return count as string in API", async () => {
		const { GET } = await import("./article-count");
		const mockContext = {
			request: new Request("http://localhost/api/article-count"),
		} as Parameters<typeof GET>[0];
		const response = await GET(mockContext);
		const text = await response.text();
		expect(Number.parseInt(text, 10)).toBeGreaterThanOrEqual(0);
	});
});
