# Prism3 Studio + Plugin: product brief for UI exploration

*Status as of 2026-09-26 (engine 0.166.0, token contract 13.0.0). This brief describes what the product must do. It deliberately does not describe how today's UI arranges it; the current structure appears only in Appendix B, as something to avoid copying.*

---

## 1. What Prism3 is

Prism3 is a **design-token engine** that grows a complete, accessible design system for a brand from a small input: one brand color, a neutral tint, and a handful of optional settings. It emits:
- W3C DTCG design tokens;
- an agent-readable sidecar (`.ai.json`);
- Figma variables and styles;
- Figma component sets.

Out of a minimum input of three fields it produces roughly 575 tokens across color, type, space, size, radius, elevation, motion, layout and focus. It also verifies **contrast contracts** in every mode.

There are two UI surfaces over the same engine, and they are **one codebase**:

| Surface | Host | Job |
|---|---|---|
| **Studio** | Web app (desktop-first) | Author and tune a brand; inspect the generated system; export files. |
| **Plugin** | Figma plugin window. It runs the *same* studio UI inside Figma, plus Figma-only actions. | Everything the studio does, **plus** write the system into the open Figma file: variables, styles, page scaffold and component sets. |

A third surface is not a visual UI but shapes the product. **Agents** can drive the engine through MCP tools, and can drive the plugin through the **Agent link**. The UI has to coexist with an agent doing work in the same file.

### Who uses it

- **The design-system consultant** (primary): a VML designer standing up or re-platforming a client's design system. They are expert in design systems and not necessarily in color science. They switch between several client brands.
- **The brand's designers**: they maintain the Figma library the plugin builds, and re-apply when the brand changes.
- **Developers**: they take the exported tokens. They rarely touch the studio but read its output.
- **Agents**: they author briefs, apply themes, build components and read results back.

### The load-bearing product principle: **recessive**

Prism3 builds *other people's* brands. The tool's own chrome, voice and visual identity must never compete with the brand being previewed. The brand's colors, type and shapes are the loudest thing on screen; the tool is quiet, precise and neutral. See §8.4.

---

## 2. Jobs to be done

These are the tasks the UI must support, in rough order of frequency. They are not a navigation structure.

1. **Start a brand**, from one of:
   - a single color;
   - a neutral blank;
   - an example brand;
   - an imported brand brief (`design.md`);
   - the settings already saved in a Figma file.
2. **Tune the brand**: adjust any of about 47 settings (called **levers**), see the whole system respond live, and find out which settings matter for what.
3. **Check accessibility**: see every contrast pair in every mode, find what fails, and understand why and what would fix it.
4. **Compare and edit modes**: light, dark, high-contrast, wireframe and custom modes. Some settings apply to all modes; some can be overridden per mode; some modes are read-only.
5. **Inspect the result**: the generated palettes, roles, type ramp, spacing, radii, shadows, motion curves, layout grid and component specimens, plus the token names a developer will use.
6. **Hand off**: export tokens (with format options) or the brand brief.
7. **Push into Figma** (plugin only):
   - apply the theme to the file;
   - remove stale items;
   - scaffold the file's pages;
   - build component sets;
   - read back what's already there.
8. **Maintain over time**: re-apply after changes, rebuild components, and understand what's stale, missing or failed.
9. **Work alongside an agent**: switch the Agent link on, and see what the agent did and what it's doing.

---

## 3. Core concepts (the object model)

A redesign should be built around these objects and relationships, not around today's screens. **Names in `code` are Prism3-specific and must be kept as-is**; see §9.

- **`BrandInput`**: the single working object. Every edit changes it, and every edit re-runs the engine.
  - If the engine **refuses** an edit, the UI keeps showing the **last theme that resolved** ("last good") and reports the refusal.
  - Export, Apply and saving always use the last-good input, never a failing one.
- **Lever**: one named setting on the `BrandInput`, declared in a machine-readable manifest. Each lever has:
  - a key, a label, a control type (color, slider, enum, toggle, list, object, palette-ref) and a default;
  - an optional range and **named stops** (words for slider values, such as `soft` = 1.5);
  - an **`advanced`** flag (25 of the 47 are advanced).
  
  Every surface renders controls from this manifest.
