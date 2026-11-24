import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { event, facet, log, withRequestEvent } from "./telemetry";

type Line = Record<string, unknown>;

let lines: Line[] = [];
let consoleSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
	lines = [];
	consoleSpy = spyOn(console, "log").mockImplementation((value: unknown) => {
		lines.push(JSON.parse(String(value)));
	});
});

afterEach(() => {
	consoleSpy.mockRestore();
});

const requestEvents = () => lines.filter((l) => l["event"] === "http.request");

function serve(
	handle: () => Promise<Response>,
	init: { url?: string; headers?: Record<string, string> } = {},
) {
	const request = new Request(init.url ?? "http://localhost/some/path", {
		headers: init.headers,
	});
	return withRequestEvent(request, { route: "/some/[path]" }, handle);
}

function slowBody(chunks: string[], delayMs: number) {
	const encoder = new TextEncoder();
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const chunk = chunks.shift();
			if (chunk === undefined) {
				await Bun.sleep(delayMs);
				controller.close();
				return;
			}
			controller.enqueue(encoder.encode(chunk));
		},
	});
}

class UpstreamBrokeError extends Error {
	override name = "UpstreamBrokeError";
}

describe("request events", () => {
	test("emits one event only after the body has been fully read", async () => {
		const response = await serve(
			async () => new Response(slowBody(["hello ", "world"], 30)),
		);
		expect(requestEvents()).toHaveLength(0);

		const body = await response.text();
		await Bun.sleep(0);

		const events = requestEvents();
		expect(events).toHaveLength(1);
		const [e] = events;
		expect(e).toMatchObject({
			level: "info",
			outcome: "ok",
			"service.name": "yazzy",
			"http.request.method": "GET",
			"http.route": "/some/[path]",
			"url.path": "/some/path",
			"http.response.status_code": 200,
			"http.response.body_bytes": new TextEncoder().encode(body).byteLength,
		});
		expect(e?.["duration_ms"]).toBeGreaterThanOrEqual(30);
		expect(typeof e?.["memory.rss_mb"]).toBe("number");
		expect(typeof e?.["ts"]).toBe("string");
	});

	test("request id is returned in the X-Request-Id header and logged", async () => {
		const response = await serve(async () => new Response("ok"));
		await response.text();
		const id = response.headers.get("x-request-id");
		expect(id).toBeTruthy();
		expect(requestEvents()[0]?.["request.id"]).toBe(id);
	});

	test("never logs query strings", async () => {
		const response = await serve(async () => new Response("ok"), {
			url: "http://localhost/https://example.com/post?token=secret",
		});
		await response.text();
		expect(requestEvents()[0]?.["url.path"]).toBe("/https://example.com/post");
		expect(JSON.stringify(lines)).not.toContain("secret");
	});

	test("emits immediately for responses without a body", async () => {
		await serve(async () => new Response(null, { status: 204 }));
		expect(requestEvents()).toHaveLength(1);
		expect(requestEvents()[0]?.["http.response.status_code"]).toBe(204);
	});

	test("a client disconnect still produces exactly one event", async () => {
		const response = await serve(
			async () => new Response(slowBody(["a", "b", "c"], 1000)),
		);
		const reader = response.body?.getReader();
		await reader?.read();
		await reader?.cancel();
		await Bun.sleep(0);
		expect(requestEvents()).toHaveLength(1);
		expect(requestEvents()[0]?.["outcome"]).toBe("aborted");
	});

	test("a nested request event passes through without a second event", async () => {
		const response = await serve(() =>
			withRequestEvent(
				new Request("http://localhost/inner"),
				{ route: "/inner" },
				async () => new Response("ok"),
			),
		);
		await response.text();
		expect(requestEvents()).toHaveLength(1);
		expect(requestEvents()[0]?.["http.route"]).toBe("/some/[path]");
	});
});

describe("request ids", () => {
	test("reuses a well-formed incoming x-request-id", async () => {
		const response = await serve(async () => new Response("ok"), {
			headers: { "x-request-id": "proxy-abc-123" },
		});
		await response.text();
		expect(response.headers.get("x-request-id")).toBe("proxy-abc-123");
		expect(requestEvents()[0]?.["request.id"]).toBe("proxy-abc-123");
	});

	test("replaces junk or overlong incoming ids", async () => {
		for (const junk of ["x".repeat(200), "has spaces", "<script>"]) {
			const response = await serve(async () => new Response("ok"), {
				headers: { "x-request-id": junk },
			});
			await response.text();
			expect(response.headers.get("x-request-id")).not.toBe(junk);
		}
	});

	test("uses the trace id from a W3C traceparent header", async () => {
		const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
		const response = await serve(async () => new Response("ok"), {
			headers: { traceparent: `00-${traceId}-00f067aa0ba902b7-01` },
		});
		await response.text();
		expect(requestEvents()[0]?.["request.id"]).toBe(traceId);
		expect(requestEvents()[0]?.["trace.id"]).toBe(traceId);
	});
});

