import { Elysia } from "elysia";
import TurndownService from "turndown";
import read from "node-readability";
import type { } from "elysia";
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
  .get("/", () => Bun.file("./src/pages/index.html"))
  .get("/*", async ({ path }) => {
    const pathWithoutSlash = path.startsWith("/") ? path.slice(1) : path;
    if (isUrl(pathWithoutSlash)) {
      const markdown = await urlToMarkdown(new URL(pathWithoutSlash));
      const response = new Response(markdown);
      // set the content type for html to be rendered correctly
      response.headers.set("Content-Type", "text/plain");
      return response;
    }
    return {
      status: 404,
      body: "Not found",
    };
  })
  .listen(port);

console.log(`Started server on port ${port}`);
