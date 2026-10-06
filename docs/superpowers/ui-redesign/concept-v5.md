# Prism3 — Concept v5

Prototype: `concept-v5.html` (self-contained, offline, about 1 MB). It is v4 with every decision in
`decisions-2026-09-30.md` and `decisions-2026-09-30-v4-review.md` applied, restyled to the accepted
style tile (A, second pass, T6). It is a design direction for owner review, not product code.

Harness bar (outside the product): **Host** Studio / Plugin · **Frame** Fill / 1280×900 / 380×420 ·
**Device scheme** This device / Light / Dark (studio) or **Figma theme** Light / Dark (plugin) ·
**Plugin file** · **Scenario** First run, Apply running, Build with errors, Read-back warning, Agent
working, Refused edit, Reset. The URL hash sets a state directly, for example
`#frame=380&host=plugin&fig=dark&scenario=builderr`.

## Build and check

```sh
node docs/superpowers/ui-redesign/build-v5.mjs            # writes concept-v5.html
PLAYWRIGHT_MODULE=<repo>/node_modules/playwright/index.mjs \
  node docs/superpowers/ui-redesign/audit-v5.mjs [screenshot dir]
```

`build-v5.mjs` generates the chrome's `--p3-*` variables from the default theme (`pds3`) in light and
dark through `chrome-tokens.mjs`, the resolver it shares with `style-tiles/build-tiles.mjs` (extracted
from the tile build, not forked; the tile still rebuilds byte-identical). It bundles the real engine
with `npx -y esbuild@0.24.0` from the v4 entry, unchanged. It fails, naming the cause, on:

- a manifest lever with no home, two homes, or the wrong advanced tier (from v4);
- a lever section with no home view, two home views, or a home that is an Inspect view (F1);
- a raw hex, color function, length, duration or shadow in the chrome CSS or in an inline style;
- a preview-content selector that does not start with `[data-content]`;
- an undefined or unused `--p3-*` variable, or a chrome color that resolves through a brand role;
- a declared pair under its floor, a translucent ground, or a value that is not a hex color;
- anything that would make a network request.

`audit-v5.mjs` renders the built page in Chromium, in light and dark, at 1280 and 380, in five states
(default, Roles, Build with errors, Inspect › Contrast, plugin). It measures every text node, every
control, indicator and glyph, every focus ring and every target. It also checks which face Chromium
drew, that nothing computes a shadow, the F1, F2 and F3 behavior, and rendered coverage. Every visible
control must be classified, or it fails as an unmarked control. Every column has a literal minimum
count.

## What changed from v4, and why

