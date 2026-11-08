# A design-system overview and more visual style guides: research and options (#1941)

**Date:** 2026-11-07 · **Issue:** #1941 (unparked by the owner, Q113) · **Kind:** research note. No code, and nothing here is decided.

The owner wants to explore two things:

- **(a) A design-system overview:** a few Figma frames that Prism3 generates and that show the system at a glance (color, type, spacing, radius, elevation, key components). The model is the overview someone hand-built for the reference brand's file.
- **(b) Style guides that are more visual than rows in a table,** in the studio's Style guide and in the Figma style guides.

Every visual, layout, naming or copy choice below is **the owner's call**. Each option group has a recommendation, marked **(rec.)**, and the owner questions are collected in §6, with option A recommended in each.

**One gap first.** The hand-built overview for the reference brand's file isn't recorded anywhere in this repo, so this note can't compare frame by frame. Answering Q-a0 (§6) with a list of its frames would anchor option A2.

---

## 1. What exists today

### 1.1 The studio Style guide (Brand preview) is already visual, but long

- **Renderer:** `renderPreviewStyleGuide`, `apps/studio/src/main.ts:866-939`. It is lent to the Brand page as its preview (S3, #1939) through `apps/studio/src/preview/brand.ts:2-16` and `:66-83`, in a host pinned to light.
- **Data:** `resolveAllModes(theme)` per mode (`main.ts:871-872`). The current mode plus its opposite (`:873-874`). No ratio badges (`badges:false`, `:876`; `preview/sections/kit.ts:206-207`). Only a "!" appears when a role misses its floor (`kit.ts:268`, `:289`).
- **Ground picker:** Page, Page second tier or Inverse (`kit.ts:173-178`, `main.ts:889-923`).
- **Sections, in order (`main.ts:927-938`).** They are cards and specimens, not tables:
  1. Type sample (#1942): one display style plus title, body, label and caption, each a pangram at the real resolved size (`preview/sections/type-sample.ts:22-35`, `:55-92`).
  2. Radius and shadow sample: a panel holding a field, a button, a checkbox and a tag at their bound radii (`radius-sample.ts:28`, `:32-73`).
  3. Background, Foreground, Text color, Border, Icon (`COLOR_SECTIONS`, `sections/index.ts:78-80`). **Text color is the one grid of rows** (`text-color.ts:25-66`).
  4. Disabled (`disabled.ts:11-22`).
  5. Interactive, with Primary, Neutral and Destructive in rest, hover and pressed (`interactive.ts:31`, `:46`).
- **Reuse:** Surfaces & fills (`preview/surfaces.ts:70-94`) and Color › Interactive (`preview/interactive.ts:53-62`) draw the same sections, with badges. **A condensed Brand preview has to keep those consumers working.**
- **Why #1941 exists:** it reads as a reference page, not a preview (#1941 body; `docs/superpowers/ui-redesign/decisions-2026-10-01-qa.md:21`, Q6). Concept v6's product-style specimen page was more compact, but the owner didn't love it as drawn (`concept-v6.md:212`, `:223-226`).

### 1.2 The Figma style guides are tables

- **Writer:** `apps/plugin/src/style-guide.ts`, with `planStyleGuide` (pure) and `runStyleGuide` (writes) (`:11-18`). The design record is `docs/45-style-guide-generator.md`.
- **Data: the file's own variables and styles, not the emission** (`style-guide.ts:5-7`).
  - The only engine input is the contrast contract (`SgContract`, `:111-115`), built from `resolveAllModes(brandTheme(restoreInput(...)))` (`apps/plugin/src/main.ts:2015-2018`).
  - A file with no saved brand shows "—" for contrast (`style-guide.ts:421`).
- **Kinds drawn:** `PHASE_TYPES` (`:125`) covers color, dimension, border width, opacity, the font kinds, typography, shadow, gradient and grid. Everything else goes into a "later phase" note (`:881`; #2149, #2353 for motion).
- **Shape:** one GRID table per palette or family (`:443-460`), with columns Token, then per mode [specimen, Value, Contrast], then Description (`:546-557`).
  - Contrast text reads like "4.52:1 — clears the 4.5:1 floor", measured on the contracted ground, composite over washes (`:341-346`, `:488-511`).
  - Specimens: spacing bar, radius, stroke, opacity, font, text style, effect card, gradient fill, grid at 1:8 (`SgSpecimen`, `:182-206`).
- **Binding:**
  - Paints are bound to variables (`:2218-2261`).
  - Every specimen is pinned to its mode with `setExplicitVariableModeForCollection` (`:2229`, `:2259`, `:2287`, `:2672`).
  - Value text is static and refreshed on rerun (`:23-25`).
- **Placement:**
  - Groups `Style guides — <title>` (Q378; `:1591-1626`) go on `↳ Primitive tokens`, `↳ Semantic tokens` and `↳ Grids & layouts` (`:136-139`; `file-taxonomy.ts:76-88`).
  - The group table is engine-owned (`packages/engine/style-guide-groups.ts:49-62`, `:89-103`).
  - Every mode is drawn side by side (P4 A; one chosen mode is #2148).
- **The pieces already built that an overview can reuse:**
  - `style-guide-cells.ts:1-29`: three cell sets, adopted and never rebuilt.
  - `cover-frame.ts:1-45`: a 1920×1080 cover whose ground, inks and face are bound, so a theme moves it live.
  - `about-frame.ts:1-35`.
  - `doc-block.ts:1-48`: the `_Doc-block` template.
  - `doc-panel.ts:1-28`: a usage panel per component set.
  - `spec-panel.ts:1-56`: anatomy and a color table per state.

### 1.3 No overview exists

- **Nothing in engine, plugin or studio draws a system-at-a-glance frame.** "Overview" exists only per component (`packages/engine/component-doc-sections.ts:52`, `:113-121`).
- **The nearest thing** is `packages/engine/visualize.ts:1-23`, an on-demand HTML page covering every axis.
- **On a fresh file,** the "overview" is a Cover, an empty Foundations header page and empty token pages until the style guides run. The cover stays undrawn if setup ran before a brand existed (#3467, the traced answer).

### 1.4 Engine data an overview can read, so nothing is hand-authored

| Need | Source |
|---|---|
| Every role's hex, ratio, ground, floor, per mode | `resolveAllModes` → `ModeResult.roles` (`packages/engine/modes.ts:2796`, `:220`, `:251`) |
| Named fg/bg contract pairs per component variant | `previewSpec` / `ContractPair` (`packages/engine/preview.ts:22-38`); `resolvePreview` (`resolve-preview.ts:37`, `:75`) |
| Palettes, spacing, radius, sizes, motion, typography, shadow, layout, gradient | the theme axes (`packages/engine/theme.ts:400-532`; dims `:157-170`); `spaceScale` (`scale.ts:171`) |
| Role usage prose (when to use / avoid when) | `buildAiMetadata` (`packages/engine/ai-metadata.ts:647`) |
| Components and their docs | `componentDefs` (`components/index.ts:109`), `componentSpec` (`component-specs.ts:278`), `docSections` (`component-doc-sections.ts:102`) |
| Group titles and order | `STYLE_GUIDE_GROUPS` (`style-guide-groups.ts:49-62`) |

### 1.5 Docs

- `docs/18-plugin-and-host-architecture.md` and `docs/22-plugin-plan.md` say nothing about style guides or overviews. The nearest is the shared preview, `docs/18:41-43`, `:165-167`.
- **The design record is `docs/45`:** modes side by side `:49`, contrast column `:51`, specimen by role `:71-79`, groups `:90-104`, per-type spec `:185-210`.
- **`docs/45` lags the code** on the group fill and the phase-3 kinds, filed as #3515.
- **UI redesign:**
  - `decisions-2026-10-01-qa.md:20-21` (Q5, Q6).
  - `implementation-plan.md:160-163` (S3 home is the Style guide).
  - `v4-spec.md:278` (a product-card specimen was wanted, never built).
  - The brief, `docs/superpowers/specs/2026-09-26-ui-exploration-brief.md:242-246`.

### 1.6 Gates on these surfaces

- **Plugin:**
  - `apps/plugin/test-style-guide.ts`: a node shim over the real emission.
  - `test-style-guide-page.ts`.
  - `test-style-guides-page.mjs`, under `test:verdict`.
  - `test-cover-frame.ts`.
- **Studio:**
  - `test-smoke.mjs`: section order and markers, and the type sample held to the emission (`:1739`, `:1764-1777`, `:1998-1999`).
  - `test-chrome.mjs`: specimen ground on `background.primary` (`:325-343`; `STYLE_GUIDE_ROOTS` `:4160`).
  - `lint-contrast.mjs` checks the studio chrome, **not** the style guide.

## 2. Prior art in issues

| Issue | State | Bearing |
|---|---|---|
| #1941 | open | This lane: a condensed Brand preview, more compact, keeping the legacy feel |
| #1942 | closed | The short type sample, done; the pattern (faces held to the emission, mutation by name) carries over |
| #259 | open | The original ask: a canvas generator that lays all tokens out as frames, absorbed into the plugin (`docs/09` §4). The style guides answered most of it; an overview is its "readable without Dev Mode" half |
| #3467 | closed | A fresh file's overview pages are empty; `_Doc-block` needs Badge, Tag, List Item and Divider built first. **An overview with component samples inherits the same dependency** |
| #2353 | open | Coverage inventory; shadows and motion specs missing |
| #2149 / #2148 | open | "Later phase" groups; one chosen mode instead of every mode |
| #2807 | open | 4–10 modes break side-by-side columns. **Any overview must pick its mode story up front** |
| #3426 | open | Studio previews components from the build plan as HTML/CSS (POC #3408 arm 1). A candidate shared renderer for component samples |
| #1940 | open | The Style guide preview's buttons draw 1px focus rings; don't copy them into a new layout |
| #2729, #2964 | open | Title collisions; Scrim and Veil placement. Grouping edge cases an overview reuses |

## 3. Field research: what makes an overview scannable

Pages were read through text fetches, so images are known only by caption. Material 3, Polaris token pages and Apple HIG did not load (JavaScript-rendered or redirected). Nothing below rests on them.

1. **Group by role first, palette second.**
   - GOV.UK lists functional colors (Text, Link, Border, Focus…) before the hue palette (<https://design-system.service.gov.uk/styles/colour/>).
   - Carbon groups tokens by UI element (Background, Layer, Field, Border, Text…), with a Token / Role / Value table and a theme column per theme (<https://carbondesignsystem.com/elements/color/tokens/>, <https://carbondesignsystem.com/elements/themes/overview/>).
2. **Put the contrast verdict on the swatch.**
   - Spectrum labels each ramp stop with its ratio (1.06:1 to 19.5:1) and splits sections into "Use with white text" and "Use with black text" (<https://spectrum.adobe.com/page/color-palette/>).
   - USWDS encodes the verdict in the name: a grade difference of 50 or more passes AA (<https://designsystem.digital.gov/design-tokens/color/overview/>).
   - Radix guarantees steps 11 and 12 against step 2 (<https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale>).
3. **Show pairs, not lone colors, including pairs to avoid.**
   - Material's `X` / `on-X` and container pairs (<https://github.com/material-components/material-web/blob/main/docs/theming/color.md>).
   - Wear OS shows recommended and avoided pairings side by side (<https://developer.android.com/design/ui/wear/guides/styles/color/apply>).
   - Atlassian pairs bold backgrounds with `inverse` text (<https://atlassian.design/foundations/color>).
   - Prism3 already has the data: contract pairs and `avoid_when`.
4. **Specimen, name and value together, at real size.**
   - Carbon renders each type style, then the token, then family, size, line height, weight and tracking (<https://carbondesignsystem.com/elements/typography/type-sets/>).
   - Atlassian shows rem and px side by side (<https://atlassian.design/foundations/typography>).
5. **Spacing as a ruler, with ranges named by use.**
   - Atlassian draws a 0–80px number line with small, medium and large bands tied to use (<https://atlassian.design/foundations/spacing>).
   - Carbon gives each row an example bar (<https://carbondesignsystem.com/elements/spacing/overview/>).
6. **Elevation as surface plus shadow, and treat dark separately.**
   - Atlassian pairs each surface token with its shadow token; in dark, surfaces lighten as they rise (<https://atlassian.design/foundations/elevation>).
   - Fluent 2 gives a shadow ramp whose number is the blur, with separate light and dark usage (<https://fluent2.microsoft.design/elevation>).
7. **Names stay constant across modes; values vary.** Two patterns are common:
   - one value column per mode (Carbon themes; the Variables Documentation plugin, <https://www.figma.com/community/plugin/1493511839808963998>);
   - a page-level mode switch that rebinds live (Tokens Studio's "apply active theme", <https://docs.tokens.studio/figma/generate-documentation>).

   The second scales past 3–4 modes; the first does not (our #2807).
8. **Generated docs stay alive by binding, not by copying.**
   - Tokens Studio's generated sheet keeps tokens applied, so values update (same link).
   - Figma's roundup lists generators that refresh in place rather than regenerate (<https://www.figma.com/blog/how-to-streamline-your-design-system-workflow-in-figma/>).
   - Prism3's cover already works this way (`cover-frame.ts`).
9. **Skimmable by construction.**
   - 79% of users scan; literal headings, one idea per block, conclusion first (<https://www.nngroup.com/articles/how-users-read-on-the-web/>).
   - Brad Frost: an approachable front page and patterns shown in context (<https://atomicdesign.bradfrost.com/chapter-5/>).

**Long names:** no source fetched addresses truncating long token names. The systems that cope keep names short by grammar: show only the tail within a group headed by the leading segments (Carbon, Atlassian), or encode position as a number (`space.100`, Radix 1–12).

## 4. Options for (a): the generated overview

Every option draws on the existing plugin machinery:

- paints bound to the file's variables;
- specimens pinned to a mode per collection;
- text and effect styles applied by id;
- values as static text refreshed on rerun;
- contrast verdicts read from `resolveAllModes`, never measured from pixels;
- find by name and update in place.

### A1. One overview sheet

- **Shows:** a single 1920-wide frame beside the cover, with:
  - a hero line in the display face;
  - a strip of the brand's key color roles as pair tiles ("Aa" in the ink on its ground, with the verdict);
  - three type lines at real size;
  - a spacing ruler;
  - a radius row;
  - an elevation stack of 3 cards;
  - one row of instances: button, field, checkbox, tag.
- **Reads:** a curated list of roles and specimens per axis. The list should be engine-owned, beside `STYLE_GUIDE_GROUPS`, so it's tested, not hand-picked in plugin code. Contrast comes from `resolveAllModes` and pairs from `previewSpec`.
- **Lands on:** Figma, on the Cover page or a new `↳ Overview` leaf (the page placement is the owner's call). The same curated list could drive the studio's condensed preview (B-S1).
- **Size:** ~1 plugin PR for the frame, plus an engine list and a shim test; about the cover's size (`cover-frame.ts`) times two.
- **Risks:**
  - Curation is a design choice: which roles count as "key".
  - Component instances need the built sets. On a fresh file they're absent (#3467), so the row has to degrade to a stated note, not a hole.

### A2. A small foundations set, 4–6 frames (rec., subject to Q-a0)

- **Shows:** one frame each for Color, Typography, Space and shape (spacing ruler, radius row, border widths), Elevation (surface plus shadow per level, light and dark side by side) and Components (a sampler sheet of the built sets at their default size and state). It can optionally open with A1 as its first frame.
- **Reads:**
  - Color: role families from `STYLE_GUIDE_GROUPS`, each family as pair tiles with verdicts, and the palette ramps as compact strips under them.
  - Type: the typography axis.
  - Space and shape: `dims`.
  - Elevation: the shadow axis and its surface roles.
  - Components: `componentDefs` filtered to those built in the file.
  - Usage one-liners from `buildAiMetadata`, in the voice standard's recessive register.
- **Lands on:** Figma, on the Foundations header page, which is empty today (#3467), or one frame per Foundations leaf. Studio and docs can follow later.
- **Size:** 3–5 PRs, one per frame plus a shared layout. Each frame is a few hundred lines beside a shim test and one named mutation.
- **Risks:**
  - It overlaps the token pages' tables. The line to keep is that the overview curates and the style guides enumerate.
  - Elevation in dark mode means pinning two modes per frame.
  - The Components frame inherits #3467.

### A3. Grow the cover into the overview

- **Shows:** the cover keeps its title block and gains a band of the brand at a glance: a few color pairs, one type line, the radius on a button. It stays one frame.
- **Reads:** the same as A1, in a subset.
- **Lands on:** Figma, the Cover page. The file thumbnail then shows the brand.
- **Size:** about 1 PR.
- **Risks:**
  - The cover was decided simple on purpose (#2915, Q1 A, "a good-looking start a team will change"), so this reopens that decision.
  - Teams replace covers, and the overview would be lost with it.

### A4. Render once in HTML, place in Figma

- **Shows:** whatever A1 or A2 shows, composed once in HTML/CSS (the #3426 / POC #3408 arm-1 path) and drawn in the studio, the docs site and Figma.
- **Reads:** the same data, through one projection.
- **Lands on:** all three surfaces.
- **Size:** large, because it needs an HTML-to-Figma placement path the plugin doesn't have.
- **Risks:**
  - A pasted render is not bound, so a theme change wouldn't move it. That loses the property in field principle 8.
  - Not recommended for the Figma half. The studio and docs half is worth keeping in mind for B-S1.

## 5. Options for (b): more visual style guides

### Studio: the condensed Brand preview (#1941 itself)

- **B-S1. A one-screen "brand at a glance" composed from today's sections in a compact mode (rec.).**
  - **Shows:** type sample (3 lines, not 5), a color strip of pair tiles (role families collapsed to their default rung), the radius-and-shadow panel, and one Interactive row (Primary rest and hover). It fits about one viewport. A "Full style guide" link opens today's page unchanged.
  - **Reads:** what the sections read now, plus the curated list from A1, so the studio and the Figma overview show the same roles.
  - **Size:** 1–2 studio PRs. The sections gain a `compact` option and Surfaces & fills keeps the full form.
  - **Risks:**
    - The smoke test's section-order markers (`test-smoke.mjs:1998`) move.
    - The ground picker has to stay.
    - Don't copy the 1px focus ring (#1940).
- **B-S2. A product-style specimen page (concept v6's direction, redrawn).** A small fictional product screen built from the brand.
  - **Strength:** it reads most like a preview.
  - **Risks:**
    - The owner didn't love v6's version.
    - It's the most design-heavy option.
    - It carries a contrast claim per element, needing a contract pair for every ink-on-ground the scene uses.
  - **Size:** 2–3 PRs plus design rounds.
- **B-S3. Keep the page and tighten it.** Collapse each section to its first row with "show all", and move Text color's grid to pair tiles.
  - **Size:** about 1 PR.
  - **Risk:** it stays a reference page, which is the complaint.

### Figma style guides

- **B-F1. Pair tiles for semantic color.** Replace a semantic family's rows with a tile grid: each tile is the ground, "Aa" in the ink, the role tail as the label, and the verdict ("4.52:1 · AA") under it, one tile column per mode.
  - **Reads:** the same `SgContract` and bindings as today.
  - **Size:** 1–2 PRs, a new cell kind in `style-guide-cells.ts`.
  - **Risks:**
    - Description and alias info leave the table. A hover/Dev Mode note or a compact footer row would carry it.
    - Columns per mode still hit #2807.
- **B-F2. Rulers and stacks for dimensions and shadows (rec. as the first step).** Spacing as one ruler with named ticks instead of rows of bars; radius as a single row of shapes; shadows as an elevation stack. It keeps a small spec list under each.
  - **Reads:** today's dimension and effect data.
  - **Size:** 1 PR per kind.
  - **Risks:**
    - Tick labels collide at small steps (2/4/6px). They need a stagger or leader lines.
    - Long names follow the tail-only rule.
- **B-F3. A visual summary strip on top of each table.** Keep every table as the complete reference, and add one visual strip above each group (a ramp strip, a type waterfall, a ruler).
  - **Size:** 1–2 PRs.
  - **Risks:** the least disruptive, but the page gets longer, not more visual.
- **B-F4. A page-level mode, instead of columns per mode.** Draw one mode, the #2148 select, with a compare frame for a second.
  - **Size:** #2148's scope.
  - **Risk:** it is the precondition for B-F1 at 4–10 modes. Put it under #2148/#2807 rather than here.

**Recommended path, which is the owner's call:**

1. B-S1 in the studio.
2. B-F2 in Figma.
3. A2 for the overview, built with one engine-owned curated list shared by B-S1 and A2, so the studio preview and the Figma overview can't diverge on which roles they show.
4. B-F1 waits until #2148 settles the mode story.

## 6. Owner questions (A is recommended in each)

- **Q-a0. The hand-built overview.** Which frames and sections does the reference brand's overview have?
  - A: describe or screenshot them on #1941 (no file links in this public repo).
  - B: skip; design from this note.
- **Q-a1. Overview shape.**
  - A: A2, a small foundations set.
  - B: A1, one sheet.
  - C: A3, grow the cover.
- **Q-a2. Overview placement.**
  - A: the Foundations header page.
  - B: a new `↳ Overview` leaf.
  - C: beside the cover.
- **Q-a3. Who curates "key" roles and components?**
  - A: an engine-owned list, reviewed by the owner once and then gated.
  - B: every role, no curation.
- **Q-a4. Components on a file without built sets (#3467).**
  - A: draw the frame with a stated note naming what to build.
  - B: skip the Components frame until the sets exist.
- **Q-a5. Modes in the overview.**
  - A: the default mode, plus a second mode only on Color and Elevation.
  - B: every mode.
  - C: one chosen mode (#2148).
- **Q-b1. The studio's condensed preview.**
  - A: B-S1, compact sections with a link to the full guide.
  - B: B-S2, a product-style specimen.
  - C: B-S3, a tightened page.
- **Q-b2. The Figma style guides' first visual step.**
  - A: B-F2, rulers and stacks.
  - B: B-F1, pair tiles.
  - C: B-F3, summary strips.
- **Q-b3. Verdict wording on tiles.**
  - A: ratio plus level ("4.52:1 · AA"), matching the measured contract.
  - B: today's sentence ("clears the 4.5:1 floor").
  - The wording is voice copy, so it's DRAFT until the owner chooses.

## 7. Risks every option carries, and how to keep claims true

- **Drift.**
  - Bind every paint, style and face to the file's variables, as the cover does, so a theme moves the overview live.
  - Text values are static, so refresh them on every rerun (`style-guide.ts:23-25`).
  - The curated list lives in the engine with a test that every entry resolves in the emission. A renamed role then fails by name instead of drawing a blank tile.
- **Long names.**
  - Show the tail under a family heading, and let cells hug with a maximum width plus wrap.
  - Add a shim fixture with a long role name and a long family name. The #2729 collision is a precedent.
- **Contrast claims.**
  - Every printed verdict comes from `resolveAllModes` or a `ContractPair`, for the exact ink, ground and mode drawn. Ink on a wash uses the composite, as the style guides do (`style-guide.ts:488-511`).
  - A tile with no contract pair shows no verdict rather than a computed one.
  - No saved brand shows "—" (`:421`).
  - The gate re-derives the ratio from the emitted hex independently of the drawing code, and a mutation that swaps the ink fails it by name (`docs/34`).
- **Many modes (#2807).** Decide the mode story (Q-a5, B-F4) before widening any layout.
- **Fresh files (#3467).** Anything that instances components depends on built sets and must say so in the run summary, not leave a gap.
- **Voice.** All headings and notes follow `docs/voice-standard.md`'s recessive register. Copy is DRAFT until the owner chooses it.
