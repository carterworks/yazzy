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
