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
		AI_API_KEY: string;
		DB_PATH: string;
		AI_ENDPOINT: string;
		BASE_URL: string;
	}
}

type Env = {
	Variables: {
		requestId: string;
	};
};
