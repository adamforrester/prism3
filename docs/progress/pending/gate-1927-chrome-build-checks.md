## (2026-10-03) — chrome build checks: [license] and [pairs] can't switch themselves off; the raw scan reads nested rules and hwb() (#1927)

**Status:** `apps/studio/chrome/` only (`esbuild-plugin.mjs`, `tokens.mjs`). No studio source change, no
engine change, no ENGINE bump. The real build on `main`'s `chrome.css` passes unchanged, with 0 errors.

### A. [license] checks every embedded face against its own literal

The check looped over `notices`, the list the notice writer fills, so a face the writer skipped was a face
the checker never asked about. On `main`, deleting `notices.push([family, line]);` builds green, with no OFL
notice in the bundle. It now loops over `CHROME_FONTS`, every face the CSS embeds. It also expects a literal
per face, `LICENSE_COPYRIGHT`, instead of the writer's `COPYRIGHT_RE`. That pattern was the one definition
the checker shared with its subject (the second review on the issue): loosening it to `/Copyright/` builds
green on `main` with a notice reading "Inter: Copyright.". The OFL file is held to the literal too, so a
swapped font fails and asks for a deliberate update.

### B. A PAIRS or DECORATIVE name with no row fails by name

`if (!mapped.has(fg) || !mapped.has(bg)) continue;` treated "not mapped yet" and "names nothing" alike. A
name with no row in TILE_VARS, V6_VARS or PRODUCT_VARS (every row the shell reads) now fails. A name with a
row that SHELL_VARS does not list yet is still skipped, legitimately.

**The issue's own mutation no longer isolates the hole on `main`**, because PAIRS has grown since it was filed:
`text` now also pairs with `bar-bg`, `fill-1` and `levers-bg`, and neutral 500 fails those too, so `main`
goes red anyway. The hole is shown instead by the typo plus an impossible 21:1 floor on that pair, with no
color change. `main` skips the misspelt pair and builds green; the fix fails naming `--p3-bg-pgae`.

### C. The strict raw scan reads every nesting level, and hwb()

- **Nesting.** Only the innermost `{ … }` blocks were read. A declaration INSIDE a nested rule was therefore
  already caught; one BESIDE a nested rule (`.a { color: red; & .b { … } }`) was not. `declarations()` now
  walks the braces and reads every level; a rule's prelude (selector, `@media (…)`) is never read as one.
- **Property-aware**, so reading more refuses no more: `IDENT_VALUED_PROPS` lists the properties whose
  values are custom identifiers (`grid-area: tan`, `animation-name: gold`), which are not read for color
  names. The list is short; every other property is read, so an unfamiliar one fails closed.
- **`hwb(`** joins RAW's color functions. No mockup uses it, so their builds do not move.
- **`RAW_CANARIES`**: the scan now checks itself on every build, against literal must-flag and must-pass
  cases. `main`'s `chrome.css` carries no nested declaration and no `hwb()`, so without them a scan that
  lost either reach would pass it unchanged.

### Mutations

| Mutation | Fixed checks | `main`'s checks |
|---|---|---|
| A1: delete `notices.push([family, line]);` | `[license] the bundled CSS carries no license notice for Inter …`, and JetBrains Mono | exit 0 |
| A2: `COPYRIGHT_RE` loosened to `/Copyright/` | the same two `[license]` lines | exit 0 |
| B′: `bg-page` → `bg-pgae` on the body-text pair, floor 21 | `[pairs] PAIRS names --p3-bg-pgae, which no row … defines (text on bg-pgae, body text on the page)` | exit 0 |
| B: the issue's mutation (typo + dark text.primary → neutral 500) | the `bg-pgae` line, plus the other `text` pairs | red, on the other pairs only |
| C1b: `.p3-mutation-probe { color: red; & .b { … } }` in `chrome.css` | `[raw] … named color "red" (color)` | exit 0 |
| C2: `color: hwb(0 0% 0%)` in `chrome.css` | `[raw] … raw color function "hwb("` | exit 0 |
| C3: the scanner back to innermost-only | `[raw] self-check: the strict scan no longer flags a named color beside a nested rule …` | n/a |
| C4: `hwb` dropped from RAW | `[raw] self-check: the strict scan no longer flags an hwb() color …` | n/a |

### Decided, filed as #2027

System colors only inside `@media (forced-colors: active)`; `color-mix(…)` only over `var(--…)` tokens. Today's
`chrome.css` uses neither.

### Found, not fixed (out of scope): filed as #2028 and #2029

- The plugin's `assertNoAbsolutePath` (`apps/plugin/build.mjs`) scans the embedded base64 font data, which could by chance contain `/tmp/x`,
  `/var/x` or `/root`. Fixed output passes today; a font swap could trip it with a confusing message.
  Excluding `data:` URIs from that scan would avoid it.
- `regen --check` deletes and restores `packages/engine/out`; a chrome build that reads `out/` during that
  window fails with `[map] cannot load the default theme…`. Only a regen and a build run by hand at the same
  time can hit it (`verify.ts` and CI run one step at a time).
