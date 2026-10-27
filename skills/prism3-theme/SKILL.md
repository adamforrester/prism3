---
name: prism3-theme
description: >-
  Author a Prism3 brand — turn a brand brief into a `design.md` the engine
  compiles into a full, contrast-verified token system. Teaches the input
  contract (pin the brand's exact anchors in OKLCH, let the engine derive
  ramps / modes / contrast), the adjective → lever mapping, and the compile
  loop (run the CLI, read the contract results, fix the input, re-run). The
  authoring counterpart to prism3-consume.
# Opts this skill into the COVERAGE check (packages/engine/lint-skills.ts): every top-level BrandInput
# property must appear somewhere below, or be named in `omits:`. Declared rather than inferred, so
# a skill states what it claims to document instead of the gate guessing from prose.
documents: brandInput
# Deliberately out of scope for a BRIEF-authoring skill: the per-mode override layer and the
# fine-tuning knobs are studio work done after a theme exists, not things a brand brief states.
omits: customModes, overrides, modeAnchors, modeLevers, roleColors, disabledMin, baseMd,
  actionAnchorStep, destructiveAnchorStep, linkStateRungs, accentPalette, interactivePalettes,
  outlineInteraction, neutralEmphasis, strictInteractiveContrast
when_to_use: >-
  When creating or refining a Prism3 brand from a brief, brand guidelines, or an
  existing palette — producing the `design.md` that `packages/engine/cli.ts`
  compiles. Also when an extraction (brand-skills / a flat hex palette) needs
  turning into a compiling Prism3 input.
---

# prism3-theme — briefing a brand into a compiling `design.md`

Your job is to write a **`design.md`** — a small brand brief whose frontmatter the
Prism3 engine expands into a complete token system (ramps, semantic roles, four
modes, typography, geometry, shadows, gradients) with every accessibility contrast
contract proven at generation time. You **declare the brand's identity**; the engine
**derives the system**. Do not hand-author scale steps, per-mode values, or contrast
math — that's exactly what the engine owns, and hand-authoring it is how systems drift.

> **The contract:** pin the brand's *anchors* (its exact hero color, any accents, its
> neutral cast) in **OKLCH**, choose **levers** by what the brand *feels* like, then
> **compile and read the results** — the CLI tells you every contract that passed and
> flags every choice worth confirming. Loop until it exits clean.

## The shape of a `design.md`

