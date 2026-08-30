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
  actionAnchorStep, destructiveAnchorStep, accentPalette, interactivePalettes,
  outlineInteraction, neutralEmphasis, inverse
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
two worked briefs: `packages/engine/examples/aurora.design.md` maximal, `harbor.design.md`
minimal — read both, they are the reference):

| Lever | Shape / values | Use it when |
|---|---|---|
| `root` | string (default `prism`) | the brand needs its own token namespace (`nbds`, …) |
| `brandColors` | `[{ name, oklch: {l,c,h} }]` | the brand has accents beyond the hero |
| `actionPalette` | a `brandColors` name | interactive UI runs on an **accent**, not the hero (decouple) |
| `status` | `{ success/warning/danger/info: {l,c,h,chroma} }` | the brand *specifies* status hues; omit any (or all) to let the engine synthesize + carve a danger red |
| `surfaces` | `{ light: { base: 50 } }` | the page is a **tinted off-white**, not pure white (the contrast floor moves with it) |
| `density` | `comfortable` \| `compact` \| `spacious` | a dense tool vs a roomy reading product |
| `radiusScale` | number, or a named stop: `sharp` \| `modest` \| `standard` \| `soft` \| `round` | corner softness |
| `controlShape` | `rounded` \| `pill` | pill-able controls (buttons) read as full **pills** (height ÷ 2) rather than rounded — a brand-identity choice, orthogonal to softness |
| `iconContrast` | `text` \| `3:1` | let non-text icons run lighter (WCAG 1.4.11 floor) |
| `motionPersonality` | `{ tempo: snappy \| standard \| relaxed }` | brand energy → motion pace |
| `typography` | `{ families, weightRoles, typeScale: compact\|default\|expressive, displayCeiling, titleFloor, responsive: { fluid, minViewport, maxViewport } }` | custom faces / weight remap / fluid type; `families` is keyed by CATEGORY (`display`/`title`/`body`/`label`/`caption`/`eyebrow`/`code`), and **an omitted category takes the engine default (Inter, or JetBrains Mono for `code`), with a system fallback stack appended** |
| `shadow` | `{ softness, tint: { hue, amount } }` | softer marketing elevation, tinted to the brand |
| `layout` | `{ breakpoints: [...], containerMax }` | a non-default breakpoint ladder / content cap |
| `gradients` | `[{ name, kind: linear\|radial, angle/center/shape, stops: [{ palette, step, position }] }]` | opt-in brand gradients (most systems ship none — omit) |
| `disabledStrategy` | `full` \| `reduced` | `reduced` (default) — disabled ink clears a dialable `disabledMin` floor (3–4.5, default 3); `full` promises a fixed 4.5:1 (AA text) instead. Neither goes below 3:1 — this system does not use the WCAG 1.4.3/1.4.11 inactive-component exemption, so there is no sub-AA "exempt" look to select. (`accessible`/`conventional` are accepted as legacy aliases; both normalize to `reduced` — they do not select `full` and `conventional` no longer means low-contrast.) |

## How to author

1. **Pin the anchors in OKLCH.** Convert the brand's exact hero hex to OKLCH and set
   `primary`. Do the same for accents (`brandColors`). Pin the brand's *real* colors —
   the engine reproduces an anchor exactly (ΔE00 ~0) and grows the ramp around it, so
   fidelity to the brand comes from accurate anchors, not from you placing steps.
2. **Choose the neutral cast.** `neutral: { hue, chroma }` derives a gray with a hint of
   the brand (low chroma — 0.004–0.01). If the brand ships a *specific* gray, pin it with
   `neutral: { anchor: {l,c,h} }` instead.
3. **Decide action.** If the brand's interactive color *is* the hero, do nothing
   (`action` defaults to `primary` — the engine notes it so it stays a confirmed choice).
   If interactive UI uses an accent, set `actionPalette: <accent-name>`.
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
- **`notes`** — confirmed choices and warnings: `action ← primary (default)`, a pinned
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

## If you have the MCP surface

`list_levers` enumerates the knobs (the same contract this table is drawn from) and
`theme_brand` compiles a `BrandInput` and returns the tree + `.ai.json` + the contract
results — the programmatic form of the compile loop. `validate_brand` checks an input
against the schema without emitting. Same discipline either way; the CLI is the
file-based path, the MCP the callable one.
