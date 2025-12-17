import { cache } from "../../services/cache";

Bun.test.describe("Article Count API", () => {
	Bun.test.beforeAll(async () => {
		// Ensure we have a clean state for testing
	});

	Bun.test.it("should return article count", async () => {
		const count = await cache.getArticleCount();
		Bun.test.expect(typeof count).toBe("number");
		Bun.test.expect(count).toBeGreaterThanOrEqual(0);
	});

	Bun.test.it("should return count as string in API", async () => {
		const { GET } = await import("./article-count");
		const mockContext = {
			request: new Request("http://localhost/api/article-count"),
		} as Parameters<typeof GET>[0];
		const response = await GET(mockContext);
		const text = await response.text();
		Bun.test.expect(Number.parseInt(text, 10)).toBeGreaterThanOrEqual(0);
	});
});
