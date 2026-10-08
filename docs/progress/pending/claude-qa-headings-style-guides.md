## (2026-10-08) — Studio QA: one heading outline per page (#2212), and an agent's style guide run no longer shows beside the panel's tables (#2313)

The UI redesign's last QA batch, part 2 of 2: two technical fixes that change nothing a sighted user sees.

### #2212: the levers pages' heading outline

**The defect.** A screen-reader user moving by headings met no h1 on any page. The levers pane opened with h3 sections
ahead of the preview's h2, so it skipped from nothing to 3. Color › Surfaces & fills' row sub-headings and Interactive's
group titles were h4 under those h3s, and the preview's sub-heads were h3s beside the h3 sections they sit inside.
Nothing tested the outline: section 30's sweep held the levers' visual levels and skips within the levers pane, but never
the page's whole outline.

**The change, tags only.** Every heading here has its own class with its size, weight and margins set, so no UA heading
style shows through, and the pages draw exactly as before:
- **One h1 per page**, in the frame head ahead of the tab row and both panes (`data-p3="page-heading"`, `.p3-sr`). Its
  text is the page's name **as its tab shows it** (Brand, Palettes, Surfaces & fills, Interactive, Type, Shape, Depth &
  motion, Layout, Components), so it adds no wording. It sits outside both panes so that both narrow panes, Settings and
  Preview, open on it. The Build style guides page draws its own h1, so the frame's h1 leaves the document there.
- **Levers:** section titles (`.p3-lsec-title`, L1) h3 → h2. Row sub-headings (`.p3-rows-sub`) and Interactive's group
  titles (`.p3-icol-title`, both L2) h4 → h3. Lever names stay `label`, `span` or `legend`, as the issue allowed: each
  one labels its control, so it isn't in the outline.
- **Preview:** the title stays h2 and its sections stay h3. A section's sub-head (`.sub-t`, `subHead()`), drawn smaller
  inside its section, goes from h3 to h4.

**Tried and dropped:** the h1 first took the preview's title (`viewLabel`), which on Brand reads "Style guide". That isn't
the page's name, so the tab's label is used instead. With no `font` of its own, the h1 also took the browser's bold at
2em, which the embedded Inter doesn't carry, and `test:chrome`'s font audit refused it as a device face. `h1.p3-sr` now
sets `margin: 0; font: inherit`.

**The test.** `test:chrome` section 36 reads the outline from the browser's accessibility tree (CDP
`Accessibility.getFullAXTree`, walked in tree order, ignored nodes dropped), never the DOM. It runs on both hosts at 1280
and at 380, on every place, on the Settings pane and on the Preview pane at 380, and on the plugin's Build style guides
page. Each outline must open on exactly one h1, named as the page's tab (typed in the test), and never skip a level.
Mutations, each after a `wip:` commit, on rebuilt bundles, each failing by name:
- the frame's h1 made a `div` → `#2212 web light 1280 / brand: the outline opens on one h1, "Brand", and holds no other —
  read h2 Identity | …` (every place, both hosts, both widths).
- Surfaces & fills' section title back at h3 → `#2212 web light 1280 / color-fills: no heading skips a level after the
  one before it — h1 "Surfaces & fills" then h3 "Background fills"` (4).
- its first row sub-heading back at h4 → `… — h2 "Background fills" then h4 "Default"` (4).

### #2313: an agent's style guide run after a panel run (reproduced)

**Reproduced first**, in a new arm of `apps/plugin/test-style-guides-page.mjs`, the built panel. A panel run draws two
tables ("✓ style guide: 2 tables"). Then an agent's `style-guide` run is posted the way the plugin posts it: bracketed by
`agent-started` / `agent-finished`, its verdict forwarded to the panel, and no per-table messages, because the main
thread sends those to the panel's own sink only. On `main` the page then showed **"✓ style guide: 5 tables" beside the
panel's two tables**, so it read as if the agent's run had drawn them. Confirmed, so the issue is fixed rather than closed.

**The fix** (`state/host-session.ts`, `reduce`): when `style-guide-result` arrives while an agent's style guide run is
open and the panel's own is not pending, the panel's earlier run (`styleGuideRun`) is dropped. The page then shows its
selection summary again, and the agent's verdict stays where it already was, in Activity. That matches what the page did
with no earlier panel run.

**Not decided here:** whether the Build style guides page should show an agent's verdict at all. On `main` it showed one
only by mixing it with the panel's old run, never on its own. Showing it would be a visible change, so that is left to
the owner.

Mutation: the reducer keeping `styleGuideRun` on an agent's verdict → `#2313: after an agent's run, the page shows no
verdict beside the panel's earlier tables (verdict "✓ style guide: 5 tables", tables ["Core — base:Done","Primary:Done"])`
and `#2313: the page drops the panel's earlier run …`.
