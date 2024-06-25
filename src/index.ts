import { Elysia, t } from "elysia";
import read from "node-readability";
import { html } from "@elysiajs/html";
import TurndownService from "turndown";
import ClippedPage from "./pages/clippedPage";
const port = process.env.PORT || 3000;

function isUrl(potentialUrl: string): boolean {
	try {
		new URL(potentialUrl);
		return true;
	} catch {
		return false;
	}
}

function htmlToMarkdown(html: string): string {
	const turndown = new TurndownService();
	return turndown.turndown(html);
}
async function makeReadablePage(html: string): Promise<string> {
	const { article, metadata } = await new Promise((resolve, reject) => {
		read(html, (err: any | null, article: any, metadata: Response | null) => {
			if (err) {
				reject(err);
			} else {
				resolve({ article, metadata });
			}
		});
	});
	return article.content;
}
async function fetchPage(url: URL): Promise<string> {
	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url.toString()}`);
	}
	return await response.text();
}

async function urlToMarkdown(url: URL): Promise<string> {
	const page = await fetchPage(url);
	console.log(
		`✅ Fetched page {"url":"${url.toString()}","length":${page.length}}`,
	);
	const readablePage = await makeReadablePage(page);
	console.log(
		`✅ Readable page {"url":"${url.toString()}","length":${readablePage.length}}`,
	);
	const markdown = htmlToMarkdown(readablePage);
	console.log(
		`✅ Converted to markdown {"url":"${url.toString()}","length":${markdown.length}}`,
	);
	return markdown;
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
			const markdown = await urlToMarkdown(new URL(pathWithoutSlash));
			set.headers["Content-Type"] = "text/html";
			return ClippedPage({ markdown, url: pathWithoutSlash });
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
