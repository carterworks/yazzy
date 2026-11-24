import { AsyncLocalStorage } from "node:async_hooks";
import pkg from "../../package.json" with { type: "json" };

type Scalar = string | number | boolean;
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type Outcome = "ok" | "error" | "aborted";
type Fields = Record<string, unknown>;

export interface Facet<F> {
	/** Adds fields to the current request's event as `<facet>.<key>`. */
	set(fields: Partial<F>): void;
	/** Runs `fn` and adds its duration to `<facet>.<step>_ms`, even when it throws. */
	time<T>(step: string, fn: () => T | Promise<T>): Promise<T>;
}

interface RequestState {
	readonly id: string;
	readonly fields: Map<string, unknown>;
	error?: unknown;
	done: boolean;
}

const LEVELS: Record<Level, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
	fatal: 50,
};

const RESERVED_NAMESPACES = new Set([
	"ts",
	"level",
	"event",
	"msg",
	"outcome",
	"service",
	"request",
	"trace",
	"http",
	"url",
	"user_agent",
	"error",
	"memory",
	"process",
	"log",
]);

const storage = new AsyncLocalStorage<RequestState>();
const encoder = new TextEncoder();

function env(name: string): string | undefined {
	return globalThis.process?.env?.[name];
}

function configuredLevel(): Level {
	const level = env("LOG_LEVEL")?.toLowerCase();
	return level && level in LEVELS ? (level as Level) : "info";
}

function prettyOutput(): boolean {
	const format = env("LOG_FORMAT");
	if (format) return format === "pretty";
	return env("NODE_ENV") === "development";
}

function round(ms: number): number {
	return Math.round(ms * 100) / 100;
}

function rssBytes(): number | undefined {
	try {
		return globalThis.process?.memoryUsage?.rss();
	} catch {
		return undefined;
	}
}

const toMb = (bytes: number) => Math.round(bytes / 1048576);

function active(): RequestState | undefined {
	const state = storage.getStore();
	return state && !state.done ? state : undefined;
}

// ---------- output ----------

function formatPretty(record: Fields): string {
	const time = String(record["ts"]).slice(11, 23);
	const level = String(record["level"]).toUpperCase().padEnd(5);
	const skip = new Set(["ts", "level", "event", "msg", "error.stack"]);
	let headline: string;
	if (record["event"] === "http.request") {
		headline = `${record["http.request.method"]} ${record["url.path"]} ${record["http.response.status_code"]} ${record["duration_ms"]}ms`;
		for (const key of [
			"http.request.method",
			"url.path",
			"http.response.status_code",
			"duration_ms",
			"service.name",
			"service.version",
		]) {
			skip.add(key);
		}
	} else {
		headline = String(record["msg"] ?? record["event"]);
	}
	const rest = Object.entries(record)
		.filter(([key, value]) => !skip.has(key) && value !== undefined)
		.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
		.join(" ");
	const stack = record["error.stack"] ? `\n${record["error.stack"]}` : "";
	return `${time} ${level} ${headline}${rest ? `  ${rest}` : ""}${stack}`;
}

function write(level: Level, record: Fields): void {
	if (LEVELS[level] < LEVELS[configuredLevel()]) return;
	try {
		console.log(prettyOutput() ? formatPretty(record) : JSON.stringify(record));
	} catch {
		// Logging must never take the request down with it.
	}
}

// ---------- errors ----------

function describeError(err: unknown): Fields {
	if (!(err instanceof Error)) {
		return {
			"error.type": err === null ? "null" : typeof err,
			"error.message": String(err),
		};
	}
	const described: Fields = {
		"error.type": err.name || err.constructor.name,
		"error.message": err.message,
	};
	if (err.stack) described["error.stack"] = err.stack;
	const causes: { type: string; message: string }[] = [];
	let cause: unknown = err.cause;
	while (cause !== undefined && causes.length < 5) {
		causes.push(
			cause instanceof Error
				? { type: cause.name, message: cause.message }
				: { type: typeof cause, message: String(cause) },
		);
		cause = cause instanceof Error ? cause.cause : undefined;
	}
	if (causes.length) described["error.causes"] = causes;
	return described;
}

