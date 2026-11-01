## (2026-11-01) — Components' preview header: no Inspect; the empty row kept at wide widths, collapsed at 380 (#3149)

**Status:** panel (both hosts), built as the owner decided (Q3149.1–.4, all A). ENGINE patch (change note): no
committed artifact, emission or component surface moves.

### What it does

- **Inspect comes off the Components page's preview header**, on the plugin and the web (Q3149.2 A, Q3149.4 A): one
  rule in `chrome.css`, beside #3144's mode-control rule, hides the menu's wrap on `[data-place="components"]`. The menu
  stays mounted for every Theme page, where it opens Contrast and Tokens for the theme being edited, and the build stamp
  and the privacy note at its foot stay reachable there (Q3149.3 A).
- **The empty header row** (since #3129 R3 and R4, Inspect was all it held): at wide widths it stays, so the preview's
  divider still meets the levers header's at one y (S1.3, Q2). At the narrow tier the Preview pane has no levers pane
  beside it to line up with, so the row collapses and gives its 56px back (Q3149.1 A).

### Verification

- `test:chrome` section `3149` (shard 1), on both hosts at 1280 and 380: a Theme page (Brand) keeps Inspect in its
  preview header (the oracle); Components shows no Inspect (`hooks.absent`, against that oracle); at 1280 the empty row
  stays with its bottom edge on the levers header's; at 380, on the Preview pane, it collapses. `expectFor`'s Components
  preview header now expects nothing.
- Mutations, each after a `wip:` commit, each failing by name: Inspect restored on Components (the `.p3-popwrap` rule
  dropped) → `3149 <host> 1280` and `… 380: Q3149.2 A: Components shows no Inspect`; the 380 collapse dropped →
  `3149 <host> 380: Q3149.1 A: the empty header row collapses`; the collapse unscoped from the narrow tier →
  `3149 <host> 1280: Q3149.1 A: the empty header row stays`.