- **Palette → ramp → step**:
  - Each brand color becomes a **palette**: a 20-step tonal **ramp** (`025, 050, 100…950`).
  - A pinned brand color is the **anchor**: it sits verbatim on its step.
  - The engine palettes are primary, neutral, the four status colors (success, warning, danger, info), plus white/black/alpha.
- **Role**: a semantic color token, such as `text.primary` or `interactive.primary.fill.hover`. It resolves, per mode, to a palette step.
  - Families: `background`, `foreground`, `text`, `icon`, `interactive.<column>.*`, `disabled`, `border`, `scrim`, `veil`, `field`, `inverse.*`.
- **Mode**: `light` (always on), `dark`, `hc-light`, `hc-dark`, `wireframe`, plus custom modes. There are three tiers:
  - **base**: `light`;
  - **customizable**: `dark` and custom modes, which accept per-mode overrides;
  - **derived / generate-only**: `hc-light`, `hc-dark`, `wireframe`, which are read-only.
- **Override**: a per-mode repoint of one role to a `{palette, step}`, or a per-mode lever value. The value **Auto** means "follow the generated baseline". A UI showing Auto should name what Auto currently resolves to.
- **Contrast contract**: a foreground/background pair with a minimum ratio (its **floor**), checked in every mode. These are **warn, don't block**: a pick below its floor is applied and flagged, because an expert override is legitimate.
- **Token tiers**:
  - **primitives**: palettes, dimension grid, font ladders;
  - **semantics**: roles, sizes, space;
  - **composites**: text styles, shadows, transitions.
- **Token contract**: which token *names* are **guaranteed** across brands. Names are versioned; values are not. Some levers make certain paths **brand-dependent**.
- **Component definition (def)**: one of 23 buildable components. Some nest others: Group → Row → Control → `focus-ring`.
- **Figma file state** (plugin): which variables and styles exist and whether they're Prism3's. Also:
  - what is **stale** (built from an older plan), **orphaned** (no longer named by the plan) or **stranded** (a collection nothing writes);
  - which component sets exist and what each set's last build report says.

---

## 4. Settings inventory

These are the settings the UI must expose, grouped by **what they change in the output**. Each is marked:
- **scope**: `G` global, `M` per-mode override available, `L` editable only while the base (light) mode is selected;
- **tier**: `A` advanced, blank = everyday.

Constraints the engine enforces are listed in §8.1.

### 4.1 Color foundations

| Setting | Key | Control | Default | Scope | Notes |
|---|---|---|---|---|---|
| Primary brand color | `primary` | color (OKLCH) | required | G | Pinned verbatim; everything downstream derives from it. |
| Neutral source | `neutral.auto` / `neutral.hue`+`neutral.chroma` / `neutral.anchor` | 3-way choice: follow primary / custom tint / pinned exact color | follow primary | G | Hue 0–360 (stops `warm` 60, `cool` 250). Chroma 0–0.03 (stops `pure`, `subtle`, `tinted`, `saturated`). A pinned anchor overrides both. |
| Additional brand colors | `brandColors[]` `{name, oklch}` | list: add, rename, recolor, remove | none | G | Each becomes a palette. Names are lowercase slugs and must not reuse engine palette names. A rename or removal cascades to every reference. |
| Status colors: success, warning, danger, info | `status.<role>` / `roleColors.<role>` | per role: Auto / custom hue / borrow an existing palette | Auto (synthesized) | G | If the primary isn't red, the engine carves a dedicated danger red. |
| Page surface | `surfaces.<light\|dark>.base` | white/black, or a neutral step | white / black | M (light & dark only) | Moves the contrast floor with it. |
| Contrast floor surface | `surfaces.<m>.floorStep` | Auto or a neutral step | Auto | M | The worst-case surface that bold fills are validated against. |
| Inverse band | `surfaces.<m>.inverseBase` | palette (non-status) + step | Auto | M | For contrasting bands such as a dark hero on a light page. About 60 roles re-derive from it. |
| Gradients | `gradients` | off / on / list of gradients | off | G | Each gradient: name, linear or radial, angle, center/shape, interpolation (OKLCH/sRGB), and 2+ stops (palette, step, position). Turning off discards custom gradients. |

