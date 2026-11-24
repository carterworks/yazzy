import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Server, Subprocess } from "bun";

// Boots the production build as a real process, clips articles from a local
// fixture server, and asserts on the JSON lines the app writes to stdout.

type Line = Record<string, unknown>;

const root = resolve(import.meta.dir, "../..");
const SECRET_KEY = "sk-e2e-must-never-be-logged";

let fixture: Server<undefined>;
let app: Subprocess<"ignore", "pipe", "pipe">;
let appUrl: string;
let workDir: string;
const lines: Line[] = [];
const rawOutput: string[] = [];

const prose =
	"This paragraph is long enough for the extractor to treat it as the article. ".repeat(
		30,
	);

function fixtureFetch(request: Request): Response {
	const { pathname } = new URL(request.url);
	if (pathname.startsWith("/ai/")) {
		return Response.json(
			{ error: { code: 401, message: "No auth credentials found" } },
			{ status: 401 },
		);
	}
	if (pathname === "/missing") {
		return new Response("gone", { status: 404 });
	}
	if (pathname === "/slow") {
		return new Promise(() => {}) as unknown as Response;
	}
	if (pathname === "/huge") {
		return new Response("<p>too big</p>".repeat(10_000), {
			headers: { "content-type": "text/html" },
		});
	}
	if (pathname === "/document.pdf") {
		return new Response("%PDF-1.7", {
			headers: { "content-type": "application/pdf" },
		});
	}
	return new Response(
		`<!doctype html><html lang="en"><head><title>Fixture ${pathname}</title></head>
		<body><article><h1>Fixture ${pathname}</h1><p>${prose}</p>
		<img src="/a.png" srcset="http://[bad, /b.png 2x"></article></body></html>`,
		{ headers: { "content-type": "text/html; charset=utf-8" } },
	);
}

async function collect(stream: ReadableStream<Uint8Array>) {
	const decoder = new TextDecoder();
	let buffered = "";
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buffered += decoder.decode(value, { stream: true });
		let newline = buffered.indexOf("\n");
		while (newline !== -1) {
			const line = buffered.slice(0, newline);
			buffered = buffered.slice(newline + 1);
			rawOutput.push(line);
			try {
				const parsed = JSON.parse(line);
				if (parsed && typeof parsed === "object") lines.push(parsed);
			} catch {
				// Astro's own startup banner is plain text.
			}
			newline = buffered.indexOf("\n");
		}
	}
}

async function waitFor<T>(find: () => T | undefined, what: string, ms = 5000) {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		const found = find();
		if (found !== undefined) return found;
		await Bun.sleep(10);
	}
	throw new Error(`Timed out waiting for ${what}\n${rawOutput.join("\n")}`);
}

const eventsFor = (id: string | null) =>
	lines.filter((l) => l["event"] === "http.request" && l["request.id"] === id);

/** Fetches from the app, reads the whole body, and returns the request's single wide event. */
async function request(path: string, init?: RequestInit) {
	const response = await fetch(`${appUrl}${path}`, {
		redirect: "manual",
		...init,
	});
	const body = new Uint8Array(await response.arrayBuffer());
	const id = response.headers.get("x-request-id");
	const event = await waitFor(() => eventsFor(id)[0], `event for ${path}`);
	await Bun.sleep(50);
	expect(eventsFor(id)).toHaveLength(1);
	return { response, body, text: new TextDecoder().decode(body), event };
}

const articlePath = (name: string, query = "") =>
	`/http://127.0.0.1:${fixture.port}/${name}${query}`;

beforeAll(async () => {
	const build = Bun.spawnSync(["bun", "run", "build"], { cwd: root });
	if (build.exitCode !== 0) {
		throw new Error(`Build failed:\n${build.stderr.toString()}`);
	}

	fixture = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: fixtureFetch });
	workDir = mkdtempSync(join(tmpdir(), "yazzy-e2e-"));

	app = Bun.spawn(["bun", "run", "dist/server/entry.mjs"], {
		cwd: root,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
		env: {
			PATH: process.env["PATH"] ?? "",
			HOME: process.env["HOME"] ?? "",
			NODE_ENV: "production",
			HOST: "127.0.0.1",
			PORT: "0",
			DB_PATH: join(workDir, "articles.sqlite3"),
			AI_API_KEY: SECRET_KEY,
			AI_ENDPOINT: `http://127.0.0.1:${fixture.port}/ai/v1`,
			LOG_FORMAT: "json",
			CLIP_ALLOW_PRIVATE_HOSTS: "127.0.0.1",
			CLIP_MAX_HTML_BYTES: "65536",
			CLIP_TIMEOUT_MS: "1000",
		},
	});
	collect(app.stdout);
	collect(app.stderr);

	appUrl = await waitFor(
		() => {
			for (const line of rawOutput) {
				const match = line.match(/Server listening on (http:\/\/[\d.]+:\d+)/);
				if (match?.[1]) return match[1];
			}
			return undefined;
		},
		"server to listen",
		15000,
	);
}, 120_000);

