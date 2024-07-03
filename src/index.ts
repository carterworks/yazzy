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
	console.log(
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
	.derive(() => {
		return {
			requestId: crypto.randomUUID(),
		};
	})
	.onAfterHandle(({ response, set, headers, path }) => {
		if (isHtml(response)) {
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
			description: "Plain ol' reading",
			share_target: {
				action: "/",
				method: "GET",
				params: { url: "url" },
			},
		});
	})
	.get("/*", async ({ path, error }) => {
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
			const article = await clip(articleURL);
			// insert into database
			insertArticleQuery.run({
				...article,
				url: article.url.toString(),
				published: article.published?.getTime() || null,
				createdAt: Date.now(),
				topics: article.topics.join(","),
				tags: article.tags.join(","),
			});
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

console.log(`Started server on port ${port}`);
