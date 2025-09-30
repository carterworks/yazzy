# Repository Guidelines

## Project Structure & Module Organization
Yazzy runs on Bun + Hono with `src/server.tsx` as entrypoint. UI components live in `src/components`, route pages in `src/pages`, and shared middleware/services in `src/middleware` and `src/services`. Database artifacts sit in `src/db` with migrations under `src/db/migrations`. Static bundles ship from `src/static`, while public-facing assets stay in `public`. The build emits prerendered output to `dist/`; treat it as read-only. Review `astro.config.mjs` and `drizzle.config.ts` before reworking rendering or persistence wiring.

## Platform & Dependency Philosophy
Default to handwritten code. Every dependency is debt, attack surface, and potential mismatch—add one only when the domain has gnarly edge cases and the library is long-lived and battle tested. Prefer Bun's built-ins and vanilla JavaScript; the platform you already have is the best one. The app is prerendered: most pages ship as static assets even though SSR drives the pipeline. Design for progressive enhancement so HTML and CSS deliver the primary experience and any client JavaScript stays off the critical path.

## Build, Test, and Development Commands
- `bun install` — install dependencies.
- `bun run dev` — hot-reload server and UI.
- `bun run css` — rebuild Tailwind styles from `src/static/styles.css`.
- `bun run build` — compile server, minify CSS, copy Drizzle migrations into `dist/`.
- `bun run check` — run Biome formatting/linting and organize imports.
- `bunx drizzle-kit generate` / `bunx drizzle-kit push` — author and apply schema migrations.

## Coding Style & Naming Conventions
Let Biome set tabs, double quotes, and trailing commas via `bun run check`. Name components/pages in `PascalCase`, helpers in `camelCase`, and keep files tight. Prefer explicit types, async/await, and centralized cross-cutting logic in `src/services`.

## Testing Guidelines
No automated suite ships yet. Use Bun's native runner (`bun test`) when you add coverage, colocating specs near code (e.g. `src/services/__tests__/clipper.test.ts`). Manual QA is still expected: run `bun run dev`, clip sample articles, confirm caching and summaries behave.

## Commit & Pull Request Guidelines
Follow the concise, imperative history (`Update deps`, `0.2.2`). Keep subjects under ~60 characters and group release bumps by version. Install Lefthook (`bunx lefthook install`) to enable the pre-commit `bun check`. Before any PR, run `bun run check` plus relevant tests, describe user-facing changes, link issues, and add screenshots or payloads when UI or API behavior shifts.
