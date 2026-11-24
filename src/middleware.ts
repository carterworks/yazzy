import { defineMiddleware } from "astro:middleware";
import { version } from "../package.json" with { type: "json" };
import { withRequestEvent } from "./services/telemetry";

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await withRequestEvent(
		context.request,
		{ route: context.routePattern },
		next,
	);
	response.headers.set("X-Yazzy-Version", version);
	return response;
});
