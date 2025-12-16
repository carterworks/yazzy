import { defineMiddleware } from "astro:middleware";
import { nanoid } from "nanoid";
import { version } from "../package.json" with { type: "json" };
import log from "./services/log";

function getPath(request: Request): string {
	const url = request.url;
	const start = url.indexOf("/", 8);
	let i = start;
	for (; i < url.length; i++) {
		const charCode = url.charCodeAt(i);
		if (charCode === 37) {
			// '%'
			const queryIndex = url.indexOf("?", i);
			const path = url.slice(start, queryIndex === -1 ? undefined : queryIndex);
			return decodeURI(path);
		}
		if (charCode === 63) {
			// '?'
			break;
		}
	}
	return url.slice(start, i);
}

export const onRequest = defineMiddleware(async (context, next) => {
	const requestId = nanoid(8);
	const start = performance.now();
	const path = getPath(context.request);

	log(`<-- ${requestId} ${context.request.method} ${path}`);

	// Store requestId in locals for use in pages
	context.locals.requestId = requestId;

	const response = await next();

	const elapsed = (performance.now() - start).toFixed(2);
	log(`--> ${requestId} ${context.request.method} ${path} ${response.status} ${elapsed}ms`);

	response.headers.set("X-Request-Id", requestId);
	response.headers.set("X-Response-Time", `${elapsed}ms`);
	response.headers.set("X-Yazzy-Version", version);

	return response;
});

