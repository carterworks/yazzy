import { afterEach, describe, expect, test } from "bun:test";
import { NonPublicUrlError, fetchPublic } from "./public-fetch";

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

function mockFetch(responses: Record<string, () => Response>) {
	const requested: string[] = [];
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		const url = input instanceof Request ? input.url : String(input);
		requested.push(url);
		const respond = responses[url];
		if (!respond) throw new Error(`Unexpected request to ${url}`);
		return respond();
	}) as typeof fetch;
	return requested;
}

function redirect(location: string, status = 302) {
	return () => new Response(null, { status, headers: { location } });
}

const publicLookup = async () => ["93.184.215.14"];

describe("fetchPublic", () => {
	test.each([
		"http://127.0.0.1/",
		"http://10.0.0.1/",
		"http://169.254.169.254/latest/meta-data",
		"http://[::1]/",
		"http://[fdaa:0:1::3]/",
		"http://[::ffff:127.0.0.1]/",
	])("refuses the non-public address %s", async (url) => {
		const requested = mockFetch({});
		await expect(fetchPublic(new URL(url), {}, publicLookup)).rejects.toThrow(
			"not a public address",
		);
		expect(requested).toEqual([]);
	});

	test("refuses hostnames that resolve to a non-public address", async () => {
		const requested = mockFetch({});
		await expect(
			fetchPublic(new URL("https://intranet.example/"), {}, async () => [
				"93.184.215.14",
				"10.0.0.5",
			]),
		).rejects.toThrow("not a public address");
		expect(requested).toEqual([]);
	});

	test("refuses non-HTTP protocols", async () => {
		mockFetch({});
		await expect(
			fetchPublic(new URL("ftp://example.com/file"), {}, publicLookup),
		).rejects.toThrow("Unsupported protocol");
	});

	test("follows redirects between public addresses", async () => {
		const requested = mockFetch({
			"https://short.example/a": redirect("https://www.example.com/start", 301),
			"https://www.example.com/start": redirect("/article"),
			"https://www.example.com/article": () => new Response("article"),
		});
		const { response, url } = await fetchPublic(
			new URL("https://short.example/a"),
			{},
			publicLookup,
		);
		expect(await response.text()).toBe("article");
		expect(url.toString()).toBe("https://www.example.com/article");
		expect(requested).toHaveLength(3);
	});

	test("refuses a redirect to a non-public address", async () => {
		const requested = mockFetch({
			"https://evil.example/": redirect("http://127.0.0.1:4321/api/db-dump"),
		});
		await expect(
			fetchPublic(new URL("https://evil.example/"), {}, publicLookup),
		).rejects.toThrow("not a public address");
		expect(requested).toEqual(["https://evil.example/"]);
	});

	test("gives up after too many redirects", async () => {
		const requested = mockFetch({
			"https://loop.example/": redirect("https://loop.example/"),
		});
		await expect(
			fetchPublic(new URL("https://loop.example/"), {}, publicLookup),
		).rejects.toThrow("Too many redirects");
		expect(requested).toHaveLength(6);
	});

	// Uses the real fetch so a regression to automatic redirect following,
	// which would skip the per-hop check, cannot hide behind a mock.
	test("checks redirect hops made by the real fetch", async () => {
		const server = Bun.serve({
			hostname: "localhost",
			port: 0,
			fetch: (request): Response =>
				new URL(request.url).pathname === "/start"
					? Response.redirect(`http://localhost:${server.port}/private`)
					: new Response("private"),
		});
		const lookups: string[] = [];
		const firstHopLooksPublic = async (hostname: string) => {
			lookups.push(hostname);
			return lookups.length === 1 ? ["93.184.215.14"] : ["127.0.0.1"];
		};
		try {
			await expect(
				fetchPublic(
					new URL(`http://localhost:${server.port}/start`),
					{},
					firstHopLooksPublic,
				),
			).rejects.toThrow("not a public address");
		} finally {
			server.stop(true);
		}
	});
});

describe("CLIP_ALLOW_PRIVATE_HOSTS", () => {
	afterEach(() => {
		Reflect.deleteProperty(process.env, "CLIP_ALLOW_PRIVATE_HOSTS");
	});

	test("lets only the listed hosts through", async () => {
		process.env["CLIP_ALLOW_PRIVATE_HOSTS"] = "127.0.0.1, fixture.local";
		mockFetch({ "http://127.0.0.1/": () => new Response("fixture") });
		const { response } = await fetchPublic(
			new URL("http://127.0.0.1/"),
			{},
			publicLookup,
		);
		expect(await response.text()).toBe("fixture");
		await expect(
			fetchPublic(new URL("http://10.0.0.1/"), {}, publicLookup),
		).rejects.toBeInstanceOf(NonPublicUrlError);
	});
});
