## (2026-10-16) — Docs: a /docs landing page, linked from the studio header and the plugin (#2637, owner decision Q384 A)

**Status:** Studio, plugin and `docs/public/`. No engine change, no artifact moves, no ENGINE change note, CONTRACT
unchanged, the executor untouched. The owner approved both link placements and the page, copy included, from
screenshots before the push (2026-10-16).

### What changed

- **`docs/public/index.html`, served at `/docs/`.** One plain sentence and three entries: Guides (`guides/index.md`),
  Ecosystem map (`ecosystem/`) and Agent reference (`llms.txt`). Its colors are the ecosystem page's for the same roles
  (light, dark, and the system preference), whose text pairs `lint-ecosystem.ts` already checks at 4.5:1. It adds no
  pair of its own. `REQUIRED_DOCS` now names it, so the site build fails without it.
- **A Docs tile on the bar, just before Export, on both hosts.** It uses the bar's tile parts (a new book glyph over
  "Docs", the glyph alone at the narrow tier, the tooltip) and replaces Inspect's Docs item, which is gone from both
  hosts.
  - **Web:** a link to `/docs/` in a new tab (`linkTile` in `dom.ts`), so the brand being edited stays put.
    `DOCS_HREF` moved from the guides' index to `/docs/`.
  - **Plugin:** a button that posts `open-docs`. The main thread calls `figma.openExternal` on
    `https://prism3-ds.vercel.app/docs/` (`DOCS_URL`, the production address in `apps/studio/README.md`).
- **Why the address is only in the main thread.** `open-docs` carries no URL, so the iframe cannot point
  `openExternal` anywhere else. `openExternal` needs no network permission, so the release build opens it too. The
  release manifest still allows no domains, and `release/main.js` carries the call.
- **`lint-ecosystem.ts` lists `open-docs` as plumbing.** The gate failed the first full verify: every `UiToMain`
  message must sit in a feature's figma lane or on its `PLUMBING` list. Docs is panel chrome, like `set-theme-pref`.
  It can't be a shared feature either: a feature that sends a plugin message cannot claim the web, by the gate's own
  rule.

### Why the slash redirect

Production serves a folder without its trailing slash and without a redirect: `/docs/ecosystem` answers 200, as
`/docs/ecosystem/` does. Served at `/docs`, the page's relative links would resolve one level up. The page carries
the ecosystem page's one-line redirect to the slash path, and every link to it is written with the slash.

### Tests and mutations

- `test-chrome.mjs`: the Docs section replaces the Inspect › Docs one (#2662).
  - **Web:** the tile is a link to `/docs/` in a new tab, just before Export, and clicking it opens `/docs/` in a
    new tab with the studio where it was.
  - **Plugin:** the tile is a button just before Export, and clicking it posts exactly `{"type":"open-docs"}` and
    opens nothing in the panel.
  - **Both:** Inspect lists no Docs item, and the file `/docs/` serves is on disk.
- `test-open-docs.ts` (new, in the plugin's `test`) runs the real `main.ts`:
  - `open-docs` opens the literal address;
  - an address sent with the message is ignored;
  - nothing opens before it.
- `test-docs-route.ts`: `GET /docs/` answers `docs/public/index.html`, byte for byte.

Mutations, from a `wip:` commit, each restored and failing by name. The test:chrome arms ran in a scratch copy of the
suite holding only its setup and this section.

| Mutation | Fails |
|---|---|
| the tile left out of the bar | `✗ web: the bar's Docs is a link to /docs/ in a new tab, just before Export — read null` |
| `DOCS_HREF` back on the guides' index | both web Docs arms, naming `/docs/guides/index.md` |
| the plugin button posts nothing | `✗ figma: Docs posts {"type":"open-docs"} … (posted [])` |
| Inspect lists Docs again | `✗ web/figma: Inspect lists no Docs item … read ["Docs"]` |
| the `open-docs` case dropped from `main.ts` | `✗ open-docs opens the docs landing page in the browser … (opened [])` |
| `DOCS_URL` on another address | the same arm, naming the address it opened |
| `docs/public/index.html` absent | `✗ GET /docs/ answers 200` in `test-docs-route.ts` |

### A trap for whoever re-verifies this

**A tile that is a link picks up the link hover underline.** The first web screenshot showed "Docs" underlined on
hover, unlike every other tile. `.p3-btn.p3-tile` now sets `text-decoration: none`.
