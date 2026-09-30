# Prism3 — Concept v6

Prototype: `concept-v6.html` (self-contained, offline, about 1 MB). It is v5 with the owner's v5 review
applied (`decisions-2026-09-30-v5-review.md`: V1–V13, IA-1–IA-3, B1). The v4 review and the Phase 1
decisions still apply wherever the v5 review does not override them. It is a design direction for owner
review, not product code. The v5 files are unchanged.

The harness bar is as in v5. The URL hash adds `domain`, `sub` and `roles`, for example
`#frame=1280&domain=color&sub=fills&roles=1`.

## Build and check

```sh
node docs/superpowers/ui-redesign/build-v6.mjs            # writes concept-v6.html
PLAYWRIGHT_MODULE=<repo>/node_modules/playwright/index.mjs \
  node docs/superpowers/ui-redesign/audit-v6.mjs [screenshot dir]
```

`build-v6.mjs` keeps every v5 check and adds these:

- homes belong to tabs and sub-pages (V1). A page with no home or two homes fails. A tab with sub-pages
  that declares its own home fails, and so does a section that declares one. So does a view that is
  no page's home, and a duplicate key anywhere in HOMES (a second parser, because `JSON.parse` keeps
  the last key silently);
- every color role the engine emits (268, read from `packages/engine/out/prism3.tokens.json`) belongs to
  exactly one Color sub-page's Roles matrix (V2);
- the advanced tier follows the manifest, except on a literal list of pages that show every lever (see
  the rule below);
- the declared pairs cover every edge-on-ground combination in both themes (B1), and the preview, the
  levers panel and the top bar must be three distinct steps in one direction (IA-2).

`chrome-tokens.mjs` is unchanged. v6's per-theme rows (`levers-bg`, `bar-bg`, `edge`, `edge-bar`) live
in the build.

`audit-v6.mjs` renders 13 states × 2 themes × 2 widths. The states are each Color sub-page with Roles
off and on, Brand, Depth & motion, Layout, the build failure, Inspect, the plugin, and the plugin with
the Agent popover open. It measures text, edges, indicators, glyphs, focus rings, targets, fonts and
shadows, as v5's did, and every control must be classified. The behavior checks use literal oracles (the
decided IA and role families), not the page's own data:

- each page shows its one home;
- scroll and focus never move the preview;
- nothing offers "Keep this view";
- Roles switches to the right families and back;
- the layers are ordered, and fields on the gray panel are white;
- the Agent chip works.

## What changed from v5, and why

| Decision | In v6 |
|---|---|
| **IA-1** Tabs | Brand · Color · Type · Shape · Depth & motion · Layout · Components. Brand holds Identity, Personality and Modes. Color has a second tab row, a segmented `tablist`: **Palettes · Surfaces & fills · Interactive**. |
| **V1, V12** One preview per page | Each tab, or Color sub-page, has one home view. The preview changes only when the page changes. Scroll, focus and lever changes never move it. "Keep this view" is gone, because nothing moves the view on its own. Inspect still opens over the home and closes back to it. A link to another view ("see Components") now opens that tab. |
| **V2** Roles | On each Color sub-page the preview title is two text tabs: the view and **Roles**. Roles shows the editable role × mode matrix for that sub-page's families, with the header row and role column pinned, light cells editable (Q4) and derived columns hatched. It replaces Q1's "matrix in the levers panel". |
| **V3** IA | Decided as IA-1. |
| **V4** Depth & motion | One preview, with **Elevation** and **Motion** stacked under 20px headers. |
| **V5, IA-2** Layering | White preview; neutral 025 levers panel; neutral 050 top bar with a hairline. Cards and fields on the gray panel are white. Dark: see below. |
| **V6, B1** Edges | Near 3:1 on every ground (table below). |
| **V7** Palettes | A container per group (brand palettes, neutral, status, alpha). Each palette has a 56px hero swatch, its hex, a token chip, the roles it drives and an anchor pill. Under that are two strips of ten large squares with a hairline, and the step and hex under each. A dashed **+ Add brand color** is in the levers. |
| **V8** Richness | Cards with hairline edges and tracked small-capital titles. Backgrounds have live sample chips (6.png). Fills have big fill samples and contrast badges (9.png). Gradients span their card at 160px (7.png). Selects are 40px with 16px padding. The type ladder is 20 / 16 / 14 / 12. |
| **V9** Step picker | Kept, and reused for the matrix cells and the fill rows. |
| **V10** Missing controls | Fills and the interactive settings are first-class on their sub-pages (the rule is below). |
| **V11** Layout | Breakpoints as a to-scale band in the brand's primary tints; each breakpoint's columns as tinted bands on a gray margin; containers to scale. |
| **V13, IA-3** Agent link | Plugin only: an **Agent: Off** chip in the top bar (icon only at 380) opens a popover. It holds the switch, one line on what the link does, and the transport and last command while the link is on. The drawer has no switch; it logs agent work and says when the link is on. The agent scenario shows **Agent: On**. |
| **Q3 (v5)** | Brand name and Token namespace sit side by side at every width, with the namespace notes spanning both. |

