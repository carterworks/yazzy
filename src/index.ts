import { Database } from "bun:sqlite";
import zlib from "node:zlib";
import { html, isHtml } from "@elysiajs/html";
import { $ } from "bun";
import { Elysia, t } from "elysia";
import { clip } from "./clip";
import ClippedPage from "./pages/ClippedPage";
import LandingPage from "./pages/LandingPage";
import type { ReadablePage } from "./types";
const port = process.env.PORT || 3000;

function isUrl(potentialUrl: string): boolean {
	try {
		new URL(potentialUrl);
		return true;
	} catch {
		return false;
	}
}

function isCompressable(
	response: unknown,
): response is string | Uint8Array | ArrayBuffer {
	return (
		typeof response === "string" ||
		response instanceof Uint8Array ||
		response instanceof ArrayBuffer
	);
}

if (process.env.NODE_ENV === "production") {
	await $`bun x tailwindcss -i ./src/pages/global.input.css -o ./src/pages/global.css --minify`.quiet();
} else {
	await $`bun x tailwindcss -i ./src/pages/global.input.css -o ./src/pages/global.css`.quiet();
}

class Logger {
	#addStructuredData(
		message: string,
		data: Record<string, string | number | boolean>,
	): string {
		const dataMessage = Object.entries(data)
			.map(([key, value]) => `[${key}=${value}]`)
			.join(" ");
		if (!dataMessage) {
			return message;
		}
		return `${dataMessage} ${message}`;
	}

	#addTimestamp(message: string): string {
		return this.#addStructuredData(message, {
			t: performance.timeOrigin + performance.now(),
		});
	}

	log(
		message: string,
		params?: Record<string, string | number | boolean>,
	): void {
		let msg = message;
		if (params) {
			msg = this.#addStructuredData(message, params);
		}
		msg = this.#addTimestamp(msg);
		console.log(msg);
	}

	error(
		message: string,
		params: Record<string, string | number | boolean>,
	): void {
		let msg = message;
		if (params) {
			msg = this.#addStructuredData(message, params);
		}
		msg = this.#addTimestamp(msg);
		console.error(msg);
	}
}

const logger = new Logger();
function initializeSqliteDB(location: string): Database {
	const db = new Database(location, { create: true, strict: true });
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec(`
		CREATE TABLE IF NOT EXISTS articles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			url TEXT NOT NULL,
			title TEXT NOT NULL,
			published INTEGER,
			author TEXT NOT NULL,
			topics TEXT,
			tags TEXT,
			textContent TEXT NOT NULL,
			htmlContent TEXT NOT NULL,
			markdownContent TEXT NOT NULL,
			createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
		);
	`);
	const articleCountQuery = db.query<{ "COUNT(*)": number }, null>(
		"SELECT COUNT(*) FROM articles",
	);
	const articleCount = articleCountQuery.get(null);
	logger.log(
		`Initialized database ${dbLocation}; has ${articleCount?.["COUNT(*)"] ?? 0} article(s)`,
	);
	articleCountQuery.finalize();
	return db;
}

const dbLocation = process.env.DB_LOCATION || "./articles.sqlite3";
const db = initializeSqliteDB(dbLocation);
const existingArticleQuery = db.query("SELECT * FROM articles WHERE url = ?1");
const insertArticleQuery = db.query<
	undefined,
	Record<keyof ReadablePage, string | number | null>
>(
	`INSERT INTO articles 
		(
			url,
			title,
			published,
			author,
			topics,
			tags,
			textContent,
			htmlContent,
			markdownContent
		) VALUES (
			$url,
			$title,
			$published,
			$author,
			$topics,
			$tags,
			$textContent,
			$htmlContent,
			$markdownContent
		)`,
);

