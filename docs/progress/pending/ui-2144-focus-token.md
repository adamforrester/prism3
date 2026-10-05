## (2026-10-05) — Studio: every chrome focus ring draws in Prism3's focus color (#2144)

**Status:** `apps/studio/chrome/` (`tokens.mjs`, `spec.mjs`, `esbuild-plugin.mjs`), `apps/studio/src/chrome.css`, one rule in
`apps/studio/src/styles.css`, and `test:chrome`. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. Visible:
every chrome focus ring changes from the text color to Prism3's `color.border.focus` (light `#1e1eff`, dark `#4f79fa`).

### What changed

The owner chose FR1 A on #2144: the chrome's focus rings use Prism3's `color.border.focus`, which resolves through
`core.palette.primary`. Keeping brand color out of the frame is a preference for a minimal frame, not a ban, and focus
rings are the accepted exception.

- **The one exception, by name.** `BRAND_RE` is unchanged, so `border.focus` is still a brand path. `brandLeaks` now skips
  exactly one row: `BRAND_ALLOW` maps the variable name `focus-ring` to the one path it may read, `color.border.focus`.
  The name is matched exactly and the path must match too. Every other chrome variable on a brand path still fails `[brand]`.
- **The variable.** `--p3-focus-ring` is a `PRODUCT_VARS` row (`spec.mjs`), the same path in light and dark, listed in
  `SHELL_VARS`. Its four pairs (page, levers panel, top bar, inset, all at 3:1) are a new `PRODUCT_PAIRS`, beside the
  mockup's `PAIRS`. They are kept out of `PAIRS` because `build-v6.mjs` reads `PAIRS` and refuses a name it has no row
  for. The lowest pair is 4.16:1 (dark, top bar).
- **The rings.** All ten focus rules in `chrome.css` read `--p3-focus-ring` instead of `--p3-ctl-edge`, at the same width
  and offset: the shared control rule (`.p3-btn`, Continue, chips, selects, menu items, the verdict), the tab's
  `::before`, search, the two panes, the color, hex, range, step and add fields, text fields, jump links, `.p3-lsec`,
  `.p3-icol` and the value picker. `--p3-ctl-edge` stays for the selected and pressed edges, and its four `PAIRS`
  descriptions no longer claim a focus ring.
- **`styles.css`.** Six rules there still draw a focus ring. One is on screen: `.cset-radio`, the plugin's set radios in
  the Components preview. It now reads `--p3-focus-width`, `--p3-focus-ring` and `--p3-focus-offset` (2px, the same as
  before). The other five (`.chips-in`, `.shape-card`, `.shape-release`, `.mstep`, `.mreset`) style classes no markup
  wears. They are already on #2116's dead-class list, so this change leaves them for that sweep.

### The tests, and why they are independent of the CSS

- **The expected color comes from the emission.** `test-chrome.mjs` reads `packages/engine/out/prism3.tokens.json` and
  the dark overlay and walks `color.border.focus`'s alias chain with its own few lines (`FOCUS_HEX`). It does not read
  `chrome.css`, the spec row, or `tokens.mjs`'s `resolve`. That resolver also writes `--p3-focus-ring`, so a resolver bug
  would agree with itself (docs/34, shape 2).
- **What is held.** Each ring's computed color matches that hex for its mode. A ring inside a lent legacy view is the
  light ring, because those views are pinned light. Each ring is at least 2px wide and sits at least 2px outside the
  control. The exceptions are the two scrolling panes, whose ring sits fully inside their edge (S2), and the tab, whose
  `::before` ring reaches past the tab's box on each side. Each ring is at 3:1 against what is outside it.
- **Where.** In section 1, every host, theme and width, on the opening page and on Brand. In the new section 27, the
  whole tab order of all nine places, both hosts, both themes, at 1280: 838 rings on the web and 894 in the plugin, light and dark together. It has
  literal floors (web 820, plugin 870, and 15 per place) and a literal list of controls it must reach, by hook:
  Continue, a chip, a text field, the hex field, a tab, a Color sub-page, a slider, Export, search, the mode option and
  Inspect, plus Apply and the set radio in the plugin.
- **The exception's own canaries.** The real map has one variable on a brand path, the allowed one, so it cannot show the
  exception is still narrow. `BRAND_CANARIES` in `esbuild-plugin.mjs` run `brandLeaks` on four literal rows on every
  build. `focus-ring` on `color.border.focus` must pass. `focus-ring-hover` on it, `ctl-edge` on it, and `focus-ring` on
  `core.palette.primary.600` must each fail.

### Mutations, each failing by name

- Continue's ring back on the text color (`.p3-next:focus-visible { outline-color: var(--p3-text) }`) →
  `#2144 web light 1280: every focused chrome control draws its ring in color.border.focus (#1e1eff) … palettes-continue:
  color #0d0d0e`. It fails the same way in every column of section 1 and for every place's Continue in section 27.
- `ctl-edge` pointed at `core.palette.primary.600` → `[brand] chrome var --p3-ctl-edge (light) resolves through brand
  token pds3.core.palette.primary.600`. `ctl-edge` pointed at `color.border.focus` → `[brand] chrome var --p3-ctl-edge
  (light) resolves through brand token pds3.color.border.focus`.
- The allowlist widened to a pattern (`/^focus/.test(v[0])`) → `[brand] self-check: brandLeaks no longer refuses a sibling
  name on the focus color` and `… the focus ring pointed at the primary palette`. Widened by path instead
  (`v[1] === 'color.border.focus'`) → `… a sibling name on the focus color` and `… a non-focus variable on the focus color`.

### A trap for whoever re-verifies this

The plugin's set radio sits in Components' preview, a lent view pinned light. Its ring is `#1e1eff` even with the chrome
in dark, which is correct: the variable resolves in the light block there. A check that expected the chrome theme's hex
everywhere failed only on that one control, in the plugin, in dark.