YAML frontmatter (the part the engine reads) + a prose body (authoring intent —
latitude for judgment the frontmatter can't encode; the MVP CLI does not parse it, but
write it: it's the brief's rationale and the next author's context).

**Required — the minimum brand:**

```yaml
id: <brand-slug>
primary: { l: 0.50, c: 0.18, h: 285 }   # the hero color, in OKLCH
neutral: { hue: 285, chroma: 0.008 }      # the gray cast (a hint of the brand hue)
```

That alone compiles to a full system on sensible defaults. Everything below is optional
and **omitting a lever selects its default** — a plain brief is a valid brief (the
"plain-spec guarantee"). Add a lever only when the brand actually calls for it.

**The levers** (authoritative list + constraints: `packages/engine/schema/theme-schema.json`;
worked briefs in `packages/engine/examples/`: `aurora.design.md` maximal, `harbor.design.md`
minimal — read both, they are the reference; the directory also holds a standard-dialect example, below):

| Lever | Shape / values | Use it when |
|---|---|---|
| `root` | string (default `prism`) | the brand needs its own token namespace (`nbds`, …) |
| `brandColors` | `[{ name, oklch: {l,c,h} }]` | the brand has accents beyond the hero |
| `actionPalette` | a `brandColors` name | interactive UI runs on an **accent**, not the hero (decouple) |
| `linkPalette` | `primary` \| `neutral` \| a `brandColors` name | links need their **own** color, independent of actions. Defaults to following the action color; the ink is still rated to its contrast floor. A palette that is not color-distinct from body text (e.g. `neutral`) is flagged in the notes to underline links for WCAG 1.4.1 — pair it with `typography.links` |
| `status` | `{ success/warning/danger/info: {l,c,h,chroma} }` | the brand *specifies* status hues; omit any (or all) to let the engine synthesize + carve a danger red |
| `surfaces` | `{ light: { base: 50 } }` | the page is a **tinted off-white**, not pure white (the contrast floor moves with it). `floorStep` sets the floor itself: every floor-gated text and link ink (all but `*.primary`) is promised its bar on the floor surface and anything nearer the page, and nothing deeper. To put text on `background.tertiary`, set `floorStep` to its step and the inks re-derive |
| `raisedSurface` | `card` \| `page` \| `white` | the brand's **dialogs** sit on white, or on the page color, instead of the card color. It sets `color.foreground.raised`, the panel every dialog and sheet draws over the scrim, in light and hc-light. `card` (default) holds the card surface, `color.foreground.primary`; `page` holds `color.background.primary`; `white` holds pure white. Dark and hc-dark always hold the card surface, so the panel keeps its lift above a dark page. One token's value moves; Dialog binds the same token either way |
| `density` | `comfortable` \| `compact` \| `spacious` | a dense tool vs a roomy reading product |
| `radiusScale` | number, or a named stop: `sharp` \| `modest` \| `standard` \| `soft` \| `round` | radius softness |
| `controlShape` | `rounded` \| `pill` \| `boxed` \| `hairline` | the corner shape of buttons, fields and checkboxes — a brand-identity choice, orthogonal to softness. `rounded` (default) follows `radiusScale`; `boxed` gives them a sharp 0px corner; `hairline` a 1px corner; `pill` rounds the ends of **buttons** fully (height ÷ 2) whatever the softness, while fields and checkboxes keep their own corner |
| `fieldStyle` | `outline` \| `underline` | the brand's forms use **underline** fields: one line under the value instead of a box, with no side padding and square corners, on every field component at once (text field, password field, select, textarea). The line keeps the field border's 3:1 contrast; focus thickens it to 2px and adds the focus ring. `outline` (default) draws the box |
| `searchFieldStyle` | `follow` \| `outline` \| `underline` | the brand's **search field** draws a different edge from its other fields, such as an underline header search beside outline form fields. `follow` (default) takes `fieldStyle`; `outline` or `underline` sets the search field apart. The line keeps the field border's 3:1 contrast either way |
| `tagStyle` | `pill` \| `underline` | the brand's tags are **underlined**: one line under each tag instead of a rounded outline, with square corners and no fill in any state. The line is 1px at rest and 2px when the tag is selected or under the pointer; a selected tag also shows its check mark, and focus adds the ring without thickening the line. Every line keeps 3:1 contrast. Its own lever, separate from `fieldStyle`: a tag is not a field. `pill` (default) draws the rounded outline |
| `dialogTitleSize` | `large` \| `medium` \| `small` | the brand's **dialog titles** are smaller than the default: one size for every dialog, centered or a sheet. `large` (default) binds `type.label.lg.emphasis`, `medium` `type.label.md.emphasis`, `small` `type.label.sm.emphasis`. No token moves; only Dialog's title binding does. A single dialog at another size is a hand override in Figma, not a setting |
| `bannerStyle` | `tinted` \| `outlined` | the brand's **banners** sit on the page color instead of a tint: one style for every banner. `tinted` (default) fills each tone with `color.foreground.{tone}-subtle`; `outlined` fills it with `color.background.primary`. Both keep the 1px edge in `color.border.{tone}`, the glyph in `color.icon.{tone}` and the text in `color.text.primary`. No token moves; only Banner's fill bindings do |
| `buttonIcons` | `attached` \| `edges` | the brand pins button icons to the button's **edges** (Locked to edges), with the label centered in the space between them and the button still growing with a long label; `attached` (Attached to label, default) keeps them beside the label. Buttons only, not icon buttons |
| `buttonMinWidthMultiplier` | number, 1–4 (default `2.25`) | a button's minimum width is its height × this, rounded up to the 8px grid (88/104/128px at 36/44/56px heights by default) — raise it for wider short-label buttons (`2.5` gives 96/112/144px) |
| `buttonContentSize` | `match` \| `smaller` | `smaller` (Small) gives a **medium** button the small label and icon (`type.label.sm.emphasis`, `icon.size.xs`) at medium height and padding — New Balance's 44px button with a 12px label; `match` (Medium, default) leaves every size its own |
| `buttonLabelWeight` | `emphasis` \| `default` | Control label weight. `default` (Default) sets every button and tag label in its label style's **default** weight role instead of emphasis, and the brand then ships that weight for the label styles; with `smaller`, a medium button takes the small label at that weight. Buttons and tags only: badges keep emphasis. `emphasis` (default) leaves the labels as they are |
| `buttonTextHover` | `text` \| `fill` | What a button at the text appearance does on hover and when pressed. `text` (Text & icon only, the default) changes its label and icon colors; `fill` also gives it the outline appearance's wash. A text button is never filled at rest, and its label is always underlined (fixed, not a setting). Buttons only |
| `radiusHairline` | `true` \| `false` | **retired — do not set it.** The fixed 1px `radius.hairline` rung now ships for every brand, so this changes nothing; it is accepted only so older brand files still load. For 1px-cornered controls, use `controlShape: hairline` |
| `iconContrast` | `text` \| `3:1` | let non-text icons run lighter (WCAG 1.4.11 floor) |
| `motionPersonality` | `{ tempo: snappy \| standard \| relaxed }` | brand energy → motion pace |
| `typography` | `{ families, weightRoles, typeScale: compact\|default\|expressive, displayCeiling, titleFloor, captionFloor, sizeFloor, responsive: { fluid, minViewport, maxViewport }, sizes, tracking }` | custom faces / weight remap / fluid type; `families` is keyed by CATEGORY (`display`/`title`/`body`/`label`/`caption`/`eyebrow`/`code`), and **an omitted category takes the engine default (Inter, or JetBrains Mono for `code`), with a system fallback stack appended**. `sizes` and `tracking`: see the note under this table |
| `typography.captionFloor` | `11` \| `10` | opt-in (off by default) — `10` adds **caption.sm = 10px**, a fine-print rung (10 is already on the size ladder). Floors caption at 11px otherwise; opt in for dense legal / footer / product-attribute text |
| `typography.sizeFloor` | `10` \| `8` | opt-in **escape hatch** (off by default) — `8` pushes the size ladder to an **8px floor** and adds **caption.xs = 8px**. 8px sits below the size range the system's contrast ratios were reasoned about, so the engine **flags it in the decisions notes**. Ship it only for genuine fine print that has an accessible alternative |
| `shadow` | `{ softness, tint: { hue, amount } }` | softer marketing elevation, tinted to the brand |
| `layout` | `{ breakpoints: [...], containerMax }` | a non-default breakpoint ladder / content cap |
| `layout.marginOverrides` / `layout.gutterOverrides` | `{ <breakpoint>: px }`, e.g. `{ md: 44 }` | the brand specifies its own grid margin or gutter at a breakpoint (keyed by the breakpoint name, `sm`…`2xl`); an unset breakpoint keeps the engine's value. The value is never rounded to a step. `grid/margin` (or `grid/gutter`) links to the first of these that exists: **(1)** the `space/*` step with that px; **(2)** otherwise the brand's `core/dimension/*` step with that px (44 → `core/dimension/44`); **(3)** otherwise a plain px, flagged off-scale in its description and in the decisions notes. Spacing always comes first, so 24 links to `space/300`, never to `core/dimension/24`. The Figma grid style for that breakpoint carries the same px as its offset |
| `gradients` | `[{ name, kind: linear\|radial, angle/center/shape, stops: [{ palette, step, position }] }]` | opt-in brand gradients (most systems ship none — omit) |
| `disabledStrategy` | `full` \| `reduced` (legacy aliases: `accessible`, `conventional`) | `reduced` (default) — disabled ink clears a dialable `disabledMin` floor (3–4.5, default 3); `full` promises a fixed 4.5:1 (AA text) instead. Neither goes below 3:1 — this system does not use the WCAG 1.4.3/1.4.11 inactive-component exemption, so there is no sub-AA "exempt" look to select. (`accessible`/`conventional` are accepted as legacy aliases; both normalize to `reduced` — they do not select `full` and `conventional` no longer means low-contrast.) |


**Exact type sizes and one letter spacing per text type** (both off by default):

- `sizes: { title: { xs: 24 }, caption: { md: 10 } }` sets exact sizes. Heading groups (display, title, eyebrow) take any
  rung they ship, as the desktop size; caption takes md and lg, at the brand level only, so a caption keeps one size
  on every screen and in every mode. Every value is a step on the size ladder, at or above its group's floor (caption
  10px), and each group's sizes stay strictly increasing. The xs and sm captions come only from `sizeFloor` and
  `captionFloor`.
