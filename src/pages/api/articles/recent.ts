import type { APIRoute } from "astro";
import { cache } from "../../../services/cache";

export const prerender = false;
export const GET: APIRoute = () => {
	const recentArticles = cache.getRecentArticles().map((article) => ({
		url: article.url,
		title: article.title,
		summary: `${(article.summary
			? article.summary.replace(/<[^>]*>/g, "")
			: `${article.textContent.substring(0, 300)}`
		)
			.split(/\s+/)
			.slice(0, 20)
			.join(" ")}…`,
	}));

	const result = { articles: recentArticles };
	const response = new Response(JSON.stringify(result), {
		headers: {
			"Content-Type": "application/json",
		},
		status: 200,
	});
	return response;
};