describe("facets", () => {
	type WidgetFields = { color: string; size: number; shiny: boolean };
	const widget = facet<WidgetFields>("widget");

	test("namespaces fields and step timings under the facet name", async () => {
		const response = await serve(async () => {
			widget.set({ color: "red", size: 3 });
			widget.set({ shiny: true });
			const value = await widget.time("polish", async () => {
				await Bun.sleep(5);
				return 42;
			});
			expect(value).toBe(42);
			return new Response("ok");
		});
		await response.text();
		const e = requestEvents()[0];
		expect(e).toMatchObject({
			"widget.color": "red",
			"widget.size": 3,
			"widget.shiny": true,
		});
		expect(e?.["widget.polish_ms"]).toBeGreaterThanOrEqual(4);
	});

	test("repeated steps accumulate, and failed steps are still timed", async () => {
		const response = await serve(async () => {
			widget.time("paint", () => 1);
			widget.time("paint", () => 2);
			await widget
				.time("paint", async () => {
					await Bun.sleep(5);
					throw new Error("nope");
				})
				.catch(() => {});
			return new Response("ok");
		});
		await response.text();
		expect(requestEvents()[0]?.["widget.paint_ms"]).toBeGreaterThanOrEqual(4);
	});

	test("work done after the event was written is ignored", async () => {
		let later: () => void = () => {};
		const response = await serve(async () => {
			later = () => widget.set({ color: "late" });
			return new Response("ok");
		});
		await response.text();
		later();
		expect(requestEvents()).toHaveLength(1);
		expect(requestEvents()[0]?.["widget.color"]).toBeUndefined();
	});

	test("outside a request, facets and events do nothing", async () => {
		expect(() => widget.set({ color: "blue" })).not.toThrow();
		expect(await widget.time("polish", () => "still runs")).toBe("still runs");
		expect(() => event.error(new Error("x"))).not.toThrow();
		expect(event.id()).toBeUndefined();
		expect(lines).toHaveLength(0);
	});

	test("refuses facet names that would collide with built-in fields", () => {
		for (const reserved of ["http", "error", "memory", "request", "url"]) {
			expect(() => facet(reserved)).toThrow();
		}
	});
});

describe("errors", () => {
	test("a throwing handler still produces one event, then rethrows", async () => {
		const cause = new TypeError("connection refused");
		const failure = new UpstreamBrokeError("could not fetch", { cause });
		await expect(
			serve(async () => {
				throw failure;
			}),
		).rejects.toBe(failure);

		const events = requestEvents();
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			level: "error",
			outcome: "error",
			"http.response.status_code": 500,
			"error.type": "UpstreamBrokeError",
			"error.message": "could not fetch",
			"error.causes": [{ type: "TypeError", message: "connection refused" }],
		});
		expect(String(events[0]?.["error.stack"])).toContain("UpstreamBrokeError");
	});

	test("recorded errors on a 4xx response are warnings, on a 5xx are errors", async () => {
		for (const [status, level] of [
			[422, "warn"],
			[502, "error"],
		] as const) {
			lines = [];
			const response = await serve(async () => {
				event.error(new UpstreamBrokeError("bad"));
				return new Response("bad", { status });
			});
			await response.text();
			expect(requestEvents()[0]).toMatchObject({
				level,
				outcome: "error",
				"error.type": "UpstreamBrokeError",
			});
		}
	});

	test("non-Error throwables are still described", async () => {
		const response = await serve(async () => {
			event.error("plain string failure");
			return new Response("ok", { status: 500 });
		});
		await response.text();
		expect(requestEvents()[0]).toMatchObject({
			"error.type": "string",
			"error.message": "plain string failure",
		});
	});

	test("a broken log sink never fails the request", async () => {
		consoleSpy.mockImplementation(() => {
			throw new Error("stdout is gone");
		});
		const response = await serve(async () => new Response("still fine"));
		expect(await response.text()).toBe("still fine");
	});
});

describe("log lines", () => {
	test("carry the request id when written during a request", async () => {
		let id: string | undefined;
		const response = await serve(async () => {
			id = event.id();
			log.warn("cache miss storm", { count: 3 });
			return new Response("ok");
		});
		await response.text();
		const line = lines.find((l) => l["msg"] === "cache miss storm");
		expect(line).toMatchObject({
			level: "warn",
			event: "log",
			"request.id": id,
			count: 3,
		});
	});

	test("debug lines are dropped at the default level", () => {
		log.debug("noisy detail");
		log.info("useful detail");
		expect(lines.map((l) => l["msg"])).toEqual(["useful detail"]);
	});
});
