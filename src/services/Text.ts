import { createMarkdownContent } from "../../node_modules/defuddle/dist/markdown.js";

function convertHtmlToMarkdown(content: string, url: string) {
  return createMarkdownContent(content, url);
}

export class Text {
  #html: string = "";
  get html(): string {
    return this.#html;
  }
  #markdown: string = "";
  get markdown(): string {
    return this.#markdown;
  }
  #plain: string = "";
  get plain(): string {
    return this.#plain;
  }
  constructor({
    html,
    markdown,
    plain,
  }: {
    html: string;
    markdown?: string;
    plain?: string;
  }) {
    this.#html = html;
    this.#markdown = markdown ?? convertHtmlToMarkdown(html, "");
    this.#plain = plain ?? this.#markdown.replace(/<[^>]*>/g, "").trim();
  }
}