### 4.2 Color roles (per-mode overrides)

Every role below can be repointed per customizable mode to a palette step, or left on Auto. Each shows its contrast result.

- **Foreground fills:** brand, success, warning, info, danger; surface tiers card / panel / nested.
- **Field fill:** transparent (default) or a neutral step.
- **Text:** primary, secondary, tertiary (neutral ladder); brand/success/warning/danger/info ink plus a "muted" variant of each (muted is held to 3:1); link.
- **Read-only, derived:** the "on" inks (text on each fill, on inverse), and link hover/visited/focused. Show them, with where they came from.

### 4.3 Interactive color

Interactive color is organized in **columns** (`interactive.<column>.*`). The fixed columns are **primary**, **neutral** and **destructive**, and you can promote more palettes to columns.

| Setting | Key | Control | Default | Scope |
|---|---|---|---|---|
| Action palette (drives the primary column) | `actionPalette` | palette picker | primary | G |
| Extra action columns | `interactivePalettes[]` | add or remove a palette as a full column | none | L |
| Neutral button boldness | `neutralEmphasis` | `subtle` (light gray) / `strong` (near-black) | subtle | G |
| Rest fill anchor per column | `actionAnchorStep`, `destructiveAnchorStep`, `modeAnchors` | step picker; re-derives hover, pressed, text and on-fill | engine-placed | M |
| Per-state overrides | `overrides[mode][role]` | fill, text and border at rest/hover/pressed, including the inverse variants and on-fill text | Auto | M |
| Outline and text-button hover method | `outlineInteraction` | `overlay-neutral` (neutral translucent wash) / `solid-tint` (tinted wash of own fill, shown as the **subtle-fill**) / `none` | overlay-neutral | G |
| Disabled legibility | `disabledStrategy` + `disabledMin` | `full` (4.5:1) / `reduced`, with a floor slider 3–4.5 | reduced, 3 | G |
| Icon contrast | `iconContrast` | match text (4.5:1) / non-text floor (3:1) | text | G |
| Strict inverse button contrast | `strictInteractiveContrast` | toggle | off | G, A (**no control today**) |
| Link palette | `linkPalette` | palette picker | follows action palette | G |
| Link state distances | `linkStateRungs.{hover,pressed,visited}` | Auto or 1–8 steps | Auto | G, A |
| Resting link pin | `overrides[m]['…link…']` | step; re-anchors all 5 link states | Auto | M |
| Focus ring | none | **read-only**: 2px width, 2px offset, 0 offset on fields, solid, color `border.focus` | fixed | none |

### 4.4 Typography

The type categories are **display, title, body, label, caption, eyebrow, code**. The weight roles are **subtle, default, emphasis, strong, max**.

| Setting | Key | Control | Default | Scope |
|---|---|---|---|---|
| Typeface library | `typography.typefaceLibrary` | list of faces: add, remove if unbound, availability status | Inter; JetBrains Mono | G |
| Face per category | `typography.families.<cat>` | face picker; `code` may be "none" | Inter; code JetBrains Mono | M (re-point only to faces already shipped) |
| Variable font flag | `typography.families.variable` | bool, or per category | off | G, A |
| Weight role → number | `typography.weightRoles.<role>` | 100–900 in steps of 100 | 300/400/600/700/900 | M |
| Weights shipped per category | `typography.weights.<cat>` | multi-select of roles | varies | G, A |
| Heading scale shape | `typography.typeScale` | `compact` / `default` / `expressive` (moves display, title and eyebrow) | default | G only |
| Largest display size | `typography.displayCeiling` | sm…3xl (show the px) | 3xl | G, A |
| Smallest title size | `typography.titleFloor` | 18 / 16px | 18 | G, A |
| Caption / absolute size floor | `typography.captionFloor`, `typography.sizeFloor` | 11/10, 10/8 | 11, 10 | G, A (**no control today**) |
| Individual heading sizes | `typography.sizes`, `sizeOverrides`, `modeLevers[m].typeSizes` | per-rung px steppers, desktop and mobile | derived | M |
| Line-height and letter-spacing rungs | `typography.lineHeights`, `letterSpacings` | rung → ladder value | derived | M (re-point to another rung) |
| Per-category leading/tracking nudge | `leadingShift`, `trackingShift` | ±N rungs | 0 | G, A |
| Italic and link variants | `typography.italics[]`, `typography.links[]` | categories multi-select | links: body, caption | G, A |
| Pinned font cut | `typography.faces.<cat>.<role>` | verbatim Figma style name, e.g. "Light Condensed" | derived | G, A |
| Fluid headings | `typography.responsive` | on/off, min and max viewport | on, 375–1280 | G, A |

