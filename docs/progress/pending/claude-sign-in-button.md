## (2026-10-28) — SignInButton: Continue with Apple, Google or Facebook, drawn to each provider's rules, on a literal record (#2343 PR 5)

PR 5 of #2343, stacked on the branded-button helpers (#3122). It follows the proposal on #2343 (2026-10-28) and the owner's decisions the same day: Q-S1 to Q-S12, all A, and Q831 A (all eight pairs ship, on two derived glyphs), which supersedes Q-S5 A's wait for artwork. The owner saw the wireframe before the build started.

### What it is
- **SignInButton** (`packages/engine/components/sign-in-button.ts`) is a Prism3-drawn button for Apple, Google and Facebook.
  - **Axes:** provider × style × size × state. The style axis uses the providers' own names; invalid pairs are excluded with `excludeCoordinates`.
  - **96 members:** 8 pairs × 3 sizes × 4 states.
  - **Its own page:** "Sign-in button", under Components.
- **Every pair ships (Q831 A); the membership stays data (Q-S5 A).** Apple white and outline carry `provider/apple-black`, and Facebook white carries `provider/facebook-blue`. Both are derived from `social/apple` and `social/facebook`, scaled by 23/24 to the provider glyphs' 0.5px inset and centered where their `provider/` sibling sits; shapes and colors are unchanged. A pair is still a member only when the mark set holds its glyph (`makeSignInButton(names)` reads the vocabulary), so a future provider whose artwork is not in yet is excluded, never stood in.
- **The derived glyphs.**
  - Each `provenance.json` record says "derived from social/<name>, scaled to the provider inset" and names `derivedFrom`; `lint-mark-provenance` checks both.
  - **Colors (#3066):** `lint-mark-colors` arm (f) compares each derived file's paints, in order, with its social source file, so the source file is the oracle rather than the record alone.
  - **Geometry:** `lint-glyph-geometry`'s DERIVED arm measures the files. Each derived glyph's body (its first path) spans its `provider/` sibling's ink box within 0.01px (INSET), and every path is its source's under one uniform scale and move (SHAPE). Pure scaling about (12, 12) would leave Apple 0.10px off horizontally and Facebook 0.07px off vertically, because the provider files center their ink box on the artboard; so the derivation also centers it, which moves and never reshapes.
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

### The engine change (Q-S2 A)
- **The literal record.** `ComponentDef.literal` is a record keyed by a template over the projected axes (`{provider}.{style}`). `PartDef.literal` opts a part into it: `'surface'` on a box (fill, edge, `wash[state]`) or `'label'` on a text part (ink, copy, font).
  - The projector writes `literalPaints` (plain hex, bottom to top) and `literalFont` onto the plan, in place of `paints` and `textStyle`.
  - A projected member whose coordinate names no entry throws.
  - The validator refuses: a literal beside the paint grammar, the wrong part kind, a def with no record, an uppercase or malformed color, an opaque wash, a wash at a state the def lacks, a key on an unprojected axis, and a line height under the size.
- **Both executors** write literal paints as unbound solids, and a `#rrggbbaa` color's alpha becomes the paint's opacity. They load the literal font, falling back and reporting when the face is not installed. Each reads the result back by value.
  - The #865 defaults treat a literal channel as claimed.
  - The paste executor splices all of this into a payload only when its plans carry a literal, so every other payload is byte-identical.
  - `anatomy-readback.ts` classifies both fields. `EXECUTOR_REVISION` 41 → 42 (#3132 took 41 on main first).
- **`NestingRelation.variantWhere`**, a joint host-coordinate mapping. Apple white and Facebook white carry different glyphs, so the glyph depends on provider and style together. `variantWhen` maps one axis at a time and rightly refuses one child axis set from two host axes. `variantWhere` requires every entry to name the same host axes, so at most one matches a member. It is refused on an unprojected axis, an unknown value, a repeated `when`, or a `set` axis that `variant` lacks, that `follow` names or that `variantWhen` also sets.
- **The spec model** (`component-specs.ts`, which feeds `specs.json` and the docs page) carries `variantWhere` as `where` and the literal record as `literal`, so the code side gets the provider's values and each member's glyph. The roundtrip's spec read-back resolves `where` like `when`.
- **`lint-paint-placement`** learns literal paint as its own placement kind. It also fails a node that carries both a literal and a bound paint on one channel (arm L).

### Gates
- **Joined:** `lint-hit-target` (INTERACTIVE, SMALL_SIZE), `lint-rung-names` (MUST_COVER, Q1B, ICON_OFFSET_DEFS), `lint-standalone-floor`, `lint-paint-placement`, `lint-absolute-inset` (both lists), `lint-mark-colors`, `lint-axis-values` (new provider and style sets; WalletButton's provider set becomes `canonical`), `test.ts` (TIER 2, BRANDED, the spacing tables and their #325/#326 rules, the type-key grid, the centring register, the default bridge), `CANVAS_FURNITURE`, the taxonomy and the studio catalog.
- **`#2343 PR 5 provider rules`** (`test.ts`). Every value is typed from the providers' guidelines, never read off the def. The arms:
  - ARTWORK: 96 members, all 8 pairs; and (data-driven) 60 over the mark set without the two derived glyphs, each pair mapped to its own glyph
  - COLOR, WASH (the four wash values typed), FONT, WIDTH, PARITY, MARK, WORDING and NAME
  - CONTRAST: Facebook's 4.23:1 is a recorded provider shortfall, not a failure
- **`#2343 PR 5 literal paint`:** the allowlist plus the validator refusals. **`#2343 PR 5 variantWhere`:** that mapping's refusals.
- **`#2343 PR 5 paste executor`** (`test.ts`) and **`sign-in build`, `sign-in build/literal`** (`test-write-components.ts`): the two executors, against typed values.
- **Fault injection, in both executors** (the shims gain `unavailableFonts` on the paste side and `discardLiteralFills` on both):
  - **Font fallback:** with Google Sans refused, the label lands in Roboto Medium 14/20 (typed), the miss `label.font -> Google Sans Medium (…)` is reported, and the member still builds. These are `#2343 PR 5 paste executor font fallback` and `sign-in build/font fallback`.
  - **Literal read-back:** a host that drops the container's literal fill is reported as `container.fills -> DISCARDED (literal … set, not retained)`, by value. These are `#2343 PR 5 paste executor literal read-back` and `sign-in build/literal read-back`.
- **Also joined:** `EXPECTED_ARTIFACTS` / `ci.yml` 224 → 225 (the new docs page), the ecosystem members list, the reaction map (96 members, 48 sources, 72 reactions), the studio's used-by index, component groups and spacing classification. Brand mark's single-consumer page exemption (`STANDALONE_NESTED`) is dropped, because two components nest it now. SignInButton's spacing is per provider, so the studio's set list shows none for it.
- **Baselines accepted:** `lint-component-surface` (sign-in-button: no set → 96; brand-mark 74 → 76), `lint-paint` and `lint-component-renames`. `lint-axis-values`: the style set gains `white` and `outline` (now a superset of the field's `outline`), and the brand-mark name set gains the two glyphs.

### Mutations (each committed first, then restored)
- **Round A, five def mutations, each aimed at a different arm.** Google light's edge to `#757575`, Google's font to 15, `minWidth` to 120, Facebook blue's glyph to `social/facebook`, Apple's continue wording to "Sign in with Apple". Each fails its arm by name (COLOR, FONT, WIDTH, MARK, WORDING); ARTWORK and the paste executor arm also catch the changed values; `lint-component-surface` fails `surface/sign-in-button`.
- **Round B:** the dark pressed wash set equal to hover fails WASH. Exclusions from a hard-coded list instead of the vocabulary fail ARTWORK (data-driven), at 60 instead of 96. The projector's `variantWhere` step disabled fails MARK (Google nests the Apple glyph). The paste executor's literal-fill line removed fails `#2343 PR 5 paste executor`.
- **Plugin executor:** the literal-fill line removed fails `sign-in build` (the executor's own `container.fills -> DISCARDED`) and `sign-in build/literal`.

### Held for the owner (each built as A)
- **Q-S13, the wash.** Built as A: a literal wash, black at 10% and 20% on a light fill, white at 10% and 20% on a dark one (Button's neutral overlay steps). The brand's overlay roles flip with the mode while the provider's fill does not, so a bound wash would vanish on a white button in dark mode. B: bind the brand's neutral overlay roles anyway.
- **Q-S14, Google's gap.** Built as A: 8px. Google's 10px is off the space scale; both sides bind 12. B: a literal 10px gap, which needs a literal spacing field.
- **Q-S15, the Figma wording for Facebook.** Built as A: "Continue with Facebook", per the decision's "Continue with <Provider>". The proposal's Q-S8 text had also said "Login with Facebook". B: "Login with Facebook" in Figma.
- **Q-S16, glyph heights 16/20/24.** Built as A: Button's one-rung offset, as the proposal's §3.2 anatomy drew it. This is an `ICON_OFFSET_DEFS` owner exception in `lint-rung-names`. B: 20/24/32, `md` at medium.
- **Q-S17, code waits on the artwork too.** Built as A: the style prop offers only the styles the design file has. B: the code offers all eight now, without glyphs to draw. Since Q831 A the design file has all eight, so A and B give the same list today; they differ only for a future provider whose glyph is not in yet.
- **Open item:** whether Google Sans may be used outside Google's own assets is unverified (Q-S7). Recorded in the def's `notes`.

### Traps
- **The base moved during this work.** `git fetch --unshallow` (needed for `lint-release-notes`) moved `origin/main` five commits, and a soft reset onto it briefly put PR 1's old-base tree on top of the new `main`. That push would have reverted #3108 and four others. It was caught by diffing the trees, rebuilt as a patch on the new `main` and force-pushed before any PR existed. Compare trees after any fetch that can move the base.
- **The first full verify caught a real gap the unit arms missed.** The roundtrip's spec read-back (#2830) found the code-side spec model naming the Apple glyph on every Google and Facebook member, because `component-specs.ts` did not know `variantWhere`. A new nesting field has three readers, not two: the projector, the validator and the spec model.
- **`test.ts` passes print nothing.** The `#1268` assertion-site arm is what proves every new `ok()` ran.