Also new: gradient stops are editable (kind, angle, interpolation, stop palette, step, position). v5
stubbed them.

## The levers and the preview, per Color sub-page

The rule: **the levers edit and the preview shows the result, big.** The Roles matrix is the one
editable thing in the preview (V2).

- **Palettes.** Levers: Primary, Brand colors (rows, remove, dashed add), Neutrals (follow primary or a
  custom tint, chroma); behind Show advanced, the pinned neutral and Status colors. Preview: every ramp
  as large squares in containers, the anchors, and the roles each palette drives. Roles: `text`, `icon`
  (36 roles).
- **Surfaces & fills.** Levers: page surfaces (page, contrast floor, inverse band, per mode). Foreground
  fills are a row per fill (brand, success, warning, info, danger), each with the step picker and its
  ratio. The gradient editor is here too. Preview: backgrounds with live samples and ratio badges; each
  fill as a big sample with its badge; each gradient across the card. The levers show only a small swatch
  and a 44px gradient bar, to say which one you are editing. Roles: `background`, `foreground`, `border`,
  `scrim`, `veil`, and `inverse` except inverse interactive and inverse links (85 roles).
- **Interactive.** Levers: Actions (action palette, outline hover, neutral emphasis), Interactive palettes
  (columns and anchors, strict contrast), Links (link palette, link states), Legibility (icon contrast,
  disabled strategy and floor). Preview: every column filled and outline at rest, hover and pressed, with
  the on-fill and outline-text badges; links in four states; icons and disabled; the inverse band.
  Roles: `interactive`, `inverse.interactive`, the four link families, `disabled`, `inverse.disabled`,
  `field`, `inverse.field` (147 roles).

Every brand specimen sits on the brand's own page color for the previewed mode, never on the chrome's
card (see Findings).

## The advanced-tier rule

**The manifest's `advanced` flag decides the tier, except on pages that exist for one topic, where every
lever is shown: Layout (Q4), Color › Surfaces & fills and Color › Interactive (V10).** Palettes keeps the
flag: the pinned neutral and the four status colors are behind Show advanced. Four flagged levers are now
shown by default: `surfaces`, `interactivePalettes`, `strictInteractiveContrast` and `linkStateRungs`.
The foreground fills were never manifest levers (they are role overrides), so no flag hid them; they had
no row outside the matrix. This extends Q4/Q5's rule, so it is open question 2. The build holds the list
of pages as a literal (`FIRST_CLASS`), so the page's data cannot widen it.

## Layering (IA-2) and edges (B1)