function recordError(state: RequestState, err: unknown): void {
	state.error ??= err;
}

// ---------- process-level events ----------

let started = false;

function ensureStarted(): void {
	if (started) return;
	started = true;
	write("info", {
		ts: new Date().toISOString(),
		level: "info",
		event: "service.start",
		"service.name": pkg.name,
		"service.version": pkg.version,
		"process.runtime.name": globalThis.process?.versions?.bun ? "bun" : "node",
		"process.runtime.version":
			globalThis.process?.versions?.bun ?? globalThis.process?.version,
		"process.pid": globalThis.process?.pid,
		"log.level": configuredLevel(),
	});

	const proc = globalThis.process;
	if (typeof proc?.on !== "function") return;

	// The monitor variant observes without replacing the default crash behaviour.
	proc.on("uncaughtExceptionMonitor", (err) => {
		processEvent("fatal", "process.uncaught_exception", err);
	});
	// The Node adapter already keeps the process alive on unhandled rejections,
	// so listening here doesn't change behaviour; it just ties them to a request.
	proc.on("unhandledRejection", (reason) => {
		const state = active();
		if (state) recordError(state, reason);
		processEvent("error", "process.unhandled_rejection", reason);
	});

	const interval = Number(env("LOG_MEMORY_INTERVAL_MS") ?? 60_000);
	if (interval > 0 && typeof proc.memoryUsage === "function") {
		const timer = setInterval(() => {
			const usage = proc.memoryUsage();
			write("info", {
				ts: new Date().toISOString(),
				level: "info",
				event: "runtime.memory",
				"memory.rss_mb": toMb(usage.rss),
				"memory.heap_used_mb": toMb(usage.heapUsed),
				"memory.heap_total_mb": toMb(usage.heapTotal),
				"memory.external_mb": toMb(usage.external),
			});
		}, interval);
		timer.unref?.();
	}
}

function processEvent(level: Level, name: string, err: unknown): void {
	write(level, {
		ts: new Date().toISOString(),
		level,
		event: name,
		"request.id": storage.getStore()?.id,
		...describeError(err),
	});
}

// ---------- request ids ----------

const REQUEST_ID = /^[A-Za-z0-9._:-]{1,64}$/;
const TRACEPARENT = /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/;

function requestIds(headers: Headers): { id: string; traceId?: string } {
	const traceId = headers.get("traceparent")?.trim().match(TRACEPARENT)?.[1];
	const validTraceId = traceId && !/^0+$/.test(traceId) ? traceId : undefined;
	const incoming = headers.get("x-request-id")?.trim();
	if (incoming && REQUEST_ID.test(incoming)) {
		return { id: incoming, traceId: validTraceId };
	}
	if (validTraceId) return { id: validTraceId, traceId: validTraceId };
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return {
		id: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
	};
}

// ---------- public interface ----------

/**
 * A domain's own section of the request event. Fields are written as
 * `<name>.<key>`, so the domain owns its schema and telemetry stays ignorant of it.
 */
export function facet<F extends { [K in keyof F]: Scalar }>(
	name: string,
): Facet<F> {
	if (!/^[a-z][a-z0-9_]*$/.test(name) || RESERVED_NAMESPACES.has(name)) {
		throw new Error(`Invalid or reserved telemetry facet name "${name}"`);
	}
	return {
		set(fields) {
			const state = active();
			if (!state) return;
			for (const [key, value] of Object.entries(fields)) {
				if (value !== undefined) state.fields.set(`${name}.${key}`, value);
			}
		},
		async time(step, fn) {
			const state = active();
			const start = performance.now();
			try {
				return await fn();
			} finally {
				if (state && !state.done) {
					const key = `${name}.${step}_ms`;
					const previous = Number(state.fields.get(key) ?? 0);
					state.fields.set(key, round(previous + performance.now() - start));
				}
			}
		},
	};
}

export const event = {
	/** Marks the current request as failed. The first error recorded wins. */
	error(err: unknown): void {
		const state = active();
		if (state) recordError(state, err);
	},
	id(): string | undefined {
		return active()?.id;
	},
};

