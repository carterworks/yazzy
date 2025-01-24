import { $ } from "bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import YtEmbedCss from "../../node_modules/lite-youtube-embed/src/lite-yt-embed.css" with {
	type: "file",
};
import YtEmbedJs from "../../node_modules/lite-youtube-embed/src/lite-yt-embed.js" with {
	type: "file",
};
import webManifest from "./manifest.webmanifest" with { type: "file" };
import scissorsIcon from "./scissors.svg" with { type: "file" };
import clientScripts from "./scripts.mjs" with { type: "file" };
import CSS_OUTPUT_PATH from "./styles.min.css" with { type: "file" };

const staticFiles = new Hono();

if (import.meta.env.NODE_ENV === "development") {
	await $`bun run css`;
}

staticFiles.use(
	"/lite-yt-embed.css",
	serveStatic({ path: YtEmbedCss as unknown as string, root: "/" }),
);
staticFiles.use(
	"/lite-yt-embed.js",
	serveStatic({ path: YtEmbedJs as unknown as string, root: "/" }),
);
staticFiles.use(
	"/styles.css",
	serveStatic({ path: CSS_OUTPUT_PATH, root: "/" }),
);
staticFiles.use(
	"/scissors.svg",
	serveStatic({ path: scissorsIcon as unknown as string, root: "/" }),
);
staticFiles.use(
	"/manifest.webmanifest",
	serveStatic({
		path: webManifest,
		mimes: {
			webmanifest: "application/manifest+json",
		},
		root: "/",
	}),
);
staticFiles.use(
	"/scripts.mjs",
	serveStatic({ path: clientScripts, root: "/" }),
);

export default staticFiles;
