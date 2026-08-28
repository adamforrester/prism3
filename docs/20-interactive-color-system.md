# 20 — The interactive colour system (decision record)

> The `Button` calibration (docs/14 §6, KB `components/button.md`) exposed that the semantic
> layer only had a complete interactive palette for *one* intent (`action` = primary), so the
> Button definition had to scavenge across `foreground` / `border` / `brand` for the rest. This
> doc is the **decision record** for the redesign that fixes it: a single, coherent, generated,
> contrast-verified **interactive colour family**, plus the rules for what lives inside it and
> what deliberately lives outside. Decided through the design dialogue of 2026-07-05; this is the
> source of truth **before** any engine code. Nothing here is built yet — it's the spec to build to.

> **Update (2026-07-17) — extensible interactive palettes (built).** §3's single opt-in accent is
> now generalised to **N** interactive columns (`interactivePalettes`). Three rules the engine
> enforces: **danger/destructive is always on** — it is a built-in column, never opt-in, alongside
> primary and neutral; each extra column **auto-places its rest fill** at the palette's pinned step
> by default, with an **optional per-column `anchorStep` override**; and a column may only promote a
> **declared palette (a colour primitive already in the ramp set)** — never an arbitrary hex, so
> every interactive colour stays a themeable alias. The `accentPalette` lever is kept as the
> one-column back-compat alias. See §3a for the input shape and the emitted roles.

---

## 1. Why this exists

Three problems, one root:

- **Shallow coverage.** `action.*` existed only for primary; danger borrowed `foreground.danger`, secondary borrowed the `foreground.secondary` *surface*, outline borrowed `brand`/`border`. A button's colours came from four unrelated families — no pattern, and `brand.*` tokens leaking onto buttons (they never should; the brand mapping is the engine's business, not the component's).
- **Interactive states with no consistent home.** Solid hover lived as a darker fill; the ghost/overlay hover lived somewhere else. A designer couldn't answer "where do I find interaction states?" with one answer — the exact ambiguity that pushed the old Prism2 system to keep them together.
- **Neutral was never right** (§12) — the achromatic, hand-authored, doubly-inverse corner that no un-gated system gets consistent.

The fix is one coherent family, generated and gated, with a stated rule for its boundary.

## 2. The family — `interactive.<color>.<slot>.<state>`

Every interactive element (buttons, links, rows, menu items, selectable cards, form-field states) draws its colour from **one** family:

```
interactive.<color>.<slot>.<state>
```

- **`<color>`** — `primary` · `neutral` · `destructive` (always) + `accent` (optional, §3).
- **`<slot>`** — `fill` · `on-fill` (ink on the fill) · `text` (ink for outline/text appearances) · `border` · `icon` · `overlay` (§6).
- **`<state>`** — `rest` · `hover` · `pressed` · `focused` (+ `selected` where a component needs it). `rest` is the base.

Rest colours + their states all live here. Nothing about how an interactive element behaves lives anywhere else. That single-home rule is the load-bearing decision (§8 is its mirror image).

## 3. Colours — three required, accent optional

`primary` · `neutral` · `destructive` are always generated. **`accent` is generated only when the brand defines an accent colour** (`BrandInput.brandColors` + `actionPalette` — the engine already models this; aurora uses it). No accent colour → no accent column; **never fall back to primary** (that ships two identical-looking "primary" buttons). Most brands run `{primary, neutral, destructive}`; a brand with an accent gets a fourth column for free.

`ghost` and `secondary` are **retired as colours** — `ghost` was an appearance masquerading as a colour (the Prism2 confusion), and emphasis is the *appearance* axis's job (§4), not a colour rung.

## 3a. Extensible interactive palettes — N columns, not one accent

The single accent of §3 generalises: a brand can promote **any number** of declared palettes to full interactive columns. `primary` · `neutral` · `destructive` are the always-on built-ins; each extra column is opt-in and gets **the same generated, gated treatment** as the built-ins — no column is a second-class citizen.

**Input shape** (`BrandInput`):

```ts
interactivePalettes?: {
  name?: string;      // role suffix → interactive.<name>.*  (defaults to `palette`)
  palette: string;    // MUST be a defined palette: 'primary' or a brandColors name
  anchorStep?: number;// optional rest-fill step (default: the palette's pinned/auto step)
}[];
actionAnchorStep?: number;       // optional fill-step override for the built-in primary column
destructiveAnchorStep?: number;  // optional fill-step override for the built-in destructive column
```