| Decision | In v5 |
|---|---|
| **F1** Preview follows the section | Every section declares one home view in `HOMES`. The preview follows on a tab change, and when a section scrolls into view or takes focus (250ms debounce). A lever change redraws the view and marks what it drives; it never switches the view. The hand-picked view select is gone: the header names the view and the section it follows ("Palettes · Follows Brand › Identity"). **Keep this view** holds it. **Inspect** (Contrast, Tokens, Decisions log) opens from the header or the verdict, holds the preview until closed, and returns to the section's view. Depth & motion has two sections, Elevation and Motion, with their own homes. |
| **F2** Activity drawer | An **Activity** button in the top bar at every width, with a status dot: a spinning ring while running, red after a failure or warning, neutral for an unread result. It shows and hides the drawer at any time. The drawer opens by itself when an operation starts, yours or an agent's; it collapses 4 s after a success (it waits while the pointer or focus is inside) and the verdict stays on the bar. A failure or warning keeps it open until closed. At 380 a run shows the strip; a failure opens the full-pane sheet. The studio's Export reports here too. |
| **F3, T1, T5, T6** Chrome from tokens, tile A | Every chrome value comes from the default theme's neutral, inverse and status roles, in light and dark. Inter for chrome text, JetBrains Mono for values, both embedded under chrome-only names so a brand that names Inter is still checked against the device. Underline domain tabs, the soft segmented track, chips that keep their fill (2px dark edge, 500, a check), checkboxes and radios in the same pattern, `radius.lg` everywhere, no shadows, Apply Theme the only inverse fill. |
| **F3** Dark mode | Studio: a Light / Dark / System control in the top bar (in ⋯ at 380); System follows the device. Plugin: follows Figma's theme (the harness stands in). |
| **F5, T2** Namespace | In Brand › Identity, visible by default. `prism` shows "‹name› is reserved for the shipped catalog", `pds3` "is the default theme's placeholder", both ending "Set your brand's namespace before you export." Any other value shows the path it produces. A rename previews what it breaks and needs a confirm. The "Proposed · confirm" tag is gone. |
| **T3** Radius | 6px (`radius.lg`); segments inside a track use 4px so the corners are concentric. Larger radius roles are #1852. |
| **Q1** Roles matrix | Stays in the levers panel and scrolls both ways inside its frame, role column and header row pinned. The v4 one-mode list is gone. The previewed column is underlined like a selected tab. |
| **Q2** Verdict count | 884. Health, at the top of Inspect › Contrast, says "221 per mode × 4 modes". |
| **Q3** Dark off | Turning dark off turns high-contrast dark off too. The confirm says so, lists what each drops, and gives the new verdict count. High-contrast dark stays off and locked while dark is off. |
| **Q4** Light cells | Editable, under "Light (base)"; the picker notes that a light override edits the base role. |
| **Q5, Q6, Q7** | Manifest `advanced` rule kept; engine-voiced notes shown as they are; "Use ‹palette›" kept. |
| **Q8** Compare | The Style guide's surface switch sits once above both columns. |
| **Q9** Studio fonts | A "not installed, showing fallback" marker in the preview only; no Health warning and no marker in the levers. The plugin still warns about faces not in this Figma. |
| **Q10** Style guide options | Placeholders, marked "Pending #1784/#1788". |
| v4 review notes | Advanced sections no longer repeat an everyday title (Interactive columns, Strict contrast, Scale limits, Corner base, Shadow tint). The Type view says "Not installed" once. The rendered-DOM coverage recount is committed (in the audit). |

## Live and simulated

**Live:** everything v4 had live. The engine re-resolves the whole system on every edit: palettes,
roles and ratios in every mode, the verdict, type, sizes, spacing, radius, shadows, motion, layout,
tokens, the Decisions log and component defs. The chrome tokens are resolved at build time from
`packages/engine/out/prism3.tokens.json` and its dark overlay.

**Simulated:** every Figma operation (timers), the build-error report, the prune names, the plugin
build stamp, the "In this Figma" font list, the saved brand, Read-back outcomes, the Agent link, and
Export (no file is written). Operation history lives in memory only.

## Measured

Tool output, not retyped. Coverage (`build-v5.mjs`): 49 manifest levers, 49 placed, 0 missing,
0 duplicated, 0 tier mismatches. Home views: 27 sections, each with one (Style guide 7, Palettes 4,
Roles 1, Type 4, Size & shape 4, Elevation 2, Motion 1, Layout 3, Components 1).

Rendered (`audit-v5.mjs`, 20 states):

| | Light 1280 | Dark 1280 | Light 380 | Dark 380 |
|---|---|---|---|---|
| Lowest text | 4.54:1 | 4.58:1 | 4.54:1 | 4.58:1 |
| Lowest edge, indicator or glyph | 3.17:1 | 3.25:1 | 3.17:1 | 3.25:1 |
| Lowest focus ring | 16.00:1 | 16.72:1 | 16.00:1 | 16.72:1 |
| Smallest target | 24px | 24px | 24px | 24px |

