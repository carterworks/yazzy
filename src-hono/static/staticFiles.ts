import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import webManifest from "./manifest.webmanifest" with { type: "file" };
import scissorsIcon from "./scissors.svg" with { type: "file" };
import clientScripts from "./scripts.mjs" with { type: "file" };
import CSS_OUTPUT_PATH from "./styles.min.css" with { type: "file" };

const staticFiles = new Hono();

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