function logAt(level: Exclude<Level, "fatal">) {
	return (msg: string, fields: Record<string, Scalar> = {}) => {
		ensureStarted();
		const extra = Object.fromEntries(
			Object.entries(fields).filter(
				([key]) => !["ts", "level", "event", "msg", "request.id"].includes(key),
			),
		);
		write(level, {
			ts: new Date().toISOString(),
			level,
			event: "log",
			msg,
			"request.id": storage.getStore()?.id,
			...extra,
		});
	};
}

/** Standalone lines for things that aren't part of a single request. */
export const log = {
	debug: logAt("debug"),
	info: logAt("info"),
	warn: logAt("warn"),
	error: logAt("error"),
};

/**
 * Runs one request inside its own wide event and writes that event exactly
 * once: after the response body has streamed, failed, or been abandoned.
 */
export async function withRequestEvent(
	request: Request,
	meta: { route: string },
	handle: () => Promise<Response>,
): Promise<Response> {
	if (storage.getStore()) return handle();
	ensureStarted();

	const start = performance.now();
	const rssStart = rssBytes();
	const { id, traceId } = requestIds(request.headers);
	const url = new URL(request.url);
	const userAgent = request.headers.get("user-agent");
	const state: RequestState = { id, fields: new Map(), done: false };

	const head: Fields = {
		"request.id": id,
		"trace.id": traceId,
		"http.request.method": request.method,
		"http.route": meta.route,
		"url.path": url.pathname,
		"user_agent.original": userAgent ? userAgent.slice(0, 256) : undefined,
	};

	const finish = (status: number, bodyBytes: number, aborted = false): void => {
		if (state.done) return;
		state.done = true;
		try {
			const outcome: Outcome = aborted
				? "aborted"
				: state.error !== undefined || status >= 500
					? "error"
					: "ok";
			const level: Level =
				status >= 500 ? "error" : state.error !== undefined ? "warn" : "info";
			const rssEnd = rssBytes();
			write(level, {
				ts: new Date().toISOString(),
				level,
				event: "http.request",
				"service.name": pkg.name,
				"service.version": pkg.version,
				...head,
				"http.response.status_code": status,
				"http.response.body_bytes": bodyBytes,
				duration_ms: round(performance.now() - start),
				outcome,
				...Object.fromEntries(state.fields),
				"memory.rss_mb": rssEnd === undefined ? undefined : toMb(rssEnd),
				"memory.rss_delta_mb":
					rssEnd === undefined || rssStart === undefined
						? undefined
						: toMb(rssEnd - rssStart),
				...(state.error === undefined ? {} : describeError(state.error)),
			});
		} catch {
			// See write(): never fail the request over its own telemetry.
		}
	};

	let response: Response;
	try {
		response = await storage.run(state, handle);
	} catch (err) {
		recordError(state, err);
		finish(500, 0);
		throw err;
	}

	const headers = new Headers(response.headers);
	headers.set("X-Request-Id", id);
	headers.set("X-Response-Time", `${round(performance.now() - start)}ms`);

	if (!response.body) {
		finish(response.status, 0);
		return rebuild(response, null, headers);
	}

	const reader = response.body.getReader();
	let bytes = 0;
	const body = new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const { done, value } = await reader.read();
				if (done) {
					controller.close();
					finish(response.status, bytes);
					return;
				}
				bytes +=
					typeof value === "string"
						? encoder.encode(value).byteLength
						: (value?.byteLength ?? 0);
				controller.enqueue(value);
			} catch (err) {
				recordError(state, err);
				finish(response.status, bytes);
				controller.error(err);
			}
		},
		async cancel(reason) {
			finish(response.status, bytes, true);
			await reader.cancel(reason);
		},
	});
	return rebuild(response, body, headers);
}

function rebuild(
	original: Response,
	body: ReadableStream<Uint8Array> | null,
	headers: Headers,
): Response {
	const response = new Response(body, {
		status: original.status,
		statusText: original.statusText,
		headers,
	});
	// Astro attaches cookies and other state to the Response via symbols.
	for (const symbol of Object.getOwnPropertySymbols(original)) {
		Reflect.set(response, symbol, Reflect.get(original, symbol));
	}
	return response;
}