### 4.5 Size, shape and density

| Setting | Key | Control | Default | Scope |
|---|---|---|---|---|
| Density | `density` | `comfortable` / `compact` / `spacious`. The names stay fixed; the pixel heights shift. | comfortable (md control = 44px) | M |
| Corner softness | `radiusScale` | 0–2, stops `sharp` `modest` `standard` `soft` `round` | 1 | M |
| Radius anchor | `baseMd` | 2–12px | 4 | G, A |
| Hairline radius | `radiusHairline` | toggle, adds a 1px rung | off | G, A |
| Control shape | `controlShape` | `boxed` / `hairline` / `rounded` / `pill` | rounded | G |
| Spacing | none | **fixed 8px rhythm**, read-only | none | none |

### 4.6 Component-level settings

Today only the button family has these. Expect the list to grow per component, and design for that.

| Setting (Prism3 label) | Key | Options | Default |
|---|---|---|---|
| Button icons | `buttonIcons` | **Attached to label** / **Locked to edges** | Attached to label |
| Button label & icon | `buttonContentSize` | **Match button size** / **One step smaller** (medium buttons only) | Match |
| Button minimum width | `buttonMinWidthMultiplier` | 1–4 × height, rounded up to the 8px grid | 2.25 |

**In flight** (for awareness): a spinner component with its own motion tokens, used by the button's pending state.

### 4.7 Elevation

| Setting | Key | Control | Default | Scope |
|---|---|---|---|---|
| Shadow softness | `shadow.softness` | 0–2, stops `crisp` `standard` `soft` `diffuse` | 1 | M |
| Shadow tint | `shadow.tint.{hue,amount}` | hue 0–360; amount 0–1 | neutral hue, 0.15 | M |

The output ramp is `xs`–`2xl` plus `inset`. Dark mode reduces shadows, and high-contrast modes use borders instead.

### 4.8 Motion

| Setting | Key | Control | Default | Scope |
|---|---|---|---|---|
| Tempo | `motionPersonality.tempo` | `snappy` ×0.8 / `standard` / `relaxed` ×1.3 | standard | M |
| Easing roles | `easingRoles` / `modeLevers[m].easings` | role (default, enter, exit, emphasized) → curve (linear, standard, decelerate, accelerate, expressive, calm) | standard / decelerate / accelerate / expressive | M |

The reduced-motion durations are always derived, never set directly.

### 4.9 Layout

All layout settings are global.

- **Breakpoints:** a list of min-widths, default `0, 768, 1024, 1440, 1920`. Names are assigned automatically.
- **Base grid columns:** 4–24, default 12.
- **Per-breakpoint overrides:** columns, gutter and margin. Gutter and margin must be values from the spacing scale.
- **Container max:** 960–1920, default 1440.
- **Reading-measure container:** 480–960, default 720.

### 4.10 Modes and identity

| Setting | Key | Control | Notes |
|---|---|---|---|
| Brand name | `id` | text | Used for filenames. |
| Token namespace | `root` | slug, default `prism` | Tokens emit under `<root>.*`. `prism` and `pds3` are reserved for the shipped catalog. |
| Modes on | `modes` | light (always), dark, high contrast (hc-light, plus hc-dark if dark is on), wireframe | Order is fixed. |
| Custom modes | `customModes[]` `{name, base}` | add or remove; base is light or dark | A custom mode inherits live from its base. |
| Personality words | `personality[]` | ordered subset of `energetic, calm, premium, restrained, bold, generous, dense, soft, sharp` | Each word fills several levers that haven't been set. An explicit lever always wins. **No control today.** |

---

## 5. Views the product must offer (read-only outputs)

A reader must be able to see:

