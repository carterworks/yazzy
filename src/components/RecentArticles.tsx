import type { FC } from "hono/jsx";
import type { ReadablePage } from "../types";
import { getPlainTextSummary } from "../utils";

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
				<h3 class="font-didone">{article.title}</h3>
				<p class="text-xs my-1 truncate">{new URL(article.url).hostname}</p>
				<p class="text-xs">{article.summary}</p>
			</a>
		</li>
	);
};

const RecentArticles: FC<{ articles: ReadablePage[] }> = ({ articles }) => {
	const recentArticles = articles.map((article) => {
		return {
			...article,
			summary: getPlainTextSummary(article, 30),
		};
	});
	return (
		<section>
			<h2 class="text-lg font-didone mb-2">What people are reading.</h2>
			<ol class="flex flex-column lg:flex-row flex-wrap gap-2 justify-between">
				{recentArticles.map((article) => (
					<RecentArticle article={article} key={article.url} />
				))}
			</ol>
		</section>
	);
};

export default RecentArticles;