- `tracking: { display: open, body: open }` gives every size of a text type one letter spacing name, any of
  tightest, tighter, tight, snugger, snug, normal, open, wide or wider. It replaces the size-based letter spacing and
  the `trackingShift` nudge for that text type only. Use it when a nudge can't land the value: no nudge reaches open
  (+1%), and display's letter spacing changes at 96px, so a nudge can't make display one value.

## How to author

1. **Pin the anchors in OKLCH.** Convert the brand's exact hero hex to OKLCH and set
   `primary`. Do the same for accents (`brandColors`). Pin the brand's *real* colors —
   the engine reproduces an anchor exactly (ΔE00 ~0) and grows the ramp around it, so
   fidelity to the brand comes from accurate anchors, not from you placing steps.
2. **Choose the neutral cast.** `neutral: { hue, chroma }` derives a gray with a hint of
   the brand (low chroma — 0.004–0.01). If the brand ships a *specific* gray, pin it with
   `neutral: { hue, chroma, anchor: {l,c,h} }`. `hue` and `chroma` are still required; the
   anchor overrides them, so set them to the anchor's own hue and chroma.
3. **Decide action.** If the brand's interactive color *is* the hero, do nothing
   (`action` defaults to `primary` — the engine notes it so it stays a confirmed choice).
   If interactive UI uses an accent, set `actionPalette: <accent-name>`. Links follow the action
   palette unless you set `linkPalette` — point it at `primary`, `neutral`, or an accent to give links
   their own color; a non-color-distinct choice (like `neutral`) is flagged to underline links (WCAG 1.4.1).