**Roles emitted** per column (`<name>` = `entry.name ?? entry.palette`): `interactive.<name>.fill.{rest,hover,pressed,focused,selected}`, `interactive.<name>.on-fill`, `interactive.<name>.text`, `interactive.<name>.border`, `interactive.<name>.inverse.*` (unconditional since #895), and the `interactive.<name>.overlay.{hover,pressed,selected}` washes (when `outlineInteraction: 'overlay-neutral'`). Every one is contrast-gated per mode by the same 488-contract machinery (§13).

**Naming.** `name` (or the palette name it defaults to) must be a single lowercase slug and must be **unique** and **must not collide** with a built-in column (`primary`/`neutral`/`destructive`) — the engine throws a clear error otherwise, mirroring the `actionPalette`/`brandColors` validation. The `palette` must be a **defined palette** (validated like `actionPalette`); an undefined palette throws.

**Placement.** By default a column's rest fill anchors at the palette's pinned step (a `brandColors` accent → its own lightness step; `primary` → the primary anchor; an unanchored neutral/status palette → the 500 mid pivot), then the engine nudges to clear the fill's contrast floor. `anchorStep` overrides that placement per column. The built-in primary/destructive columns take the same override via `actionAnchorStep` / `destructiveAnchorStep`.

**Only primitives.** A column promotes a colour that is **already a ramp** — never a raw hex. This keeps every interactive colour a themeable alias into the primitive tier (the deprecated Polaris/SLDS raw-hex trap, §gradient parallel); a bespoke interactive hue is added as a `brandColors` entry first, then named here.

**Back-compat.** `accentPalette` (+ its implicit accent placement) is retained as the ergonomic **one-column alias**: a bare `accentPalette: 'x'` is exactly `interactivePalettes: [{ name: 'accent', palette: 'x' }]` and reproduces the old `interactive.accent.*` output byte-for-byte, including the accent≠action guard. If **both** are set, `interactivePalettes` wins and `accentPalette` is ignored (recorded in the design notes).

## 4. Appearances — the consumer's selection over the family

Components select `filled` · `outline` · `text` (retiring `solid`/`plain`/`ghost` — no room for interpretation):

- **`filled`** → `fill` (+ states) with `on-fill` ink.
- **`outline`** → `border` + `text` ink, no fill.
- **`text`** → `text` ink only.

Emphasis is emergent from `colour × appearance` (a `primary filled` is loudest, a `neutral text` quietest) — so there is no separate emphasis axis.

## 5. States — fill-based by default, overlays as supporting, one home

**Decision (2026-07-05): fill-based interactive states are the default; overlays are the supporting tool where a fill can't adapt.** We did *not* adopt a 100%-overlay ("state layer") model — it isn't established practice for the owner's agency and the tradeoff wasn't worth betting the system on.

What matters is not one *mechanism* but one *home*: both the solid fill-states (`interactive.primary.fill.hover`) **and** the opacity overlays (`interactive.primary.overlay.hover`) live under `interactive.<color>`, side by side. `filled` uses the fill-states; `outline`/`text` use overlays where a solid tint would fail on a dark/coloured/image surface. The mechanism varies by appearance; the **location never does** — a designer finds every interaction state in one place.

## 6. Overlays — adaptive interaction tints, inside the family

`interactive.<color>.overlay.{hover, pressed, selected}` are **alpha-based** layers (built on the existing `palette.black-alpha` / `white-alpha` ramps, or the colour hue at low alpha), so they **composite over any surface** — the ghost advantage, without a ghost category. They cover:

- an `outline`/`text` button's hover on a dark hero or image (a solid tint can't adapt; an overlay can);
- neutral hover/pressed/selected on rows, menu items, cards — the *same* overlays, reused.

`outlineInteraction` (§10) selects whether a component uses a neutral overlay, its own colour's overlay, or none. **Opaque** subtle surfaces (a subtle banner, a solid selected-row background) are *not* overlays — they stay on the existing `foreground.<color>-subtle` roles. Translucent-interaction vs opaque-surface is a clean split.

## 7. Disabled — cross-cutting, its own family

`disabled.*` (fill / text / icon / border / on-fill) is **one treatment, not per-colour** — a disabled button looks disabled regardless of intent. This adopts Prism2's pattern (which Prism3 currently does *not* follow — it has `action.disabled` + `foreground.danger.disabled` scattered per-colour) and pulls disabled fully out of the interactive family. The `disabledStrategy` lever (`accessible` / `conventional`) still governs whether disabled clears a legibility floor.

## 8. Scrim + non-interactive veils — outside, by rule

The boundary rule, stated once: **is the layer triggered by interaction *with the element*?**

- **Yes → inside `interactive`** (hover / pressed / selected / dragged, including the opacity overlays of §6).
- **No → its own family, outside.** A **scrim** is triggered by a *modal opening*, not by interacting with the scrim; it's a contextual backdrop, not a state.

Non-interactive veils that live outside: the modal/drawer **`scrim`**, a **hero/image dim** (a veil over an image so text stays legible), a **loading veil** over a busy region. Kept separate from `interactive`. (This is why an `overlay`-umbrella that swallowed scrim was *rejected* — it would drag a non-interactive layer into the interactive story and re-muddy the divide.) The clause this paragraph used to end with — that they share one home, "`scrim.*` + kin" — is **superseded by §8.1**: the hero/image dim is its own family, and the reason is that the two behave differently, not that the tree looks tidier.

### 8.1 Decided (2026-08-25, #1030): the media veil is its own family, `color.veil.*`, and it is appearance-invariant

Three decisions, all measured. The word is **`veil`**: `overlay` is taken by the DTCG base+overlay projection (`<brand>.<mode>.overlay.tokens.json`), and a colliding word in a filename is a cost paid in every conversation afterwards.

**It is not filed under `scrim.*`, and that is the decision most likely to be "cleaned up" later.** A scrim is *one* role, dark only, that **varies by mode** (40/60/60/70) and that no designer selects — the modal opens and it appears. A veil is *six* roles, both polarities, **identical in every mode**, and a designer picks one per image. Filed together, a picker shows `scrim.default` beside `scrim.dark.40` with nothing but folklore distinguishing their behaviour — membership-by-location, the same defect `payload-manifest.json` exists to remove one tier down. They look alike and are not.

**Tier: `color.veil.*` (semantic, aliasing an alpha primitive), not `opacity.veil.*` (a bare number the consumer applies).** The two reference systems disagree — Prism2 ships `color/surface/scrim/{darkest…light}`, New Balance ships `opacity/scrim/{light: 0.6, heavy: 0.8}` — so the cost of the road not taken is worth stating. Figma cannot bind an opacity number to a **fill**, so the polarity, which *is* the designer's choice, would live in no token at all; and NB's reduced form names magnitude rather than polarity, so it cannot express the matrix even in principle. Optimized for the designer picking a fill in Figma. A code consumer loses nothing: the leaf resolves to an `rgba()`.

