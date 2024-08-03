// A sqlite database is used to cache articles
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import type { ReadablePage } from "../types";

interface SerializedReadablePage {
	title: string;
	url: string;
	published?: number;
	author: string;
	topics: string;
	tags: string;
	markdownContent: string;
	textContent: string;
	htmlContent: string;
	createdAt?: number;
	summary?: string;
}

const LIST_DELIMITER = "|";

class CacheService {
	#db: BetterSqlite3.Database;
	#addArticleStatement: BetterSqlite3.Statement<SerializedReadablePage>;
	#getArticleStatement: BetterSqlite3.Statement<
		{ url: string },
		SerializedReadablePage
	>;
	#addSummaryStatement: BetterSqlite3.Statement<{
		url: string;
		summary: string;
	}>;
	constructor(loc = ":memory:") {
		const db = new Database(loc, {});
		db.pragma("journal_mode = WAL");

		// create the table
		db.prepare(`CREATE TABLE IF NOT EXISTS articles (
	url TEXT PRIMARY KEY,
	title TEXT,
	author TEXT,
	published INTEGER,
	topics TEXT,
	tags TEXT,
	markdownContent TEXT,
	textContent TEXT,
	htmlContent TEXT,
	createdAt INTEGER,
	summary TEXT
)`).run();

		this.#db = db;
		this.#addArticleStatement = this.#db.prepare(`INSERT INTO articles (
		url,
		title,
		author,
		published,
		topics,
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
		:topics,
		:tags,
		:markdownContent,
		:textContent,
		:htmlContent,
		:createdAt,
		:summary
	)`);
		this.#getArticleStatement = this.#db.prepare(
			"SELECT * FROM articles WHERE url = :url",
		);
		this.#addSummaryStatement = this.#db.prepare(
			"UPDATE articles SET summary = :summary WHERE url = :url",
		);
	}

	insertArticle(article: ReadablePage): void {
		// convert all the types
		this.#addArticleStatement.run({
			...article,
			published: article.published?.getTime(),
			createdAt: article.createdAt?.getTime(),
			topics: article.topics.join(LIST_DELIMITER),
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
			topics: result.topics.split(LIST_DELIMITER),
			tags: result.tags.split(LIST_DELIMITER),
		};
		return article;
	}

	addSummary(url: string, summary: string): void {
		this.#addSummaryStatement.run({ url, summary });
	}
}

export const cache = new CacheService(process.env.DB_PATH);
