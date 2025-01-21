import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
	url: text().primaryKey(),
	title: text(),
	author: text(),
	published: integer(),
	topics: text(),
	tags: text(),
	markdownContent: text(),
	textContent: text(),
	htmlContent: text(),
	createdAt: integer(),
	summary: text(),
});

export const schemaVersion = sqliteTable("schema_version", {
	version: integer().primaryKey(),
});
