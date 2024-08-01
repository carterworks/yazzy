# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

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
- [ ] Dark mode
- [ ] Remember which mode (html/markdown/text) was used
- [ ] recognize the language from codeblocks

## Setup
To install dependencies:

```bash
bun install
```

To run:

```bash
bun dev # or bun dev for file watching
```

To format/lint:

```bash
bun check
```

To build for production

```bash
bun build
```
