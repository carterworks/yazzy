import type { APIRoute } from "astro";
import { cache } from "../../services/cache";

export const GET: APIRoute = async () => {
	const count = await cache.getArticleCount();
	return new Response(count.toString(), {
		headers: {
			"Content-Type": "text/plain",
		},
	});
};
