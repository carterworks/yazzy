export interface ReadablePage {
	title: string;
	url: string;
	published?: Date;
	author: string;
	topics: string[];
	tags: string[];
	markdownContent: string;
	textContent: string;
	htmlContent: string;
}
