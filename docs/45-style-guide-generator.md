# 45 — The style-guide generator

**Status:** phase 1 (color) built in `apps/plugin/src/style-guide.ts` + `style-guide-cells.ts`; phases 2–3 specified here, not built.
**Issue:** #259. **Why a plugin feature, not a separate tool:** `docs/09` §4 — the tables document the variables a theme write left in *this* file, so they read `figma.variables` rather than the engine's emission, and they live where the designer already works.

This is the design record for every phase. Section 2 holds the owner's decisions, verbatim in substance and closed. Anything this document adds beyond them is marked **proposed, owner to confirm**. The list of those items is §8.

---

## 1. What it is

The generator draws one table per token group onto the file's token pages, built from instances of three cell component sets. The tables are *documentation of the file*: every specimen is bound to the variable it shows, so a changed value repaints the specimen with no rerun, and a rerun refreshes the static text (values, aliases, contrast) and reports what moved.

Two halves, the shape every executor in the plugin takes:

- **`planStyleGuide(catalog, contract, options)`**: pure. Collections, variables and the engine's contrast contract go in. A list of tables comes out: page, title, columns, rows in order, and per mode the value, alias, ground and measured contrast. It is tested with no host.
- **`runStyleGuide(api, contract, options)`**: the executor. It writes the plan from the cell sets and never throws for a missing optional piece. No page, no cell set, no header set and an unloadable font are each a named skip.

It is driven from the panel (the **Style guide** step) and from the agent link (`style-guide {collections?, types?, valueFormat?, header?, display?, aliases?, description?}`).

## 2. Decided (2026-09-28, #259): the style-guide generator's coverage, layout, contrast column, rerun and cell components

The owner's decisions, 2026-09-27/28, recorded on #259. These are closed.

1. **Coverage: every variable collection.** PRIMITIVE collections (raw palette, space scale, …) render on `↳ Primitive tokens`, SEMANTIC roles (text, background, border, icon, …) on `↳ Semantic tokens`. The pages are found through `file-taxonomy.ts`. A missing page is a skip, reported; pages are never created.
2. **Modes side by side.** One row per token; one specimen + value column per mode. Each mode column's swatch pins its mode with `setExplicitVariableModeForCollection`, so the swatch stays bound to the variable and live. Value text is static, refreshed on regenerate.
3. **A header per table.** Each table opens with a `_Section-header` instance at Size=Medium, carrying a title and a one-line description. `page-header.ts` places one per page; this places one per table.
4. **Columns vary per type over a shared core:** name · specimen + value per mode · alias (a chip) · description (from metadata). For **color**, a measured contrast ratio per mode against the role's intended ground, marked pass/fail against the floor the engine contracts for it. Ground and floor come from the engine's contract (`modes.ts`), never from description prose. A role with no contracted ground reads "—".
5. **Rerun updates in place.** A table is found by a stable key in plugin data and is never duplicated. The report lists tokens added, removed and with new values.
6. **Cell components live on `↳ File Components`** (Sandbox), built by Set up file next to `_Section-header` and `_Headings`, on the owner's existing cell design (§3). A file that already has these sets **anywhere**, in any case, adopts them in place. The owner's test file keeps them on "Style Guide Components". They are never moved or rebuilt.
7. **Sample text is "Abc 123".** Changeable (`SAMPLE_TEXT` in `style-guide-cells.ts`).
8. **UI.** A "Style guide" step after Apply theme. Per-type options fold away under *Customize*. The display style is chosen automatically from the token's role, with the owner's dropdown values kept as overrides. An agent-link command drives it live.

