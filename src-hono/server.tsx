import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { z } from "zod";
import log from "./log";
import ClippedUrlPage from "./pages/ClippedUrl";
import IndexPage from "./pages/Index";
import staticFiles from "./static/staticFiles";

const app = new Hono();

app.use(logger(log));
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
