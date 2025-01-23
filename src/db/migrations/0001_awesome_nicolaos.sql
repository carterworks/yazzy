DROP TABLE `schema_version`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_articles` (
	`url` text PRIMARY KEY NOT NULL,
	`title` text,
	`author` text,
	`published` integer,
	`topics` text,
	`tags` text,
	`markdownContent` text,
	`textContent` text,
	`htmlContent` text,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP),
	`summary` text
);
--> statement-breakpoint
INSERT INTO `__new_articles`("url", "title", "author", "published", "topics", "tags", "markdownContent", "textContent", "htmlContent", "createdAt", "summary") SELECT "url", "title", "author", "published", "topics", "tags", "markdownContent", "textContent", "htmlContent", "createdAt", "summary" FROM `articles`;--> statement-breakpoint
DROP TABLE `articles`;--> statement-breakpoint
ALTER TABLE `__new_articles` RENAME TO `articles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;