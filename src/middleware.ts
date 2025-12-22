import { defineMiddleware } from "astro:middleware";
import { nanoid } from "nanoid";
import { version } from "../package.json" with { type: "json" };
import {
	createWideEvent,
	enrichWithError,
	finalizeAndEmit,
} from "./services/wideLog";

export const onRequest = defineMiddleware(async (context, next) => {
	const requestId = nanoid(8);
	const start = performance.now();

	// Create the wide event with initial request context
	const wideEvent = createWideEvent(requestId, context.request);

	// Store in locals for use in pages/handlers
	context.locals.requestId = requestId;
	context.locals.wideEvent = wideEvent;

	let response: Response;
	try {
		response = await next();
	} catch (error) {
		// Enrich with error context
		enrichWithError(wideEvent, error);

		// Create error response
		response = new Response("Internal Server Error", { status: 500 });

		// Finalize and emit the wide event
		finalizeAndEmit(wideEvent, response, start);

		throw error;
	}

	// Add response headers
	response.headers.set("X-Request-Id", requestId);
	response.headers.set(
		"X-Response-Time",
		`${(performance.now() - start).toFixed(2)}ms`,
	);
	response.headers.set("X-Yazzy-Version", version);

	// Finalize and emit the wide event
	finalizeAndEmit(wideEvent, response, start);

	return response;
});
