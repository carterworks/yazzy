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
		<header className={["space-y-2", classes].join(" ")}>
			<h2 class="text-3xl font-transitional">
				<a href={article.url} class="hover:underline">
					{article.title}
				</a>
			</h2>
			<p class="text-sm">{metadata.join(" ・ ")}</p>
			<AISummary url={article.url} />
		</header>
	);
};
export default ArticleHeader;
