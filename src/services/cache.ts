import { eq, sql } from "drizzle-orm";
import database from "../db/db";
import { articles } from "../db/schema";
import type { ReadablePage } from "../types";

const LIST_DELIMITER = "|";

function toReadablePage(article: typeof articles.$inferSelect): ReadablePage {
	return {
		...article,
		published: article.published ? new Date(article.published) : undefined,
		createdAt: article.createdAt ? new Date(article.createdAt) : undefined,
		tags: (article.tags ?? "").split(LIST_DELIMITER),
	};
}

function fromReadablePage(article: ReadablePage): typeof articles.$inferInsert {
	return {
		...article,
		tags: article.tags.join(LIST_DELIMITER),
	};
}

class CacheService {
	#db: typeof database;
	constructor(db: typeof database) {
		this.#db = db;
	}

	async insertArticle(article: ReadablePage) {
		// convert all the types
		const serializedArticle = fromReadablePage(article);
		await this.#db.insert(articles).values(serializedArticle);
	}

	async getArticle(url: string) {
		const [result] = await this.#db
			.select()
			.from(articles)
			.limit(1)
			.where(eq(articles.url, url));
		if (!result) return undefined;
		return toReadablePage(result);
	}

	addSummary(url: string, summary: string) {
		return this.#db
			.update(articles)
			.set({ summary })
			.where(eq(articles.url, url))
			.returning({ updatedUrl: articles.url });
	}

	getArticleCount(): Promise<number> {
		return this.#db.$count(articles);
	}

	async getRecentArticles(limit = 10) {
		const result = await this.#db
			.select()
			.from(articles)
			.orderBy(
				sql`CASE WHEN createdAt IS NULL THEN published ELSE createdAt END DESC`,
			)
			.limit(limit);
		return result.map(toReadablePage);
	}
}

export const cache = new CacheService(database);
