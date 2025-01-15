import type { FC } from "hono/jsx";
import Button from "../components/Button";
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

const ClippedPageHead: FC<{ article: ReadablePage }> = ({ article }) => <></>;

const ClippedUrlPage: FC<{ article: ReadablePage }> = ({ article }) => {
	const plainTextSummary = article.summary
		? article.summary.replace(/<[^>]*>/g, "")
		: `${article.textContent.substring(0, 300)}…`;
	const articleHostname = new URL(article.url).hostname;
	const markdownContent = generateObsidianContents(article);
	const obsidianUri = generateObsidianUri(markdownContent, article.title);
	const plainTextContent = `${article.title}\n---\nSummary\n\n${plainTextSummary}\n---\n${article.textContent}`;

	return (
		<BasePage classes="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-2 lg:gap-4">
			<aside class="flex lg:flex-col gap-3 items-center lg:col-start-1 lg:row-span-2 print:hidden">
				<Button href={obsidianUri} title="Save to Obsidian">
					{/* <Icon class="h-4" name="simple-icons/obsidian" /> */}
				</Button>
				{/* <DownloadAs
					contents={markdownContent}
					filename={`${getFilename(article.title)}.md`}
					title="Download as Markdown"
				>
					<Icon name="refactoring-ui/book-closed" />
				</DownloadAs>
				<DownloadAs
					contents={plainTextContent}
					filename={`${getFilename(article.title)}.txt`}
					title="Download as plain text"
				>
					<Icon name="refactoring-ui/inbox-download" />
				</DownloadAs>
				<ArticleMinimap
					selector="article"
					class={`fixed bottom-3 mx-auto px-2 rounded lg:m-0 lg:rounded-none lg:top-2 lg:sticky`}
				/> */}
			</aside>
			<div class="lg:col-start-2 max-w-prose space-x-2">
				<main>
					<article>
						{/* <ArticleHeader
							class="border-b-2 border-neutral-400 pb-2"
							article={article}
						/> */}
						<div
							class="prose dark:prose-invert lg:prose-xl font-humanist prose-headings:font-transitional prose-a:break-words prose-hr:my-4 prose-headings:mt-10 prose-headings:mb-0 !prose-img:max-w-lg prose-img:mx-auto prose-img:rounded"
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
