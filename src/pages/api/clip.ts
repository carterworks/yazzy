import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url).searchParams.get("url");
	if (!url) {
		return new Response(`Value '${url}' is not a valid URL`, { status: 400 });
	}
	return Response.redirect(new URL(`/${url}`));
};