**Derived, not inherited — and the framing that six hardcoded steps would be "the first colour family not generated against a contrast contract" is wrong.** `scrim.default` beside it is *already* a hardcoded per-mode step with `ratio: 1`, `against: 'self'`, `min: 0`; hardcoding the veil would have been consistent rather than exceptional. It is derived anyway, because it derives more cleanly than most roles: each rung is the **least emitted alpha step** that clears its floor over the image's **worst pixel**. The worst pixel and the ink are the same extreme, and not by coincidence — the pixel that hurts is the one pulling the composite toward the ink, so a dark veil's worst case is white-on-white. Measured: **dark 50/60/70, light 40/50/60**. Prism2's 40/60/80 is therefore *not* inherited: 40% dark measures **2.85:1**, under every floor, so its bottom rung buys nothing. The light polarity sits lower at every rung because sRGB gamma lifts a black pixel faster than it drops a white one; rungs are named by the **floor** they buy (`large`/`body`/`enhanced` = 3/4.5/7), never by their alpha, which makes that asymmetry read as the point rather than as an inconsistency.

**The invariance is a consequence, not a convention.** The derivation's ground is sRGB white or sRGB black — a constant, not a theme surface — so no mode input reaches the result, and both polarities are live in every mode because a photograph has no polarity the theme can read. It is the first colour family here with that property. Two caveats it is honest to state: the floors assume the **pure** ink, so a softened ink spends the margin (at rgb(30) on the light veil, `body` measures 4.19:1); and a rung must **not** escalate in high contrast, because escalating collapses the ladder — `body` and `enhanced` would land on the same value and one rung name would become a lie. The right HC response is a component choosing a higher rung.

Gate note, because the cheap-looking gate here does not hold: `lint-overlay-completeness.ts` compares the canonical `modes` extension to the emitted overlays — **both committed artifacts** — so mode variance that is genuinely present in both is, to that gate, correct. Under a producer-side mutation it stays green and simply counts the veil leaf as varying. The invariance is held by `test.ts` §9c, which asserts a **property of one artifact** (every mode entry equals base) rather than an agreement between two.

## 9. Inverse — a generated surface-context, not a hand-mirrored set

The real need: a **light CTA on a dark hero / dark section**, which a light-only brand still requires (so it is *not* a dark-mode concern). Prism2 modelled this by hand-mirroring every token with an `-inverse` twin — **60 of its 122 action tokens** — which was a top complexity driver and a top neutral-miss contributor.

Prism3 keeps inverse but reframes it as a **surface *context*** ("this control sits on an inverse/dark surface"), independent of light/dark theme, **generated and contrast-verified** rather than hand-authored. Generation absorbs the volume that made it painful; it's applied consistently (primary certainly; destructive too if opted, for consistency). "Usually resolves to white, but not always" becomes a per-brand derivation the engine gates.

### 9.1 Decided (2026-08-20, #871): cascade to publish, surface as its own Figma collection

