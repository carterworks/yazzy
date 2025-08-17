-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
CREATE TABLE IF NOT EXISTS `articles` (
	`url` text PRIMARY KEY,
	`title` text,
	`author` text,
	`published` integer,
	`topics` text,
	`tags` text,
	`markdownContent` text,
	`textContent` text,
	`htmlContent` text,
	`createdAt` integer,
	`summary` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schema_version` (
	`version` integer PRIMARY KEY
);
