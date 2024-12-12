import type { ReadablePage } from "../types";
// A sqlite database is used to cache articles
import db from "./db";
import type { YazzyDB } from "./db";

interface SerializedReadablePage {
	title: string;
	url: string;
	published?: number;
	author: string;
	tags: string;
	markdownContent: string;
	textContent: string;
	htmlContent: string;
	createdAt?: number;
	summary?: string;
}

const LIST_DELIMITER = "|";

class CacheService {
	#addArticleStatement;
	#getArticleStatement;
	#addSummaryStatement;
	#getArticleCountStatement;
	#getRecentArticlesStatement;
	constructor(db: YazzyDB) {
		this.#addArticleStatement = db.query<
			unknown,
			Record<
				string,
				string | bigint | NodeJS.TypedArray | number | boolean | null
			>
		>(`INSERT INTO articles (
		url,
		title,
		author,
		published,
		tags,
		markdownContent,
		textContent,
		htmlContent,
		createdAt,
		summary
	) VALUES (
		:url,
		:title,
		:author,
		:published,
		:tags,
		:markdownContent,
		:textContent,
		:htmlContent,
		:createdAt,
		:summary
	)`);
		this.#getArticleStatement = db.query<
			SerializedReadablePage,
			{ url: string }
		>("SELECT * FROM articles WHERE url = :url");
		this.#addSummaryStatement = db.query<
			unknown,
			{ url: string; summary: string }
		>("UPDATE articles SET summary = :summary WHERE url = :url");
		this.#getArticleCountStatement = db.query<{ "COUNT(*)": number }, []>(
			"SELECT COUNT(*) FROM articles",
		);
		this.#getRecentArticlesStatement = db.query<
			SerializedReadablePage,
			{ limit: number }
		>("SELECT * FROM articles ORDER BY createdAt, published DESC LIMIT :limit");

		console.log(
			"CacheService initialized [article count: %d]",
			this.getArticleCount(),
		);
	}

	insertArticle(article: ReadablePage): void {
		// convert all the types
		const serializedArticle = {
			...article,
			published: article.published?.getTime() ?? null,
			createdAt: article.createdAt?.getTime() ?? null,
			tags: article.tags.join(LIST_DELIMITER),
			summary: article.summary ?? "",
		};
		this.#addArticleStatement.run(serializedArticle);
	}

	getArticle(url: string): ReadablePage | undefined {
		const result = this.#getArticleStatement.get({ url });
		if (!result) return undefined;
		const article: ReadablePage = {
			...result,
			published: result.published ? new Date(result.published) : undefined,
			createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
			tags: result.tags.split(LIST_DELIMITER),
		};
		return article;
	}

	addSummary(url: string, summary: string): void {
		this.#addSummaryStatement.run({ url, summary });
	}

	getArticleCount(): number {
		const result = this.#getArticleCountStatement.get();
		return result?.["COUNT(*)"] ?? 0;
	}

	getRecentArticles(limit = 10): ReadablePage[] {
		const results = this.#getRecentArticlesStatement.all({ limit });
		if (!results) return [];
		return results.map((result) => {
			const article: ReadablePage = {
				...result,
				published: result.published ? new Date(result.published) : undefined,
				createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
				tags: result.tags.split(LIST_DELIMITER),
			};
			return article;
		});
	}
}

export const cache = new CacheService(db);