- **Palettes:** every ramp with step keys and hex; the anchor marked; alpha ramps and opacity steps on a checkerboard.
- **Role resolution:** for any role, which palette step it resolves to in each mode, its contrast ratio against its ground, and whether that value is Auto, overridden or derived.
- **A style guide:**
  - backgrounds, foregrounds, text, border, icon, disabled and interactive specimens in each mode;
  - viewable on page, second-tier and inverse surfaces;
  - specimens painted in the **brand's** tokens.
- **Contrast contracts:** a total ("N of M pairs below floor, in K modes"), and a full table of pairs × modes with ratios.
- **Token list:** the exact tree the export writes. It has a primitive/semantic split, shows alias and/or value and full or short alias paths, filters by category, and gives one column per mode where values differ.
- **Type:**
  - the face library with availability ("In this Figma" / "On this device");
  - the size and leading/tracking ladders;
  - which weights each face actually ships;
  - the full type ramp across modes;
  - fluid `clamp()` ranges, and sizes that merge on mobile.
- **Size and shape:**
  - the radius ramp, including which components use each step;
  - the four control-shape silhouettes;
  - button layout at small, medium and large (minimum width, both icons, trailing icon only);
  - the size ladder with heights and padding;
  - the spacing grid, border widths and icon sizes.
- **Elevation:** the shadow ramp for the current mode, and the tint swatch.
- **Motion:** the duration ramp with reduced-motion values, the curve shapes, the springs, and a playable specimen with playback speed (real, ½, ¼, ⅛).
- **Layout:** a breakpoint ruler; a table of columns, gutter and margin per breakpoint; container widths drawn to scale.
- **Components:** each of the 23 defs, with its variant count, what it nests, and a live preview if possible.
- **Engine decisions:** the engine logs about 15 choices it made for you (the **decisions log / notes**). **Today only one of these is shown**, the link-underline warning; this is an opportunity.

---

## 6. Actions and workflows

### 6.1 Both hosts

| Action | Requirements |
|---|---|
| **Start from a color** | Hex entry (validated `#rrggbb`) plus a picker. Seeds the primary color, with the neutral following it. |
| **Start blank** | A neutral default brand, light mode only. |
| **Load an example** | **aurora** (the default the studio boots) or **harbor**. |
| **Import a brand brief** | Paste or upload a `design.md`. Two dialects are auto-detected. Errors must say what failed. |
| **Replace-brand guard** | Confirm before replacing only when the current brand has unsaved edits. |
| **Export: Design tokens** | Options: token names kebab/snake (camelCase refused); nested or flat; one file or one per group; indented or compact. Show the file list and a live sample of the output **before** download. Multiple files arrive as separate downloads. |
| **Export: Brand brief** | `<name>.design.md`, with no options. |
| **Persist** | Web: the last-good brand is kept in the browser and restored on reload. Plugin: the brand is saved in the Figma file on Apply and restored when the file is opened. |

### 6.2 Plugin only

The order matters: **Apply before Build**, because component sets bind variables by name.

- **Apply to Figma** (Prism3 name: **Apply Theme**):
  - Writes every variable collection, Effect/Paint/Grid style and text style, and saves the brand into the file.
  - It is idempotent and never deletes.
  - A **pre-flight** check refuses the whole write on a conflict with non-Prism3 content of the same name.
  - Results: success, success with N skipped (fonts unavailable), N misses, N conflicts (nothing written), or failed.
  - The detail lists counts, renames migrated in place, orphaned variables and stranded collections.
- **Prune stale** (the delete):
  - Two steps. A **preview** that lists exactly what would go, then a **confirm** that recomputes from a fresh read of the file before deleting.
  - It removes orphan variables, stranded collections, stale styles and modes Prism3 no longer claims.
  - It can't run while an Apply is pending.
- **Set up file**:
  - Creates the page skeleton: Cover; section headers Foundations / Components / Subcomponents / Sandbox; `↳` family pages; and `File Components` with the `_Section-header` and `_Headings` templates.
  - Idempotent; never reorders or deletes.
