import { resolve } from "node:path";
import { $ } from "bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import log from "../services/log";
import webManifest from "./manifest.webmanifest";
import scissorsIcon from "./scissors.svg";
import CSS_INPUT_PATH from "./styles.css";

const isDev = process.env.NODE_ENV === "development";

const CSS_OUTPUT_PATH = CSS_INPUT_PATH.replace(/\.css$/, ".min.css");
async function buildCss() {
	await $`YAZZY_CSS_INPUT=${CSS_INPUT_PATH} YAZZY_CSS_OUTPUT=${CSS_OUTPUT_PATH} bun run css`.quiet();
	log(`Built CSS to ${CSS_OUTPUT_PATH}`);
}
buildCss();

const htmx = resolve(
	__dirname,
	`../../node_modules/htmx.org/dist/htmx${isDev ? ".js" : ".min.js"}`,
);
const clientScripts = resolve(__dirname, "./scripts.mjs");
const wcMinimap = resolve(
	__dirname,
	"../../node_modules/wc-minimap/wc-minimap.js",
);

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
staticFiles.use("/htmx.js", serveStatic({ path: htmx, root: "/" }));
staticFiles.use(
	"/scripts.mjs",
	serveStatic({ path: clientScripts, root: "/" }),
);
staticFiles.use("/wc-minimap.js", serveStatic({ path: wcMinimap, root: "/" }));

export default staticFiles;
