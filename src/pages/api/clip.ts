import type { APIRoute } from "astro";
import { isUrl } from "../../utils";
export const prerender = false;
export const GET: APIRoute = ({ url }) => {
	const urlToClip = url.searchParams.get("url");
	if (!urlToClip || !isUrl(urlToClip)) {
		// bad url
		return new Response(`Value '${urlToClip} is not a valid URL'`, {
			status: 400,
		});
	}
	return new Response(null, {
		status: 303,
		headers: {
			Location: `/${urlToClip}`,
		},
	});
};
