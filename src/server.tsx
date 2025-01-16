import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { etag } from "hono/etag";
import { requestId } from "hono/request-id";
import { z } from "zod";
import AISummaryError from "./components/AISummaryError";
import RecentArticles from "./components/RecentArticles";
import { logger } from "./middleware/logger";
import ClippedUrlPage from "./pages/ClippedUrl";
import IndexPage from "./pages/Index";
import { cache } from "./services/cache";
import { clip } from "./services/clipper";
import db from "./services/db";
import log from "./services/log";
import { summarize } from "./services/summarizer";
import staticFiles from "./static/staticFiles";
import type { ReadablePage } from "./types";

const app = new Hono<{ Variables: { requestId: string } }>();

app.use("*", requestId());
app.use(async (c, next) => {
	const start = performance.now();
	await next();
	const end = performance.now();
	c.res.headers.set("X-Response-Time", `${end - start}`);
});
app.use(logger(log));
app.use("*", etag());
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
	"/api/summary",
	zValidator("query", z.object({ url: z.string().url() })),
	zValidator("cookie", z.object({ Authorization: z.string() }), (result, c) => {
		if (!result.success) {
			c.status(201);
			return c.html("");
		}
	}),
	async (c) => {
		const url = c.req.query("url");
		if (!url) {
			c.status(400);
			return c.html(
				<AISummaryError>Value '{url}' is not a valid URL</AISummaryError>,
			);
		}
		const authCookie = getCookie(c, "Authorization");
		if (!authCookie) {
			c.status(201);
			return c.text("");
		}
		try {
			const [model, apiKey] = (atob(authCookie) || "=").split("=");
			if (!model || !apiKey) {
				c.status(400);
				return c.html(
					<AISummaryError>Invalid Authorization cookie</AISummaryError>,
				);
			}
			const article: ReadablePage | undefined = cache.getArticle(url);
			if (!article) {
				c.status(404);
				return c.html(
					<AISummaryError>Article not found for URL {url}</AISummaryError>,
				);
			}

			article.summary = await summarize(article.textContent, model, apiKey);
			if (!article.summary) {
				// empty
				c.status(204);
				return c;
			}
			cache.addSummary(url, article.summary);
			return c.html(article.summary);
		} catch (err) {
			c.status(500);
			let apiErrorMsg: string;
			if (err instanceof Error) {
				apiErrorMsg = err.message;
			} else if (typeof err === "string") {
				apiErrorMsg = err;
			} else {
				apiErrorMsg = `Unknown error: ${err}`;
			}
			return c.html(<AISummaryError>{apiErrorMsg}</AISummaryError>);
		}
	},
);
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
app.get("/api/article-count", (c) => {
	const count = cache.getArticleCount();
	return c.text(count.toString());
});
app.get("/api/recent-articles", (c) => {
	const recentArticles = cache.getRecentArticles();
	return c.html(<RecentArticles articles={recentArticles} />);
});
app.get("/api/db-dump", (c) => {
	const dump = db.serialize();
	c.res.headers.set("Content-Type", "application/vnd.sqlite3");
	c.res.headers.set(
		"Content-Disposition",
		`attachment; filename=yazzy-dump-${new Date().toISOString()}.sqlite3`,
	);
	c.res.headers.set("Content-Length", dump.length.toString());
	return c.body(dump.buffer as unknown as ArrayBuffer);
});

export default app;