| Surface | Light | Dark |
|---|---|---|
| Preview | `background.primary` (white) | `background.primary` (neutral 950) |
| Levers panel (`levers-bg`) | `core.palette.neutral.025` (no role) | `background.secondary` (neutral 900) |
| Top bar (`bar-bg`) | `background.secondary` (neutral 050) | `background.tertiary` (neutral 850) |

The dark ramp has no step between 950 and 900, so the dark panel lands on a real role. The same order
holds in both themes: each step moves away from the preview. The cost is that `text.secondary` is 4.17:1
on neutral 850. Nothing on the dark top bar is set in secondary text, and the Color sub-page labels stay
primary; the selected one is told apart by fill, edge and weight. **Neutral 025 as `levers-bg` is a
possible engine role** (a panel surface between the page and `background.secondary`). It is noted here,
not filed.

Edges (build output, floored):

| Ground | Light | Dark |
|---|---|---|
| Page, card, menu (`edge`) | `border.secondary` 3.27:1 | `field.border.rest` 3.52:1 |
| Levers panel (`edge`) | `border.secondary` 3.06:1 | `field.border.rest` 3.25:1 |
| Top bar (`edge-bar`) | `field.border.rest` 3.17:1 | `border.secondary` 3.52:1 |
| Inset: track, picker, per-mode body (`field-edge`) | `field.border.rest` 3.17:1 | `field.border.rest` 3.25:1 |

In dark, neutral 600 would fail on 950 and 900 (2.91:1, 2.68:1), and `field.border.rest` fails on the
850 bar (2.92:1). So each ground takes the token that clears 3:1 closest. The page sets one variable
per ground (`--t-edge`).

## Live and simulated

**Live:** everything v5 had live. The engine re-resolves the system on every edit, including the new
fill rows and gradient editing. Chrome tokens resolve at build time.

**Simulated:** every Figma operation, the build-error report, prune names, the plugin build stamp, the
"In this Figma" font list, the saved brand, Read-back outcomes, the Agent link and its transport, and
Export (no file is written).

## Measured

Tool output, not retyped. Build: 49 manifest levers, 49 placed, 0 missing, 0 duplicated, 0 tier
mismatches. There are 9 pages over 7 tabs, and each has one home. All 268 color roles are placed, none
twice.

Rendered (`audit-v6.mjs`, 52 renders):

| | Light 1280 | Dark 1280 | Light 380 | Dark 380 |
|---|---|---|---|---|
| Lowest text | 4.54:1 | 4.58:1 | 5.51:1 | 4.58:1 |
| Lowest edge, indicator or glyph | 3.06:1 | 3.25:1 | 3.06:1 | 3.25:1 |
| Control edges (B1), lowest–highest | 3.06–3.27:1 | 3.25–3.52:1 | 3.06–3.27:1 | 3.25–3.52:1 |
| Lowest focus ring | 16.00:1 | 15.00:1 | 16.00:1 | 15.00:1 |
| Smallest target | 24px | 24px | 24px | 24px |

The lowest text is `text.secondary` on a mode segment's track (as in v5). The lowest edge is the search
field on the gray levers panel. Fonts drawn: embedded Inter and JetBrains Mono on all 9 probes. Shadows
outside the brand's preview: 0. Network requests: 0. Rendered coverage: 49 of 49, none twice.

Behavior: 9 pages on their homes; 18 scroll checks and 29 section focus checks with no preview change;
a lever change and Inspect checked; 3 Roles toggles checked. IA-2 renders white / #f7f7f7 / #e9e9e9 in
light and #0d0d0e / #171718 / #212123 in dark.

## Mutations

Each ran on a clean commit, asserted that its edit applied, and fails by the named assertion.

Build:

- a sub-page's home removed: `sub-page with no home view: Color › Surfaces & fills`;
- a second home key: `HOMES declares a key twice: "home" in … (fills)`;
- a section given a home, which is how scroll-following would come back as data:
  `section declares a home view: Color › Surfaces & fills › Surfaces`;