- **Build a component set**:
  - Pick one of 23 defs (each showing its variant count) and build it.
  - Dependencies are built first automatically; a dependency already in the file is never rebuilt.
  - The set lands on its `↳ <Family>` page and **switches the designer's page to it**.
  - Progress runs in two phases: **building members x of N**, then **wiring references x of N**.
  - **Today there's no build-all or batch**, and a rebuild skips members that already exist. Members built from an older plan are left in place as **stale**, and the report says so.
- **Read-back on open:**
  - Detects whether the file already holds a Prism3 theme and whether its contract holds.
  - Restores the saved brand, or says why it couldn't.
- **Agent link:**
  - A switch only the person at the keyboard can turn on. It's off at every launch.
  - While on, an outside agent can run: `status`, `apply-theme`, `build-components`, `file-setup`, `prune` (preview or confirm), and `readback`.
  - The UI shows the link state, the transport ("file mailbox" and/or "desktop bridge"), and the last command with its result.
  - An agent's **prune preview** must show as a passive notice, never as the confirm dialog: that dialog would prune against the panel's own settings, not the agent's.

---

## 7. Feedback and states the UI must carry

- **The engine refused an edit**: the message names the rule, and the UI shows the **last good** theme meanwhile.
- **Warnings that don't block**:
  - a pick below its contrast floor (name the pair, the ratio and the floor);
  - disabled-text caveats;
  - a link that isn't color-distinct from body text (suggest underlining);
  - weight roles crossing (a heavier role resolving lighter);
  - sizes that merge on mobile;
  - an unavailable font;
  - a stale font-cut pin;
  - heading-scale choices that pinned sizes rule out.
- **Contrast signals everywhere**: ratio pass/fail; a "large text 3:1" label where the floor is 3:1; and contrast marks inside step pickers, **before** a choice is made.
- **Provenance**: for any value, show whether it is Auto (and what that resolves to), overridden, derived or anchored; which token path it is; and where it came from.
- **Mode scope**: for any control, show whether it edits this mode or all modes, or is read-only here. Say why a derived mode can't be edited, and give its contrast verdict.
- **Figma results** (plugin):
  - one status per action (Apply, prune, file setup, build, read-back), each expandable to a full detail;
  - a failure opens automatically;
  - a busy action is disabled while in flight;
  - build progress is live.
  
  Known gaps: agent-started work shows no progress in the panel, and there's no warning that Figma runs 20–300× slower when its window is in the background.
- **Build identity**: which engine version and plugin build produced this. A stale plugin build is a real failure mode in practice.

---

## 8. Rules and requirements

### 8.1 Hard constraints

The engine refuses these. The UI should prevent them, and say why.

**Modes**
- Light can't be turned off.
- High-contrast and wireframe modes accept **no** per-mode edits.
- Custom modes must have slug names, can't reuse built-in names, and must be unique. Their base is light or dark.
- Heading scale shape (`typeScale`) is never per-mode.
- There are no per-mode overrides "on light": light *is* the global value.

**Color**
- Overrides pick a **palette step**, never a raw color.
- Brand color names are unique slugs and can't reuse engine names.
- `brand` and `neutral` can't be rebased onto another palette.
- The page surface is white/black or neutral only.
- The inverse band can't use a status palette.

**Type**
- Every type category keeps at least one weight.
- `label` must keep `emphasis`, because the button binds it by name.
- `body` and `caption` must keep `default` (decided 2026-09-26, being built).
- Only `code` may have no face.
- A 16px title floor is refused with the `compact` heading scale.
- Heading sizes stay on the size ladder, strictly increasing, at or above their floors (display 32, title 16, eyebrow 11).
- A mobile size is never above its desktop size.
- Line-height and letter-spacing rungs keep their order.

**Layout and other**
- Gutter and margin overrides must be spacing-scale values.
- `disabledMin` is never below 3:1.
- The namespace is a lowercase slug with no dots.

### 8.2 Behavior rules

- **Warn, don't block**, for contrast: an override that misses its floor is applied and flagged. Never scold.
- **Auto is always available**, and always names the value it resolves to.
- **Everything downstream uses the last good theme**: export, apply and save.
- **Editing is live**: every change re-derives the whole system. Sliders may preview while dragging and commit on release.
- **Renames and removals cascade**: renaming or removing a brand color updates every reference to it.
- **Names are versioned, values are not**. A UI must never present a change that removes or renames guaranteed token names as a routine value tweak.

