# Memory-constrained clipping checkpoint

The implementation now delegates Markdown conversion to Defuddle 0.19.2's
Node implementation. Article-local language/direction selection remains in
Yazzy, but it no longer keeps a separate DOM clone or paragraph snapshot.

## Incremental changes

1. `73da9e8` — fix repeated nested-table conversion and add regression tests.
2. `6131857` — resolve locale from the original document after extraction;
   retain a linear longest-paragraph scan and add extraction integration tests.
3. `c54ff70` — expose the standalone converter from Defuddle's Node entry with
   a version-pinned export-only patch; include patches before Docker installs.
4. `70d6eb2` — replace the copied converter with a Node re-export, retaining its
   license notice, and test upstream layout/ragged-table behavior.

The first commit remains a measured performance reference. The final code uses
upstream formatting rather than carrying the custom cell-cache algorithm.

## Measurements

Runs used Bun 1.4.2, local workerd 1.20260730.1 through Miniflare 4.20260730.0,
Linux arm64 Podman containers and two CPUs per profiling container. Before each
code commit, the staged Git tree was exported and built separately from the
working tree. Private fixtures and raw profiles were kept outside the repo.

The 2026-10-20 corpus came from a 5,541-article SQLite dump with SHA-256
`d4031de0d6c547b2214bbdccbde6c74409005b359ba39ca0e0245082e3e57bc0`.
The original-converter measurements below use the uninstrumented
`iterations/00-baseline` results; implementation checkpoints use `steps/01-table`
through `steps/04-shared-markdown`, not earlier exploratory profiles.

| Scope | Original copied converter | Custom cell-cache checkpoint | Final shared converter |
| --- | ---: | ---: | ---: |
| Worst saved newsletter, observed V8 heap | 560.3 MiB | about 10 MiB | 63.9 MiB |
| Same standalone conversion duration | 6.1 s | about 11 ms | 394 ms |
| Full clipping replay, maximum over 29 cases | about 61.5 MiB | about 61.4 MiB | 58.5 MiB |

The standalone newsletter's Markdown output fell from 14,234,121 bytes with the
original converter to 17,429 bytes with the final converter.

Upstream is slower and allocates more than the custom cell-cache implementation
on the standalone archived newsletter case. This tradeoff is explicit: the
actual clipping path remained comparable, and sharing the maintained formatter
removes roughly 830 lines of duplicated implementation and gains upstream
correctness fixes. No claim is made that upstream is the minimum-memory
possible formatter.

The final standalone newsletter conversion completed in a 128 MiB Bun container
with `--smol` and `BUN_JSC_forceGCSlowPaths=1`. Peak cgroup-charged memory was
92.6 MiB; maximum process RSS was 118.8 MiB. These accounting scopes differ and
must not be added together.

Observed V8 heap is not total isolate memory. Local workerd does not enforce
Cloudflare's production 128 MB limit, and sampling/GC timing can change peaks.
Clipping replays wrap saved extracted HTML, not complete original responses.
These results do not certify Astro SSR, OG rasterization or concurrent load.

## Output checks

- All 29 clipping replays completed without conversion fallbacks.
- HTML and locale outputs stayed unchanged in the comparison.
- 23/29 article Markdown outputs were byte-identical; six changed formatting.
  Two changed normalized rendered text; the prior word sequences were retained
  in order, with additions rather than removed words in those samples.
- All 4,065 nonempty saved summaries produced byte-identical Markdown.
- Regression tests cover locale precedence, RTL, duplicate paragraph matches,
  math cells, escaped pipes, layout flattening and ragged-table column retention.

Upstream intentionally flattens nested layout tables and some one-cell
wrappers. Ragged data tables are padded to their widest row, preventing the
previous first-row separator width from dropping trailing columns in Markdown
renderers. This is not a promise of identical formatting for arbitrary HTML.

## Validation

- All 41 tests passed, as did TypeScript and Biome checks.
- The production Astro build completed.
- A production SSR smoke test used an in-memory database and a local synthetic
  article. The initial article count was zero, clipping and reader rendering
  returned HTTP 200, and the ragged table's trailing column was present.

The SSR smoke test checks functionality, not the reader's peak memory use.

## Node export patch

`patches/defuddle@0.19.2.patch` adds one runtime export and its type declaration.
It does not change Defuddle's extraction or formatting algorithms. The public
browser bundle expects DOM globals; the Node entry avoids installing those
globals into the server runtime.

Bun applies the patch from `patchedDependencies`. Docker must copy the patch
directory before `bun install --frozen-lockfile`. A fresh native arm64 install
on Bun 1.2.23 verified the frozen lockfile and patched export. Remove the patch
when an upstream Node entry provides the export directly, keeping the contract
tests during that upgrade.

## Remaining work

- Make reader downloads/copy/Obsidian exports lazy to avoid retaining multiple
  encoded representations in the initial reader response.
- Select and test source-size, DOM-complexity and concurrency budgets against
  original raw pages before moving to a memory-constrained deployment.
- Validate actual platform enforcement with synthetic inputs before migration.

No database contents were regenerated. Previously cached oversized Markdown
remains stored until an explicit, separately validated reprocessing operation.
