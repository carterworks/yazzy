import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { ResponseTooLargeError, UpstreamTimeoutError, clip } from "./clipper";

const prose =
	"This is the article text used to verify extraction and locale handling. ".repeat(
		20,
	);

async function clipHtml(html: string) {
	// A public IP literal skips DNS, which the public-address check would need.
	const url = new URL("https://93.184.215.14/article");
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

test("clipping rejects pages with no extractable content", async () => {
	await expect(
		clipHtml(
			'<!DOCTYPE html><html lang="en"><head><title></title></head><body><section class="error-section--hide" id="en"><h1></h1><h2>Transferring to the website...</h2></section><script>window.location.reload()</script></body></html>',
		),
	).rejects.toThrow("No readable content");
});

test("clipping keeps image-only articles", async () => {
	const article = await clipHtml(
		'<html><head><title>Photo</title></head><body><article><h1>Photo</h1><img src="https://example.test/photo.jpg" alt="A photo"></article></body></html>',
	);
	expect(article.markdownContent).toContain("photo.jpg");
});

test("clipping refuses non-public addresses", async () => {
	await expect(clip(new URL("http://127.0.0.1/api/db-dump"))).rejects.toThrow(
		"not a public address",
	);
});

test("clipping resolves relative links against the redirected URL", async () => {
	const start = "https://93.184.215.14/goto";
	const final = "https://93.184.215.15/news/article";
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		const requestedUrl = input instanceof Request ? input.url : String(input);
		if (requestedUrl === start) {
			return new Response(null, { status: 302, headers: { location: final } });
		}
		return new Response(
			`<html><head><title>Article</title></head><body><article><h1>Article</h1><p>${prose}<a href="/related">Related</a></p><img src="photo.jpg"></article></body></html>`,
			{ headers: { "content-type": "text/html" } },
		);
	}) as typeof fetch;
	try {
		const article = await clip(new URL(start));
		expect(article.htmlContent).toContain(
			'href="https://93.184.215.15/related"',
		);
		expect(article.htmlContent).toContain(
			'src="https://93.184.215.15/news/photo.jpg"',
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

describe("clip limits", () => {
	const page = `<html><head><title>Article</title></head><body><article><h1>Article</h1><p>${prose}</p></article></body></html>`;
	let server: ReturnType<typeof Bun.serve>;
	let cancelled = false;

	beforeAll(() => {
		process.env["CLIP_ALLOW_PRIVATE_HOSTS"] = "localhost";
		process.env["CLIP_TIMEOUT_MS"] = "300";
		process.env["CLIP_MAX_HTML_BYTES"] = "100000";
		server = Bun.serve({
			hostname: "localhost",
			port: 0,
			idleTimeout: 30,
			fetch(request): Response | Promise<Response> {
				const html = { "content-type": "text/html" };
				switch (new URL(request.url).pathname) {
					case "/no-response":
						return new Promise(() => {});
					case "/stalled-body":
						return new Response(
							new ReadableStream({
								start(controller) {
									controller.enqueue(new TextEncoder().encode("<html>"));
								},
							}),
							{ headers: html },
						);
					case "/declared-too-large":
						return new Response(new Uint8Array(200_000), { headers: html });
					case "/streamed-too-large":
						return new Response(
							new ReadableStream({
								pull(controller) {
									controller.enqueue(new Uint8Array(16_384).fill(32));
								},
								cancel() {
									cancelled = true;
								},
							}),
							{ headers: html },
						);
					default:
						return new Response(page, { headers: html });
				}
			},
		});
	});

	afterAll(() => {
		server.stop(true);
		for (const name of [
			"CLIP_ALLOW_PRIVATE_HOSTS",
			"CLIP_TIMEOUT_MS",
			"CLIP_MAX_HTML_BYTES",
		]) {
			Reflect.deleteProperty(process.env, name);
		}
	});

	const at = (path: string) =>
		new URL(`http://localhost:${server.port}${path}`);

	test("gives up on a server that never responds", async () => {
		await expect(clip(at("/no-response"))).rejects.toBeInstanceOf(
			UpstreamTimeoutError,
		);
	});

	test("gives up on a body that stops arriving", async () => {
		await expect(clip(at("/stalled-body"))).rejects.toBeInstanceOf(
			UpstreamTimeoutError,
		);
	});

	test("refuses a declared size over the limit before reading it", async () => {
		await expect(clip(at("/declared-too-large"))).rejects.toBeInstanceOf(
			ResponseTooLargeError,
		);
		await expect(clip(at("/declared-too-large"))).rejects.toThrow(
			"declares 200000 bytes",
		);
	});

	test("stops reading a body that streams past the limit", async () => {
		await expect(clip(at("/streamed-too-large"))).rejects.toBeInstanceOf(
			ResponseTooLargeError,
		);
		// Without an explicit cancel the stream stays open until the timeout or GC.
		for (let waited = 0; !cancelled && waited < 100; waited += 5) {
			await Bun.sleep(5);
		}
		expect(cancelled).toBe(true);
	});

	test("still clips pages within the limits", async () => {
		const article = await clip(at("/article"));
		expect(article.title).toBe("Article");
	});
});

test.each([
	["an unparseable published date", "19 minutes ago", undefined],
	[
		"a parseable published date",
		"2026-11-20T10:00:00Z",
		"2026-11-20T10:00:00.000Z",
	],
])("clipping handles %s", async (_name, value, expected) => {
	const article = await clipHtml(
		`<html><head><title>Article</title><meta property="article:published_time" content="${value}"></head><body><article><h1>Article</h1><time datetime="${value}">${value}</time><p>${prose}</p></article></body></html>`,
	);
	expect(article.published?.toISOString()).toBe(expected);
});