- the levers panel pointed at white: `layer levers-bg on bg-page … is 1.00:1 in light`;
- the top-bar edge pointed at `border.secondary`: `pair edge-bar on bar-bg … is 2.70:1 in light`;
- a role prefix dropped (`veil`): `color roles in no Color sub-page's Roles matrix: veil.dark.subtle, …`;
- fills hidden behind advanced: `surfaces: … placed advanced in Color › Surfaces & fills › Surfaces
  (every lever on this page is shown)`.

Audit:

- scroll-following re-enabled: `V1 scroll: color/palettes scrolled to 50% changed the preview to guide`;
- focus-following re-enabled: `V1 focus: color/palettes section 1 changed the preview to guide`;
- Keep this view re-added: `V12 keep: brand offers Keep this view`;
- a top-bar control given the page edge in CSS: `edge button#export-btn "Export" 2.70 < 3`;
- the levers panel painted white in CSS: `IA-2 layers: light … steps 1.00 and 1.21`;
- the Roles toggle disconnected: `V2 roles: color/palettes Roles shows palettes, want the role × mode matrix`;
- the family filter removed: `V2 families: color/palettes shows families from another sub-page: background, …`;
- the switch put back in the drawer: `IA-3 drawer: the Activity drawer still holds 1 switch(es)`;
- Brand's and Components' homes swapped (the build passes; each view still has one home):
  `V1 home: brand shows comps, want guide`.

## Open questions for the owner

Each is a design call. Each has a recommendation.

1. **The app opens on Color › Palettes** (v5 Q2), so the first tab, Brand, is not the open one.
   *Recommend:* keep Palettes, the first thing a new brand sets. The alternative is to open on Brand,
   which shows the Style guide.
2. **The advanced rule changes (V10 against Q4/Q5).** Every lever shows on Surfaces & fills and on
   Interactive. *Recommend:* accept. Should Status colors on Palettes join them? *Recommend:* no; they
   are Auto by default and read as refinements.
3. **Role families.** `field` and `disabled` sit under Interactive; `scrim` and `veil` sit under
   Surfaces & fills; `inverse.text` and `inverse.icon` sit under Surfaces & fills while `text` and
   `icon` sit under Palettes (the decision's "inverse"). *Recommend:* accept; the alternative is to move
   inverse text and icon to Palettes.
4. **Brand's preview is the Style guide.** *Recommend:* keep; personality and modes change the whole
   system, not one view.
5. **The fill rows edit the light (base) value.** Other modes are in Roles. *Recommend:* keep, as the
   Surfaces row does.
6. **The dark top bar is neutral 850, so it carries no secondary text.** *Recommend:* accept. The
   alternative, a 900 bar, would lose the third step.
7. **Neutral 025 as an engine role** (for example `background.panel`). *Recommend:* note it for the
   engine lane; the mockup reads the ramp step until then.
8. **Search keeps the current preview.** A search result does not change the page, so the preview stays
   on the page you were on. *Recommend:* keep, per V1.

## Findings for whoever builds this for real

- **A brand specimen on the chrome's card is wrong in one theme.** With dark chrome and the light preview
  mode, light-mode outlines, links and `icon.primary` vanished. The audit skips `[data-content]` and could
  not see it; a screenshot review did. Specimens now sit on the brand's `background.primary`. No gate
  checks this yet.
- **v5's switches never toggled on a real click.** The drawn track covered its input. It is fixed here;
  the v5 file is unchanged as the record.
- v5's findings still hold: runtime inline values escape the raw-value scan, chrome class names must not
  appear in specimen markup, and `document.fonts.check()` answers true for an absent face.

## Screenshots

`audit-v6.mjs <dir>` writes `v6-‹theme›-‹1280|380›-‹state›.png` for the 13 states, plus `agent`,
`palettes-preview`, `fills-preview`, `fills-picker`, `gradients`, `roles-picker`, `interactive-links` and
`depth-motion`. They are not committed.