### 8.3 Host constraints (Figma plugin)

- **The same UI must work at plugin sizes.** The window opens at 1280×900. The minimum is **380×420**, and the user can resize it to anything in between with a custom grip. Design for a narrow working mode, not just a shrunken desktop.
- **Light chrome only** today: Figma's dark theme isn't supported.
- **Fully offline**:
  - no network (one localhost exception, used only for the agent bridge);
  - **no web fonts**: specimens render only faces installed locally or known to Figma.
- **Two contexts**: the UI can't touch the Figma document directly; every Figma action is a message and an async result.
- **Writes are serialized**: one at a time, and each is one undo step.
- **Figma slows sharply when its window is in the background.** Long builds (hundreds of variants) take real time.
- **A build changes the designer's current page.**

### 8.4 Voice and copy

Full standard: `docs/voice-standard.md`.

- **Four attributes:**
  - **Precise**: name the mechanism and the number, e.g. "4.5:1".
  - **Declarative**: the system is the subject, in present tense.
  - **Translating**: give the why next to the what.
  - **Recessive**: no tool personality.
- **UI register**: a label plus one short line (about 90 characters or fewer). Recognizable words go in labels; precise terms go in descriptions.
- **Banned**: "simply", "just", "easy", exclamation marks, apologies, idioms, buzzwords, and promises the engine doesn't verify.
- **US English** everywhere ("color", "gray"). It is gate-checked.
- **Success** says what changed. **An error** says what failed and what to do next. **A destructive button** names the outcome, e.g. "Delete 12 items".

### 8.5 The tool's own accessibility

- Chrome text at 4.5:1 or better (gate-checked).
- Visible focus on every control.
- Full keyboard operation.
- Reduced motion respected.
- Hit targets of at least 24px.
- Dialogs trap focus. **Today they don't.**

---

## 9. Vocabulary

**Keep these Prism3 names exactly.** They appear in tokens, docs, the agent protocol or owner decisions.

| Term | Meaning | Origin |
|---|---|---|
| **Prism3** | The product | name |
| **lever** | One named setting | Prism3 |
| **advanced** | Lever tier hidden by default | Prism3 |
| **named stop** | A word for a slider value (`soft`, `crisp`, `warm`) | Prism3 |
| **personality / trait** | Words that fill several levers | Prism3 |
| **decisions log / notes** | The engine's record of choices it made | Prism3 |
| **anchor** / **pinned** | A brand color held verbatim on its step | Prism3 |
| **ramp**, **step**, **palette** | Tonal scale, a position on it, a named scale | industry |
| **rung** / **ladder** | A named position / a fixed ordered set (type sizes, line heights, tracking, link states) | Prism3 |
| **role** | Semantic color token | industry |
| **foreground** | **Fills and surfaces on the page, not text** (differs from common usage) | Prism3 meaning |
| **background** | The page canvas | industry |
| **inverse** | A contrasting band inside a mode (not dark mode) | Prism3 meaning |
| **on-fill** | Ink on a filled control | Prism3 |
| **floor** | A minimum contrast ratio, and the surface it's measured against | Prism3 |
| **contrast contract** | A pair plus its floor, checked in every mode | Prism3 |
| **interactive column** | `interactive.<name>.*` family (primary, neutral, destructive, promoted accents) | Prism3 |
| **action palette** / **link palette** | Which palette drives buttons / links | Prism3 |
| **subtle-fill** | The tinted hover/pressed wash token | Prism3 |
| **overlay / wash** | Translucent hover layer | Prism3 usage |
| **veil** | Media-overlay wash (`subtle`/`medium`/`strong`) | Prism3 |
| **scrim** | Modal backdrop | industry |
| **field** | Input-control color family | Prism3 |
| **emphasis** | (a) a weight role; (b) neutral button boldness (`neutralEmphasis`) | Prism3 |
| **weight role** | `subtle` / `default` / `emphasis` / `strong` / `max` | Prism3 |
| **category** | display, title, body, label, caption, eyebrow, code | Prism3 set |
| **type scale / display ceiling / title floor** | Heading-scale levers | Prism3 |
| **tempo** | Motion speed (`snappy` / `standard` / `relaxed`) | Prism3 |
| **density** | `comfortable` / `compact` / `spacious` | industry |
| **control shape** | `boxed` / `hairline` / `rounded` / `pill` | Prism3 |
| **Attached to label / Locked to edges** | Button icon placement (owner-chosen labels) | Prism3 labels |
| **Match button size / One step smaller** | Button content size (owner-chosen labels) | Prism3 labels |
| **mode**, **custom mode**, **derived mode** | See §3 | mixed |
| **Auto** | Follow the generated value | Prism3 convention |
| **override** | A per-mode repoint | industry |
| **guaranteed / brand-dependent** | Token names promised across brands / present only for some inputs | Prism3 |
| **namespace / root** | The first token path segment | industry |
| **brand brief / `design.md`** | The sparse input file | Prism3 |
| **`.ai.json` / sidecar** | Agent-readable token metadata | Prism3 |
| **Apply Theme / Apply to Figma** | Write the system into the file | Prism3 |
| **Prune stale** | The delete of stale file items | Prism3 |
| **Set up file** | Page scaffold (wording still open) | Prism3 |
| **Build set** | Build one component set | Prism3 |
| **def** | Component definition | Prism3 |
| **misses** | Things that didn't bind or stick | Prism3 |
| **stale / orphaned / stranded** | Built from an old plan / no longer named / written by nothing | Prism3 |
| **Agent link** | The switch that lets an agent drive the plugin | Prism3 |
| **pill** | Today's name for a short status verdict | Prism3 (UI term; open to change) |

