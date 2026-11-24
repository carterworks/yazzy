# yazzy

Article → Markdown/plain text, for easy-reading archival purposes.

Named after [Jasnah Kholin](https://coppermind.net/wiki/Jasnah_Kholin), famous historian/archivist in Brandon Sanderson's [The Stormlight Archive](https://coppermind.net/wiki/The_Stormlight_Archive).

## Features

* Extracts the main content from any web article using [Mozilla's Readability](https://github.com/mozilla/readability)
* Converts web content to clean Markdown, HTML, or plain text format.
* Simple URL pattern - just prepend the yazzy URL: "https://yazzy.carter.works/https://example.com".
* Download articles as Markdown, plain text, or copy to clipboard.
* Export in Obsidian-compatible format with frontmatter metadata.
* Dark mode support for comfortable reading.
* AI-powered article summarization.
* Easily self-hostable.
* Database dumps for backing up your article collection.
* Minimalist, distraction-free reading experience.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun run dev`             | Builds the css and starts a reloading dev server |
| `bun run css`             | Builds just the css                              |
| `bun run build`           | Builds a production-ready archive into ./dist    |
| `bun run check`           | Format and lint the project                      |

## Logging

yazzy writes one JSON line per request to stdout (a "wide event") with the route, status, duration, cache hit, clipping step timings, AI model and token usage, memory, and any error. Point any log collector at stdout; nothing is host-specific. Query strings are never logged.

| Variable                 | Default                             | Effect                                                     |
| :----------------------- | :---------------------------------- | :--------------------------------------------------------- |
| `LOG_LEVEL`              | `info`                              | `debug`, `info`, `warn`, or `error`                        |
| `LOG_FORMAT`             | `json` (`pretty` under `astro dev`) | `json` or `pretty`                                         |
| `LOG_MEMORY_INTERVAL_MS` | `60000`                             | How often to log a memory sample; `0` disables it          |
| `AI_ENDPOINT`            | OpenRouter                          | Base URL for an OpenRouter-compatible API                  |

Incoming `x-request-id` or W3C `traceparent` headers are reused as the request ID, and every response carries it back in `X-Request-Id`.

## TODO

- Local history
- A service worker for speed and offline work.
- Reader mode preferences (font size, line spacing, font family)
- Custom CSS themes support for personalized reading experience
- Social sharing with preview cards
