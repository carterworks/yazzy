import { html } from "@elysiajs/html";
import { Elysia, t } from "elysia";
import { clip } from "./clip";
import ClippedPage from "./pages/ClippedPage";
const port = process.env.PORT || 3000;

function isUrl(potentialUrl: string): boolean {
	try {
		new URL(potentialUrl);
		return true;
	} catch {
		return false;
	}
}

const elysia = new Elysia()
	.use(html())
	.get(
		"/",
		({ query, redirect }) => {
			if (query.url && isUrl(query.url)) {
				const url = new URL(query.url);
				return redirect(`/${url.toString()}`);
			}
			return Bun.file("./src/pages/index.html");
		},
		{ query: t.Object({ url: t.Optional(t.String()) }) },
	)
	.get("/*", async ({ path, set, error }) => {
		const pathWithoutSlash = path.startsWith("/") ? path.slice(1) : path;
		if (!isUrl(pathWithoutSlash)) {
			return error(400, "Invalid URL");
		}
		try {
			const article = await clip(new URL(pathWithoutSlash));
			if (!article.markdownContent) {
				throw new Error("No markdown content");
			}
			set.headers["Content-Type"] = "text/html";
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
