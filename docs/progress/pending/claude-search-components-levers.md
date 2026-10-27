## (2026-10-27) — Settings search reaches every lever, Dialog surface included, and Color links to it (#3093)

The owner searched for the dialog color and found nothing. Dialog surface (`raisedSurface`) lives in Components ›
Dialog › Dialog options, and Components' search never looked at its settings.

### The cause

Each page searches its own levers. Components' search (`domains/components.ts`) filtered only the **set rows**
(`rowMatches`: a row's label, its page and its sets' names). The settings blocks after a section's sets (Button, Field,
Search, Tag, Dialog and Banner options) were never searched, and they stay closed until opened by hand. So "dialog" kept
the Dialog section for its one set, with its block closed ("1 setting matches", and no lever in view), and "dialog
surface", "white" and `raisedSurface` matched nothing.

### The fix

- **Components searches its blocks' levers.** `leverBlock` already builds each lever's searchable words (`said`: label,
  description, key). It now records them by the block's element (`saidOf`), so the Components page reads them from
  whatever its blocks drew, with no list of keys to keep. A section shows when a set row or a lever in one of its blocks
  matches; the search opens a block that holds a match, the way it opens a family (call 7 on #2812), and the block shows
  only the matching levers. Each matching lever counts as a hit. The shared block also matches a lever's key. A block
  redraws its levers after an edit, so the page filters again after `brand` and `mode`.
- **The sweep found four more gaps, outside Components.** It searches every lever's manifest label on every page.
  - A page that draws its own label or description hid the manifest's words from search: Page surfaces (drawn as
    Background fills), Font families and Disabled contrast. `leverBlock` now adds the manifest's label and description
    to `said` when the page replaces them.
  - Two blocks hid themselves unless one of their rows matched, even when the block's own words matched: Font families
    and Interactive palettes.
  - Underlined link styles and Italic-only text types have no block of their own. Their words now ride on the block
    that draws their control (`alsoSays`, as Pin a neutral's ride on Neutral hue's since #2175).
- **Color › Surfaces & fills links to the setting.** Before this PR, the page drew no row for `foreground.raised`. The
  "set by Dialog surface" reason lived only in `test-fills-input.ts`. Scrim now ends with a read-only row for the panel
  over the scrim: its swatch, its name and role, and in place of the picker a link, "Set by Dialog surface". The link
  opens Components › Dialog options and focuses Dialog surface's checked chip, as Field options' link to Control shape
  does. The row's name ("Dialog panel") and the link's words are **DRAFT** for the owner.

### The gate

`test:chrome` section `6b` (shard 3, so `test:chrome-shards` holds it to one shard):

- **Sweep.** It reads every lever from the manifest (`levers.ts`, committed as `schema/lever-manifest.json`), visits
  every place, and searches each lever's label. Each lever must show on exactly one page, its home. A typed sample pins
  labels and homes, Dialog surface first, plus every Components block the issue audits. A typed `SEARCH_STANDS_IN`
  names the three levers whose control sits in another lever's block.
- **The issue's four queries.** On Components, "dialog", "dialog surface", "white" and `raisedSurface` each show Dialog
  surface.
- **The Color row.** On both hosts, the row is read-only, the link reads "Set by Dialog surface", and the link lands on
  Components with Dialog options open, Dialog surface in view and its checked chip focused.

Mutations, each on a `wip:` commit, each failing by name:

- Components ignores block levers → the four queries and seven Components levers, e.g. `searching "Dialog surface"
  shows raisedSurface's lever on one page, its home (shown on no page)`.
- The manifest relabels Dialog surface → `raisedSurface's label is "Dialog surface"`.
- The link no longer opens the block → `the link opens Components › Dialog options…`.
- The link's words change → `…its "Set by Dialog surface" a link`.
- The manifest's words are dropped from `said` → Page surfaces, Font families and Disabled contrast.

### Left as is

Search is still per page, as S1.2 built it. A lever is found on its home page, not from another page. Cross-page
results are a design call for the owner, not part of this fix.
