# yazzy

Website → Markdown/plain text, for archival purposes.

Named after [Jasnah Kholin](https://coppermind.net/wiki/Jasnah_Kholin), famous historian/archivist in Brandon Sanderson's [The Stormlight Archive](https://coppermind.net/wiki/The_Stormlight_Archive).

## Ideas/plan

- Similar to [txtify.it](https://txtify.it/) or [Steph Ango's Obsidian Web Clipper](https://stephango.com/obsidian-web-clipper), but server-side.
- A mobile share target via [PWA `share_target`](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target).
- Also can (maybe) to the "prepend the yazzy url" thing, like "yazzy.ai/https://example.com". 
  - But sharing/pasting the full text or HTML works better.
- Can download the markdown file or copy the text to clipboard.
- Only hotlinks the images (for now?)
- (Maybe? Eventually?) Caches text to an sqlite db?
- Prefers the [Full-Text RSS API](https://rapidapi.com/fivefilters/api/full-text-rss) or RSS contents, but can also scrape the page and use [Mercury Web Parser API](https://mercury.postlight.com/web-parser/) or Mozilla's [Readability](https://github.com/mozilla/readability).
- Runs on [Bun](https://bun.sh) and built with [HTMX](https://htmx.org/).
- Has a job queue for processing?
- (Maybe?) Deployed on [Fly.io](https://fly.io/).

## Setup
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.15. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
