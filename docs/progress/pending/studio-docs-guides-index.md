## (2026-10-16) — Studio: Inspect › Docs opens the designer guides' index (#2662)

Owner Q313.1 A. The web host's Inspect › Docs item opened `/docs/llms.txt` as a stopgap until the designer guides (#2656) had an index. It now opens `/docs/guides/index.md`, which the studio serves from `docs/public/guides/index.md`. The change is one constant, `DOCS_HREF` in `apps/studio/src/shell/pages.ts`.

**The target cannot go missing silently.** `guides/index.md` joins `REQUIRED_DOCS` in `apps/studio/docs-route.mjs`, so `build-site.mjs` fails a deploy without it. `test-prod-bundle.ts` checks the copy lands byte for byte (its expected count goes from 2 to 3 docs files), and `test-docs-route.ts` checks that the dev server answers `GET /docs/guides/index.md` with 200, `text/markdown`, byte for byte.

**The rendered item is checked in `test:chrome`.** No existing assertion read the Docs item's target, although the issue assumed one. A new block opens Inspect on each host at 1280. On the web it reads the one `docs-link` and holds its href to the literal `/docs/guides/index.md`, typed in the test rather than read from `DOCS_HREF`, with `target="_blank"`, `rel="noopener"`, the `menuitem` role and the label "Docs". On the plugin it asserts there is no Docs item, since the plugin has no `/docs` route. The literal is also resolved against `docs/public/` on disk, so a target that names no file fails.

**What a reader sees.** The index is Markdown served as `text/markdown`, so the browser shows it as plain text, and its relative links to the other guides cannot be clicked. `llms.txt` behaved the same way. Rendering the guides as HTML would be a separate decision.

**Not changed.** The plugin has no Docs entry (the item is drawn only when `host === 'web'`), so nothing there follows. `llms.txt` stays the agent entry point, and the dev server's start-up line still names it.
