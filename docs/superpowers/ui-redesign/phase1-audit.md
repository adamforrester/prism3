# UI redesign, Phase 1: audit and proposal

*2026-09-30. Measured at `main` 15db920 (engine 0.213.0, contract 14.0.0). No product code changes. This is input to the owner's design decisions, not a spec. Every design call below is flagged with options and a recommendation; none is made here.*

**Inputs:** the handoff (`HANDOFF.md`), owner direction (`owner-direction-2026-09-30.md`), Concept C (`concept-c-workbench.html` / `.md`), the delta (`delta-since-brief.md`), the brief and prompt (`../specs/2026-09-26-ui-exploration-*.md`), `docs/voice-standard.md`, the current UI code, and issues #896, #1371, #1195, #1675, #1727, #1556, #506 and #1807.

**Filed along the way (not fixed here, one concern per PR):**
- #1811: the Action palette description offers neutral, but its select doesn't.
- #1812: the manifest's `linkPalette` default says `primary`, but the engine follows the action palette.
- #1813: the studio re-declares the plugin wire types, and nothing checks the two copies agree.

---

## 0. Summary

1. **Concept C's core idea holds.** Levers sit in their own panel, all previews sit in one large center pane, and settings are grouped by domain. Keep all three.
2. **As a spec, the mockup is incomplete and partly stale.** It is missing:
   - two levers that already have controls (`buttonLabelWeight`, `typography.italicDefault`);
   - the style guide generator;
   - the §7.1 errors-with-fixes surface;
   - the `prism3` example brand, which is now the studio's boot default.

   It also invents a component list: 23 made-up defs instead of the real 26. Twelve of its controls disagree with the manifest: stops, steps, curation and labels. Its own "every lever placed once" check ran over its own key list, not the manifest.