The lowest text is `text.secondary` on `foreground.primary` (an unselected mode segment); the lowest
3:1 check is `field.border.rest` on `foreground.primary` (the selected segment's edge on its track).
Both are the tile's own floors. Fonts drawn: embedded Inter and JetBrains Mono on every probe. Shadows
computed outside the brand's preview: 0. Network requests: 0. Rendered coverage: 49 of 49, none twice.

At 380×420, Brand shows two lever rows fully under the 36px top row: Brand name and Token namespace.
Both are schema inputs, not manifest levers. v4 showed three, two of them manifest levers. The tile's
spacing and the namespace moving into Identity (F5) cost the third.

Each gate arm was mutated on a clean commit and fails by name. The build arms:

- a section's home removed: `section with no home view: Depth & motion › Motion`;
- a second home added: `section with more than one home view: Motion`;
- a shadow re-added: `chrome CSS: shadow (T5: no shadows)`;
- the field edge mapped to `border.primary` in the shared map: `pair field-edge on bg-page … 1.38:1`,
  in this build and the tile's;
- a preview rule reaching the chrome: `preview CSS selector can reach the chrome: .btn`;
- a translucent foreground pair: `… is 1.26:1`;
- a translucent ground: `refused, translucent background`;
- a length as a color: `refused, not a 6- or 8-digit hex (8px)`;
- a lever with no home: `manifest keys with no home: density`.

The audit arms:

- the field edge pointed at `border.primary` in CSS: `edge input#lv-search "" 1.38 < 3`;
- the embedded face renamed: `font (want embedded Inter, drew DejaVu Sans (system))`;
- following switched off: `F1 focus: Brand › Personality shows palettes, want guide`;
- a view select put back: `F1 select: the preview header offers 1 hand-picked view select(s)`;
- the collapse removed: `F2 success: the drawer still open 5800ms after a success`;
- a button's edge removed: `unmarked control button#export-btn`;
- the text scan emptied: `measured only 0 (floor 80) text column`.

## Open questions for the owner

Each one is a design call the mockup does not make for you. Each has a recommendation.

1. **The view select is gone (F1).** A view is reached by its section, by a link inside another view
   ("see Components"), or held with Keep this view. *Recommend:* keep it gone. Every view is some
   section's home, and a select invites picking by hand, which F1 rules out.
2. **The view on open is Palettes**, because Brand › Identity is first and its home is Palettes. The
   Style guide shows the brand applied, but Identity edits the palettes. *Recommend:* keep Palettes.
3. **Depth & motion stays one tab with two sections.** Splitting it into two tabs would make eight.
   *Recommend:* keep one tab. The tab's name is yours to change.
4. **Two levers at 380×420, where v4 had three.** *Recommend:* accept the tile's spacing and put Brand
   name and Token namespace side by side at 380. That brings Primary brand color back into view.
5. **At 380 a run shows the strip, not the sheet.** Opening a full-pane sheet on every start would hide
   the work. A failure or warning opens the sheet. *Recommend:* keep.
6. **Compare is not drawn at 380**, where v4 showed it disabled with a reason. Two columns never fit.
   *Recommend:* keep it hidden.
7. **Health lives at the top of Inspect › Contrast.** The verdict opens it (decision 8, F1).
   *Recommend:* keep. The alternative is a fourth Inspect view.
8. **Section names in the advanced tiers** (above) are new, to stop repeated headings. *Recommend:*
   accept, or rename.
9. **Collapse delay:** 4 s after a success. *Recommend:* keep, since the verdict stays on the bar.

## Findings for whoever builds this for real

- The build's raw-value scan cannot see runtime values in inline styles (`${…}`). They are the
  engine's output here, but a hand-typed length inside a template would pass.
- Chrome class names must not appear in the brand's specimen markup. `.field` and `.card` in the
  specimen picked up chrome rules until the specimen used its own names. No gate checks this yet.
- `document.fonts.check()` answers true for a family that is absent. The audit asks Chromium which
  face drew each node (from the tiles), and checks that it is the embedded copy.

## Screenshots

Written by `audit-v5.mjs <dir>` (not committed): `v5-‹theme›-‹1280|380›-‹state›.png` for the five
states, plus `‹theme›-1280-agent`, `-permode`, `-picker` and `‹theme›-380-preview`.
