import type { FC } from "hono/jsx";
import AISummary from "../components/AISummary";
import type { ReadablePage } from "../types";
import { formatDate } from "../utils";

function generateMetadataNuggets(article: ReadablePage): string[] {
	const articleHostname = new URL(article.url).hostname;
	const metadata = [
		article.author,
		article.published && formatDate(article.published),
		articleHostname,
	].filter((nugget) => !!nugget) as string[];
	return metadata;
}

const ArticleHeader: FC<{ article: ReadablePage; classes?: string }> = ({
	article,
	classes = "",
}) => {
	const metadata = generateMetadataNuggets(article);
	return (
		<header
			className={[
				"space-y-2",
				"mb-4",
				"pb-4",
				"border-b border-base-100 dark:border-base-900",
				classes,
			].join(" ")}
		>
			<h2 class="text-2xl font-didone">
				<a
					href={article.url}
					class="transition-colors rounded hover:bg-base-100 dark:hover:bg-base-800"
				>
					{article.title}
				</a>
			</h2>
			<p class="text-sm">{metadata.join(" ・ ")}</p>
			<AISummary url={article.url} summary={article.summary} />
		</header>
	);
};
export default ArticleHeader;
