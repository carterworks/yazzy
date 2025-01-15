import type { FC, PropsWithChildren } from "hono/jsx";
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
	// const willGenerateSummary = Boolean(Astro.cookies.get("Authorization"));
	const metadata = generateMetadataNuggets(article);
	const lineLengths: Readonly<string[]> = [
		"w-[30ch]",
		"w-[45ch]",
		"w-[40ch]",
		"w-[42ch]",
	];
	return (
		<header className={[classes, "space-y-2"].join(" ")}>
			<h2 class="text-3xl font-transitional">
				<a href={article.url} class="hover:underline">
					{article.title}
				</a>
			</h2>
			<p class="text-sm">{metadata.join(" ・ ")}</p>
		</header>
	);
};
export default ArticleHeader;