**Superseded in part 2026-08-28 (#1133) — see §9.8.** The collection survives, as the pointer tier, on #1082's appearance-independence grounds; the *surface axis* does not. "Cascade to publish" was the mode-inheritance mechanism, and it goes with the mode — inverse is name-encoded and bounded to a declared set of components. The measurement below still holds and still says exactly what it said: inverse is not dark mode. What did not survive was the step from there to "therefore it is an axis".

**Cascade to publish context; surface as its own Figma collection, orthogonal to appearance; no per-component surface axis.** Three research passes (KB PRs #20, #21, #22) plus measurement against our own tree settled it.

`tools/exporter-comparison/axes.ts` already records that a brand's Figma emission carries three independent mode axes — appearance, breakpoint, viewport — against the DTCG projection's one appearance-only axis. **`surface` is a fourth instance of a pattern with three working instances**, not new architecture.

Measured before deciding: inverse is not dark mode (96 tokens match their dark-mode counterpart across all four brands, 40 differ, clustered on `interactive.*.fill.*`/`on-fill` — a primary button on a dark band takes a near-white fill, the same button in full dark mode takes a mid-tone brand fill; collapsing the two would silently change forty values). The alias layer is brand-independent (all four brands ship the identical 40 inverse token names, zero divergence — 36 predates #576's border states, corrected in #891/#893's own intake), so the surface collection holds no colour values at all — pure indirection, authored once, shared by every brand.

**The crossed alternative** (`light / light-inverse / dark / dark-inverse` as eight modes in one collection) was pressure-tested and rejected: it loses on inheritance (a Figma frame takes one mode per collection, so an inverse section tagged `light-inverse` is silently wrong the moment the page flips to dark) and re-creates the appearance/context conflation `axes.ts` exists to prevent.

**Acceptance check carried forward:** the alias layer holds only while every brand's semantic leaves resolve to a real inverse counterpart by contract, not by luck. The first hand-authored client brand — where a brand's inverse context might need a structurally different semantic role rather than a different value — is where this gets tested for real.

Sequenced after #891 (§9.2): the alias layer references these names, and shipping it before the rename makes the inconsistency permanent and invisible.

### 9.2 Decided (2026-08-21, #891): normalize `on-inverse` and `-inverse` to `.inverse.`

Three spellings for one concept existed across the emitted tree: `.inverse.` as a path segment (`background`, `foreground`), `.on-inverse` as a path segment (`interactive.{primary,neutral,destructive}`, `text`, `icon`), and `-inverse` as a hyphenated suffix (`border.focus-inverse`) — with `border` using two of the three at once (`border.inverse` and `border.focus-inverse` together).

**All three normalize to `.inverse.` as a path segment, everywhere**, so that `on-` means exactly one thing (ink on X) and `.inverse.` means exactly one thing (the inverse-context variant) across the whole tree — `interactive.primary.inverse.on-fill` then reads as *ink on the inverse fill*, matching its own `$description`. 30+ guaranteed token paths move; `CONTRACT_VERSION` takes a MAJOR bump.

Landed before tranche 1 authoring and before #871's alias layer (§9.1) deliberately: the alias layer would reference these names, and shipping it first would make the inconsistency permanent and invisible — consumers would stop reading the underlying names at all.

### 9.3 Decided (2026-08-21, #894): case-by-case ranges, not one universal rule

Whether a colour-selecting control's *range* — which palettes it may point at — should follow one universal rule ("any control that selects a colour should be able to select any declared palette") turned out to decide differently per control, and the reasoning is durable past the two controls that raised it:

**A semantic palette like `success` is already customizable at the palette level** — derived, custom hex, or pointed at a custom palette (§3a). Widening a control's *range* to accept any declared palette directly, where that outcome is already reachable through palette-level customization, is a second mechanism for the same result, plus an unusable menu of every step of every palette.

**Allow-and-flag is a contrast policy, not a range policy — it does not transfer.** Both the text-colour and inverse-surface controls flag rather than block a contrast failure; that shared contrast posture says nothing about whether their *range* questions have the same answer, because contrast policy and range are independent axes.

So: `textPalettes` (a text-colour range widening) and the inverse-surface control's range widening are decided on their own merits, each time, not by a shared rule.

### 9.4 Decided (2026-08-23, #895): the inverse surface-context is not optional — the `inverse` lever is removed

The toggle is gone from `levers.ts`, `BrandInput`, `Theme` and `theme-schema.json`, and the three guards it drove in `modes.ts` are unconditional.

**The reason is a contract violation reachable from a control, not a preference about coverage.** Set `inverse: false` and a brand emitted 157 colour roles instead of 236. All **79** of the lost paths are in the committed `guaranteed` set — 13.9% of 570 — so a consumer writing `prism.color.text.on-inverse.primary` got a reference resolving to nothing, with no error, no `CONTRACT_VERSION` bump and no gate firing. `token-contract.ts --check` could not see it, because the corpus runs every lever at its **default**: a gate that only ever observes the default cannot find a defect that lives off it.

**#895 measured 30 when it was filed. #892 grew it to 79** — the inverse gap-filling landed 49 more paths inside the same guard without anyone re-deciding that the guard should hold them. That growth is what turned "document the sharp edge" into "remove it": a lever whose blast radius silently expands with unrelated work is not one a description can make safe.

**Removing a lever is not removing a path**, and the check confirms it: `guaranteed` stands at 570 before and after, `CONTRACT_VERSION` stays 5.1.0, and no emitted value moves in any of the four corpus brands. Those 79 paths were *already* guaranteed. The lever was a way to make the engine break that guarantee, not something the guarantee rested on — so removing it makes the contract true rather than changing what it says.

**The alternative was worse on its own terms.** Keeping the toggle would have obliged the contract to demote 79 paths to `brandDependent`, because that is what it would then truthfully say — demoting a family every brand actually ships, to preserve a control nobody could reach (below).

**It never rendered.** #895 left open whether the toggle was merely hard to find in the studio; it was not there at all. `leversFor()` is called exactly once, for `'motion'`, so `pageOfLever`'s fallback — whose comment lists `inverse` among the levers routed to the Interactive page — describes routing that never executes. The Interactive page hand-builds its controls by key, and no key was `inverse`. The general defect that permits (a manifest lever that silently never renders) outlives this issue and is filed separately.

**Not the last of its class.** Sweeping every enumerable lever setting against the committed baseline finds two more levers that remove guaranteed paths: `outlineInteraction` at `solid-tint`/`none` (18 `interactive.*.overlay.*`) and `typography.displayCeiling` below `xl` (up to 3 `type.display.*.strong`). Both differ from `inverse` in disposition — removing those paths is each lever's declared purpose, so the honest fix is almost certainly to demote the paths rather than delete the lever — and both are the owner's call, filed separately. `test.ts` pins the inverse-vocabulary half of that sweep as an exact set, so the exemption fails in both directions.

### 9.5 Decided (2026-08-23, #956): a ground is DECLARED, not overridden

`surfaces.<mode>.inverseBase` joins `base` and `floorStep`. The `overrides` map now **refuses** a ground that has such an input, naming it in the error; a ground without one is applied and **warned**, listing the roles it left stale. Separately, any role below its `min` is warned, whatever moved it.

**The distinction the tree did not encode: a ground is not a value.** `overrides` is a post-pass — it runs after all derivation and rewrites exactly one role. That is right for a leaf, where nothing downstream was measured against it. It is silently wrong for a ground, because everything gated on it keeps the value *and the ratio* it derived from the old one. Routed through it, an inverse band of `neutral 300` left **53 of 53** gated roles claiming contrast they did not have, worst true ratio **1.00:1**, and **zero warnings** — the warning is computed from the same stale number, so allow-and-flag degraded to allow-and-silently-lie.

**`base` never had this defect, and that is the design argument rather than luck.** It was always declared where `resolve()` could see it, so moving it re-derives the ladder and everything gated on it. Measured, the same page color reached both ways:

| route to `#a5a7aa` | falsely-passing | stale ratios |
|---|---|---|
| `surfaces.light.base = 300` | **0** / 38 | **0** / 41 |
| `overrides.light['background.primary']` | **33** / 38 | **41** / 41 |

So the fix is not a new mechanism — it is the existing one extended to the band that lacked it. The studio's Inverse control now writes `surfaces`, as its Primary control always did.

**Refuse only where there is somewhere better to send them.** A blanket ban on overriding any ground was written first and was wrong: `interactive.<c>.fill.rest` is a ground too (its `on-fill` ink is measured against it), so refusing every ground would delete the ability to retint a button — a real capability, with no declarative alternative to point at. A rule that removes a working feature to prevent a defect it could instead *report* is not the honest reading of "flag, do not silently mislead". Hence the split: an input exists → throw and name it; none exists → apply, and warn with the dependents left stale.

**Two obligations, kept separable on purpose.** *Generated output always complies* and *the user's own choice is allowed and flagged* are different promises, and conflating them ends in refusing a choice that must be allowed. Re-derivation delivers the first for free. Where it physically cannot — no ink is 4.5:1 on mid-grey, so a declared `base` of neutral 500 leaves 41 generated roles short — the promise that can be kept is *complies, or says so*. It warns; it never blocks.

**The gate had to be independent to exist at all.** `test.ts` has asserted "all mode contrast contracts hold" for a long time by reading each role's own `ratio` — asking the reporting path whether the reporting path is right, which in this failure agreed with itself. `lint-ratio-truth.ts` recomputes from the **final emitted colors** (10,080 ratios across 5 corpus brands + 13 declared-surface cases) and never reads `ratio` to decide the truth. It sweeps moved grounds deliberately: at defaults every brand is clean, so a corpus-only run would report a confident zero over precisely the inputs that cannot show the bug.

**One stated hole and one repaired reference.** The 18 translucent overlays are unverified by that gate and counted in its output — they model `against` in the *opposite* direction (the role is the wash, `against` names the ink composited on top), so one field carries two meanings; filed as §9.6, which closed it. And nine `against` strings still read `text.on-inverse` after §9.2's promotion made it a group, resolving to no role and falling back to the page surface — #922's rule one layer down, where the consumer is data and so never runs at all.

### 9.6 Decided (2026-08-23, #963): `against` means one thing; a wash declares that it is one

`against` names **the surface a role sits on**, on every role, with `ratio = contrast(me, against)`. A translucent wash — the 18 `interactive.<c>[.inverse].overlay.*` roles — declares itself with two more fields:

| field | on an ordinary role | on a wash |
|---|---|---|
| `against` | the surface I sit on | the ground I composite **over** |
| `contrastModel` | *(absent)* | `'ink-on-composite'` |
| `legibleFor` | *(absent)* | the ink that must survive on the result |
| `ratio` | `contrast(me, against)` | `contrast(legibleFor, composite(against, me, alpha))` |

**The problem was one field carrying two opposite arrows with nothing to distinguish them.** A wash is not ink; it is a veil, and what has to stay legible is the ink *on top of* the result. Before this, `against` on those roles named that ink, so any consumer reading `against` uniformly — as a consumer must — was wrong for 18 roles per mode with no way to detect it.

**Declared, never inferred**, and `scrim.default` is why that is not pedantry: it carries `alpha: 0.4` and is genuinely `ink-on-surface` (`against: 'self'`, ungated). Reading the model off "does this have an alpha" would misclassify a real role immediately. It is also §9.5's trap in new clothes — a discriminator derived from the code it is meant to check agrees with itself. `ResolvedRole` is a union, so `legibleFor` and `alpha` are *required* exactly when the model is `ink-on-composite`, and `putWash` is a separate function from `put`: the shape that caused this is no longer expressible.

**What it bought.** `lint-ratio-truth.ts` had excluded all 18 outright — **1,296 ratios per run taken on trust** — because with the ground recorded nowhere they were not recomputable at all. It now dispatches on the declared model and verifies both shapes: **10,080 → 11,376 ratios**, with a fifth arm asserting the label and the shape agree in both directions.

**Recorded precisely, because the tempting summary is wrong:** `ai.json`'s `contrast_with.token` was *already* correct. That field wants the ink, and `against` happened to be carrying it — every emitted `contrast_with.token` is byte-identical across this change. Repointing it at `legibleFor` was a **migration to stay correct**, not a fix. What it genuinely gains is `composited_over`, since "4.5:1 with `text.primary`" was never actionable without knowing which ground made it true.

### 9.7 Decided (2026-08-23, #964): overriding a ground re-derives its dependents' ratios; their values stay, and say so

§9.5 gave `background.primary` and `background.inverse.primary` declarative inputs and made the override layer **refuse** them. The remaining **18** grounds had nowhere to be sent, so they were applied and merely warned about — their dependents kept the ratio they derived from the *old* ground. The same defect §9.5 fixed, at 1–29 roles instead of 60.

**What moves and what does not — the asymmetry decides the design, and it was measured.**

| | when a ground's colour changes |
|---|---|
| dependents' **ratios** | change — pure arithmetic over the final colours, **recomputed** |
| dependents' **values** | do not, and *cannot be* from here |

`interactive.<c>.on-fill` is `onColor(rest.rgb)` — a local inside `iFill`, not a lookup. Every dependent of the 18 is an ink or a wash picked by a closure that has already returned. **That ruled out the obvious fix** — ordering the override into derivation so later reads see it — because derivation does not read roles back; it reads locals. The topological-order question #964 raised never arose: the property that would have needed asserting was not the binding one.

**So the reported number becomes true, and an unchanged value that no longer clears its bar is named.** Measured across the 18 grounds: **67 dependents left value-stale, worst case all 67 falling short — every one warned, none silent.** Allow-and-flag doing exactly what it promises. Making the *values* re-derive needs the derivation rules reachable after the fact; that is a larger change, filed rather than smuggled in.

**Direct dependents only**, which is correct rather than a shortcut: a dependent's own colour does not change, so anything measured against *it* is unaffected. The edge set covers `legibleFor` as well as `against` — since §9.6 a wash reports the legibility of a second role it names, and moving that desynchronises it identically. That edge is also why the count is 18 and #964's table said 17: `text.on-inverse.primary` only became reachable as a ground once §9.5 repaired the nine `against` strings dangling since §9.2.

**The gate was written first, and red.** The override cases were added to `lint-ratio-truth.ts` and confirmed failing — **226 failures** — *before* the fix that makes them pass. Every prior case built through `surfaces`, so arms A–C had never exercised the `overrides` route at all: the same blindness that left §9.5's refusal unheld until arm D was written for it. A gate authored after a fix cannot tell you the fix was needed.

### 9.8 Decided (2026-08-28, #1133): inverse is name-encoded and bounded — the `inverse` mode comes off the pointer collection

**What came off, and it is one thing:** the `inverse` mode on the `color.surface` pointer collection. That collection is single-mode now (`Default`), 129 rows, and the pointer tier no longer flips. The DTCG overlay that would have projected the mode (#1129, PR #1132) was closed unmerged rather than landed.

**What stayed, deliberately, because reverting an encoding is not reverting the model:** all **113** inverse roles in `color.appearance` — `background.inverse.*`, `border.inverse.*`, `text.inverse.*`, `interactive.*.inverse.*` — keep their four appearance modes and their contrast contracts. They are the *values* an inverse component variant binds, and every section of §9 that derived them (§9.2's normalization, §9.4's removal of the lever, §9.5's `inverseBase` ground, §9.6/§9.7's ratio truth) stands untouched. So does the two-tier pointer/value split (#1082), which was justified by appearance-independence and never by inverse, and the brand-root namespace (#1097).

**Why the mode was built.** §9.1 read `surface` as a fourth instance of a pattern with three working instances (appearance, breakpoint, viewport), and the measurement under it still holds: inverse is not dark mode — 96 tokens match their dark-mode counterpart, 40 differ, clustered on fills. That measurement says *don't collapse inverse into dark*. It was read as *therefore give inverse its own axis*, and that second step is the one that did not survive.

**What reverted it is the requirement, measured against what the encoding delivers.** #1128 measured **112 of the pointer tier's 128** roles flipping under the inverse mode. A mode is a whole-collection switch, so that is what it has to be — every role in the region inverts, including the ones nobody asked to invert. The requirement is narrower and never was larger: a **bounded set of inverse atomic elements** (button, link, icon, focus ring) plus **inverse variants of page-level blocks** (hero, band, footer). Against a bounded set a mode is the wrong shape twice — it cannot say *which* elements invert, and it makes "all of them" the only expressible answer.

**The field name-encodes it, and keeps it bounded.** Three research passes over Carbon, Material 3, Fluent and Atlassian found no surveyed system shipping a dedicated inverse mode or collection. Each one names it and bounds it: `$text-on-color`, `on-primary`, `foregroundOnAccent`, `text.inverse`. That is not an accident of their tooling — a named role is addressable per component, which is the granularity a bounded set needs and the one a mode cannot offer.

**Prism3 had already shipped the template and was recording it as an exception.** `focus-ring` carries a `color: 'default' | 'inverse'` component property whose `inverse` binds `color.appearance.border.inverse.focus`. Under mode-encoding it was the one def reaching past the pointer tier, logged in `UNALIASED_DEF_BINDINGS` as an argued exception. #1133 makes it the pattern, and the register's entry now reads as the first instance rather than the only violation.

**The tradeoff refused, stated plainly, because it is real.** A mode buys **inheritance**: a designer tags one frame and every descendant flips, with no per-component work. Naming buys none of that — each inverse variant is authored. The cost is accepted because the inheritance *is* the unboundedness: a flip that propagates by containment cannot be restricted to a declared set, so buying the inheritance means buying the 112.

**Priced, and the price is one name.** The pointer tier's 128 rows and the appearance tier's 129 non-inverse roles differed by exactly one — `scrim.default`, which the surface axis had omitted — so dropping the mode is purely *additive* to the contract: one `ADDED color.scrim.default`, `CONTRACT_VERSION` 7.0.0 → 7.1.0 (MINOR), `guaranteed` 684 → 685. The 113 inverse paths deliberately do **not** gain pointer-tier short names; whether they should is a separate naming question (#1135), and whether `color.surface` is still the right collection name now that #1089's rationale has narrowed is another (#1136) — both filed rather than settled here. Committed artifacts drop 114 → 111, two files per brand becoming one.

**One trap for whoever re-verifies this.** #1013's `['scrim', ['default']]` deprecation had to be *retired*, not reworded: the engine emits that path again, and a deprecation for a live path tells a consumer to migrate off a name that works. No gate can see it — `classify`'s dangling check reads a `Deprecation.replacedBy` against the live set and never the `path` — so a revived path passes silently. Filed as #1137; not fixed here.

**Where a developer looks is unchanged.** `color.appearance.background.inverse.primary` is the path, and it always was: the studio's token pill already showed it, and Studio never modelled inverse as a mode at all, so nothing there moved but a comment that had gone stale.

## 10. Levers (brand inputs)

- **`outlineInteraction`** — `overlay-neutral` · `overlay-tint` (the colour's hue at low alpha) · `solid-tint` · `none`. How an outline/text control expresses hover (the "what do we fill it with" question, answered per brand). *(inc-2: `overlay-neutral` (default) generates the neutral washes + composited-contrast gate; `solid-tint`/`none` opt out. `overlay-tint` is scheduled — needs per-colour alpha ramps.)*
- **`neutralEmphasis`** — `subtle` (light-grey, the default) · `strong` (bold near-black neutral). The neutral button's boldness.
- **`interactivePalettes`** — the extensible set of opt-in interactive columns (§3a); each promotes a declared palette to a full `interactive.<name>.*` family with an optional `anchorStep`. `accentPalette` is the retained one-column back-compat alias. `actionAnchorStep` / `destructiveAnchorStep` override the built-in primary/destructive fill anchors.
- ~~**`inverse`**~~ — **removed in #895.** The inverse surface-context (§9) is unconditional. It was a toggle whose off-state deleted 79 contract-guaranteed paths, which is not a lever so much as a way to break the contract from a control. What remains configurable is the inverse surface's own *value* — the `background.inverse.primary` override — which moves colors without removing names.

## 11. Naming — one reconciled Prism3 scheme, no mixing

**The family is `interactive`, not `action`.** It covers *all* interactive elements and their states (not just "actions"/CTAs), and it has precedent (IBM Carbon's family is literally `$interactive`). This **renames the current Prism3 `action.*` role to `interactive.*`.**

Constraint: we borrow Prism2's *taxonomy shape* (`<color>.<slot>.<state>`, cross-cutting disabled, the on-ink concept) but **normalise every name to one Prism3 convention** — not a Frankenstein of Prism2 (`surface`, `active`, `onprimary`), the field, and Prism3's current terms. `surface`→`fill`, `active`→`pressed`, `on<color>`→`on-fill`. The existing semantic tokens align to this scheme; we do not layer a second pattern beside it.

## 12. Why neutral was the miss — and why it won't recur

The root cause is structural, not a values problem:

1. **Achromatic has the least contrast headroom** — grey-on-grey is a razor-thin AA margin; chromatic colours lean on hue.
2. **The `-inverse` doubling doubled the neutral work** — every value solved and kept consistent twice.
3. **Cross-mode hand-authoring** — light + dark + wireframe each re-declared it by hand, all interdependent (fill can't be picked without its text).
4. **No generation, no contract** — hand-picked pairs with nothing verifying them, so a neutral-hover-text that slipped under AA just shipped. "Never quite right" is where un-gated interdependent contrast always lands.

**Prism3 removes each:** the neutral fill is *picked per mode* by the engine; its on-ink is *derived and verified* against it by the 488-contract gate; inverse and cross-mode become *generated resolutions*, not hand-work. The failure mode was "manual interdependent achromatic contrast at scale"; it is now a **generated, gated contract — a failing neutral pair cannot pass the build.** That gate is the durable safeguard against the miss recurring.

## 13. Generation + verification (the engine's job)

Every `interactive.*` token is **generated** (walk the intent's palette for fill states; derive `on-fill`/`text` for legibility) and **contrast-verified** per mode — including the *composited* result where an overlay sits on a base. This is the same machinery already passing 488 mode contracts; the interactive family becomes more generated output under the same gate, not more hand-authoring.

## 14. Alignment to Prism2 — borrow the shape, fix the rot

| Kept from Prism2 | Fixed in Prism3 |
|---|---|
| `<color>.<slot>.<state>` shape | `action`→`interactive`; names normalised; no pattern-mixing |
| slots surface/text/border/icon | `surface`→`fill`; `active`→`pressed`; `on<color>`→`on-fill` |
| cross-cutting disabled (`disabled.*`) | adopt it (Prism3 currently scatters disabled per-colour) |
| the on-ink concept | `on-fill`, contrast-derived + gated |
| ghost's opacity insight | becomes reusable `overlay.*` (alpha), not a `ghost` colour |
| inverse for CTAs on dark | generated surface-context, not 60 hand-mirrored tokens |
| — | **subtle action hues added** (primary/accent/destructive) — the gap Prism2 lacked |
| — | **everything generated + contrast-gated** — the un-gated hand-authoring that broke neutral is gone |

## 15. Deferred (scheduled, not lost)

- **`field.*` — form-element chrome.** Prism2 needed dedicated input tokens (`surface.input.*`, `border.input.*`) because generic surfaces/borders don't supply a field background, a field border with a validation-state model, or placeholder ink. In Prism3 a **`field` semantic category** holds that chrome; the field's interaction *states* still come from `interactive.*`. This is the **Text Field** calibration component's job (Button surfaced the interactive family; Text Field surfaces `field`; Card surfaces surface/elevation).
- **Component tokens.** Thin, themeable aliases *over* `interactive.*` (`button.*`) for genuinely button-specific overrides — a later tier, only where a component diverges. The load-bearing tier is the generated + verified `interactive` family; if it's complete, component tokens are trivial.

## 16. Next steps

1. ✅ Reconcile the KB `button.md` §15 to this vocabulary (`filled/outline/text` + the four colours) so brief and engine agree.
2. Engine PR (branch `claude/prism3-e2e-integration-8fwul4`, additive-first):
   - ✅ inc-1 `interactive.{primary,neutral,destructive}` family (fill/on-fill/text/border; `rest`/hover/pressed states).
   - ✅ inc-2 `overlay.*` washes + the composited-overlay contrast check + `outlineInteraction` lever.
   - ✅ inc-3 cross-cutting `disabled.*`.
   - ✅ inc-4 inverse surface-context (`interactive.<color>.inverse`) + `neutralEmphasis` + opt-in `accentPalette`.
   - ✅ **Legacy-role removal (task #14)** — dropped `action.*`, the stateful `foreground.danger.*` (danger is now a bare bold `foreground.danger` fill), per-colour `interactive.*.fill.disabled`, and `text/icon.{disabled, on-action, on-disabled}`. Components bind `interactive.*` / `disabled.*`. This deletes vars from the frozen real-NB figma fixture, so it was paired with an **NB-fidelity reconciliation**: the fixture was modernised to the engine's evolved layer (dropped the 17 retired vars/mode, renamed `foreground/danger/default` → bare `foreground/danger`, 95 → 78 real vars/mode). The DTCG colour-fidelity gate (nb-regression, ΔE) is unaffected — only the Figma variable naming changed. *(Note: earlier drafts called this "the #67 reconciliation"; GitHub #67 is actually the unrelated Token Press collection-rename question — there was no dedicated issue for this fixture re-baseline.)*
   - ⏳ `overlay-tint` lever value (per-colour hue at alpha) — needs per-colour alpha ramps.
3. ✅ Rebind Button/IconButton (and the eval preview) to `interactive.*` / `disabled.*` — reconciled to
   `filled/outline/text × primary/neutral/destructive`; the v1 HIGH finding (hover-less default button)
   is closed because neutral now carries states. `brand.*`-on-buttons leak removed from the preview.
4. ✅ `field.*` with the Text Field calibration component — the four `field.*` roles (incl. the
   `field.border.rest`/`hover` stateful split) + the three-def field family (`field-label`,
   `field-message`, `text-field`) composing them. **Design + delivered state in §17 below.**

## 17. The `field.*` category (form-element chrome)

Field research (`reference/Prism2` `surface.input.*` / `border.input.*`) shows what a field genuinely
needs that generic roles don't supply — but most of Prism2's input tokens are **already covered
better** by Prism3's generated families and must **not** be duplicated. So `field.*` is deliberately
**minimal**: only the chrome that is genuinely field-specific. Everything stateful is composed from
the existing gated families (per §15: *the field's interaction states come from `interactive.*`*).

**Generated `field.*` roles (four):**

| role | what | contract |
|---|---|---|
| `field.fill` | the field fill — a subtly *inset* neutral so the field reads as an input even before focus | surface (min 0); the value ink `text.primary` clears on it (it tracks the page tier) |
| `field.border.rest` | the resting boundary | **gated `nonTextMin` (3:1 / 4.5 HC) against `background.primary`** — SC 1.4.11. **This is the improvement over Prism2**, whose resting input border sat sub-3:1 and leaned entirely on focus |
| `field.border.hover` | a subtly *stronger* boundary on pointer hover | **gated `secondaryMin` (4.5) against `background.primary`**, and asserted ≥ the rest ratio — a perceptible strengthening, *never the sole state carrier* (KB §4) |
| `field.placeholder` | placeholder / hint ink on the field fill | **gated `secondaryMin` (4.5) against `field.fill`** — a *readable* hint, not the sub-AA placeholder Prism2 (and most systems) ship |

`field.border` is the one **stateful** field slot, nested `rest`/`hover` in the same shape as `interactive.*.fill.<state>` — so the field family stays self-describing rather than borrowing a generic border for hover. All other states still compose (below).

**Composed from existing families — NOT re-authored in `field.*`:**
- **focus** → `border.focus` (already gated 3:1). Prism2 had *no* input-focus token.
- **validation** (error / warning / success field) → `border.{semantic}` + `foreground.{semantic}-subtle` (both already gated). Prism2 reused the shared `border.danger` anyway.
- **disabled field** → the cross-cutting `disabled.{surface,border,text}`. Prism2 had no disabled input token.
- **hover / pressed** → `interactive.*` overlays.
- **filled value ink** → `text.primary`. **inverse** → the generated inverse surface-context (a component concern; no hand-mirrored `field.*-inverse` twins — the thing Prism2 spent the most tokens on).

**Text Field calibration — now a formal field FAMILY (`ComponentDef` ✅).** The Text Field is not one def but a HOST that composes two shared field *parts*, each its own `ComponentDef` reused across the whole form family (Select / NumberField / Checkbox-group later), plus the input-chrome host:

- **`components/field-label.ts`** — the accessible name above the field: `size` {small, medium} + a required/optional indicator + a disabled dim. Binds `text.primary` (label ink), `text.secondary` (indicator), `disabled.text`, and the two `type.label.*` steps. Static top-aligned (the practice default; floating is out of favour).
- **`components/field-message.ts`** — the Prism2 "Helper message" successor: a `tone` axis {default, error, warning, success}, each tone re-pointing **both** caption ink and status icon at the matching semantic role (`text.<role>` + `icon.<role>`) — icon + text, never colour-only (SC 1.4.1 / 3.3.3). Presentational; the host owns `aria-describedby` + `aria-invalid`.
- **`components/text-field.ts`** — the host. Binds **input chrome only** (label/message colour+type live in the parts): `field.fill` · `field.border.rest` (rest) · `field.border.hover` (hover) → `border.focus` + the field focus ring (`focus.ring.offset-field`) → `border.danger` (error — a **border-only** swap; the message carries the text) → `border.secondary` with **full-contrast `text.primary`** (read-only — *not* dimmed; read-only ≠ disabled is the component's live edge) → `disabled.*` (disabled, contrast-exempt) · `text.primary` (value) · `field.placeholder`. Scope is the BASE field: NumberField is separate, Search/Password thin specialisations, email/url/tel stay as `type`+attrs. Validation is presentational (the form library owns timing). The layout-shift-prevention trick (an invisible resting border sized to the focus border) is a **component** detail, not a token.

*Delivered:* the four `field.*` roles (incl. the `field.border.rest`/`hover` split) + the three-def field family (`field-label`, `field-message`, `text-field`) validated against two brands + the eval-preview `input` component rebound (default / hover / focus / disabled) + gates.

---

*Cross-refs: `14` (component-data layer + calibration components), `19` (code library / delivery), `10` (Figma materialisation — the interactive family emits like any colour axis). KB: `components/button.md` (the calibration brief this redesign answers), `components/_schema.md` (§15 shape), `03 §7` (component `.ai.json`). Supersedes the ad-hoc scavenged bindings recorded as findings in `components/button.ts`.*