**Defects of the owner's earlier plugin, fixed rather than copied:**
- Every specimen was drawn on white, so inverse text (#F7F7F7) and white `on-*` icons were invisible. Each specimen is now drawn on its intended ground, the same variable the contrast column measures against.
- Rows sorted as text (10, 11, 112, 12). Primitive steps now sort numerically.
- Tables had no title. Each table now has a header (decision 3).

## 3. The cell design

The axes and values are the owner's, measured live in their test file. The pixel values are this build's reading of it (**proposed, owner to confirm**).

| Set | Axes | What each member draws |
|---|---|---|
| `_style-guide-swatches` | `type = default \| text \| icon \| border \| transparency \| radius` | default: a filled 32px square with a 1px hairline. text: "Aa", 24px bold. icon: a 22px square turned 45°. border: an outlined square, 2px inside stroke. transparency: a 4×4 checkerboard under the fill. radius: one 16px rounded corner. The bindable node is named `Specimen`; an adopted set with its own names is read by type (the first text node, stroked node or filled node). |
| `_style-guide-text-cells` | `color = white \| secondary \| dark` × `textAlign = center \| left` × `type = default \| header \| alias \| value alias` × `padding = default \| extra right`, 12 members | default: body text. header: a table header, dark or light. alias: a link-icon chip with the path. value alias: a value plus the chip. Text sits in a node named `Text`, the chip's path in one named `Alias`. |
| `_style-guide-spacing-cells` | `display = filled \| line` | A spacing bar or a bracket. Phase 2 reads it. |

**Adoption reads by property, not position.** A member is found by its `key=value` variant name in any case (`pickVariant`). `type` must match, since a header cell is never a body cell; the other axes are preferences. An approximated member is named in the verdict ("no exact type=value alias, color=white variant — used …").

**The specimen's ground** is a frame wrapped around the swatch instance, filled by binding the ground variable and pinned to the same mode. That is what makes an inverse specimen legible. A role with no contracted ground is drawn on the page surface: `background.primary`, or `inverse.background.primary` for an inverse role (**proposed, owner to confirm**).

## 4. Per-type column specs

The shared core is Token · [specimen · value (+ alias chip)] per mode · Description. Counts are the engine's prism3 emission, by DTCG `$type`.

| Type | Count | Page | Specimen | Value | Type-specific column | Phase |
|---|---|---|---|---|---|---|
| color | 388 | primitive: Primitive tokens (one table per palette, as a scale); semantic: Semantic tokens (one per family) | swatch by role: text "Aa", icon diamond, border outline, translucent checkerboard, else filled; on its ground | Hex / RGB-A / HSL / HSB; translucent carries alpha | **Contrast** per mode, semantic only: `4.52:1 — clears the 4.5:1 floor` + the ground on a second line. An ink-on-wash role measures its `legibleFor` ink over the composite. "—" with no contracted ground. | **1 (built)** |
| dimension | 180 | space/size scales: Primitive; spacing and radius roles: Semantic | spacing cell (filled bar or bracket) at the value's width; radius swatch for radii | px, and REM at a 16px base (toggles) | — | 2 |
| typography (text styles) | 39 | Semantic tokens | the style's own sample, "Abc 123" set in it | family · weight · size / line height · letter spacing, px and REM | paragraph spacing and text decoration (toggles, the owner's options) | 2 |
| fontFamily | 9 | Primitive | "Abc 123" in the family | family name | — | 2 |
| fontWeight | 10 | Primitive | "Abc 123" at the weight | numeric weight + style name | — | 2 |
| number | 31 | by collection | none, or the scale's bar where it is a ratio | the number | the unit the name implies (line-height ratio, opacity %) — **proposed** | 2 (line heights, letter spacing) / 3 (the rest) |
| shadow | 7 | Semantic | a card with the effect style applied | offset · blur · spread · color | — | 3 |
| gradient (paint styles) | — | Semantic | a swatch filled with the style | stops, as values with their aliases | — | 3 |
| duration | 24 | Semantic | none (**proposed**: a bar at the duration's length) | ms | — | 3 |
| cubicBezier | 10 | Semantic | the curve, drawn on a unit square — **proposed** | the four control points | — | 3 |
| transition | 4 | Semantic | none | duration · easing, each an alias chip | — | 3 |
| spring | 3 | Semantic | none | stiffness · damping · mass | — | 3 |
| strokeStyle | 1 | Semantic | a line in the style | the dash pattern | — | 3 |
| opacity | (within number) | Semantic | the transparency swatch at that opacity | % | — | 3 |
| border width | (within dimension) | Semantic | a line at the width | px | — | 3 |
| breakpoints / grid styles | — | Grids & layouts, if mapped; else Semantic | the grid style applied to a frame | columns · gutter · margin | — | 3 |
| icon sizes | (within dimension) | Semantic | the icon glyph at the size | px | — | 3 |

## 5. Phase plan

1. **Color (this PR).** Every color collection; primitives as scales, semantic roles by family; contrast per mode; Set up file builds or adopts the cells; panel step and agent command.
2. **Dimension + typography.** Font variables (family, size, weight, letter spacing, line height) and text styles; the owner's REM/pixel options; the spacing cell set, already built in phase 1, goes into use.
3. **The rest.** Shadow, gradient, motion (duration, easing, transition, spring), opacity, border width, breakpoints/grids and icon sizes.

`PHASE_TYPES` in `style-guide.ts` names what the current phase draws. A type asked for outside it is reported ("dimension: not in this phase — color only"), never silently dropped.

## 6. How phase 1 decides

- **Primitive or semantic.** A collection is primitive when no variable in it aliases another in any mode (**proposed, owner to confirm**). It carries no contrast column, since a primitive has no contracted ground.
- **Grouping.** Primitive: by parent path, one table per palette, titled by the palette ("Primary", "Black alpha"). A value at the collection's shared prefix goes into "<Collection> — base". A single-group collection takes the collection's name. Semantic: by family, the first segment after the shared prefix ("Text", "Inverse").
- **Order.** Primitive rows use numeric order (`5, 50, 100, 900`). Semantic rows keep the file's order, which is the engine's emission order.
- **Contrast.** The contract comes from the brand saved in the file (`restoreInput` → `resolveAllModes(brandTheme(input))`). With no saved brand the column reads "—" and the verdict says Apply theme saves one (**proposed, owner to confirm**). The ratio is floored to two places, so 4.499 never reads "4.50" beside a 4.5 floor.
- **Placement.** A new table goes 160px below the page's lowest content, left-aligned to it (**proposed**). A table a designer has moved stays where they put it.
- **Rerun.** The wrapper frame carries `prism3-style-guide = color|<collection>|<group>`. The grid is rebuilt each run; the wrapper and header are kept. The header text is written only when the table is created, so a designer's edit survives (**proposed**). A table whose group has gone is reported stale and **left in place**, never deleted (**proposed**).
- **Verdict.** "✓ style guide: 22 tables" on a clean run. "⚠ 11 drawn, 11 skipped" when a page or the cells were missing, which is not a pass, so the detail opens. "✗ style guide skipped" when nothing was drawn.

## 7. What is and is not verified offline

`apps/plugin/test-style-guide.ts` drives both halves through a node shim that keeps GRID tracks, explicit modes, bound paints and plugin data. It checks:
- a table per collection on the right page;
- the explicit mode per column;
- bound swatches;
- literal ratios (prism3 `text.primary` on `background.primary`: 19.42:1 light);
- the specimen's ground;
- numeric order;
- the in-place rerun and its diff;
- adoption whatever the page or case;
- every skip.

`test-build-verdict.mjs` drives the built panel: the Style guide page, the Customize fold, the options crossing the bridge, and the verdict on the row.

**Host-unverified:**
- GRID layout rendering and HUG tracks;
- the icon diamond's rotated geometry;
- that an instance inside a mode-pinned ground frame renders in the pinned mode.

A live run on the owner's test file is the check.

## 8. Proposed, owner to confirm

- The cell pixel values (§3) and the 12 text-cell combinations built when absent.
- The primitive/semantic rule (no alias → primitive).
- The fallback ground for a role with no contracted ground (§3).
- The hairline on the default swatch.
- Column headers: Token · <mode> · Value · Contrast · Description.
- Contrast wording: `3.27:1 — below the 7:1 floor` / `on background/primary`.
- Stale tables left in place and reported.
- Placement 160px below the page's content.
- The grid rebuilt each run; the header written only on creation.
- The owner's "add a title cell to rows" option, deferred: each table's header carries the title.
- No contrast column on primitive tables.
- The contract read from the brand saved in the file.
- A single-group foreign collection titled by its own name, its tokens by their last segment.
- The panel step as a Figma-only rail entry between Preview and Components; the button label "Draw style guide".
- The Customize options held for the session, not saved with the brand.
- The collections filter offered only on the agent command, not in the panel.
- The sample text "Abc 123" (decision 7, flagged as changeable).
