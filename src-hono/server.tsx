import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { z } from "zod";
import ClippedUrlPage from "./pages/ClippedUrl";
import IndexPage from "./pages/Index";
import { cache } from "./services/cache";
import { clip } from "./services/clipper";
import log from "./services/log";
import staticFiles from "./static/staticFiles";
import type { ReadablePage } from "./types";

const app = new Hono<{ Variables: { requestId: string } }>();

app.use(async (c, next) => {
	const requestId = crypto.randomUUID();
	c.set("requestId", requestId);
	await next();
	c.res.headers.set("X-Request-Id", requestId);
});
app.use(async (c, next) => {
	const start = performance.now();
	await next();
	const end = performance.now();
	c.res.headers.set("X-Response-Time", `${end - start}`);
});
app.use(logger(log));
app.route("/", staticFiles);
app.get("/", (c) => {
	return c.html(<IndexPage />);
});
app.get("/api/clip", (c) => {
	const url = c.req.query("url");
	if (!url) {
		c.status(400);
		return c.text(`Value '${url} is not a valid URL'`);
	}
	return c.redirect(`/${url}`);
});
app.get(
	"/:url{https?://.*}",
	zValidator(
		"param",
		z.object({
			url: z.string().url(),
		}),
	),
	async (c) => {
		const url = c.req.param("url");
		let article: ReadablePage | undefined = cache.getArticle(url);
		if (!article) {
			article = await clip(new URL(url));
			cache.insertArticle(article);
		}
		return c.html(<ClippedUrlPage article={article} />);
	},
);

export default app;