3. **Modes are the biggest open design question.** Concept C makes the mode a global editing context in the top bar, which hides per-mode state and mixes *viewing* a mode with *editing* one. Section 3 gives three alternatives. **The recommendation is B**: the preview owns which mode you look at, and the levers panel always edits the base, with per-mode overrides shown inline under the lever they override.
4. **380×420 does not work as drawn.** About 170px of settings are visible, which is one lever. The preview is hidden, the domain tabs clip and the verdict disappears. The narrow mode needs its own design (§1.6).
5. **Architecture: strangle incrementally on a small foundation. Don't refactor everything first, and don't redesign in one piece.** Four behavior-neutral foundation slices go first:
   - stable test hooks;
   - #896 entry and store split, plus one invalidation path;
   - a host-session reducer;
   - a manifest-driven lever renderer with chips (#1675).

   Then each domain is redesigned into the new shell, one at a time. Stay dependency-free: vanilla TypeScript, a small in-house store and the existing `el()` kit, with no framework (§2.4).

---

## 1. Mockup audit

### 1.1 Lever coverage (all 49 in `lever-manifest.json`, 26 advanced)

**Scope, per the engine** (`packages/engine/theme.ts:94–150` `ModeLevers`, plus `surfaces` at :375):
- **Per mode (M), customizable modes only:**
  - `radiusScale`, `density` (heights only), `motionPersonality.tempo`;
  - `typography.families`, `typography.weightRoles`;
  - `shadow.softness`, `shadow.tint`;
  - `surfaces`, but only for **light and dark**; a custom mode cannot set one.
- **Per mode through overrides:** `overrides[mode][role]` and `modeAnchors`.
- **Light only (L):** adding or removing `interactivePalettes` columns.
- **Global (G):** everything else.

| Status (against the manifest) | Count | Levers |
|---|---|---|
| Placed exactly once | 41 | Includes `surfaces` split into three rows and `shadow.tint` split into hue and amount |
| Folded, with no control of its own | 6 | `status.*` ×4 (one stub row); `typography.links` (shares the italics row); `neutral.anchor` (a "Pinned" option with no color picker) |
| **Missing** | **2** | `buttonLabelWeight` and `typography.italicDefault`. Both have controls today (`main.ts:4678`, `main.ts:6553`). |
| Duplicated | 0 | |
| Misplaced by domain | 0 clear cases | `typography.responsive` moved from Layout to Type. Today's placement was a decision (#361), so this is **Q5**. |
| Control disagrees with the manifest | 12 | See the list below |
| Scope wrong | 1 | `surfaces`: the mockup tags it "All modes" in light and editable in custom modes. The engine allows neither. |

**The twelve control mismatches** (the mockup against the manifest):
- `neutral.chroma` stops: .008/.016/.026, instead of pure 0 / subtle .006 / tinted .012 / saturated .02.
- `radiusScale` step: 0.1 instead of 0.5.
- `disabledMin` step: 0.1 instead of 0.5. That makes it exactly four values.
- `shadow.softness` stops: crisp 0 and soft 1.5, instead of crisp .4 and soft 1.4.
- `layout.containerMax` and `layout.containerNarrow`: step 8 and no named stops.
- `layout.columns`: a free slider, dropping today's curated 4/6/8/12/16/24 (#264).
- `displayCeiling` px: 32–72, where the engine gives 48/64/80/96/128/160.
- `gradients`: an invented Off / On / Custom enum. The manifest has a toggle, and "on" reveals the list editor.
- `typography.responsive`: the min and max viewport fields are dropped.
- `controlShape`, `outlineInteraction` and `neutralEmphasis` show raw values instead of the manifest labels.

**Verified from the delta:**
- `strictInteractiveContrast`, `typography.captionFloor` and `typography.sizeFloor` still have **no control on either surface**.
- `buttonLabelWeight` and `italicDefault` do have controls today.

### 1.2 Lever grouping

Concept C's domains are Brand · Color · Type · Shape · Depth & motion · Layout · Components. They map cleanly to the brief's jobs (§2):
- **Brand** is the start-a-brand job (job 1).
- The other domains are tuning (job 2), organized by the thing you want to change.

**Proposed moves and rulings:**

| Lever(s) | Mockup | Proposal | Reason (job) |
|---|---|---|---|
| `iconContrast`, `disabledStrategy`, `disabledMin`, `outlineInteraction`, `neutralEmphasis`, `gradients` | Spread over Color | **Keep.** The manifest's `advanced` *group* is a tier, not a domain; today's `pageOfLever` puts them on Interactive and Surfaces. | Job 3 (accessibility) sits with Color › Legibility. |
| `buttonIcons`, `buttonContentSize`, `buttonMinWidthMultiplier` | Components › Button | **Keep, and add `buttonLabelWeight`.** This gives component options a home as more components get them (brief §11). | Job 2: "change the buttons" |
| `typography.italics` + `typography.italicDefault` | Italics row; italicDefault missing | **Merge** into one per-category choice: Upright / Upright + italic / Italic only. The manifest says a category can't sit in both lists. | Job 2. Also removes an invalid state. Labels are **Q6**. |
| `typography.links` | Folded into italics | One column in the per-category matrix, as today | |
| `typography.responsive` | Type › Scale | **Type › Scale**, with a "Depends on Layout: breakpoints" link | Job 2: fluid headings are a heading-size decision. **Q5.** |
| `density` | Shape | Shape. Link to it from Components, because it drives component padding (through `space.*`) and heights. | |
| `root` (namespace), schema-only | Brand › Naming, as a plain text field | **Move out of the everyday path** (Export or Brand › Advanced), guarded with a warning that it renames every token | §8.2 "names are versioned". **Q9.** |
| 12 levers flagged `advanced` in the manifest but shown as everyday | `status.*`, `surfaces`, `weightRoles`, `shadow.tint`, `interactivePalettes`, four `layout.*` | **Q4:** should the manifest flag or the domain page decide the tier? | Every Layout lever is advanced, so a disclosure there hides the whole page. |

### 1.3 Controls: every lever's proposed control type

**Rules, applying the owner's direction and #1675:**
- **Chips** are a native radio group underneath (`fieldset` + `legend`), with a visible focus ring. They wrap when narrow, and the selected state is not shown by color alone.
  - Use them for **2–4 short options**, and wherever a slider's step leaves 4 or fewer values.
- **Selects** for 5+ options, a brand-dependent option list (palettes), or anything with an **"Auto: ‹value›"** default.
- **Sliders** keep their manifest named stops, and the readout shows the stop name.
- **Every description moves behind an "i".** The "i" must meet the requirements in §1.7.
- Five rows keep a **short inline line**, because the line is a state rather than an explanation (marked "+i" below):
  - the link-palette underline warning;
  - the density per-mode sentence;
  - the reason 16px is refused under the compact heading scale;
  - the 8px size-floor warning;
  - the caveat on Full disabled contrast.

| # | Lever | Proposed control | Proposed home |
|---|---|---|---|
| 1 | `primary` | Color (OKLCH + hex) | Brand |
| 2–4 | `neutral.hue`, `neutral.chroma`, `neutral.anchor` | Source chips (Follow primary / Custom tint / Pinned). Custom reveals a hue slider (warm, cool) and a chroma slider (pure, subtle, tinted, saturated). Pinned reveals a color picker. | Brand |
| 5 | `brandColors` | List editor (name + color); rename and remove cascade, with a preview of the count | Color › Palettes |
| 6 | `actionPalette` | Select | Color › Actions and links |
| 7 | `linkPalette` | Select, "Auto: follows action palette (‹name›)" +i | Color › Actions and links |
| 8–11 | `status.{success,warning,danger,info}` | One row per role: a select (Auto: ‹synthesized› / Custom hue / Use ‹palette›); Custom reveals a picker. Auto names what it resolves to. | Color › Palettes |
| 12 | `surfaces` (base, floorStep, inverseBase) | Three selects, each "Auto: ‹value›". Light and dark only. | Color › Surfaces |
| 13 | `strictInteractiveContrast` | Toggle (new control) | Color › Legibility |
| 14 | `linkStateRungs` | Three selects (Auto, 1–8) | Color › Actions and links (advanced) |
| 15 | `radiusScale` | Slider 0–2, step 0.5, stops sharp / modest / standard / soft / round | Shape |
| 16 | `density` | 3 chips +i ("a mode's density changes control heights only") | Shape |
| 17 | `controlShape` | 4 chips: Boxed / Hairline / Rounded / Pill | Shape |
| 18 | `buttonIcons` | 2 chips: Attached to label / Locked to edges | Components › Button |
| 19 | `buttonContentSize` | 2 chips: Match button size / One step smaller | Components › Button |
| 20 | `buttonLabelWeight` | 2 chips: Default / Emphasis | Components › Button |
| 21 | `buttonMinWidthMultiplier` | Slider 1–4, step 0.25, "× height" readout | Components › Button |
| 22 | `baseMd` | Slider or stepper, 2–12px | Shape (advanced) |
| 23 | `radiusHairline` | Toggle | Shape (advanced) |
| 24 | `typography.typeScale` | 3 chips; the px range goes behind the "i". Keep today's disable-on-clash for pinned sizes. | Type › Scale |
| 25 | `typography.families` | One select per category, from the library ("none" only for code) | Type › Faces |
| 26 | `typography.weightRoles` | 5 rows, each a select of 100–900 (9 options) | Type › Weights |
| 27 | `typography.displayCeiling` | Select, 6 options, with px computed by the engine | Type › Scale (advanced) |
| 28 | `typography.titleFloor` | 2 chips (18px / 16px); 16 is disabled under compact +i | Type › Scale (advanced) |
| 29 | `typography.captionFloor` | 2 chips (11px / 10px), new control | Type › Scale (advanced) |
| 30 | `typography.sizeFloor` | 2 chips (10px / 8px) +i, new control | Type › Scale (advanced) |
| 31 | `typography.responsive` | Toggle plus min and max viewport fields | Type › Scale (Q5) |
| 32 | `typography.weights` | Checkbox matrix (category × role), keeping the label/emphasis and body/caption default locks | Type › Weights (advanced) |
| 33 | `typography.links` | Column in the per-category matrix | Type › Weights (advanced) |
| 34–35 | `typography.italics` + `italicDefault` | Per category, 3 chips (Q6) | Type › Weights (advanced) |
| 36 | `motionPersonality.tempo` | 3 chips; the multipliers go behind the "i" | Depth & motion |
| 37 | `shadow.softness` | Slider 0–2, stops crisp .4 / standard 1 / soft 1.4 / diffuse 2 | Depth & motion |
| 38 | `shadow.tint` | Hue slider plus amount slider | Depth & motion |
| 39 | `layout.breakpoints` | List editor (px) | Layout |
| 40 | `layout.columns` | Select: 4 / 6 / 8 / 12 / 16 / 24 | Layout |
| 41 | `layout.containerMax` | Slider, step 40, stops narrow / standard / wide / full | Layout |
| 42 | `layout.containerNarrow` | Slider, step 20, stops tight / standard / generous / wide | Layout |
| 43 | `iconContrast` | 2 chips | Color › Legibility |
| 44 | `disabledStrategy` | 2 chips +i (Full caveat) | Color › Legibility |
| 45 | `disabledMin` | **4 chips**: 3 / 3.5 / 4 / 4.5:1, disabled under Full | Color › Legibility |
| 46 | `outlineInteraction` | 3 chips, with manifest labels | Color › Actions and links |
| 47 | `neutralEmphasis` | 2 chips: Subtle / Strong | Color › Actions and links |
| 48 | `interactivePalettes` | List editor (add from a select of promotable palettes); light only | Color › Actions and links |
| 49 | `gradients` | Toggle that reveals the gradient list editor. Turning it off previews what is discarded. | Color › Palettes |

**Schema-only inputs a complete UI exposes:**
- `id` and `root`: Brand, with `root` guarded (Q9).
- `modes` and `customModes`: see §3.
- `personality[]`: Brand, as multi-select chips. It has no control today.
- `overrides[mode][role]` and `modeAnchors`: see §3.
- The typography ladders, nudges, faces and library: Type.
- `easingRoles`: Depth & motion.
- Per-breakpoint grid overrides: Layout.

### 1.4 Views, actions and states

**Views (§5, as amended by the delta):**

| View | Verdict | What to change |
|---|---|---|
| Palettes | Change | Hex values sit in a hover-only `title`; show them. Show opacity steps. |
| Role resolution | Change | It shows one mode at a time; §5 asks for every mode. The anchored state is never shown. The mode model settles this (§3). |
| Style guide | Change | It has **no surface switch** (page / second tier / inverse), which today's studio has. It needs icon and border specimens. The sample copy "Light that bends to the brief." is an idiom with tool personality; use neutral copy. |
| Contrast | **Misplaced** | A 6-mode table sits in the 40% settings pane. It belongs in the preview pane as a view (Q8). |
| Token list | Change | Mode columns are "first 4 modes"; §5 wants "where values differ". The stale 13.0.0 contract text must be read from `version.ts`. |
| Type | Change | Missing: the size, line-height and tracking ladders, the ramp across modes, and the real `clamp()` values. |
| Size & shape | Change | The ladder still has a **Padding** column (gone since #1792), and 3 of the 5 rungs (28/36/44/56/68). The button layout specimens are missing. Spacing shows as one line; the emitted `space.*` scale has sub-8px steps. |
| Elevation, Motion, Layout | OK | Motion's Play does nothing under reduced motion, without saying why. |
| Components | **Wrong data** | Use the real 26 defs (icon, focus-ring, the button family, field-label/message, text-field, textarea, checkbox/radio/switch families, select, veil, image-placeholder, spinner, badge, tag), with variant count and nesting. |
| Decisions log | OK (placement: Q8) | Label it "Decisions log"; §9 keeps that term. |
| #1802 unresolved type styles | **Missing** | Owner question (Q10). |

**Actions (§6 plus the delta):**

| Action | Verdict |
|---|---|
| Start: from a color, blank, example, import, from this file | OK, except **`prism3` is missing** (boot default, `main.ts:82`) and the **studio first-run start screen is gone** (the plugin start moment, #1197; empty-file start, #506) |
| Replace guard | OK. Name the loss in the button ("Discard 3 edits"). |
| Export tokens (options, file list, live sample) and Export brief | OK. "camelCase is refused." needs its reason. |
| Apply Theme | Change. The top-bar Apply **stays enabled during a write** and **navigates away** to File. The pre-flight conflict state is missing. |
| Prune stale (preview, then confirm on a fresh read) | OK |
| Set up file | Change. The result omits the `_Section-header` headers and the style-guide cell components that setup now places. |
| Build set | Change. Dependencies should be **their own lines**; the **retry** phase is missing (`agent-protocol.ts:85`). |
| Read-back | Change. There is no declared-vs-planned mode comparison (#1704). |
| **Style guide generator** | **Missing entirely.** On `main` the panel exposes Color value, Header, Display style, Aliases and Description; collections and types are agent-only. The phase-2 lane (#1784/#1788, open) adds the table filter, dimension and font specimens, paragraph-spacing and decoration columns, the Name column and REM. The **Pixels toggle is still in the lane's code**, so its removal is owner intent, not yet code (Q11). |
| Agent link and commands | OK in shape. It needs a style-guide slot. **The simulated agent preempts a running panel write**; the design must queue agent work behind it and show the queue. |

**States (§7, §7.1):**
- **OK:** the refusal banner with last good, below-floor flags, disabled and link caveats, font availability, mobile merges, and contrast marks before choosing.
- **Missing:**
  - the weight-roles-crossing warning;
  - the stale font-cut pin warning;
  - the heading scale vs pinned sizes warning;
  - #1802;
  - a computed build identity: the mockup asserts "Plugin current", while the real parser is `apps/studio/src/build-identity.ts`;
  - background-window detection (advice text only).
- **§7.1, one place for activity: partial and split across four surfaces.**
  - Only Build shows progress. Apply, Prune and Set up have none.
  - **None of the ten error causes** is shown grouped, with its fix.
  - History is overwritten by the next run.
  - The plugin *already* streams agent build progress (`apps/plugin/src/main.ts:953` → `agent-progress`), but the studio never renders it. That gap is now UI-only.
  - Placement is **Q2**.

### 1.5 Rules (§8)

| Rule | Mockup |
|---|---|
| Warn, don't block | Honored |
| Auto names its value | Mostly. The status colors show a bare "Auto". |
| Downstream uses last good | Honored |
| Destructive: preview, then confirm | Prune only. Gradients off, mode off and brand-color remove have no preview. |
| Renames cascade | Honored (the count is hard-coded) |
| **Names versioned, values not** | **Broken.** `root` is an ordinary text field (Q9). |
| Offline, no web fonts | **Broken in the prototype** (Google Fonts). The real design needs an explicit "face not installed" state: fallback plus a marker. |
| Two contexts, serialized writes | Modeled, but the agent preempts panel writes (see above) |
| Light chrome | Honored |
| 380×420 | **Fails.** Detail in §1.6. |

### 1.6 The narrow working mode (380×420)

These heights were measured in Chromium, with the mockup's fake 22px title bar removed:

| Region | Height |
|---|---|
| Top bar | 47px |
| Sticky domain tabs | 55px |
| Bottom bar | 39px |
| Scrolling settings area | 278px |
| First setting's top edge | about 190px down |
| Settings visible | about 170px, which is **one lever** |

At this size:
- the preview is hidden, so "preview follows the setting" has nothing to follow;
- the tabs clip with no scroll cue;
- the contrast verdict and Export are hidden;
- a running build's progress sits below the fold.

**Proposal (Q7):**
- **The top bar collapses to one 36px row:** brand select, verdict dot, a Settings/Preview toggle and an overflow menu (Export, Apply, File).
- **Domain tabs become a select.**
- **Nothing else is sticky.**
- **Activity (§7.1) shows as a thin progress strip under the top bar** while an operation runs, and expands on demand.

### 1.7 Accessibility of the tool (§8.5)

- **Chrome text contrast passes;** the lowest pair is 4.65:1. **Control borders fail** WCAG 1.4.11: `#c4c4c1` on white is 1.75:1. That border is the only boundary on inputs, selects and unselected chips.
- **Focus and selected look identical** (the same 2px ink outline) in the step picker and the start options.
- **Hit targets:**
  - text links "Show advanced", "Reset to default", "Driven by" and "Depends on" are about 19–20px tall;
  - fix: a 24px minimum block size.
- **Dialogs:**
  - native `showModal()` gives inertness and Esc, which is better than today's studio (brief: "Today they don't");
  - focus return breaks because the page re-renders under the dialog;
  - the product must return focus to the trigger explicitly.
- **Preview follows focus** redraws the preview on every Tab and discards a view picked by hand. Nothing announces the change, and it risks WCAG 3.2.1.
  - **Recommendation (Q3):** follow on *change or commit*, not on focus.
  - Debounce the redraw.
  - Add a "keep this view" pin.
  - Announce the view change in a polite live region.
- **The "i" affordance:**
  - a real `<button>`, at least 24×24, named after its lever ("About Density");
  - opens a click or tap toggletip, not hover-only;
  - closes on Esc and does not trap focus;
  - **never the only carrier of a number the user needs** (a ratio or a floor).

  The mockup also hides real data in `title` tooltips: hex values, the fail dot and "Derived, read-only". Those must become visible text.
- **Reduced motion:** the motion specimen must say it is paused, or play only on an explicit request.
- **Invalid ARIA:** the Export dialog tabs carry both `aria-pressed` and `aria-selected`, with no tabpanel. Use real tabs or a chip group.

### 1.8 Voice (§8.4)

- **Clean on the basics:** no UK spellings, banned words or exclamation marks.
- **To fix:**
  - The domain intros run 130–160 characters against the ~90 limit. The Brand intro also misstates the mechanism: a name generates nothing.
  - "Contrast ok" is vague. Say "All 384 pairs at or above floor".
  - Empty states such as "Nothing matches." should say what appears and what produces it.
  - "Keep Figma in the **foreground**" collides with the §9 meaning of foreground (fills and surfaces). Say "Keep the Figma window in front".
  - "generate-only" is internal jargon. Say "follows light, so it has no settings of its own".
- **Vocabulary rulings:**
  - Adopt "verdict" for "pill"; the agent protocol already uses it.
  - "Engine notes" → **"Decisions log"**, the §9 term.
  - "Roles" and "Depends on" are fine.
  - "Build a component set" → **"Build set"**.
  - Pick one of "Read back" / "Read-back".

---

## 2. Architecture assessment and recommendation

### 2.1 Today's structure, measured

**File shape.**
- **`apps/studio/src/main.ts`:** 10,057 lines, 689 KB. 39% of the lines are comments, which leaves about 5,800 lines of code.
- **Declarations:** 413 top-level declarations and **0 exports**.
- **Largest regions:**

  | Region | Lines |
  |---|---|
  | Typography | about 2,080 |
  | Interactive | 1,019 |
  | Figma action panel | about 650 |
  | Brand menu, import and export | about 580 |
  | Palettes | 473 |
  | Shell | 413 |

**Rendering.** An imperative DOM builder, `el()` (949 call sites), plus a control kit. Events are bound per element: 121 `.onX =` handlers and no event delegation. `innerHTML` is used only to clear a node or to inject static SVG.

**State.**
- There are **61 module-level `let`s** and no store.
- `brandState` is edited in place from **223 sites**; `currentMode` has 72 references.
- About 17 host/action slots are written only by `onHostMessage` (`main.ts:800–966`). That handler reaches into page-owned DOM handles and calls functions defined thousands of lines later.

**Re-render.**
- The engine re-resolves fully on every edit.
- Repainting comes in **three tiers, and each caller picks its own**:
  - `apply()`: 40 call sites.
  - `applyFull()`: 53 call sites. It rebuilds the whole page off-screen and reconciles by section title and by `outerHTML`.
  - `build()`: 30 call sites.
- `renderBar()` adds 46 more targeted repaints.
- This model produced #870, and it is why `setVolatile` exists: a painter can close over detached nodes.

**Levers.** About 13 of the 49 go through the generic `renderControl`, and even those keys are hand-listed. About 36 have bespoke editors. The page each lever lands on is also hand-coded (`pageOfLever`).

**CSS.** `styles.css` is 1,570 lines. It has 23 `:root` tokens but also 211 raw hex values, and it is light only. `installStyles` enforces a class-scope law at boot.

**How studio and plugin share the UI:**

```
packages/engine  (pure TS; imported by name)
      │
apps/studio/src/main.ts ── the whole UI; side effects at import; 0 exports
  ├ write-adapter.ts  HostCommit: 5 post methods + onHostMessage + requestResize + isFigma
  │                   web = no-ops · figma = postMessage + validation into 11 internal kinds
  ├ styles.css (text-loaded, injected) · persist-local.ts (web only)
  └ 6 extracted pure modules (provenance, export-settings, build-identity, …)  ← the only unit-tested parts
      │
  WEB:    esbuild → apps/studio/dist/main.js
  PLUGIN: apps/plugin/src/ui/entry.ts = import studio main.ts + mountAgentLink()
          build.mjs → inlines the bundle into dist/ui.html (asserts one </script>)
          iframe ⇄ figma.ui.postMessage ⇄ apps/plugin/src/main.ts (10 UI→main, 15 main→UI kinds)
```

The wire types exist twice. `write-adapter.ts` re-declares what `messages.ts` defines (#1813).

**Is `main.ts` "too big to work in safely"?** Yes.
- It had 69 commits in 60 days, from unrelated lanes.
- It has two recurring defect classes: a stale repaint (#870) and an orphaned painter.
- It has no unit reach.

But the file's size is **not** the main cause of merge serialization. #1807 found 40 of 40 PR pairs conflicting, driven by `00-progress.md` and the version stamps; only 5 were real content conflicts. The case for splitting rests on safety and testability, not on merge conflicts.

### 2.2 Recommended module structure

These seams follow the file's own regions. Lines are approximate.

```
apps/studio/src/
  entry.ts              ~150   the only file with import-time effects: #app, installStyles, grip, subscribe, first render
  state/store.ts        ~500   BrandInput session: brandState, lastGood, theme/rp, currentMode, page, setPath,
                                per-mode lever I/O, loadBrand; ONE invalidate(topic) → subscribers  [Node-testable]
  state/host-session.ts ~350   pure reduce(hostState, MainToUi msg) for apply/build/setup/style-guide/prune/agent
                                progress + history                                                  [Node-testable]
  host/                  354   write-adapter.ts as-is, importing messages.ts types (#1813)
  ui/kit.ts             ~450   el(), class-scope law, control kit, chips (#1675), info toggletip
  levers/render.ts      ~250   manifest → pure control descriptor (chips / select / slider / …) → DOM   [mapping testable]
  domains/<domain>.ts  ~6000   Brand, Color, Type, Shape, Depth & motion, Layout, Components editors
  preview/<view>.ts     ~850   style guide, palettes, type, size & shape, elevation, motion, layout, components,
                                tokens, contrast, decisions log
  figma/panel.ts        ~650   Apply / Build / Set up / Style guide / Prune / Read-back, activity surface (§7.1)
  dialogs/              ~780   start, brand menu, import, export, replace guard, prune confirm
  shell.ts              ~900   layout, split, mode control, narrow mode, render loop
```

**The seam that matters most is the store and its single invalidation path.** Without it, every module has to import `apply`, `applyFull`, `build` and `renderBar` and decide for itself what to repaint, and the split recreates the coupling across files. The host-session reducer comes second: it turns #870-class bugs into Node unit tests.

### 2.3 Sequencing: strangle incrementally on a small foundation

**Recommendation.** Do a short refactor-first foundation, then redesign domain by domain into the new structure. The old pages stay live until each one is replaced.

**Why not refactor everything first.** About 6,000 of the lines are domain editors that the redesign will replace anyway. A pixel-identical refactor of Typography's 2,080 lines, followed by a rewrite, is double work, and it spends the safety net twice.

**Why not redesign in one piece.** `main.ts` takes about one commit a day from other lanes. A long-lived redesign branch would conflict constantly, and `test:smoke` (201 assertions), `test:verdict` and `test:start` are pinned to today's DOM. A big bang would turn them all red at once, and a red suite hides real regressions.

**Why the foundation first.** Every redesign slice needs the same four things:
- a store to read from;
- one invalidation path;
- a chip-capable lever renderer;
- test hooks that survive a redesign.

Building those once, behavior-neutral, lets each redesign slice stay small.

**The foundation slices.** Each is its own PR, each changes no behavior, and each runs the full gate list.

| # | Slice | What it proves | Mutation that must fail by name |
|---|---|---|---|
| F1 | **Stable test hooks.** Add `data-p3="…"` attributes on the regions, controls, verdicts and Figma rows the browser suites use, and migrate `test:smoke`, `test:verdict` and `test:start` to them. Key `regionKey` and `SECTION_MODE_SCOPE` on the hooks, not on title text. | Suites no longer depend on class names or copy | Drop one hook, and the suite that reads it fails naming it |
| F2 | **#896: entry and store split, plus one invalidation path.** Move the import-time effects into `entry.ts`, and move state into `store.ts` with `invalidate(topic)`. The existing `apply` / `applyFull` / `renderBar` become subscribers. Move the gates that read `main.ts` as text (`lint-ramp-steps.ts:109`, `lint-ramp-values.ts:111`, `lint-layout-claims.ts:326`, `apps/studio/lint-contrast.mjs`) **in the same PR**. | One new Node test that imports the store with no DOM (#896's done condition) | Break the store's last-good rule; the new test fails. Move a ramp const without the gate change; `lint-ramp-*` fails. |
| F3 | **Host-session reducer.** A pure `reduce()` for the host/action state, with `messages.ts` types imported (#1813). | #870 replayed as a unit test | Drop a repaint topic; the test fails |
| F4 | **Manifest-driven lever renderer with chips (#1675).** Add a pure descriptor mapping from the manifest, and render today's controls through it. **This slice is not behavior-neutral:** selects become chips on the 2–4-option enums, which the owner already asked for in #1675. | The mapping is tested in Node against the manifest's own control and option counts | Add a 5th option to a fixture enum; the chip→select test fails |

After the foundation, the redesign slices build the new shell with levers on one side and previews in the center. The domains then move over one at a time, and each retires its old page:
1. Brand
2. Color
3. Type
4. Shape
5. Depth & motion
6. Layout
7. Components
8. The Figma panel with the activity surface

The old rail stays reachable until the last domain has moved.

### 2.4 Rendering approach

- **Stay vanilla TypeScript, with no framework.**
  - Zero runtime dependencies is a project principle (CLAUDE.md principle 2).
  - "Vanilla, not React" is a locked decision in `docs/22` §2.
  - A framework would put third-party code and strings into the bundles that `lint-us-english` and `lint-voice` scan, and the plugin must stay one offline, inlined `ui.html`.
- **The real problem is invalidation, not templating.** A 60–100-line in-house store fixes it: typed topics (`brand`, `mode`, `host`, `view`, `page`) and `subscribe(topic, fn)`. Each view subscribes to what it reads, so a caller never picks the repaint.
- **Keep the `el()` kit and the class-scope law.**
- **Replace the `outerHTML`-diff reconcile** with keyed regions (`data-p3`). Regions re-render when their topic fires, and focus is preserved by keeping the node rather than by diffing.
- **Testability (#896):**
  - The store, the host reducer and the lever descriptor mapping become plain modules with no DOM, tested with `tsx` in the existing studio `test`.
  - DOM-level behavior stays in Playwright.
- **What would change this recommendation:** if a later slice needed a keyed list diff at scale (the role × mode matrix has hundreds of rows), a small vendored helper can be measured then. It is not a reason to adopt a framework now.

### 2.5 How the existing gates carry over

| Gate | Through the foundation | Through the redesign |
|---|---|---|
| studio `test` | Grows: store, host reducer and lever mapping get Node tests | Grows with each domain's value logic |
| `test:smoke` (Playwright, 201 assertions, rendered contrast #1777) | Unchanged in behavior; F1 moves it to `data-p3` hooks | Each domain slice updates its own scenarios. The per-page × mode × brand sweep and the rendered-legibility probe carry over unchanged. |
| `check:ignore` | Update only if the entry path changes (then also `package.json`, `build-site.mjs`, `ui/entry.ts` and `tsconfig.ui.json`) | No change |
| `lint:contrast` | Unchanged while tokens stay in `styles.css` `:root` as hex | Extend the 16 fixed pairs with a **non-text 3:1 pair** for control borders (today 1.75:1, §1.7), and with each new chrome token |
| plugin `test:verdict` | F1 moves it to hooks. Its 9 literal verdict strings stay, and they are the copy contract. | The Figma panel slice rewrites it around the activity surface, **including agent-started progress** |
| plugin `test:start` | F1 moves it to hooks | Updated in the start-screen slice (#506 empty-file start) |
| `lint-us-english`, `lint-voice` | Unaffected, since esbuild still emits one bundle, as long as there are no extra files in `apps/plugin/dist` | Every new string is gated. Chip labels come from the manifest (`levers.ts`), so copy edits there bump ENGINE. |
| `lint-ramp-steps`, `lint-ramp-values` (read `main.ts` as text) | **Must move with the consts in F2.** Importing them is the better end state, but the importer must stay independent of the subject (`docs/34`). | Unchanged after F2 |
| `installStyles` class-scope law | Moves to `ui/kit.ts` unchanged | Stays the CSS gate |

**Versioning.** UI-only slices under `apps/studio` and `apps/plugin` do not bump ENGINE (`docs/30`, host executors). Any change to lever labels, stops or descriptions lives in `packages/engine/levers.ts`, so it bumps ENGINE. The next free version is 0.216.0: `main` is at 0.213.0, and open PRs claim 0.214.0 (#1804) and 0.215.0 (#1808). #1807 has changed nothing yet, so progress entries stay at the top of `docs/00-progress.md`, one per feature PR.

---

## 3. Modes: three alternatives

**What any model must carry:**
- **Five kinds of mode:**
  - base (`light`);
  - customizable (`dark`, custom modes);
  - derived and read-only (`hc-light`, `hc-dark`, `wireframe`).
- **Per-mode overrides:**
  - the `ModeLevers` levers listed in §1.1;
  - per role;
  - per column anchor.
- **Per-mode density changes heights only.** The decided sentence: "Spacing follows the brand's density, not the mode's: a mode's density changes control heights only."
- **`surfaces` exists only for light and dark.**
- **Constraints:**
  - `typeScale` is never per mode;
  - there are no overrides "on light", because light is the global value.

### A. Global mode context (Concept C as drawn)

- **How it works:** a segmented mode switcher in the top bar, with derived modes hatched. Selecting a mode changes both what the preview shows and what the levers edit. Rows tag their scope ("dark only", "Light only", "Read-only here").
- **Derived modes:** every lever greys to "Read-only here", with the reason.
- **Overrides:** each lever edits the override when a customizable mode is selected. Color › Roles shows one mode.
- **Density:** the tag reads "dark only", and the heights-only sentence has to be added.
- **Strengths:** one concept, and the whole screen agrees on a mode.
- **Costs:**
  - It mixes *looking at* dark with *editing* dark. A user who switches to dark to check a contrast result, then touches a lever, has made a dark override without meaning to.
  - Per-mode state is invisible until you switch to that mode.
  - There is no side-by-side comparison, a weakness the concept note itself admits.
  - Every row needs a scope tag.

### B. The preview owns the mode; levers edit the base and show overrides inline (recommended)

- **The mode switcher moves into the preview header.** It chooses what you *see*, with an optional "Compare" that splits the preview into two modes side by side.
- **The levers panel always edits the base value.**
- **Each per-mode lever has an inline "Per mode" disclosure** under it, with one compact row per mode:

  | Mode | Row shows |
  |---|---|
  | dark / custom | "Auto: follows light (Comfortable)", or a chip for the override |
  | hc-light / hc-dark / wireframe | Read-only: "Follows dark. No settings of its own." plus its contrast verdict |

- **The disclosure shows a count when overrides exist** ("Per mode · 1 override"), so per-mode state is visible without switching anything.
- **Density's heights-only sentence** sits once, inside its disclosure.
- **Surfaces show only light and dark rows.**
- **Role overrides get a matrix in Color › Roles:** role × mode, with derived columns hatched and read-only. The column for the preview's current mode is highlighted.
- **Strengths:**
  - Viewing and editing are separate, which extends the owner's core idea (previews apart from levers) to modes.
  - An accidental override can't happen.
  - Every override is visible where its lever lives.
  - Comparison comes free.
  - The narrow mode is simpler: the mode control lives with the preview pane.
- **Costs:**
  - The disclosures lengthen long pages, although only 8 levers have them, plus the per-column action anchors.
  - The matrix is wide. At narrow sizes it becomes a one-mode list with a mode select.

### C. A Modes workspace

- **Everywhere else edits global values only.** A dedicated **Modes** view holds every per-mode decision:
  - a lever × mode table;
  - the role × mode matrix;
  - the custom-mode list;
  - the derived modes as read-only columns.
- **Strengths:**
  - One audit spot for every override.
  - Strongest comparison.
  - The simplest domain pages.
- **Costs:**
  - An override is far from its lever: to make shadows softer in dark, you leave Depth & motion.
  - Two places touch one lever.
  - It works against "return editing uses the same map as first run", the concept note's own argument for domains.

**Recommendation: B.** A's switcher can remain as the preview's mode control, with the same segmented look and hatched derived modes, but it moves to the preview header and edits nothing. **Q1.**

---

## 4. Questions for the owner

Each has a recommendation and needs only a short answer.

1. **Mode model (§3).** A, B or C? **Recommend B**: the preview owns the viewing mode, levers edit the base, per-mode overrides are inline, roles get a mode matrix.
2. **Where §7.1 "one place for activity" lives.**
   - Options:
     - (a) a File domain in the settings pane, as in the mockup;
     - (b) an **Activity drawer** at the bottom of the preview pane: it opens on any Figma operation or agent command, shows progress, then the outcome, errors grouped with fixes, and history per operation;
     - (c) a right-hand rail.
   - **Recommend (b).** It is reachable from every domain, leaves the levers in place while a build runs, and folds into a thin strip at 380×420.
   - The Figma actions (Apply, Build, Set up, Style guide, Prune, Read-back) move into a "Figma" menu in the top bar. Each opens its options in the drawer.
3. **Preview follows the setting.** The mockup follows on focus. **Recommend following on change or commit**, with a "keep this view" pin and a polite announcement, to avoid flicker and the WCAG 3.2.1 risk.
4. **Advanced tier.** Twelve levers are `advanced` in the manifest but everyday in the mockup. **Recommend that the manifest flag decides the tier**, except in Layout, where every lever is advanced and a disclosure would hide the whole page. The alternative is to change those flags in the manifest (an ENGINE bump).
5. **`typography.responsive`.** Keep it in Layout (today, #361), or move it to Type › Scale? **Recommend Type**, with a "Depends on Layout: breakpoints" link.
6. **Italics.** Merge `italics` and `italicDefault` into one per-category 3-chip choice? **Recommend yes.** The labels are yours; proposed: *Upright* / *Upright + italic* / *Italic only*.
7. **Narrow mode (380×420).** **Recommend a single pane with a Settings/Preview toggle:**
   - one 36px top row (brand, verdict dot, toggle, overflow menu);
   - domain tabs become a select;
   - no other sticky bars;
   - an activity strip while an operation runs.

   Or do you want a different narrow model?
8. **Contrast and Decisions log.** Move both into the preview pane as views, which gives them the room, with Health as a top-bar verdict that opens the Contrast view? **Recommend yes.**
9. **Token namespace (`root`).** Move it out of the everyday Brand page into Brand › Advanced, with a warning that it renames every token path? **Recommend yes.**
10. **#1802 unresolved type styles.** Show the list, as a warning in the Type view and in Health? **Recommend yes.** The separate question, whether a heading falls back to the heaviest shipped weight, is an engine decision to take in its own issue.
11. **Style guide generator in v4.** Mock the phase-2 lane's option set (tables filter, dimension and font specimens, paragraph spacing, decoration, Name column, REM), and drop Pixels as you intend? **Recommend yes**, marked "pending #1784/#1788".
12. **Architecture (§2).** Approve:
    - foundation-first strangling: F1–F4, then domain slices;
    - staying framework-free with an in-house store.

    **Recommend yes to both.** F4 changes 2–4-option selects to chips, which #1675 already asks for; confirm it can land before the v4 visual design.
13. **Labels.** "verdict" for pill, "Decisions log" (not "Engine notes"), "Build set", "Read-back", and "Keep the Figma window in front". **Recommend adopting all of them.** They are copy decisions, so they're yours.
14. **Start screens.** Keep a first-run start screen in the studio, and add the empty-file start in the plugin (#506)? **Recommend yes**, so both hosts open the same way.
