import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { etag } from "hono/etag";
import { requestId } from "hono/request-id";
import type { StatusCode } from "hono/utils/http-status";
import { z } from "zod";
import AISummary from "./components/AISummary";
import db from "./db/db";
import { logger } from "./middleware/logger";
import ClippedUrlPage from "./pages/ClippedUrl";
import ErrorPage from "./pages/ErrorPage";
import IndexPage from "./pages/Index";
import { cache } from "./services/cache";
import { clip } from "./services/clipper";
import log from "./services/log";
import { summarize } from "./services/summarizer";
import staticFiles from "./static/staticFiles";

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
app.get("/", async (c) => {
	const recentArticles = await cache.getRecentArticles();
	return c.html(<IndexPage recentArticles={recentArticles} />);
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
			return c.html(<AISummary url={""} error="URL parameter is required" />);
		}
		const article = await cache.getArticle(url);
		if (article?.summary) {
			return c.html(<AISummary url={url} summary={article.summary} />);
		}
		const authCookie = getCookie(c, "Authorization");
		if (!authCookie) {
			c.status(204);
			return c.text("");
		}
		try {
			const [model, apiKey] = (atob(authCookie) || "=").split("=");
			if (!model || !apiKey) {
				c.status(400);
				return c.html(
					<AISummary url={url} error="Invalid Authorization cookie" />,
				);
			}
			const article = await cache.getArticle(url);
			if (!article || !article.textContent) {
				c.status(404);
				return c.html(
					<AISummary url={url} error={`Article not found for URL ${url}`} />,
				);
			}

			article.summary = await summarize(article.textContent, model, apiKey);
			if (!article.summary) {
				// empty
				c.status(204);
				return c;
			}
			cache.addSummary(url, article.summary);
			return c.html(<AISummary url={url} summary={article.summary} />);
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
			return c.html(<AISummary url={url} error={apiErrorMsg} />);
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
		const searchParams = c.req.query();
		const url = new URL(c.req.param("url"));
		for (const [key, value] of Object.entries(searchParams)) {
			url.searchParams.append(key, value);
		}

		try {
			let article = await cache.getArticle(url.toString());
			if (!article) {
				article = await clip(url);
				await cache.insertArticle(article);
			}
			return c.html(<ClippedUrlPage article={article} />);
		} catch (err) {
			let message: string;
			if (err instanceof Error) {
				message = err.message;
			} else if (typeof err === "string") {
				message = err;
			} else {
				message = `Unknown error: ${err}`;
			}
			const requestId = c.var.requestId;
			message = `[requestId=${requestId}] ${message}`;
			log.error(message);
			// extract error code — space digit digit digit space
			const errorCode = message.match(/ \d{3} /);
			c.status(
				errorCode
					? (Number.parseInt(errorCode[0].trim(), 10) as StatusCode)
					: 500,
			);
			return c.html(<ErrorPage message={message} />);
		}
	},
);
app.get("/api/article-count", async (c) => {
	const count = await cache.getArticleCount();
	return c.text(count.toString());
});
app.get("/api/db-dump", (c) => {
	const dump = db.$client.serialize();
	c.res.headers.set("Content-Type", "application/vnd.sqlite3");
	c.res.headers.set(
		"Content-Disposition",
		`attachment; filename=yazzy-dump-${new Date().toISOString()}.sqlite3`,
	);
	c.res.headers.set("Content-Length", dump.length.toString());
	return c.body(dump.buffer as unknown as ArrayBuffer);
});

export default app;