afterAll(() => {
	app?.kill();
	fixture?.stop(true);
	if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe("wide request events from the running app", () => {
	test("a first clip records the upstream work and phase timings", async () => {
		const { response, body, event } = await request(articlePath("fresh"));

		expect(response.status).toBe(200);
		expect(event).toMatchObject({
			level: "info",
			outcome: "ok",
			"service.name": "yazzy",
			"http.request.method": "GET",
			"http.route": "/[...url]",
			"http.response.status_code": 200,
			"http.response.body_bytes": body.byteLength,
			"url.path": articlePath("fresh"),
			"cache.hit": false,
			"clip.host": "127.0.0.1",
			"clip.content_type": "text/html",
			"clip.invalid_urls": 1,
		});
		for (const field of [
			"duration_ms",
			"memory.rss_mb",
			"clip.html_bytes",
			"clip.markdown_chars",
			"clip.fetch_ms",
			"clip.parse_ms",
			"clip.extract_ms",
			"clip.markdown_ms",
			"cache.lookup_ms",
			"cache.insert_ms",
		]) {
			expect(typeof event[field]).toBe("number");
		}
	});

	test("a repeat clip is a cache hit with no upstream work", async () => {
		await request(articlePath("repeat"));
		const { event } = await request(articlePath("repeat"));
		expect(event["cache.hit"]).toBe(true);
		expect(event["clip.fetch_ms"]).toBeUndefined();
		expect(event["cache.insert_ms"]).toBeUndefined();
	});

	test("an upstream 404 is a 502 with a described error", async () => {
		const { response, text, event } = await request(articlePath("missing"));
		expect(response.status).toBe(502);
		expect(text).toContain("404");
		expect(text).toContain(String(response.headers.get("x-request-id")));
		expect(event).toMatchObject({
			level: "error",
			outcome: "error",
			"http.response.status_code": 502,
			"error.type": "UpstreamHttpError",
			"clip.upstream_status": 404,
		});
		expect(typeof event["error.stack"]).toBe("string");
	});

	test("unsupported content is a 422 warning", async () => {
		const { response, text, event } = await request(
			articlePath("document.pdf"),
		);
		expect(response.status).toBe(422);
		expect(text).toContain("application/pdf");
		expect(event).toMatchObject({
			level: "warn",
			outcome: "error",
			"error.type": "UnsupportedContentTypeError",
			"clip.content_type": "application/pdf",
		});
	});

	test("an oversized page is a 422 warning with its size", async () => {
		const { response, event } = await request(articlePath("huge"));
		expect(response.status).toBe(422);
		expect(event).toMatchObject({
			level: "warn",
			"error.type": "ResponseTooLargeError",
			"clip.content_length": 140_000,
		});
	});

	test("a server that never responds is a 504 error", async () => {
		const { response, event } = await request(articlePath("slow"));
		expect(response.status).toBe(504);
		expect(event).toMatchObject({
			level: "error",
			"error.type": "UpstreamTimeoutError",
		});
		expect(event["clip.fetch_ms"]).toBeGreaterThanOrEqual(1000);
	});

	test("a private address is refused as a 422 warning", async () => {
		const { response, text, event } = await request("/http://10.0.0.1/admin");
		expect(response.status).toBe(422);
		expect(text).toContain("not a public address");
		expect(event).toMatchObject({
			level: "warn",
			outcome: "error",
			"error.type": "NonPublicUrlError",
		});
	});

	test("query strings never reach the logs", async () => {
		const marker = "sig=query-secret-value";
		const { event } = await request(articlePath("signed", `?${marker}`));
		expect(event["url.path"]).toBe(articlePath("signed"));
		expect(rawOutput.join("\n")).not.toContain("query-secret-value");
	});

	test("a well-formed incoming request id is kept", async () => {
		const { response, event } = await request("/", {
			headers: { "x-request-id": "edge-proxy-42" },
		});
		expect(response.headers.get("x-request-id")).toBe("edge-proxy-42");
		expect(event["http.route"]).toBe("/");
	});

	test("the AI summary island is its own request, and AI failures are logged", async () => {
		const page = await request(articlePath("island"));
		const islandPath = page.text.match(/\/_server-islands\/[^"'\s]+/)?.[0];
		expect(islandPath).toBeTruthy();
		const island = await request(String(islandPath).replaceAll("&amp;", "&"));
		expect(island.event["http.route"]).toBe("/_server-islands/[name]");
		expect(island.event["request.id"]).not.toBe(page.event["request.id"]);
		expect(island.response.status).toBe(200);
		expect(island.event).toMatchObject({
			level: "warn",
			outcome: "error",
			"ai.model_requested": expect.any(String),
		});
		expect(typeof island.event["error.type"]).toBe("string");
		expect(typeof island.event["ai.completion_ms"]).toBe("number");
	});

	test("startup is logged with the version, and secrets never are", async () => {
		const start = await waitFor(
			() => lines.find((l) => l["event"] === "service.start"),
			"service.start",
		);
		expect(typeof start["service.version"]).toBe("string");
		expect(typeof start["process.runtime.version"]).toBe("string");
		expect(rawOutput.join("\n")).not.toContain(SECRET_KEY);
	});
});
