import type { FC } from "hono/jsx";
import ArticleHeader from "../components/ArticleHeader";
import ArticleMinimap from "../components/ArticleMinimap";
import Button from "../components/Button";
import DownloadAs from "../components/DownloadAs";
import { BookClosed, InboxDownload } from "../components/icons/refactoring-ui";
import { Obsidian } from "../components/icons/simple-icons";
import BasePage from "../layouts/BasePage";
import { convertHtmlToMarkdown } from "../services/clipper";
import type { ReadablePage } from "../types";
import { formatDate } from "../utils";

function getFilename(title: string): string {
	return (
		title
			// make title windows-friendly
			.replace(":", "")
			.replace(/[/\\?%*|"<>]/g, "-")
			// get rid of spaces
			.replace(/\s+/g, "-")
			// lowercase is bestcase
			.toLocaleLowerCase()
	);
}

function generateObsidianContents(article: ReadablePage): string {
	const today = formatDate(new Date());

	// Check if there's an author and add brackets
	const authorBrackets = article.author ? `"[[${article.author}]]"` : "";
	const params = {
		category: '"[[Clippings]]"',
		author: `${authorBrackets}`,
		title: `"${article.title}"`,
		url: article.url,
		clipped: `"${today}"`,
		published: `"${formatDate(article.published)}"`,
		tags: article.tags.map((t) => `"${t}"`).join(" "),
	};
	let fileContent = "---\n";
	fileContent += Object.entries(params)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
	fileContent += "\n---\n";
	fileContent += `\n# ${article.title}\n`;
	if (article.summary) {
		fileContent += "\n---\n";
		fileContent += "\n## Summary\n";
		fileContent += `\n${convertHtmlToMarkdown(article.summary)}\n`;
		fileContent += "\n---\n";
	}
	fileContent += `\n${article.markdownContent}\n`;

	return fileContent;
}

function generateObsidianUri(
	fileContent: string,
	title: string,
	folder = "Clippings/",
	vault = "",
): string {
	const fileName = getFilename(title);
	const vaultName = vault ? `&vault=${encodeURIComponent(vault)}` : "";
	return `obsidian://new?file=${encodeURIComponent(folder + fileName)}&content=${encodeURIComponent(fileContent)}${vaultName}`;
}

const ClippedPageHead: FC<{ article: ReadablePage }> = ({ article }) => {
	const plainTextSummary = article.summary
		? article.summary.replace(/<[^>]*>/g, "")
		: `${(article.textContent ?? "").trim().substring(0, 300)}…`;

	const articleHostname = new URL(article.url).hostname;
	return (
		<>
			<meta name="description" content={plainTextSummary} />
			<meta
				property="og:title"
				content={`${article.title} | ${articleHostname} | yazzy`}
			/>
			<meta property="og:description" content={plainTextSummary} />
			<meta property="og:url" content={article.url} />
			<meta property="og:type" content="article" />
			{article.published && (
				<meta
					property="og:article:published_time"
					content={formatDate(article.published)}
				/>
			)}
			{article.author && (
				<meta property="og:article:author" content={article.author} />
			)}
		</>
	);
};

const ClippedUrlPage: FC<{ article: ReadablePage }> = ({ article }) => {
	const plainTextSummary = article.summary
		? article.summary.replace(/<[^>]*>/g, "")
		: `${(article.textContent ?? "").substring(0, 300)}…`;
	const markdownContent = generateObsidianContents(article);
	const title = article.title ?? `${new Date().toISOString()} Clipping`;
	const obsidianUri = generateObsidianUri(markdownContent, title ?? "");
	const plainTextContent = `${article.title}\n---\nSummary\n\n${plainTextSummary}\n---\n${article.textContent}`;

	return (
		<BasePage
			title={`${article.title} | yazzy`}
			className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-2 lg:gap-4"
			head={<ClippedPageHead article={article} />}
		>
			<aside className="flex lg:flex-col gap-3 items-center lg:col-start-1 lg:row-span-2 print:hidden">
				<Button href={obsidianUri} title="Save to Obsidian" type="link">
					<Obsidian className="h-4" />
				</Button>
				<DownloadAs
					contents={markdownContent}
					filename={`${getFilename(title)}.md`}
					title="Download as Markdown"
				>
					<BookClosed className="h-4" />
				</DownloadAs>
				<DownloadAs
					contents={plainTextContent}
					filename={`${getFilename(title)}.txt`}
					title="Download as plain text"
				>
					<InboxDownload className="h-4" />
				</DownloadAs>
				<ArticleMinimap
					selector="article"
					classes="fixed bottom-3 mx-auto px-2 rounded lg:m-0 lg:top-2 lg:sticky bg-paper dark:bg-black"
				/>
			</aside>
			<div className="lg:col-start-2 max-w-prose space-x-2">
				<main>
					<article>
						<ArticleHeader article={article} />
						<div
							className={[
								"prose dark:prose-invert",
								"font-humanist",
								"prose-headings:font-transitional",
								"prose-a:break-words",
								"prose-hr:my-4",
								"prose-headings:mt-6",
								"prose-headings:mb-0",
								"!prose-img:max-w-lg",
								"prose-img:mx-auto",
								"prose-img:rounded",
							].join(" ")}
							hx-disable
							// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
							dangerouslySetInnerHTML={{ __html: article.htmlContent }}
						/>
					</article>
				</main>
			</div>
		</BasePage>
	);
};

export default ClippedUrlPage;
