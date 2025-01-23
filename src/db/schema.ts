import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
	url: text().primaryKey().notNull(),
	title: text(),
	author: text(),
	published: integer({ mode: "timestamp_ms" }),
	topics: text(),
	tags: text(),
	markdownContent: text(),
	textContent: text(),
	htmlContent: text(),
	createdAt: integer({ mode: "timestamp_ms" }).default(
		sql`(CURRENT_TIMESTAMP)`,
	),
	summary: text(),
});
