export interface ReadablePage {
	title: string | null;
	url: string;
	published?: Date;
	author: string | null;
	tags: string[];
	markdownContent: string | null;
	textContent: string | null;
	htmlContent: string | null;
	createdAt?: Date;
	summary?: string | null;
}

declare module "bun" {
	interface Env {
		AI_API_KEY?: string;
		DB_PATH: string;
		AI_ENDPOINT?: string;
		BASE_URL: string;
		NODE_ENV?: string;
	}

	// Augment Bun namespace to include sqlite and test globals
	namespace sqlite {
		export type Database = import("bun:sqlite").Database;
		export const Database: typeof import("bun:sqlite").Database;
		export type Statement = import("bun:sqlite").Statement;
	}

	namespace test {
		export const describe: typeof import("bun:test").describe;
		export const it: typeof import("bun:test").it;
		export const expect: typeof import("bun:test").expect;
		export const beforeAll: typeof import("bun:test").beforeAll;
		export const beforeEach: typeof import("bun:test").beforeEach;
		export const afterAll: typeof import("bun:test").afterAll;
		export const afterEach: typeof import("bun:test").afterEach;
	}
}

declare namespace App {
	interface Locals {
		requestId: string;
		wideEvent: import("./services/wideLog").WideEvent;
	}
}

declare module "astro:middleware" {
	export function defineMiddleware(
		fn: (
			context: {
				request: Request;
				locals: App.Locals;
				params: Record<string, string | undefined>;
				url: URL;
			},
			next: () => Promise<Response>,
		) => Promise<Response>,
	): (
		context: {
			request: Request;
			locals: App.Locals;
			params: Record<string, string | undefined>;
			url: URL;
		},
		next: () => Promise<Response>,
	) => Promise<Response>;
}
