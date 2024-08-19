import type { ReadablePage } from "../types";
// A sqlite database is used to cache articles
import db from "./db";
import type { YazzyDB, YazzyDBStatement } from "./db";

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
	#addArticleStatement: YazzyDBStatement<SerializedReadablePage>;
	#getArticleStatement: YazzyDBStatement<
		{ url: string },
		SerializedReadablePage
	>;
	#addSummaryStatement: YazzyDBStatement<{
		url: string;
		summary: string;
	}>;
	#getArticleCountStatement: YazzyDBStatement<
		unknown[],
		{ "COUNT(*)": number }
	>;
	constructor(db: YazzyDB) {
		this.#addArticleStatement = db.prepare(`INSERT INTO articles (
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
		this.#getArticleStatement = db.prepare(
			"SELECT * FROM articles WHERE url = :url",
		);
		this.#addSummaryStatement = db.prepare(
			"UPDATE articles SET summary = :summary WHERE url = :url",
		);
		this.#getArticleCountStatement = db.prepare(
			"SELECT COUNT(*) FROM articles",
		);

		console.log(
			"CacheService initialized [article count: %d]",
			this.getArticleCount(),
		);
	}

	insertArticle(article: ReadablePage): void {
		// convert all the types
		this.#addArticleStatement.run({
			...article,
			published: article.published?.getTime(),
			createdAt: article.createdAt?.getTime(),
			tags: article.tags.join(LIST_DELIMITER),
			summary: article.summary ?? "",
		});
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
		if (!result || !result["COUNT(*)"]) return 0;
		const count = result["COUNT(*)"];
		return count;
	}
}

export const cache = new CacheService(db);
