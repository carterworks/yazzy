import type { APIRoute } from "astro";
import { cache } from "../../../services/cache";

export const prerender = false;
export const GET: APIRoute = () => {
	const result = { count: cache.getArticleCount() };
	const response = new Response(JSON.stringify(result), {
		headers: {
			"Content-Type": "application/json",
		},
		status: 200,
	});
	return response;
};
