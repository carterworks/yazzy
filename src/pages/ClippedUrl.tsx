import type { FC } from "hono/jsx";
import ArticleHeader from "../components/ArticleHeader";
import Button from "../components/Button";
import DownloadAs from "../components/DownloadAs";
import {
	BookClosed,
	Duplicate,
	InboxDownload,
} from "../components/icons/refactoring-ui";
import { Obsidian } from "../components/icons/simple-icons";
import BasePage from "../layouts/BasePage";
import convertHtmlToMarkdown from "../services/markdown";
import type { ReadablePage } from "../types";
import { formatDate, getPlainTextSummary } from "../utils";

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

function generatePlainTextContents(article: ReadablePage): string {
	const plainTextSummary = getPlainTextSummary(article, 1000);
	return `${article.title}\n---\nSummary\n\n${plainTextSummary}\n---\n${article.textContent}`;
}

function escapeDoubleQuotes(value: string): string {
	return value.replace(/"/g, '\\"');
}

function generateObsidianContents(article: ReadablePage): string {
	// Check if there's an author and add brackets
	const authorBrackets = article.author ? `[[${article.author}]]` : "";
	const frontmatter = {
		category: "[[Clippings]]",
		author: `${authorBrackets}`,
		title: `${article.title}`,
		url: article.url,
		clipped: new Date(),
		published: article.published,
		tags: article.tags,
	};
	let fileContent = "---\n";
	for (const [key, value] of Object.entries(frontmatter)) {
		fileContent += `${key}: `;
		if (
			value === null ||
			value === undefined ||
			(typeof value === "string" && value.trim().length === 0)
		) {
			// skip empty values
		} else if (typeof value === "string") {
			fileContent += escapeDoubleQuotes(value);
		} else if (Array.isArray(value)) {
			fileContent += "\n";
			fileContent += value
				.map((v) => `  - ${escapeDoubleQuotes(v)}`)
				.join("\n");
		} else if (value && value instanceof Date) {
			fileContent += formatDate(value);
		} else {
			fileContent += `${value}`;
		}
		fileContent += "\n";
	}
	// surround wikilinks with quotes
	fileContent = fileContent.replace(/(\[\[.*?\]\])/g, '"$1"');
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
	const plainTextSummary = getPlainTextSummary(article, 1000);

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
			{/* add the js and css for the lite youtube embed */}
			<link rel="stylesheet" href="/lite-yt-embed.css" />
			<script type="module" src="/lite-yt-embed.js" async defer />
			<script type="module">{`
function initCopyButton() {
	const copyButton = document.getElementById(\`copy-markdown\`);
	if (!copyButton) {
		return;
	}
	const copyText = \`${article.markdownContent}\`;
	if (!copyText) {
		return;
	}
	copyButton.addEventListener(\`click\`, function() {
		navigator.clipboard.writeText(copyText);
		window.addNotification(\`Copied to clipboard.\`);
	});
}
initCopyButton();
`}</script>
		</>
	);
};

const ClippedUrlPage: FC<{ article: ReadablePage }> = ({ article }) => {
	const markdownContent = generateObsidianContents(article);
	const title = article.title ?? `${new Date().toISOString()} Clipping`;
	const obsidianUri = generateObsidianUri(markdownContent, title ?? "");
	const plainTextContent = generatePlainTextContents(article);

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
				<Button
					title="Copy Markdown to clipboard"
					type="button"
					id="copy-markdown"
				>
					<Duplicate className="h-4" />
				</Button>
			</aside>
			<div className="lg:col-start-2 max-w-prose space-x-2">
				<main>
					<article>
						<ArticleHeader article={article} />
						<div
							className="prose"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
							dangerouslySetInnerHTML={{ __html: article.htmlContent ?? "" }}
						/>
					</article>
				</main>
			</div>
		</BasePage>
	);
};

export default ClippedUrlPage;
