# 26 — Cross-page UI conventions (dashboard rollout checklist)

> A **living checklist** of the page-agnostic decisions that came out of the Palettes restructure
> (#230–#232) and are being rolled out **page by page** across `apps/studio/src/main.ts`. The point: decide
> once here, then each page's rewrite follows the list instead of re-deriving (or re-litigating) the
> same calls. **Append freely** as new universal decisions surface. Design rationale lives in
> `23-dashboard-ia-and-component-system.md`; the component inventory + fix log in
> `24-ui-components-and-fixes.md`; this doc is the executable "apply this everywhere" contract.

Format: `- [ ] <rule> — <why / spec>`. Three tiers: **Universal** (every page), **Conditional** (only
where a value is authored/derived), and **Not-universal** (Palettes-specific — do *not* blanket-apply).

**Reviewing an existing page is a separate job from building one** — see *Reviewing a page* below,
generalized from the Typography pass (2026-08-03). Read it before auditing the next page; it is
ordered, and step 3 is the one that decides whether the findings are real.

---

## Universal — apply to every page

### Structure
- **Section containers.** Each logical section sits in its own panel — `.psec`: `background:var(--panel)`,
  `1px solid var(--line)` border, `var(--r)` radius, subtle `box-shadow`, `20px 24px 22px` padding,
  `margin-top` between sections (`8px` for the first). This is the "containers around each section" the
  owner called out.
- **Section headers.** `.psec-t` (uppercase, 13px, weight 680, `--muted`) + a `.psec-d` sub-line (13px,
  `--faint`). One heading treatment everywhere — retires the older `sectionHead` / `.section-lab`
  divider style on restructured pages.
- **Full-width content; controls in a header *above*, never a side-car card *beside* it.** The fixed
  ~340px side-car (`primSection`) was what forced the 1120px overflow — removing it is the structural
  fix, not shrinking anything. Applies anywhere a page pairs controls with a specimen / ramp / table.
- **Overflow discipline.** Nothing bleeds past the 1120px content pane; wide content (tables, ramps)
  scrolls inside its own `overflow-x:auto` container — the page body never scrolls sideways.
- **Contrast checks live *in context*, with their section — not deferred to one table at the bottom.**
  Any section that carries contrast relationships shows its own contrast readout / mini-table right
  there, so the accessibility verdict sits beside the thing it judges (doc 23 §, per-section contrast
  work). The **Preview** tab's master contrast table is the *consolidated, cross-system* view —
  complementary to the in-context checks, **not** a substitute for them. (Palettes was the exception:
  primitives have no contrast pairs to judge, so no in-context table there — but every color/component
  page that does have contrast relationships gets them per-section.)

### Controls & labels
- **Labeled control fields.** Every control carries a small uppercase micro-label (`.pfk`: 9.5px,
  `letter-spacing`, `--faint`) — SOURCE, ANCHOR, HUE, … No bare, unlabeled controls.
- **Source-as-select.** A control with 3+ mutually-exclusive sources/modes uses a `select`; a binary may
  be a segmented control. (Palettes/Validation are the template.)
- **Reuse the component kit** (doc 24) — `selectEl`, `tokenPill`, `addButton`, `removeButton`,
  `renderCard`, `objEditor`. Don't hand-roll a one-off variant; extend the shared component.
- **Human-readable copy.** No internal jargon in the UI (`ink`→`text`, `action`→"default interactive
  color"). Labels name what the user recognizes, not how the system is built.
- **One label per concept, page-wide.** "Which categories consume this" was `Binding`, `Bound by` and
  `Used by` on one page. Pick one and sweep.
- **A word that is a token VALUE must never also be a control label.** `tighter`/`wider` are
  `letter-spacing` rung names *and* were the nudge labels, so the same word meant a rung on one tab and
  a shift on the next (#411). Same failure on Preview, where `Role` headed both the category table and
  the weight-role table. **Check a new label against the emitted token vocabulary before shipping it.**
- **Terminology follows the emitted token path, and a tier rename is a page-wide sweep.** #415 re-keyed
  `font.family.*` from roles to categories; Preview kept the word `Role` over rows that are categories,
  because the rename touched the editors and not the mirrors. **When a tier changes, grep every surface
  that names it.**

### Modes
- **The per-mode editing rule (#416).** A value with **many parallel instances** (7 leading rungs, 5
  weight roles, 7 categories, the per-size pins) is edited as **one column per mode**. A **single
  lever** (radius, tempo, density) is edited **in place via the mode bar**, using `renderPerModeSelect`
  — `Auto — <base>` plus a `.set` class on an overridden cell. This rule was already what the code did;
  it had never been written down, and the one control on the wrong side of it (Typefaces, 7 categories
  on the mode bar) was exactly the one that felt wrong and lacked the `Auto`/`.set` affordance.
  **Deciding which side a control is on tells you its whole shape.**
- **If every mode-varying value on a page is a column, the mode bar leaves that page.** It has no
  editing job left. Typography, Primitives and Preview all have no bar, for opposite reasons that meet
  in the middle.
- **Derived-mode columns are READINGS, never controls (#423).** The engine refuses per-mode levers on
  `hc-light`/`hc-dark`/`wireframe`. The one-mode-at-a-time pages gate on
  `DERIVED_MODES.has(currentMode)` and swap in `renderGeneratedNote` — **a table that shows every mode
  as columns has no such gate, so each column must check `modeIsEditable(m)` for itself.** Show the
  resolved value with an `auto` marker in the header; an interactive control there reaches the engine
  and prints its internal error string at the user. **Converting any control to columns re-opens this
  hole** — it is what #416 did on its way in.
- **Which sections actually respond is MEASURED, and the probe is committed** — `apps/studio/mode-audit.mjs`
  (`npm run -w @prism3/studio audit:modes`). It switches Light→Dark and diffs each `.psec`, reporting
  **EDITS** (the control set or its labels differ — the bar is an editing scope here), **displays**
  (only previews/readouts re-resolve — the bar is context, not scope) or **inert** (nothing changes).
  Committed rather than written down because the answer moves with every page change and has been
  re-derived by hand three times. **Do not re-derive it statically:** counting `currentMode` per
  function under-counts (the read hides behind delegation), and resolving the call graph over-counts
  (controls call `build()`, so the graph leaks through the chrome and every page reaches every page).
  Both are on record as wrong, in opposite directions, on #268.
  - **The signature took three attempts, each of which returned a clean-looking wrong table** (#432):
    values alone missed Interactive (values match while the control SET changes); values + options
    missed Elevation, whose per-mode affordance is an **identical range slider** — same type, same
    value, same options — where only the knob LABEL becomes `Auto (1)` and only what it writes
    changes. Values + options + label agrees with #268's independent audit. A future affordance that
    carries its per-mode-ness somewhere else again will under-count just as quietly.
  - **Result 2026-08-04** (harbor, Light vs Dark, 1440px): **9 EDITS · 12 displays · 3 inert** across
    the six bar pages. Edits — Surfaces (Backgrounds, Foreground fills), Interactive (Primary,
    Neutral, Destructive actions), Size & radius (Corner radius, Density & size), Elevation (Shadow),
    Motion (Tempo). **Preview is the only bar page that edits nothing** (0/7) *and* it shows every
    mode as columns — which is exactly the condition stated above for the bar leaving a page.
    No bar: Palettes, Typography, Layout.
- **A mode-invariant control is never disabled by the mode bar.** State the invariance positively in a
  note instead. `currentMode` is global, so a control disabled outside Light is *stranded* on a page
  with no bar — the user has no way to re-enable it.

### Token paths
- **Every token-bearing row/card shows its real, resolvable path via `tokenPill`, in the correct
  namespace** — `color.*` for semantic roles, `palette.*` for the raw ramp primitives, `gradient.*` for
  paint styles, and (on the ramp pages) `radius.*` / `shadow.*` / `font.*` / `duration.*`. Verify the
  string against the emitted token tree (`buildTree`) — never invent a path. (#232 lesson: `color.primary`
  was never a leaf; the primitives live at `palette.*`.)

- **A path elides in a table and wraps in a gallery.** #289's rtl left-ellipsis is right in a table
  cell, where the column can only be so wide and siblings differ by their tail. It is wrong under a
  gallery card, where the grid width is fixed by the *content set* (five status columns → ~148px, which
  can never fit `color.foreground.warning`) and there is vertical room going spare. Wrap those, and put
  a `<wbr>` after each dot so the break lands on a path boundary — `<wbr>` rather than a zero-width
  space because it contributes nothing to `textContent`, so a copied path is still the path.
- **A path that elides past readability is a LAYOUT bug, not a pill bug.** Surfaces reserved a `1fr`
  whitespace spacer and then clipped `color.background.inverse.primary` to
  `…kground.inverse.primary` in a 168px track. Breathing room is never worth buying with the
  identifier the row exists to name — widen the track (and move the collapse breakpoint with it).

### Technical (any live-updating page)
- **Stable-head / volatile-bands split.** Controls are built once and survive `apply()`; only the
  derived readouts + specimens repaint. This keeps open OS color dialogs and mid-drag sliders alive.
  Structural changes (which control is live) → `applyFull()`; value changes → `apply()`.
- **A DERIVED affordance must be written in the change handler, not left to the next paint.** `apply()`
  repaints only the volatile region, so a `.set` class or a "resolves to" line computed at render time
  lags the value it describes by one interaction. Write it imperatively *and* let the next paint
  re-derive it.
- **Column widths: fixed for anything that scales with the data.** `mtbl-fill` is the slack absorber,
  not a column type. One fill column *per face* made "Weight roles by face" grow without bound — 899px
  in a 798px container on the **default** brand, so every brand saw its specimens clipped. Shared grid
  is `112/148/148/390` = **798px**; re-measure after any cell gains content.
- **A percentage width needs a containing block that means something.** A bar sized
  `width: (v/max)*100%` inside a flex row also containing a fixed label resolves against the WHOLE
  row — so only the bars wide enough to overflow get shrunk back to the space that actually exists,
  and every narrower bar renders at an inflated fraction. Give the bar its own
  `flex:1; min-width:0` track. Layout's container specimen overstated every ratio by ~1.5× this way.
- **Never normalise a specimen by the value its own control sets.** `maxW = max(containerMax, …)`
  made `container.max` 100% at every value, so the slider beside it moved nothing. Scale against an
  independent reference (there, the widest breakpoint) or the control reads as inert.
- **An absolutely-positioned specimen needs a positioned parent, or it escapes to the viewport.**
  `.mo-stage-svg` is abspos; giving it a `static` wrapper rendered six easing curves at 1500×1500
  across the whole page. `overflow:hidden` on that wrapper does NOT clip it — an abspos descendant
  whose containing block is elsewhere is not clipped by it. Copy the parent's `position:relative`,
  not just its size.
- **`<wbr>` is not inert under `white-space: nowrap` in Chromium** — so it cannot be added to a
  shared component "harmlessly". In `tokenPill` it took Layout from 0 wrapped pills to 5 and turned
  Surfaces' elided pills into wrapped ones. Keep it in a separate wrapping variant for the card
  grids that want it, and diff any shared-component change against `main` across every page.
- **A two-column split is for a control beside the thing it changes.** With no control it reserves an
  empty column and squeezes the specimen; with a control whose specimen needs the width more than
  the adjacency (a wide table, a long generated string), stack it anyway. `controls: null` or
  `stack: true` on a `SplitBlock`.
- **Setting a colour inline REPLACES the ground it is meant to composite over** if the ground lives
  in the same property. A checkerboard in `background-color` plus an inline `backgroundColor` is a
  ramp of identical swatches — put the colour on an inner fill (the shadow tint read-out and the
  alpha ramps both do). And note the near miss: the shorthand form of this was fixed once and the
  fix stopped at the half that visibly recovered.
- **A clamp floor must be in the same unit as the value it floors.** `Math.max(2, pct)` on a width
  expressed in percent made 0px and 2px draw identically — invisible in code review, obvious on
  screen. Prefer drawing a scale specimen at its TRUE size where the range allows it.
- **A specimen belongs on the ground it ships on.** The Style guide's cards rendered the active
  mode's colours on the studio's white panel, so Dark read as dark tokens on a light page and the
  Inverse row blended into it. Theme the specimen REGION (re-scope `--panel`/`--paper`/`--line`/
  `--ink`/`--muted`/`--faint` on a ground element and every child follows); leave the `.psec`
  shell, title and description studio, so the frame still says which is tool and which is brand.
- **Two scales with the same number of tiers are not the same scale.** Studio `--muted`/`--faint`
  and brand `text.secondary`/`text.tertiary` line up by position and differ by CONTRACT: the
  engine gates tertiary at 3:1, and `--faint` is 10.5px text needing 4.5:1. Mapping by position
  put token pills at 3.52:1. Map by contract, and measure after.
- **The intrinsic-width trap.** A `nowrap` element contributes its full single-line width as
  min-content, and a column `width` is only a hint it will blow past (measured three times: #360, #369,
  #388, and again at 829px on a token pill). Cap with an explicit px `max-width`.
- **`el()` escapes its text argument.** Markup needs `innerHTML`. **Never put markdown in visible
  copy** — backticks shipped literally to users in a section description.
- **No backticks anywhere inside the CSS template literal, including comments (#366).** They terminate
  the literal and esbuild reports the failure dozens of lines from the edit.
- **`.tpill` is `direction: rtl`** (left-ellipsis for long paths), so a trailing glyph reorders to the
  front — `type.display.*` renders as `*.type.display`. Name a node, not a glob.
- **A scoped `display` rule outranks the UA `[hidden]` rule.** If you write
  `.x .y{display:block}`, add `.x .y[hidden]{display:none}` or `hidden` silently stops working.
- **Dead CSS is deleted with the control it styled**, not left inert (the `.errbar-global` lesson).
- **The mode strip lives on the page (#432), so a probe must navigate BEFORE it sets the mode.**
  Clicking a mode chip first is a silent no-op: the run reports Light while claiming to test Dark.
- **Legends: a symbol vocabulary may have one; a visual treatment may not.** #404 removed a legend
  because it explained *dimming* that should not have existed. Preview's `● ○ ?` legend stays, because
  the marks **are** the data and have no in-place alternative. Don't "fix" it for consistency.

---

## Conditional — apply where a value is *authored / derived* (color & value editors, not every page)

- **Origin-left / readout-right** reading order: identity + the controls that *set* the value on the
  left; the derived verdict / anchor on the right.
- **Input-vs-readout + value-when-authored.** The editable control (swatch / field) is an *input* only
  when the value is author-chosen, a *read-out* otherwise; show the concrete value (hex) only then.
- **Auto / Custom / Pinned source model** where a value can follow-the-brand vs be tuned vs be locked —
  **Auto** as the hands-off default; a **padlock** badge marks a pinned/locked value; only one control
  is ever live at a time (no two editable inputs for the same value).
- **Minimal readouts** — show the value, not name+value (an anchor reads `◆ 550`, not `primary/550`).

---

## Not-universal — Palettes-specific, do NOT blanket-apply

- The **three-source neutral** model and the **anchor** (pinned-seed) concept are ramp-primitive
  specific. Don't force them onto pages that aren't authoring a seeded ramp.

---

## Decide per page (not a blanket rule, but a conscious call each time)

- **Mode-scoping** (Surfaces #61): a page whose content differs per mode shows the **active** mode and
  switches with the mode strip, rather than all modes side-by-side. Decide per page whether it's
  mode-scoped or mode-agnostic.
- **Theme of the tool chrome:** the dashboard chrome stays **light** by deliberate choice (confirmed
  during the palette mock) — not an oversight. Don't add a dark tool-chrome per page.

---

## Reviewing a page (the method, generalized from the Typography pass)

The Typography review (2026-08-03) found 11 issues, of which **two were defects users were hitting**,
one was a **capability silently removed by an earlier refactor**, and **one was wrong**. The method
below is what separated them — run it per page, in this order.

1. **Extract the token vocabulary first.** Walk `out/<brand>.tokens.json` for the namespaces the page
   owns (`font.*`, `type.*`, …). That list is the vocabulary the UI is allowed to use. Everything after
   this is a comparison against it.
2. **Drive the page, don't read the source.** Load a brand with **4 modes and 3+ faces / palettes**
   (defaults hide width bugs) and collect section titles, descriptions, table headers, captions, notes,
   option labels and pills per tab. **Build the fixture from `schema/example-brands.json`, never from
   memory** — an input that fails validation drops the app to the *"Start a new brand"* screen, and the
   sweep then reports empty for every field. (Palettes pass: `brandColors: [{name, hex}]` when the real
   shape is `{name, oklch:{l,c,h}}`.) **When a sweep returns nothing, suspect the fixture before the
   page** — the emptiness is the tell, and plausible-looking partial data would not have been.
2b. **Compute token coverage from the brand the UI is RENDERING, not from a committed example.**
   Emitted names can depend on brand shape — breakpoint names are floor-COUNT dependent (6 floors →
   `xs`…`2xl`, 5 → `sm`…`2xl`), so comparing a 5-floor UI against 6-floor aurora invents a missing
   `breakpoint.xs`. Palettes hit the same wall with NB's brand-specific palette names and a phantom
   0% coverage. Generate the theme from the sweep's own fixture and diff against that.
3. **Measure the RENDERED page, never `textContent`.** *This is the rule that matters.* The one wrong
   finding in the whole review — "header casing is inconsistent" — came from comparing extracted
   strings; every header is `text-transform: uppercase`, so users saw nothing. Acting on it introduced
   a real regression (`ui-monospace` beside `-apple-system`). Use `getComputedStyle` and
   `getBoundingClientRect`; screenshot before believing a layout claim.
4. **Sweep structurally, don't spot-check.** Ask the property of **every** instance —
   *"for every `.mtbl-tbl`, find columns whose header carries `auto` and assert zero
   `select`/`input`/`button`"* — rather than probing one cell. A one-cell probe is exactly what let the
   derived-column bug ship in the first place. A structural sweep also covers instances added later
   **without anyone remembering to extend it**.
5. **Cross-check every label against the token vocabulary from step 1**, and against the *other tabs*.
   Collisions (one word, two meanings) and stale tier names both surface here.
6. **Compare widths against the shared grid at the default brand, not the convenient one.** "Clips at 4
   faces" is a nice-to-have; "clips at the default 2" is a defect.
7. **Separate container overflow from actually-clipped content, and report only the second.** A raw
   `scrollWidth > clientWidth` sweep fires on deliberate `overflow:visible` badges and on 2px of gap
   rounding. Re-check at the LEAF level (elements with no children) — Palettes flagged four containers
   and **zero clipped leaves**, so nothing was reported; Typography's 899→798 had specimens genuinely
   cut off. **A sweep that reports every anomaly is as useless as one that reports none.**

**When a fix cannot find the signal it needs, the missing signal is the actual defect.** The reported
Typography bug was a wrong Figma style name. The first fix tried to read mono-ness off the fallback
tail and could not — because that tail was itself category-derived. **That impossibility was the real
finding:** #415 had removed the only channel by which a brand could declare a face as monospace.
The symptom was the smaller half.

**An honest specimen of a bad pairing reads as a bug.** The first scrim card dimmed a text label:
accurate (white on 40% black over a light surface clears ~2.3:1) and indistinguishable from a broken
render. A specimen's job is to show the token doing the thing it exists for — the scrim went behind a
panel instead. When a truthful specimen looks wrong, the composition is wrong, not the truth.

**Verify with a non-vacuous control.** Assert the thing that must *not* change alongside the thing that
must: the mono-face test pins `body` → `Medium` **and** the same brand's `display` → `Semi Bold`, so it
fails if the mono table is ever applied globally. A test that only asserts the fix passes for the wrong
reason too.

**Two findings is a good result on a healthy page.** Typography's pass produced eleven, Palettes' two.
The method is not scored on volume — resist manufacturing work to look thorough, and say plainly when
a page is in good shape.

**Prose can outlive the thing it describes, and no gate catches it.** Motion's Easing section pointed
at "the specimen's emphasized *bar*" long after the specimen was rebuilt as curve cards. Cross-
references to other sections are the most rot-prone copy on a page — re-read them against what is
actually rendered, because nothing else will.

**Two runs agreeing EXACTLY is evidence of a broken probe, not a stable result.** A Preview tier
sweep returned identical section and row counts for Primitives and Semantics — the toggle selector
never matched, so one tier was measured twice and reported as two clean passes. Before believing a
sweep, assert that the thing you switched actually switched.

**Report findings you got wrong, in the log.** Two of mine were self-inflicted (the casing false
positive, and a pill whose trailing `*` reordered under `direction: rtl`). Both are recorded in
`00-progress.md` rather than quietly dropped — the next reviewer inherits the trap, not just the fix.

---

## Rollout status (per page)

| Page | Containers | Section headers | Token pills | Notes |
|---|---|---|---|---|
| Palettes | ✅ | ✅ | ✅ `palette.*` | #230–#232 — the reference implementation. Reviewed 2026-08-04 with the method above: **mode bar removed** (workspace byte-identical Light vs Dark — a ramp is mode-invariant; #268 found this and Layout together, Layout was fixed and this was missed) and **"Validation" → "Status ramps"** to match `BrandInput.status` / `palette.success\|warning\|danger\|info`. Two findings, no width defects |
| Surfaces & fills | ✅ | ✅ | ✅ `color.*` | #68 — full-width rows (Layout A): controls left, example (228px) right, contrast pill below; per-section contrast tables (Fills + Text; Backgrounds are grounds); adjustable Inverse (A1 override); gradient names + inline Add-stop vs full-width Add-gradient; text-on-surface previews (folds #64). Reviewed 2026-08-04: identity track 168→256px so the token path is readable (three of thirteen elided; the collapse breakpoint follows, 1120→1208), Backgrounds→Inverse and all three Text rows moved onto the shared `stepPicker` so every “Auto” names its resolved step, and the neutral step list is read off the brand's palette instead of a hardcoded copy that dropped the zero padding. Four findings, all consistency |
| Interactive | ✅ | ✅ | ✅ `color.interactive.*` (#232) | #69 — per-palette matrix: global behaviours (outline hover / disabled / icon colours) at top, then one section per action palette (Primary / Neutral / Destructive / accents) of full-width slot rows — Fill · rest, Fill · inverse, Text · rest, Text · inverse, Overlay wash, On-fill (+ inverse). Every slot/state binds to a real engine role: fill · rest is the family anchor, everything else is an A1 per-mode override; example (300px) + contrast pill locked right, Hover/Pressed states two-up below |
| Typography | ✅ | ✅ | ✅ `type.*` / `font.typeface.*` / `font.family.*` | **Reference implementation for the tier split and the mode rule.** Four tabs via `.pvseg` — **Primitives** (typeface library · size ladder · leading & tracking ladders) · **Semantics** (typeface bindings · weight roles · leading & tracking rungs + per mode) · **Text styles** (heading sizes · what each category is made of) · **Preview** (read-only). **#415** retired the `display|text|mono` family ROLE tier — each of the 7 categories binds a typeface directly (`font.family.<category>`), matching how Prism2's own brand-theme binds. **#416** states the per-mode rule above and removes the mode bar from the page. **#411** nudge controls are signed deltas with the resolved rung beneath. **#422/#423** derived-mode columns are readings. Reviewed end-to-end 2026-08-03; see the method section above |
| Elevation | ✅ | ✅ | ✅ `shadow.*` | #72 — Shadow editor + Elevation-ramp specimen as `.psec`; `shadow.xs…2xl` pills |
| Size & radius | ✅ | ✅ | ✅ `radius.*` / `size.*` | #72 — regrouped by **concept** (Corner radius · Density & size · Spacing grid), not advanced/not; Radius-ramp + Control-size specimens carry `radius.*` / `size.*.height` pills |
| Layout | ✅ | ✅ | ✅ `breakpoint.*` / `container.*` | #72 — Breakpoints + Grid & containers as `.psec`; the Layout-grid specimen table adds a `breakpoint.*` token column and the container bars carry `container.max` / `container.narrow` pills. Reviewed 2026-08-04: the container specimen was **overstating every ratio by ~1.5×** (bar percentages resolved against the whole row, including the 150px label — only the 100% bar overflowed and got shrunk back) **and** normalising `container.max` by its own value, so that slider could never move its own bar; both fixed and pinned by measured wanted-vs-got. `container.fluid` gained a row (dashed = no cap). `.ly-table` headers aligned to `.ctable` — they were the app's only `text-transform: lowercase`. The table was 500px in a 492px pane on `main` with all six headers wrapped and scrolled the document at 1100px; now fits, and scrolls in its own pane below that |
| Motion | ✅ | ✅ | ✅ `motion.*` | #72 — Tempo + Easing as `.psec` (easing promoted out of "advanced"); the Motion specimen rows carry `motion.duration.*` + `motion.easing.*` pills. Reviewed 2026-08-04 — coverage was **7 of 34**, the thinnest of any page. Added a read-only **Duration ramp** (six steps + the ms primitives they alias + the reduce-motion ramp, which two lines of copy promised and nothing showed), the full **curve set** (the section was titled Easing and showed one of six; `linear` and `calm` existed nowhere), **Springs**, `motion.stagger`, and a `motion.transition.*` pill on each specimen card. Now **34/34** |
| Preview | ✅ | ✅ | ✅ full `color.*` (#232) | token-list categories (Color / Dimension / Typography / Shadow) now `.psec` sections with tables scrolling in an `overflow-x` container; pills + master table already conformed. **Whole dashboard now on the doc-26 language.** Adds a **Style guide** sub-view (`renderPreviewStyleGuide`) — the resolved system in situ (Background / Foreground / Text color / Border / Icon / Disabled / Interactive) in `.psec` shells, driven live off the global mode picker; every full-role pill carries the resolvable `color.*` path (`sgPill` prefixes it; short leaf labels like `fill.rest` stay contextual under a namespaced block header). **Coverage audited 2026-08-04** against the resolver rather than by eye: the gallery showed **49 of 55** surfaces-vocabulary roles and now shows all 55 — Background gains a **Scrim** row, Foreground gains the **Inverse** tier (Background split Base/Inverse; Foreground had only Base), `text.on-inverse` gets a pill on the card it was already inking, and **Links** gains `focused` (the callout had enumerated three when `LINK_STATES` has four). Gallery pills wrap at `<wbr>` path boundaries rather than eliding — a 5-column status grid can never fit `color.foreground.warning`.  **Reviewed 2026-08-04** (last page of the audit). All 7 dark shadow values read as em-dashes in the Token list — `$extensions.prism3.modes.<mode>` has two shapes in the emitted tree (**441** colour overrides as `{ $value, … }`, shadow's **7** as the raw layer array) and the reader only handled the first. UI made tolerant; unifying the emit is an open contract decision, since `resolve-preview.ts` and `emit-figma-styles.ts` both read the array form. Also: the primitive caption asserted "no modes" above a per-mode table, shadow values truncated in the view that promises completeness, and **Contrast contracts was the only view of three with no `.psec` shell** — now wrapped, and carrying a pass/fail tally. |

Update this table as each page lands.
