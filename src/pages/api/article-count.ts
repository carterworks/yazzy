import type { APIRoute } from "astro";
import { cache } from "../../services/cache";
import { enrichWithDatabase } from "../../services/wideLog";

export const GET: APIRoute = async ({ locals }) => {
	const wideEvent = locals.wideEvent;

	const dbStart = performance.now();
	const count = await cache.getArticleCount();
	const dbDuration = performance.now() - dbStart;

	enrichWithDatabase(wideEvent, "count", {
		durationMs: dbDuration,
		articleCount: count,
	});

	return new Response(count.toString(), {
		headers: {
			"Content-Type": "text/plain",
		},
	});
};
