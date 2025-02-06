import type { FC } from "hono/jsx";
import type { ReadablePage } from "../types";

const RecentArticle: FC<{ article: ReadablePage }> = ({ article }) => {
	return (
		<li
			className={[
				"lg:w-40",
				"md:w-60",
				"flex-auto",
				"p-2",
				"overflow-hidden",
				"transition",
				"rounded",
				"border",
				"border-base-100 dark:border-base-900",
				"bg-paper hover:bg-base-50 ",
				"dark:bg-black hover:dark:bg-base-950 ",
			].join(" ")}
		>
			<a href={`/${article.url}`}>
				<h3 class="font-transitional">{article.title}</h3>
				<p class="text-xs my-1 truncate">{new URL(article.url).hostname}</p>
				<p class="text-xs">{article.summary}</p>
			</a>
		</li>
	);
};

const RecentArticles: FC<{ articles: ReadablePage[] }> = ({ articles }) => {
	const recentArticles = articles.map((article) => {
		let summary = article.summary
			?.replace(/<[^>]*>/g, " ")
			// remove the "Generated on 02/06/2025 08:21 PM using google/gemini-2.0-flash-001"
			// or "Generated on 2025-02-06T19:48:10.640Z using google/gemini-2.0-flash-001	"
			.replace(/Generated on .+ using \w+\/[\w-\.]+/, "")
			.split(/\s+/)
			.slice(0, 20)
			.join(" ");
		if (summary?.length && summary.length > 0) {
			summary += "...";
		}
		return {
			...article,
			summary,
		};
	});
	return (
		<section>
			<h2 class="text-lg font-transitional mb-2">What people are reading.</h2>
			<ol class="flex flex-column lg:flex-row flex-wrap gap-2 justify-between">
				{recentArticles.map((article) => (
					<RecentArticle article={article} key={article.url} />
				))}
			</ol>
		</section>
	);
};

export default RecentArticles;
