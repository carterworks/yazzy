import { zValidator } from "@hono/zod-validator";
import { $ } from "bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { z } from "zod";
import webManifest from "./manifest.webmanifest";
import ClippedUrlPage from "./pages/ClippedUrl";
import IndexPage from "./pages/Index";
import scissorsIcon from "./scissors.svg";
import CSS_INPUT_PATH from "./styles.css";

const CSS_OUTPUT_PATH = CSS_INPUT_PATH.replace(/\.css$/, ".min.css");

const app = new Hono();
function log(message: string, ...rest: string[]) {
	console.log(`[${new Date().toISOString()}]`, message, ...rest);
}
async function buildCss() {
	await $`YAZZY_CSS_INPUT=${CSS_INPUT_PATH} YAZZY_CSS_OUTPUT=${CSS_OUTPUT_PATH} bun run css`.quiet();
	log(`Built CSS to ${CSS_OUTPUT_PATH}`);
}
buildCss();

app.use(logger(log));
app.use("/styles.min.css", serveStatic({ path: CSS_OUTPUT_PATH, root: "/" }));
app.use(
	"/scissors.svg",
	serveStatic({ path: scissorsIcon as unknown as string, root: "/" }),
);
app.use(
	"/manifest.webmanifest",
	serveStatic({
		path: webManifest,
		mimes: {
			webmanifest: "application/manifest+json",
		},
		root: "/",
	}),
);
app.use(
	"/manifest.webmanifest",
	serveStatic({ path: "./manifest.webmanifest" }),
);
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
	(c) => {
		return c.html(<ClippedUrlPage url={c.req.param("url")} />);
	},
);

export default app;