const elysia = new Elysia()
	.use(html())
	.decorate("logger", logger)
	.derive(() => {
		return {
			requestId: crypto.randomUUID(),
		};
	})
	.onAfterHandle(({ response, set, headers, path }) => {
		console.log("AFTER HANDLE: ", headers);
		if (isHtml(response) && !path.includes(".svg")) {
			set.headers["Content-Type"] = "text/html; charset=utf8";
		}
		if (!isCompressable(response)) {
			return response;
		}
		const acceptEncoding = new Set(
			headers["accept-encoding"]?.split(",").map((x) => x.trim()),
		);
		if (acceptEncoding.has("br")) {
			set.headers["Content-Encoding"] = "br";
			return zlib.brotliCompressSync(response);
		}
		if (acceptEncoding.has("gzip")) {
			set.headers["Content-Encoding"] = "gzip";
			return Bun.gzipSync(response);
		}
		if (acceptEncoding.has("deflate")) {
			set.headers["Content-Encoding"] = "deflate";
			return Bun.deflateSync(response);
		}
	})
	.onBeforeHandle(({ request: { method, url }, requestId, logger }) => {
		logger.log("Received", { method, url, requestId });
	})
	.onAfterHandle(({ response, requestId, logger }) => {
		logger.log("Responded", { requestId });
		return response;
	})
	.get(
		"/",
		({ query, redirect }) => {
			if (query.url && isUrl(query.url)) {
				const url = new URL(query.url);
				return redirect(`/${url.toString()}`);
			}
			return LandingPage();
		},
		{ query: t.Object({ url: t.Optional(t.String()) }) },
	)
	.get("/global.css", () => Bun.file("./src/pages/global.css").arrayBuffer())
	.get("/manifest.json", ({ set }) => {
		set.headers["Content-Type"] = "application/json";
		return JSON.stringify({
			name: "yazzy",
			short_name: "yazzy",
			start_url: ".",
			display: "standalone",
			id: "/",
			description: "Plain ol' reading",
			share_target: {
				action: "/",
				method: "GET",
				params: { url: "url" },
				enctype: "application/x-www-form-urlencoded",
			},
			icons: [
				{
					sizes: "any",
					src: "/icon.svg",
					type: "image/svg+xml",
				},
			],
		});
	})
	.get("/icon.svg", ({ set }) => {
		set.headers["Content-Type"] = "image/svg+xml";
		return `<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" ><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="-10 0 2610 2048"><path fill="currentColor"
d="M526 304q0 -83 50 -139t123 -56q55 0 100.5 31.5t73 83.5t27.5 115q0 82 -49 138t-120 56q-85 0 -145 -67t-60 -162zM599 304q0 64 38.5 109.5t93.5 45.5q40 0 68 -34.5t28 -85.5q0 -63 -38.5 -109.5t-89.5 -46.5q-42 0 -71 34.5t-29 86.5zM1369 870q0 -28 -20 -48
t-50 -20q-28 0 -48 19.5t-20 48.5q0 28 19.5 48.5t49.5 20.5q28 0 48.5 -20t20.5 -49zM758 666q90 0 147.5 8t93.5 28l96 -180q-72 -71 -72 -164q0 -107 -43.5 -193t-118 -136.5t-168.5 -50.5q-85 0 -151.5 40.5t-104 112.5t-37.5 167q0 98 50 182t132 135t176 51zM758 746
q-117 0 -216.5 -62t-160.5 -164t-61 -222q0 -117 48 -207t132.5 -141.5t192.5 -51.5q116 0 208.5 61.5t147 165.5t54.5 233q0 42 21.5 73t72.5 73l-184 342q-43 -64 -97.5 -82t-157.5 -18zM970 779l68 -43l719 1143q43 -21 43 -65q0 -23 -10 -56.5t-31 -87.5l-334 -873
l-281 -232l53 -61l296 245l340 891q21 55 32 99t11 79q0 59 -35 97t-115 63zM1842 666q95 0 176.5 -51t131.5 -135t50 -182q0 -95 -37.5 -167t-103.5 -112.5t-152 -40.5q-93 0 -168 50.5t-118.5 136.5t-43.5 193q0 93 -72 164l96 180q36 -20 93.5 -28t147.5 -8zM1842 746
q-103 0 -157.5 18t-97.5 82l-184 -342q51 -42 72.5 -73t21.5 -73q0 -129 54.5 -233t147.5 -165.5t208 -61.5q109 0 193 51.5t132 141.5t48 207q0 120 -60.5 222t-160.5 164t-217 62zM1328 1257l-454 721q-80 -25 -115 -63t-35 -97q0 -35 11 -79t32 -99l304 -796l53 84
l-283 742q-21 54 -31 87.5t-10 56.5q0 44 43 65l437 -697zM1264 618l139 -114l55 59l-129 106zM1485 858l77 -120l67 43l-109 169zM2074 304q0 95 -59.5 162t-145.5 67q-71 0 -120 -56t-49 -138q0 -63 27.5 -115t73.5 -83.5t100 -31.5q73 0 123 56t50 139zM2001 304
q0 -52 -29 -86.5t-71 -34.5q-51 0 -89.5 46.5t-38.5 109.5q0 51 28 85.5t68 34.5q55 0 93.5 -45.5t38.5 -109.5z" /></svg>
`;
	})
	.get("/*", async ({ path, error, logger, requestId }) => {
		const pathWithoutSlash = path.startsWith("/") ? path.slice(1) : path;
		if (!isUrl(pathWithoutSlash)) {
			return error(400, "Invalid URL");
		}
		try {
			const articleURL = new URL(pathWithoutSlash);
			const existingArticle = (await existingArticleQuery.get(
				articleURL.toString(),
			)) as Record<keyof ReadablePage, string> | undefined;
			if (existingArticle) {
				logger.log("Served from cache", {
					requestId,
					articleURL: articleURL.toString(),
				});
				return ClippedPage({
					article: {
						...existingArticle,
						published: existingArticle.published
							? new Date(existingArticle.published)
							: undefined,
						url: existingArticle.url,
						topics: existingArticle.topics.split(","),
						tags: existingArticle.tags.split(","),
						createdAt: new Date(existingArticle.createdAt),
					},
				});
			}
			logger.log("Not found in cache", {
				requestId,
				articleURL: articleURL.toString(),
			});
			const article = await clip(articleURL);
			logger.log("Clipped from website", {
				requestId,
				articleURL: articleURL.toString(),
				htmlLength: article.htmlContent.length,
			});
			// insert into database
			// insertArticleQuery.run({
			// 	...article,
			// 	url: article.url.toString(),
			// 	published: article.published?.getTime() || null,
			// 	createdAt: Date.now(),
			// 	topics: article.topics.join(","),
			// 	tags: article.tags.join(","),
			// });

			// logger.log("Inserted into database", {
			// 	requestId,
			// 	articleURL: articleURL.toString(),
			// });
			return ClippedPage({ article });
		} catch (err) {
			console.error(err);
			return error(
				500,
				`Internal server error; could not clip '${pathWithoutSlash}'`,
			);
		}
	})
	.listen(port);

logger.log(`Started server on port ${port}`);
