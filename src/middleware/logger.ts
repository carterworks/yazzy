/**
 * Hono's logger middleware, modified to add request IDs
 * https://github.com/honojs/hono/blob/main/src/middleware/logger/index.ts
 *
 * MIT License
 *
 * Copyright (c) 2021 - present, Yusuke Wada and Hono contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { MiddlewareHandler } from "hono";

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * @see {@link https://no-color.org/}
 *
 * @returns {boolean}
 */
export function getColorEnabled(): boolean {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { process, Deno } = globalThis as {
		process?: { env: { NO_COLOR?: unknown } };
		Deno?: { noColor?: boolean };
	};

	const isNoColor =
		typeof Deno?.noColor === "boolean"
			? (Deno.noColor as boolean)
			: process !== undefined
				? "NO_COLOR" in (process?.env ?? {})
				: false;

	return !isNoColor;
}

type Decoder = (str: string) => string;
const tryDecode = (str: string, decoder: Decoder): string => {
	try {
		return decoder(str);
	} catch {
		return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
			try {
				return decoder(match);
			} catch {
				return match;
			}
		});
	}
};
/**
 * Try to apply decodeURI() to given string.
 * If it fails, skip invalid percent encoding or invalid UTF-8 sequences, and apply decodeURI() to the rest as much as possible.
 * @param str The string to decode.
 * @returns The decoded string that sometimes contains undecodable percent encoding.
 * @example
 * tryDecodeURI('Hello%20World') // 'Hello World'
 * tryDecodeURI('Hello%20World/%A4%A2') // 'Hello World/%A4%A2'
 */
const tryDecodeURI = (str: string) => tryDecode(str, decodeURI);

const getPath = (request: Request): string => {
	const url = request.url;
	const start = url.indexOf("/", 8);
	let i = start;
	for (; i < url.length; i++) {
		const charCode = url.charCodeAt(i);
		if (charCode === 37) {
			// '%'
			// If the path contains percent encoding, use `indexOf()` to find '?' and return the result immediately.
			// Although this is a performance disadvantage, it is acceptable since we prefer cases that do not include percent encoding.
			const queryIndex = url.indexOf("?", i);
			const path = url.slice(start, queryIndex === -1 ? undefined : queryIndex);
			return tryDecodeURI(
				path.includes("%25") ? path.replace(/%25/g, "%2525") : path,
			);
		}
		if (charCode === 63) {
			// '?'
			break;
		}
	}
	return url.slice(start, i);
};

enum LogPrefix {
	Outgoing = "-->",
	Incoming = "<--",
	Error = "xxx",
}

const humanize = (times: string[]) => {
	const [delimiter, separator] = [",", "."];

	const orderTimes = times.map((v) =>
		v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${delimiter}`),
	);

	return orderTimes.join(separator);
};

const time = (start: number) => {
	const delta = Date.now() - start;
	return humanize([
		delta < 1000 ? `${delta}ms` : `${Math.round(delta / 1000)}s`,
	]);
};

const colorStatus = (status: number) => {
	const colorEnabled = getColorEnabled();
	if (colorEnabled) {
		switch ((status / 100) | 0) {
			case 5: // red = error
				return `\x1b[31m${status}\x1b[0m`;
			case 4: // yellow = warning
				return `\x1b[33m${status}\x1b[0m`;
			case 3: // cyan = redirect
				return `\x1b[36m${status}\x1b[0m`;
			case 2: // green = success
				return `\x1b[32m${status}\x1b[0m`;
		}
	}
	// Fallback to unsupported status code.
	// E.g.) Bun and Deno supports new Response with 101, but Node.js does not.
	// And those may evolve to accept more status.
	return `${status}`;
};

type PrintFunc = (str: string, ...rest: string[]) => void;

function log(
	fn: PrintFunc,
	prefix: string,
	requestId: string,
	method: string,
	path: string,
	status = 0,
	elapsed?: string,
) {
	const out =
		prefix === LogPrefix.Incoming
			? `${prefix} ${requestId} ${method} ${path}`
			: `${prefix} ${requestId} ${method} ${path} ${colorStatus(status)} ${elapsed}`;
	fn(out);
}

/**
 * Logger Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/logger}
 *
 * @param {PrintFunc} [fn=console.log] - Optional function for customized logging behavior.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(logger())
 * app.get('/', (c) => c.text('Hello Hono!'))
 * ```
 */
export const logger = (fn: PrintFunc = console.log): MiddlewareHandler => {
	return async function logger(c, next) {
		const { method } = c.req;
		const requestId = c.get("requestId");

		const path = getPath(c.req.raw);

		log(fn, LogPrefix.Incoming, requestId, method, path);

		const start = Date.now();

		await next();

		log(
			fn,
			LogPrefix.Outgoing,
			requestId,
			method,
			path,
			c.res.status,
			time(start),
		);
	};
};
