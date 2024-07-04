# yazzy

Website → Markdown/plain text, for archival purposes.

Named after [Jasnah Kholin](https://coppermind.net/wiki/Jasnah_Kholin), famous historian/archivist in Brandon Sanderson's [The Stormlight Archive](https://coppermind.net/wiki/The_Stormlight_Archive).

## Ideas/plan

- Similar to [txtify.it](https://txtify.it/) or [Steph Ango's Obsidian Web Clipper](https://stephango.com/obsidian-web-clipper), but server-side.
- [x] A mobile share target via [PWA `share_target`](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target).
- [x] Do the  "prepend the yazzy url" thing, like "yazzy.fly.dev/https://example.com". 
- [x] Can download the markdown file or copy the text to clipboard.
- [x] Only hotlinks the images (for now?)
- [x] (Partially working) Caches text to an sqlite db
    - inserting into the cache is broken, but only in docker containers
- [x] Uses Mozilla's [Readability](https://github.com/mozilla/readability).
- [x] Runs on [Bun](https://bun.sh).
- [ ] Has a job queue for processing?
- [ ] Caching headers to static resources
- [ ] Bring-your-own OpenAI key for summaries
- [x] Deployed on [Fly.io](https://fly.io/).

## Setup
To install dependencies:

```bash
bun install
```

To run:

```bash
bun start # or bun dev for file watching
```

To format/lint:

```bash
bun check
```

This project was created using `bun init` in bun v1.1.15. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
