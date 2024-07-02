import pathLib from "node:path";
import zlib from "node:zlib";
import { html, isHtml } from "@elysiajs/html";
import { $ } from "bun";
import { Elysia, t } from "elysia";
import { clip } from "./clip";
import ClippedPage from "./pages/ClippedPage";
import LandingPage from "./pages/LandingPage";
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
	.get("/global.css", () => Bun.file("./src/pages/global.css"))
	.get("/*", async ({ path, set, error, headers }) => {
		const pathWithoutSlash = path.startsWith("/") ? path.slice(1) : path;
		if (!isUrl(pathWithoutSlash)) {
			return error(400, "Invalid URL");
		}
		try {
			const article = await clip(new URL(pathWithoutSlash));
			if (!article.markdownContent) {
				throw new Error("No markdown content");
			}
			return ClippedPage({ article });
		} catch (err) {
			return error(
				500,
				`Internal server error; could not clip '${pathWithoutSlash}'`,
			);
		}
	})
	.listen(port);

console.log(`Started server on port ${port}`);