4. **Map adjectives → `personality`, and let the engine resolve them.** This used to be a
   judgment you made silently; it is now a controlled vocabulary the engine resolves **and
   logs**, which is the point — a choice made for the brand should be as visible as one you
   made yourself. Read the brief's language, map it onto the traits, and set them:

   ```yaml
   personality: [energetic, premium]     # in priority order
   ```

   Nine traits — `energetic`, `calm`, `premium`, `restrained`, `bold`, `generous`, `dense`,
   `soft`, `sharp` — each filling several levers at once. **A trait only fills a lever you
   left absent**: anything you set explicitly always wins, and the engine records what it
   declined to change. Between traits, the first listed wins.

   Your judgment still does the real work, one step earlier: the brief says "sassy,
   irreverent, fresh" and *you* decide that lands on `[energetic, bold]`. The vocabulary is
   closed, so an unrecognized word is rejected rather than silently ignored — map to the
   nearest trait rather than inventing one. Sliders take the same words directly
   (`radiusScale: soft`), and anything the brief doesn't speak to stays at its default.
5. **Write the prose body.** One or two paragraphs of intent — what the brand feels like,
   why action is (de)coupled, why the page is tinted. It's the rationale, and downstream
   authoring agents read it.

## The compile loop (verification — do this, don't guess)

```bash
npx tsx packages/engine/cli.ts <your-design.md> --out <a-scratch-dir>
```

Read the output — it is the contract:

- **`aliases: N/N resolve | mode contracts: M/M pass`** — every reference resolved and
  every per-mode contrast contract held. This is the pass bar.
- **`notes`** — confirmed choices and warnings: `action: the primary palette, by default — actionPalette is not set.`, a pinned
  anchor that fell **out of gamut** (the engine clamps + flags it — nudge the anchor's
  chroma down if you meant it to be exact), the tinted-surface floor, etc. Read every
  note; each is a decision to confirm or fix.
- **Exit 0** = clean. **Exit 1** = a schema violation, a broken alias, or a **failed
  contrast contract** — the message names it. Fix the *input* and re-run: a failing
  action-on-surface contrast usually means nudging the primary's lightness or moving the
  surface base; an out-of-gamut anchor means lowering its chroma.

Loop until it exits 0 with all contracts passing. That closing loop **is** the
deliverable — a `design.md` that compiles clean is a brand the engine can carry to every
platform.

## Two dialects (know which you're writing)

- **Engine-native** (this skill) — frontmatter that maps 1:1 to the engine's input, as
  above. The direct on-ramp; what you author from a brief.
- **Standard** (a brand-skills / extraction export) — a flat top-level `colors:` hex map +
  structured type/dimension maps + an optional `x-prism3:` levers block. The same CLI
  auto-detects it (a top-level `colors:` map ⇒ standard) and runs a color-role classifier
  to derive the anchors. When you're *starting from an extraction*, keep that shape and add
  an `x-prism3:` block for the levers; run with `--fidelity` to get an observed-vs-generated
  report (which brand values the engine reproduced vs. intentionally regularized).
  **The block reads ten keys only**: `root`, `personality`, `radiusScale`, `typeScale`, `density`,
  `motionTempo`, `actionPalette`, `iconContrast`, `surfaces`, `gradients`. Two of them are spelled
  differently from the engine-native field: `typeScale` sets `typography.typeScale` and `motionTempo`
  sets `motionPersonality.tempo`. **Any other key is dropped without a warning**, so check the
  applied list the CLI prints. A lever outside these ten needs the engine-native dialect.

## If you have the MCP surface

`list_levers` enumerates the knobs and their allowed values. `theme_from_brief` takes a
`design.md` brief (frontmatter and prose) directly — the callable form of this skill's loop.
`theme_brand` compiles a `BrandInput` you already hold. Both return the contract results,
alias integrity and the notes by default; the token tree and the `.ai.json` come back only
when asked for with `include`, and they are large. To get the actual files, call
`export_theme`, which writes them to a directory and returns a manifest. `validate_brand`
checks an input against the schema without emitting. Same discipline either way; the CLI
is the file-based path, the MCP the callable one.
