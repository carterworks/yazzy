# yazzy

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)

Website → Markdown/plain text, for archival purposes.

Named after [Jasnah Kholin](https://coppermind.net/wiki/Jasnah_Kholin), famous historian/archivist in Brandon Sanderson's [The Stormlight Archive](https://coppermind.net/wiki/The_Stormlight_Archive).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run check`           | Format and lint the project                      |

## TODO

- Similar to [txtify.it](https://txtify.it/) or [Steph Ango's Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper), but server-side.
- [x] A mobile share target via [PWA `share_target`](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target).
- [x] Do the  "prepend the yazzy url" thing, like "yazzy.fly.dev/https://example.com". 
- [x] Can download the markdown file or copy the text to clipboard.
- [x] Caches text to an sqlite db
- [x] Uses Mozilla's [Readability](https://github.com/mozilla/readability).
- [ ] Has a job queue for processing?
- [ ] Caching headers to static resources
- [x] Bring-your-own OpenAI key for summaries
- [x] Deployed on [Fly.io](https://fly.io/).
- [x] Dark mode
- [ ] Remember which mode (html/markdown/text) was used
- [ ] recognize the language from codeblocks
- [x] Download db dumps
- [x] Recently clipped articles on the homepage
- [ ] A device-centric history
