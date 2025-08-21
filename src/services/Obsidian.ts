import { escapeDoubleQuotes, formatDate } from "../utils.ts";
import { Text } from "./Text.ts";

function getFilename(title: string): string {
  return (
    title
      // make title windows-friendly
      .replace(":", "")
      .replace(/[/\\?%*|"<>]/g, "-")
      // get rid of spaces
      .replace(/\s+/g, "-")
      // lowercase is bestcase
      .toLocaleLowerCase()
  );
}

export class ObsidianFile {
  #article;
  #folder: string = "Clippings/";
  #vault: string = "";

  constructor(article: {
    author?: string;
    title: string;
    url: string;
    published?: Date;
    tags: string[];
    summary?: Text;
    content: Text;
  }) {
    this.#article = article;
  }

  get contents() {
    const article = this.#article;
    const author = article.author ? `[[${article.author}]]` : "";
    const frontmatter = {
      category: "[[Clippings]]",
      author: `${author}`,
      title: `${article.title}`,
      url: article.url,
      clipped: new Date(),
      published: article.published,
      tags: article.tags,
    };
    let fileContent = "---\n";
    for (const [key, value] of Object.entries(frontmatter)) {
      fileContent += `${key}: `;
      if (
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim().length === 0)
      ) {
        // skip empty values
      } else if (typeof value === "string") {
        fileContent += escapeDoubleQuotes(value);
      } else if (Array.isArray(value)) {
        fileContent += "\n";
        fileContent += value
          .map((v) => `  - ${escapeDoubleQuotes(v)}`)
          .join("\n");
      } else if (value && value instanceof Date) {
        fileContent += formatDate(value);
      } else {
        fileContent += `${value}`;
      }
      fileContent += "\n";
    }
    // surround wikilinks with quotes
    fileContent = fileContent.replace(/(\[\[.*?\]\])/g, '"$1"');
    fileContent += "\n---\n";
    fileContent += `\n# ${article.title}\n`;
    if (article.summary) {
      fileContent += "\n---\n";
      fileContent += "\n## Summary\n";
      fileContent += `\n${article.summary.markdown}\n`;
    }
    fileContent += `\n${article.content.markdown}\n`;

    return fileContent;
  }

  get uri() {
    const title = "";
    const fileName = getFilename(title);
    const vaultName = this.#vault
      ? `&vault=${encodeURIComponent(this.#vault)}`
      : "";
    return `obsidian://new?file=${encodeURIComponent(this.#folder + fileName)}&content=${encodeURIComponent(this.#article.content.markdown)}${vaultName}`;
  }
}
