import { Database } from "bun:sqlite";
import zlib from "node:zlib";
import { html, isHtml } from "@elysiajs/html";
import { $, type BuildArtifact, type BuildOutput } from "bun";
import { Elysia, t } from "elysia";
import type { ContentType } from "elysia/types";
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

type Loader =
	| "js"
	| "jsx"
	| "ts"
	| "tsx"
	| "json"
	| "toml"
	| "file"
	| "napi"
	| "wasm"
	| "text"
	| "sqlite"
	| "sh";
function getContentTypeFromLoader(loader: Loader): string {
	switch (loader) {
		case "js":
		case "jsx":
		case "ts":
		case "tsx":
			return "text/javascript";
		case "json":
		case "toml":
			return "application/json";
		case "wasm":
			return "application/wasm";
		case "sqlite":
		case "sh":
			throw new Error(`Cannot return type ${loader}`);
		default:
			return "text/plain";
	}
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
		params?: Record<string, string | number | boolean>,
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

const buildCss = async (productionMode: boolean) => {
	const output =
		await $`bun x tailwindcss -i ./src/pages/global.input.css ${productionMode ? "--minify" : ""}`.quiet();
	if (output.exitCode !== 0) {
		logger.error("Building tailwind failed");
		console.error(new TextDecoder().decode(output.stderr));
		process.exit(1);
	}
	return new TextDecoder().decode(output.stdout);
};
const writeCss = async (productionMode: boolean) => {
	const css = await buildCss(productionMode);
	const cssHash = Bun.hash(css);
	const cssFilename = `global.${cssHash}.css`;
	const cssFilepath = `./src/pages/${cssFilename}`;
	Bun.write(cssFilepath, css);
	logger.log(`Built Tailwind CSS to path ${cssFilepath}`);
	return { cssFilename, cssFilepath, cssHash };
};
const { cssHash, cssFilename, cssFilepath } = await writeCss(
	process.env.NODE_ENV === "production",
);

const buildOutput = await Bun.build({
	entrypoints: ["./src/on-page/index.ts"],
	sourcemap: process.env.NODE_ENV === "production" ? "none" : "inline",
	minify: process.env.NODE_ENV === "production",
});
if (!buildOutput.success) {
	logger.error("Building on-page script failed");
	for (const message of buildOutput.logs) {
		console.error(message);
	}
	process.exit(1);
}
const outputs = buildOutput.outputs.reduce<Record<string, BuildArtifact>>(
	(o, res) => {
		const key = res.path.replace("./", "/");
		o[key] = res;
		return o;
	},
	{},
);

logger.log("Build on-page scripts");

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
			markdownContent,
			createdAt
		) VALUES (
			$url,
			$title,
			$published,
			$author,
			$topics,
			$tags,
			$textContent,
			$htmlContent,
			$markdownContent,
			$createdAt
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
		if (isHtml(response) && !path.includes(".svg")) {
			set.headers["Content-Type"] = "text/html; charset=utf8";
			set.headers["Cache-Control"] = "max-age:300, private";
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
			return LandingPage({ cssFilename });
		},
		{ query: t.Object({ url: t.Optional(t.String()) }) },
	)
	.get(`/${cssFilename}`, ({ set }) => {
		set.headers["Content-Type"] = "text/css";
		set.headers["Cache-Control"] = "max-age=31536000, immutable";
		return Bun.file(cssFilepath).arrayBuffer();
	})
	.get("/manifest.json", ({ set }) => {
		set.headers["Content-Type"] = "application/json";
		const manifest = JSON.stringify({
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
		set.headers["Cache-Control"] =
			"max-age=604800, stale-while-revalidate=86400";
		set.headers.ETag = `${Bun.hash(manifest)}`;
		return manifest;
	})
	.get("/icon.svg", ({ set }) => {
		set.headers["Content-Type"] = "image/svg+xml";
		const svg = `<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" ><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="-10 0 2610 2048"><path fill="currentColor"
d="M526 304q0 -83 50 -139t123 -56q55 0 100.5 31.5t73 83.5t27.5 115q0 82 -49 138t-120 56q-85 0 -145 -67t-60 -162zM599 304q0 64 38.5 109.5t93.5 45.5q40 0 68 -34.5t28 -85.5q0 -63 -38.5 -109.5t-89.5 -46.5q-42 0 -71 34.5t-29 86.5zM1369 870q0 -28 -20 -48
t-50 -20q-28 0 -48 19.5t-20 48.5q0 28 19.5 48.5t49.5 20.5q28 0 48.5 -20t20.5 -49zM758 666q90 0 147.5 8t93.5 28l96 -180q-72 -71 -72 -164q0 -107 -43.5 -193t-118 -136.5t-168.5 -50.5q-85 0 -151.5 40.5t-104 112.5t-37.5 167q0 98 50 182t132 135t176 51zM758 746
q-117 0 -216.5 -62t-160.5 -164t-61 -222q0 -117 48 -207t132.5 -141.5t192.5 -51.5q116 0 208.5 61.5t147 165.5t54.5 233q0 42 21.5 73t72.5 73l-184 342q-43 -64 -97.5 -82t-157.5 -18zM970 779l68 -43l719 1143q43 -21 43 -65q0 -23 -10 -56.5t-31 -87.5l-334 -873
l-281 -232l53 -61l296 245l340 891q21 55 32 99t11 79q0 59 -35 97t-115 63zM1842 666q95 0 176.5 -51t131.5 -135t50 -182q0 -95 -37.5 -167t-103.5 -112.5t-152 -40.5q-93 0 -168 50.5t-118.5 136.5t-43.5 193q0 93 -72 164l96 180q36 -20 93.5 -28t147.5 -8zM1842 746
q-103 0 -157.5 18t-97.5 82l-184 -342q51 -42 72.5 -73t21.5 -73q0 -129 54.5 -233t147.5 -165.5t208 -61.5q109 0 193 51.5t132 141.5t48 207q0 120 -60.5 222t-160.5 164t-217 62zM1328 1257l-454 721q-80 -25 -115 -63t-35 -97q0 -35 11 -79t32 -99l304 -796l53 84
l-283 742q-21 54 -31 87.5t-10 56.5q0 44 43 65l437 -697zM1264 618l139 -114l55 59l-129 106zM1485 858l77 -120l67 43l-109 169zM2074 304q0 95 -59.5 162t-145.5 67q-71 0 -120 -56t-49 -138q0 -63 27.5 -115t73.5 -83.5t100 -31.5q73 0 123 56t50 139zM2001 304
q0 -52 -29 -86.5t-71 -34.5q-51 0 -89.5 46.5t-38.5 109.5q0 51 28 85.5t68 34.5q55 0 93.5 -45.5t38.5 -109.5z" /></svg>
`;
		set.headers.ETag = `${Bun.hash(svg)}`;
		set.headers["Cache-Control"] =
			"max-age=604800, stale-while-revalidate=86400";
		return svg;
	})
	.get("/*", async ({ path, error, logger, requestId, set }) => {
		if (path in outputs) {
			logger.log(`Retrieving ${path} resource?`);
			set.headers["Content-Type"] = getContentTypeFromLoader(
				outputs[path].loader,
			);
			return outputs[path].arrayBuffer();
		}

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
					cssFilename,
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
			/**
			 * TODO: Try again in bun 1.1.20
			 * On bun 1.1.19, the following code crashes inside a Docker container.
			 * I can't reproduce it locally or make a proof-of-concept, but it's a consistent crash.
			 * Bun v1.1.18 (5a0b9352) Linux arm64
			 * Linux Kernel v6.5.0 | glibc v2.31
			 * Args: "bun" "./src/index.ts"
			 * Features: jsc fetch http_server shell(2) spawn tsconfig
			 * Builtins: "bun:main" "bun:sqlite" "node:assert" "node:buffer" "node:child_process" "node:crypto" "node:events" "node:fs" "node:http" "node:https" "node:net" "node:os" "node:path" "node:stream" "node:string_decoder" "node:timers/promises" "node:tls" "node:tty" "node:url" "node:util" "node:util/types" "node:vm" "node:zlib" "node:punycode" "ws"
			 * Elapsed: 23365ms | User: 775ms | Sys: 61ms
			 * RSS: 1.04GB | Peak: 0.22GB | Commit: 1.04GB | Faults: 54
			 *
			 * panic(main thread): Segmentation fault at address 0x80
			 * oh no: Bun has crashed. This indicates a bug in Bun, not your code.
			 *
			 * To send a redacted crash report to Bun's team,
			 * please file a GitHub issue using the link below:
			 *
			 *  https://bun.report/1.1.18/La15a0b935AigihsEm43pjEuvEus69gE_+nxm6Dm+mm6D___m7785DA2AgI
			 */
			// insertArticleQuery.run({
			// 	...article,
			// 	url: article.url.toString(),
			// 	published: article.published?.getTime() || null,
			// 	topics: article.topics.join(","),
			// 	tags: article.tags.join(","),
			// 	createdAt: Date.now(),
			// });

			// logger.log("Inserted into database", {
			// 	requestId,
			// 	articleURL: articleURL.toString(),
			// });
			return ClippedPage({ article, cssFilename });
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
