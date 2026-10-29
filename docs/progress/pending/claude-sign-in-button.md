## (2026-10-28) — SignInButton: Continue with Apple, Google or Facebook, drawn to each provider's rules, on a literal record (#2343 PR 5)

PR 5 of #2343, stacked on the branded-button helpers (#3122). It follows the proposal on #2343 (2026-10-28) and the owner's decisions: Q-S1 to Q-S12, all A, and Q831 A (all eight pairs ship), which supersedes Q-S5 A's wait for artwork; then, on 2026-10-29, Q-S13 to Q-S17, all A, and Q846 A (one black glyph per provider, painted white on a dark fill). The owner saw the wireframe before the build started.

### What it is
- **SignInButton** (`packages/engine/components/sign-in-button.ts`) is a Prism3-drawn button for Apple, Google and Facebook.
  - **Axes:** provider × style × size × state. The style axis uses the providers' own names; invalid pairs are excluded with `excludeCoordinates`.
  - **96 members:** 8 pairs × 3 sizes × 4 states.
  - **Its own page:** "Sign-in button", under Components.
- **Every pair ships (Q831 A); the membership stays data (Q-S5 A).** Facebook white carries `provider/facebook-blue`, derived from `social/facebook`, scaled by 23/24 to the provider glyphs' 0.5px inset and centered where its `provider/` sibling sits; shape and colors are unchanged. Apple white and outline carry the black `provider/apple` itself (Q846 A dropped the derived `provider/apple-black`, its duplicate after #3134). A pair is still a member only when the mark set holds its glyph (`makeSignInButton(names)` reads the vocabulary), so a future provider whose artwork is not in yet is excluded, never stood in.
- **The derived glyph.**
  - Its `provenance.json` record says "derived from social/<name>, scaled to the provider inset" and names `derivedFrom`; `lint-mark-provenance` checks both.
  - **Colors (#3066):** `lint-mark-colors` arm (f) compares each derived file's paints, in order, with its social source file, so the source file is the oracle rather than the record alone.
  - **Geometry:** `lint-glyph-geometry`'s DERIVED arm measures the files. The derived glyph's body (its first path) spans its `provider/` sibling's ink box within 0.01px (INSET), and every path is its source's under one uniform scale and move (SHAPE). Pure scaling about (12, 12) would leave Facebook 0.07px off vertically (and Apple 0.10px off horizontally, while it was derived), because the provider files center their ink box on the artboard; so the derivation also centers it, which moves and never reshapes.
- **What Prism3's tokens drive:**
  - the height (`size.*.height`, shared, so a stack lines up)
  - Apple's and Facebook's padding and gap, which are Button's and move with density
  - `radius.md`, the 140 width floor and the shared focus ring
  - the brand's label emphasis style, for Apple and Facebook
- **What the provider fixes (literals):**
  - the fill, the 1px inside edge, the label ink and the wording ("Continue with <Provider>", with no text property, Q-S8 A)
  - Google's padding (12 at both sides, fixed)
  - Google Sans Medium 14/20 at every size, with a Roboto Medium fallback (Q-S7 A)
  - the hover and pressed wash, which lies over the fill; the fill itself never changes (Q-S6 A)

- **The dark-fill tint (Q846 A).** #3134 drew `provider/apple` and `provider/facebook` black, so Apple black and Facebook blue would draw a black glyph on black and on blue. Each provider keeps one black glyph, and SignInButton paints it `#ffffff` where its fill is dark.
  - **Engine:** `LiteralEntry.markTint` (opaque `#rrggbb`), read by `PartDef.literal: 'mark'` on a nested brand mark that states `fixedPaint`; the plan carries `literalTint` in place of `fixedPaint`. The validator refuses `literal: 'mark'` on any other part and a translucent or malformed tint.
  - **Both executors** paint every VECTOR in the nested glyph with the tint as an unbound solid, report `mark.literalTint -> … (no VECTOR …)` when there is none, and read it back by value (`… DISCARDED (literal … set, not retained)`). `EXECUTOR_REVISION` 42 → 43 (#3142 took 42 on main first).
  - **`lint-mark-colors` (g), its own by-name gate.** A host may carry `literalTint` only if it is in `TINT_HOSTS` (SignInButton alone) and the mark is a `brand-mark/provider/*` glyph: any other def that tints fails `HOST TINT … only sign-in-button may tint a mark`, and SignInButton tinting a non-provider mark fails `HOST TINT … not a brand-mark/provider/* glyph`. A tint host that tints nothing fails too. (d) is unchanged for every other node: no `descendantFills`, no paint, `fixedPaint` stated.
  - **`Q846 A dark-fill styles draw white`** (`test.ts`): typed from the decision, Apple black and Facebook blue carry `#ffffff` at all 24 members and no other style tints. The contrast arm alone cannot hold this: black on `#1877f2` is about 4.95:1, over 3:1, and Facebook's white-on-blue is a brand rule.
  - **#3142's `provider glyph contrast` arm reads the tint from the plan**, so it judges the painted color: white on black and on `#1877f2` pass, and a dropped tint fails it at 1.00:1. Its review nits are fixed here: the failure line names `brand-mark/provider/apple` (not `provider/provider/`), and a fixture covers a themed fill nested under a literal one (review M2).
  - **Executor arms:** `sign-in build/literal` checks the glyph's vectors read `#ffffff` on the dark fills; `#2343 PR 5 paste executor` does the same through the paste payload, with the provider marks in the stub file, and checks Apple white's and Google's glyph stay untinted.

### The engine change (Q-S2 A)
- **The literal record.** `ComponentDef.literal` is a record keyed by a template over the projected axes (`{provider}.{style}`). `PartDef.literal` opts a part into it: `'surface'` on a box (fill, edge, `wash[state]`) or `'label'` on a text part (ink, copy, font).
  - The projector writes `literalPaints` (plain hex, bottom to top) and `literalFont` onto the plan, in place of `paints` and `textStyle`.
  - A projected member whose coordinate names no entry throws.
  - The validator refuses: a literal beside the paint grammar, the wrong part kind, a def with no record, an uppercase or malformed color, an opaque wash, a wash at a state the def lacks, a key on an unprojected axis, and a line height under the size.
- **Both executors** write literal paints as unbound solids, and a `#rrggbbaa` color's alpha becomes the paint's opacity. They load the literal font, falling back and reporting when the face is not installed. Each reads the result back by value.
  - The #865 defaults treat a literal channel as claimed.
  - The paste executor splices all of this into a payload only when its plans carry a literal, so every other payload is byte-identical.
  - `anatomy-readback.ts` classifies both fields. `EXECUTOR_REVISION` 41 → 42 (#3132 took 41 on main first), then 43 for the tint (#3142 took 42).
- **`NestingRelation.variantWhere`**, a joint host-coordinate mapping. Apple white and Facebook white carry different glyphs, so the glyph depends on provider and style together. `variantWhen` maps one axis at a time and rightly refuses one child axis set from two host axes. `variantWhere` requires every entry to name the same host axes, so at most one matches a member. It is refused on an unprojected axis, an unknown value, a repeated `when`, or a `set` axis that `variant` lacks, that `follow` names or that `variantWhen` also sets.
- **The spec model** (`component-specs.ts`, which feeds `specs.json` and the docs page) carries `variantWhere` as `where` and the literal record as `literal`, so the code side gets the provider's values and each member's glyph. The roundtrip's spec read-back resolves `where` like `when`.
- **`lint-paint-placement`** learns literal paint as its own placement kind. It also fails a node that carries both a literal and a bound paint on one channel (arm L).

### Gates
- **Joined:** `lint-hit-target` (INTERACTIVE, SMALL_SIZE), `lint-rung-names` (MUST_COVER, Q1B, ICON_OFFSET_DEFS), `lint-standalone-floor`, `lint-paint-placement`, `lint-absolute-inset` (both lists), `lint-mark-colors`, `lint-axis-values` (new provider and style sets; WalletButton's provider set becomes `canonical`), `test.ts` (TIER 2, BRANDED, the spacing tables and their #325/#326 rules, the type-key grid, the centring register, the default bridge), `CANVAS_FURNITURE`, the taxonomy and the studio catalog.
- **`#2343 PR 5 provider rules`** (`test.ts`). Every value is typed from the providers' guidelines, never read off the def. The arms:
  - ARTWORK: 96 members, all 8 pairs; and (data-driven) 84 over the mark set without the derived glyph, each pair mapped to its own glyph
  - COLOR, WASH (the four wash values typed), FONT, WIDTH, PARITY, MARK (with the typed tint), WORDING and NAME
  - CONTRAST: Facebook's 4.23:1 is a recorded provider shortfall, not a failure
- **`#2343 PR 5 literal paint`:** the allowlist plus the validator refusals. **`#2343 PR 5 variantWhere`:** that mapping's refusals.
- **`#2343 PR 5 paste executor`** (`test.ts`) and **`sign-in build`, `sign-in build/literal`** (`test-write-components.ts`): the two executors, against typed values.
- **Fault injection, in both executors** (the shims gain `unavailableFonts` on the paste side and `discardLiteralFills` on both):
  - **Font fallback:** with Google Sans refused, the label lands in Roboto Medium 14/20 (typed), the miss `label.font -> Google Sans Medium (…)` is reported, and the member still builds. These are `#2343 PR 5 paste executor font fallback` and `sign-in build/font fallback`.
  - **Literal read-back:** a host that drops the container's literal fill is reported as `container.fills -> DISCARDED (literal … set, not retained)`, by value. These are `#2343 PR 5 paste executor literal read-back` and `sign-in build/literal read-back`.
- **Also joined:** `EXPECTED_ARTIFACTS` / `ci.yml` 224 → 225 (the new docs page), the ecosystem members list, the reaction map (96 members, 48 sources, 72 reactions), the studio's used-by index, component groups and spacing classification. Brand mark's single-consumer page exemption (`STANDALONE_NESTED`) is dropped, because two components nest it now. SignInButton's spacing is per provider, so the studio's set list shows none for it.
- **Baselines accepted:** `lint-component-surface` (sign-in-button: no set → 96; brand-mark 74 → 75), `lint-paint` and `lint-component-renames`. `lint-axis-values`: the style set gains `white` and `outline` (now a superset of the field's `outline`), and the brand-mark name set gains `provider/facebook-blue`.

### Mutations (each committed first, then restored)
- **Round A, five def mutations, each aimed at a different arm.** Google light's edge to `#757575`, Google's font to 15, `minWidth` to 120, Facebook blue's glyph to `social/facebook`, Apple's continue wording to "Sign in with Apple". Each fails its arm by name (COLOR, FONT, WIDTH, MARK, WORDING); ARTWORK and the paste executor arm also catch the changed values; `lint-component-surface` fails `surface/sign-in-button`.
- **Round B:** the dark pressed wash set equal to hover fails WASH. Exclusions from a hard-coded list instead of the vocabulary fail ARTWORK (data-driven), at 60 instead of 96. The projector's `variantWhere` step disabled fails MARK (Google nests the Apple glyph). The paste executor's literal-fill line removed fails `#2343 PR 5 paste executor`.
- **Plugin executor:** the literal-fill line removed fails `sign-in build` (the executor's own `container.fills -> DISCARDED`) and `sign-in build/literal`.
- **Q846 A, the tint** (each committed first, then reset):
  - **Apple black's tint dropped:** fails `Q846 A dark-fill styles draw white` (`tint none, want #ffffff`), MARK, the paste executor arm, and `#3134 provider glyph contrast` (`brand-mark/provider/apple (#000000) over the literal fill #000000 is 1.00:1`).
  - **Facebook blue's tint dropped:** fails `Q846 A dark-fill styles draw white`, MARK and the paste executor arm; the contrast arm passes it (black on `#1877f2` clears 3:1), which is why the white rule has its own arm.
  - **The tint on a light style** (Apple white): fails `Q846 A dark-fill styles draw white` (`tint #ffffff, want none`), MARK, the contrast arm, and the paste executor arm (`glyph tinted … on a light fill`).
  - **A non-provider mark tinted** (Apple black on `social/apple-mono`): fails `lint-mark-colors` (`HOST TINT — … brand-mark/social/apple-mono #ffffff, which is not a brand-mark/provider/* glyph`).
  - **Another def tinting** (WalletButton with a tint record): fails `lint-mark-colors` (`HOST TINT — … only sign-in-button may tint a mark`).
  - **The plugin's tint write removed:** fails `sign-in build` (`mark.literalTint -> DISCARDED`) and `sign-in build/literal`. **The paste payload's removed:** fails `#2343 PR 5 paste executor`.

### Decided by the owner (2026-10-29: Q-S13 to Q-S17 all A, Q846 A)
- **Q-S13 A:** a literal hover and pressed wash, black at 10% and 20% on a light fill and white on a dark one, which does not flip with the mode.
- **Q-S14 A:** Google's 8px gap, with 12px at both sides.
- **Q-S15 A:** "Continue with Facebook" in Figma.
- **Q-S16 A:** glyph heights 16/20/24, Button's one-rung offset (an `ICON_OFFSET_DEFS` owner exception in `lint-rung-names`).
- **Q-S17 A:** code offers only the styles whose artwork is in the design file, all eight today.
- **Q846 A:** provider glyphs may be tinted, inside SignInButton only; see "The dark-fill tint" above.
- **Next:** #3136 (Facebook `#0866FF`) follows this PR.
- **Open item:** whether Google Sans may be used outside Google's own assets is unverified (Q-S7). Recorded in the def's `notes`.

### Traps
- **The base moved during this work.** `git fetch --unshallow` (needed for `lint-release-notes`) moved `origin/main` five commits, and a soft reset onto it briefly put PR 1's old-base tree on top of the new `main`. That push would have reverted #3108 and four others. It was caught by diffing the trees, rebuilt as a patch on the new `main` and force-pushed before any PR existed. Compare trees after any fetch that can move the base.
- **The first full verify caught a real gap the unit arms missed.** The roundtrip's spec read-back (#2830) found the code-side spec model naming the Apple glyph on every Google and Facebook member, because `component-specs.ts` did not know `variantWhere`. A new nesting field has three readers, not two: the projector, the validator and the spec model.
- **`test.ts` passes print nothing.** The `#1268` assertion-site arm is what proves every new `ok()` ran.
