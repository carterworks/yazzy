import { createMarkdownContent } from "../../node_modules/defuddle/dist/markdown.js";

export default function convertHtmlToMarkdown(content: string, url: string) {
	return createMarkdownContent(content, url);
}