---

## 10. Scale and numbers worth designing for

- 47 levers (25 advanced), plus about 15 schema-only inputs a complete UI may eventually expose.
- 5 built-in modes plus custom modes. Customizable modes need side-by-side comparison.
- Palettes: 6 engine palettes, 2 alpha ramps, plus any number of brand colors, each a 20-step ramp.
- Hundreds of roles; several hundred contrast contracts per brand.
- 7 type categories × 5 weight roles × up to 22 size rungs.
- 23 buildable components. Button has 432 variants and takes minutes to build in Figma.
- Users switch brands often. Multi-brand is the consultant's normal day.

---

## 11. Known gaps and opportunities (observations, not requirements)

- Levers with **no control** today: `strictInteractiveContrast`, `captionFloor`, `sizeFloor`, `personality`, and several schema-only inputs (`roleColors.action`, `accentPalette`, `easingRoles` beyond light, `typefaceLibrary` extras).
- The engine's **decisions log** is almost entirely invisible, although it explains *why* the system looks the way it does.
- **No undo, no reset-to-origin, no compare-to-previous, no copy/share.**
- The **Figma actions** are split between a top bar and an "internal" components page. Building components is treated as experimental, although designers now rely on it. There's no build-all, no status for what's already built, and no stale overview.
- **Agent activity** is barely visible: a small chip and the ordinary status verdicts.
- No guidance about **keeping Figma in the foreground** during long builds.
- **Mode editing** is one mode at a time, via a strip. Some settings are edited as per-mode columns instead. The model is inconsistent.
- The component-level settings (button) sit with size and radius, which suggests they belong to "shape". There's no home yet for component-level options as more components get them.

---

## Appendix A: example brands

| Brand | Demonstrates |
|---|---|
| **aurora** (studio default) | Action color decoupled from the hero color (violet primary, azure actions); expressive variable display face; tinted shadows; gradients; 6 breakpoints. |
| **harbor** | The bare-input path: low-chroma teal, warm tinted page (the contrast floor moves), measured status colors, relaxed motion, system font stack. |
| **nb** | A regression target reproducing a real, hand-built New Balance system. Not offered in the studio. |

## Appendix B: today's structure (for reference only; do not copy)

Today's UI is a left rail of pages:
- Palettes
- Surfaces & fills
- Interactive
- Typography (4 tabs)
- Elevation
- Size & radius
- Layout
- Motion
- Preview (style guide / contrast / token list)
- a Figma-only Components page

It also has a top bar (brand menu, export, apply, prune) and a sticky mode strip.

This mirrors the **token file structure** more than the **user's tasks**. The exploration should decide its own structure and be able to say why.
