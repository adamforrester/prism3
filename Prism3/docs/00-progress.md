# 00 — Progress & Status Log

> A living record of where Prism3 is, what was decided and why, and what comes
> next — so the work survives context loss and a fresh agent (or human) can pick
> it up without re-deriving anything. Update this when state or direction
> changes. Most recent entry first.

---

## (2026-07-31) — Ceiling and floor become set membership; `compact` was deleting a title rung (#328)

**STATUS: engine + web.** PR A of the #328 typography rebuild. `out/*` regenerated — the entire
behavioral change is **harbor gaining a rung it should always have had**; every other brand moves only
in notes prose, and `nb.tokens.json` is byte-identical (the regression target never moved).

- **The bug, shipping on `main` until now.** `typeScale: 'compact'` silently deleted a title rung and
  left a **gap mid-ramp**: `xs, md, lg, xl, 2xl` — no `sm`. With `titleFloor: 16` it lost `xs` instead.
  `harbor.design.md` uses `compact`, so `out/harbor.tokens.json` shipped a 5-rung title ramp. The
  mechanism is a **size operation feeding a set operation**: compact shifts `title.xs` 18→16, the old
  `Math.max(sizePx, titleFloor)` pushed it back to 18, that collided with the shifted `title.sm`, and
  the monotonic guard resolved the collision by *dropping* one. Nobody chose that; it fell out.
- **Why no gate caught it.** The C1 test asserted `titleFloor: 16` yields a literal 16px `title.2xs`
  under every typeScale — it checked that one rung **exists** and never that the ramp was **complete**.
  Third instance in this cluster of a gate passing while the thing beside it is broken (#281; the
  vacuous weight-union assertion in #337). The new C1b counts the ramp and asserts distinct sizes, so
  the specific failure that shipped is now the thing under test.
- **The design fix that makes the class of bug unreachable.** `displayCeiling` is now a **rung name**
  (`'xl'`), not px. A px ceiling was compared against sizes `typeScale` had already shifted, so the
  same `96` kept 4 display rungs under compact/default but 3 under expressive — **a brand lever
  silently changing the type SET**, the per-mode defect in brand-level clothing. Corroboration that
  this was a known wart: `theme.ts` shipped a runtime note apologizing for it (*"requested ceiling
  Npx; effective top display is Mpx"*), and `web/src/main.ts` rendered the same disclaimer. Both are
  deleted — a rung-named ceiling cannot disagree with what ships. Trimming from the top also means no
  surviving rung is ever renumbered.
- **`titleFloor` is now pure set membership** — 16 includes `title.2xs`, 18 omits it, and it never
  clamps a size. `compact` + `titleFloor: 16` is **rejected** with an actionable message rather than
  silently resolved: compact already places a title at 16px, so `2xs` would duplicate `xs`.
- **The monotonic guard rejects instead of dropping.** `sizePx <= prev` was `continue`; it now throws.
  Dropping a rung is never right — it changes the type SET, which is the one thing the set/size split
  exists to hold stable. This single line covers three cases: the compact collision, the latent
  ladder-end shift collision (`shiftPx` clamps at the ladder ends, so two bases could land on one
  rung), and per-mode inversion when PR C lands.
- **A trap removed, not just a bug.** Five comments invited `typeScale` into `modeLevers`
  (*"typeScale/tempo/density slotting in the same map later"*). That plan was wrong: per-mode
  `typeScale` gives modes different type sets, exactly what this work exists to prevent. Left alone,
  a future agent would have implemented the bug **on the codebase's own invitation**. All five now say
  why `typeScale` is excluded.
- **Migration.** `aurora.design.md` moves `displayCeiling: 128` → `'xl'`, which is byte-compatible:
  128px under `expressive` already resolved to a 4-rung display tier topping at `xl`. Note the old px
  ceiling could zero out the display tier entirely (`displayCeiling: 18`); a rung name cannot, since
  the smallest choice is `'sm'` — one rung. The `dispSizes.length === 0` note survives because an
  unbound display family role still drops the group.
- **Next:** PR B (eyebrow as a heading category, rungs `sm=12/md=14/lg=20` + the title-shaped fluid
  rule), then PR C (the per-mode rung-size axis). Full scope and rationale: #328 comment 5143891943.

---

## (2026-07-31) — `size.*.padding-x-visual`: the label side and the visual side are not the same distance (#326)

**STATUS: engine.** `out/*` regenerated — strictly additive, one new leaf per size step (`60 0` on the
numstat for `nb.tokens.json`: sixty insertions, zero deletions). Artifact count **unchanged at 88**.

**Built stacked on `claude/325-size-gap`, not `main`,** because #338 (#325) was still under review and
both PRs restructure the same `SizeStep` shape and the same size-emit path. Once #338 squash-merged this
was rebased with `git rebase --onto origin/main <old-base>` and re-verified — recorded because a stacked
branch that nobody rebases is how a merge produces a diff nobody wrote, and because GitHub's squash
leaves the old base *not* an ancestor of `main`, so the rebase is mandatory rather than cosmetic.

**The gap.** `size.*.padding-x` was a single number applied to both ends of a control. But an icon's own
bounding box already carries apparent space inside it, so the *same* numeric padding reads as visibly
looser on the visual side than on the text side. Every control with a leading icon was therefore
slightly wrong, and no token existed to say so.

**Three independent systems converge here**, which is what makes it field consensus rather than one
vendor's house style: Material 3 (`leading-space` 24 vs `with-leading-icon-leading-space` 16),
Spectrum (`edge-to-text` and `edge-to-visual` on separate scales), Carbon (a 1px ghost nudge). Nobody
who has built this at scale ships one horizontal padding.

**Two open questions in the issue, both settled empirically rather than by preference:**

*Naming* — `padding-x-visual`, keeping the `padding-x` stem so the pair sorts adjacently in every
consumer that lists tokens alphabetically. `padding-x-icon` was rejected: the distinction is optical,
not "is this glyph an icon", and it applies equally to an avatar or a swatch.

*Ratio, not a fixed step* — Material subtracts a constant 8px. That **collapses at the small end**:
`padX` 8 − 8 = 0, no padding at all. Two-thirds **snapped to the space scale** holds its shape at every
size and every `spaceBase`, and snapping keeps the value ON the scale so the emitted token aliases
`space.*` like its siblings instead of minting an off-scale literal. At lg/comfortable this lands on
**24/16 — Material's own pair, arrived at independently**, which is the reassurance that the ratio
isn't a coincidence of one rhythm.

**The contract is an ordering, not three numbers.** The horizontal model, left edge inward, is
`[padXVisual][icon][gap][label][padX]`, and the whole optical story is one chain:

    gap  <  padXVisual  <  padX

tightest inside the group (proximity, #325), looser where a glyph contributes its own apparent space,
loosest against plain text. **It holds across all 45 cases** (3 `spaceBase` × 3 densities × 5 sizes),
and *that* is what `test.ts` locks — deliberately not the literal values, which would pass just as
happily if the ordering inverted and someone updated the expectations to match.

**Additive, and proven so rather than asserted.** `padding-x` keeps its exact prior meaning and values,
so no existing binding moves. Verified two ways: a test pinning the per-density `padX` ladders, and a
`git stash` diff of the emitted values before/after — identical.

**Tamper-tested (four ways, all bite):** `padXVisual = padX` breaks the chain at every step;
`padXVisual = gap` breaks the lower bound; `+1` off the snap breaks *both* the chain and the space-alias
assertion; and implementing it as a *mutation* of `padX` (the tempting shortcut) fails all three
additive assertions at once. Each tamper also trips the `design.md` byte-identity check, which is the
drift gate doing its job on a live-vs-committed comparison.

**Sequencing, same as #325:** this earns its keep when #327 (anatomy) binds it. Emitted and unbound it
is a loose token, and the honest framing is that #326 exists so #327 has something correct to bind to.

**Verified:** 1042 → **1047** tests; nb-regression PASS; `regen --check` 88/88; web + plugin typecheck
and builds clean.

---

## (2026-07-31) — Font weight primitives are minted from need (#328 items 3+8)

**STATUS: engine.** First of the settled #328 decisions to be built. Every artifact change is a
**deletion** — four dead `font.weight.*` leaves per brand, and the Figma vars that mirrored them.

- **The change is one expression.** `theme.ts` hardcoded `weightsRef: [100…900]` for every brand
  regardless of use; it now emits the distinct values the five weight **roles** actually point at.
  Because `weight-role.<role>` is the only thing that aliases `font.weight.<n>`, the role values *are*
  the complete referenced set by construction — there is no second referrer to miss. The per-mode union
  (`theme.ts:1649`) is unchanged and still layers on top, which is what keeps a mode's deviating numeric
  resolvable.
- **Verified per brand, not in aggregate:** emitted set ≡ referenced set with zero broken aliases for all
  four. The load-bearing case is **Aurora**, which mints `500` where the others mint `600` — it sets a
  custom `emphasis`, so it proves the set is brand-driven rather than a new hardcoded five. A test that
  only ran NB would not have distinguished those two outcomes.
- **The trap this walked into, and why the test changed.** The existing per-mode union test used
  `weights: { strong: 600 }` — but 600 is the `emphasis` default, so once weights are minted from need the
  primitive exists *anyway* and the assertion passes without testing the union at all. It is re-pointed at
  **500**, a value no default role owns, so it now fails if the union is ever dropped. This is the #281
  shape again in miniature: a gate that still passes after the thing it guards is removed.
- **On the fixture deletion — read this before assuming it was wrong.** `fixtures/figma/nb/font.json`
  loses four vars, and the block above it in `test.ts` calls the NB fixtures "the FROZEN real NB Token
  Press export", where `missing === 0` is the byte-repro guarantee. That comment describes the
  **color/palette** fixtures. The numeric 100–900 axis was never New Balance's: the legacy hand-built
  export under `Tokens/New Balance/` has *named* weights (`medium`, `regular`, `book-condensed`) and no
  numeric axis, and the font fixture's composition — 3 family roles + the engine's 22-step ladder + 5
  weight-roles named subtle/default/emphasis/strong/max — is pure engine structure. It is an engine
  snapshot, so it moves with the engine. Anyone re-checking this should verify against `Tokens/New
  Balance/`, not against the comment.
- **Not in scope, deliberately.** Numeric → Figma style-name resolution (`SemiBold` vs `Semi Bold`) stays
  an emitter/plugin problem — #237 resolves against the plugin's loaded-font list, #113 is the open
  research. This change only shortens the list that has to be resolved.
- **Next from #328, in order:** responsive sizing → Layout (item 2, agreed) and leading & tracking →
  semantic tab (item 4, agreed). Items 5/6 remain blocked on the set-shaping → size-clamping
  prerequisite, which has an unresolved sub-decision — see the entry below and #328.

---

## (2026-07-31) — Mode-switcher audit: the decisions live in issues, this is the thread to pull

**STATUS: no code change.** Investigation + decision record. Recorded here because the log is what a
fresh agent reads first, and this cluster has no other entry point.

- **What happened.** "Where should the mode switcher live?" (#268) turned into an audit of what actually
  responds to it, which turned into a typography tier review, which surfaced an engine validation gap.
  The decisions are captured on the issues; this entry exists so they can be found.
- **The measured result** (Light→Dark DOM diff per section, against `12364ab`): **Palettes and Layout are
  fully inert** — the mode bar changes nothing on either. Five of nine pages **mix** responding and inert
  sections (Surfaces, Interactive, Typography, Size & radius, Motion). **Elevation is display-only** and is
  the case #318 explicitly carved out. Full table: the #268 comment.
- **The finding that changes the rule.** Primitive-vs-semantic does **not** predict mode-sensitivity,
  because the UI groups controls by **subject matter, not by tier** — radius, density and tempo re-point
  semantics per mode, but their controls sit on pages named after the primitive. So a tier-based switcher
  rule cannot be derived from the current page structure without relocating controls. A rule keyed on
  *measured mode-sensitivity* works today and survives any later reorganization, since the reorg changes
  the data the rule reads, not the rule. **Page-level placement is settled; the specific treatment is not.**
- **Method note worth keeping: static analysis failed twice, in opposite directions.** Counting
  `currentMode` references per function **under-counts** (delegation hides it — `renderPerModeRadius` and
  siblings read as blind because the access lives in `renderPerModeSelect`). Resolving the call graph on a
  real TypeScript AST **over-counts**: it reported every page as mode-aware, including Palettes, because
  controls call `build()` to re-render, so the graph leaks back through the chrome and everything reaches
  everything. Switching the mode and diffing the DOM answered it in one pass. Don't re-derive this
  statically — it has now been attempted twice and been wrong both times.
- **A second blind spot, from the same week:** a closed dropdown is not in the DOM, so an overflow sweep
  cannot see it — #315 passed 38/38 while a menu sat 152px off-screen. And a 690px nav stack overflows
  nothing at all; it was found by a human on a phone. Green audits mean "no measured defect", not "good".
- **Where the decisions are:** #268 (audit + placement, open) · #328 (typography tier — font roles, weight
  primitives, ceiling/floor, what moves to semantics) · #329 (spaceBase / baseUnit levers) · #332 (invalid
  lever values accepted silently — `typeScale: 'gigantic'` builds a display composite with
  `sizePx: undefined`) · #334 (901–919px ramp-label overflow, pre-existing) · #333 + #267 (carry context
  contributed from this audit).
- **Two engine facts that surprised on inspection**, both now decisions rather than assumptions: all nine
  numeric font weights (100–900) are emitted for **every** brand regardless of use (`theme.ts:915`), and
  `displayCeiling`/`titleFloor` **change which composites exist** rather than only their sizes — so making
  them per-mode would hand different modes different type sets.

---

## (2026-07-30) — The rail becomes a Pages menu below 900 (#144 follow-up)

**STATUS: web-only.** Engine untouched. Owner-directed after reviewing the deploy on a phone; the
alternatives were talked through before any code was written, which is why this entry records the
options not taken as well as the one taken.

- **The number that decided it:** collapsed, the rail was a static stack of nine destinations
  measuring **669–707px tall**, so page content began at **y=834–1013**. On a phone that is below the
  fold on every page load — you scroll past the entire navigation to reach anything. It now starts at
  **y=165–306**. This was the largest remaining responsive problem by a wide margin, and it survived
  #315 because a 690px stack overflows nothing: it is merely bad, and the audit only measured overflow.
- **Four options were weighed; three were rejected for reasons worth keeping.** A *horizontal scroll
  strip* is the intuitive answer and measures badly — the labels total ~880px, so at 393px you see
  about three of nine with the rest invisible, and it forces dropping the subtitles. It also inverts
  with width, becoming genuinely good at 640–900 where ~90% is visible. A *current-page select* has the
  same footprint as a menu and names the page in its closed state, but this app uses selects everywhere
  as **value editors** (`Auto · neutral 950`), so a navigating select sends the wrong signal.
  *Grouping nine into four* (Color / Type / Form / Preview) is the only option that shrinks the problem
  rather than repackaging it, and the rail-note's own ordering already implies those groups — parked as
  the right move **if the nine ever feel like too many on desktop**, since it is an IA change that
  touches every width, not a mobile fix.
- **The strip is blocked on the modes-bar rework, the menu is not** — two stacked horizontal strips
  would compete. That sequencing, not the design merits, is why the menu ships first; the strip is
  worth revisiting when the modes bar moves down and the vertical budget exists.
- **Right placement is nearly free, left is not.** `.bar-actions` is already the positioned containing
  block (from the previous fix), so the panel right-aligns to the gutter with no new positioning code.
  Left-of-logo needs a new positioned container and a **left**-anchored panel — new code, and a fresh
  instance of the bug class just closed. The convention argument for top-left nav was considered and
  overridden: this rail switches editor views of one document, which is closer to a control than to
  site navigation.
- **Nothing the sidebar showed is silently lost.** The panel renders from the same `NAV` data and
  reuses the rail's own `.stage-t` block, so the subtitles come across (they teach what each page is),
  along with the divider before the `view` destination and the ordering note.
- **A CSS-ordering trap, which the first measurement caught:** the base `.navbtn{display:none}` must
  be declared **before** the `max-width:900` rule that turns it on. A media query adds no specificity,
  so placed after it the `display:none` simply wins at every width — the control existed, was correct,
  and never appeared. Worth remembering for any "off by default, on at a breakpoint" control.
- **The audit had to change with the UI.** The page sweep navigated by clicking `.rail .stage`, which
  no longer exists below 900 — it now goes via whichever surface the width exposes. A harness that
  drives the thing it audits has to follow it.
- **Found while verifying, deliberately not fixed here:** a **pre-existing** ~10px overflow in the
  narrow 901–919px band, where the sidebar is back but the content column is too tight for the ramp's
  hex labels. Confirmed against unmodified `main`, so it is not from this change and is a separate
  concern — the `≤900` narrow-tier label rules stop just below it.
- **Verified** at 320/360/393/480/640/900/901/1280: exactly one of rail / Pages control visible at every
  width, panel fully on-screen with all nine destinations and the current one marked, single row
  throughout, zero overflow, no console errors. Page sweep 38/38; bar-menu and resize-grip checks
  unchanged; both surfaces typecheck and build.

---

## (2026-07-30) — `size.*.gap`: the token that answers "why not just use spacing?" (#325)

**STATUS: engine.** `out/*` regenerated (additive — one new leaf per size step); artifact **count
unchanged at 88**, so `ci.yml` needed no bump.

**The gap.** `size.*` carried `height` / `padding-x` / `padding-y` and nothing for the space between a
leading visual, the label, and a trailing visual — so a Button with an icon had no token for the one
measurement that makes it read as assembled rather than crammed. `preview.ts` sidestepped it by not
modelling slots at all.

**This was filed as a task and re-opened as a design question, correctly.** The owner's hesitation:
*"many design teams using this will find it confusing and want to just use standard spacing variables
for everything, and then you'll have some things as gaps and others as generic spacing."* That is the
real failure mode for component-scoped spacing, and it is also exactly the live disagreement in the
field — Spectrum ships a dedicated `text-to-visual-*` scale, Material a named `icon-label-space`,
**Carbon just uses `$spacing-03`**.

**What resolved it was structural, not rhetorical.** The component tier does not mint values — it
ALIASES the space scale (`size.md.padding-x` → `{space.200}`). So `size.md.gap` is `{space.100}`: a
named pointer into the scale the team already uses, not a competing 8px. A team that "just uses
spacing variables" is using the same variable either way; the token only says WHICH one belongs here at
this size. And the precedent was already accepted — nobody hand-picks `size.md.height`, the component
does, which is why that tier has never caused the confusion feared here.

The corollary, recorded because it governs sequencing: **the token earns its keep only once a component
binds it.** Emitted and unbound it IS the loose duplicate the owner described. It should land with or
just before #327 (anatomy), not sit unconsumed.

**Derivation: half the horizontal padding**, which encodes proximity rather than taste. Everything
inside the control must sit closer to its neighbours than to the control's own edge, or the icon and
label stop reading as one unit and start reading as two things sharing a box. So **`gap < padX` is the
contract and the exact fraction is a tuning knob** — that inequality is what `test.ts` asserts, across
every size × density × spaceBase, rather than the literal numbers. Half rather than a third: a third
rounds to 2px at the smallest step, which is a rendering accident, not a gap. Result at the default
rhythm: 4/8/8/12/12 → `{space.050/100/100/150/150}`, every value already a step on the scale.

**Rides the per-mode density seam** like padding does, so a mode at a different density re-derives its
ladder and its gap moves with it rather than freezing at the base value.

**A stale constant found on the way.** The Figma↔DTCG cross-check computed the expected `size`
variable count as `Object.keys(brand.size).length * 3` — *"3 props per t-shirt"*. Adding a fourth made
it report a Figma/DTCG mismatch that was really a stale expectation. Replaced with a count derived from
the tree, so the next sub-leaf is covered automatically rather than re-teaching the same lesson.

**Tamper-tested:** setting `gap = padX` fails the proximity contract at every step; a constant 8px gap
fails both proximity AND the non-constant bar the issue set itself (*"visibly proportionate across the
sizes, not a constant"*) — which is the precise failure the owner's objection predicted, so it is worth
having a test that names it.

**Filed upstream:** knowledge-base#6 — the vault asserts the container *"owns the gap"* and takes no
position on what governs its value, which is conspicuous next to `icon.md`'s detailed optical metrics.
The Spectrum/Material/Carbon divergence is a genuine practice question with no house answer; the
decision here was made on engine-shaped grounds and does not substitute for one.

**Verified:** 1034 → **1042** tests; nb-regression PASS; `regen --check` 88/88; web + plugin typecheck
and builds clean.

---

## (2026-07-30) — `icon.size.*`: the tier that is deliberately not parametric (#324)

**STATUS: engine.** `out/*` **regenerated** (new category); artifact count **85 → 88** (one
`figma/<brand>/icon.json` per emitting brand) — `.github/workflows/ci.yml`'s coverage assertion
bumped in the same PR, as its own comment requires.

**The gap.** There was **no `icon` category in the emitted tree at all**, so a component's
`leadingVisual` / `trailingVisual` slot had nothing to bind for size. `components/button.ts` binds ~60
token slots and could not bind an icon dimension. Of the three gaps in docs/28 §3, this is the one that
stopped the Button Figma round-trip outright rather than degrading it.

**What shipped.** `icon.size.{xs,sm,md,lg,xl}` = **16/20/24/32/40**, each an ALIAS into
`dimension.<px>`, plus a matching Figma `icon` variable collection.

**The issue asked for a DERIVED scale; the field research says the opposite, and the research won.**
KB `components/icon.md` §2 is unusually firm: *"The field standardises on a small fixed set — 16/20/24
(Carbon adds 32; Atlassian 12/16; Polaris 20) — and PROHIBITS arbitrary sizes. Off-grid scaling is the
first thing an icon system must forbid."* And on the API: *"`size` — ENUMERATED (sm/md/lg), mapping to
the fixed pixel grid, NOT arbitrary integers."* A brand-variable ramp would break the rule the research
exists to state. The obvious alternative was checked and is illusory anyway: the `typeScale` lever
*"shifts heading sizes; body/label/caption stay put"*, so a type-derived icon size would be constant —
derivation in name only.

So "derived, not copied" was re-read as being about **structure, not variability**: every step aliases
the dimension grid rather than carrying a literal, which is what makes this a tier instead of five
magic numbers — and that is the property the tests assert.

**The 5th step came from review.** Owner asked whether a 40 top end would hurt. It doesn't, and it
fixes a mismatch: 16/20/24/32/40 pairs **1:1** with `componentSizes`' xs…xl (32/40/48/56/64), so the
anatomy layer (#327) maps control size → icon size by identity instead of reconciling a 4-step scale
against a 5-step one. The ratio is 0.5 through `md` and eases to 0.57/0.63 above — deliberate; a 64px
control with a 32px glyph reads sparse. The KB's icon-vs-illustration line is about NARRATIVE content
(*"larger, narrative, its own component"*), not a pixel threshold, so 40 is still an icon.

**Invariant across mode AND density**, so it stays a primitive under #296 and carries no `modes`
overrides. Density is the live risk — it shifts `size.*`, and icon size co-varies with control size, so
it is the change someone would reasonably make; it is exactly what would push glyphs off 16/20/24.

**A dangling-alias trap, pre-empted.** The icon ladder is fixed, so at a non-default `baseUnit` (6, 8)
it lands OFF the grid and `icon.size.<k> → {dimension.<px>}` would dangle — #274's exact shape.
`buildDims` feeds icon px into the grid extras, the same fix space uses, and a `baseUnit: 6` brand is
in the test matrix specifically to cover it. At the default `baseUnit` 4 they are already grid members,
so nothing else moves.

**Figma included deliberately, though the issue scoped "token tier only".** The issue's own
justification is that the spike has *"no value to `setBoundVariable()` against"* — a DTCG-only token
would have left that blocker standing. `icon` is its own collection rather than a `size/` sub-branch:
an icon size is chosen independently of its control (a compact button can carry a large glyph), and the
Figma scopes differ (WIDTH_HEIGHT only, no padding sibling). Collections contract 8 → 9.

**Tamper-tested**, because a test that only restates the emitted px passes just as happily when the
tier stops aliasing: emitting literals fails the derivation + resolution assertions (9 failures);
making icon size follow density fails the invariance assertion.

**Verified:** 1015 → **1034** tests across nb / aurora / harbor / baseUnit-6; nb-regression PASS;
`regen --check` 88/88 byte-match; web + plugin typecheck and builds clean.

---

## (2026-07-30) — `solid-tint` gets a real token (#288)

**STATUS: engine + web.** `out/*` **byte-identical** — the default is `overlay-neutral`, so nothing
moves unless a brand opts in. Only `schema/lever-manifest.json` changes, and only its prose.

**The defect.** `outlineInteraction: 'solid-tint'` was selectable and emitted **nothing, for any brand,
ever** — behaviourally identical to `none`. Its own doc comment claimed it reused
`foreground.<color>-subtle`, but that role is only emitted for the five fixed `SEMANTICS` names
(brand/success/warning/danger/info), never keyed by an interactive COLUMN name. Those are different
naming spaces: `interactive.primary` follows `roleToPalette.action`, which for aurora is `accent`, not
`brand`. Surfaced as "the Opaque subtle tint option appears empty" in dashboard triage.

**The fix.** A `solid-tint` sibling branch to `overlay-neutral` in `modes.ts`, emitting
`interactive.<column>.subtle-fill.{hover,pressed,selected}` — an opaque step of the column's OWN
palette, so a destructive outline hovers red-tinted rather than gray. (Name follows the issue's own
suggestion; it is the first published shape, so it is the cheapest thing to change if a better one
appears.)

**Two constraints pull opposite ways**, and both are gated rather than assumed:

1. the tint must be **distinguishable from the page**, or the hover is invisible and the lever is inert
   — the failure this repo has now hit three times (#288 itself, #305, pre-#297 leading);
2. the control's label must **stay legible on it**.

**Pairing each tint with the ink of the SAME state is what makes both hold at once.** `iText` already
walks hover/pressed toward more contrast, so a darker pressed tint meets a stronger pressed ink and the
ratio IMPROVES rather than degrading. Measured across aurora + harbor x light/dark x primary/destructive:
worst ink-on-tint **4.90:1** (AA), worst tint-vs-page **ΔE00 5.81** (clear of the ~2.3 bar).

**The nominal step is not trusted to generalise.** It is a starting point; the pick then WALKS TOWARD
THE PAGE until the state's ink clears the text minimum. That walk is load-bearing, not defensive
decoration — tamper-testing it (take the nominal blindly) fails on the extreme brands: near-black
destructive at **4.03:1** and hot-yellow primary at **4.09:1**, both sub-AA. Two example brands would
have shipped a broken contract for real ones.

**`against` runs the other way here, deliberately.** It normally names the surface a role sits on, but
this role IS the surface; the tint is the variable being chosen and the ink is already fixed by
`iText`. So the published promise is "this tint keeps its own state ink legible", and the ink is what
it is measured against. Called out in the code so it doesn't read as a mistake.

**Two false statements removed** — both would have outlived the bug: the lever `description` still said
`solid-tint = opaque foreground.<color>-subtle` (the claim that caused this), and the dashboard still
carried "Opaque subtle tint has no token yet". The section blurb is now method-aware too; pointing at
the Overlay wash row under solid-tint would be the same species of wrong answer as the empty swatch.

**Verified:** 1009 → **1015** tests, including the contract and the visibility floor across **5 brands**
(nb, aurora, harbor, near-black, hot-yellow = 180 roles); `regen --check` 85/85 byte-match;
nb-regression PASS; Playwright confirms the three methods now render distinctly — overlay
`rgba(0,0,0,0.1)`, solid-tint opaque `rgb(204,222,233)` (aurora accent 100), none transparent.

**Author control over WHICH tint** — asked for during review, and it needed no new engine concept.
The `overrides` layer (A1) is generic over emitted roles, so the moment `subtle-fill` became a real
role it was already overridable; verified by probe before claiming it. The gap was UI-only, so the
Interactive page gained a `Subtle tint` row mirroring `Overlay wash`, self-hiding by method the same
way (each returns null when its role is absent, so exactly one is ever shown). Its step picker is bound
to the COLUMN'S OWN palette, not the neutral one the overlay row uses — picking which step of its own
ramp a control hovers to is the point of the method.

**The contract survives the override, and that is a consequence of the inverted `against`.** Overrides
apply-but-warn by design. Because the role is measured against its state ink, an author pick that costs
legibility is caught: `accent.200` warns at 3.76 < 4.5, `accent.400` at 2.04 < 4.5. Had the role been
gated against the page instead — the obvious choice — the warning would have checked the wrong thing
and a hand-picked unreadable tint would have passed silently. The row surfaces that verdict inline
rather than leaving it in an engine warning the designer never sees.

**Should the picker BLOCK a failing choice?** Asked in review; answered no, and the reasoning is worth
keeping because it is not obvious. A UI block would be **false assurance** — the same override is
authorable through `design.md`/`BrandInput`, which the engine accepts with a warning, so refusing the
option hides the capability from one surface without protecting the artifact. Only the engine can
guarantee, and the repo already has two deliberate and DIFFERENT precedents for that: the override
layer *warns and applies*, while the fill anchor *clamps to the nearest passing step and says so*.
Picking one for `subtle-fill` alone would make it behave unlike every other override, so the real
question — should the override layer clamp rather than warn? — is filed separately (#320) to be
answered once, layer-wide.

What landed instead is **pre-emptive marking**: contrast-gated override pickers show which steps satisfy
the role, so the problem is visible BEFORE the pick rather than only after. Applied at
`roleSourceSelect`, so every override picker gets it, not just this row. Contrast is symmetric, so one
comparison serves both directions — a role that IS a surface (`subtle-fill`, measured against its state
ink) and one that sits on a surface use the same formula.

**Marks the PASSING steps, not the failing ones** — and the first cut had it the other way. On a subtle
tint only 4 of 21 steps clear the label, so flagging failures put a warning on 17 of them: accurate and
useless, since a list that is nearly all warnings reads as noise rather than guidance. Owner called it
("17 of 21 is why I was considering limiting options"); inverting keeps the same information and makes
the short list the signal. **Auto carries the mark too** — it is the engine's contract-satisfying pick,
so leaving it bare in a marked list would make the one guaranteed-good option look like the failures.
The label states the number (`✓ 4.5:1`) rather than a bare tick, because the minimum is 4.5 for text
and 3 for non-text and a tick alone would hide which bar was cleared.

The helper returns undefined — not a no-op marker — when there is no contract to judge (`min` 0, role
absent, `against: self`). Under inversion that distinction is load-bearing: within a picker either
NOTHING is marked or the passing steps are, so an unmarked option is never ambiguous between "fails"
and "wasn't judged".

**Out of scope, still open:** nothing. #288's own "out of scope" note deferred the dashboard wiring,
but leaving it unwired would have kept the reported symptom on screen, so it is included.

---

## (2026-07-30) — #296 closes by NARROWING, not by tiering shadow (#301)

**STATUS: engine (source-only).** Zero artifact change — `regen.ts --check` 85/85 byte-match, alias
counts unchanged (872/871/865). Closes #301 and, with it, **#296** — the mode-invariance arc that ran
through #294 (leading/tracking) and #300 (motion).

**The decision.** Shadow was the last entry in what the guard called a "migration ledger", with "an
empty list is the finish line". It does not get a primitive tier. The invariant is amended instead:

> A **terminal composite** — one that neither references a primitive nor is referenced by anything —
> MAY swap raw sub-values per mode.

**Why, from evidence rather than preference.** The #301 spike aliased one field of one shadow layer at
a real primitive and walked every consumer. A `shadow` leaf's `$value` is an ARRAY OF OBJECTS, and
**no consumer resolves an alias inside it**:

| Consumer | Result | Exit |
|---|---|---|
| alias gate | ✅ sees it (872 → 874) | 0 |
| `emit-figma` | ❌ `radius: 0` — `pxToNum` NaN → `\|\| 0` | **0** |
| plugin `write-plan` | ❌ same, and it WRITES INTO FIGMA | 0 |
| `resolve-preview` | ❌ raw `{…}` into `box-shadow` → invalid CSS, shadow vanishes | — |
| `visualize` | ❌ raw `{…}` leaks into `tokens.html` | 0 |

Three exit 0 while emitting a wrong artifact. So tiering shadow is not "~80 tokens plus naming" — it is
~80 tokens **plus a nested-composite alias resolver in four consumers, one of which mutates a real
Figma file**, to buy mode-invariance on tokens nobody consumes individually (designers reach for
`shadow.md`, never a raw blur). Motion was cheap because it re-points a top-level `$value` string every
consumer already resolved; shadow is not the same shape of change.

**The exemption has teeth.** `TERMINAL_COMPOSITE_EXEMPTIONS` is not a pass-list — "terminal" is
**re-derived from the tree every run**. If a shadow leaf ever gains an alias, or anything ever aliases
into shadow, the premise is false and the test fails, naming the offending path and saying *re-decide
the exemption*. Plus a presence check, because a renamed group would make both directions vacuously
true. All three tamper-tested: an outgoing alias, an inbound alias, and removing the exemption
(which correctly re-exposes all 7 shadow leaves as violations).

**Revisit trigger, recorded so it isn't inherited as permanent:** if #305's tint work makes shadow
values expressive enough that consumers want to re-point them, that is the moment to revisit — not the
mere existence of the exemption.

**Also fixed: a latent alias-gate hole (#281's shape).** The gate validated aliases in a composite's
light `$value` array but **not** in `$extensions.prism3.modes.<mode>` arrays — that branch read only a
string `$value`, and per-mode composite values are arrays. So the light half of a leaf was validated
while its per-mode half was not: a future composite tiering would have shipped dangling per-mode refs
with the gate reporting clean. Nothing puts aliases there today, hence zero artifact change.

**The M-11 counter had the SAME hole**, and that is the more interesting half: the independent counter
that exists to cross-check the gate read only a string `$value` too. Two implementations of "count the
refs" sharing one blind spot agree — for the wrong reason. Both were fixed together so they match by
construction rather than by coincidence.

**Verified:** 1006 → **1009** tests; `regen.ts --check` 85/85; nb-regression PASS; web + plugin
typecheck and builds clean; alias counts unchanged, confirming source-only.

---

## (2026-07-30) — The top bar on mobile: one row, and menus that stay on screen (#144 follow-up)

**STATUS: web-only.** Engine untouched. Found by the owner on the live deploy after #315 shipped —
worth noting the finding came from *using* the thing, not from the audit that passed it.

- **A closed dropdown is not in the DOM, so an overflow sweep cannot see it.** #315's 38 green checks
  were real but blind: the brand menu opened ~152px off the left edge at every width below 640, and
  nothing measured it because the panel only exists while open. **The menu audit now opens each one.**
  Generalises past this PR: any conditionally-rendered surface — dropdown, modal, popover, toast — is
  invisible to a static sweep and needs its own pass.
- **Both the before and after states were broken, differently.** The panels are anchored `right:0` to
  their own wrapper, which is only safe while that wrapper sits at the viewport's right edge. #315 made
  the bar wrap so it stopped overflowing, and that moved the actions LEFT, taking the right-anchored
  panel off-screen. Before #315 the panel was nominally on-screen, but the bar itself overflowed 252px
  at 360px wide — so the button that opens it was unreachable. Measured both, rather than assuming the
  regression was purely mine.
- **Right-aligning the row was necessary but not sufficient**, which only showed up on re-measurement:
  the brand button is not the rightmost item, so its panel still began ~122px short of the edge and hung
  9px off at 360px. The wrappers drop to `position:static` so the actions ROW becomes the containing
  block, and both panels align to the one edge that is always flush with the gutter.
- **"Fits by one pixel" is not a fit.** Full labels need ~455px against 456 available at 480px. Below
  560 the "Theme studio" descriptor and the "Export" word are dropped — the ↓ and caret stay, and an
  `aria-label` carries the accessible name — which takes the row to ~278px and holds a single line down
  to ~312px of viewport. **Icon-only Export alone was not enough below 430px**; the owner sanctioned the
  icon change, and the descriptor had to go with it to actually reach one row.
- **The Export word is a nested span with the space inside it**, so wide layout still renders
  `↓ Export` byte-identically — splitting it into sibling spans would have added a 9px flex gap and
  quietly changed the desktop bar.
- **Verified on the web build specifically** — the plugin bundle carries an extra "Apply to Figma"
  button, so its bar is wider and measuring it would have overstated the widths for the deploy that
  actually has the bug. Menus fully on-screen and one row at 360/393/430/480/640/900; desktop unchanged
  (`.barbtn-lab`/`.studio` still inline/block at 640+, export 112px there vs 57px at 393). The #315
  responsive sweep still 38/38 with 0 console errors, grip checks still pass, both surfaces typecheck
  and build, `regen.ts --check` 85/85, `test.ts` 1006/1006.
- **Deliberately untouched:** the modes bar. It is due a revamp or relocation, so tightening it now
  would be work thrown away — the opportunity to improve it on mobile rides with that change.

---

## (2026-07-30) — Narrow viewports: the collapse rule never clamped (#144)

**STATUS: web + plugin.** Engine untouched, `out/*` unchanged. Closes #144; landed as PR #315.

- **The bug was the collapse rule, not the gutters** — which is why bumping the plugin window (#143)
  only masked it. `.shell` uses `minmax(0,1fr)` for its second column at desktop, but the `≤900px`
  override dropped to a bare `1fr`, and **a grid item's automatic minimum is min-content**, so the
  track never clamped. Measured at a 480px viewport: `.shell` itself was correctly 400px while *both*
  its children were 626px. Restoring the idiom fixes the bulk of the overflow at every width below 900.
- **Baseline was measured on `origin/main` before anything was touched** (the #307 discipline): 186px
  overflow / 285 clipped elements at 480px, 26px / 19 at 640px. The owner's independent re-measurement
  landed on 186/283 and 26/19 — close enough to treat the harness as trustworthy.
- **A trap for anyone re-verifying this later, found by the owner:** reverting *only* the
  `.shell{grid-template-columns}` line while keeping the rest of the narrow tier **does not reproduce
  the overflow** — the gutter/hero/table fixes independently keep content narrow enough. The bug only
  reproduces against the genuine pre-PR baseline. A partial revert will read as "there was never a bug
  here," which is exactly the wrong conclusion.
- **Sweeping every page mattered, and nearly didn't happen.** After the first fix the landing page
  measured clean at all four widths while **Interactive and Layout were still failing** — a single-page
  check would have shipped the regression. The audit covers 9 rail pages × 480/640/900/1280 plus dark.
- **Two things genuinely do not fit 456px and are handled rather than shrunk.** Ramp hex read-outs need
  ~45px × 10 steps against ~406px available, so below 480 the hex is dropped and the step number kept —
  labels stay 1:1 under their swatches, because a ramp is a continuous scale and wrapping or scrolling
  the row destroys the alignment that makes it readable. **This is an information tradeoff, flagged as
  vetoable at review and not vetoed.** The contrast + breakpoint tables become their own scroll boxes;
  `.ctable` was the worse of the two because it was *silently clipped by an ancestor* rather than
  pushing the page, so its cells were unreachable rather than merely off-screen — an overflow that no
  page-level scrollWidth check would ever have caught.
- **Plugin half:** a corner grip posting a new `resize-ui` over the existing typed bridge. `commit`
  splits the drag from the write — every pointer-move resizes so the window tracks the pointer, only
  pointer-up persists, so a drag is one `clientStorage` write rather than a hundred. **The clamp lives
  on the main thread, not the UI** (the UI does not get to decide the minimum usable size; 380×420).
  Boot restore reopens at the last size; `clientStorage` is async and `showUI` is not, so the window
  opens at the default and resizes a tick later — awaiting storage first would trade a visible resize
  for a visible delay.
- **A runtime host check does not tree-shake.** The grip was first gated on `commit.isFigma` with a
  comment asserting esbuild would drop it from the web bundle. It did not — esbuild cannot see through
  the call. Re-gated on the `PRISM3_HOST` define (which `write-adapter.ts` already calls *"the single
  BUILD-TIME swap point"*) and **verified by grepping both bundles**: `setPointerCapture` 0× in
  `web/dist/main.js`, 1× in `plugin/dist/ui.html`. The lesson generalises past this PR — `isFigma` is
  for *behaviour*, `PRISM3_HOST` is for *what ships*.
- **Not verified, stated rather than papered over:** the main-thread half (`figma.ui.resize`, the
  `clientStorage` round-trip) is typechecked but never live-driven — that needs the Desktop Bridge,
  down per #237. The UI half was driven for real: 10 live drag messages, exactly one commit, and no
  resize on hover after release.
- **Verified:** responsive sweep 38/38 clean with 0 console errors, re-run on the post-merge head after
  #314 landed in the same file (its new shadow-tint UI measures clean at narrow widths unaided);
  `test.ts` 1006/1006; `regen.ts --check` 85/85; nb-regression PASS, ΔE00 1.95 unchanged; both surfaces
  typecheck + build clean; `plugin/dist/main.js` still 0 `node:` builtins.

---

## (2026-07-30) — Shadow tint becomes perceptible (#305)

**STATUS: engine + web.** `out/*` **regenerated** — aurora/harbor/wendys shadow values change; **NB is
byte-identical** (it ships `tint.amount: 0` → pure black, so nothing moves and the NB regression is
untouched).

**The defect.** Owner reported the shadow tint hue/amount sliders as having no visible effect. They were
wired correctly and did change the emitted tokens — but the effect was **below perceptual threshold**.
Shadow alphas run 10–14%, so a hue shift on a near-black composited over a light surface moved
**~1.0–1.5 ΔE00 across the lever's ENTIRE range**, under the ~2.3 "just noticeable" bar. Third instance
of the same class in this repo (after `solid-tint` #288 and pre-#297 quantised leading): a control that
is *expressible* but has no perceptible effect. That trains distrust of every other control on the page.

**Why the obvious fix doesn't work.** Holding lightness and raising chroma cannot help: sRGB's chroma
ceiling at `l 0.13` is 0.023 (cyan) to 0.066 (blue) — essentially the flat `0.05` already in use.
Chroma capacity is a function of lightness, so **L has to rise with `amount`** for the hue to have
anywhere to go.

**New curve** (`theme.ts` `buildShadow`): `l = 0.13 + 0.17 × amount`, `c = maxChroma(l, hue) × amount`.
So `amount` now means "how far toward as-chromatic-as-this-dark-can-be", and the result is always in
gamut. `amount: 0` still returns exactly pure black (the NB dialect).

**Measured** at a mid-ramp 12% alpha over white, swept at 5° (spot-checking three hues is what produced
three wrong numbers in the first draft — the sRGB chroma floor is at yellow-green, not at either end):

| | before | after |
|---|---|---|
| worst-hue tint visibility @ amount 1.0 | ~0.6–1.5 ΔE00 | **2.88** (h≈70; warm/blue reach 3.8–4.6) |
| default (amount 0.15) drift | — | 0.86 ΔE00 (under the ~1.0 JND → invisible, but artifacts DO change) |
| shadow presence vs pure-black @ max tint | — | −8% … **+59%** |

0.17 is the smallest coefficient at which **every** hue clears 2.3; at 0.13 the worst hue stalls at 2.28.

**Two consequences, deliberately not hidden.** (1) A tinted shadow reads more *present*, not only more
coloured — inherent, since a saturated dark differs from white more than black does at equal alpha;
removing it would mean lowering alpha as tint rises, and alpha encodes elevation. (2) The default is not
byte-identical to the old curve.

**Web.** The Elevation editor gained a tint read-out beside the sliders: the base colour at 100% next to
the same colour at 12% over a checkerboard, plus a note explaining that shadows paint it at 10–14% so
the ramp reads subtler than the swatch. It refreshes **imperatively** (`refreshTintReadout`) — the
shadow editor lives in the doc-26 stable head, so the first cut computed its colour at construction and
froze. A browser check caught it; the fix for an inert control had itself shipped inert.

**Guarded.** `test.ts` locks the perceptual OUTCOME, not the formula — coefficients may be retuned, but
max tint must stay ≥2.3 ΔE00 on every hue (swept 15°), `amount 0` must stay exactly black, visibility
must rise monotonically above amount 0.3, and every base must be in sRGB. Tamper-tested: restoring the
old formula fails the guard at 0.59 ΔE00. 998 → **1004** tests.

**Not done here:** #301 (whether shadow gets a primitive tier) is a separate, still-open decision — the
spike found nested aliases in a `shadow` array are unresolved by every consumer and fail silently, so
tiering is not the cheap change it looked like. See #301 for the evidence.

---

## (2026-07-30) — US English actually completes (#302, #310) — and the log entry that broke it

**STATUS: web + engine.** `schema/lever-manifest.json` regenerated; `out/*` untouched. Closes #302
(PR #309) and #310 (PR #311), alongside #308 which added the #260 entry below. The standard is now
written into `CLAUDE.md` so it stops being re-derived from this log.

- **The root cause was a false claim in this very file.** The #164 entry (2026-07-17, far below) records
  that #162 applied US English *"across all visible UI text (main.ts + **lever labels/descriptions**;
  the token-`$description` prose that emits into out/\* is a separate deferred pass)"*. The parenthetical
  is wrong: **lever labels and descriptions were never touched.** Ten UK spellings sat in `levers.ts`
  from #162 until #311 today. Correcting here rather than editing the old entry, per this log's habit of
  recording corrections forward (cf. *"I filed #296 wrong and rewrote it"*).
- **That one sentence propagated for five months.** #260 was filed carving `levers.ts` out as
  already-covered *because the log said so*; #302 was scoped to `main.ts` alone for the same reason; and
  #302's own list then under-counted its own file. Four consecutive passes each inherited the previous
  one's assurance instead of re-checking. **The lesson is narrow and worth keeping: a completion claim in
  this log is a claim, not a receipt.**
- **What actually landed:** six string literals in `web/src/main.ts` (#309) — one of them, the Wireframe
  modes-menu tooltip, absent from #302's list — and ten in `Prism3/engine/levers.ts` (#311), two of which
  (`generalised`, and the `leverGroups` label `'Colour'`) appeared in *no* prior list.
- **The two methods that finally worked**, both cheap, both worth reusing: **scan patterns, not word
  lists** (`-is(e|ed|es|ing|ation)` and `-our`, then filter false positives like *source*/*precise*) —
  a fixed list of `colour|grey|behaviour` missed `generalised` three times running; and **grep the built
  bundle, not the source** — that is what revealed `levers.ts` prose is inlined into `web/dist/main.js`
  and therefore renders as live dashboard controls, which is what #260 had classified as artifact-only.
- **A correction to my own correction.** #310 was filed claiming the `leverGroups` `'Colour'` label
  renders as a dashboard section heading. It does not — `leverGroups` is **tree-shaken out of the web
  bundle entirely** (sibling label `Form factor`: zero occurrences in `web/dist/main.js`); the dashboard
  hardcodes its own sections. The fix stands on different grounds: `leverGroups` *is* emitted into
  `schema/lever-manifest.json`, the published contract any manifest-driven host renders from.
- **Deliberately still UK-spelled:** `Prism3/schema/theme-schema.json` (19 hits). It is **hand-authored,
  not emitted** — `regen.ts:51` splits `schema/` into emitted files it owns and hand-authored contracts
  it does not touch — so no regen will ever fix it and whether hand-authored contract prose follows the
  standard is an open call, not an oversight. `preview-spec.json` and `example-brands.json` are clean.
  Code comments and identifiers remain exempt, as every pass since #162 has held.
- **Verified:** 1000/1000 engine tests; `regen.ts --check` 85/85 byte-match; nb-regression PASS, aggregate
  ΔE00 **1.95 unchanged**; 432/432 mode contracts across all three brands; web + plugin `tsc` and builds
  clean; and on merged `main` the shipped bundle contains zero UK spellings in **UI-facing** string
  content — the split that motivated this (`subtle · light gray` in one control, `Subtle (light grey)`
  in another) is closed at both ends. *(Corrected at review: an earlier wording here said "zero UK
  spellings in string content" flatly, which is not literally true — thrown `Error(...)` templates such
  as `theme.ts:1339` and `color.ts:151` do ship in the bundle. They sit inside the carve-out this whole
  series made deliberately, so it was loose wording rather than a missed gap — but this entry is about
  a completion claim that outran its evidence, so it does not get to make one of its own.)*

---

## (2026-07-30) — US-English pass on emitted `$description` prose (#260)

**STATUS: engine.** `out/*` **regenerated** (prose-only — zero `$value`, alias or structural change).
Resolves #260; landed as PR #306.

- **The scope boundary came from `regen.ts`, not from grep.** A tree-wide `colour`→`color` replace is
  wrong in both directions at once: it rewrites strings no consumer ever reads, and it still misses
  prose that reaches an artifact by a non-obvious path. So every candidate was traced to its **sink**,
  using `regen.ts`'s own list of committed artifacts (`out/**`, the three emitted `schema/*` files,
  `modes-report.md`, `nb-regression-report.md`) as the in/out test.
- **Fixed** (each reaches a committed artifact): `ai-metadata.ts` (`.ai.json` prose), `tree.ts` (inline
  `$description` templates + Figma `note` extensions), `theme.ts` (`notes.push(...)` →
  `$extensions.prism3.decisions` via `tree.ts:667`, and `PaletteBuild.description` → `$description` via
  `primitiveLeaf`), `emit-dtcg.ts` (the one literal inside its own `md.push(...)` report builder),
  `fidelity.ts` / `classify-colors.ts` (the `why` / `title` strings rendered into
  `wendys-fidelity-report.md`), `visualize.ts` (the `html.push(...)` / page-template strings reaching
  `tokens.html`), `modes.ts` (`border.focus`, which flows to `$description` via `aliasLeaf`).
- **Deliberately left alone:** thrown `Error(...)` messages everywhere (validation/parse failures, not
  token prose), `console.log`-only strings — including `visualize.ts`'s parallel `txt.push(...)` block,
  which mirrors the HTML but is never written to disk — and `test.ts` / `mcp.ts` / `eval-run.ts`.
- **The one exception proves the boundary is about sinks, not files.** `test.ts` had an assertion
  hardcoding the *old* spelling of a note it checks (`'action colour defaults to the primary'`). It was
  updated because the note text it asserts genuinely changed — **not** because `test.ts` came into scope.
- **`levers.ts` is a real remaining gap, not a judgement call.** It still carries `grey` / `synthesise`
  in lever text that feeds `schema/lever-manifest.json` — a committed artifact, so by this PR's own test
  it is in scope for the standard. Left out to keep one concern per PR; **needs its own follow-up issue,
  unfiled as of this entry.**
- **That is the second "already covered" assumption to fail.** #260 was filed assuming #162's UI sweep
  was complete; it wasn't (→ #302, five visible strings still in `main.ts`). `levers.ts` is the same
  shape of gap. Treat "#162/#260 covered that" as a claim to re-check, not a fact.
- **Prose-only was verified mechanically, not by eyeball:** the full `out/*` diff with every
  description-shaped key excluded (`$description`, `description`, `intent`, `method`, `note`,
  `decisions`, `meaning`, `when_to_use`, `avoid_when`) leaves only `notes` array entries and HTML table
  cells carrying the same prose — zero `$value` / alias / structural hits anywhere.
- **Verified:** 1000/1000 engine tests; `regen.ts --check` 85/85 byte-match; nb-regression PASS with
  aggregate ΔE00 **1.95 unchanged** (the value-drift proof), 11/11 contrast contracts, 23/23 dimensions;
  aliases 872/872, 871/871, 865/865 resolve; 432/432 mode contracts across all three brands; web +
  plugin `tsc --noEmit` and builds clean. `Prism3/schema/*` diff empty, as expected — none of the fixed
  files feed it.

---

## (2026-07-30) — Long token paths elide from the left, not the right (#289)

**STATUS: web-only.** `out/*` untouched; engine tests and the 85-artifact drift gate unchanged. Landed
as PR #307. *(Backfilled entry — reconstructed from the commit record, not written at the time.)*

- **Measured, not eyeballed.** On `origin/main`: 12 pills wrap at 1280px and 43 at 1024px, 9 and 34 of
  those overflowing their parent box. `.sf-id` is a 168px grid column and the style-guide grid is five
  columns wide, so the wrap is structural rather than incidental.
- **The fix lands on `.tpill` itself**, not the two containers that happened to get reported. The pill
  is used in 17 places; a per-context rule would just wait for the next narrow column.
- **Left elision, and the data is the reason.** These paths share long prefixes and differ only in the
  tail — `color.foreground.brand` vs `color.foreground.brand-subtle`, or the six
  `color.interactive.destructive.on-inverse.{text,fill}.{rest,hover,pressed}` whose first 40 characters
  are identical. Cutting from the right renders all of them as the same stub; the discriminating
  information is at the end. The cost is that the namespace prefix is what hides when space is tight —
  `title` and the style-guide hover bubble both carry the full path, and the emitted path is unchanged,
  which is what doc-26's namespace rule actually governs.
- **Widening the column was rejected:** the longest emitted path is 53 chars
  (`color.interactive.destructive.on-inverse.text.pressed`), ~350px at the pill's 10.5px mono, and every
  new interactive role can extend the tail.
- **Two implementations were built and discarded, both caught by measurement rather than review.** An
  inline-flex head+tail sized correctly, but flex items are blockified, so selecting a pill returned
  `color\n.background.primary`. What shipped keeps the path a **single text node** and elides purely
  visually via `direction: rtl`, so a selection still yields the exact path.
- **`sgPill` no longer overwrites `title`** with the resolution string: `data-sgtip` keeps the resolved
  step/hex/ratio bubble and `title` carries the full path — which matters once a path can be elided.
- **Verified:** Playwright across 6 configurations (aurora/harbor × 820–1440px × light/dark), all nine
  rail pages, ~198 pills each — 0 wrapped, 0 inexact selections, 0 pills whose text node differs from
  its `title` (so bidi reordering is a no-op on these ASCII paths), 0 console errors. The audit was run
  against `origin/main` first to confirm it detects the wrapping it claims to fix. The `sg-failpill`
  "!" marker never renders in the live example brands, so its absolute positioning was exercised by
  synthesizing the fail state — the marker stays right, inside the box, on elided pills.

---

## (2026-07-30) — Validation-color borrow controls: two bugs were already dead, one was real (#157)

**STATUS: web-only.** One narrow fix (6+/1-) in `web/src/main.ts`. Landed as PR #303.
*(Backfilled entry — reconstructed from the commit record, not written at the time.)*

- **Two of the three reported bugs no longer reproduce** — borrow-leak across ramps, and wrong-color +
  dropdown revert on "Use accent". Both had been fixed by #228 (full borrowed-ramp render) and #233
  (`roleToPalette` resolution), which landed *after* #157 was filed. Verified live across five
  sequential multi-row scenarios on the `aurora` fixture rather than assumed stale — the check was
  cheap, and the alternative was re-fixing something already fixed.
- **The third was real.** `anchorStepFor` handled only `primary` / `neutral` / `brandColors`; a
  custom-hue-seeded status role has no case, so it always fell through to "derived" instead of exposing
  an anchor step like every other scale. Added the status-role branch, reading the same pinned lightness
  the other three cases use and reusing the existing `STATUS_ROLES` / `StatusRole` constructs rather
  than inventing new ones.
- **The fix rests on an assumption that was checked rather than assumed:** `roleToPalette` defaults
  every non-borrowed status role to its own name, so at the call site (`refresh()` in the status row)
  `srcName = borrowed ?? resolved` resolves to exactly `role` for a non-borrowed, non-reused status role.
- **Verified in the browser:** switching Danger's Source to "Custom hue…" moves the anchor badge from
  **derived** to **450**, matching the highlighted ramp step; Success/Warning/Info stay derived,
  confirming the fix is scoped to the custom-hue case alone.

---

## (2026-07-30) — Raw NUL bytes banned in source (#304)

**STATUS: engine + test guard.** Output byte-identical — the escape changed no behavior. Landed as
PR #304. *(Backfilled entry — reconstructed from the commit record, not written at the time.)*

- **What it was:** `tree.ts:548` held a literal `0x00` character where the escape was intended. Legal to
  the compiler, invisible in an editor, byte-identical at runtime — but it makes the file **binary** to
  the grep/ripgrep family, so content searches return "binary file matches" with no lines. The engine's
  largest source file was invisible to the tool used to navigate it. On `main` since 9f719e3 (#185).
- **Second instance of the class.** The first, in `web/src/main.ts`, also broke a Playwright
  `select_option`, because the option values no longer matched what was typed.
- **A total ban, not a judgement call.** The escape is always available and always equivalent, so there
  is no case where the literal byte is wanted — the guard scans the engine plus both bundled surfaces.
  Fixing without the guard would just wait for the third instance.
- **The guard was watched failing** on `tree.ts:548` before the fix landed, and its liveness assertion
  checks that every scanned root contributed files — a total-count threshold was tried first and
  rejected as brittle against ordinary file churn.
- **Verified:** 1000/1000 tests (998 + the two new assertions), nb-regression exits 0, `regen --check`
  in sync at 85 artifacts — byte-identical output confirms the escape changed no behavior, so CI's
  coverage assertion is untouched.

---

## (2026-07-30) — Motion gets a primitive ms tier (#296, motion half)

**STATUS: engine.** `out/*` **regenerated** (shape change). Closes the motion half of #296; only
**shadow** remains ledgered.

- **The typography fix could NOT be ported, and checking why mattered.** Tempo scales the whole ramp
  by a multiplier (snappy 0.8× / standard 1.0× / relaxed 1.3×), so `relaxed.normal` is **260ms — a
  value no standard rung holds**. Line-height worked because the mode's target *was* an existing rung.
  Here there is nothing to re-point at, so a rung-name map is not expressible.
- **RADIUS is the real precedent**, not typography: a scalar lever scaling a ramp, solved with a
  value-keyed primitive grid (`radius.md → {dimension.8}`). That's why per-mode radius was already
  correct with no special handling.
- **The KB settled the naming** — `18-motion-foundations.md` §Motion tokens prescribes exactly this
  three-tier shape: primitive is *"literal, not semantic"* and value-named (**`duration-200`**), while
  semantic *"names a use, not a value"* (`duration/short`). Checking the KB changed the answer: I had
  proposed a root-level `duration.<ms>` group, which would have collided conceptually with
  `motion.duration.<name>`.
- **Shape:** `motion.duration-ms.<n>` holds every reachable ms across the base tempo AND every
  per-mode tempo (union, so every alias lands on a real leaf). `motion.duration.<name>`,
  `motion.duration-reduced.<name>` and `motion.stagger` are now `role: semantic` aliases into it; a
  per-mode tempo re-points the alias. Named after `font.weight` / `font.weight-role` — a suffixed
  sibling primitive group, so **`motion.duration.*` keeps its path**. The KB's argument for the
  semantic tier is that it's the stable handle consumers bind to; renaming it would break the thing
  the tier exists to protect.
- **`easing` / `spring` are correctly out of scope** — untouched by tempo, separate primitive families.
- **Dead code removed:** `durWithModes` existed only to attach per-mode values to duration leaves.
  With the tier in place nothing needs it.
- **Also noted from the KB, not acted on:** *"A system needs four duration tokens, give or take one.
  More than six and consumers stop choosing meaningfully."* We ship exactly six — at the ceiling, not
  over it. A reason not to grow the ramp, and a reason the tier split matters more than adding rungs.
- **Verified:** 998/998 engine tests (up from 991; `D-motion(a)` inverted to the new contract plus new
  assertions that both ms endpoints exist as invariant primitives carrying no per-mode variant, and
  that stagger + duration-reduced ride the same tier); `regen.ts --check` in sync (85 artifacts, so
  CI's coverage assertion still holds); nb-regression exits 0; web `tsc` + both builds clean;
  Playwright swept nine pages × light/dark with zero console errors — including #292's new motion
  specimen, which reads durations and was the risk area.
- **#296 remaining: shadow only** (`role: composite`, zero refs in or out — needs decomposing before
  it can be tiered). Still ledgered so it can't be forgotten.

---

## (2026-07-30) — Motion specimen: trace the curve (#292)

**STATUS: web-only.** Landed as PR #299. *(Backfilled entry — reconstructed from the commit record, not
written at the time.)*

- **Replaces the stacked bar-fill list** with one large stage per semantic transition
  (default / enter / exit / emphasized): the resolved easing curve plotted as a ghost line, with a dot
  tracing it over the resolved duration. The bar-fill showed *that* something took time; the traced
  curve shows *the shape of* the easing, which is what the token actually encodes.
- **Playback control** (real · ½× · ¼× · ⅛×, defaulting to ¼× for legibility) uniformly divides all four
  durations. It never touches the displayed ms label — always the real resolved token value — nor the
  curve shape, and it preserves the ratio between transitions at any speed, so slowing the specimen down
  to read it cannot misrepresent what ships.
- **Downstream note:** this specimen reads durations, which made it the risk area for #300's
  `motion.duration-ms.*` tier landing immediately after — swept with Playwright there and clean.

---

## (2026-07-30) — Primitives are mode-invariant: the guard + leading/tracking re-point (#296)

**STATUS: engine + test guard + one UI note.** `out/*` **byte-identical** (no committed brand exercises
per-mode leading). Owner principle: *"any primitives should be mode-invariant."* Closes the
line-height/letter-spacing half of #296; motion + shadow remain, ledgered.

- **I filed #296 wrong and rewrote it.** First version claimed 6 of 8 per-mode axes mutate primitives.
  Real answer: **3**. I had read the READ-MODEL (`dims.radiusByMode`) as if it were the emitted
  contract. In the emitted tree `radius.md` is `role: semantic` moving `{dimension.4}` → `{dimension.8}`
  with **both primitives present and unchanged** — colour, radius and density were already correct. I
  had recommended building a fix that already existed.
- **The real diagnosis** is sharper: the violating axes are the ones that were **never given a
  primitive tier**, so a per-mode override has nowhere to land but the value itself. `font.weight-role`
  is the canonical correct shape (semantic name → `{font.weight.<numeric>}` primitive).
- **The guard (7c) is the thing #296 actually asked for.** A token may carry
  `$extensions.prism3.modes` only if it RE-POINTS: `$value` is an alias, or `role: semantic`, or — for a
  DTCG composite — every field the variant *changed* is an alias. That last clause is what separates
  `type.*` (swaps `{font.line-height.normal}` for `{…relaxed}` ✓) from `shadow.*` (swaps raw colour/px
  objects ✗). `KNOWN_VIOLATIONS` is a migration **ledger**, and a second assertion fails if an entry
  goes stale, so a fixed axis can't leave a dead exemption behind.
- **The guard found something the manual audit missed on its first run:** `motion.stagger`. I had only
  identified `motion.duration`. Also **proved it bites** — removing the line-height exemption makes it
  fail and name the offending group.
- **The fix:** rung primitives keep exactly one value across all modes; the per-mode change moves to
  the semantic composite, which re-points its `lineHeight` / `letterSpacing` alias at a different rung.
  `TypeComposite` gained `lineHeightByMode` / `trackingByMode`; `tree.ts` emits the variant on the
  composite and no longer on the rung.
- **The per-mode input NAMES A RUNG, not a value** (owner call, after I first shipped value-snapping):
  `modeLevers.dark.lineHeights: { normal: 'relaxed' }` reads *"in dark, styles that would use `normal`
  use `relaxed` instead"*. This is strictly better than the snapping model I built first and then
  replaced: **the silent-no-op class disappears entirely** rather than being warned about, there is no
  ambiguity about what a value resolves to, and it **separates two operations that were both numbers
  meaning different things** — `typography.lineHeights` (numeric, brand-wide, re-anchors what a rung is
  WORTH) vs the per-mode map (rung name, re-points WHICH rung is used). Different operations, now
  different types.
- **A number in the per-mode slot is REJECTED, not coerced,** with a message pointing at
  `typography.lineHeights` — coercing it would quietly reintroduce the mode-varying-primitive bug. That
  rejection immediately caught my own stale fixtures, which is how it should behave.
- **A self-map (`normal → normal`) is dropped** as no-diff, the same suppression the other axes use, so
  an inert declaration can't create a mode entry or a spurious composite variant.
- **The UI now has two different controls for the two operations:** Light edits the rung VALUE (number
  field); any other mode picks a TARGET RUNG (select, self excluded since it would be a no-op). The
  read-model fields were renamed `lineHeightRepointByMode` / `letterSpacingRepointByMode` — they are
  re-point maps, not per-mode ramps, and the old names asserted something untrue.
- **Two tests inverted deliberately.** `D-lhls(a)/(b)` asserted the retired contract (per-mode value ON
  the rung); they now assert the opposite — the rung carries NO per-mode override and is byte-equal to
  the no-per-mode build. `(c)` asserted the composite was *unchanged*; it now asserts the re-point, plus
  that only alias fields changed. `(d)` is new: the quantised no-op is asserted to be noted.
- **Verified:** 991/991 engine tests (up from 976); `regen.ts --check` in sync (83 artifacts);
  nb-regression exits 0; `out/*` byte-identical; web `tsc` + build clean; plugin build clean.
- **Still open on #296:** motion (`duration` + `stagger`, untiered — no `role` at all) and shadow
  (`role: composite`, zero refs in or out, needs decomposing). Both ledgered so they cannot be
  forgotten and cannot silently grow.

---

## (2026-07-30) — Disabled contrast: an absolute 3:1 floor, both branches gated (#290)

**STATUS: engine + schema + dashboard.** Resolves #290. Owner decision after the triage discussion:
**contrast-preserving means actually meeting 4.5:1**, and the other branch may go lower **but never
below 3:1**. So the dial moved OFF the compliant branch and onto the reduced one, and the system
stopped using the WCAG inactive-component exemption entirely.

- **What was wrong, measured.** The old pair was `accessible` (gated at `disabledMin`, dial 2–4.5)
  vs `conventional` (ungated, `pickClosest(..., 2)`, `min: 0`). At the bottom of the dial they
  **collapsed onto each other** — `accessible@2` and `conventional` both produced `disabled.on-fill`
  at 2.14:1, `disabled.text` at 2.32 vs 2.07 — while the first still called itself *accessible* and
  asserted a passing contract against a floor that is no WCAG threshold. The owner's instinct
  ("feels weird that I can pick a floor below contrast") was understating it.
- **Two further findings from the same probe.** (a) `conventional` **ignored high-contrast mode**:
  only the gated branch escalated, so a brand choosing it shipped 2.07:1 disabled text inside its
  HC theme. (b) `disabledMin` had **no `minimum`/`maximum` in the schema** at all — a hand-authored
  `design.md` could set `disabledMin: 0.5` and it validated and shipped.
- **The new model.** `'full'` = a fixed **4.5:1** (AA text), no dial — a promise, not a range.
  `'reduced'` (default) = a dialable **3–4.5** floor, default 3. Both branches now GATE; the ungated
  path is deleted. Both escalate to ≥4.5 in HC, closing (a). Schema pins `disabledMin` to `[3, 4.5]`
  and the engine clamps independently, closing (b) at both layers.
- **3:1 is not arbitrary** — it is the SC 1.4.11 non-text / SC 1.4.3 large-text threshold, and where
  Primer and USWDS sit. The schema already documented that ("field-rare — 0/12 surveyed systems
  guarantee it"); the owner's floor landed on the strongest available precedent.
- **Legacy aliases, accepted not dropped.** `'accessible'` → `'reduced'` keeping its `disabledMin`
  (clamped ≥3); `'conventional'` → `'reduced'` at 3, which **RAISES** its contrast from ~2:1 — a
  deliberate breaking improvement, called out rather than silent. Nothing in-repo set either lever,
  so no fixture needed migrating.
- **`out/*`: every resolved value is byte-identical.** Verified by grepping the whole regen diff for
  `$value` / hex / ratio changes — none. Only `$description` prose moved (3 disabled roles × mode ×
  brand, the `notes` line, and the mirrored Figma descriptions), because the retired word
  "accessible" had to leave the emitted text. Choosing `reduced@3` as the default is what preserved
  the values.
- **The affordance caveat is surfaced, not buried.** At 4.5:1 a disabled label is as legible as body
  copy, so "disabled" then reads only from fill / border / cursor / `aria-disabled`. The UI shows
  that inline when `full` is selected, and the engine note says it too — the KB's "colour is never
  the sole carrier" makes it defensible, but it should be a conscious choice.
- **A test guard had to be loosened deliberately, and narrowed to compensate.** The lever↔schema
  enum check was strict set-equality, which the back-compat aliases break. It now asserts the hard
  direction (UI options ⊆ schema enum — the UI may never offer a value the schema rejects) and
  allows schema-only values ONLY when the description marks them `LEGACY ALIAS`. Forgetting to
  surface a genuinely new option still fails.
- **Verified:** 976/976 engine tests (17 new in a `(7b)` block — the absolute floor swept across
  every strategy × min × mode, `full` ignoring the dial, clamping, both aliases, HC escalation on
  all three inputs, and schema rejection of 2); nb-regression exits 0; `regen.ts --check` in sync;
  web `tsc` + build clean; plugin build clean; the "every lever exercised" fixture repointed from a
  now-legacy alias to the live `full` branch; Playwright confirmed the dial appears only on
  `reduced`, the caveat only on `full`, the slider range is 3–4.5, and the disabled specimen tracks
  the branch live (fg `rgb(104,104,109)` → `rgb(79,79,84)`); nine pages × light/dark, no console errors.

---

## (2026-07-29) — Bug triage: Surfaces dark-mode text, outline-hover method, anchor clamp feedback

**STATUS: dashboard fixes + one real engine gap surfaced.** Owner dropped six UI reports; three were
real bugs (fixed here), one report resolved into an actual engine gap (filed, not silently patched
around), one was verified NOT a bug, and two are genuine design/layout decisions (filed for the
owner, not guessed at).

- **Fixed: Surfaces "Card on this surface" text invisible in dark / dark custom modes.**
  `sfExSurface` hardcoded ink to `invert ? '#f2f2f6' : '#191920'`, and both call sites for the
  Primary row always passed no fourth arg (`invert` defaulting `false`) — so on a dark surface the
  example rendered near-black text on near-black. Now reads the resolved `text.primary` /
  `text.on-inverse` role (each is measured against the exact surface it sits on), so it's always
  legible regardless of which mode's Primary is light or dark.
- **Fixed: "Opaque subtle tint" outline-hover method showed an empty/transparent swatch.** The
  preview always read `interactive.primary.overlay.hover` regardless of the selected
  `outlineInteraction` method — that role only exists for `overlay-neutral`. Tracing the *correct*
  fix surfaced a real engine gap: `solid-tint`'s own doc comment claims it reuses
  `foreground.<color>-subtle`, but that role only exists for the five fixed `SEMANTICS` names
  (brand/success/warning/danger/info), never for an interactive COLUMN name (primary/neutral/
  destructive/accent) — so `solid-tint` has never changed anything in the emitted tree, for any
  brand. Filed as #288 rather than faked with a wrong role read; the dashboard now shows an honest
  inline note instead of a color that doesn't mean anything.
- **Fixed: copy** — the `none` option read "No hover expression" (implies nothing changes at all);
  renamed "No hover fill" per owner ask, since text/border still exist, only the fill wash is absent.
- **Fixed: missing feedback when a fill-anchor pin gets contrast-floor clamped.** Reported as
  "the interactive states didn't update after I changed the base color" — verified via a standalone
  engine probe (`brandTheme` swept across anchor values) that this was **never a staleness bug**:
  the engine correctly re-derives hover/pressed from the EFFECTIVE anchor every time; the reported
  case (300 → still showing 550's hover) was two different requested anchors both getting
  floor-clamped to the *same* effective step, so nothing about the resolved theme actually changed.
  The real bug: the Source select shows the raw requested step with no indication a clamp happened,
  making a legitimate floor-gate read as unresponsive UI. `iRow` gained an optional `warn` slot
  (reused `.fz-warn` styling); `fillRestRow` now compares the requested pin against
  `stepKeyOf(r.path)` (the effective step) and surfaces the mismatch inline when they differ.
- **Verified NOT a bug: shadow tint hue/amount "not visibly changing the example."** A live probe
  (drag both sliders to their extremes, read `getComputedStyle(...).boxShadow`) confirmed the RGB
  genuinely shifts — `rgb(6,7,10)` → `rgb(1,6,27)` (amount→max) → `rgb(21,0,7)` (hue→0). The values
  are correct; the effect is real but subtle by nature (a few RGB units at 6–12% alpha on a soft
  shadow). No code change; flagged to the owner as a perceptibility question, not a wiring bug.
- **Filed, not built — genuine decisions/backlog, per owner's own uncertainty or explicit "can be a
  backlog item":**
  - #289 — token pills wrap awkwardly in narrow columns (Surfaces cards, Style guide); four layout
    options sketched, none chosen.
  - #290 — the disabled contrast-floor slider is attached to "Accessible," letting a pick dial below
    what "Accessible" implies; owner's alternate framing (attach it to "Conventional" instead, as
    "how far below AA") is at least as coherent — needs a call, not a guess.
  - #291 — interactive examples should show real hover/pressed on actual mouse interaction, across
    every slot row; real cross-cutting feature, not a one-line fix.
  - #292 — Motion specimen: a more expressive example than a dashing line (a dot on a curve or
    similar) — no direction chosen yet.
- **Verified:** engine 962/962; nb-regression exits 0; `regen.ts --check` in sync (83 artifacts,
  including the relabeled lever-manifest); web `tsc` + build clean; plugin build clean; Playwright
  swept all nine pages × light/dark with zero console errors; each of the four code fixes verified
  live (not just read) — dark-mode text contrast, all three `outlineInteraction` methods, the clamp
  warning appearing/disappearing correctly.

---

## (2026-07-29) — Web dashboard deploys as a static site on Vercel (#104)

**STATUS: deploy setup** (`web/build-site.mjs` + root `vercel.json` + docs; no engine change, `out/*`
byte-identical). Closes #104 — the dashboard was reachable only from a local esbuild dev server, so UI
review needed a running process, there was no link to send anyone, and PRs had no live surface.

- **Static by construction:** the engine runs client-side and `main.ts` has zero `fetch`/`XMLHttpRequest`/
  `pushState` — so no backend, no rewrites, no runtime data loading. Just files.
- **Root Directory is the REPO ROOT, not `web/`** — the load-bearing constraint. `web/src/main.ts` imports
  `../../Prism3/engine/*` and `../../Prism3/schema/example-brands.json`; a `web/`-scoped build can't resolve them.
  Only `web/src` + `Prism3/{engine,schema}` are READ BY THE BUILD; `plugin/`, `Tokens/`, `Prism3/engine/out/`
  are neither read nor served. **Install is a different matter** — it runs at the repo root and resolves both
  workspaces, so `node_modules` also holds the plugin's `@figma/plugin-typings`. Hence: the build needs
  devDependencies (`NODE_ENV=production` at install omits esbuild → `ERR_MODULE_NOT_FOUND`), and a
  `plugin/package.json` bump without a regenerated root lockfile can fail THIS deploy's install (`npm ci`
  rejects the mismatch) before the build command runs. The plugin surface is coupled through install, not
  through the bundle.
- **`build:site` → `web/public/`:** the deployable root must *contain* `dist/` (index.html loads
  `/dist/main.js` absolutely), and publishing `web/` as-is would expose `DESIGN-REVIEW.md`
  at the site root (the sourcemap ships source deliberately). `build-site.mjs` cleans, bundles with the same
  flags as `build`, and copies `index.html` **verbatim** — its absolute path resolves identically under the
  local dev server and the deploy root, so there's no host-conditional path logic. The script then **asserts
  the manifest** — unexpected or missing output exits non-zero, so adding e.g. a CSS import (esbuild emits
  `dist/main.css`, which the verbatim `index.html` never references) fails the build instead of deploying an
  unstyled site. `dev`/`build` untouched; `web/public/` gitignored.
- **Contract in git:** root `vercel.json` is two keys (`buildCommand`, `outputDirectory`). No
  `installCommand`/`rewrites`/`framework` — each would be a redundant override that can drift.
- **Verified:** the literal `vercel.json` `buildCommand` emits exactly 3 files; stale-file wipe confirmed;
  manifest guard proven by adding a real CSS import (exits 1, names `dist/main.css`); served headless on a
  throwaway port with a clean console + a live lever edit repainting.
- **Two manual steps (owner):** authorise the Vercel GitHub app and import `adamforrester/prism3`
  (Root Directory = repo root, then Deploy), then disable Deployment Protection in Settings — new projects
  default to `ssoProtection` enabled, which puts prod + preview URLs behind a login wall. Can't be granted by
  an agent. Prod URL to be added to `web/README.md` once it exists.
- **Spec/plan:** `docs/superpowers/specs/2026-07-29-web-vercel-deploy-design.md`,
  `docs/superpowers/plans/2026-07-29-web-vercel-deploy.md`.

---

## (2026-07-29) — Typefaces UI: the two tiers made operable (#269, web half)

**STATUS: dashboard.** No engine change, no artifact change — this wires the tier split #269 landed
in the engine to the Typography → Foundations page, which until now could not reach it.

- **The gap it closes.** The engine emitted `font.typeface.*` primitives, supported N faces, and made
  mono optional — but `renderTypefaces` still looped the fixed three roles and edited
  `families[role].stack[0]` in place. The primitive tier was invisible and the new capability
  unreachable from the UI.
- **Tier 1 — the library.** One full-width row per distinct face: name, `font.typeface.<slug>` pill,
  fallback stack, install status, which roles bind it, specimen. Rows rather than cards because the
  list grows with the brand and the fallback stack needs the horizontal room.
- **Tier 2 — the bindings.** Display / Text / Mono, each a select over the library plus *Custom face…*
  (the authoring path for a face not yet in it); mono also offers *None*, which drops the `code`
  category with it.
- **Authoring through the bindings, not the library.** The library is DERIVED — a face exists exactly
  as long as a role names it. So "add" is binding a new name and "remove" is re-pointing the last role
  that used it; there is no delete button and no cascade, which is the same conclusion the engine
  reached structurally. The section says this in as many words rather than leaving it to be inferred.
- **Availability is scoped to the authoring moment.** Install status is a property of the face, and
  the library already reports it per face — showing it on all three bindings as well repeated the same
  warning three times. It now appears on a binding only while its custom field is live.
- **Verified in a browser, not just by types.** Binding a fourth face grows the library and correctly
  re-computes the shared-face dedupe (Inter drops from "Display + Text" to "Text"); unbinding mono
  removes `typeface.jetbrains-mono` AND takes `type.code.*` from 1 composite to 0; rebinding restores
  it. Zero console errors across Light/Dark and every page.
- **Not a bug, recorded so it is not re-investigated:** on the HC modes the editor pages render an
  intentional "auto-derived — read-only" panel instead of their `.psec` sections. A `.psec` count
  reads as zero there; the page is correct.

---

## (2026-07-29) — One regen entry point + a drift gate over every committed artifact (#281)

**STATUS: engine tooling.** New `Prism3/engine/regen.ts`; no engine behaviour change, no artifact
change. Closes #281.

- **The hole.** `out/*` is committed so results are reviewable without running the engine — but
  nothing verified it still matched what the engine emits. Every existing gate (`test.ts`,
  `nb-regression.ts`, alias resolution, contrast contracts) runs the engine **live and compares it
  against itself**; none of them ever reads the committed file. So a stale artifact passes everything.
- **What had rotted.** Regenerating on pristine `main` (`b5627f2`) with zero source edits produced
  6,410 changed lines: `tokens.html` and all three wendys artifacts. Not formatting — the committed
  wendys fixture was many merged PRs behind (aliases 627→856, contracts 248→432, missing the `max`
  weight role, interactive overlays, neutral emphasis, inverse surface-context, `background.inverse.*`).
- **Root cause: regen was four commands and only one was habitual.** `emit-dtcg.ts` covers
  nb/aurora/harbor, so those stayed current; wendys goes through `cli.ts` (it is a *standard*-dialect
  brief) and `tokens.html` through `visualize.ts`, so both rotted unseen.
- **`regen.ts`** runs all seven emitters in dependency order (`visualize` last — it reads the
  `*.tokens.json` the others write). `--check` snapshots, regenerates, byte-compares, then **restores
  the snapshot**, so the gate never leaves the tree dirty whatever the answer — safe to run mid-edit.
- **Scope widened past the issue, deliberately:** the three emitted `schema/` contracts
  (`lever-manifest.json`, `preview-spec.json`, `example-brands.json`) are the same class of risk —
  committed, generated, unverified. They happen to be in sync today; nothing was keeping them so.
  `schema/` is compared file-by-file against a named list because it also holds hand-authored contracts.
- **Verified both directions:** green on this branch (83 artifacts byte-match) and on pristine `main`
  it names exactly the four drifted files and nothing else; tampering with an emitted value in either
  `out/` or `schema/` is caught and the tree is left clean afterwards.
- **Wired into the contract** — `CLAUDE.md` working principle 4 and the engine README now lead with
  `regen.ts`, and say plainly that `--check` is the only gate that reads the committed artifacts.

---

## (2026-07-29) — Font families become two-tier: typeface primitives + family-role semantics (#269)

**STATUS: engine.** `out/*` **regenerated** (shape change, see below). Closes #269.

Font families were a closed union of exactly three, each named after its *job* — so
`families.display` (a primitive) collided with the type category `display` (a semantic), and family
assignment read as though it happened in the primitive tier.

- **Two tiers, mirroring colour.** `font.typeface.<slug>` is the primitive, named after the face and
  carrying its fallback stack (`inter`, `clash-display`); `font.family.<role>` is the semantic,
  aliasing one. The role stays the **brand-invariant handle** a shared codebase binds to — swapping the
  face behind it leaves every consumer reference intact, which a direct `font.typeface.*` reference
  would not.
- **Multi-brand needs no more than the fixed three roles.** The typeface library is shared *across*
  brands and each brand binds its own members (`Brand A: display→poppins`, `Brand B: display→inter`),
  so N faces exist across the system while any one brand binds ≤3. A fourth *role* is only needed if a
  single brand wants four faces at once — deferred until a real brand does.
- **Slugs are derived** from the face name (`"Clash Display"` → `clash-display`), never user-chosen, so
  there is no arbitrary-rename churn: you either have that face or you don't.
- **Roles sharing a face share one primitive** — NB binds display *and* text to Inter and emits a single
  `typeface.inter`, with `variable` OR-ing across the roles.
- **Per-mode family override now RE-POINTS the alias** instead of re-valuing the primitive — the shape
  #176's decision 2 asks for, and directly relevant to #251's embedded lever-vs-token decision. Faces
  used only by a mode are unioned into the typeface set so every alias lands on a real leaf (the same
  contract `weightsRef` has for per-mode weight numerics).
- **Mono is optional.** `families.mono: null` opts out; `code` is the only category binding mono, so it
  disappears with it (36 → 35 composites on a default brand). Omitted still keeps the default face, so
  existing brands are untouched.
- **Figma emit is behaviourally unchanged by design** — the family variable still *binds* the primary face
  with the full stack in its description; the emit just resolves the alias first. The only diff in
  `out/figma/*/core-font.json` is the description wording (`font family — display (Inter)` →
  `font family role — display → Inter`); every `value`, `alias`, and `scopes` field byte-reproduces, so
  no Figma import changes.
- **The hand-rolled schema validator learned `type: "null"`.** Its CR-04 guard threw loudly on the
  unknown type rather than silently vouching for it — the guard working as intended.
- **Verified:** 953/953 engine tests (new coverage for both tiers, shared-face dedupe, alias resolution
  through `familyOf`, per-mode re-pointing, and the whole optional-mono path); nb-regression exits 0;
  every alias resolves + every mode contract passes for all three brands; web `tsc` + build clean.

**`out/*` regenerated — what changed:** each brand gains `font.typeface.*` leaves, and every
`font.family.<role>` `$value` moves from a literal face string to an alias into one. **Resolved values
are identical** — `familyOf` derefs the alias and reassembles the same stack. Consumers reading
`font.family.<role>` still resolve to the same face; consumers that read the raw `$value` expecting a
literal string now get an alias and must deref (the same contract every other semantic already has).

---

## (2026-07-29) — Fix #274: space.* dangling aliases at non-default spaceBase (engine)

**STATUS: engine fix** (`theme.ts` + a `test.ts` regression; `out/*` byte-identical). Upgrades what #274
(filed off the #265 spacing preview) turned out to be: **not** a read-model quirk but a real dangling alias
in the EXPORTED DTCG.

- **Root cause:** two uncoupled scales — the dimension grid is `baseUnit`-stepped (default 4), the space
  scale is `mult × spaceBase`. At a non-default `spaceBase` the half-steps (1.5×/0.25×/0.75×) land OFF the
  grid (spaceBase 12 → `space.150` = 18px, absent from a baseUnit-4 grid), and space is the ONE dimension
  family that emits its alias UNCONDITIONALLY (radius/size/border-width all guard `gridSet.has(px) ? alias :
  literal`). So `space.150 → {prism.dimension.18}` dangled — flagged by `buildTree` `stats.broken` (6 broken
  at spaceBase 12; 0 at the default 8, which is why every committed fixture and the earlier #265 check looked
  clean). `pxOf` then returned 0 for the dead target, which is what the preview surfaced.
- **Fix (`theme.ts` `buildDims`):** feed every space px into the dimension grid as `extras`, so each space
  alias resolves by construction. One place; repairs both the exported DTCG and the read-model.
- **Blast radius:** committed `out/*` **byte-identical** — all four fixtures use the default `spaceBase 8`,
  where space px already land on the baseUnit-4 grid, so the extras add nothing. Verified: regen → no diff.
- **Regression test:** new `#274` block asserts `stats.broken === 0` and `space.150`'s target exists across
  spaceBase 8/12/5/10, plus the default-8 byte-identity guard. Engine 934/934 (was 925 + 9).
- **Live:** at spaceBase 12 the spacing preview now shows `space.150 · 18px` (was `0px`).
- **Note:** the original #274 write-up said "emitted DTCG is correct" — that was wrong (only checked
  spaceBase 8). Corrected here; #274 to be closed by this.

---

## (2026-07-29) — Token list rendered from buildTree() — 1:1 with export, all tokens (#263)

**STATUS: dashboard change** (`web/src/main.ts` only; `out/*` byte-identical, no engine change). Last of the
PR #262 review follow-ups.

- **The token list now walks the SAME DTCG tree the export downloads** (`buildTree(theme).tree`), replacing
  the separate resolved-model rendering (`resolveAllModes` / `rp.dims` / `rp.type` / `rp.shadows`). So "what
  you see" IS "what you'd export" — there's no second code path to drift. A recursive leaf-walk
  (`collectLeaves`: a leaf has `$type`; groups are plain objects; `$`-keys are metadata — mirrors the
  generator's own walker) naturally shows **every** token, fixing the old subset gaps (typography + others).
- **All 16 categories now render** (was 4): Palette, Color, Opacity, Motion, Font, Type, Shadow, Breakpoint,
  Grid, Container, Dimension, Space, Radius, Border-width, Focus, Size — 526 tokens for a default brand.
  One `.psec` per top-level group under the brand root (generator order).
- **Per-`$type` value rendering** (the tree's asymmetries handled): color → swatch+hex per mode via a new
  `hexOfNode` (reads `$extensions.prism3.hex` on primitives; follows `{alias}` refs on roles; the base
  `$value` is the base/light mode, `$extensions.prism3.modes.<m>.$value` the overrides) — this correctly
  resolves BOTH raw-hex primitives and aliased roles (the first cut showed `—` for primitives because their
  `$value` is `rgb(...)`, not an alias; `hexOfNode` fixes it); typography → the full composite via the tree
  helpers (`familyOf`/`numOf`/`remPxOf`, primary face only); shadow → CSS box-shadow per mode (its per-mode
  override is a layer ARRAY, not a `{$value}`); dimension/number → resolved px/value, per-mode column only
  when a leaf carries overrides.
- **Presentation preserved (#262):** `subHead` (uppercase `.sub-t`) group heads, `.toktable` left-aligned
  value columns, `swatchCell`. Fixed a grouping edge: single-segment categories (opacity/shadow/breakpoint/…)
  render one flat table instead of a `subHead`-per-leaf.
- **Verified:** engine 925/925; `tsc` clean; build clean; 0 `node:` builtins; `out/*` byte-identical.
  Playwright: 16 categories / 526 rows; palette primitives + color roles resolve hex (with swatches);
  per-mode columns correct (added Dark → `text.primary` light `#0e0d0d` / dark `#f7f7f7`); type composites +
  dimensions render; flat categories no longer emit phantom per-value subheads. 1:1 with export is
  structural — the list literally iterates the export tree.
- **Batch complete:** #262 (Preview/Disabled/token-list display), #264 (Layout), #265 (Size & radius), #263
  (this) all landed/open. Remaining from the batch's spillover: #274 (`[engine]` resolve-preview space quirk).

---

## (2026-07-29) — Size & radius: controls-beside-previews + shared split scaffold (#265)

**STATUS: dashboard change** (`web/src/main.ts` only; `out/*` byte-identical, no engine change). Second of
the PR #262 follow-ups; reuses (and generalizes) the #264 Layout pattern.

- **Shared `controlSplitPage` scaffold.** Extracted the #264 controls-beside-previews mechanism into a
  reusable scaffold both Layout and Size & radius compose from: hero → derived-mode note (or) one `.cs-split`
  section per block (control column beside a preview node) → a page-local `paintVolatile` that repaints only
  the preview nodes on `apply()`. The `ly-*` control classes were generalized to a neutral `.cs-*` family;
  Layout was migrated onto the shared scaffold (mechanical — same structure, shared classes). Compact
  `csSlider`/`csPicker` helpers live here too.
- **Size & radius restructured** into three co-located blocks (was: three stacked control sections above,
  two specimens far below in `.stage-vol`): **Corner radius** (baseMd + radiusScale → radius ramp),
  **Density & size** (density → control-size ramp), **Spacing grid** (spaceBase + baseUnit → a NEW spacing
  ramp preview). `renderRadiusSpecimen`/`renderSizeSpecimen` → `paintRadiusPreview`/`paintSizePreview`
  (fill-a-node form). radius + density keep per-mode behavior — the controls reuse `leverControl(key,
  perMode)`, so lever semantics are unchanged.
- **New spacing preview** (`paintSpacingPreview`): the space.* ramp as proportional bars. Derives its steps
  from the ACTUAL resolved `rp.dims` keys (sorted by scale), NOT a hardcoded list — the resolved model only
  carries the steps the preview binds (same subset behavior as type/#263), so a fixed list showed phantom
  0px rows (caught in the live drive). Read-only from `rp.dims`, no engine change.
- **Verified:** engine 925/925; `tsc` clean; build clean; 0 `node:` builtins; `out/*` byte-identical.
  Playwright: 3 co-located blocks each with controls beside their preview; radius softness 1→2 doubled the
  ramp in place; density comfortable→compact shrank the size ramp; spacing bars proportional + live on
  spaceBase; the `.cs-split` survives each change.
- **Surfaced (out of scope, logged separately):** at `spaceBase=12`, `space.150` shows `0px` in the preview.
  Probed: the emitted DTCG is CORRECT (`space.150 → {prism.dimension.18}`); the gap is in the resolve-preview
  read-model (`resolve-preview.ts`) — it can't resolve the `dimension.18` primitive at that base (the fine
  grid doesn't mint an `18` step), so the alias dangles to 0 in the resolved view only. The new spacing
  preview honestly reflects `rp.dims`; filed as an `[engine]` finding on resolve-preview. Out of scope here.
- **Still open:** #263 token list from `buildTree()`.

---

## (2026-07-29) — Layout page: controls-beside-previews + curated columns + rename (#264)

**STATUS: dashboard change** (`web/src/main.ts` + a label-only lever change in `Prism3/engine/levers.ts` +
its regenerated `schema/lever-manifest.json`; `out/*` byte-identical). First of the three PR #262 follow-up
issues (#264/#265/#263).

- **Controls now sit BESIDE their live preview.** The Layout page dropped the generic `renderScreen`
  scaffold (all controls stacked above, one specimen block far below in `.stage-vol`) for a bespoke page
  built like Palettes: a `refreshers[]` array + a page-local `paintVolatile` repaints only the preview
  sub-nodes on `apply()`, so controls stay stable (never rebuilt mid-drag) and a change is visible without
  scrolling. Three `.ly-split` blocks (control column + preview): **Breakpoints** (px editor + ruler/table),
  **Grid columns** (picker + column strip), **Container caps** (two sliders + bars). `renderLayoutSpecimen`
  split into `paintBreakpointsPreview` / `paintColumnsPreview` / `paintContainersPreview`;
  `renderBreakpointsEditor` → `renderBreakpointsControls` (returns just the control node).
- **Grid columns is a curated step-picker** (`4/6/8/12/16/24`) — no odd/awkward counts. **UI-only curation**
  (owner call): the engine/schema stay permissive (any int 4–24 still validates), so a hand-authored
  `design.md` with `columns:10` isn't rejected — the dashboard just guides the common choice. No enum/schema
  change, so no manifest enum-drift.
- **"Narrow container" → "Content container"** (lever label in `levers.ts`, manifest regenerated via
  `emit-levers.ts`). The container sliders are compact, not full-width (owner: full-width was overkill).
- **Verified:** engine 925/925 (incl. the lever-manifest drift test — regenerated manifest matches); `tsc`
  clean; build clean; 0 `node:` builtins; `out/*` byte-identical. Playwright drove the page: 3 co-located
  blocks, columns picker offers only 4/6/8/12/16/24 and repaints the strip in place (12→24), the container
  sliders commit on release and repaint the bars in place (content container 720→480 shrank its bar), the
  co-located split survives each change, and "Content container" reads correctly.
- **Still open** (same review batch): #265 Size & radius controls-near-previews (reuses this pattern), #263
  token list from `buildTree()`.

---

## (2026-07-29) — Preview restructure + Disabled fixes + token-list display (review batch)

**STATUS: dashboard change** (`web/src/main.ts` + `web/src/write-adapter.ts` + one additive read-model field
in `Prism3/engine/resolve-preview.ts`; `out/*` byte-identical). A batch of owner review fixes; the bigger
reworks were split into GH issues (see below).

- **Preview → Style guide is now the first + default sub-view; the "UI preview" component gallery is
  removed entirely.** Owner call: button padding / badges / tags / nav aren't defined at this stage, so those
  specimens were placeholder — the style guide carries the real value. Dropped `renderPreviewGallery`,
  `renderChip`, `SLOT_ORDER`/`SLOT_LABEL`, the now-dead `colorVar`/`pageBg`/`hexOf`/`writeHost` +
  `makeWriteHost`/`typeVar`/`cssVarName` imports, and the `.preview`/`.pvcomp`/`.pvvar*`/`.chip` CSS. Tabs are
  now Style guide · Contrast contracts · Token list. Hero copy updated.
- **Disabled example now updates live (was a two-cause bug).** (1) The example read `background.tertiary` /
  `text.tertiary` (invariant to both controls) instead of the resolved `disabled.fill` / `disabled.on-fill`;
  (2) the floor slider's generic `apply()` repaints only `.stage-vol`, but the example lives in the
  non-volatile section — so it never refreshed. Fixed the data source + re-pointed the floor slider to commit
  on `change` (release) with `applyFull()` (not `oninput`, which would destroy the slider mid-drag). Also
  removed the orphan `.nested` left-indent on "Disabled contrast floor" (+ dead `.knob.nested` CSS).
- **Token list display fixes.** Group headers now use the shared doc-26 `subHead` (uppercase `.sub-t`), not
  the bespoke lowercase-mono `.tok-grouplab` (removed); value columns left-align via a `toktable` modifier
  (the shared `.ctable .mcol` centring stays for the contrast table); typography composites drop the font
  fallback stack (show the primary face only) and show the FULL composite — family · weight · size ·
  line-height · tracking. `ResolvedType` gained `fontFamilyStack` (CSS keeps the full stack via write-adapter)
  + optional `lineHeight`/`letterSpacingEm` (additive; no emit change).
- **Deferred to GH issues** (owner uses Issues for the backlog now): token list rendered *from `buildTree()`*
  for 1:1 export alignment + show-all-tokens; Layout controls-near-previews restructure (+ grid columns →
  curated `4/6/8/12/16/24`, "Narrow container" → "Content container"); Size & radius controls-near-previews.
- **Verified:** engine 925/925; `tsc` clean; build clean; `out/*` byte-identical; Playwright drove Preview
  (SG first + default, no UI tab), the token list (uppercase heads, left-aligned values, `Inter · 400 · 16px
  · 1.5 lh · 0em` composite), and the Disabled example updating live on both the strategy select and the floor
  slider (+ floor de-indented, hidden when conventional).
## (2026-07-29) — Typography: tier split + two new type levers (engine + web)

**STATUS: engine + dashboard.** Owner review of the Typography page turned into an architectural
pass. Two engine levers landed first (both no-ops at their defaults ⇒ `out/*` byte-identical), then the
page was rebuilt on the primitive/semantic tier line. Issues: #270, #271, #272 closed; #267/#268/#269
opened for the parts that are genuinely separate.

- **Brand-editable leading/tracking rungs (#270).** `TypographyInput` gains `lineHeights` /
  `letterSpacings`, re-anchoring what a named rung is WORTH without changing the rung set. Previously
  the twelve rungs were hardcoded constants no brand could touch, and the only way to move them was a
  per-mode raw-value override — the one shape #176's decision 2 rules out, and one that never reaches
  Figma (text styles bake leading/tracking). The per-mode merge now rebases on the brand's ramp rather
  than the const, so a brand re-anchor survives a mode that overrides a different rung.
- **Per-group leading/tracking nudge.** `leadingShift` / `trackingShift`, in rungs. The engine derives a
  size-sensitive rung per composite (`title` runs compact→snug→tight as it grows); the nudge SHIFTS
  that curve rather than replacing it, so the craft survives. This is the semantic re-point the page
  needed, and it stays inside "everything aliases a primitive".
- **The page (#272)** splits into **Foundations** (typefaces · size ladder · weight scale · leading &
  tracking) and **Styles** (weight roles · category setup · responsive · full ramp). Things that did not
  previously exist anywhere in the dashboard: the **22-rung size ladder** (rendered nowhere), the
  **displayCeiling / titleFloor** levers (advanced, no panel rendered them), the **generated `clamp()`
  and mobile floor**, and **font-availability detection**.
- **Font availability** is canvas text-metric based — no network — so it works identically in the plugin
  iframe under `networkAccess: none`. It closes a real trap: the dashboard loads no webfonts, so a
  correctly-spelled family the viewer lacks previewed silently as the fallback. (This is the pragmatic
  half of #113; enumeration/upload stay parked.)
- **#271 fixed** — Responsive sizing wrote global state from inside a mode with no signal at all.
- **Copy** — dropped "switch to a mode to retune leading/tracking there": true but misleading, since no
  global lever existed behind those ramps, "a mode" excluded Light *and* every derived mode, and
  per-mode leading never reaches Figma.
- **Surfaced, not hidden:** requested-vs-effective display ceiling (aurora asks 128px, gets 112px), and
  the fixed mobile curve MERGING sizes (aurora's `display.sm + display.md + title.2xl` all land on 40px —
  identical on a phone).
- **Verified:** 941/941 engine tests (15 new); nb-regression exits 0; every alias resolves + every mode
  contract passes for all three brands; `out/*` byte-identical; `tsc --noEmit` + esbuild clean; Playwright
  walk of both tabs in light and dark with no console errors.
- **Open, tracked:** the two-tier font-family model — typeface primitives + fixed family-role semantics,
  mono optional (#269); the mode-switcher scope question this exposed (#268); and the primitive/semantic
  audit across the remaining pages (#267), for which this page is the first worked example.

---

## (2026-07-29) — Preview: Style guide sub-view (web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`; byte-identical). Adds a fourth
Preview segment beside UI preview / Contrast contracts / Token list, per owner request for a view that reads
like real UI and shows every color role *in situ* — the evocative counterpart to the exhaustive Token list.

- **`renderPreviewStyleGuide`.** Seven `.psec` sections (via `palSection`/`subHead`): Background, Foreground
  (neutral / bold / subtle), Text color (a **Light | Inverse** side-by-side list keyed to the current +
  opposite mode; headers name the actual modes so they stay correct in dark/HC), Border, Icon, Disabled, and
  Interactive (each palette's filled/outline/inverse treatments walked across rest/hover/pressed as **button
  sets in rows**, sized to the Interactive page's `.chip`). Specimen layout is namespaced `sg-*`.
- **Reads live** from `resolveAllModes(theme)`, driven by the global mode picker (no local mode state) — it
  re-resolves on every edit and mode switch. Contract misses surface a small inline mark.
- **Pills carry the resolvable path** (doc-26 contract): the visible label is the semantic role in the real
  `color.*` namespace (`sgPill` prefixes it); the resolved primitive + hex + contrast reveal on hover. Short
  contextual leaf labels (`fill.rest`, `on-fill`) stay bare under a namespaced block header.
- **Verified:** `tsc --noEmit` clean; esbuild OK; Playwright drove Preview → Style guide (harbor) in light +
  dark — 7 sections, no console errors, inverse column flips polarity; all 71 `color.*` pills navigate
  `buildTree(harbor)`. `out/*` byte-identical. (First landed with bare pills; corrected to `color.*` per PR
  #261 review.)

---

## (2026-07-26) — Preview cleanup: thorough UI gallery, grouped token list, richer motion/breakpoint previews (web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`). A cleanup pass over the
Preview destination + two specimens, per owner request ("make the previews the best they can be; the big
UI preview thorough + elegant; a token name next to everything").

- **UI gallery rebuilt (`renderPreviewGallery`).** Each component is a titled group; **each variant is now
  its own card** — the live-rendered component on a mini page-surface, the variant name, the **full token
  breakdown** (every binding → a labelled pill: surface / text / border / radius / padding / type / shadow
  / icon …, so nothing on screen is untraceable), and that variant's own contrast receipts. Replaces the
  old chips row + aggregate 6-pill footer.
- **Token list grouped (`renderPreviewTokens`).** Within each category `.psec`, rows are sub-grouped by
  top-level path segment (Color → background / border / text / interactive / icon / foreground / disabled /
  field / …; Dimension → radius / space) with a labelled mini-table each, so the long Color list is
  scannable instead of one flat alphabetical run.
- **Motion specimen.** Each transition row now plots its **easing curve** (an SVG cubic-bezier, 0→1) beside
  the timing bar — the bar shows speed, the curve shows the shape of the acceleration.
- **Breakpoint specimen.** Added a proportional **min-width ruler** — the breakpoints on a shared axis, so
  the responsive steps read spatially (how far apart the jumps are), above the existing grid table.
- Dead gallery CSS removed (`.chips`, `.pv-paths`, `.pv-contrasts`, `.tpill.more`).
- **Verified:** `tsc --noEmit` clean; esbuild OK; Playwright light screenshots of the gallery, token list,
  Motion, and Layout show the new structure; no console errors. `out/*` byte-identical.
- **Open question logged:** whether/when to drive the dashboard *chrome* from engine-generated tokens
  (dogfood) + enable a dark tool-theme — recommended as its own arc; reverses doc-26's "chrome stays light"
  note, so needs an explicit decision.

---

## (2026-07-25) — Geometry & type pages rolled onto the doc-26 language (#72, web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`). Brings the five pages that
predated the shared design language onto it, so the whole dashboard reads as one system.

- **Shell.** Every editor section + specimen now sits in a `.psec` container with a `.psec-t/.psec-d`
  header (via `palSection`). Retired the three competing header styles — `sectionHead` (`.section-lab`),
  `subHead`-based `objEditor`, and the `.adv-obj`/`.adv-obj-h` bespoke editors — along with the now-dead
  `panelOfLevers` / `renderAdvancedPanel` helpers and their CSS.
- **Grouping.** **Size & radius** regrouped by *concept* — Corner radius (anchor + softness) · Density &
  size · Spacing grid — instead of the old advanced/not split that scattered radius across two boxes.
  **Motion** promoted Easing out of "advanced" into its own section beside Tempo. **Layout** split into
  Breakpoints + Grid & containers. **Typography** kept its (already good) grouping but each section is now
  a `.psec`.
- **Token pills.** Every ramp specimen row now shows its real, resolvable path (verified against
  `buildTree`): `radius.*`, `shadow.*`, `size.*.height`, `type.<group>.<size>.<weight>`,
  `motion.duration.*` + `motion.easing.*`, `breakpoint.*`, `container.*`. Clears the "ramp-page pills
  deferred" debt in doc 26.
- **Preview** was left as-is (its pills + master table already conform); only its token-list header
  cosmetic remains, noted in doc 26 as ◑.
- **Verified:** `tsc --noEmit` clean; esbuild OK; Playwright light screenshots of all five pages show the
  `.psec` shell, concept grouping, and live pills; no console errors. Engine untouched (`out/*` byte-identical).

---

## (2026-07-25) — Interactive page rebuilt as a per-palette matrix (#69, web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`). Consumes the ENG-1/ENG-2
roles landed in #240 to rebuild the Interactive page to the owner-approved Prism2-model layout.

- **Structure.** Cross-cutting behaviours grouped at the top — **Outline button hover** (`outlineInteraction`),
  **Disabled** (`disabledStrategy` + nested `disabledMin`), **Icon colors** (`iconContrast`) — each a `.psec`
  with a lead select + a hand-built rest→hover / enabled→disabled / match→distinct example. Then **one section
  per action palette** (Primary / Neutral / Destructive / promoted accents + an add row), each a stack of
  full-width **slot rows**: Fill · rest, Fill · inverse, Text · rest, Text · inverse, Overlay wash, On-fill,
  On-fill · inverse.
- **Row anatomy (reuses the Surfaces atoms).** 56×56 swatch · mid (label + Source select + `color.interactive.*`
  token pill + description) · a 300px example locked right with its contrast receipt · (fill/text/overlay) a
  two-up Hover/Pressed states strip, indented to align with the title column, stretched to the right edge.
  Buttons carry a trailing arrow; the overlay wash paints honestly via rgba.
- **Binding (every control is real).** `fill.rest`'s Source is the column **fill anchor** (re-derives the
  family; per-mode via `modeAnchors` outside Light); **every other slot + every state** is a surgical **A1
  per-mode override** (`overrides[mode][role] = {palette, step}`, reusing `setFillOverride`) — "Auto" clears
  it back to the derived value. Primary leads with the **Action palette** choice; Neutral leads with the
  **Button emphasis** (subtle/strong `neutralEmphasis`).
- **Retired.** The standalone `renderInverseSpecimen` + `renderIconSpecimen` (and the old `renderCard` shell /
  `renderInteractiveCard` / `renderGroupedPanels` path) — the on-inverse family is now first-class rows and
  the icon payoff is the Icon-colors example; dead CSS removed with them.
- **Verified:** `tsc --noEmit` clean; esbuild bundle OK; Playwright screenshot (light) shows every slot
  resolving with live contrast receipts (fill 6.42:1, inverse 14.09:1, …); engine tests 925/925 (unchanged).

---

## (2026-07-25) — Interactive token family expanded: per-state text + full inverse column (PR #240, ENG-1/ENG-2)

**STATUS: engine change** (behavioral generation change to the `interactive.*` family), backing the
Interactive-page dashboard rebuild (#69, follow-up). Two gated increments:

- **ENG-1 — per-state text.** `interactive.<color>.text` (single ink) → `interactive.<color>.text.{rest,hover,pressed}`.
  rest is the gated pick; hover/pressed **walk the palette toward more contrast** (mirroring the fill states,
  so an outline/text control "comes forward" on engage). Neutral has no palette position to step, so its
  states collapse onto rest. Downstream rebindings: `button.ts`/`icon-button.ts` maps, `preview.ts` spec,
  `read-back.ts` slot-scope contract. The emit-figma scope map already keys on the slot segment, so
  `text.{state}` inherits `TEXT_FILL` unchanged.
- **ENG-2 — full inverse column.** `interactive.<color>.on-inverse` (single ink) →
  `on-inverse.{fill.{rest,hover,pressed}, text.{rest,hover,pressed}, on-fill}`, each generated + contrast-
  verified against `background.inverse.primary`. The inverse **fill** is anchored at the light/dark extreme
  (reads as an inverted CTA; keeps its `on-fill` ink clean, not a pure-black fallback); inverse states walk
  toward **more** contrast on the dark band — `walk` gained an optional direction override (`-dir`) for this.
  `emit-figma-color.ts` `colorScopes` reads `seg[4]` when `seg[3]` is `on-inverse` (text→`TEXT_FILL`,
  fill/on-fill→paint). `button.ts` on-inverse label → `on-inverse.text.rest`; `main.ts renderInverseSpecimen`
  re-pointed to the new ink leaf (PR-review catch — the old single leaf is gone).

- **Decisions of record:** (1) the inverse column is *generated + gated*, not a hand-mirrored twin
  (consistent with the existing on-inverse stance); (2) the *derived* inverse fill is a gated light/dark
  palette step (not forced white) — the dashboard's per-slot source select lets a practitioner override to
  white/any step; (3) `border` was **not** expanded to per-state (the approved layout has no border row).
- **Blast radius:** additive under `interactive.*` only — palette/background/foreground/text/gradient leaves
  are byte-unchanged; per brand +30/−6 leaves (3 colours × [3 text states + 7 inverse-column slots]); the
  336→432 contract bump is all-passing. NB regression unaffected.
- **Verified:** engine tests 925/925; nb-regression exit 0; emit-dtcg 432/432 mode contracts pass, aliases
  resolve per brand; regenerated `out/*.tokens.json`, `out/*.ai.json`, `out/figma/*`, `modes-report.md`,
  `schema/preview-spec.json`. (PR #240 also bundles the Surfaces & fills row-layout overhaul (#68), the
  neutral palette-row alignment fix (#67), and the doc-13 Southleft/Zinnia inspiration reviews — web/docs
  only, no `out/*` impact.)

---

## (2026-07-23) — Status snapshot: plugin write scope + typography now unblocked

**STATUS: orientation note (no code change).** Consolidating where the Figma-plugin write scope stands
and correcting a stale "typography is decision-blocked" framing that no longer holds.

**Plugin write scope — what materialises into a live Figma file today:**
- ✅ **Colour** (#108) — `core-palette` + `color`, per-mode alias-bound.
- ✅ **FLOAT variables** (#148) — `core-dimension`/`space`/`radius`/`size`/`border-width`/`focus`/
  `opacity`/`layout`, cross-collection aliases + per-breakpoint layout modes.
- ✅ **Shadow + gradient Styles** (#151) — Effect Styles (`shadow/*` + `shadow-dark/*`) + Paint Styles
  (baked-RGBA gradient stops + angle→`gradientTransform`, web-parity verified).
- ⏭ **Typography** — the LAST unwritten axis. **No longer decision-blocked:** #112 (type model) is
  owner-resolved, #115 (Token Press round-trip) is closed, and **#105 (engine type-model expansion) is
  closed AND implemented** — `theme.ts` carries the italic axis (`italic` on composites → `fontStyle`),
  the extensible weight-role set (`WEIGHT_ROLE_DEFAULT` incl. `max: 900`), and per-category weight/italic
  selection. The engine *generates* full typography and the emit builders exist (`buildFigmaFont` →
  `core-font`, `buildFigmaFontFluid` → `type-sets`, `buildFigmaTextStyles` → Text Styles). The only gap
  is the **plugin write executors** (font/type-sets variables + `createTextStyle`). Filed as **#237**.
  New risk surface there: `loadFontAsync` is async + can fail if a family/style isn't available in that
  Figma (the #113 name-resolution concern made concrete).
- ⏭ **Variable-linked gradient stops** — #151 bakes resolved RGBA; binding stops to `palette/*` so
  gradients re-theme live is a small fast-follow. Filed as **#236**.

**Health check (verified on `main` @ this date, off the Google-Drive move):** `plugin/` untouched since
#151, but the ~150 tests of web/engine work since (componentization arc #211–#218, Palettes/Backgrounds
card rework, danger-palette #234, neutral-Auto #231) did NOT break it — the shared-UI/engine seam held:
plugin two-context typecheck clean, build clean, **0 `node:` in `dist/main.js` + `dist/ui.html`**, all 5
test suites pass. Web improvements flow into the plugin iframe for free.

**Decision issues #112/#113:** their CORE is resolved (shipped via #105) — but each retains a genuinely
*deferred* sub-item (#112: per-(category,size) link designation; #113: font-availability research /
upload). Left open on purpose, annotated to reflect "core done, tail deferred."

---

## (2026-07-23) — Danger always mints its own palette (stable re-pointable namespace)

**STATUS: engine change.** Fixes a token-architecture coupling in the red-primary Auto path. Previously,
when the brand primary was a saturated red (`inRedTerritory`), the engine set `roleToPalette.danger =
'primary'` and minted **no** danger palette — so every semantic danger token (`foreground.danger`,
`interactive.destructive.*`, `icon.danger`, `on-danger`, `-subtle`; ~39 leaves, verified in a generated
red brand) aliased **directly** to `{palette.primary.<step>}`. There was no `palette.danger.*` seam, so
switching danger to a distinct colour later would force re-aliasing every consumer.

- **Fix (`theme.ts`, red-reuse branch only):** mint a first-class `danger` palette whose steps are a
  **deep copy** of the primary ramp, and leave `roleToPalette.danger` at its default `'danger'`. Semantic
  danger tokens now alias `{palette.danger.<step>}` in *all* auto paths (reuse / greige-carve / non-red
  carve). The resolved danger *colours* are unchanged (byte-identical to before — danger already resolved
  against the primary ramp); only the alias **target** moves `primary → danger`. Re-pointing danger later
  is now a one-ramp re-seed, zero consumer churn. The redundancy (danger ≈ primary while shared) is the
  deliberate, owner-confirmed price for the stable contract, and it makes the red case consistent with the
  carve case that already minted `danger`.
- **Scope guard:** explicit `roleColors: { danger: 'primary' }` (a deliberate user coupling) is untouched —
  only the engine's *silent* red-territory reuse changed.
- **Blast radius:** no committed fixture output moved (aurora/harbor aren't red-Auto; Wendy's uses an
  explicit `error:` = brand-supplied branch). NB regression unaffected (`nbTheme()` doesn't take this path).
- **Verified:** engine tests 925/925 (M-05 updated + 3 new assertions: danger palette minted, steps
  duplicate primary, deep copy not shared refs); NB regression PASS; a generated red brand now emits 76
  `palette.danger` aliases (was 0) with danger primitives byte-identical to primary.
- **Relation to PR #233 (web):** #233's `roleToPalette` resolution becomes a harmless `danger→danger`
  no-op after this; its "via primary" anchor note simply stops firing. Independent PRs.

---

## (2026-07-23) — Palettes page: neutral lock direction + danger-reuse render fix

**STATUS: web-only, no engine change** (`out/*` byte-identical). Two Palettes-page bugs surfaced while
driving the latest UI:

- **Neutral source lock was inverted.** The padlock sat on the **Pinned color** swatch — the one source
  whose swatch is an editable color *picker* — while **Auto** and **Custom tint** (both read-out swatches
  derived from the scale) had none. Moved the lock onto the two read-out sources and dropped it from Pinned,
  so the padlock now marks "not directly editable," matching what the swatch actually does. Also removed the
  dead `locked` class (no CSS ever targeted `.prow.locked`).
- **Danger ramp collapsed to a white swatch under a red brand primary.** When the primary is a saturated
  red the engine *reuses* the primary palette for danger (`roleToPalette.danger = 'primary'`) and mints **no**
  standalone `danger` palette (theme.ts branch 3, `inRedTerritory`). The web `statusRow` looked up the palette
  by the literal role name (`'danger'`), missed, and rendered empty bands + a white swatch. Fixed by resolving
  the Auto source through `theme.roleToPalette[role]` (the same mapping the Interactive page's Destructive
  column already uses) — the ramp now paints the reused red and the anchor reads **"via primary"** so the
  reuse is legible. Explicit borrow and Custom hue paths are unchanged. Verified headless: red primary →
  all four status ramps render 20 steps; neutral lock present on Auto/Custom, absent on Pinned.

---

## Latest (2026-07-21) — Dashboard componentization arc (C1–C6, PRs #212–#218)

**STATUS: web-only, no engine change.** A systematic pass giving every repeated dashboard control/atom a
single definition, so a styling or behavior change lands in one place (owner's driver: "tweak the
select/dropdown styling in one spot"). Full ranked audit + per-item detail + the (empty) UI fix log live
in **`docs/24-ui-components-and-fixes.md`** — this is the summary.

- **C1 `selectEl` + `.select`** (#212) — the dropdown: 5 styling paths across 16 sites → one base + `sm`/`fill`/`cap` modifiers. (The one consolidation with intentional normalization; verified by drive-through, not DOM-parity.)
- **C2 `numberField` + `.num`** (#213) — 7 sites, 4 classes → base + deltas.
- **C3 `toggleField`** (#214) — unified `renderControl` + the gradient section's duplicated switch (#210).
- **C4 `tokenPill` / `addButton` / `removeButton`** (#215) — the repeated display atoms.
- **C5 `stepPicker` convergence** (#216) — interactive card onto the shared picker (numeric-anchor ↔ key-string bridge).
- **C5b `rangeInput`** (#217) — the range element factory (construction only; readouts stay per-site).
- **C6 `objEditor`** (#218) — the object-editor section scaffold.

Every PR verified (tsc + esbuild + drive-through) and merged with a clean independent review. **Scoped-out
as non-gaps** (documented in doc 24): `colorField` (intentional per-context well sizing), knob-routing
(bespoke structures), neutral/background pickers (different shapes). No bugs surfaced during the arc — the
doc-24 fix log is intentionally empty.

**Next:** UI fix log stands ready for findings; the `style-guide-generator` assessment (Token Press
external, `assess/token-press-external`) is the active investigation.

---

## (2026-07-21) — Gradient editor (edit the definition, not just on/off)

**STATUS: web-only, no engine change.** Closes PR-3. The gradient axis was on/off only (the toggle wrote
`gradients: true|false`); this edits the **definition** — kind, geometry, interpolation, and the
ramp-aliased stops — writing an explicit `GradientInput[]` to `brandState.gradients`.

- **`renderGradientsSection`** replaces the generic `gradients` lever panel on the Surfaces page with a
  bespoke on/off toggle (its own `applyFull` so the editor mounts/unmounts — it lives in the sections
  layer, not the volatile specimens) plus, when on, one editor card per gradient and an **+ Add
  gradient** button (fresh linear gradient, auto-unique slug name).
- **`renderGradientCard`** — live preview (`inputGradientCss`, resolved through the ramp) · **Kind**
  (linear/radial) · **Angle** slider (linear) or **Shape** + **Center X/Y %** (radial) · **Interpolation**
  (OKLCH/sRGB) · a **Stops** list. Each stop aliases the ramp — a palette select → a step select (the
  step list re-homes to the new palette's nearest step) → a position % — with add/remove (kept ≥2).
- **`true` materialises** to the engine's default single brand gradient (`primary` 600→350, 135°) for
  display; the first edit writes the explicit array. An empty array collapses back to `false` (off) so
  toggle + specimen agree. Stops always alias the ramp (palette + step), never raw hex — the engine's
  themeable model.

**Verification:** `tsc` + esbuild clean. Playwright: aurora's **two** gradients round-trip (`brand`
linear + `glow` radial, centre `[0.5,0.4]` → 50/40); editing a stop's step repaints the preview;
kind linear→radial swaps the angle field for shape + centre; add-stop 2→3; add-gradient 2→3 and the
engine-resolved specimen shows 3 (so the emitted array validates); on a no-gradient brand (harbor) the
toggle On materialises the default `brand` gradient and the engine resolves it. No console errors.
Screenshot reviewed. No engine files touched.

**Next:** PR-2 arc + gradient editor complete. The Figma-plugin / Output work is the next focus per the
owner. Progress entry rides in this PR.

---

## (2026-07-21) — Backgrounds on the reusable card (docs/23 §2)

**STATUS: web-only, no engine change.** Closes PR-2d: the per-mode page-surface editor
(`renderSurfacesEditor`, "Backgrounds") now renders on the shared `renderCard` shell, so Backgrounds /
Foregrounds / Interactive / Text&ink are one visual system — change the card once, it changes
everywhere.

- **Each surface mode (Light / Dark) → a card.** Swatch = the resolved page background for that mode
  (`rp.colors['color.background.primary'][mode]`, so it repaints live); the `Base surface` picker is the
  white/black/neutral-step select; token pill = `background.primary`. Laid out in the same `.fill-grid`
  as the fill cards, `compactSwatch`.
- **Contrast floor kept as a secondary control** — appended below the card body (`.bg-floor`, a
  top-bordered row mirroring the interactive card's states row) rather than hidden. Auto unless pinned.
- **`apply()` → `applyFull()`** on both selects: the card carries a swatch now, so the base change has
  to re-render the workspace to repaint it (the old select-only editor could get away with the lighter
  `apply()`). Same rebuild the fills/text cards use.

**Verification:** `tsc` + esbuild clean. Playwright on Surfaces: 2 cards `[Light, Dark]`, both token
pills `background.primary`, both floor labels present; **base swatch repaints across values** (default
`rgb(233,233,234)` → Neutral 300 `rgb(167,167,170)` → Neutral 850 `rgb(33,33,36)` → White
`rgb(255,255,255)`); base + floor selections hold; no console errors. Screenshot reviewed — visually
matches the fill cards. No engine files touched.

**Next:** the gradient editor (PR-3). Progress entry rides in this PR.

---

## (2026-07-21) — Remove all "Advanced" disclosures, expose the UI uniformly

**STATUS: web-only, no behaviour change.** Owner decision (code-review finding #2, expanded): drop the
progressive-disclosure "Advanced" affordance entirely — every control is shown at the same level, so a
lever's `advanced` flag in the manifest no longer hides it behind a click.

- **`renderAdvancedPanel`** no longer wraps its levers in a `<details class="adv"><summary>Advanced</summary>`.
  It renders the same `.adv-panel` (manifest-`advanced` scalar/enum controls + the optional bespoke
  object editors) directly into the host as a normal always-visible panel. Signature and call sites
  unchanged — only the wrapper disappeared.
- **CSS removed:** `.adv`, `.adv-sum` (+ `::-webkit-details-marker`, `::before`, `[open]` marker). Kept
  `.adv-panel{margin-top:12px}`. Two stale comments (responsive-editor docstring, breakpoints `commit`
  closure) that reasoned about "the disclosure snapping shut mid-edit" rewritten — the concern is moot
  now, but `commit` still uses `draw()`+`apply()` (not `applyFull()`) to avoid rebuilding the editor
  under the user's cursor.

**Verification:** `tsc` + esbuild clean. Playwright across Typography / Size&radius / Motion / Layout:
`advanced-disclosures = 0` everywhere (was ≥1 per page); previously-hidden levers now visible in a
second panel (e.g. Size&radius shows Radius anchor / Spacing rhythm / Fine grid base); bespoke obj
editors present; no console errors. Screenshots reviewed. No engine files touched.

**Next:** Backgrounds on cards (PR-2d), then the gradient editor. Progress entry rides in this PR.

---

## (2026-07-21) — Neutral as an interactive card (docs/23 §2, retires the specimen)

**STATUS: web-only, additive.** The neutral / default button is now a proper interactive card alongside
Primary / Destructive (owner request #2A), replacing the disconnected standalone "Neutral emphasis"
specimen.

- **`renderNeutralCard`** — same `renderCard` shell + interactive-states section as the other columns,
  but its control is the (global) `neutralEmphasis` toggle (subtle grey vs bold fill) rather than a
  per-mode anchor step. Appended after Primary/Destructive in `renderInteractiveCards`.
- **`neutralEmphasis` moved off the panel onto the card** — removed from `INTERACTIVE_GROUPS` **and**
  filtered out of `leversFor('interactive')` so `renderGroupedPanels`'s catch-all doesn't re-surface it
  under "More" (caught in verification).
- **Removed** the dead `renderNeutralSpecimen` + its `.ne-*` / `.neutral-spec` CSS.

**Verification:** `tsc` + esbuild clean. Playwright drive-through: interactive cards are now
`[Primary, Destructive, Neutral]`; the standalone neutral specimen is gone (0); `neutralEmphasis` no
longer appears in any panel; flipping the card's emphasis re-derives the fill (grey `rgb(206,206,208)` →
bold `rgb(44,44,47)`); no console errors. Screenshot reviewed. No engine files touched.

**Next:** Backgrounds on cards (PR-2d), then the gradient editor. Progress entry rides in this PR.

---

## (2026-07-21) — Foregrounds editor (fills as cards) on the reusable card

**STATUS: web-only, additive feature.** Closes the "Foregrounds" gap from the `docs/23` §2 IA (the fill
roles had no UI control — they were engine-derived only). Owner confirmed exposing **both** families.

- **`renderForegroundsEditor`** on the Surfaces page (between Backgrounds and Text & ink): a grid of
  compact `renderCard`s, one per fill role — the bold semantic fills (`foreground.brand` /
  `.success` / `.warning` / `.info` / `.danger`) and the neutral surface tiers (`foreground.primary` /
  `.secondary` / `.tertiary`). Each card = swatch · an **Auto + palette-step picker** (`stepPicker`,
  audit §8 candidate #3) · the `foreground.*` token pill · a contrast badge (bold fills only; the
  surface tiers aren't contrast-gated so they omit it).
- **Overrides via the A1 layer, no engine change.** The picker writes `brandState.overrides[mode][role]
  = { palette, step }` keyed to each role's own palette (`roleToPalette`), pruning back to Auto — same
  mechanism as Text & ink. Customizable modes only; derived modes stay the read-only note.
- **`renderCard` gained `compactSwatch`** (72px) for the denser fill grid; `stepPicker` is the shared
  Auto+steps select.

**Verification:** `tsc` + esbuild clean. Playwright drive-through: 8 fill cards render with the right
labels/palettes; **overriding Brand to step 950 re-derived the fill** (swatch `rgb(94,75,195)` →
`rgb(13,3,45)`) and the picker held the selection — the override round-trips end-to-end; no console
errors. Screenshot reviewed. No engine files touched.

**Next:** PR-2c — Backgrounds on cards + Neutral as an interactive card; then the gradient editor.
Progress entry rides in this PR.

---

## (2026-07-21) — Reusable color card (foundation) + componentization audit (`docs/23` §8)

**STATUS: web-only, DOM-identical refactor + docs.** First slice of the color-card work (owner request to
reuse the interactive-card styling for fills). Extracts the card into a reusable component and records the
component inventory so later extractions build against an agreed list.

- **`docs/23` §8 — component inventory + componentization audit.** Living list: what's extracted (control
  kit, screen scaffold, rail-as-data, table renderers) and the ranked next-tier candidates
  (`contrastBadge`, `swatch`, the override step-picker, `tpill`, a specimen frame, an obj-editor wrapper).
  Rule: extract only at ≥2 real callers. Feeds Phase 5 self-theming.
- **Card component extracted.** New `renderCard(opts)` shell (header · big swatch · picker + token pill ·
  optional example · desc + optional badge) + shared `contrastBadge(ratio, min, label?)` and
  `swatch(hex, cls?)`. `renderInteractiveCard` now composes through `renderCard` (appending its own
  interactive-states section) instead of hand-rolling the DOM.

**Verification:** `tsc` + esbuild clean. A Playwright DOM-parity harness rendered the **Interactive** and
**Preview** pages on `origin/main` vs. this branch — **byte-identical** (25,872 / 21,456 chars), so the
migration changes nothing visible. No engine files touched.

**Next:** PR-2b — the **Foregrounds** editor + **Backgrounds** on cards + **Neutral** as an interactive
card, all on `renderCard` (the `foreground.*` fills are engine-derived; the A1 override layer repoints
them, no engine change). Then the gradient editor. Progress entry rides in this PR.

---

## (2026-07-21) — UI polish: toggle switch + code-review nits

**STATUS: web-only, additive polish.** First of a UI-refinement series (owner feedback after the reorg):

- **Toggle → switch.** `.knob input.toggle` was a native checkbox; it's now a proper switch (pill track +
  sliding thumb, ink when on) via `appearance:none` + `::after`. Kit-level, so it upgrades every toggle
  lever (gradients + inverse) at once.
- **Rail sticky offset now measured** (code-review nit): `.rail{top:calc(var(--chrome-h,120px)+10px)}`;
  `renderModeStrip()` sets `--chrome-h` from the actual header height. A brand whose mode chips wrap to a
  second row no longer tucks the rail under the sticky header (was a hardcoded `top:130px`).
- **Dead `.stage-view` class removed** (code-review nit) — it was applied to the Preview rail item but had
  no CSS rule after the ordinal was dropped.

**Verification:** `tsc` + esbuild clean; Playwright drive-through confirmed the switch renders + toggles in
both states (grey/thumb-left off, ink/thumb-right on), `--chrome-h` measures live (145px on the example),
no console errors. No engine files touched.

**Next in the series:** PR-2 — a reusable color-card component with the Foregrounds editor + Backgrounds on
cards + Neutral as an interactive card (owner request; the `foreground.*` fills are engine-derived today
with no UI control — the A1 override layer supports repointing them, so no engine change needed). PR-3 —
a gradient editor (stops / angle / kind; UI currently only toggles gradients on/off). Progress entry rides
in this PR.

---

## (2026-07-20) — Dashboard Phase 4b: Preview segmented sub-views + token list (`docs/23` §7)

**STATUS: web-only, additive.** The Preview destination gains a **segmented view-switcher** with three
views, completing the `docs/23` §7 Preview shape:

- **UI preview** — the component gallery (extracted from the old `paintPreview`; unchanged).
- **Contrast contracts** — the full all-modes master table, now a first-class view (was a closed
  disclosure inside the gallery). Reuses `contractTableEl`.
- **Token list** — NEW: the resolved token set, category-grouped (**Color · Dimension · Typography ·
  Shadow**) with values per mode. Colour = every resolved semantic role (`resolveAllModes`) as a
  swatch + hex per mode; Dimension = the px scale (`rp.dims` + per-mode `dimOverrides`); Typography =
  resolved composites (family · weight · size, mode-invariant); Shadow = the elevation ramp's CSS
  `box-shadow` per mode. Built entirely from the resolved read-model — no engine change.

`paintPreview` was split into `renderPreviewGallery` / `renderPreviewContracts` / `renderPreviewTokens`;
`renderPreviewPage` renders the `.pvseg` switcher (state `previewView`, defaults `ui`) and dispatches;
a segment click re-renders the page. Ramp primitives stay on Palettes; the token list is the semantic +
dimension/type/shadow layer.

**Verification:** `tsc` + esbuild clean. Playwright drive-through on Preview: three segments switch with
correct active state; UI preview shows 8 components, Contrast 32 rows (the master table), Token list the
four category sections (4 tables, per-mode swatches); no console errors. Token-list screenshot reviewed.
No engine files touched. This completes Phase 4. Progress entry rides in this PR.

---

## (2026-07-20) — Contrast-table follow-up: token-path labels + exhaustive partition

**STATUS: web-only, refines #201.** Two small changes to the per-section contrast tables:

- **Token-path pair labels (owner request).** The per-section tables now lead with the raw `fg on bg`
  token path (mono, e.g. `text.primary on foreground.primary`) with the human description as a faint
  subtitle — the component context is obvious next to the controls, so the path is the useful primary.
  `contractTableEl(contracts, paths?)` gained the flag; the Preview **master** table keeps its
  descriptive `component · variant — label` (verification-of-record).
- **Exhaustive partition (review nit on #201).** Replaced the two hard-coded component lists with one
  `SURFACE_CONTRACT_COMPONENTS` set + an Interactive catch-all, so the surfaces/interactive split covers
  every contract **by construction** — a component added to the preview spec later can't silently vanish
  from the local tables; it lands on Interactive automatically.

**Verification:** `tsc` + esbuild clean; drive-through unchanged (Surfaces 7 + Interactive 25 = 32 =
master; Motion none; no console errors); screenshot of the token-path table reviewed. No engine files
touched. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard Phase 4a: per-section contrast tables (`docs/23` §3)

**STATUS: web-only, additive.** The "local proof" half of the hybrid contrast model: each colour page
now carries a scoped **Contrast on this page** table — the same authoritative contracts the Preview
master table shows, re-sliced to the components that page governs.

- Extracted `contractTableEl(contracts)` (the Pair · per-mode dot+ratio table) from `paintPreview`; the
  Preview master table now calls it too — one renderer, two callers.
- `PAGE_CONTRACTS` maps colour pages → their components (`surfaces`: typography + card; `interactive`:
  button / button-secondary / input / nav-item / badge / alert); `renderSectionContrast(page)` re-slices
  `rp.contracts` and renders a collapsed disclosure in the page's volatile region (repaints on edit).
- Only the two colour pages govern contrast pairs, so only they get a table; non-colour pages get none.

**Verification:** `tsc` + esbuild clean. Playwright drive-through: Surfaces shows **7 pairs**, Interactive
**25 pairs**, and **7 + 25 = 32 = the Preview master table** exactly — every contract on precisely one
page's scoped table, none orphaned; Motion (non-colour) has none; no console errors. Screenshot of the
Surfaces table reviewed (card + typography pairs, all four modes, green). No engine files touched.
Progress entry rides in this PR. **Next (4b):** Preview segmented sub-views (UI / contrast / token list).

---

## (2026-07-20) — Dashboard Phase 3b: focused pages + rail-as-data (`docs/23` §7)

**STATUS: web-only, visible reorg (part 2 — completes the Phase 3 IA split).** Splits the two catch-all
editing stages into **focused, single-concern pages** and makes the rail **data-driven**.

- **Rail-as-data.** `STAGES`/`stageOfLever` → a `NAV` config + `pageOfLever`. The rail renders from
  `NAV` (nine destinations), **no ordinals** (top-to-bottom order carries the compose sequence), a
  divider before the `view` destination (Preview).
- **Focused pages.** The old *Semantic* → **Surfaces / fills** (backgrounds · text & ink · gradients)
  + **Interactive** (action colour · states · a11y). The old *Form* → **Elevation** · **Size & radius**
  (size · density · radius) · **Layout** (breakpoints + containers, promoted from Advanced on a
  dedicated page) · **Motion**. *Palettes* (was primitives), *Typography*, *Preview* carry over. Each
  page's facets are **sections within it**, not rail rows.
- **Screen scaffold.** One `renderScreen(host, key, sections, specimens)` all editing pages compose
  through (hero → sections, or the read-only note on a derived mode → the volatile contextual specimens);
  `renderAdvancedPanel` factors the per-page Advanced disclosure. `pageOfLever` routes every lever to a
  page (status hues stay inline on Palettes; the `color`/`advanced` groups split by key). The double
  section headings on Surfaces were resolved (the bespoke editors self-head "Backgrounds" / "Text & ink").

**Verification:** `tsc` + esbuild clean. A Playwright drive-through walked **all nine pages** (example
brand, 1360×1050): rail shows the nine focused labels with one divider before Preview and **no numbers**;
every page renders its hero + controls/editors + contextual specimens (asserted knob/editor/specimen
counts per page — nothing orphaned); a header mode switch on Interactive re-renders in Dark; **no console
errors**. No engine files touched. Screenshots reviewed for Surfaces / Interactive / Size & radius. This
completes the `docs/23` §7 IA; Preview's segmented sub-views + per-section contrast tables are the next
follow-up. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard Phase 3a: global header + Preview tab (`docs/23` §7)

**STATUS: web-only, visible reorg (part 1 of the Phase 3 split).** Delivers the headline of the reorg —
the overall UI preview moves to **its own destination**, and the mode selector becomes a **persistent
global-header tier** — without yet re-partitioning the editing pages (that's 3b).

- **Two-tier global header.** `build()` now wraps a sticky `.chrome`: tier 1 = the brand bar (identity +
  Export); tier 2 = the mode-context strip, promoted out of the per-stage workspace (#171) into the header
  via a new `modeStripHost` + `renderModeStrip()`. `currentMode` persists across navigation; the strip
  shows on every page (inert where mode doesn't apply). `apply`/`applyFull` refresh it so its per-mode
  contrast ✓/✗ marks track edits; the menu/mode handlers repaint the strip in place.
- **Preview is its own tab.** New `renderPreviewPage` owns the component gallery + contrast contracts
  (the `paintPreview` that used to be **duplicated at the bottom of Semantic / Typography / Form**). The
  editing stages now render **only their contextual specimens** — the 3× duplication is gone. Preview sits
  in the rail after a divider, with no ordinal (a destination, not a build step).
- Deferred to follow-ups: Preview's segmented sub-views (UI / contrast / token list) + a per-section
  contrast table; the focused-page split (3b) and rail-as-data.

**Verification:** `tsc` + esbuild clean. A Playwright drive-through (example brand, 1360×1000) screenshotted
every page + a header mode switch: two-tier header renders, rail shows the 4 numbered stages + un-numbered
Preview after a divider, the Preview page shows the full gallery, **`.pvhost` count on an editing page = 0**
(duplication removed), and switching to Dark in the header re-renders the page in dark. No console errors
(favicon 404 only). No engine files touched. Progress entry rides in this PR.

---

## (2026-07-20) — `docs/23` Phase 3 interaction model (addendum, decided)

**STATUS: docs-only.** Adds §7 to `docs/23` recording the settled Phase 3 interaction model, so the
build runs against a spec. Decisions:

- **Rail** stays a flat clickable list, just re-grouped to the §2 groups (~9 items). Each item is one
  focused page; a page's facets are **sections within the page**, not separate rail rows; long pages may
  get anchor links. **No accordion/collapse** — the catch-all stages splitting across focused pages
  already removes the long-scroll problem.
- **Global header** (the "brand bar", promoted) is **two-tier**: identity + quick Export (tier 1), the
  persistent **mode selector** (tier 2). `currentMode` is global and persists across navigation. Chips
  exposed by default; overflow → active-pinned `More ▾` menu (never scroll), **deferred** until a brand
  needs it.
- **Rail vs header rule:** canvas destination → rail (authoring pages, **Preview**, future **Output**);
  quick action/menu → header (brand, mode, **Export**). **Preview is a rail leaf** with **segmented
  sub-views** (UI / contrast / tokens) in one screen.
- **No numbering**; a section-complete ✓ is **deferred** (needs a real save/done model — a false "done"
  is worse than none). Per-mode contrast ✓/✗ on mode chips stays (accuracy ≠ completeness).
- **Output / Style guides** is Figma-only and an **active canvas write** — it draws a real style-guide
  table onto the Figma canvas with live variable values (an existing owner-built plugin to be brought in
  and finished). Split as **channel-gated** functionality (present in the plugin host, hidden in web).

Phase 3 builds **rail-as-data** + the **screen scaffold** to this spec — now with real callers, per the
Phase 2 decision that shipped the control kit first. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard control kit (foundation refactor, `docs/23` Phase 2)

**STATUS: web-only refactor, DOM-identical.** First foundation stone of the `docs/23` reorg: a small
reusable **control kit** in `web/src/main.ts`, so a control (or a whole screen in the IA split) composes
from shared primitives instead of re-deriving the same DOM. Three primitives:

- `knob(label, body, desc)` — the `div.knob` scaffold (`label.knob-label` · body · `p.knob-desc`) every
  control shares. `renderControl`, `renderPerModeSelect`, and the read-only type-scale knob now build on it.
- `knobBody(...kids)` — the `div.knob-body` input+readout row (slider / toggle).
- `optionEl(value, text, selected)` — one `<option>` builder replacing the ~9 near-identical local
  `opt`/`optE`/`mkOpt` closures + inline loops (renderControl, per-mode select, interactive card, status
  ramp, surfaces, foreground, add-accent, mode-set base select, typography family select).

Deliberately **minimal** — no rail-as-data or screen-scaffold generalisation yet; those get real callers
only when the IA actually splits (Phase 3), so building them now would be abstraction ahead of use
(root `CLAUDE.md` §3 surgical / §2 no speculative abstraction). This ships the vocabulary Phase 3 clones.

**Verification:** `tsc --noEmit` + esbuild build clean; a Playwright DOM-snapshot harness rendered the
example brand across **all 4 stages × every mode (13 snapshots)** on `origin/main` vs. this branch and
found them **byte-identical** — the refactor changes nothing visible or behavioural. Bundle shrank ~840 B
(duplication removed). No engine files touched; `out/*` untouched. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard IA + component-system plan (`docs/23`, direction)

**STATUS: docs-only.** Captures a design-session decision to reorganise the web dashboard
(`web/src`) from four broad stages into **focused, single-concern sections** with the overall UI
preview promoted to **its own Preview tab** (today `paintPreview` is duplicated on Semantic /
Typography / Form). New doc `23-dashboard-ia-and-component-system.md` pins:

- **The target IA** — grouped rail: Palettes · Surfaces (Backgrounds / Foregrounds / Text / Gradients)
  · Interactive (colours / Disabled / Focus) · Typography · Elevation · Size & radius (Size / Density /
  Radius / Border-width slot) · Layout · Motion · Preview (UI gallery / all-modes contrast table /
  token list) · Output (Figma: Style guides / Components — deferred, own discovery).
- **Two control patterns** — free-colour screens vs **derived/contrast screens** (Text/ink, Focus):
  Text ink is neutral-ramp-derived with a per-mode **neutral-step override** (never an arbitrary hex),
  kept + flagged when below ratio; Focus is derived from the action palette (independent focus lever =
  net-new, not in scope); border-width has no lever (documented slot only).
- **Facts pinned** — density scales the component-size tier only (→ lives under Size, not Layout);
  contrast anchors (`text.primary`→`background.primary` 7:1, secondary/tertiary→floor surface); the
  engine already **re-derives on every edit and preserves+flags overrides** (behaviour to surface, not
  build); per-section contrast tables are a near-free re-slice of already-authoritative data.
- **Build underneath** — introduce an internal **component system** (screen scaffold + control kit +
  rail-as-data) so the reorg is declarative config, and eventually self-theme the dashboard from Prism3
  tokens (light/dark toggle). Sequencing: this note → foundation refactor (byte-identical) → IA split +
  Preview tab → per-section contrast tables → self-theming (later).

Process note: the `#189/#192/#194` progress entries were backfilled by `#191/#193/#195`; **go-forward,
the `00-progress.md` entry rides in the feature PR** (this entry included) rather than a follow-up round-trip.

---

## (2026-07-19) — Phase D code-review fixes (engine correctness + UI)

**STATUS: MERGED** (#194). Fixes from two independent code reviews of the per-mode override arc.

**Engine (`theme.ts` / `tree.ts`).**
- **Dark-based custom modes now inherit their base's reduced dark shadow** even without a `modeLevers.shadow`
  override. Built-in `dark` gets `modes.dark` unconditionally, but a `customModes: [{base:'dark'}]` mode had
  no such default — so it fell back to the light `$value` (a light shadow under a dark surface). `brandTheme`
  now seeds a `shadowByMode` entry from the global dark layers for every dark-based custom mode lacking an
  override (byte-equal to `modes.dark`; guarded so an explicit lever still wins) → they also emit their own
  `shadow-<mode>/*` Figma effect styles. (This closes the gap noted in the #190 consolidation entry: the
  earlier claim that "dark custom modes keep their entry" only held when they carried an explicit override.)
- **`modeLevers.light` is now rejected** — light IS the global baseline for the non-colour levers, so a
  `modes.light` override would shadow the canonical `$value`. The error points to setting the global levers.
- **Line-height / letter-spacing gained the map-level no-diff suppression** every other axis already had (a
  per-mode ramp equal to the global now leaves `modeLevers` off the Theme → byte-identical).
- Cleanup: one shared `gridStepOverride` (the two grid-override helpers were byte-identical) and one
  `diffAssign` for the JSON-compare no-diff suppression across radius/family/weight/LH/LS.

**Web (`web/src/main.ts`, net −63 lines).**
- The **breakpoints editor no longer collapses the Advanced disclosure** on each edit (`draw() + apply()`
  instead of `applyFull()`, which recreated the `<details>`).
- A shadow slider dragged to **exactly the global** value now prunes the override (no redundant `== global`
  entry); a hand-authored **non-discrete** per-mode value (e.g. `radius 0.7` from import) surfaces as its own
  `"0.7 (custom)"` option instead of misreading as Auto.
- Cleanup: `renderPerModeRadius/Tempo/Density` → one `renderPerModeSelect`; the duplicated per-mode
  `modeLevers` read/write/prune → one `getModeLever` / `setModeLever` / `pruneModeLevers` trio (the UI analog
  of the engine's `diffAssign`; the recursive prune generalises the old bespoke shadow-tint clearing).

Engine tests **909 → 917** (+8: dark-shadow seeding, `modeLevers.light` rejection, LH/LS suppression); NB
regression green; **`out/*` byte-identical** (no example brand exercises a dark-based custom mode or
`modeLevers.light`); web/plugin tsc + builds clean.

---

## (2026-07-19) — lever-UI completeness + interactive-accent manifest reconcile

**STATUS: MERGED** (#192). Closes out the lever-UI-coverage audit: **every manifest lever now has a working
UI control and every axis has a live specimen.**

**Web — remaining specimens + object/list editors.** Adds a **Layout specimen** (breakpoint / column / gutter
/ margin table + base-column strip + container-cap bars, reads `theme.layout`) and a **type-variants strip**
per group (the weights it ships rendered at weight, italic/link samples when shipped, and the size range so
`titleFloor` is visible). The advanced **object/list** levers that `renderControl` could only show read-only
get bespoke editors nested in the Advanced disclosure: **Responsive type** (`typography.responsive` fluid +
min/max viewport), **Breakpoints** (editable `layout.breakpoints` min-width list, dedup+sort+floor), and
**Emphasized easing** (`motionPersonality.easingEmphasized` cubic-bezier). All three write real `BrandInput`
paths (verified flow-through to resolved output).

**Manifest — reconcile the interactive-accent surface split.** The manifest advertised `accentPalette`
(control `palette-ref`) as the interactive-accent control, but it had **no live UI**, while the more capable
`interactivePalettes` (what the interactive cards edit + the preview renders) was **absent from the manifest**
— so the control contract read by the Figma plugin + MCP pointed at the wrong, UI-less lever. Fixed: the
manifest now lists **`interactivePalettes`** (control `list`, advanced) and drops the `accentPalette` lever.
`accentPalette` **stays a valid back-compat input** — its engine field, schema, accent≠action guard, and
byte-identical-to-`interactivePalettes` test are untouched; it's simply no longer advertised as a form control
(`interactivePalettes` wins when both are set). No web double-render (`interactivePalettes` is advanced+list →
excluded from both the lean and Advanced panels; the cards remain its editor). `levers.ts` ↔
`lever-manifest.json` kept in lockstep by the byte-drift guard test.

Engine tests **909/0** (incl. `accentPalette` back-compat + manifest-drift); **`out/*` byte-identical** (no
generation change); NB regression green; DTCG 336/336 + aliases resolve; web/plugin tsc + builds clean.

---

## (2026-07-19) — Phase D: per-mode density lever + Advanced-lever disclosure

**STATUS: MERGED** (#189). Two changes closing out Phase D's non-colour axes.

**Per-mode density (engine + web).** `ModeLevers` gains `density?` — a mode may run a different
component-density tier (`compact`/`comfortable`/`spacious`), re-deriving its `size.*` control heights +
paired padding via the same `componentSizes(density, spaceBase)` the baseline uses. The dimension analog of
the tempo enum. The `space.*` reference scale is **density-free by design**, so it's untouched — only the
`size.*` tier varies. Same seam as radius: a size sub-leaf (`height` / `padding-x` / `padding-y`) whose
per-mode px differs from light carries a `$extensions.prism3.modes.<mode>` override (height aliases the
dimension grid on-grid else literal; padding aliases the space scale on-scale else literal). No-diff
suppression (`lev.density !== density`) composes with the #190 suppression on the other axes → byte-identical
when unused. Validation is engine-side (`brandTheme()` throws on an invalid density or a density on a
generate-only mode); the schema documents it. Web: a per-mode density select (Auto-follows-global, like
tempo) + a new mode-aware **Control-size specimen** so the change is visible.

**Advanced-lever disclosure (web only).** The lean-default lever panels drop every `advanced` manifest
lever, which left eight scalar/enum levers with no UI control at all (`baseMd`, `spaceBase`, `baseUnit`,
`typography.displayCeiling`, `typography.titleFloor`, `layout.columns`, `layout.containerMax`,
`layout.containerNarrow`) — reachable only by hand-editing the brand input. Added the progressive-disclosure
affordance the manifest always intended: a collapsed **"Advanced"** panel per stage rendering that stage's
advanced slider/enum levers via `renderControl` (Form gets 6, Type gets 2). The lean panel (`!l.advanced`)
and the Advanced panel (`l.advanced`) are disjoint on the same filters, so nothing double-renders. Object/
list advanced levers keep their bespoke editors.

Engine tests **897 → 909** (+12 density: seam, density-free `space.*`, validation throws, design.md
round-trip, `validateBrandInput` acceptance, no-diff suppression); NB regression green; **`out/*`
byte-identical**; DTCG 336/336 contracts + all aliases resolve; web/plugin tsc + builds clean.

---

## (2026-07-19) — Phase D consolidation: no-diff suppression across all non-colour mode levers

**STATUS: MERGED.** Follow-up to the per-mode non-colour lever arc (#177–#188). The motion **tempo** lever
(#187) already suppressed its per-mode map when a mode's value equalled the global baseline (`tempo !==
baseTempo` → no `motionByMode` entry → byte-identical output). This extends that same **no-diff suppression**
to the four axes that shipped without it — **radius (#184)**, **font families + weight-roles (#185)**, and
**shadow (#188)** — in `theme.ts`:

- **radius:** an entry is populated only when the mode's re-derived `radiusScale(value, baseMd, 128)` ramp
  differs from the global `radiusScale(rScale, …)` baseline. `radius: 1` on a scale-1 brand now emits no
  redundant per-mode `radius.<mode>.json`.
- **families / weight-roles:** populated only when the merged-then-derived stacks / weight-role numerics
  differ from the global. A mode re-declaring the global family emits no `core-font.<mode>` set; and the
  `extraWeights` union (which mints `font.weight.<num>` leaves) only takes a mode's weights when the entry is
  actually kept.
- **shadow:** a **light-appearance** mode whose re-derived ramp equals the global inherits the canonical
  `shadow/*` styles → no redundant `modes.<mode>` DTCG entry or `shadow-<mode>/*` effect-style set. **Dark-based
  custom modes always keep their entry** — the reduced dark layers are emitted no other way (there's no
  `shadow-dark` default for custom modes), so suppression is scoped to light appearance only.

Pure consolidation — no new behaviour, no schema change. **`out/*` byte-identical** (no example brand sets a
per-mode lever); engine tests **897/0**, NB regression green, DTCG **336/336** contracts + all aliases resolve
per brand. Verified by probe: a mode overriding every axis to exactly the global value now produces empty
`*ByMode` maps (byte-identical), while a genuinely divergent mode still populates all four, and a dark custom
mode keeps its shadow.

---

## (2026-07-18) — extensible interactive palettes (engine → web) + UI polish

**STATUS: MERGED** (#163 engine · #166 + #168 web · #164 + #167 polish). The interactive color model is now
**extensible and directly editable**: a brand can ship the built-in primary/neutral/destructive interactive
columns PLUS N opt-in "accent" columns, each promoting a defined palette to a full `interactive.<name>.*`
family with an optional fill step — surfaced as per-column cards on the Semantic stage (the #161 pass).

- **Engine — #163: `interactivePalettes` (generalises `accentPalette`).** `BrandInput.interactivePalettes?:
  {name?, palette, anchorStep?}[]` — each promotes a *defined palette* (primary or a brandColors name) to a
  full `interactive.<name>.*` column (fill+states / on-fill / text / border / on-inverse / overlay); `name`
  defaults to the palette, validated (slug, unique, no collision with the primary/neutral/destructive
  built-ins). Plus `actionAnchorStep?`/`destructiveAnchorStep?` — optional fill-step overrides for the
  built-ins (unset = today's placement). On-fill inks stay **auto-derived + contrast-gated**; the
  **accessibility floor wins over the step override** (a too-light pick is nudged to the darkest passing
  step). `accentPalette` kept as **byte-identical back-compat**. `docs/20` updated (§3a). *out/\* byte-identical
  (no example brand sets the new fields); engine tests + NB regression green.*
- **Web — #166 → #168: the interactive-color cards (owner reference, #161 inc 1+2).** One card per column:
  big fill swatch · palette/step picker (writes `actionAnchorStep` / `destructiveAnchorStep` /
  `interactivePalettes[i].anchorStep`) · token path · live button example (fill + on-fill) · floor-gated
  contrast badge · hover/pressed sub-cards. Plus an **"add interactive color"** promote flow (a brand color →
  a new column, with a remove ×) — reserved names filtered so the auto-name can't collide (the #168
  should-fix). Neutral is deliberately not carded (it's `neutralEmphasis`-driven). Web-only, reads the
  resolved model.
- **Model:** interactive color = **palette + step (primitives only)**, never a raw color; a bespoke action/
  accent hue is a *named brand color* the whole system aliases. This resolved the owner's "can we pick the
  interactive color?" question — palette+step, not a floating picker.
- **Polish — #164 + #167.** #164: swatches fill their container at 40×40 (native color-input inset stripped),
  darker page bg so cards read as elevated, brand-color count badge removed, section-label + label→select
  spacing, and **US English** (`colour`→`color`) across all *visible* UI text (main.ts + lever labels/
  descriptions; the token-`$description` prose that emits into out/\* is a separate deferred pass). #167:
  replaced the oversized native `<select>` caret with a small consistent chevron across every select.

**Open backlog (captured #155–#162, #165 — most polish/US-English done):** #157 validation-color borrow bugs
(could NOT reproduce on main via headless — awaiting repro), #158 primitives layout (pair the neutral cast /
brand-color cards with the palettes they drive — the cast is invisible today because its greyscale is
off-screen), #159 brand bar (horizontal, replacing the overflowing dropdown), #160 design.md import (post-setup
+ startup upload + validation/error-handling), the remaining #161 sectioning (accessibility/features controls),
and the US-English token-`$description` pass (changes out/\*, so its own PR). **Next up: docs sweep (this), then #158.**

---

## (2026-07-17) — web UI reaches feature-complete: refinement pass, first-run, typography B, icons

**STATUS: MERGED** (#142, #145, #147, #149, #150, #152, #153). The web dashboard is now demo-ready and
feature-complete bar deploy — every lever is editable AND has a live preview, a real first-run experience,
and the typography editor is done. All in shared `web/src`, so the plugin iframe inherits it post-#110.

- **UI refinement pass (polish + light restructure).** #142 collapsed the full all-modes contrast table
  (which repeated on every stage) into a closed disclosure — the per-component badges stay as the
  point-of-edit check, and each lower stage dropped ~25%. #145 added an **animated motion specimen** on the
  Form stage (the semantic transitions fill at their resolved duration + easing; plays on tempo change,
  Replay button, `prefers-reduced-motion` honoured) — resolving the motion half of #114 (a static preview
  couldn't show the tempo lever's effect). #147 grouped shadow softness + tint under one **Shadow** heading.
- **First-run / default-state (#149 + #150).** The silent-demo boot was the bug hiding inside "what's the
  default state?". #149 added **localStorage persistence** — a thin `web/src/persist-local.ts` port over the
  pure `persist-input.ts` core (#131), so web remembers the working brand across reloads (plugin still uses
  Figma shared-data; the path is web-gated via `PRISM3_HOST`). #150 added the **start screen**: on a true
  first run (nothing persisted) the app shows a start moment — start from your colour (one primary bootstraps
  a full theme via `seedFromColor`), a neutral default, or explore an example — instead of the demo. Examples
  reframed as examples; "+ New brand" re-invokes it (web only). Plugin fresh-file start moment deferred.
- **#99 closed — icon specimen (#152).** The final #99 axis: a Kind-B icon specimen (on surface + reversed on
  fill, dependency-free inline SVG) so the `iconContrast` floor lever has a live payoff. All 7 per-axis
  specimens now shipped.
- **#103 closed — typography editor complete.** Phase A (#137/#139: font pool + weight-role map + per-category
  table) + **Phase B (#153): advisory weight availability** — a curated `KNOWN_WEIGHTS` map mutes/flags (⚠)
  weight roles a category's family likely doesn't ship, refreshed live on font/weight/family edits. Advisory
  per the #113 model (never a hard gate; unknown fonts never false-flagged).

**Gates across the arc: web tsc + build clean each PR; plugin both-context build clean where shared `web/src`
changed (0 `node:` builtins, web-only paths runtime-inert in the plugin); no engine/token/`out` change on any
(all reuse the read-model / pure persist core). Each verified live headless (Playwright).**

**Open (web):** a direct **interactive-colour** affordance — action colour is a `palette-ref` (`actionPalette`
→ primary or a named brand colour), so a bespoke action hue today needs the two-step add-brand-colour →
repoint; a picker that creates/updates a brand colour under the hood would close the gap without breaking the
named-palette model (owner deciding). Also: the "set your brand colour" provenance nudge for untitled brands;
#104 static-site deploy (owner not ready). **Cross-lane:** plugin fresh-file start moment; the
`brand-skills` extraction → `BrandInput` as a fourth start path; #111 components-as-data.

---

## (2026-07-17) — shadow/gradient: plugin write scope reaches Figma Styles

**STATUS: MERGED (#151).** The #146 follow-up, and the last write
axis before typography. Shadow + gradient are Figma **Styles** (Effect + Paint), not variables — a
different API (`createEffectStyle`/`createPaintStyle`) — which is why they were carved out of #146.
This lane adds them, so an apply now writes colour + FLOAT vars + shadow/gradient styles. Only
typography remains (its own Styles-based lane, blocked on #112/#113).

- **Node-free extraction — `engine/emit-figma-styles.ts`** (new): `buildFigmaShadow` (→ Effect Styles)
  + `buildFigmaGradient` (→ Paint Styles) + their types/helpers moved out of the I/O-shell
  `emit-figma.ts`, which re-exports them (same pattern as color/dims). `out/*` byte-identical.
- **Pure plan — `write-plan.ts` `buildStylesPlan(theme)`**: reshapes both builders into a
  `StylesPlan` (`effects: EffectStyleRow[]` + `paints: PaintStyleRow[]`). Shadow → BOTH sets
  (`shadow/*` light + `shadow-dark/*` dark, verbatim — Effect Styles can't hold modes). Gradient
  stops → **BAKED resolved RGBA** (owner decision; variable-linked stops are a fast-follow), and the
  emit's `angle`/`center` → Figma's 2×3 `gradientTransform` via a new `gradientTransformFor` helper
  (the one bit of new math: 0°=identity horizontal, rotates about centre).
- **Styles executor — `plugin/src/write-styles.ts`** (new, the FIRST non-variable write): a minimal
  `StylesApi` port (`createEffectStyle`/`createPaintStyle` + the two getters); `applyStylesPlan` does
  idempotent find-by-name → reuse+overwrite, else create. Runs after the FLOAT write in `main.ts`;
  summary widens (`…styles N effects (+M) / K gradients (+L)`).
- **Read-back (light) — `read-figma.ts` + `read-back.ts`**: reads local style NAMES into the snapshot
  (`styles?` field, optional styles-API arg) + a name-level `verifyStylesReadback` (light shadow set
  present, dark set iff brand ships dark, gradients iff brand opts in).

- **Review fix (parity):** the gradient angle is the SAME CSS `linear-gradient(<deg>)` angle the web
  renderer uses, so the two surfaces must agree. The first cut rotated by `angleDeg` directly (0°=
  horizontal), which was 90°-off + endpoint-swapped vs. CSS (0°=to-top). Fixed: `gradientTransformFor`
  now uses `φ = 90 − angleDeg`. Verified LIVE that CSS 90° renders red→blue L→R in Figma (the
  asymmetric check a symmetric 135° render can't distinguish), and 135° puts the start stop top-left as
  CSS does. The `gradientTransformFor` unit cases now encode the CSS convention.

**Gates: engine 767→776 (styles-plan + transform cases); `out/*` byte-identical; plugin two-context
typecheck clean; plugin `npm test` write+read+persist+float+**styles** all green; web tsc+build clean;
`dist/main.js` 0 `node:` builtins. LIVE-DRIVEN via the Desktop Bridge: created Effect Styles
(`shadow/*` + `shadow-dark/*`, multi-layer, DROP/INNER) + Paint Styles (linear + radial gradients);
applied `gradient/brand` + `shadow/md` to a rect and screenshotted — gradient + shadow render correctly
and the angle matches the web preview (CSS 90° → red-left/blue-right); re-apply idempotent (+0, no
duplicate styles); scratch styles + probe rects cleaned up.** Out of scope: typography (#112/#113);
variable-linked gradient stops (fast-follow).

---

## (2026-07-17) — #146: plugin write scope expands to the FLOAT-variable axes

**STATUS: MERGED (#148).** The plugin's live write adapter (#108)
materialised **colour only**. Verified live it still did: an apply wrote `core-palette` + `color` but
nothing geometric. #146 extends the write path to the **FLOAT-variable axes** — `core-dimension`,
`space`, `radius`, `size`, `border-width`, `focus`, `opacity`, and `layout` — so an apply now
materialises the dimensional layer too. Out of scope (own follow-ups): typography + shadow/gradient,
which are Figma *Styles* (a different API), and typography is decision-blocked on #112/#113.

- **Node-free extraction — `engine/emit-figma-dims.ts`** (new): `buildFigmaDims` + `buildFigmaLayout`
  (+ `pxFromValue`/`aliasFigName`/scope maps/`LAYOUT_MODES`/`FigmaDimsCollections`) moved out of the
  I/O-shell `emit-figma.ts`, which now re-exports them — the SAME pattern as `emit-figma-color.ts`.
  Pure functions of `Theme`; **`out/*` byte-identical** after regen (behaviour-preserving).
- **Pure plan — `engine/write-plan.ts` `buildFloatWritePlan(theme)`**: reshapes both builders into a
  uniform `FloatCollectionPlan[]` (create-all-then-alias, one target per mode — the same collapse-safe
  shape as the colour plan). Single-mode dims axes; `radius` 1–2 modes (Default [+ wireframe]); `layout`
  one mode per breakpoint the brand ships.
- **Executor — `plugin/src/write-figma.ts` `applyFloatPlan`**: widened `VariablesApi` (`createVariable`
  `'COLOR' | 'FLOAT'`, `setValueForMode` accepts `number`); two passes generalised over N collections,
  binding aliases against ONE global name map (cross-collection: space→dimension, size→dimension/space,
  radius→dimension, layout grid→space). Idempotent find-by-name. Runs after the colour write in
  `main.ts`; the `apply-result` summary widens (`…dims/layout N collections (+M), K aliases bound`).
- **Read-back (light) — `read-figma.ts` + `read-back.ts`**: reads the FLOAT collections into the
  snapshot (`float?` field, keeps colour-only reads valid) + a modest `verifyFloatReadback` (collections
  present, aliases resolve, dimensions hidden, radius wireframe-mode iff opted in). `ReadValue` widened
  with `number`; `isAlias` hardened for primitives.

- **Review fix (critical):** `getLocalVariablesAsync('COLOR')` returns ONLY COLOR vars — using it for the
  FLOAT idempotency map (`upsertCollection`) + the FLOAT read-back would have made re-apply DUPLICATE every
  FLOAT var and the read-back come back EMPTY. The in-memory shims hid it (they ignored the `type` arg).
  Fixed: both sites fetch UNFILTERED (`getLocalVariablesAsync()`, still scoped by `variableCollectionId`);
  the three test shims now HONOR the type filter so the regression can't hide again.

**Gates: engine 754→767 (float-plan + verify cases); `out/*` byte-identical; plugin two-context
typecheck clean; plugin `npm test` write+read+persist+**float** all green; web tsc+build clean;
`dist/main.js` 0 `node:` builtins. LIVE-DRIVEN via the Desktop Bridge with the REAL semantics: wrote the
FLOAT collections, re-ran → second run created +0 (idempotent, no duplicate vars), unfiltered read saw the
FLOAT vars while a `'COLOR'`-filtered read did NOT (confirming the bug + fix), cross-collection aliases
resolve (space→dimension, grid→space); scratch file cleaned up after.** Out of scope: typography
(#112/#113), shadow/gradient Styles — own issues.

---

## (2026-07-17) — editor lane completes: typography editor + holistic radius + object-value editors (#102, #103 A, #97)

**STATUS: MERGED** (#102 → #136, #103 A1 → #137, #103 A2 → #139, #97 → #140). The web dashboard now has
**no read-only levers left** — every knob in the manifest is editable, and (all in shared `web/src`) the
plugin iframe inherits every one of these post-#110.

- **#102 — holistic radius specimen (Form stage).** A dedicated `renderRadiusSpecimen` reading `rp.dims`
  across the radius steps (none/sm/md/lg/round) on representative component sizes, so the "Corner softness"
  slider has a visible payoff beyond the single component chip. (The slider is a 0–2 softness dial, not an
  enum — the specimen shows the ramp it reshapes.)
- **#103 — typography editor, Phase A (A1 + A2).** The type model is now fully editable on the settled
  engine (post-#105). **A1:** the font *pool* (three family roles → editable primary faces, single name
  auto-pads the fallback stack) + the global weight-role→numeric map (`subtle/default/emphasis/strong/max`).
  **A2:** the per-category assignment table — for each of the 7 groups (display/title/body/label/caption/
  eyebrow/code): family role · which weight-roles ship · italic · link. List writes read LIVE checkbox
  state (never a captured snapshot), so successive toggles stay staleness-free. Writes only existing
  `TypographyInput` fields → no `PERSIST_VERSION` bump. **Phase B (availability-aware weight pickers) is
  parked on #113** (font availability/resolution research).
- **#97 — object-value editors.** `renderControl` could only show `object` levers read-only as "configured".
  Bespoke sub-forms now edit the two that were still stuck: **page surfaces** (`surfaces.<mode>.{base,
  floorStep}` — white/black/neutral-step ground + optional contrast floor, on the Semantic stage) and
  **shadow tint** (`shadow.tint.{hue,amount}` hue-shifting the shadow base off pure black, on the Form
  stage). The third object lever (`typography.families`) is covered by the #103 editor. Each reads
  brandState (falling back to the engine default), writes via `setPath`, re-resolves.

**Gates across the three PRs: web tsc + build clean each time; 0 `node:` builtins; no engine/token/`out`
change (all reuse the read-model). Each verified live headless (Playwright): the typography table renders
7 category rows with family selects + weight/italic/link checkboxes matching resolved state; the surfaces
editor moves the preview ground; the shadow-tint sliders recolour the elevation ramp.**

**Open editor backlog:** #99 icon row (needs icon rendering in the preview — the one remaining #99 specimen;
the other six shipped in the sweep), #103 Phase B (blocked on #113), #104 static-site deploy (platform TBD —
owner not ready). **Decisions pending:** #113 (font availability — gates Phase B), #114 (gradients + motion
tab placement). **Plugin/MCP lane:** #111 (build Prism3 components in Figma from ComponentDefs via MCP) is
the next unstarted spike; the plugin itself is functionally complete through #110 + persist (#131/#138).

---

## (2026-07-17) — #131: persist `BrandInput` in shared-data → true knob round-trip

**STATUS: MERGED (#138).** The #110 follow-up, and the last open
plugin phase. #110's boot seed was *informational only* — a `ReadbackSnapshot` is resolved colour
values, so the `BrandInput` knobs can't be reverse-engineered from it; re-opening a themed file always
reset the UI to the default `aurora`. #131 closes the loop: the plugin now persists the exact
`BrandInput` alongside the variables it writes, and rehydrates the UI from it on boot.

- **Pure core — `engine/persist-input.ts`** (node-free, engine-tested): `PERSIST_VERSION = 1`,
  `serializeBrandInput` → `{ v, input }` JSON, `deserializeBrandInput` → the input or **`null`** on
  parse error / version drift / missing input. `null` is the single "start from defaults" signal, so
  absence and drift are indistinguishable to the caller (both → the unthemed path).
- **Plugin port — `plugin/src/persist-figma.ts`** (main-thread, shim-testable): a minimal
  `SharedDataPort` (`get/setSharedPluginData`) that `figma.root` structurally satisfies; `persistInput`
  / `restoreInput` under namespace `prism3` / key `brandInput`. Same pure-core-behind-thin-port split as
  `write-plan.ts`←`write-figma.ts`.
- **Wiring:** `plugin/src/main.ts` calls `persistInput(figma.root, input)` after a successful
  `applyWritePlan`, and `restoreToUi()` on `ui-ready` (independent of the #109 seed). New `restore-input`
  message on the `MainToUi` union; `web/src/write-adapter.ts` widens `HostCommit.onHostMessage` to carry
  it; the shared UI handles it via the existing `loadBrand` (wholesale replace + rebuild).
- **Restore repopulates KNOBS ONLY** — it does not re-write `figma.variables` (they already live in the
  file; auto-writing on boot would be redundant/surprising).

**Gates: engine 745→752 (7 persist cases — round-trip + garbage/drift/absence → null); plugin
typecheck clean (two-context split holds); plugin `npm test` write+read+persist green; web tsc+build
clean; `plugin/dist/main.js` 0 `node:` builtins. LIVE-DRIVEN against real `figma.root` shared-data via
the Desktop Bridge: unset key → `''`, persist→restore exact, v-drift + corrupt blob → null, scratch file
left untouched (the one thing the in-memory shim can't prove).** Out of scope: schema-v2 migration
(a future `PERSIST_VERSION` bump); pre-#131 files (none exist).

---

## (2026-07-17) — editor lane sweep: the web dashboard becomes demonstrative (#96–#101)

**STATUS: MERGED** (#96, #98, #99×5 slices, #100, #101; the `#122` type nit). Batched here because these
web-lane entries were deliberately deferred while the plugin lane held the shared log — now captured. The
dashboard went from a mostly read-only preview to genuinely *showing what each control does*, and — since
it's all in the shared `web/src` — **the plugin iframe inherits every one of these post-#110**.

- **#96 — controls live + toggle renderer.** Liveness is now by control TYPE (`slider/enum/palette-ref/toggle`),
  not a 3-key allowlist; added the missing `toggle` renderer. Every atomic lever now edits `brandState` and
  re-runs the engine (a bad value surfaces the error bar, never crashes). Object/list editors stay for #97.
- **#98 — box-shadow in the preview + `shadows` in the read-model.** `ResolvedPreview` gains `shadows`
  (`resolve-preview.ts`): each shadow → a per-mode CSS `box-shadow` string, dark = the reduced lift-primary
  override, folded through the write-adapter seam. Done via the seam so the plugin inherits shadow rendering.
- **#99 — per-axis specimens (5 slices).** Elevation ramp (Form) + on Semantic: outline hover/pressed,
  inverse hero band, neutral subtle-vs-strong comparison, gradient swatches. **A/B split (owner-approved):**
  genuine *missing preview states* (outline hover/pressed) went into the shared `previewSpec` (contrast-gated,
  plugin inherits); *axis-isolating comparisons* (inverse/neutral/gradient) are dashboard-only Kind-B specimens
  reading `resolveAllModes`/`theme` directly. The icon row is deferred (needs icon rendering).
- **FOUNDATIONAL (in #99 2a) — translucent roles now render.** Overlay washes resolved to their OPAQUE base
  hex (the wash alpha was computed for the contrast gate but never stored), so *any* translucent role rendered
  solid black. Fix: `modes.ts` records `alpha` on the overlay roles (additive, optional — `hex` unchanged, so
  contracts still gate on the opaque base); `resolve-preview` folds `hex+alpha` into an 8-digit hex for
  `colors`. Unblocks overlays, the inverse band, and any future translucent role. **`out/*` untouched — alpha
  stays in the read-model/contrast path, never the emitted DTCG.**
- **#100 — contrast-at-point-of-edit.** Per-component contrast badges (active mode) + token-path pills under
  each preview component. The badge ratio is DERIVED/gated at the core (not hand-typed — the design-review
  divergence: borrow the v2-plugin presentation, keep our derivation). Full all-modes table stays below.
- **#101 — Semantic tab regrouped** into Interactive colour / Accessibility policy (disabled floor nested under
  strategy) / Features; stale "override status hues" lede fixed (that moved to the Primitives per-ramp control).
- **`#122` nit cleared** (landed with #130): `gradients?: true | GradientInput[]` → `boolean | GradientInput[]`,
  so a UI toggle's `false` is type-honest (already schema-aligned + runtime-safe; no output change).

**Gates across the sweep: engine tests grew 723→745 (specimen + alpha + ramp assertions), nb-regression exit 0,
DTCG 336/336 per brand, `out/*` byte-identical on every web PR (all reuse the read-model — no emitted-token
change), web tsc + build clean each time. Each slice verified live headless (Playwright).**

**Open editor backlog:** #102 (holistic radius view), #103 (typography editor — unblocked by #105), #104
(static-site deploy — platform TBD), #97 (object-value editors), #99 icon row. **Cross-lane follow-up owed:**
persist a *versioned* `BrandInput` in Figma shared-data for true knob round-trip (generation is lossy — #109's
snapshot can't rehydrate knobs; engine-lane owns the version contract).

---

## (2026-07-17) — #110: one build, two outputs (shared `web/src` UI → plugin iframe)

**STATUS: MERGED (#132).** Phase 5, the CAPSTONE of the plugin lane and
the proof of its thesis: **one UI, one engine, no fork.** The plugin iframe now runs the SAME
`web/src/main.ts` the standalone web app does — not a second UI. Only the write adapter + manifest
differ per host, selected at BUILD time.

- **Host selection is a build-time constant.** New `PRISM3_HOST` (`web/src/prism3-host.d.ts`, esbuild
  `--define`); `makeWriteHost` returns `cssVarAdapter` for BOTH hosts (the iframe is a full DOM context,
  so the preview paints CSS vars identically). What differs is the COMMIT seam (`hostCommit` in
  `write-adapter.ts`): web → the export bar (download design.md / tokens.json); figma → `figmaCommit`
  posts the live `BrandInput` to the main thread. esbuild dead-code-eliminates the unused branch (web
  bundle: 0 `parent.postMessage`; plugin bundle: bridge present).
- **`plugin/build.mjs`** now bundles `../web/src/main.ts` (host=figma) into `dist/ui.html`, retiring the
  placeholder (deleted `plugin/src/ui/ui.ts` + `bridge-ui.ts`). `tsconfig.ui.json` repointed at the shared
  UI — so the no-plugin-typings DOM-clean check runs on what's actually bundled.
- **Write path reuses #108 verbatim** — only the theme SOURCE changed (bundled NB → the live UI knobs):
  `apply-theme` now carries a `BrandInput`; `main.ts` runs `buildWritePlan(buildFigmaColor(brandTheme(input)))`
  → `applyWritePlan`. On boot it runs #109 read-back → an informational `seed-info` panel.
- **Read-SEED is informational only (deferred).** A `ReadbackSnapshot` is resolved values; the knobs
  (`BrandInput`) can't be reverse-engineered from it, so full rehydration needs `BrandInput` persisted in
  Figma shared-data — filed as a follow-up. #110 reports the existing theme's contract, doesn't repopulate.

**Gates: engine 745/745 (untouched); web tsc+build clean, cssVarAdapter only (bundle has 0 bridge refs);
plugin both-context tsc clean, build inlines the SHARED UI into `dist/ui.html` (0 `node:` builtins,
figma bridge present); `npm test` write+read shims green. Validated LIVE: served `dist/ui.html` in a
headless browser — the full Theme studio renders from the plugin bundle (4-stage nav, generated aurora
ramps, knobs), and the brand menu shows the "↳ Apply to Figma variables" commit action that appears
ONLY in the figma build (screenshot `110-shared-ui-in-plugin.png`). The write/read executors themselves
were proven live against a real document in #108/#109; #110 changed only the theme source.**

---

## (2026-07-17) — #109: plugin read-back (`getLocalVariablesAsync` → snapshot + verify)

**STATUS: merged (#127, `e179324`)** — Phase 4 of docs/22, the read leg complementing
#108's write leg. The plugin now READS the current file's colour variables back into host-neutral
plain data and verifies the materialisation contract live — the same checks the `materialise-to-figma`
`verifyPass` string-emitter has always encoded, now a live executor + a pure verify.

- **`engine/read-back.ts`** (NEW, pure/node-free) — `ReadbackSnapshot` (plain-data mirror: collections
  + palette rows + colour roles whose per-mode value is the alias TARGET NAME or a literal) +
  `verifyReadback(snapshot)`. Ports the verify contract: `modesDistinct` (background/primary distinct
  per mode — the collapse-guard), `aliasesResolve`, slot `scopes`, `fieldFamilyPresent`,
  `retiredRolesAbsent`, `renamedRolesAbsent`, `bareDangerPresent`, `primitivesHidden`. The snapshot is
  what #110's UI will consume to SEED itself from an existing themed file.
- **`plugin/src/read-figma.ts`** (NEW) — `readFigmaVariables(figma.variables)`, the inverse of
  `applyWritePlan`: reads `core-palette` + `color` via the async getters, resolves each alias to its
  target var NAME (id→name map). Shares the `VariablesApi` port with the write executor (widened with a
  `ReadVarValue` superset of Figma's `VariableValue` + a `valuesByMode` field, so `figma.variables`
  still structurally satisfies it).
- **Bridge + trigger** — `read-theme` / `read-result` variants; a "Read current file" placeholder-UI
  button. The full snapshot stays main-side until #110 hands it up to seed the UI.

**Gates: engine 742/742 (735 + 7 new `verifyReadback` tests incl. a NEGATIVE collapse test — a
snapshot with background/primary collapsed to one target per mode fails `modesDistinct`); the read-back
round-trip harness (`plugin/test-readback.ts`, `npm test`) drives write→read→verify on the shim — 122/122
palette + 123/123 colour round-trip, 492 alias targets matched, contract `ok:true`; both plugin contexts
`tsc` clean; build 0 `node:` builtins. Validated LIVE in Figma via the Desktop Bridge: read the doc #108
wrote → verify `ok:true` (8/8 checks). En route it EARNED ITS KEEP — the first live read flagged a real
stale `color/field/border` (a pre-#86 flat leaf the idempotent writer correctly left untouched), exactly
the drift the verify contract exists to catch; removing it → clean pass.**

---

## (2026-07-16) — #108: plugin main-thread write adapter (live `figma.variables`)

**STATUS: merged (#125, `59f7ef4`)** — Phase 3 of docs/22. The plugin now WRITES: same
pure colour-materialisation core the CLI paste-path uses, driven by a real executor against
`figma.variables.*` on the main thread instead of emitting plugin-JS strings. Colour only
(`core-palette` + `color`), matching `materialise-to-figma` today. API re-verified current against live
Figma docs (Context7 `/websites/developers_figma`) before building — no drift from docs/18 §3.

- **`WritePlan` — the host-neutral write contract** (`engine/write-plan.ts`, pure/node-free).
  `buildWritePlan({palette, color})` reshapes the already-resolved `buildFigmaColor` collections into the
  three passes as DATA: palette rows (scopes + literal RGBA + hidden), colour create-rows (one literal
  value per mode), colour alias-rows (**one target per mode** — the collapse-guard). It is the SINGLE
  source of truth both write paths consume, so they can't drift.
- **`materialise-to-figma.ts` routed through it.** The disk-read shell + the four CLI string passes +
  `aliasRows` all now project `buildWritePlan(collections)` instead of re-deriving rows inline. All four
  CLI passes verified **byte-identical** to pre-refactor; the `aliasRows` collapse-guard tests stay green.
- **The live executor** (`plugin/src/write-figma.ts`): `applyWritePlan(plan, figma.variables)`, async,
  **idempotent** (find-by-name → update in place via `getLocalVariablesAsync` /
  `getLocalVariableCollectionsAsync` — the async getters required under `documentAccess:"dynamic-page"`).
  Three passes: palette (Default mode, hidden primitives) → colour create (rename mode[0] + addMode the
  rest; literal per-mode fallbacks) → colour aliases (per-mode `createVariableAlias`, targets resolved
  across BOTH collections). Depends only on a minimal `VariablesApi` port, so it's unit-testable with an
  in-memory shim.
- **Node-free extraction** (the flagged risk, resolved). `buildFigmaColor` + the shared pure helpers
  (`figName`/`parseColor`/`desc`/`leaves`/`stripNs`) + the Figma var types moved to a new node-free
  **`engine/emit-figma-color.ts`**; `emit-figma.ts` re-exports them (every existing importer + the
  documented CLI unchanged, output byte-identical). Lets the plugin bundle `buildFigmaColor` with **zero
  `node:` builtins** in `dist/main.js`. The theme is the bundled NB fixture: `nbThemeFrom(nbMeasured)`
  (JSON inlined by esbuild) — #110 swaps that one call for the shared UI's live knobs.
- **Bridge + trigger:** two message variants (`apply-theme` / `apply-result`); a placeholder-UI button
  fires the write (whole UI is still #110's to replace).

**Gates: engine 735/735 (728 + 7 new `buildWritePlan` tests incl. the plan-level collapse probe); all
four materialise CLI passes byte-identical + `emit-figma` output unchanged (NB regression intact); both
plugin contexts `tsc` clean; build emits main.js + inlined ui.html with 0 `node:` builtins; the executor
harness (`plugin/test-write.ts`, in-memory `figma.variables` shim) drives `applyWritePlan` twice — 245
vars stable (idempotent), 492/492 aliases bound, 0 misses, primitives hidden+scoped, background/primary
distinct per mode. Live-in-Figma validation via the Desktop Bridge is the one manual step (see PR).**

---

## (2026-07-16) — #107: Figma plugin scaffold (two-context split + typed bridge)

**STATUS: merged (#120, `0c5442b`)** — Phase 2 of docs/22. Vanilla scaffold under a new **`plugin/`** workspace
(`@prism3/plugin`); no `figma.variables` writes yet (that's #108) and the placeholder iframe UI is what
#110 swaps for the shared `web/src`. Manifest verified against the current Figma plugin docs (2026-07,
via Context7) — no drift from the docs/18 §2 grounding.

- **The two contexts are split by TYPE, not convention** (docs/18 §1): `tsconfig.main.json` gives the
  main thread `@figma/plugin-typings` but **no `dom` lib**; `tsconfig.ui.json` gives the iframe DOM but
  **no plugin-typings**. Proven load-bearing — a `document` ref in `main.ts` fails **TS2584** and a
  `figma.*` ref in `ui.ts` fails **TS2304**. `src/figma-env.d.ts` declares the `__html__` sandbox global.
- **Typed postMessage bridge.** `src/messages.ts` is the pure shared wire contract — two discriminated
  unions (`UiToMain` / `MainToUi`) + an `assertNever` exhaustiveness guard, compiling under both tsconfigs.
  `bridge-main.ts` / `bridge-ui.ts` are thin typed wrappers over the raw channel; the skill's React
  `usePluginMessage` hook is adapted to a vanilla `addEventListener` wrapper (returns an unsubscribe), per
  docs/22 §3.
- **Manifest:** `documentAccess: "dynamic-page"`, `networkAccess.allowedDomains: ["none"]` (engine bundled,
  zero runtime network — a real trust win), `editorType: ["figma"]`, `api: "1.0.0"`.
- **Build (`build.mjs`, esbuild):** `main.ts → dist/main.js` (iife); `ui/ui.ts` bundled and **inlined into
  a single `dist/ui.html`** (a plugin iframe has no server to fetch a separate JS from, and we ship
  no-network). `dist/` is gitignored alongside `web/dist/`.

**Gates: both plugin contexts `tsc` clean; split-enforcement proven (TS2584 / TS2304 on deliberate
violations); build emits main.js + inlined ui.html; a Node harness stubbing the two contexts drove the
real bundled bridge end-to-end — `ui-ready → main-ready` handshake + `ping → main-pong` nonce match both
PASS. Web tsc clean + engine 723/723 (both untouched).**

---

## (2026-07-16) — #106: write-adapter seam (`apply(model)`)

**STATUS: merged (#119, `37a485b`)** — landed on fresh `main` (`264f579`); Phase 1 of docs/22 complete.
The single-UI prerequisite: the shared UI reused verbatim in the Figma plugin iframe hinges on a swappable
**write surface**, so the UI computes a resolved token model and hands it to **one `apply(model)` interface**,
implemented per host.

- **`WriteAdapter` contract** (`web/src/write-adapter.ts`): `apply(model: ResolvedPreview, mode)`. The model is
  reused as-is — no new engine type. Two implementations: **`cssVarAdapter`** (web → sets CSS custom properties
  on a scope element from `model.colors[ref][mode]` / `model.dims` incl. per-mode overrides / `model.type`),
  and **`figmaVarAdapter`** — a **stub** with the same signature that no-ops with a `console.warn` until the
  plugin phase, proving the interface is host-swappable today.
- **The load-bearing rule:** the UI **references tokens by `var(--…)` name and never writes resolved values**.
  `renderChip` + the page background assign `var(--…, <resolved fallback>)`; the active host fills the vars in.
  Shared `cssVarName`/`typeVar` name helpers keep the setter and the references from drifting. The host is
  re-scoped to the **fresh** preview surface each paint, so a mode switch can't leak stale vars.
- **Scope (deliberately tight):** token-valued writes only (chip `bg/fg/border/radius/pad/type` + surface bg).
  Pure-layout inline styles (picker show/hide, brand-menu dots, ramp swatch fills) are not tokens — left as-is.

**Gates: engine 723/723 (untouched); web tsc + build clean; 0 `node:` builtins in the bundle; drove the dev
server — 65 adapter-set CSS vars on the surface, Light→Dark repaint with no leakage, live action-palette edit
re-projects through the adapter.**

---

## (2026-07-16) — #105.3: single-family `$value` + `fallbackStack` extension

**STATUS: MERGED (#118)** — re-landed on fresh `main` after #117/#105.2 merged (`c22f22e`), so the
merge-base is linear and the golden movement was re-verified on the clean base. Third and final brick of #105.

- **Family primitive `$value` is now the SINGLE brand family** (`stack[0]`, a string) — the DTCG- and
  round-trippable form Token Press / Figma consume directly, instead of the baked `string[]` fallback
  stack. (`tree.ts` `fontFamilyLeaf`.)
- **The curated fallback stack moved to `$extensions.prism3.fallbackStack`** (the tail after the primary).
  A consumer reassembles the CSS `font-family` value as `[$value, ...fallbackStack]` — a Style Dictionary
  consumption transform (TP ships the shorthand in its SD starter; **the engine's half is the extension +
  the documented reassembly rule**). The engine applies the same reassembly itself in two places so nothing
  downstream regressed: `familyOf` (the resolved-preview font-family — byte-identical) and the Figma family
  emit (variable value = primary, description = the full reassembled stack — NB fixture byte-identical).
- **⚠️ Token-shape change:** this drops the `string[]` stack from every family primitive's `$value`. The
  `out/*.tokens.json` family leaves move (array → string + `fallbackStack`); **no Figma output moved** and
  no fixture moved (reconstruction keeps them stable).

**Gates: test 723/723, nb-regression exit 0, emit-dtcg all aliases resolve + 336/336 contracts per brand,
emit-figma (byte-identical) + web tsc clean; out/* regenerated.**

**Open cross-lane loop (before finalizing #105):** confirm the engine's canonical forward-emit weight
spellings resolve in TP's `FONT_WEIGHT_MAP` (100 Thin · 200 ExtraLight · 300 Light · 400 Regular · 500
Medium · 600 Semi Bold · 700 Bold · 800 ExtraBold · 900 Black; italic → `<Weight> Italic`, 400→`Italic`).
To be posted on #105 for the TP agent.

---

## (2026-07-16) — #105.2: italic axis (weight-paired modifier)

**STATUS: MERGED (#117)** — built on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`, post-#116).
Second brick of #105; the DTCG encoding is the one Token Press locked on #115 (closed).

- **Italic modelled as an orthogonal modifier PAIRED with each weight** (`strong` + `strong-italic`),
  not a weight role. It's a hyphenated suffix on the weight, in a fixed order
  `type.<group>.<size>.<weight>[-italic][-link]`, so italic and link cross cleanly (a role that ships
  both gets bare / italic / link / italic-link). (`theme.ts` `buildComposites`.)
- **Emits `fontStyle: 'italic'` on the composite `$value`** — off-core-DTCG but the shared Token-Press
  contract (#115). Omitted when normal. (`tree.ts`.) The Figma text style names the italic named-instance:
  `fontStyleName(role, numeric, italic)` → `Bold Italic`, and `400 → Italic` (not `Regular Italic`) per
  Figma's convention. (`emit-figma.ts`.)
- **Opt-in per role via `typography.italics`** (parallel to `links`), **default `[]`.** Italics are a
  deliberate brand choice, so default output ships **zero** italic composites — goldens stay byte-identical
  (same lean-default discipline as `max`). Surfaces: `levers.ts` (`typography.italics`), `theme-schema.json`,
  `ai-metadata.ts` (fontStyle in `resolves_to`).

**out/* impact:** the only default-output change is the reworded per-composite `fontStyle` note in
`$extensions.prism3.figma.note` (36 lines in NB — metadata text, no value/structure change). Italic
composites appear only when a brand opts in. End-to-end verified: a `italics:['body'],links:['body']` brand
emits the full 8-way `body.md.*` cross with correct Figma style names.

**Gates: test 717/717, nb-regression exit 0, emit-dtcg all aliases resolve + 336/336 contracts per brand,
emit-figma + web tsc clean; lever-manifest.json + out/* regenerated.**

---

## (2026-07-16) — #105.1: extensible weight-role set + `max`

**STATUS: MERGED (#116)** — built on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`, post-#95).
First brick of the #105 typography type-model expansion; self-contained, no Token-Press round needed.

- **Data-driven role set.** The four hardcoded weight-role names became one ordered canonical array
  `WEIGHT_ROLE_ORDER` (lightest→heaviest); `WeightRoleName` now *derives* from it (`typeof […][number]`),
  the defaults map keys off it, and the build emits one `font.weight-role.*` primitive per entry. Adding a
  role later is a one-line array edit + a default value — no consumer hardcodes the old four names
  (`tree`/`emit-figma`/`emit-dtcg`/`ai-metadata`/`test` all already iterate the array). (`theme.ts`.)
- **`max` added (default 900).** The canonical heaviest slot — a black/display hero weight brands bind to.
  It stays **defined-but-unused by default categories** (exactly like `subtle`), so default output is
  byte-identical bar one additive `font/weight-role/max` primitive; a brand opts in via
  `weights: { display: ['strong','max'] }`. Owner-requested (the "optional 5th — Max" decision on #105).
- **Surfaces updated:** `theme-schema.json` (weightRoles + per-role `weights` enums gain `max`),
  `levers.ts` description, the NB figma fixture (`font.json` → 39 vars / 5 weight-roles), docs/10 table.

**Gates: test 707/707, nb-regression exit 0, emit-dtcg 753/753 aliases + 336/336 contracts per brand,
emit-figma (font 39) + web tsc clean; lever-manifest.json + out/* regenerated.**

---

## (2026-07-11) — housekeeping: #63 resolved (Option 3) + PR-review audit

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`, post-#91).

- **Audited all 29 merged PRs (57–90)** for missed should-fix / unresolved review items → **clean**: zero
  outstanding, zero unresolved threads. The one #90 should-fix (stale `field.border` sidecar ref) was already
  fixed (`4528982` + the sidecar-reference gate). Deferrals were all tracked as issues, not silently merged.
- **#63 resolved — Option 3 (owner-decided).** nb's hand-authored semantic text on the `-subtle` tint lands
  ~4.0–4.2:1 in LIGHT (under AA 4.5) for 4 banner/badge pairings. **Investigation ruled out Option 1**
  (large-text 3:1): measured, the alert text is body **16px regular** and the badge is label **12px** — neither
  qualifies. This exists ONLY in the hand-authored NB reproduction (the regression fixture); engine-GENERATED
  brands (aurora/harbor) clear 4.5. Option 2 (re-target the inks) would move NB tokens + the regression baseline.
  Owner chose **accept as a documented NB-source divergence** — the engine is already correct. Formalized: the
  loose `L-10` characterization (`nbLightFails.length > 0`) is now a **can't-drift KNOWN-outliers gate** pinning
  the exact 4 labels + a `[4.0, 4.5)` band, so a NEW shortfall (regression) or a VANISHED known one (fixed →
  re-review/close) both fail the suite. `test.ts (10b)`. **Closes #63.**

**Open issues remaining:** #79 (opacity hidden from Figma consumers — emit-figma lane, next), #67 (token-press:
did the #66/#73 collection rename break ingestion — cross-lane, needs the Token-Press lane / owner).

**Gates: test 702/702, nb-regression exit 0, emit-dtcg 336/336 per brand, web tsc clean.** No token/out change.

---

## (2026-07-11) — `status.info` + orphan-ramp pruning (validation-colour completeness)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). Completes the
validation-colour override set so a designer can change all four (red/green/orange/blue) directly.

- **`status.info`** — info was synthesise-only (canonical blue, the docs/21 §2 gap); now it takes a direct hue
  override like `success`/`warning`/`danger`. Symmetric: a measured hue seeds a vivid ramp, contrast re-gates.
  Exposed as a `status.info` colour lever. (`theme.ts` type + `status()`, `levers.ts`, `theme-schema.json`.)
- **Orphan-ramp pruning** — `success`/`warning`/`info` are minted unconditionally, so a `roleColors` rebase left
  the now-unused ramp shipping as a dead one. It's now pruned (keyed off the final `roleToPalette` + `accentPalette`
  so a ramp survives if `action`/`accent` still point at it) — symmetric with the danger carve's no-orphan behaviour.

**Why:** the two validation-colour mechanisms now cover all four colours cleanly — `status.*` sets the raw hue,
`roleColors.*` borrows another ramp (a red brand's red for danger, a blue brand's blue for info), and a borrowed
status ramp no longer duplicates. This is the engine half of the "change validation colours contextually per-ramp"
UI vision; the contextual per-ramp dashboard control (own-hue + borrow-from-a-ramp-above, deferred "lock") is the
UI-lane follow-up (the `status.*` levers are still `advanced:true`, so unsurfaced until that lands).

**Gates: test 700/700, nb-regression exit 0, emit-dtcg 336/336 per brand, emit-figma + web tsc clean;
lever-manifest.json + out/* regenerated.**

---

## (2026-07-10) — the Text Field FAMILY: `field.border` hover split + three ComponentDefs

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). Scoped the
**Text Field** grounded in `knowledge-base/components/text-field.md`, and the owner-confirmed shape is a small
**field family**, not one monolith — the KB's "composed slots" hybrid expressed in the data model.

**One engine change:** `field.border` became the one **stateful** field slot, nested `field.border.rest` +
`field.border.hover` (same shape as `interactive.*.fill.<state>`). Rest is the perceivable boundary (gated 3:1
vs the page); hover is a subtly *stronger* boundary (gated 4.5, asserted ≥ rest) — a perceptible, never-sole
state cue (KB §4). All other field states still compose (focus→`border.focus`, error→`border.danger`,
disabled→`disabled.*`). This is a flat-leaf → nested rename: `modes.ts`, `emit-figma` (scope keys on `seg[2]`,
unchanged), `test.ts` (scope + shape + a hover≥rest gate), `preview.ts` (rebound + a new `hover` variant),
`materialise-to-figma` verify (field-family names + the old flat leaf asserted gone).

**Three ComponentDefs (the family):**
- **`components/field-label.ts`** — the accessible name: `size` {small, medium} + required/optional indicator +
  disabled dim. A shared part reused above every field control (static top-aligned; floating out of favour).
- **`components/field-message.ts`** — the **Prism2 "Helper message" successor**: a `tone` axis
  {default, error, warning, success}, each tone re-pointing **both** caption ink + status icon at the matching
  role (`text.<role>` + `icon.<role>`) — icon + text, never colour-only. Presentational; the host owns the
  `aria-describedby` + `aria-invalid` wiring.
- **`components/text-field.ts`** — the HOST. Composes the two parts (`composesWith`) and binds **input chrome
  only** — so label/message tokens live in the parts and Select/NumberField reuse them. Encodes the KB's live
  edges: read-only ≠ disabled (read-only stays full-contrast `text.primary` + `border.secondary`, not dimmed);
  error is a **border-only** swap; validation is **presentational** (form lib owns timing); base field only
  (NumberField separate, Search/Password thin specialisations, email/url/tel = `type`+attrs).

**Decisions (owner-confirmed):** base-only (credit-card field is a compose-of-fields *pattern*, out of scope);
add the `field.border.hover` token (owner leaned yes); error = border-only; read-only = full-contrast. The
nested-component question resolved to: shared **parts** are their own defs when state/tone-bearing + reused
(FieldLabel, FieldMessage); truly-primitive parts (Icon) stay **slots**, not defs.

**Gates: test 691/691 (+16: field hover-gate, +3 def validations × 2 brands, family assertions), nb-regression
exit 0, emit-dtcg 336/336 per brand, emit-figma clean, web tsc clean.** `out/*` + `preview-spec.json` regenerated.

---

## (2026-07-08) — `roleColors`: general semantic-role rebasing (docs/21)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). A general lever
that lets a brand **re-base any semantic role on a declared palette** — the client-driven need: a red brand
reuses its brand red for `danger`, a blue brand its blue for `info`, or any role points at a custom colour.

**The lever:** `roleColors?: Partial<Record<Role, string>>` on `BrandInput` (value = a palette name: a status,
`primary`/`neutral`, or a `brandColors` entry). It's the **general form of `actionPalette`** (which stays as an
ergonomic alias for `roleColors.action`). Covers `success`/`warning`/`danger`/`info`/`action`; `brand`/`neutral`
are rejected (they define the surface model). `accent` is unchanged — it's an *added* interactive column, not a
rebasable role, so it keeps `accentPalette`.

**Why it existed as four special cases before:** `action`/`accent` had their own levers; `danger` had an
auto-carve *heuristic* (a saturated-red brand already reuses `primary` for danger — `test.ts` M-05); and
`success`/`warning` could hue-tune via `status` but `info` had **no override at all**. `roleColors` unifies them
— the explicit danger override wins over the heuristic (and mints no orphan danger ramp), and info rebasing is
finally possible.

**Guarantees:** contrast **always re-gates** on the target ramp (verified: a rebased brand clears every contract
in all four modes; `text.info` resolves onto the primary ramp and still passes). Semantic-signal appropriateness
is the user's call but **flagged** — a hue mismatch (danger not red, info not blue) pushes a design.md `CONFIRM…`
note rather than blocking. Validation: unknown target palette throws; `brand`/`neutral` rebase throws.

**Wiring:** `theme.ts` (input field + a general rebasing pass after the danger carve, with `paletteHue` +
hue-mismatch note), `schema/theme-schema.json` (the `roleColors` object). **Additive + optional** — NB/aurora/
harbor declare no overrides, so `out/*` is byte-identical. Not exposed as a dashboard lever (it's a structured
map, not a scalar toggle — `lever-manifest` unchanged).

**Gates: test 671/671 (+8 roleColors: gap-closer, explicit-danger-no-orphan, action-alias, the all-modes contract
guarantee, hue-mismatch flag, both guards), nb-regression exit 0, emit-dtcg 332/332 per brand, web tsc clean.**

---

## (2026-07-07) — the `field.*` category (form-element chrome, docs/20 §17)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). Field research on
the Prism2 input tokens (`surface.input.*` / `border.input.*`) confirmed most of them are already covered
*better* by the generated families — so `field.*` is deliberately **minimal**: three roles, everything stateful
composed from existing gated families (per docs/20 §15: the field's states come from `interactive.*`).

**Generated `field.*` (three roles):**
- `field.fill` — the field fill (a subtly inset neutral, tracks the page tier so `text.primary` clears). Surface, min 0.
- `field.border` — the **resting** boundary, **gated `nonTextMin` (3:1) against `background.primary`** (SC 1.4.11). This is the improvement over Prism2, whose resting input border sat sub-3:1 and leaned entirely on focus. NB: neutral.400, 3.27:1.
- `field.placeholder` — placeholder ink, **gated `secondaryMin` (4.5) against `field.fill`** — a *readable* hint, not the sub-AA placeholder Prism2/most systems ship. NB: neutral.550, 4.52:1.

**Composed, NOT re-authored:** focus → `border.focus`; validation → `border.<semantic>` + `foreground.<semantic>-subtle`;
disabled → `disabled.{fill,border,on-fill}`; hover → `interactive.*` overlays; value ink → `text.primary`;
inverse → the generated inverse surface-context (no hand-mirrored `field.*-inverse` twins — Prism2's biggest spend).

**Taxonomy decision (owner) — a control's fill is `.fill`, the ink on it is `.on-fill`, everywhere.** Introducing
`field.surface` surfaced an inconsistency: the retired top-level word `surface` (Prism2's `surface.*` → `foreground.*`)
had quietly survived as a slot in `disabled.surface` (#83), while the interactive family used `.fill` / `.on-fill`.
Resolved to the interactive convention: **`field.surface` → `field.fill`**, and the merged disabled family aligned
(**`disabled.surface` → `disabled.fill`**, **`disabled.on-disabled` → `disabled.on-fill`**). No `.surface` token
segment remains anywhere. (We considered flattening `interactive.<c>.fill.*` to bare states, but per-colour overlay-tint
means `fill` + `overlay` are both stateful slots, so the `.fill` segment is load-bearing — kept as-is.)

**Wiring:** `modes.ts` generates the three roles; `ai-metadata.ts` describes the `field` group; `emit-figma.ts`
gets `FIELD_SLOT_SCOPES` (fill→paint, border→stroke, placeholder→text); the eval-preview `input` component is
rebound onto `field.*` (+ `border.focus` / `disabled.*` for its states). `test.ts` allow-lists `color/field/` out
of the figma `extra` check, gates the field slot scopes, and pins the family contracts (border ≥3:1 on the page,
placeholder ≥4.5 on the fill). A formal Text Field `ComponentDef` (like Button) is a **follow-on**, not in this increment.

**Gates: test 663/663, nb-regression exit 0, emit-dtcg 332/332 contracts per brand (was 324 — +2/mode for the
gated field border + placeholder), web tsc clean, `out/*` regenerated.**

---

## (2026-07-07) — legacy colour-role removal + NB figma-fixture reconciliation (task #14)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (reset from fresh `main` after PR #83
merged). The cleanup increment that #83 deliberately deferred: now that components bind `interactive.*` /
`disabled.*`, the superseded legacy scaffolding is **removed**.

**What was removed (engine):**
- `action.*` (the top-level interactive fill + states) → `interactive.primary.*`.
- The **stateful** `foreground.danger.*` fill → `interactive.destructive.*`. **`danger` is now a bare bold
  `foreground.danger` fill** like `brand`/`success`/`warning`/`info` (its `on-danger` ink pairing resolves
  cleanly against it). `foreground.danger-subtle` is unchanged.
- Per-colour `interactive.*.fill.disabled` → the cross-cutting `disabled.*` is the SOLE disabled family.
- `text/icon.{disabled, on-action, on-disabled}` → `disabled.text` / `disabled.icon`,
  `interactive.<c>.on-fill`, `disabled.on-fill`. Preview `input.disabled` rebound to `disabled.text`.
- ai-metadata branches, the emit-figma `action` scope entry, and the test suite retargeted off the removed roles.

**NB-fidelity reconciliation (the fixture re-baseline).** Removing those roles deletes vars from the frozen
real-NB figma fixture (`fixtures/figma/nb/color.*`), so the fixture was **modernised to the engine's evolved
layer** (owner-approved: "modernise the reference"): dropped the **17 retired vars/mode** and renamed
`foreground/danger/default` → bare `foreground/danger` (**95 → 78 real vars/mode**). The DTCG colour-fidelity
gate (`nb-regression`, ΔE) is **unaffected** — only the Figma variable *naming* changed. The figma name-match
gate keeps `missing === 0` on the real families + the `interactive/` / `disabled/` allowlist for engine-added
families.

**⚠️ The "#67" mislabel — corrected.** Earlier progress/docs called this "the #67 NB-fidelity reconciliation."
**GitHub #67 is actually the unrelated Token Press *collection-rename* question** (`palette`→`core-palette`,
tied to #66). There was never a dedicated issue for this legacy-var fixture re-baseline; it's simply task #14.
(docs/10's `#67` note about the `$collection` label rename is a genuinely different concern — left as-is.)

**Gates: test 655/655, nb-regression exit 0, emit-dtcg 324/324 contracts per brand (was 384 — the removed
roles carried contracts), web tsc clean, `out/*` regenerated.** Also parked (unchanged): `overlay-tint` lever.

---

## (2026-07-06) — interactive colour family (docs/20), increments 1–4 + component rebind

**STATUS: shipped as [PR #83](https://github.com/adamforrester/prism3-tokens/pull/83)** (branch `claude/prism3-e2e-integration-8fwul4`,
8 commits `f1d8804..73dbcbd`, base `main`). Independent reviewer **approved** increments 1–4 + rebind — both prior
findings (fixture character, intent tests) implemented; verdict "correct, additive, fully gated, no blocking/should-fix."
A second reviewer pass is in progress; not yet merged. Gates: **test 655/655, nb-regression ΔE00 1.95, emit-dtcg 384/384
contracts per brand, web tsc clean, out/\* regenerated + committed.**

**The one open thread (tracked, task #14) — the legacy-role removal.** The PR is deliberately additive: `action.*` /
`foreground.danger.*` (stateful) / per-colour `interactive.*.fill.disabled` / `text.disabled` / `icon.disabled` +
their `on-disabled` still coexist beside the new `interactive.*` / `disabled.*` families. Components have rebound, so
the clean-up increment (drop the legacy roles + contracts + ai-metadata branches, full `action`→`interactive` doc
sweep) is all that remains — but it **deletes `color/action/*` + `color/foreground/danger/*` vars present in the frozen
real-NB figma fixture**, so it MUST land with the **#67** NB-fidelity reconciliation (update the fixture to the engine's
evolved semantic layer). Also deferred: `overlay-tint` (needs per-colour alpha ramps). Do NOT remove the legacy roles
without doing #67 in the same change — the fixture `missing===0` gate will fail otherwise.

**Component rebind (Button / IconButton / eval preview).** Rebound to the reconciled two-axis model —
appearance `{filled, outline, text}` × intent `{primary, neutral, destructive}` — bound to `interactive.<intent>.*`
+ cross-cutting `disabled.*`. **This closes the v1 HIGH finding**: neutral (was the stateless
`foreground.secondary`) now carries hover/pressed/on-fill like every colour, so the default button is no
longer hover-less; the matrix is uniform. `ghost`/`secondary`/`solid`/`plain` retired to the reconciled
vocabulary; default intent = neutral, appearance = filled. `preview.ts` rebound too (removing the
`brand.*`-on-buttons leak docs/20 §1 flagged); outline/text hover uses the overlay wash. Component defs
still validate against both nb + aurora; web tsc clean. test 654→**655**.

**Increment 4 — inverse surface-context + `neutralEmphasis` + opt-in `accentPalette` (additive).**
- `interactive.<color>.on-inverse` (docs/20 §9): the ink for an outline/text control on a dark hero /
  inverse section — a light CTA on dark, generated + contrast-verified against the inverse surface (not a
  hand-mirrored twin). Gated by the `inverse` lever (default on). NB: primary/destructive 5.05:1, neutral 18:1.
- `neutralEmphasis` lever (`subtle` default / `strong`): strong gives a bold near-black/near-white neutral
  fill (neutral.800 light) that clears the non-text floor; on-fill still gated.
- Opt-in `accentPalette` lever (docs/20 §3): names a declared palette (≠ action) → a full `interactive.accent.*`
  column (fill/on-fill/text/border/on-inverse/overlays), all gated. Rejected if it equals the action palette
  (never falls back to primary). Absent by default. All wired through input/Theme/schema/lever-manifest/.ai.json.
- Contract count 372→**384** per brand (inverse inks). test 648→**654**. Fixtures untouched (all under the
  `color/interactive/` allowlist).

**Increment 3 — cross-cutting `disabled.*` (additive).** One disabled treatment regardless of intent
(docs/20 §7): `disabled.{surface, on-disabled, text, icon, border}`, governed by `disabledStrategy`.
`disabled.on-fill` is gated against `disabled.fill` (accessible: 3:1). Contract count 360→**372**.
Kept **additive** — the scattered `action.disabled` / `foreground.danger.disabled` / `interactive.*.fill.disabled`
remain generated so NB byte-repro holds; components rebind to `disabled.*` in the migration step. `color/disabled/`
is a new engine-added family, added to the figma fixture allowlist. **Important scoping note:** removing the
legacy `action.*` roles (the docs/20 §11 rename) would delete `color/action/*` vars that ARE in the frozen
real-NB fixture — that's the NB-fidelity reconciliation the review tied to **#67**, so this PR keeps the legacy
roles and defers their removal there. test 646→**648**.

**Increment 2 — overlays + composited-contrast gate + `outlineInteraction` lever (additive).**
- `interactive.<color>.overlay.{hover,pressed,selected}` — translucent washes that composite over
  ANY surface (page, dark hero, image): the outline/text-appearance hover + rows/menus/cards story.
  `overlay-neutral` (default) uses the mode-adaptive neutral alpha ramp (black-alpha light / white-alpha
  dark), hover 10% / pressed 20% / selected 20%.
- **Composited-contrast gate (docs/20 §13):** each overlay is a real contract — `text.primary` must stay
  ≥ AA on the page *once the overlay sits on it* (`color.ts` gains a `composite()` alpha-over helper).
  This can fail (a too-heavy lightening wash in dark mode) so it genuinely constrains the alphas; all hold
  (NB ratios 12–16). Contract count 324→**360** per brand.
- **`outlineInteraction` lever** (`overlay-neutral` | `solid-tint` | `none`) wired through the input model,
  schema, lever manifest, and `.ai.json`. `solid-tint`/`none` emit no overlays (opaque `foreground.<color>-
  subtle` / no hover). `overlay-tint` (per-colour hue at alpha) is scheduled — it needs per-colour alpha ramps.
- Figma: `overlay` slot scoped FRAME/SHAPE_FILL, aliases the alpha ramp. Fixtures unchanged (overlays are
  `color/interactive/*`, already allow-listed). test 644→**646** (overlay presence/gate/mode-adaptive + lever opt-out).

Gates: test 646/646, nb-regression ΔE00 1.95, emit-dtcg 360/360 per brand, web tsc clean, `out/*` regenerated.

### Increment 1 — the `interactive.<color>` family (additive)

Building the redesign specced in `docs/20-interactive-color-system.md` as gated increments on
`claude/prism3-e2e-integration-8fwul4` (one PR when the family is complete). **Increment 1 (this
checkpoint): the generated `interactive.<color>.<slot>` family**, ADDITIVE alongside the legacy
`action.*` / `foreground.danger.*` roles so no contract goes red mid-migration.

- **`modes.ts`** now generates `interactive.{primary,neutral,destructive}` with slots `fill`
  (+ the six fill-states), `on-fill`, `text`, `border`. `primary` walks the action palette,
  `destructive` the danger palette, `neutral` a subtle grey (emphasis lever comes in inc-4).
  Fill-states lead with **`rest`** (the interactive family's own convention, docs/20 §2:
  rest/hover/pressed) — `default` stays only on the non-interactive roles (`action.default`,
  `text.link.default`), no systemwide rename.
  The load-bearing neutral pair (`neutral.on-fill` on `neutral.fill.rest`) is now a
  **generated + gated contract** — the historical miss (docs/20 §12) can't ship silently.
  Contract count rises automatically (tree.ts counts every `min>0` role); nb/wendys/aurora/harbor
  all hold (e.g. harbor 324/324).
- **`emit-figma.ts`** — `interactive` is scoped by its SLOT (fill→FRAME/SHAPE_FILL, on-fill→+TEXT_FILL,
  text→TEXT_FILL, border→STROKE_COLOR), not the family.
- **Fixture-character decision (2026-07-06, post-review; pairs with #67):** the NB figma colour
  fixtures stay the **frozen real Token Press export** (95 vars/mode) — engine-invented families
  (`interactive.*`) NB never shipped are **allow-listed** out of the exact-match gate (`missing===0`
  keeps the byte-repro; a spurious var inside a *real* family still fails). The interactive family's
  shape/scopes/gating is pinned in a dedicated `test.ts` block instead (test 639→**644**), so the
  fixture doesn't quietly become an engine snapshot.
- **`ai-metadata.ts`** — a depth-aware `describeInteractive` for the 4-segment keys (the generic
  `[group, variant, state]` split dropped the state); every `interactive.*` token now carries proper
  `when_to_use` / `avoid_when` / `paired_with` / `contrast_with`.

Gates: test **639/639**, nb-regression ΔE00 1.95, emit-dtcg contracts hold per brand, `out/*` regenerated.
Accent is deferred to inc-4 (opt-in `accentPalette` lever). Next: inc-2 overlays + composited-contrast
check + `outlineInteraction`; inc-3 cross-cutting `disabled.*`; inc-4 inverse surface-context +
`neutralEmphasis` + `accentPalette`; then rebind Button/IconButton (§16.3).

## 2026-07-03 — E2E integration arc

Since the token layer completed, work has been the **designer↔developer↔agent E2E pipeline**
(`07`/`08`/`09`/`10`). Shipped to `main`, newest first (see the decisions log for the why):

### Fresh-agent brief — pick up here

Two threads are live: the **Figma-emitter agent** (owns `emit-figma.ts` + its `test.ts`
gates; materialises axes into Figma via MCP) and the **generator thread** (everything
else — engine core, web dashboard, docs). Coordinate via committed artefacts (docs/10 §6).

- **emit-figma today:** colour + typography + dims + shadow + gradient + **layout**
  axes shipped (#28, #31, #33, #35, #46). Mode-opt-out fix landed (#49) — a light-only
  brand no longer emits dark files with light values. **Generalise** landed (#50) —
  aurora + wendys emit through every axis (aurora's alias-driven gradient Paint Style
  is live). **Wireframe mode** landed (this PR) — `'wireframe'` is now materialised on
  the two axes it touches in the DTCG tree: colour gets a fifth mode (greyscale, every
  role's `$extensions.prism3.modes.wireframe.$value` routes to a `palette/neutral/*`
  step), and **radius becomes the first mode-varying non-colour/shadow axis** —
  `buildFigmaDims` returns `radius: FigmaCollectionFile[]` (per-mode, same shape as
  `color`); a non-wireframe brand ships a single Default-mode `radius.json`
  (byte-identical to the pre-1b world), a wireframe-opted brand ships two files where
  non-zero radii alias `dimension/0`. Fully specified in `docs/10-figma-materialization.md`.
- **emit-figma next (docs/10 §7 queue post-this-PR, 2026-07-04):**
  1. **Motion — STILL DEFERRED.** Re-probed the Figma Plugin API 2026-07-04 (via
     WebFetch of the current VariableScope docs): FLOAT scopes are
     `ALL_SCOPES / TEXT_CONTENT / CORNER_RADIUS / WIDTH_HEIGHT / GAP / OPACITY /
     STROKE_FLOAT / EFFECT_FLOAT / FONT_WEIGHT / FONT_SIZE / LINE_HEIGHT /
     LETTER_SPACING / PARAGRAPH_SPACING / PARAGRAPH_INDENT` — no `TIME` scope,
     no motion/duration/animation scope. Config 2026 hasn't surfaced it. Recheck
     when it lands. easing/spring/transition composites have no Figma variable
     primitive — emit as `motion-styles.json` reference metadata only.
  2. **Follow-ups parked (typography #31):** fix 3b bindable form — `font-tracking`
     FLOAT collection (6 tokens: tighter/tight/snug/normal/wide/wider); rebind
     `letterSpacing` on all 36 text styles.
  3. **Follow-up parked (aurora + wendys full-materialise, from #50):** import the
     full aurora + wendys variable-artefact set into the Prism3 Test File via
     Figma MCP so their palette / color-×4-modes / typography / dims / layout /
     shadow / gradient collections all render live (structural gates already
     prove correctness; this is end-to-end visual confirmation). Separate PR —
     scope is heavier than a doc update.
- **Test file:** the Figma-MCP thread's target is "Prism3 Test File" (fileKey
  `Zrn9YDqrFiwjs2IfKInNY0`). It has 4 specimen pages already (Colour, Typography, Dims,
  Shadow, Gradient) + all the corresponding variable collections + styles imported live.
- **Run commands:** `npx tsx Prism3/engine/emit-figma.ts` writes `out/figma/{nb,aurora,wendys}/*.json`;
  `npx tsx Prism3/engine/test.ts` gates everything (400/400 today).

### Discussion backlog (2026-07-04) — owner-raised, awaiting decisions

Five items surfaced by the owner once the code-review sweep (HIGH+MED+LOW, generator/web lane)
closed. Logged so they survive context loss; **none is a commitment** until it lands as a decision
here or a merged PR. Test count is **542/542** as of the sweep close.

1. **Motion-in-Figma — what it unlocks (deferred, low urgency, NOT on the critical path).**
   Motion is **doubly** blocked in Figma, not just once: (a) the Variable API has no `TIME`/duration
   FLOAT scope (re-verified 2026-07-04), so a duration could only be a scope-less FLOAT; and (b) even
   if it existed, Figma has **no binding consumer** — prototype transitions / smart-animate don't read
   variables for duration or easing, so a motion variable would drive nothing. So the "unlock" is
   currently theoretical. *When both land* it unlocks: the last generated axis (duration/easing/spring)
   materialising into Figma → "every axis in Figma" complete; a **`reduced-motion` mode** (durations→0,
   the motion analogue of wireframe — a `prefers-reduced-motion` accessibility win); and motion
   round-tripping like colour/dimension. **But motion already flows to CODE consumers** (CSS
   transitions/animations) through the DTCG / `design.md` layer, where it's actually consumed — Figma is
   only a viewer, so this gap affects Figma-side *completeness*, not the E2E code pipeline. **Decision:**
   keep deferred; recheck when Figma ships a `TIME` scope AND a prototype/animation binding target
   (watch Config announcements). Already parked in the emit-figma-next queue (item 1 above) — this entry
   adds the "what it unlocks" rationale. **Verified 2026-07-04** against the *live* Figma developer docs
   (`developers.figma.com/docs/plugins/api/VariableScope`): the enum still has 14 FLOAT scopes, none for
   time/duration/motion. `VariableScope` is **platform-defined** (returned to the auto-updating plugin
   runtime), so updating the local Figma desktop app does NOT surface a missing scope — it's a genuine
   Figma-platform gap, not a stale local install.

2. **Independent emitter review (offered — owner to greenlight; Figma-emitter lane).** A *broad* re-read
   would largely re-surface what the code review already catalogued (M-07/08/09 + L-13/14 are the known
   emit-figma findings). Higher-value and non-duplicative: the **targeted adversarial pass docs/16
   gate-blind-spot #2 already names** — run a *second brand* (aurora/harbor + the extreme white-label
   fixtures: non-5-breakpoint, narrowed modes, gradients) through *every* emit-figma axis and diff the
   output against docs/10–11 spec + expectations. That catches CR-08 / M-07/08/09-class bugs by
   *generation*, not code-read. Would be **read-only** (produces findings handed to the Figma-emitter
   thread; no edits to `emit-figma.ts`/`out/figma`), coordinated so it doesn't collide with in-flight
   emitter work. **Open:** owner to greenlight scope (targeted second-brand pass vs full review).

3. **`core/` prefix on primitive Figma collections (open decision — Figma-emitter lane + web export).**
   Owner prefixed the primitive collections in the NB example with `core` to scan primitives-vs-semantics
   at a glance. **Assessment:** it touches **only `$collection` names in the raw-figma format** — the DTCG
   token paths, the `nbds.pds.*` / `prism.*` namespace, and the `{a.b.c}` aliases are all unchanged — so
   it's low-risk and does **not** move the token taxonomy (owner's read confirmed). It's a sound, common
   convention (Tokens Studio / many systems group `core`/`global`/`primitive` apart from `semantic`).
   Today the emitter names primitive collections `palette`, `dimension`, `font`(family/size/weight) and
   semantics `color`, `space`, `radius`, `size`, `border-width`, `focus`, `layout`, `opacity`, etc.
   **Recommendation: adopt it** — but decide it as a convention so the *generated* output matches the
   hand-authored NB file (else they drift). **Empirically resolved from the NB example** (`Tokens/New
   Balance/**/raw-figma`, 2026-07-04): the owner used **hyphen**, `core-<axis>` — primitives are
   `core-color`, `core-dimension`, `core-typography`, `core-breakpoint`, `core-motion`; semantics are bare
   (`color`, `radius`, `space-size`, `layout`, `motion`). So the form question is settled (hyphen, matches
   the file already tested importing into Figma). **The bigger implication:** this is a RENAME, not a bare
   prefix — the engine currently names its primitive collections `palette` / `dimension` / `font`, so
   adopting the convention means the emitter renames them to `core-color` / `core-dimension` /
   `core-typography` (+ `core-breakpoint`, and `core-motion` when motion lands). There's also deeper
   taxonomy divergence to decide separately (engine `space`/`size`/`border-width` vs NB `space-size`;
   engine `text-styles` vs NB `typography`) — align the whole Figma collection taxonomy onto NB, or just
   the `core-` primitive grouping? **Confirmed by owner:** `font-fluid` is SEMANTIC (not `core-`), and the
   primitive set = `palette`/`dimension`/`font` → `core-color`/`core-dimension`/`core-typography`. **Still
   open:** whole-taxonomy-align vs core-grouping-only; and the emitter's `variableId` round-trip must be
   verified name-insensitive (expected — IDs are per-variable). **Implementation is the Figma-emitter
   thread's** (emit-figma + out/figma), with a matching web-export tweak in the generator lane so the
   playground and CLI/engine agree. The emitter review now running will report the exact current collection
   names per brand to scope the rename.

4. **Interactive-state DIRECTION rationale (settled — now documented).** *Q: do hover/pressed go darker
   in light mode and lighter in dark mode?* **Yes** — `dir = family==='light' ? +1 : -1` (`modes.ts`):
   light steps to higher step numbers (darker), dark steps to lower (lighter). **Thought process:** an
   interactive state moves the fill toward **more contrast with the page it sits on** — light page →
   darker fill, dark page → lighter fill — so as the user engages (rest→hover→pressed) the control grows
   more prominent ("comes forward"), and the *same* move keeps the on-fill label legible (a darker fill
   lifts a white label's contrast; a lighter fill lifts a dark label's). Matches the step-based source
   systems (NB/Prism2) and mainstream convention (Carbon/Material darken-on-light). **The top-of-scale
   case the owner solved before** — action colour at the far end, so hover/pressed must step *down*
   instead of up — is now the **generalised L-01 fix (#60)**: on overshoot `walk` reflects inward,
   keeping the states distinct; the trade-off at the extreme is that distinctness (a soft goal) wins over
   the contrast-direction preference, while each state's hard contrast *contract* is still gated. Code
   comment enriched in `modes.ts` alongside this entry. **No open question** — captured for the record.

5. **Inspirations (`docs/13`) follow-through (tracked there; promote on decision).** Reviewed the
   owner-supplied research: **Astryx** (Meta's agent-first DS — CLI-as-agent-surface, typed component
   doc objects), **ds-brain** (a practitioner's DS×AI stack map — the *consumption-side eval harness* is
   the genuinely new idea for us), **Specs CLI** (DirectedEdges — extraction-only; the read-back verifier
   seat for a component-tier regression). `docs/13` already holds the convergence table + the "steal
   becomes a commitment only when it lands in `00-progress`" rule, so the actionable candidates are
   logged there, not duplicated here. **Candidates worth promoting when the agent-surface work starts:**
   a `cli.ts query` subcommand over `.ai.json` (retrieval surface before MCP), an `.ai.json` *discovery*
   layer (the sidecar is only useful to an agent that knows it exists), token-budget *tiers* for
   `.ai.json`, and a **consumption eval** (rubric + invented-token rate) built alongside the MCP adapter.
   **Open:** owner to say which (if any) to promote into the next-steps queue now vs. hold for the
   component/agent-surface phase.

6. **LLM skills in the agentic workflow (owner-raised, note for future discussion — 2026-07-04).**
   *Would building Claude/LLM "skills" (packaged SKILL.md instruction bundles, like the `brand-skills`
   repo ships) help the Prism3 agentic workflow?* **Take: yes, at two points, and they're complementary
   to — not a replacement for — the MCP surface.** The MCP adapter is the callable *tools*; a skill is the
   *instructions + discovery* layer that teaches an agent WHEN/HOW to drive them. (a) An **authoring skill**
   (`prism3-theme`) — teach an agent to brief a brand → drive `theme_brand`/the CLI → read the contract
   results → emit `design.md`. (b) A **consumption skill** (`prism3-consume`) — teach a *downstream* agent
   to use the generated tokens well: semantic roles not primitives, respect modes, honour `avoid_when`.
   Two nice ties: **(i)** a consumption skill's value is directly **measurable by the eval we just built** —
   add a "with-skill" arm and see if it moves invented/leak/contract-compliance (the same differential shape
   as with/without-surface); **(ii)** a skill fills the exact **docs/13 gap** — Astryx's `agent-docs`
   injection + the `.ai.json` "no discovery layer; the sidecar is only useful to an agent that knows it
   exists" note. And it slots into the existing chain: `brand-skills` (extract → `design.md`) → Prism3
   (tokens) → a `prism3-consume` skill (tokens → compliant UI). **✅ BOTH BUILT (2026-07-05):**
   `prism3-consume` (a) — measured by the eval's with-skill arm (100% compliance, see the decisions log +
   docs/17 §5); `prism3-theme` (b) — verified by the cold-agent compile loop (two fresh briefs compiled
   first-try clean, all 248 contracts holding). Skill placement (this repo vs. distributable) remains open.**

---

- **Figma plugin & host architecture grounding (`docs/18-plugin-and-host-architecture.md`, 2026-07-05).**
  A capability-grounding doc ahead of the plugin build (owner deferred the build itself past the long
  weekend; wants the web UI QA'd + the architecture pinned first). Sourced from the current Figma Plugin
  API docs. Nails: the **two-context execution model** (sandbox main thread = `figma.*` + document but no
  DOM/network; UI iframe = DOM/network but no `figma.*`; message-passing between) and how it maps onto our
  hosts — the engine core + control UI + preview run in the **iframe** (same code as the web dashboard),
  the **main thread is a thin variable/node writer** (the only plugin-specific tier), so `08 §3`'s shared
  layer lands exactly on the thread boundary. Documents the writable API surface (variables: create /
  addMode / setValueForMode / alias / bind; components: createComponent / combineAsVariants /
  `SLOT` property = the KB §15 slot contract) and the hard boundary (behaviour / a11y / motion / non-visual
  config are **not canvas-representable** — they live in code, which is what "lossy" actually meant; the
  canvas *build* from data is reliable). **Offline `.fig` ruled OUT** (closed format, no reliable writer) —
  the only reliable route onto the canvas is the Plugin API / Figma MCP. Adds the primitive-token vs.
  headless-primitive terminology guard. Cross-ref added from `08 §5`. Pure docs — no code, `out/*`
  untouched, `test.ts` unchanged (626). Complements `14` (component layer) — this is the *host capability*
  half, `14` is the *component-data* half.

---

- **`prism3-theme` authoring skill + cold-agent compile verification (`Prism3/skills/prism3-theme/SKILL.md`,
  2026-07-05).** Backlog #6 **(b)** built and verified — the *authoring* counterpart to `prism3-consume`,
  completing the two-skill story. A portable SKILL teaches an agent to turn a brand brief into a compiling
  `design.md`: the input contract (required `id`/`primary`(OKLCH)/`neutral`; the lever table with schema
  enums), the **discipline** (pin the brand's exact anchors in OKLCH and let the engine derive
  ramps/modes/contrast — never hand-author steps; omit a lever → its default = the plain-spec guarantee;
  adjective → lever mapping), and the **compile loop** (run `cli.ts`, read the contract results
  `aliases N/N | contracts M/M` + the notes, fix the *input* on a failed contract, re-run). Grounds itself
  in `schema/theme-schema.json` + the two example briefs (aurora maximal / harbor minimal) rather than
  duplicating them. **Verified with a hard pass/fail:** two cold `general-purpose` subagents, each given
  only the skill + the referenced examples/schema, authored a `design.md` from a fresh brief (**ember** —
  warm red-orange food-delivery, action-on-hero, one gradient; **sage** — muted-green wellness, tinted
  warm canvas, brand-supplied status, system fonts). Both **compiled first-try clean via `cli.ts`, exit 0,
  all 248 mode-contrast contracts holding** (ember 651/651 aliases, sage 640/640). Notably ember's warm
  red-orange landed in red territory so the engine folded `danger` into the primary palette + noted it —
  the "declare identity, engine derives system" contract working without the agent needing to know.
  **Pure docs/skill — no engine code, `out/*` byte-identical, `test.ts` unchanged (626).** The ember/sage
  briefs were throwaway verification (not committed as gated examples — that'd be a separate scope change
  to `emit-dtcg`; aurora/harbor already gate the CLI). **Placement OPEN** (same as #6a, flagged in the PR):
  the skill lives in `prism3-tokens` for now. Closes backlog #6 (both skills built); a larger multi-brand
  eval sample + wiring the authoring loop into a measured harness remain the refinements.

---

- **`prism3-consume` skill + the with-skill eval differential (`Prism3/skills/prism3-consume/SKILL.md`,
  `eval-run.ts`, docs/17 §4/§5, 2026-07-05).** Backlog #6 (a) built and measured — the agent-facing
  *consumption* layer of the four-layer stack. A portable, **brand-agnostic** SKILL packages the
  consumption discipline (semantic-role-not-primitive, respect modes, the decorative-border /
  disabled-exempt edges, the ink-on-surface pairs self-check) as instructions for any downstream agent —
  MCP or not. Wired into the eval as a `skill` arm (`buildPrompt(…, guidance, skill)` / `runEval({ skill })`),
  the portable sibling of the per-brand `guidance` (`.ai.json`) arm; the two **compose** (the skill teaches
  an agent to *read* the sidecar's `avoid_when`). **Measured (aurora, 4 tasks, 2 cold subagents/arm, pairs
  mode):** catalogue-only 93/86% compliance (always leaks `palette.success.050`); +`.ai.json` 94/97%;
  **+skill 100%/100%, 0% invented, 0% leak** — the portable skill matches-or-beats the per-brand sidecar,
  fixing both the leak (→`foreground.success-subtle`) and the two compliance edges (on-disabled→`ui`,
  decorative border dropped) that the raw metadata didn't reliably close. Honest limits: n=2, one brand,
  four tasks — directional. **Placement is an OPEN question** (flagged in the PR): the skill lives in
  `prism3-tokens` for now (co-located with the eval that proves it + the `.ai.json` it packages); whether it
  eventually ships as a distributable skill (its own repo / into `brand-skills`) is undecided — moving a
  markdown file later is cheap. Gates: `test.ts` **621→626** (skill embedded / absent / composes-with-guidance /
  back-compat byte-identity / threaded through runEval). Purely additive — `out/*` byte-identical, DTCG
  untouched. Closes the consumption-eval arc's final layer; the authoring skill (`prism3-theme`, backlog #6b)
  and a larger multi-brand sample remain the obvious next refinements.

---

- **emit-figma: the MED batch — M-08 silent-black + M-09 space-alias guard (`emit-figma.ts` + `out/figma`,
  2026-07-05).** Taken by the generator thread (emitter thread paused, owner-authorised); the two emit-figma
  MED findings the review named, each a *silent-degradation → loud-fail* hardening. **M-08 (a real shipping
  bug):** `parseColor` returned a silent `{0,0,0,1}` (opaque BLACK) for anything it couldn't parse, and it
  had **no 8-digit-hex branch** — so for `colorFormat:'hex'` brands the entire `black-alpha`/`white-alpha`
  transparency ramp (`#0000000d`…) and the shadow colours (`#060411xx`) were shipped to Figma as opaque
  pure black: the alpha ramp flattened, shadow colour wrong (black, not the brand navy) *and* opaque. Now
  it expands 3-digit hex like CSS (`#f00`→`#ff0000`), carries the alpha byte on 8-digit `#RRGGBBAA`, and
  **throws** on genuinely unparseable input (incl. the `parseColor(undefined)` unresolvable-alias path)
  rather than degrading to black. Regenerating corrected **aurora + wendys** `out/figma` (both hex-format);
  **nb** (`colorFormat:'rgb'`) untouched — the rgba path never regressed. **M-09 (latent):** `buildFigmaDims`
  emitted the `space` alias UNCONDITIONALLY, unlike every sibling axis (radius/size/border-width/focus),
  which guard with `isAlias ? {…} : null`. A space leaf carrying a raw px value (not a `{…}` ref) would ship
  `alias: { name: '' }` — a dangling empty-named binding Figma drops the link for. Space now matches the
  sibling contract; byte-identical for engine brands (space always aliases into dimension), so `out/figma`
  is unchanged by M-09. Two commits (one finding each). Gates: `test.ts` **600→614** (M-08: hex forms +
  alpha + rgb()/rgba() no-regress + the throw on undefined/unresolved-alias/garbage; M-09: no empty-named
  alias, every space aliases `dimension/*`, alias is null-or-nonempty), nb-regression exit 0, DTCG aliases
  647/647, mode contracts 248/248. `out/*.tokens.json` untouched. Closes the emit-figma MED tier; L-13/L-14
  (emitter LOW) still queued for that thread.

---

- **emit-figma: CR-08 layout-breakpoint fix (#65; `emit-figma.ts` + `out/figma`, 2026-07-05).** Taken by
  the generator thread (emitter thread paused, owner-authorised) — a real *shipping* bug the emitter review
  surfaced. `buildFigmaLayout` iterated a hardcoded `LAYOUT_MODES` (sm..2xl, 5) and read `gridNode[mode]`
  by name, so aurora's **six** breakpoints (xs..2xl) silently **dropped the base `xs` grid** (0px, 4-col
  mobile-first) on every regen — while still emitting `breakpoint/xs` as a constant, an internally
  inconsistent artifact; a ≤3-bp brand would have read `undefined` and crashed. **Fix:** derive the layout
  modes from the brand's actual grid keys (`Object.keys(gridNode)`, already ascending), not the hardcoded
  set. `LAYOUT_MODES` stays exported as the default breakpoint-name set. `out/figma/aurora/` now carries
  the previously-missing `layout.xs.json`; nb/wendys unchanged (5 bp). **Gate (the emit-layer blind spot
  the review named):** a new aurora (6-bp) block asserts one layout mode per breakpoint incl. `xs`, the xs
  grid carries the real base column count, every alias resolves across all 6 modes; the nb + generalise
  assertions are now breakpoint-derived (aurora 6 / wendys 5), not hardcoded 5. `test.ts` **595→600**,
  DTCG untouched. Closes #65; #67 (Token Press) still for that thread.

---

- **emit-figma: `core-` collection rename (#66; `emit-figma.ts` + `out/figma`, 2026-07-05).** Taken by the
  **generator thread while the emitter thread was paused** (owner-authorised). The Figma PRIMITIVE
  collections now carry a `core-` prefix for at-a-glance scannability in Figma's collection list:
  `palette→core-palette`, `dimension→core-dimension`, `font→core-font`, and `font-fluid→type-sets` (the
  responsive fluid-size collection). **Label-only, by design:** changed the four `$collection` labels, the
  text-style binding `collection` fields, and the output filenames (now `$collection`-derived). **Unchanged:**
  the DTCG tree, the `<root>.*` namespace, and every Figma **variable name** (`palette/red/550`,
  `font/family/*`, `font-fluid/*`) — they still mirror the DTCG paths, so the `variableId` round-trip and
  all cross-collection aliases resolve exactly as before (verified: **0 dangling** across nb/aurora/wendys,
  369/408/428 vars). Semantic collections keep bare names. `out/figma/*` regenerated (files renamed
  `core-*`/`type-sets`, old ones removed). **Fixture stance (#67):** `fixtures/figma/nb` keeps the OLD
  `$collection` labels — the byte-repro gate compares variable names/scopes/aliases/values (unchanged), NOT
  the label; the fixture is the Token Press byte-repro target and stays put until Token Press confirms the
  new labels. Deliberately did NOT adopt NB's `core-color`/`core-typography` base words nor merge
  `space`/`size` — the engine keeps its scope-per-collection split (better than the hand-file), per the
  narrow-scope decision. docs/10 carries a rename callout for the emitter thread to fold through on resume.
  Gates: `test.ts` **595/595** (text-styles collection assertion updated to `core-font`/`type-sets`),
  0 dangling aliases. `out/*.tokens.json` untouched (DTCG unchanged). Coordination: #66 (this), #67 (Token
  Press), #65 (CR-08 still queued for the emitter thread).

---

- **Consumption eval — the `.ai.json` guidance differential: 95% → 100% (`engine/eval-run.ts`, docs/17 §5,
  2026-07-04).** The experiment the pairs-mode gap called for, and the payoff of the whole arc. Added a
  `guidance` arm to the harness (`buildPrompt(..., guidance)` / `runEval({ guidance })`): the cold agent
  gets the catalogue AND each colour role's `.ai.json` `when_to_use | avoid_when | contrast`. **Live result
  — the three-arm differential:** WITHOUT surface → 48% invented; WITH catalogue (names) → 0% invented /
  **95%** compliance; WITH catalogue + `.ai.json` (semantics) → 0% invented / **100%** compliance (68/68).
  The guided agent did exactly what the metadata directed — **dropped** the decorative `border.primary`
  from its contrast pairs (its `avoid_when`: *"not a 3:1 target"*), **reclassified** `on-disabled` to the
  3:1 it declares, and moved to proper surfaces. **Each layer earns its keep as a number:** names kill
  hallucination (48→0), the `.ai.json` semantics kill mis-classification (95→100) — the four-layer stack
  (raw hex → names → metadata) demonstrated, one metric per layer. Directly motivates a **consumption
  skill** (backlog #6): it would package the same guidance portably, measured the identical way. Gates:
  `test.ts` **592→595** (guidance embedded / absent / threaded through runEval). Purely additive — `out/*`
  byte-identical. *This closes the consumption-eval arc: three metrics, the full with/without-surface AND
  with/without-guidance differentials, live.*

---

- **Consumption eval — pairs-mode harness + first live compliance number (`engine/eval-run.ts`, docs/17
  §4/§5, 2026-07-04).** Wired contract-compliance onto real agent output: passing a `theme` to `runEval`
  flips the prompt to **pairs mode** (`buildPrompt(..., wantPairs)`) — the agent returns
  `{task:{refs,pairs}}`, `extractPairs` pulls the `{fg,bg,kind}` pairings, and `runEval` scores
  `complianceByTask`/`complianceAggregate` alongside consumption (back-compat: no `theme` → refs-only).
  **First live run** (cold subagent, WITH catalogue, `atlas`): invented **0%** / leak **0%** / contract
  compliance **72/76 = 95%**. The 4 failures are the *interesting* part — **semantic-intent edges the token
  names can't carry**: `text.on-disabled` on `action.disabled` (3.05:1, the agent didn't know disabled is
  WCAG-exempt) and `border.primary` on `background.primary` (1.4:1, it used the *decorative* border as a
  3:1 `ui` element). Both are where the raw surface is insufficient and the agent needs `.ai.json`
  `avoid_when` / a consumption skill (backlog #6) — so the 5% gap is a measured argument for the metadata
  layer + the natural next differential (with vs. without `.ai.json`). Implies two metric refinements: a
  `disabled`/exempt kind, and honouring decorative-vs-functional role intent. Gates: `test.ts` **585→592**
  (pairs prompt/extractPairs/runEval-compliance/back-compat). Purely additive — `out/*` byte-identical.
  Rubric layer still deferred (docs/17 §4).

---

- **Consumption eval — contract-compliance metric (`engine/eval.ts` `scoreContractCompliance`, docs/17 §4,
  2026-07-04).** The third consumption metric, and the docs/04 contrast differentiator turned on the
  *agent's* output: for the fg/bg colour pairs an agent pairs on screen (`UsedPair { fg, bg, kind }`),
  resolve both roles per mode (`resolveAllModes`) and check the **raw** contrast (CR-01) clears the kind's
  floor — text 4.5, `ui`/`large-text` 3 (WCAG 1.4.11 / 1.4.3-large). Returns `{ checked, pass, rate,
  failures[], unresolved[] }`; fails if below floor in *any* mode where both roles resolve, a non-colour
  role lands in `unresolved` (not scored), no pairs → vacuously compliant (rate 1). Pure — reuses the
  existing mode/colour core, no new deps. Gated in `test.ts` (**578→585**: pass/fail/kind-floor/mixed/
  unresolved/empty). **Still to wire (docs/17 §4):** eliciting the pairs from the agent — the harness
  extracts a flat ref list today; a `pairs` output mode is the next harness step (mirrors how
  `scoreConsumption` preceded `runEval`). Rubric layer still deferred. Purely additive — `out/*` byte-identical.

---

- **Consumption eval — harness + first measured run (`engine/eval-run.ts`, docs/17 §3/§5, 2026-07-04).**
  The agent-in-the-loop harness on top of the scoring core: `SAMPLE_TASKS` (4 fixed component briefs),
  `buildPrompt` (WITH-catalogue vs WITHOUT-guess arms), `extractRefs` (JSON `{task:[refs]}`, tolerating
  ```json fences + prose fallback), and `runEval(tree, root, runner, {catalog})` → per-task + aggregate
  `ConsumptionScore`. **Pure orchestration — the model call is an INJECTED `ModelRunner`**, so the whole
  pipeline (prompt → model → extract → score) is deterministic + gated with a mock; a keyed environment
  swaps in a real Claude client (no script-usable API key exists in the dev sandbox — Claude access is the
  harness's managed OAuth, so real runs use the injected runner or, as here, subagents). **First measured
  run** (two cold `general-purpose` subagents, `atlas` brand): **WITH** the token catalogue → **0% invented
  / 0% primitive-leak** (53/53 valid); **WITHOUT** → **48% invented** (21/40 valid). The surface eliminated
  token hallucination — "MCP-first > screenshot-first" as a number (48%→0%). Invention concentrated where
  Prism3's names diverge from generic convention (`color.feedback.*`, `color.surface.raised`,
  `typography.heading.md`); the agent guessed the guessable `color.action.*` states unaided. Caveat noted
  in docs/17 §5: the WITHOUT baseline is partly stacked (denied the catalogue it was told to target) — the
  honest headline is the *elimination*, and a screenshot→CSS→map-back baseline is a later refinement.
  Deferred still: contract-compliance + rubric metrics (docs/17 §4). Gates: `test.ts` **567→578** (prompt/
  extract/mock-run/arm-selection). Purely additive — `out/*` byte-identical.

---

- **Consumption eval — scoring core (`engine/eval.ts` + `docs/17`, roadmap C follow-on, 2026-07-04).**
  First increment of the ds-brain steal (docs/13 §2): measure whether an agent handed the MCP surface
  produces *compliant* output — the consumption side the engine never measured (it verifies generation
  exhaustively but had no read on consumption). Built the **pure, deterministic scoring half**:
  `scoreConsumption(refs, tree, root)` → **invented-token rate** (refs to token paths that don't exist —
  the hallucination metric; cheap because the name contract is locked, docs/11) + **primitive-leak rate**
  (valid refs reaching past the semantic layer into `palette`/`dimension`/`font` — `PRIMITIVE_TIERS`,
  exactly the `core-*` grouping). `normalizeRef` accepts brace / root-qualified / relative forms; rates are
  occurrence-based, reported lists unique+sorted. **Pure — no `node:`, no LLM** — the agent-in-the-loop
  runner (drive a model on sample tasks against the MCP server, extract its refs, score them) is a deferred
  **edge shell** using the Claude API (docs/17 §3), opt-in, never the pure core. Contract-compliance +
  rubric metrics deferred to that phase (§4). The eval's payoff is *differential* — same tasks with the MCP
  surface vs. without, showing the surface moves the numbers (the four-layer thesis, measured). Gated in
  `test.ts` (558→567; clean/invented/leak/normalise/occurrence-rate/empty). Purely additive — `out/*`
  byte-identical. Design in `docs/17-consumption-eval.md`.

---

- **MCP adapter — layer C, "an agent themes Prism3" (`engine/mcp.ts`, docs/08 §5 / roadmap C, 2026-07-04).**
  The agent-callable surface over the pure core is live: a **dependency-free JSON-RPC 2.0 server over
  stdio** — deliberately NO `@modelcontextprotocol/sdk` (MCP is JSON-RPC + a 3-method core; owned the
  transport like the YAML parser + colour math, keeping the no-`npm install` invariant). It's an **I/O
  shell** (`node:` allowed; the pure core is imported, never touched) — the request handler
  `handleRpc`/`callTool` are pure + unit-tested directly, only the stdio loop behind `isMain` touches the
  process. **Three tools:** `list_levers` (returns the lever manifest verbatim — the knob catalogue the
  plugin + playground also render from, so the agent surface can't drift from them), `theme_brand`
  (a `BrandInput` → the DTCG token tree + `.ai.json` metadata + per-mode contract results + decisions
  log — the generate-and-verify payoff in one call), and `validate_brand` (schema pre-flight). **Design
  split:** the knob *catalogue* derives from the lever manifest (`list_levers`); the input *shape* is
  `theme-schema.json` (the precise, OKLCH-aware validation half — a `control:'color'` lever is an OKLCH
  object, not a string, so the manifest alone would be lossy). **Gates (`test.ts` 542→558):** the
  handshake (`initialize`/notification-silence/`-32601`), the tool catalogue, `list_levers` ≡ the manifest
  (drift gate), a full `theme_brand` round-trip (248/248 contracts + 647/647 aliases on the probe brand),
  and error paths (invalid brand → `isError`, unknown tool/method). **Live stdio smoke-tested** end-to-end.
  Purely additive — `out/*` byte-identical, pure core untouched. Run: `npx tsx Prism3/engine/mcp.ts`.
  *Next candidates (deferred): richer tools (`preview_brand` → resolved colours + overlay; `describe_token`
  → `.ai.json` query), and the consumption-eval harness (docs/13 ds-brain steal) alongside it.*

---

- **Code-review fixes L-10 — visualiser honesty + a surfaced nb gap (batch C, closes my LOW lane)**
  (`visualize.ts`, `docs/16` LOW tier). Three visualiser fixes: (a) the semantic-role table + preview
  render the modes the tree ACTUALLY carries (derived from `$extensions.prism3.modes`, canonical order)
  instead of a hardcoded four — a narrowed-modes brand no longer draws empty columns; (b) a failing light
  contract now prints its ACTUAL relation (`4.22<4.5` + a `no` class) instead of the literally-false
  `4.22≥4.5` the old code always printed; (c) the brand-controlled palette name is `esc`-ed
  (defence-in-depth — CR-03/L-06 already constrain it to a slug, so byte-identical for a valid brand).
  `out/*.tokens.json` + `out/figma` byte-identical; only `out/tokens.html` regenerated (which also picked
  up ~6 lines of pre-existing staleness — the committed html was behind the committed tokens.json on main).
  **Surfaced finding (flagged, NOT fixed here):** making the visualiser honest revealed 4 pre-existing
  light-mode shortfalls in **hand-authored nb** — `text.{success,danger,info}` and `badge info-subtle` on
  the `-subtle` tint surface land ~4.0–4.2:1, under AA 4.5. It's a CR-02-sibling (the role is contracted
  against the floor but used on a specific tint surface) and/or a preview-spec min-calibration question
  (alert body text is often large-text 3:1). Engine-GENERATED brands (aurora/harbor) clear it all-green;
  only the hand-authored NB reproduction shows it. Captured as a tested fact (test §10b) — a colour/spec
  fix would move nb token values + the regression baseline + is a design decision, so it's left for a
  follow-up call, not folded into this LOW visualiser PR. **L-12 was already resolved** during CR-06
  (`nb-regression` looks contracts up by palette name via `rampByPalette`, not positional `specs[0]/[3]`).
  **L-17 documented, not implemented:** the web rebuild runs `brandTheme`+`buildTree`+DOM synchronously per
  input event with no debounce — the review verified it has NO re-entry bug (all synchronous); a debounce
  is an optional perf enhancement with a small UX behaviour change and no web test harness, so it's left
  deferred rather than gold-plated. Gates: `test.ts` **542/542**, nb-regression exit 0, `out/*.tokens.json`
  + `out/figma` byte-identical. This **closes the LOW tier in the generator/web lane**; remaining LOW work is
  L-13/L-14 (`emit-figma`, the Figma-emitter thread's lane).

---

- **Code-review fixes L-06/07/08/09/11/15/16 — theme/parser/CLI LOW (batch B)** (`theme.ts` / `design-md.ts`
  / `cli.ts` / `standard-design-md.ts` / `resolve-preview.ts` / `web/main.ts`, `docs/16` LOW tier; second
  LOW batch). Seven input-boundary hardenings — token *values* unchanged everywhere; the only `out/*` delta
  is two lines of harbor's **decisions-log prose** (L-07, additive rationale, same class as the M-03/05/06
  notes) + the regenerated `modes-report.md`; `out/figma` untouched. **L-06** — gradient names now get the
  same slug charset + uniqueness guard palette names got in CR-03 (a dotted/spaced gradient name would break
  the `{a.b.c}` alias convention, caught only at emit if at all); RESERVED_PALETTES doesn't apply (gradients
  live in their own namespace). **L-07** — a brand-supplied status override seeds a **vivid, unanchored**
  ramp from its hue+chroma (not pinned at its measured lightness, unlike a brandColors accent). This is by
  design (a status role needs a full accessible ramp, not one swatch) but wasn't said; the note now flags
  that the measured swatch may not appear verbatim (harbor's success/warning notes gained the clause — the
  only shipped-brand output delta). **L-08** — two `design-md` parser gaps: the closing frontmatter fence is
  now an **exact** `---` line (the old `indexOf('\n---')` prefix match let a `--- x ---` value line close the
  block early and silently truncate the rest), and a **duplicate key** at one level now throws instead of
  silently last-winning. **L-09** — `--out` no longer swallows a following flag (`--out --fidelity` used to
  create a directory literally named `--fidelity`); a flag-like value fails loud. **L-11** — the web `slug()`
  string-coerces `id`, so a design.md pasted with a bare numeric `id:` no longer crashes both exports on
  `.trim()`. **L-15** — an unquoted `#hex` colour in a standard design.md (read as a YAML comment → null) now
  throws an actionable "quote it" error at the reader instead of a baffling `invalid hex 'null'` two layers
  down. **L-16** — `resolve-preview`'s `colors`/`byMode` are now typed `Partial<Record<ModeName,…>>` (matching
  the existing `dimOverrides`), so a consumer can't assume `.dark` exists on a narrowed-modes brand; every
  consumer already guarded with `?.`, so it's a type-honesty fix (web `tsc --noEmit` clean). Gates: `test.ts`
  **540/540** (528→540), emit-dtcg 647/646/640 aliases resolve + 248/248 contracts, nb-regression exit 0,
  web tsc clean, `out/figma` byte-identical, L-09 verified by driving the CLI both ways.

---

- **Code-review fixes L-01/02/03/05 — engine-core LOW (batch A)** (`modes.ts` / `color.ts` / `scale.ts` /
  `tree.ts`, `docs/16` LOW tier; starts the LOW-tier sweep after the MED tier completed at #59). Four
  silent-degradation guards, each byte-identical on the shipped brands (only `test.ts` gates + the four
  source files change; `out/*` untouched). **L-01** — the interactive-state `walk` clamped an overshoot
  to the ramp's terminal step, so at a ramp end hover(+1) and pressed(+2) collapsed onto the SAME step:
  visually indistinguishable states (each state's contrast was gated, their mutual distinctness never
  was). It now reflects inward on overshoot, preserving the step-count separation; a new invariant asserts
  default≠hover≠pressed for every fill/action/link group across all extreme brands × modes — only the
  near-black `t-dark` brand's HC modes actually saturated, and reflection kept every contrast contract
  green. **L-02** — `dualContrastWindow(r)` returned an inverted `[min>max]` window for r>√21≈4.58 (the
  max ratio any single luminance clears on BOTH extremes); it now throws, so a future HC-7:1 caller
  fails loud instead of reading an empty range as valid. **L-03** — `radiusScale` gained a weak-
  monotonicity tripwire (none≤sm≤md≤lg); equality stays legal (scale=0 collapses to sharp by design, small
  scales quantise onto the 2px grid), but a future non-monotone ladder edit throws. **L-05** — `pxOf` is
  now rem-aware (a `1.5rem` leaf scales ×16 instead of `parseInt`→1px), and `deref` returns `undefined` on
  a cyclic/runaway alias chain (reports missing) rather than a mid-chain alias node. Gates: `test.ts`
  **528/528** (452→528, +76 mostly the cross-brand distinctness invariant), nb-regression exit 0, `out/*`
  + `out/figma` byte-identical. **L-04 deferred (documented):** semantic borders' SC 1.4.11 contract is
  against `background.primary` only (narrower sibling of the fixed CR-02) — extending it to the worst-case
  tinted surface would change emitted border colours and touch `out/figma` (the Figma-emitter thread's
  surface), so it's left as a documented gap, consistent with the byte-identity + coordination discipline.

---

- **Code-review fixes M-10/M-11 — metadata / gate completeness** (`ai-metadata.ts` / `tree.ts`, `docs/16`
  MED tier; **completes the code-review MED tier in the generator/web lane**): two "the index/gate doesn't
  see non-`$value` refs" blind spots. **M-11** — buildTree's alias-resolution walk validated `$value`,
  composite sub-values, and mode-override `$value` refs, but NOT a fluid composite's
  `$extensions.prism3.responsive.{min,max}.ref`, so a ladder edit could ship a dangling
  `{root.font.size.NN}` while the alias gate reported clean. The walk now collects fluid refs too (alias
  totals rose to nb 647 / aurora 646 / harbor 640, all resolve); gate: an independent full-tree ref-count
  must equal `stats.aliases`. **M-10** — the `.ai.json` `aliased_by` reverse index was built from `$value`
  refs only, so a primitive consumed SOLELY by a dark/HC override showed zero consumers (contradicting the
  sidecar's own "cannot drift" note). An `allRefsOf` now collects `$value` + mode-override + fluid refs;
  purely additive (new `aliased_by` ⊇ old for every primitive — 0 dropped, 53 grew on nb). First tests of
  the previously-ungated sidecar. Gates: test **452/452**, nb-regression exit 0, token colours +
  `out/figma` byte-identical (M-11 validation-only; M-10 enriches `*.ai.json` only).
- **`emit-figma` — hide primitives from library consumers + thread DTCG
  descriptions into every Figma variable** (`engine/emit-figma.ts` +
  `engine/test.ts` block 23, 2026-07-04). Primitives (palette + dimension +
  opacity + font/family + font/size + font/weight — 217 variables in NB)
  now carry `hiddenFromPublishing: true`, so a file that subscribes to this
  as a design-token library only sees the SEMANTIC layer in the picker
  (color/space/radius/size/border-width/focus/layout/font-fluid/
  font/weight-role — 349 variables in NB). Scopes stay at their real
  role-family targets across every tier — Figma's Plugin API rejects
  non-matching scopes ("Invalid scope for this variable type" if you try
  `TEXT_CONTENT` on a COLOR/FLOAT var), and `scopes: []` is documented +
  probe-verified as ALL_SCOPES (setBoundVariableForPaint succeeds on a var
  with scopes=[]), so there is NO scopes-based mechanism to hide primitives
  from LOCAL pickers in the definer file. Production discipline: publish
  tokens as a library, author components in a separate consumer file, and
  hidden-from-publishing narrows the picker end-to-end. Also **threads
  `$description`**: every emit-figma variable's `description` now reads
  from the DTCG leaf's `$description` (the source-of-truth prose that
  already lived in `nb.tokens.json` + `nb.ai.json`). Font/family
  descriptions retain the fixture's stack line (fix #4) and append the
  DTCG description. Semantic-tier bytes are unchanged except the new
  descriptions; primitive-tier bytes gain `hiddenFromPublishing: true` +
  descriptions. Fixture-match gates hold (scopes match the frozen Token
  Press export exactly; the fixture never carried hide/description fields,
  and emit-figma now adds them separately-tracked). New block 23 gates
  the intent: 217 primitives hidden + 349 semantics not hidden + zero
  empty descriptions + spot-check descriptions equal their DTCG source +
  emit determinism. **Materialised to Figma via MCP (2026-07-04):**
  re-imported `wireframe-demo/*` with the new policy — palette flagged
  hidden, all 18 vars carrying prose descriptions — and re-rendered the
  two-column light↔wireframe specimen (screenshot at
  `Prism3/docs/assets/hidden-primitives-specimen.png`). Gates: test
  **621/621** (rebased onto the emitter-thread merges — #73 `core-*`
  collection rename, #74 CR-08 layout-per-breakpoint, #75 M-08/M-09
  parseColor + space-alias — so the primitive collections read
  `core-palette`/`core-dimension`/`core-font`, the aurora layout keeps its
  `xs` breakpoint, and the hex-brand alpha ramps stay correct; block-23's
  7 intent gates union with the consumption-eval blocks);
  nb-regression clean (ΔE00 1.95); emit-dtcg 248/248 contrasts per brand,
  every alias resolves; `out/figma/*` regenerated from scratch on the new
  baseline (primitives gain `hiddenFromPublishing` + descriptions; semantics
  gain descriptions), byte-identical on regen.
- **`emit-figma` wireframe axis — materialise-to-verify** (`Prism3/docs/assets/
  wireframe-specimen.png`, 2026-07-04): closes the parked visual-verification
  follow-up from #53 (Pillar 1b wireframe axis). Motion re-probed first —
  `TIME` still absent from the Figma FLOAT-var scope enum
  (`ALL_SCOPES / CORNER_RADIUS / WIDTH_HEIGHT / GAP / OPACITY / STROKE_FLOAT /
  EFFECT_FLOAT / FONT_WEIGHT / FONT_SIZE / LINE_HEIGHT / LETTER_SPACING /
  PARAGRAPH_SPACING / PARAGRAPH_INDENT / TEXT_CONTENT`); motion stays deferred.
  Materialised the wireframe axis into the Prism3 Test File via figma-console
  MCP on a specimen slice (7 palette primitives + 6 role vars × 2 modes + 5
  radius vars × 2 modes, namespaced `wireframe-demo/*`). A two-column frame
  flips the SAME structural layer tree between `light` and `wireframe` via
  `setExplicitVariableModeForCollection`, and Figma's alias engine resolves
  the flip live: `color/foreground/brand` violet → grey,
  `color/action/default` azure → grey, `radius.md/lg/round` positive → 0. The
  neutral roles (`background`, `text/primary`, `foreground/primary`, `border/
  primary`) stay identical in both columns as expected (Pillar 1b passthrough
  rule). This is the first end-to-end visual proof of the wireframe axis —
  the structural gates (test.ts block 22) prove the artefact shape, the
  specimen proves Figma's runtime resolves them. Docs-only: `docs/00` +
  `docs/10` updated; screenshot added under `docs/assets/`; engine untouched
  (test **448/448**, `out/*` byte-identical). The aurora + wendys
  full-materialise from #50 remains parked (separate PR — heavier scope).
- **Code-review fixes M-15/16/17 — web failing-state robustness** (`web/src/main.ts`, `docs/16` MED tier):
  three UX defects when a live edit doesn't resolve. **M-15** — exports ran off the live `brandState`, so
  tokens.json re-ran `brandTheme` uncaught (a failing edit threw in the click handler → no download, no
  feedback) and design.md serialized a brief its own importer rejects; both now export the **last-good**
  input/theme (always valid, re-importable, and exactly what the ramps already show). **M-16** — ramps
  paint from the last-good theme but the anchor badge computed from the live (maybe-failing) state → wrong
  swatch flagged; now a `lastGoodInput` (cloned on each successful rebuild) drives `anchorStepFor`.
  **M-17** — an import error rebuilt the menu with a fresh empty textarea (and a mode-toggle mid-paste did
  too), wiping the paste; `importText` now survives re-renders, cleared only on a successful load.
  **Verified headless** (forced failing state = accent renamed to reserved `neutral`): both exports
  download without crashing, the accent ramp keeps its anchor badge, a garbage paste shows the error +
  retains the text across a re-render; web typecheck + build clean, 0 page errors. No automated gate — the
  honest gate is a headless web-smoke harness, still the pending infra task first flagged for CR-07.
- **Code-review fixes M-12/13/14 — parser/CLI hardening** (`classify-colors.ts` / `color.ts` / `cli.ts`
  / `standard-design-md.ts` / `emit-dtcg.ts`, `docs/16` MED tier): three silent-crash / silent-drop paths
  in the standard-`design.md` ingest. **M-12** — the colour classifier lowercased for *classification*
  (`roleOf`) but extracted anchors with literal lowercase keys, so `{ Primary: … }` / `{ Error: … }`
  classified right yet dropped the anchor (or threw "no primary"). Now a lowercase-role→hex map (with the
  original token kept for mark/log) drives extraction — case-insensitive end to end. **M-13** — `hexToRgb`
  rejected 8-digit alpha hex (`#C8102EFF`, common in real extractions) as "invalid hex", and `cli.ts`'s
  `standardToBrandInput` call sat outside any try/catch → raw stack trace. Now `hexToRgb` accepts
  `#RGBA`/`#RRGGBBAA` and drops the (opaque-anchor-irrelevant) alpha, and the CLI wraps the classify call
  → readable diagnosis + exit 1 (verified: a no-primary brief prints "✖ could not classify …" and exits 1).
  **M-14** — `Number('soft')` → NaN passed `typeof === 'number'` + every min/max compare → NaNpx radius.
  Rejected at ingest (specific message) *and* hardened the validator's number/integer branch to require
  `Number.isFinite` (backstop for any number field). Gates: test **448/448**, nb-regression exit 0, `out/*`
  byte-identical (all three are CLI-ingest paths, not the committed brands).
- **Code-review fixes M-05/M-06 — theme-layer semantics** (`theme.ts`, `docs/16` MED tier): two
  brand-semantic defects in the danger/action carve. **M-05** — `inRedTerritory` was hue-only, so a
  warm greige primary (`c:0.03, h:30`) counted as "red" and `danger` reused the near-grey primary ramp
  → destructive signalling collapsed to a near-neutral (and `h:47` vs `h:47.5` flipped the strategy with
  no note). Fix: `inRedTerritory(hue, chroma)` now also requires `chroma ≥ RED_CHROMA_FLOOR (0.08)` — a
  red-ish-but-desaturated primary carves a real saturated red; the two carve reasons + a knife-edge
  boundary note are logged. **M-06** — `roleAnchorStep.action` was `primary ? anchorStep : 500`, so a
  non-primary `actionPalette` (a named accent) got the hardcoded 500 pivot, never its own pinned shade,
  while `nbTheme` anchors action at 550 (its accent step) — the white-label path diverged from the
  regression's own semantics. Fix: a brandColor `actionPalette` anchors the action at that accent's own
  step (`autoPlaceStep` of its L); `pickBrand` still nudges to clear AA, so a11y is preserved. Investigated
  the finding's "needs an owner ruling" flag → **byte-identical for committed brand colours** (aurora's
  accent coincidentally pins at 500; only decisions notes added), no a11y downside, aligns the engine with
  itself — a strict improvement, applied. Gates: test **439/439**, nb-regression exit 0, `out/*` colours
  byte-identical.
- **Code-review fixes M-01/02/03 — adversarial-anchor ramp hardening** (`ramp.ts`/`theme.ts`,
  `docs/16` MED tier): three ramp-generation edge cases where a pathological anchor produced silent
  garbage. **M-01** — `chromaForL` divided by `(lMax−peakL)`/`(peakL−lMin)`; an anchor L at lMax pinned
  at a non-top step made the top steps hit 0/0 → `#NaNNaNNaN` (10 steps in the probe). Guarded both
  spans; added a hex-shape gate (every step is `#rrggbb`). **M-02** — the anchor L is written verbatim
  *after* the knot monotonic-clamp, so an anchor whose lightness disagrees with its step (e.g. L=0.985 at
  step 50) left the ramp non-monotonic (step 50 lighter than 25), which the mode pickers misread. Added a
  post-generation guard that throws on any light→dark inversion (a consistent anchor via autoPlaceStep
  never trips it). **M-03** — an out-of-gamut anchor can't render exactly; `oklchToRgb`'s independent
  channel clamp silently shifts L *and* hue (aurora accent drifts h 2.5°, L +0.04), and the old
  anchor-ΔE gate compared two identically-clipped values (tautological). Fixed **coordination-safe**:
  `brandTheme` now surfaces every out-of-gamut pinned anchor in the decisions log (aurora `accent`,
  harbor `primary`) — rendering unchanged, no colour or `out/figma` ripple, only the note added; gate
  measures real rendered-vs-requested drift. **Deferred upgrade:** a constant-hue chroma *projection*
  (preserve L+hue, project C to the boundary) is the stronger fix but changes those brand colours and
  needs an all-emitter regen incl. `out/figma` — the Figma agent's surface with #53 in flight — so it's
  held for a coordinated change. Gates: test **414/414**, nb-regression exit 0, `out/*` colours
  byte-identical.
- **`emit-figma` — wireframe axis** (`engine/emit-figma.ts` + `test.ts` block 22, 2026-07-04):
  first mode-varying materialisation post-#50; unlocks Pillar 1b end-to-end in the Figma
  target. **Colour:** `'wireframe'` added to `COLOR_MODES` (canonical position: last); the
  existing intersection with `theme.modes` picks it up and the per-role alias comes from
  `$extensions.prism3.modes.wireframe.$value` — zero extra adapter body. **Radius:** first
  non-colour/shadow axis to be mode-varying — `buildFigmaDims` returns
  `radius: FigmaCollectionFile[]` (per-mode files, same shape as `color`). A non-wireframe
  brand emits a single `radius.json` (byte-identical to the pre-1b world); a
  wireframe-opted brand emits `radius.Default.json` + `radius.wireframe.json`, non-zero
  radii aliasing `dimension/0` and `radius.none` unchanged. No example brand opts in
  today; gated against a synthetic wireframe brand (same pattern as blocks 18 + 20).
  Gates: **400/400** (+16 wireframe: five colour-axis + eleven radius-axis + one drift
  fence), nb-regression ΔE00 1.95, emit-dtcg 248/248, default `out/figma/*`
  byte-identical (verified). Load-bearing precedent for any future mode-varying geometry.
- **Code-review fix CR-05 — design.md parser silently dropped misindented lines** (`design-md.ts`): the
  YAML-subset parser's `map`/`seq` loops run `while lines[pos].indent === indent`, so a line whose indent
  doesn't fit its block (one stray space) — or a no-colon/prose line (`if (ci < 0) break`) — ended the loop
  early and left that line **and everything after it** unparsed, with **zero diagnostics**: a designer's
  lever (or a whole trailing section) just vanished, and if the dropped key was optional the engine emitted
  defaults silently. Fix: track a 1-based source line per `Line`, and after parsing **throw if any line was
  left unconsumed**, naming the offending line number + content ("unparseable frontmatter at line N …").
  Loud failure instead of silent drop. Verified: the finding's exact probes now throw — a `chroma:`
  over-indented one space (drops `chroma` + trailing `radiusScale`) and a stray prose line (truncates the
  rest) — while the correctly-indented equivalents still parse byte-identically. The web import already
  try/catches `parseDesignMd`, so it now surfaces the error and keeps the working brand (better UX, no web
  change). Gate: adversarial parser suite (over-indent / stray-line throw with a line number; valid parses
  clean). test **368/368**, `out/*` byte-identical. **This clears the engine/web HIGH tier** (CR-01/03/04/
  05/06/07); CR-08 + the emit-figma MEDs remain with the Figma-emitter agent.
- **Code-review fix CR-04 — hand-rolled schema validator ignored keyword classes** (`emit-dtcg.ts`
  + `theme-schema.json`): the validator (the boot check for the CLI *and* the sandbox hosts) had no
  `boolean` branch (so `{type:boolean}` matched anything — incl. inside a `oneOf`, which is why
  `gradients:"banana"` passed → `brandTheme` then crashed on `.map`), checked `enum` only under
  `type:string` (numeric `titleFloor:[16,18]` unenforced), and never checked `minItems`/`maxItems`.
  So `[schema] ✓ conforms` actively vouched for inputs the schema rejects. Fix: added `boolean` +
  `integer` branches, moved `enum`/`const` to a **type-independent** check, added `minItems`/`maxItems`,
  and a **loud-fail guard** — an unhandled `type` now throws instead of silently passing, so the
  silent-ignore class can't recur. **The stricter validator immediately exposed a real schema↔engine
  drift** (the finding's 2nd probe): `families.variable` was declared `boolean`, but the engine's
  `BrandInput` accepts `boolean | Partial<Record<'display'|'text'|'mono', boolean>>` and **aurora uses
  the per-face object** — so the schema was mis-describing the contract. Corrected the schema to the
  real `oneOf[boolean, per-face-object]`; all three example brands conform again. Gate: adversarial
  validator suite (`gradients:"banana"` / `titleFloor:17` / short `easingEmphasized` / `variable:"yes"`
  all rejected; valid forms incl. the per-face object accepted). test **364/364**, `out/*`
  byte-identical (validation-only; no token change). *A stronger validator also backstops CR-03/CR-05.*
- **Code-review fix CR-06 — the NB regression can now fail** (`nb-regression.ts`): it was a pure report
  generator — ΔE00 outliers, contract failures, and dimension mismatches rendered as ⚠️/❌ markdown rows and
  it **always exited 0**, so a ramp-math regression shipped green (only a human reading the report noticed),
  and its ≤3 verdict was a *mean-of-means* (a single ΔE-15 step hides under a good aggregate). Fix: a real
  gate that sets `process.exitCode = 1` on any of — (1) a **per-step ΔE00 ceiling** (3.5 bar) with the NB
  hand-nudges enumerated in a `KNOWN_OUTLIERS` allowlist (each with its own ceiling, so a *new* regression at
  those steps still trips; replaces the static "known kink" prose that would have masked a fresh bug with the
  same signature — finding (c)); (2) a **covered-count assertion** (20 steps/palette — a truncated/renamed
  fixture → 0/0 NaN can no longer slip through — finding (a)); (3) any **contrast contract** fail; (4) any
  **dimension** mismatch. Also hardened `specs[0]`/`specs[3]` → lookup-by-palette (L-12) so a spec-order
  change can't point the contract gate at the wrong ramp. **Verified both directions:** current engine PASSES
  (exit 0 — every step within ceiling, 4×20 covered, 11/11 contracts, 23/23 dims); a simulated regression
  (amber.600 ceiling forced below its real 9.15) FAILS with exit 1 and a precise per-step message. test
  355/355 (unaffected — test.ts doesn't run this), `out/*` byte-identical.
- **Code-review fix CR-03 — brandColors palette-name guard (reserved / charset / duplicate)** (`theme.ts`):
  brand-colour names were unvalidated, and the palette map is last-wins (`new Map(palettes)` /
  `palette[name] = node`) — so a brandColor named `neutral`/`primary` silently **replaced** the engine
  ramp the whole surface model builds on, a status name (`success`/`danger`) was itself replaced by the
  later-pushed status ramp, and dotted/spaced/symbol names broke `{root.palette.…}` alias paths; contrast
  picks then recomputed against the corrupted map and passed self-consistently (green gates, nonsense
  output). Fix: `brandTheme()` now validates each `brandColors[].name` up front — rejects the 10 reserved
  engine palette names (`primary`/`neutral`/`success`/`warning`/`info`/`danger`/`white`/`black`/
  `*-alpha`), enforces the `^[a-z][a-z0-9-]*$` slug (also closes CR-07's XSS vector at the source — an
  HTML-metachar name can't validate), and rejects duplicates. Matches the existing `root`/`actionPalette`
  throw-at-boundary pattern, so the web import/rename path inherits it (rebuild fails → last-good kept).
  Added a schema `pattern` on the name (belt-and-suspenders; enforced by `validateBrandInput`). Gate:
  adversarial-name suite in the namespace block (reserved/dotted/spaced/symbol/duplicate all throw; a
  valid slug is accepted; schema half agrees). Gates: test **355/355**, `out/*` byte-identical (aurora's
  `accent` is valid — no valid brand changes), nb-regression clean. *L-06 (gradient names) is the adjacent
  LOW finding — same class, left for its own pass.*
- **Code-review fix CR-07 — web XSS: brand palette name reached `innerHTML`** (`web/src/main.ts:146`):
  the ramp anchor label built its markup with `meta.innerHTML = \`anchor <b>${name}…\``, and `name` is a
  brand-controlled `brandColors[].name` (pasted `design.md` / accent rename, no charset validation — CR-03).
  A name like `x</b><img src=q onerror=…>` executed on the next ramp paint. Fix: build the label with
  `el()`/`textContent` + a text node (the idiom the rest of the file already uses), never `innerHTML`.
  **Verified headless:** added a 2nd accent named with a tag-breaking `<img onerror>` payload (so the theme
  rebuilds cleanly), confirmed it reaches line 146 and renders as **literal text** — `<b>`.textContent is the
  raw string, 0 `<img>` elements in the doc, `window.__xss` never set, no dialog. Web typecheck + build clean.
  *Gate:* the honest gate is a headless web behavioural-smoke harness (gate blind-spot #8, also covers
  M-15/16/17); the repo has no web test runner yet, so that harness is a separate infra task — noted, not
  built here, to keep the fix surgical. The `readout.innerHTML` at `:283` is NOT a sink (`<input type=color>`
  value is browser-constrained `#rrggbb`); `visualize.ts` `esc()` gaps are the separate LOW finding L-10.
- **Code-review fix CR-01 — `contrast()` rounded before threshold comparison** (`color.ts` + emit
  boundaries; first of the project code-review backlog in `docs/16-code-review-findings.md`):
  `contrast()` did `Math.round(x*100)/100` *inside* the function, so every
  WCAG pass/fail compared the rounded ratio — a role at raw 6.9948 read 7.00 and **false-passed** a
  7:1 HC contract. Fix: `contrast()` returns the **raw** ratio; `ResolvedRole.ratio` holds raw (gates
  now compare un-rounded); rounding moved to the emit boundaries only (`tree.ts` role `contrast`/
  `contrastOnWhite`/gradient a11y, `ai-metadata.ts` `contrast_with`/gradient prose, `resolve-preview`
  splits raw-for-pass from rounded-for-display). Caught real shipped false-passes: **harbor** `hc-light`
  `success.700 @ 7.00` (raw 6.99) → corrected to `success.750 @ 8.43`; `on-success` cascaded 9.67→11.65.
  NB roles unaffected → `nb.tokens.json` + emit-figma NB output **byte-identical**; aurora byte-identical
  after the display-round fix. Added a regression gate (raw `#007ea1`/black = 4.4990 must read < 4.5;
  `contrast()` must not be pre-rounded). Gates: test **349/349**, nb-regression clean, emit-dtcg 622/622
  + 248/248, web typecheck clean. *One concern per PR + its gate, per the review's own guidance.*
- **Project code review — findings documented, nothing fixed** (`docs/16-code-review-findings.md`,
  2026-07-03): full-codebase review (engine + web + regression harness), baseline green first
  (336/336, out/* byte-identical). 8 HIGH + 18 MEDIUM + 17 LOW findings, headline: `contrast()`
  rounds before threshold comparison → WCAG false passes structurally invisible to the gates
  (probe-verified: raw 4.49898 reported as 4.50-pass); the contrast floor is two steps shallower
  than the shipped surface ladder; duplicate palette names silently hijack engine ramps; the
  schema validator ignores boolean/enum-on-number/minItems; the YAML parser silently drops
  misindented lines; nb-regression cannot fail (exit 0 always); web XSS via brandColors names;
  emit-figma layout crashes on non-5-breakpoint brands. Four cross-cutting themes: self-referential
  verification, NB-only structural gates, silent degradation over loud failure, validator weaker
  than schema. §5 lists the gate blind spots to close as fixes land — **one fix + its gate per PR**.
- **Pillar 1b — wireframe mode** (`modes.ts`/`theme.ts`/`tree.ts`, docs/11 Pillar 1b): `'wireframe'`
  is now a generated opt-in mode — a mechanical greyscale. `VALID_MODES` (five) splits from `ALL_MODES`
  (the default four, unchanged → four-mode golden byte-identical); wireframe is opt-in only, never a
  default. **Colour:** every *chromatic* role resolves on the **neutral** ramp at the position its colour
  pick would land, then re-nudged to clear the *same* min on neutral — so the greyscale still holds every
  contrast contract (verified: e.g. `foreground.brand` primary.550 → neutral.600, nudged one step to keep
  its 4.5:1 fill contract). Neutral/text/background/white/black roles pass through. **Geometry:** non-zero
  `radius.*` leaves gain `$extensions.prism3.modes.wireframe → {root.dimension.0}` — the *first* mode-varying
  geometry (same override shape colour/shadow use); `radius.none` stays override-free. Emit-figma
  coordination noted in the fresh-agent brief (radius collection needs a wireframe mode). Gates: test
  **344/344** (+8 wireframe: greyscale remap, radius→0, every wireframe contract holds), nb-regression +
  emit-dtcg `out/*` **byte-identical** (no example brand opts in), web typecheck clean.
- **Pillar 1b web — wireframe toggle + per-mode preview geometry** (`web/src/main.ts`,
  `resolve-preview.ts`): the brand menu gains a **Wireframe** toggle beside Dark/HC (`setModes`
  now takes a third flag, appends `wireframe` last = the engine's canonical mode order); the
  preview's mode selector extends to Wireframe automatically. Geometry is now per-mode:
  `resolvePreview` exposes **`dimOverrides`** (sparse — only refs/modes that differ from the
  canonical baseline, mirroring the tree's `$extensions.prism3.modes`), and `renderChip` reads
  `dimOverrides[ref]?.[mode] ?? dims[ref]` so wireframe squares off corners live. Verified
  headless: default 4 modes → enabling wireframe → 5 (Wireframe appended); a saturated Light
  chip `rgb(0,97,136)` collapses to the neutral `rgb(92,92,97)` (chroma spread 136 → 5) with
  radius 8px → 0px; 0 page errors. Gates: test **347/347** (+3 `dimOverrides`), web typecheck
  clean. No engine-value change (dims baseline untouched → nb-regression + `out/*` still
  byte-identical). Completes 1b end-to-end (engine + UI), mirroring the 1a #42→#43 split.
- **Deployment-target neutrality captured** (`docs/15-deployment-neutrality.md`): the owner named the
  likely *delivery* of the north star — an **AWS / Bedrock hosted E2E service** using **LLMs as needed**
  but with the **core staying pure deterministic code**. Recorded as an architectural *constraint*, not a
  build task: three layers (pure core / assistive-LLM edge / host+state edge), and the rule that hosting,
  persistence, auth, transport, and model calls live *outside* the core — LLMs propose inputs to and
  narrate outputs from the engine, never compute a token value inside it. AWS is just the next I/O shell;
  it validates the portable-core bet rather than changing it, and adds a *third* option for the export
  core (a hosted service Token Press calls, vs. a vendored package) — another reason the `12` vendoring
  call is safely deferrable. **The standing review check from here on: does a PR add I/O, state, or a
  model call to a pure module? If yes, it belongs in a shell.** Nothing to build; the line to hold.
- **Component-layer contract locked** (`docs/14-component-layer.md`, 2026-07-03): the owner's
  question — store components as data and build them in Figma on the fly, LLM-free, like
  variables — answered YES and captured as the architecture: definitions as type-checked data
  **seeded from the KB's ~40 component briefs (§15 schemas)** and **bound to the locked token
  names (docs/11)** so structure is brand/mode-invariant; write leg = an `emit-figma` component
  artifact executed by the B2 plugin via the Plugin API (REST can't create nodes; same two-route
  pattern as 08 §5); verify leg = **extraction diff** (Specs CLI verified extraction-only —
  its seat is the component-tier nb-regression, not the builder); ceilings incl. the
  **Figma Motion revision** (timing/easing variables now exist — the "transition = code-only"
  disposition in 05/10 is stale; KB 18–21 flagged for update). Build sequence: schema → 3
  components (Button/Text Field/Card) → artifact → materialize (MCP first, plugin after) →
  round-trip gate → scale. Doc-only; nothing built.
- **Inspirations log started** (`docs/13-inspirations.md`, 2026-07-03): reviews of external
  agent-first DS work — Astryx (Meta; CLI-as-agent-interface, typed `ComponentDoc` data files,
  `agent-docs` index injection, `--compact` tiers), the "ds-brain" practitioner stack map
  (docs-package-as-brain, generated skills/rules/indexes, **consumption-side evals**: rubric +
  invented-component rate + contamination-controlled trials), and Specs CLI (verified
  extraction-only). Convergence table at the end tracks patterns with multiple witnesses;
  identified gaps for us: `.ai.json` discovery layer, retrieval surface (CLI `query` / MCP),
  consumption evals. Doc-only change; no engine code touched.
- **Export-contract sequencing + Token Press eval** (`docs/12-token-press-monorepo-eval.md`): before
  building Pillar 4, two calls settled the order — (1) let the Figma-emitter agent **finish emit-figma**
  so the collection structure is stable (the shared `collections.ts` partition must mirror a settled
  reality), and (2) **decide whether the export *format core* moves into the monorepo** as a shared pure
  `@prism3/tokens-export` module both `emit-dtcg` and Token Press import — killing format drift by
  construction (recommended: **Option B**). `docs/12` is the hypothesis (from the Token Press handoff
  go/no-go. **Repo review complete (§9/§9c, 2026-07-03):** a Token-Press-side agent validated §7 against
  the real v2.3.1 source — Option B is *yellow* (separability/purity/presets ✅; composite *parity*
  ❌ refuted, the two outputs disagree today). Resolution: **pick the canonical shape first** — all five
  §9a shape decisions confirmed expressible against TP's source, with six refinements folded in
  (per-family format options, shared filename sanitizer, Prism3-side unfolder, `propertyAliases` option,
  core-owned `generator` block, +2–3d on the TP migration). Revised effort ≈ 2 weeks + 2–3d. Pillar 4's
  first line of code is gated on this (it sets the module boundary) + emit-figma + the owner's move
  decision; author it *at the shape boundary* regardless. Meanwhile **Wireframe (1b)** is independent and
  proceeds. *Next: build Pillar 4 at the shape boundary once emit-figma clears; Token Press move is a
  deferred, evidence-gated call.*
- **Pillar 1 web toggle — Dark/HC in brand setup** (`web/src/main.ts`): the brand menu gains a
  **Modes** control — `Light` fixed, `Dark`/`HC` toggles that write `brandState.modes` (HC adds
  hc-light, + hc-dark only when dark is on); `New brand` starts light-only. The engine re-resolves
  and the preview's mode selector narrows automatically (it iterates `rp.modes`); a dropped selected
  mode falls back to light. Verified headless: aurora 4 modes → Dark-off 2 → HC-off 1; New brand 1;
  0 page errors. No engine change; completes Pillar 1a end-to-end (engine + UI).
- **Pillar 1a — mode opt-out** (`theme.ts`/`modes.ts`/`tree.ts`, docs/11 Pillar 1): `BrandInput.modes`
  lets a brand decline dark/HC — `light` is the required base, `dark`/`hc-light`/`hc-dark` opt-in.
  `resolveAllModes` filters to `theme.modes`; the DTCG tree emits per-mode colour overrides only for
  opted-in modes (a light-only brand emits none); `resolvePreview`/the web mode switcher narrow
  automatically. Omitted → all four (back-compat, `out/*` byte-identical). Guards: must include light;
  unknown mode rejected (wireframe not yet a mode — that's 1b, spec in docs/11). Gates: test 323/323,
  nb-regression 1.95, emit-dtcg 248/248. *Next: the web toggle UI (Dark/HC in brand setup, light-only
  New-brand default) + wireframe (1b) + the export contract (Pillar 4).*
- **Multi-brand / mode-configurable VISION captured** (`docs/11-multi-brand-vision.md`): the
  enterprise north star — many brands over one *locked token-name contract* (names are the API;
  brands & modes are value-columns over it, swappable at runtime), modes the user can decline
  (light always; dark/HC/wireframe opt-in) or customize (light/dark accept an override layer, incl.
  a different dark CTA; HC/wireframe generate-only), and a **single export contract** so every exit
  (engine package / Figma emit / Token Press) yields the same by-collection × by-mode × by-brand
  artifact. Four pillars, phased: **mode config → export contract (pending Token Press eval) →
  override layer → brand families**. Not built yet — this is the plan. **Next: Pillar 1 (mode
  configurability).**
- **Web dashboard — preview on every stage + type specimen** (`web/src/main.ts`): the live
  component preview + contrast overlay (with the per-mode selector) now render on Semantic,
  Typography, AND Form — each reflects that stage's axis. Typography also gains a **type-scale
  specimen** (one composite per group at its resolved size, from `theme.typography`) so a
  `typeScale`/family/weight change is visible where the small component chips can't show it; the
  whole preview region is volatile so it repaints live. Stages 3–4 are now first-class. Engine
  untouched (312/312); web typecheck + build green; verified headless (specimen updates across
  compact/default/expressive, form preview present, 0 page errors).
- **Web dashboard — export** (`web/src/main.ts`): the brand menu gains an Export section —
  **design.md** (`toDesignMd`, #39) and **tokens.json** (resolved DTCG tree via `buildTree`,
  namespaced under the brand's `root`), both Blob-downloaded. Closes the E2E loop with the #38
  importer: verified in-browser that an exported `design.md` re-imports as the same brand (0 errors).
  Engine untouched (312/312); web typecheck + build green.
- **Web dashboard — brand setup** (`web/src/main.ts`): the brand selector is now a menu —
  switch example brands, **New brand** (minimal known-good starter), **Import design.md** (pasted
  `design.md` → `parseDesignMd` → loaded, guarded by a `brandTheme` accept-check; the working brand
  is untouched until it passes), and per-brand **Name** + **Namespace (`root`, #34)** fields (root
  validated inline). Lights up the `design.md` *import* leg of the E2E loop and gives #34's namespace
  a UI. Engine untouched (307/307); web typecheck + build green; verified headless (menu, new, import,
  namespace-valid/invalid — 0 page errors).
- **Web dashboard — staged four-stage shell + Stage 1 redesign** (`web/src/main.ts`): the approved
  design direction ported to the live app. Build order primitives → semantic → type → form; Stage 1
  is bespoke (scalable brand-colour list, generated ramps off `brandTheme().palettes`, and a neutral
  **Derive⇄Pin** toggle that surfaces the engine's `neutral.anchor`). Contextual per-mode selector on
  the Semantic stage; colour edits repaint only the volatile region. Engine untouched (307/307).
- **`emit-figma` — shadow + gradient** (`engine/emit-figma.ts` + `test.ts` block 14): styles,
  not variables (docs/08 §5 variable-type ceiling). **Shadow emits TWO style sets per step**
  (`shadow/xs..2xl + shadow/inset` for light-mode canonical; `shadow-dark/xs..2xl +
  shadow-dark/inset` for the reduced-alpha dark surface-lift pattern) — Figma Effect Styles
  don't support modes natively, so a plugin/component swaps the pair at mode transition.
  Every effect layer parsed to Figma primitives: DROP_SHADOW / INNER_SHADOW, {r,g,b,a} float32,
  offset/radius/spread, blendMode NORMAL. NB → 14 Effect Styles. **Gradient is opt-in**: NB has
  none (empty styles[], consistent shape), aurora emits 2 Paint Styles (brand + glow), each
  with 2 canonical alias-driven stops + 5 `sampledStops` (sRGB pre-sample of the OKLCH curve,
  since Figma interpolates in sRGB only) + a11y worst-on-white/black ratios (text-on-gradient
  contract). **Materialised to Figma via MCP** — 14 Effect Styles rendered on a two-row
  (light/dark) shadow specimen; 2 Paint Styles rendered as violet-azure linear + violet-glow
  radial swatches (aurora palette not yet imported, so demo uses sampledStops hex values —
  alias-driven form lands with the generalise pass). 14 new gates → `test.ts` **295/295**.
- **`emit-figma` — dims axis** (`engine/emit-figma.ts` + `test.ts` block 13): seven FLOAT
  variable collections (`dimension` primitives + `space`/`radius`/`size`/`border-width`/
  `focus`/`opacity` semantics — 94 vars total, 45 aliases). No fixtures (§2 covers only
  colour + typography), so gated structurally: variable counts match the DTCG tree, every
  alias resolves within the emitted collections, scopes narrow per family (space→GAP,
  radius→CORNER_RADIUS, etc.), opacity as PERCENT 0–100 (Figma OPACITY scope), focus's
  `strokeStyle` leaf skipped (no Figma variable primitive). **Materialised to Figma via MCP**
  — all 7 collections created, 45/45 aliases bound (incl. 3-level chains size→space→dimension);
  dims specimen renders geometry bindings on cornerRadius/width/height/padding*/opacity/
  strokeWeight; container fills bound to `color/background|foreground/*`. 16 new gates →
  `test.ts` **281/281**.
- **`emit-figma` — typography axis** (`engine/emit-figma.ts` + `test.ts` block 12): the
  `font` (38 vars) + `font-fluid.{desktop,mobile}` (10 vars/mode) variable collections
  byte-reproduce the NB fixtures, and 36 text styles apply the six §4 fixes (no `text/`
  wrapper, prescribed collection names, lineHeight PERCENT, letterSpacing PERCENT baked,
  primary family bound + full stack in description, fontStyle derived from weight-role via
  a named-instance table). Corrected the pre-fix `px-from-ratio`/`px-from-em` directive
  notes in `tree.ts` so an ad-hoc reader gets the current contract. **Materialised to Figma
  via MCP** — all 36 corrected styles bind fontFamily/fontSize/fontWeight to the real font
  vars, verification specimen renders on a fresh page with container fills bound to real
  `color/background|foreground/primary` (spike lesson). 25 new gates → `test.ts` **265/265**.
- **`emit-figma` — colour axis** (`engine/emit-figma.ts`): DTCG tree → Figma import artifact
  (`out/figma/nb/`), byte-reproduces the NB Figma fixtures (names/scopes/aliases exact). **Now
  handed off** — the Figma-emitter agent owns the rest (typography → remaining axes); see
  **`10-figma-materialization.md §6–7`** for that agent's remit.
- **Figma materialization contract + fixtures** (`10` + `fixtures/figma/nb/`) — the emit-figma
  spec + regression corpus, from two hand-run Figma-MCP import spikes.
- **Web dashboard** (`web/`, the monorepo's first host): renders knobs from the lever manifest +
  live preview + contrast overlay from `resolvePreview`; **colour + radius + type knobs are live**.
  *This thread's next work: deepen the dashboard, then the MCP adapter.*
- **Pure `tree.ts`** (buildTree extracted from the emit shell) → the browser hosts + emit-figma
  resolve the tree with no `node:`. **Lever manifest, preview spec, resolved-preview** — the shared
  contracts the surfaces render from.
- **`design.md` interchange + CLI** (dual-dialect) + the colour-role classifier + fidelity report.

Engine gates as of 2026-07-04: `test.ts` **430/430** (240 colour + 25 typography + 8 namespace + 16 dims + 14 shadow/gradient + 4 pin-a-neutral + 5 design.md-round-trip + 19 mode-config/wireframe + 13 emit-figma-layout + 3 dim-overrides + 10 emit-figma-mode-opt-out + 27 emit-figma-generalise + 21 code-review-HIGH-fixes CR-01/03/04/05 + 16 emit-figma-wireframe + 9 code-review-MED ramp-hardening M-01/02/03);
`emit-dtcg` 248/248 contracts per brand; `nb-regression` now a real gate (per-step ΔE ceilings + KNOWN_OUTLIERS, exits 1 on a fidelity regression — CR-06). The snapshot below is the
2026-07-01 token-layer baseline.

## Current status (2026-07-01)

**Every token category NB and Prism2 ship is now generated** — colour, dimension,
typography, motion, shadow/elevation, layout, and (opt-in) gradients — proven
against a real brand and proven white-label. From a ~7-input schema the engine generates gamut-aware
OKLCH ramps, places steps by contrast role, generates four contrast-verified
appearance modes, generates the space + radius scales from a primitive grid, and
emits consumable DTCG. It validates all of this against New Balance, and runs a
*second, synthetic* brand (`aurora`) end-to-end — synthesising status palettes,
carving a dedicated danger red the brand never specified, and applying a distinct
form factor (soft corners + compact density). Status, space, and radius
generation are all brand-input-driven, not NB-specific.

Headline numbers (regenerate with the commands below):

| Check | NB | Aurora (white-label) |
|---|---|---|
| Aggregate ΔE00 vs real NB (color) | **1.95** | n/a |
| Tonal-band contrast contracts | **11/11** | (same engine) |
| Cross-mode contrast contracts | **248/248** | **248/248** |
| **Dimension axis, exact** (Prism2 space + NB radius) | **23/23** | n/a |
| DTCG semantic aliases resolve (color + dim + size + type + layout + gradient) | **627/627** | **628/628** |
| Engine unit tests (colour math + extreme brands + typography + fluid + shadow + layout + gradient + surface-model + harshness + typography-weights/links + design.md-parser/CLI + standard-dialect/classifier/x-prism3 + lever-manifest↔schema drift + preview-spec binding-validity + resolved-preview contrast invariants) | **215/215** | (same engine) |
| Color primitives / dim grid emitted | 122 / 37 | 162 / 36 |
| Brand palettes / action source | red / **action = brand** (red) | primary+accent+… / **action = accent ≠ brand** |
| Form factor | comfortable / radius 1 (sharp) | compact / radius 2 (soft) |
| Emit profile | `nbds.*` / rgb | `prism.*` / hex |

Work now ships as **one PR per feature branch off `main`** (confirmed workflow).
All work through 2026-07-01 is merged to `main`.

**Structural work since the token layer completed (2026-07-01):**
- **`design.md` + CLI adapter shipped (build step A — the first adapter over the
  portable core).** A brand brief authored as YAML frontmatter (`engine/design-md.ts`,
  a dependency-free block-style YAML-subset parser + frontmatter/prose split)
  compiled by `engine/cli.ts` (`tsx cli.ts <design.md> [--out <dir>]`): parse →
  schema-validate → `brandTheme` (the pure core) → reuse the existing emit. No new
  token logic — `emit-dtcg.ts` now exports the reusable core (`buildTree` /
  `emitTheme` / `validateBrandInput`) and its two example brands are compiled
  **from** `examples/*.design.md`, so those files are the single source of truth.
  Two examples exercise complementary corners of the input space: `aurora.design.md`
  (**faithfulness** — reproduces the golden `out/aurora.tokens.json` **byte-for-byte**)
  and the net-new `harbor.design.md` (**coverage** — deep-teal, `action = primary`,
  warm-neutral greys + tinted page, measured status, comfortable/sharp, system
  stack + compact scale, gradients off; validated behaviourally: schema-conforms,
  622/622 aliases resolve, 248/248 contrasts hold). See `07-e2e-journey.md` §6.
- **Portable pure core.** The theming brain (`theme.ts` + `color`/`ramp`/`scale`/
  `modes`) is now Node-free — the only filesystem coupling (the NB fixture) moved
  to an I/O shell, `nb-fixture.ts`. Precondition for running the engine inside a
  Figma plugin sandbox, an MCP server, or a CLI. See `07-e2e-journey.md` §3.
- **Colour two-tier naming + mode-flattening.** Primitives `color.*` → **`palette.*`**;
  the semantic role layer `semantic.*` → **`color.*`** (the word "semantic" no
  longer appears in any path). Each role is now **one mode-agnostic token**: light
  canonical in `$value`, dark/hc modes as overrides in `$extensions.prism3.modes`
  (same shape as `shadow`; maps 1:1 to a Figma colour variable with modes). Locked
  convention in `06` §7b.
- **Space fidelity fix.** Restored Prism2's `space.150` (12px) and `space.250`
  (20px) — the engine had silently dropped them; dimension axis 21/21 → **23/23**.
- **E2E journey mapped** (`07-e2e-journey.md`): the designer↔developer↔agent
  pipeline, the portable-core architecture, `design.md` authoring brief, and the
  component-library layer (components-as-data + Code Connect) as layers 2–3 of the
  practice's four-layer AI stack.

---

## What exists

```
Prism3/
├── docs/
│   ├── 00-progress.md              ← this file (status + decisions + next steps)
│   ├── 01-token-architecture.md    ← the architecture spec / Theme Schema contract
│   ├── 02-nb-regression-pass.md    ← the NB regression: method + measured results
│   ├── 03-open-questions.md         ← semantic-layer decision backlog (elevation, scrim/opacity, disabled, white/black)
│   ├── 04-theming-playground.md     ← direction note: live theming dashboard / preview surface (web + Figma)
│   ├── 05-token-coverage-roadmap.md ← build backlog: remaining token categories (type, motion, shadow, layout, …)
│   ├── 06-surface-and-content-color-model.md ← the surface/content colour model + §7b as-built naming (palette/color) & mode encoding
│   ├── 07-e2e-journey.md            ← the designer↔developer↔agent pipeline; portable-core architecture; design.md; component layer (layers 2–3 of the AI stack)
│   ├── 08-theming-interfaces.md     ← the customization surfaces (plugin/playground/CLI/MCP/Figma-MCP); new-plugin + shared-lever-manifest decisions; two-route materialization; revised build sequence
│   ├── 09-architecture-and-repos.md ← platform architecture + repo/packaging (monorepo grown from prism3-tokens; web-dashboard-first); which of the owner's other plugins get absorbed vs stay downstream
│   ├── 10-figma-materialization.md  ← the emit-figma contract: exact Figma variable/style shape (proven by import spikes), colour + typography materialization rules, thread split; fixtures/figma/nb is the regression target
│   ├── 11-multi-brand-vision.md     ← the enterprise north star: many brands over one locked token-name contract; mode config → export contract → override layer → brand families
│   ├── 12-token-press-monorepo-eval.md ← the shared-export-core hypothesis (Option B: pure `@prism3/tokens-export` both emit-dtcg and Token Press import) + the §7 repo-review checklist → go/no-go gates Pillar 4
│   ├── 13-inspirations.md           ← field notes on external agent-first DS work (Astryx, ds-brain map, Specs CLI, …) — takeaways, gaps identified, convergence table
│   ├── 14-component-layer.md        ← the component-layer contract: components-as-data (seeded from the KB briefs, token-name-bound) → deterministic Figma materialization (plugin) + extraction-diff regression; LLM-optional by design
│   ├── 15-deployment-neutrality.md  ← deployment-target neutrality: pure core / assistive-LLM edge / host+state edge; the standing "no I/O, state, or model call in a pure module" review check
│   └── 16-code-review-findings.md   ← 2026-07-03 full-codebase review: the fix backlog (8 HIGH / 18 MED / 17 LOW, per-finding failure scenarios + gate coverage) + the gate blind-spot list (§5)
├── fixtures/
│   └── figma/nb/                    ← the NB import: palette + color×4 modes + font + font-fluid×2 (byte-reproduce targets) + text-styles (as-imported snapshot) — emit-figma's regression corpus (docs/10)
├── schema/
│   ├── theme-schema.json           ← the white-label BrandInput contract (JSON Schema; validated on every emit)
│   ├── theme-schema.example.json   ← a worked BrandInput (aurora) that conforms to the contract
│   ├── lever-manifest.json         ← generated: the shared-control contract (from levers.ts)
│   ├── preview-spec.json           ← generated: the shared live-preview spec (from preview.ts)
│   ├── example-brands.json         ← generated: parsed BrandInputs (aurora/harbor) the browser hosts boot from (from emit-brandinput.ts; the node-only design.md parser can't run in the sandbox)
│   └── nb-measured.json            ← NB regression measurement fixture (reverse-engineered anchors; a DIFFERENT shape, consumed only by nbTheme)
├── examples/                      ← authored brand briefs (design.md front door)
│   ├── aurora.design.md           ← faithfulness example (compiles to the aurora golden, byte-exact)
│   └── harbor.design.md           ← coverage example (net-new brand; behavioural acceptance)
└── engine/                         ← dependency-free TypeScript prototype
    ├── color.ts                    ← sRGB↔OKLCH, CIELAB, CIEDE2000, WCAG contrast, gamut-aware max chroma
    ├── design-md.ts               ← design.md parser: block-style YAML-subset → BrandInput + prose (pure, no I/O)
    ├── cli.ts                     ← CLI adapter: tsx cli.ts <design.md> [--out] — parse → validate → core → emit (I/O shell)
    ├── ramp.ts                     ← color ramp generation: exact anchor, 20 steps, chroma arc, 5 bands, contrast-role placement
    ├── scale.ts                    ← dimension axis: 4px grid + numbered space scale (8px rhythm) + radius + component sizes
    ├── theme.ts                    ← Theme builder: nbTheme() (measured) + brandTheme() (white-label: open brandColors[], action role decoupled from brand, status synthesis + danger carve + form factor)
    ├── modes.ts                    ← light/dark/hc-light/hc-dark, roles resolved by contrast target, brand-agnostic
    ├── nb-fixture.ts               ← I/O shell: reads the NB fixture off disk + defers to the pure core (keeps theme.ts Node-free / portable)
    ├── nb-regression.ts            ← diffs generated vs real NB, checks contracts → nb-regression-report.md
    ├── tree.ts                     ← the PURE DTCG token-tree builder: buildTree(theme) → full token tree (colour primitives + per-mode semantic aliases, dims, typography, shadow/gradient/motion) + contrast results + stats; also the shared PURE tree accessors (at/deref/pxOf/subNode/numOf/remPxOf/familyOf). No node:* (extracted from emit-dtcg so the browser hosts + emit-figma can resolve the tree without the I/O shell; docs/09)
    ├── emit-dtcg.ts                ← I/O shell over tree.ts: emits out/<id>.tokens.json per theme (NB + aurora + harbor, the last two compiled from examples/*.design.md) + modes-report.md; re-exports buildTree; EXPORTS emitTheme/validateBrandInput; validates aliases, mode contracts & BrandInput schema conformance
    ├── cli.ts                      ← CLI adapter: dual-dialect (engine-native + standard brand-skills design.md, auto-detected) → the core; --fidelity writes the report
    ├── standard-design-md.ts       ← reader + classifier→BrandInput (standardToBrandInput) + x-prism3 lever mapping for the STANDARD design.md dialect
    ├── classify-colors.ts          ← colour-role classifier: flat colors: hex map → engine anchors by naming convention
    ├── fidelity.ts                 ← full-parity fidelity report builder (observed vs generated; cli.ts --fidelity)
    ├── levers.ts                   ← the LEVER MANIFEST (PURE, no node:*): presentation contract for the BrandInput knobs (grouped/labelled/typed/ranged; 35 levers, 20 advanced); rendered by plugin/playground/MCP (docs/08 §4)
    ├── emit-levers.ts              ← I/O shell: writes schema/lever-manifest.json from the pure levers.ts (sandbox-portable split)
    ├── preview.ts                  ← the PREVIEW SPEC (PURE): sample components bound to semantic token paths + contrast pairs; plugin + playground render the same live preview from it (docs/08 §7 B1a)
    ├── emit-preview.ts             ← I/O shell: writes schema/preview-spec.json from the pure preview.ts
    ├── resolve-preview.ts          ← the RESOLVED-PREVIEW projection (PURE, docs/08 §7 B1b): resolvePreview(theme) → concrete colours per mode + live contrast overlay + dims (radius/space → px) + type (composite → family/weight/size, via the pure tree.ts buildTree); the runtime read-model surfaces consume
    ├── emit-brandinput.ts          ← I/O shell: writes schema/example-brands.json (parsed aurora/harbor BrandInputs) so the browser hosts boot from a VALIDATED brand without the node-only design.md parser (docs/09)
    ├── emit-figma.ts               ← I/O shell (docs/10): DTCG tree → Figma import artifact (out/figma/<id>/). COLOUR axis built — palette + color×4 modes, aliased, scopes derived from role family; reproduces fixtures/figma/nb exactly (names/scopes/aliases; values to float32 tol). Typography next
    ├── test.ts                     ← unit tests: colour-math invariants + 5 extreme-brand contracts + typography/shadow/layout/gradient/surface-model + harshness + typography + design.md-parser/CLI + standard-dialect/classifier/x-prism3 + lever-manifest↔schema drift + preview-spec binding-validity + resolved-preview contrast invariants + resolved dims/type validity + example-brands drift & all-green + emit-figma colour↔fixture reproduction (240 checks)
    ├── ai-metadata.ts              ← generates the AI-readable metadata sidecar (meaning/when/avoid/paired_with/contrast_with/mode_overrides) for the semantic layer
    ├── README.md                   ← how the engine works / how to run
    ├── nb-regression-report.md     ← generated (committed for review)
    ├── modes-report.md             ← generated, covers both themes (committed for review)
    ├── out/{nb,aurora}.tokens.json ← generated DTCG output per theme (committed for review)
    └── out/{nb,aurora}.ai.json     ← generated AI-readable metadata sidecar per theme (the agent surface)
```

### How to run

```bash
# Node ≥ 20. No npm install — color math is self-contained.
npx tsx Prism3/engine/nb-regression.ts   # regression vs real NB
npx tsx Prism3/engine/emit-dtcg.ts       # emit DTCG + modes, validate (+ schema conformance) — NB + aurora + harbor
npx tsx Prism3/engine/test.ts            # unit tests: colour math + extreme-brand contracts + design.md/CLI + lever-manifest drift
npx tsx Prism3/engine/emit-levers.ts     # (re)emit schema/lever-manifest.json — the shared-control contract
npx tsx Prism3/engine/emit-preview.ts    # (re)emit schema/preview-spec.json — the shared live-preview spec
npx tsx Prism3/engine/emit-brandinput.ts # (re)emit schema/example-brands.json — the browser hosts' validated boot brands
npx tsx Prism3/engine/emit-figma.ts      # (re)emit out/figma/<id>/ — the Figma import artifact (colour axis; docs/10)
npx tsx Prism3/engine/visualize.ts       # regenerate the style-guide HTML (out/tokens.html)

# Web dashboard adapter (the monorepo's first rendering host — docs/09). NEEDS npm install (esbuild).
npm install && npm run -w @prism3/web dev     # esbuild dev server on http://127.0.0.1:5173
npm run -w @prism3/web build                  # bundle to web/dist/

# CLI adapter — theme an arbitrary brand brief:
npx tsx Prism3/engine/cli.ts Prism3/examples/harbor.design.md [--out <dir>]   # engine-native dialect
npx tsx Prism3/engine/cli.ts Prism3/examples/wendys.design.md --fidelity      # standard brand-skills dialect + fidelity report
```

---

## Decisions log (why things are the way they are)

- **`toDesignMd` — the `design.md` serializer (inverse of `parseDesignMd`) (2026-07-02).**
  Export needed a `BrandInput → design.md` direction; the module only had parse. Added `toDesignMd`
  to `design-md.ts` (pure, node-free — same portable-core fence as the parser, so the web bundle can
  import it). It emits each **defined** top-level key as a **one-line flow value** (`primary: { l, c, h }`,
  `brandColors: [{ name, oklch: {…} }]`), which the existing flow parser reads straight back — so
  `parseDesignMd(toDesignMd(x)).input` deep-equals `x`. Only own defined keys are emitted, so an omitted
  optional (no `root`) stays omitted (exact round-trip, no phantom keys). Strings are emitted bare unless
  they'd mis-type (numbers/bools/null) or carry structural chars, in which case quoted. Gated (test.ts
  block 17): round-trip identity for aurora + harbor + a synthetic brand (custom root + `neutral.anchor` +
  `brandColors` + `actionPalette`), omitted-optional stays omitted, prose survives the fence. This is the
  engine half of **export**; the web download UI (design.md + DTCG via `buildTree`) is the paired web PR.
  Pure addition — `out/*` byte-identical. Gates: test 312/312, nb-regression ΔE00 1.95, emit-dtcg 248/248.

- **Pin-a-neutral — a pre-defined brand grey can anchor the neutral ramp (2026-07-02).**
  The white-label neutral was *always* derived from a hue + peak chroma cast (`brandTheme` built it
  with no anchor, unlike primary/brand-colours which pin their exact OKLCH). Some clients ship a
  pre-defined neutral, so `BrandInput.neutral` now takes an optional `anchor: OKLCH`: when set, the
  ramp is built AROUND it — pinned verbatim at `autoPlaceStep(anchor.l)`, hue/chroma taken from the
  anchor — reusing the exact `generateRamp({ …, anchor })` mechanism the brand palettes already use
  (zero new ramp math). `neutral.hue`/`chroma` stay required (the derived readout / the UI's Derive
  mode); the anchor drives when present. `roleAnchorStep.neutral` stays 500 — that's the semantic
  neutral *role's* preferred step for contrast resolution, independent of where the pinned *primitive*
  lands. Surfaced as an optional advanced colour lever (`neutral.anchor`, "Pin a neutral") so the web
  UI can render a Derive⇄Pin toggle. Gated (test.ts block 16): the pinned grey is reproduced at its
  step (ΔE < 1), the derived ramp genuinely differs, and the pin flows through to the DTCG neutral
  primitive. Default output byte-identical (no example sets an anchor; `out/*` unchanged). *Deferred
  outlier:* a neutral kept as its OWN separate palette — expressible today via `brandColors`, no engine
  work, so not built. Gates: test 307/307, nb-regression ΔE00 1.95, emit-dtcg 248/248.
- **Namespace is a customizable lever — `root` on `BrandInput`, default placeholder `prism` (2026-07-02).**
  The emit namespace was hardcoded to `prism` in `brandTheme` (only the NB fixture used its own
  `nbds`). It's now `BrandInput.root` (optional, default `'prism'`): a single, mode-invariant token
  namespace, one segment only — every token emits under `<root>.*` (primitives `<root>.palette`,
  semantics `<root>.color`). Threaded through the one place that had leaked past `theme.root`
  (gradient stop aliases were hardcoded `prism` — fixed) and gated: a custom root re-homes **every**
  alias to `{<root>.…}` with zero `prism` leakage (test.ts block 15), a dotted/spaced root throws at
  the engine boundary *and* fails schema (added `pattern` support to the hand-rolled validator so the
  schema's `^[a-z][a-z0-9-]*$` is enforced, not decorative). `root` joins `id` in `identityFields`
  (host-supplied identity, not a lever-form knob). Default output is **byte-identical** (out/* did not
  change). *Rationale:* `prism` is a placeholder every engagement should override; making it a lever is
  the minimum change and keeps the single-brand-root invariant fully intact (see the "no two-segment /
  no removal *yet*" note below). Decisions: (A) **single segment, no two-segment** namespaces
  (`nbds.pds.*`-style) — the user's call; the legacy two-segment convention is not reproduced.
  (B) **Namespace is forced** — always present. Removing it entirely (un-prefixed `color.*`) is a
  *deferred* option, NOT built. When we revisit, the clean method is an **emit-time flatten**: keep the
  tree namespaced internally (so `Object.keys(tree)[0]`-as-root, the alias resolver, emit-figma, and
  resolve-preview all keep working unchanged), and drop the wrapping key + rewrite `{prism.x}`→`{x}`
  in every alias **at the `emit-dtcg`/`emit-figma` boundary only**. Do *not* model "none" as an empty
  `root` — that yields a `{ '': … }` key and malformed `{.palette.x}` aliases across ~8 sites. Tradeoff
  to weigh then: a namespace prevents collisions and preserves provenance when a brand's tokens are
  consumed alongside others (the multi-brand case this engine serves), and DTCG/Figma consumers expect
  a top group — so "none" is a deliberate, informed opt-out, never a default. (C) UI to set/change the
  namespace is a later web increment (brand-setup surface, alongside `id` — not the primitives page).
- **`emit-figma` colour axis built — byte-reproduces the NB Figma fixtures (2026-07-02).**
  First increment of the materialization adapter (`10 §5`): `engine/emit-figma.ts`, an I/O shell
  over the pure `tree.ts`, walks the DTCG tree → the Figma import artifact
  (`out/figma/nb/{palette,color.<mode>}.json`) — `palette` (122 primitives) + `color` (95
  semantics × 4 modes), every semantic a name-based `VARIABLE_ALIAS` into `palette`. The split
  the contract calls for holds in code: the DTCG carries the *semantic* facts (per-mode
  `aliasOf`), the adapter owns the *Figma-target rendering* (role-family→scopes, name transform,
  `rgb→{r,g,b,a}` via `Math.fround` for Figma's float32, two-pass alias-by-name; ids omitted,
  Figma assigns them). A `test.ts` gate reproduces `fixtures/figma/nb/` exactly — names, scopes,
  and every per-mode alias target (0 mismatches, all 4 modes), values to float32 tol (~5e-7);
  240/240. Scopes are derived in the adapter (the DTCG doesn't emit them) — correct per the
  contract, not a directive gap. *Rationale:* the colour axis was the spike-proven byte-target;
  now owned once + gated. Next: typography (`font`/`font-fluid` vars + text styles with the six
  §4 fixes), then the remaining axes + generalize.
- **Freeze the `emit-figma` contract + NB Figma fixtures as the regression target (2026-07-02).**
  Two hand-run Figma-MCP import spikes (colour, then typography) proved the engine's
  `$extensions.prism3.figma` directives are directly usable, so the DTCG→Figma translation is
  mechanical — the job is to *own it once* (`emit-figma`) rather than re-derive per agent (the
  `09` drift trap). Captured the real NB import as `fixtures/figma/nb/` (Token Press raw export:
  `palette` + `color`×4 modes; `font` + `font-fluid`×2 modes; a Plugin-API `text-styles` dump) and
  wrote the contract in `10-figma-materialization`. Two fixture classes: **byte-reproduce**
  (palette/color/font/font-fluid) and **reference-with-known-deltas** (`text-styles` is the
  *as-imported*/pre-fix snapshot — the six typography fixes are intentional deltas, so gate against
  the *corrected* expectation, not that file). Verified the engine reproduces the colour aliases
  exactly (action 550/450/700/300; background.secondary neutral.050/900) — a genuine
  byte-comparable target, same discipline as `nb-measured.json`. `emit-figma` reads the semantic
  facts (aliases, per-mode values, fluid modes, weight-role numerics) and **derives** the
  Figma-target rendering (scopes from role family, collection/style names, line-height %,
  letter-spacing binding, fontStyle→named-instance); the engine directives don't yet emit per-leaf
  `scopes`/`collection`, which is `emit-figma`'s to own. *Rationale:* the spikes' findings +
  owner's Token Press exports. Full contract + thread split in `10`. PR #27.
- **Platform packaging: monorepo grown from `prism3-tokens`, web dashboard first (2026-07-02).**
  Owner-locked answers to the "one engine, two hosts" packaging question (full shape in
  `09-architecture-and-repos`). (A) The web dashboard and Figma plugin are **two adapters over one
  core** — both import the same engine module and render from the shared lever manifest + preview
  spec + `resolvePreview`; continuity is structural, not a sync. (B) They live as packages **in this
  repo** (`web/`, `figma-plugin/` beside `Prism3/engine/`), not a fresh repo and not three published
  repos — one version, a lever change lands everywhere in one commit; `brand-skills`/`knowledge-base`
  stay their own repos. The "no build" invariant holds for the core (tsx); the *adapters* get a
  bundler (a browser/Figma bundle is a packaging step, not a port). (C) **Web dashboard first** —
  fastest loop, no sandbox constraints, cleanest proof the shared contracts drive a real UI; the
  Figma plugin then reuses the same renderer. **Plugin consolidation:** the three separate Figma
  plugins (theming, text-style, style-guide-generator) get their *function* absorbed into the new
  B2 plugin (never their code — each carries a separate brain); the **style-guide generator lays
  tokens out as frames on the Figma canvas** (canvas documentation — a distinct capability the
  `visualize.ts` HTML preview does *not* replace, so it's a B2 feature, not a retirement). Token
  Press (different org) + the CLI templating system stay **downstream, contract-connected** via DTCG
  output, never merged. *Rationale:* owner decisions — "grow prism3-tokens into a monorepo," "web
  dashboard [first]," + the style-guide-generator correction. Resolves the packaging question `08`
  raised but didn't settle. **Scaffold BUILT the same day:** root `package.json` (workspaces
  `["web"]`, `type: module`) + a `web/` esbuild + vanilla-DOM adapter that imports the pure
  engine modules and renders 15 manifest knobs + 22 preview chips + a 4-mode contrast overlay
  from `resolvePreview`; boots all-green (verified headless). New `emit-brandinput.ts` →
  `schema/example-brands.json` supplies the browser a validated boot brand (test-gated). Engine
  stays buildless (218/218); only the adapter bundles. Full layout in `09 §3`.
  **Interactive loop landed (PR #24):** the colour-axis knobs are LIVE — primary (colour
  picker → OKLCH anchor) + neutral hue/chroma + actionPalette mutate the in-memory `BrandInput`,
  re-run `brandTheme` + `resolvePreview`, and repaint the preview + overlay; a non-resolving
  combination is caught and surfaced.
  **Geometry/type-from-tree landed (PR #25 + B):** `buildTree` extracted to the pure `tree.ts`
  (PR #25); `resolvePreview` now also returns `dims` (radius/space → px) + `type` (composite →
  family/weight/size), resolved from the tree via shared pure accessors (also lifted out of
  `visualize.ts`). The chips render real radius/padding/type, and **`radiusScale` + `typeScale`
  are now live too** (6 live knobs). Density/motion/shadow stay read-only — the current chips
  don't render those axes. A `test.ts` gate asserts every dim → positive px and every type →
  family + positive size (220/220).
- **Dogfood the shared preview model in `visualize.ts` before building the hosts (2026-07-02).**
  Rather than take the leap straight from the B1a/B1b portable model to two new live hosts (DOM
  playground + Figma-node plugin) in a fresh repo, the static style-guide generator was made the
  first consumer of `previewSpec` + `resolvePreview(theme)` — it renders each component/variant from
  the resolved role colours + token-tree dims + resolved type composite, with the per-mode contrast
  overlay driven by the same `byMode.pass` results. *Rationale:* prove the "define once, render
  everywhere" contract composes a real UI + live overlay from one source **in-repo, behind the
  existing gates**, so the host renderers (B1c/B2/B3) start from a validated binding+overlay pattern
  instead of an unproven one. Additive and output-scoped (only `visualize.ts` + regenerated
  `out/tokens.html`; pure core untouched, tokens byte-identical, 215/215). PR #22.
- **Theming interfaces: new plugin + shared lever manifest (2026-07-01).** The customization
  surfaces (Figma plugin, web playground, CLI, MCP, Figma MCP) are five adapters over one core,
  not five products (`08-theming-interfaces`). Decisions: (A) the Prism3 Figma plugin is a **new**
  build on the engine core, not an evolution of the existing theming plugin — the core is reused
  (never re-implemented, the KB round-trip drift trap), the plugin is a fresh materialization +
  control shell that inherits every engine option and dissolves the existing plugin's namespace/
  options/font-weight pain points; (B) the web playground and Figma plugin aim for **near-continuity**
  — one shared **lever manifest** + live-preview model, not two hand-maintained UIs (two visual
  editors = two surfaces of drift). The manifest is the *presentation* half (labels/groups/UI
  ranges/knob type) that `theme-schema.json` (validation half) lacks; the plugin, playground, and
  MCP tool schema all render from it, so continuity is structural, not a manual sync. Materialization
  has two routes over the same output — plugin knobs (manual) and Figma MCP (agentic) — within the
  Figma variable-type ceilings (COLOR/FLOAT/STRING; typography→atoms+Text Style; shadow→Effect/code).
  *Rationale:* owner decisions — "build new on the new engine"; "strive for near-continuity, a lot is
  possible inside a Figma plugin." Resolves `07 §8` open decision #3. Full shape + build sequence in
  `08`; next increment is the lever manifest.
- **`design.md` is the E2E interchange contract; adopt the open spec (2026-07-01).**
  The pipeline tools (all owner-built: `brand-skills` extractor, this engine, Token Press,
  three *separate* Figma plugins, the CLI templating system) connect through **one shared
  format — `google-labs-code/design.md`** — which we follow, not fork. Decisions: (A) the
  engine **regenerates from anchors + emits a fidelity report** (NB-regression pattern) and
  does not trust extracted ramps as final; **one generator** — `brand-skills` *describes*
  (stays standalone-complete, so a brand-skills-only user still gets usable colours), the
  engine *generates* the verified system; the base file stays pure spec, engine-only levers
  via **defaults + an optional `x-prism3:` extension**; **align `brand-skills` type-role names
  to the engine's semantic vocabulary**. The one new parser piece is a **colour-role
  classifier** (flat `colors:` map → anchors by naming convention). Full contract in
  `07-e2e-journey.md` §11. Validated (real Wendy's `design.md`) that every anchor the engine
  needs is present. Next: a Wendy's spike before any step-A rework.
- **`design.md`: block-style YAML frontmatter + hand-rolled parser; the CLI reuses
  the emit core; examples are the single source of truth (2026-07-01).** The locked
  plan called for YAML frontmatter + a minimal parser; on build, a *block-style*
  subset (indentation nesting + `- ` sequences + flow `{}`/`[]` leaves) beat a
  flow-heavy minimal parser because the whole point of `design.md` is human- *and*
  agent-authorability, and the doc's own example uses block-at-top + flow-for-leaves
  (owner chose "what do you recommend"). Rather than let the CLI duplicate the emit
  pipeline, `emit-dtcg.ts` was made the home of the reusable core (`buildTree` /
  `emitTheme` / `validateBrandInput`) behind an `isMain` guard, and its example
  brands are compiled **from** `examples/*.design.md` — so "faithfulness" is
  structural (the golden IS generated from the brief) and the explicit byte-diff
  test is belt-and-suspenders. Harbor uses **warm-neutral greys** (neutral hue ~65)
  against its cool teal brand (owner decision) so the brief's "warm off-white page"
  is honest, not aspirational — the neutral ramp hue is independent of the brand
  hue, a real teal-brand-with-warm-greys pairing, and it genuinely exercises the
  surface floor-shift lever. *Rationale:* user decisions after surfacing both forks
  before building.
- **Portable pure core, not a plugin/CLI (2026-07-01).** The engine is a
  dependency-free *library* wrapped by thin adapters (Figma plugin / CLI / MCP /
  API), not a single app. Kept the core I/O-free so it can run in a Figma sandbox;
  the NB fixture read lives in `nb-fixture.ts`. Same brain everywhere → the plugin
  inherits every engine option, and no forced LLM (knob-turning, a `design.md`
  file, or an agent all feed the same core). Rationale in `07-e2e-journey.md` §3–4.
- **Colour: `palette` primitives + `color` roles, mode as a value (2026-07-01).**
  "semantic" is a tier concept, not a name segment — it left the paths. The tier
  designers use got the intuitive `color.*`; the reference tier got `palette.*`
  (ref-vs-sys split). Mode is no longer nested in the name: one token per role,
  light canonical in `$value`, other modes in `$extensions.prism3.modes` (matches
  `shadow`; maps 1:1 to a Figma colour variable with modes). Rejected mode-in-name
  because it breaks "same name, different value per mode" and fights the Figma
  round-trip. Full note: `06` §7b.
- **Space scale reproduces Prism2 in full (2026-07-01).** An audit for a requested
  12px spacer found `SPACE_KEYS` had silently dropped Prism2's `150` (12px) and
  `250` (20px). Restored both — the "reproduces Prism2's full space scale" claim is
  now true, not aspirational (dimension axis 21/21 → 23/23).
- **Build a real prototype, validate against NB.** The thesis ("a brand is a
  small input set the engine expands") is only credible if the engine can
  reproduce an existing hand-built brand. NB is the regression target.
- **TypeScript / Node, dependency-free.** Color math is owned in `color.ts` so
  the engine runs without a network install and the math is auditable. Run via
  `tsx`/`ts-node`; no build step.
- **Keep our intent grammar** (tonal bands, contrast roles) rather than copying
  a vendor's ramp shape. The engine generates from intent, not from NB's hexes.
- **OKLCH generation with exact-anchor preservation.** The brand value is a
  *pinned* step, never shifted (verified: NB `red.550` reproduced at ΔE00 0.05).
- **Chroma arc, not a flat plateau.** First cut held chroma constant and the
  light tints blew out (green.050 ΔE00 20); the regression falsified it. A
  chroma arc that tapers toward both ends dropped green's mean 6.23 → 1.88.
- **Contrast-role-targeted step placement (gap 1).** Steps are *placed* at the
  luminance their role needs, not on an even-L curve. The Mid-Tone 500 sits at
  the dual-side AA pivot (Y≈0.18, clears 4.5:1 on white *and* black). Took the
  contrast contracts to 11/11 and, because NB is Univers-derived, also tightened
  the perceptual fit (aggregate ΔE00 2.14 → 1.95).
- **Modes are derived, not hand-mapped.** Primitives are shared across modes;
  each semantic role re-resolves to a primitive step by contrast target against
  the mode's surface. The brand anchor is preserved where it can be and
  auto-adjusted where it can't (a dark-mode action lightens when the anchor can't
  clear AA on a near-black surface).
- **Surface & content colour model (2026-06-29 — SUPERSEDES the property-led
  vocabulary entry below).** A UI-designer review of the generated style guide
  reworked the semantic layer (full spec: `01` §4.1 As-built + `06-surface-and-
  content-color-model.md`). `background` = the thin page **canvas** (`primary/
  secondary/tertiary` **tonal in both modes** — light is no longer all-white +
  an `inverse.*` ladder); `foreground` = the **surfaces/fills** on it (Prism2's
  `surface`, renamed: tonal ladder + `inverse.*` + bold semantic + `-subtle`
  tints + stateful `danger`); `text`/`icon` = **ink**; `action.*` = the
  interactive fill (now **top-level**); `border` = `primary/secondary/inverse/
  {semantic}/focus`. Dropped the `elevation.*` colour group (elevation = a
  foreground tier + a shadow), `background.subtle`/`sunken`/`quaternary`. Renamed
  `on-emphasis→on-inverse`, `interactive→action`. Fixed the incoherent
  `foreground.primary=950`/`secondary=200` (now a real tonal ladder; the dark
  fill is `foreground.inverse.primary`). HC carries elevation by **border**.
- **Semantic vocabulary: PROPERTY-LED — `background` / `foreground`(fill) /
  `text` / `icon` / `border`, with per-property interactive states.** *(Historical
  — superseded by the surface & content model entry above.)* Decided
  against a nine-system field survey (M3, Carbon, Atlassian, Fluent, Polaris,
  Primer, Spectrum, Radix, Tailwind/shadcn) cross-referenced with the practice KB,
  and aligned to New Balance's actual taxonomy. Top level is the *property* you're
  colouring; `foreground` is the element **FILL** (NB's meaning — not text).
  Interactivity is a per-property `interactive` variant carrying STATES (the
  applicable subset of default/hover/pressed/focused/visited/selected/disabled),
  not a parallel duplicated tree. `background.*` = inert container surfaces (+
  semantic tints); `foreground.*` = fills (neutral tiers + semantic + `interactive`
  + stateful `danger`); `text.*` = text (tiers + semantic + `on-*` pairs + `link`
  via `interactive`); `icon.*` = a full peer group that for now MIRRORS `text`
  (a future toggle relaxes icons to the 3:1 non-text floor so they diverge — see
  03-open-questions); `border.*` = neutral + semantic validation + `interactive`
  (focus ring = `.focused`). `info` palette newly synthesised. ~96 semantic roles
  × 4 modes. Field evidence: property-led is the field *majority* (Atlassian,
  Polaris, Primer, Carbon, NB all split text/bg/border/icon as peers); `on-*`
  pairing universal. *Rationale:* user decision after research — match NB's real
  structure (foreground=fill; text/icon/border as peers) rather than the
  role-led/content-grab-bag shape an earlier pass shipped. Semantic intents are
  static except `danger` (destructive fills carry states); inverse is modest
  (one `inverse` per property, leaning on per-mode resolution). Text on a vivid
  fill targets AA (gamut-bounded — 7:1 unreachable on a saturated mid), everything
  else escalates in HC.
- **Surface ladder + scrim/opacity primitives (backlog Items 1/2/4).** Decided
  against a 10-system field survey + KB §4. Elevation tiers renamed to an ordinal,
  use-case-neutral ladder `background.{primary,secondary,tertiary,quaternary}`
  (page→floating), plus `subtle`/`sunken`/`inverse` + semantic tints. The
  `overlay` tier name is GONE (it's overloaded across the field — floating surface
  vs scrim); component→tier mapping is documentation, not baked into the name.
  Light tiers converge in colour (elevation = shadow, a deferred effects axis);
  dark tiers step lighter (M3 lift). New primitives: an `opacity.*` scale and
  `black-alpha`/`white-alpha` ramps (composite over any surface — Radix/Fluent),
  and a `scrim.default` semantic token (alpha-based, heavier in dark per
  Spectrum/Fluent/Radix). White/black policy: pure primitives kept, surfaces route
  through the tinted neutral; a white page converges (shadow-carried), a tinted
  page (aurora `neutral.50`) lets cards step to white. *Rationale:* user decision
  after research — numbered ladder honours prior practice + the field's
  use-case-neutral camp; shadows deferred to an effects pass (KB lift pattern).
- **Motion axis — generated from a `tempo` personality lever (backlog roadmap §motion).**
  Decided against a 7-system survey + KB `18-motion-foundations`. The motion analog
  of the density/radius levers: `motionPersonality.tempo` (snappy/standard/relaxed)
  scales a non-linear duration ramp; easing roles (`standard`/`enter`=decelerate/
  `exit`=accelerate/`emphasized` + a `calm` accessibility curve) ship field-verified
  beziers (Carbon/M3); springs (`snappy`/`gentle`/`bouncy`) carry M3 spatial params
  by perceptual outcome; **composite `transition.*` tokens** bundle duration+easing
  (Atlassian model — the AI-trustworthy layer); reduce-motion is a **derived**
  output (Apple "substitute, don't delete": informational preserved/floored,
  vestibular → 0), not a hand list. Where we beat NB's fixed ramp: the personality
  lever, composites, the `calm` a11y curve, and derived reduce-motion. Aurora demos
  `snappy` (ramp compresses 50/100/200… → 40/80/160…). Motion is mode-invariant
  (sibling of the dimension axis), not per-mode colour.
- **AI-readable metadata sidecar — `out/<id>.ai.json` (prototype).** Per KB
  `31-color-systems §9` + `00-principles` ("descriptions = highest-ROI; avoid_when
  > when_to_use"): a generated agent surface for the semantic layer, peer to the
  DTCG `tokens.json`. Each of the 89 semantic roles gets `$description`, `meaning`,
  `when_to_use`, `avoid_when`, `paired_with`, `contrast_with`, and `mode_overrides`
  — all **generated** (prose from a deterministic role→intent model; the relational
  fields reshaped from data the engine already computes: the on-* pairings, the
  floor contract `against`/`min`/`ratio`, and the per-mode resolution). The point:
  *contract-true* metadata that regenerates every build, vs the field's hand-authored
  metadata that rots. `tokens.json` stays DTCG-pure (no non-standard sibling keys);
  the sidecar is the natural input for the planned MCP server + theming playground.
  `avoid_when` correctly redirects (e.g. `foreground.interactive` → "use
  foreground.danger for destructive"). Also fixed a `$description` redundancy bug
  ("…band — Mid-Tone"). `$description` ("what it is") and `meaning` ("what it
  signifies / is for") are distinct — e.g. `text.danger` → "Destructive / error
  text." vs "Destructive / error signalling." A refinement pass made state variants
  informative ("…on pointer hover") and differentiated the neutral-fill tiers.
  **Primitive tier added** (planned-for, not assumed away): every primitive
  (colour ramps, white/black, alpha, opacity, dimension grid, motion) gets a
  simplified set — `$description`, `meaning`, colour-scale **`intent`** (the
  Univers/NB contrast-role of each ramp step, from its band — e.g. 500 = "the
  dual-side AA pivot", anchor steps flagged), `tier`, `consume` (private vs
  consumable per family), and **`aliased_by`**, the reverse index of *which tokens
  resolve to it*. `aliased_by` makes the sidecar a bidirectional graph for impact
  analysis across all families (e.g. `dimension.8` ← `radius.md` + `space.100`;
  `color.accent.600` ← the interactive/link roles) — and it **cannot drift**: it's
  recomputed from the token tree on every build (authoritative at build time, never
  hand-maintained), and re-aliasing in this engine is a recompute, not a manual
  edit. Sidecar now `{ semantic, primitives }` (~89 + ~194–233 entries/brand).
- **Contrast is validated against the floor surface, not the pure extreme.**
  Saturated, contract-bearing foregrounds (action + states, vivid semantic text,
  secondary/tertiary text) clear
  their ratio against the most-tinted supported surface — light/hc-light →
  `neutral.50` (a step off white), dark/hc-dark → `neutral.950` (a step off
  black) — not pure white/black. Pure white is the *most forgiving* light
  background; a colour that only just passes there breaks the moment it sits on a
  `neutral.50` card. Validating against the floor builds in headroom so the
  colour holds across the elevation range, and is symmetric with the dark side
  (which already used `neutral.950`). Without it, a saturated colour that only
  clears 4.5:1 on pure white drops below AA the moment it sits on a `neutral.50`
  card. *Rationale:* user direction — "actions need to meet contrast on surfaces
  that sit on top of white, not just pure white; otherwise it breaks with other
  light neutrals."
- **The primary surface — and therefore the floor — is configurable.** A brand
  can declare a non-white/black page surface per mode via `surfaces` (base =
  `white` | `black` | a neutral step); the contrast floor moves with it (a
  tinted base defaults its floor one step further toward mid), and the engine
  **flags a non-default surface in notes for confirmation**. Defaults reproduce
  the white/`neutral.950` behaviour exactly, so brands that don't set it are
  unaffected. Proof: aurora declares its light page as `neutral.50`, the floor
  auto-moves to `neutral.100`, and `foreground.interactive.default` resolves to `accent.600`
  (4.95:1 on the tinted page) — two steps off the naive white-only pick.
  *Rationale:* user direction — "we may need to allow a user to confirm the
  primary surface colour that's not white, and that would change the floor."
- **Disabled is a selectable strategy; default is contrast-preserving.** A
  `disabledStrategy` input chooses `accessible` (default — disabled text/icon/
  border clears `disabledMin`, default **3:1**, on the floor; escalates to 4.5:1
  in HC) or `conventional` (intentionally sub-AA, leaning on the WCAG 1.4.3/1.4.11
  inactive-component exemption). `disabledMin` is tunable per engagement. Disabled
  *fills* stay a muted neutral (non-text, uncontracted) under both. Decided
  against a 12-system field survey: **0/12 meet 4.5:1 on disabled text**, only
  Primer (~3.45) / USWDS / Tailwind-opacity-50 (~3.5) clear ~3:1, and **none ship
  a selectable accessible-vs-conventional toggle** — so this is a genuine
  differentiator and matches the usability literature (NN/g, Adam Silver, Adrian
  Roselli, GOV.UK: *exempt ≠ unreadable*). Mechanism is flat resolved values, not
  opacity — opacity can't guarantee a floor (it stacks and is non-deterministic
  over colored fills) and would break the engine's computed-contract model.
  Reconciles the KB (`31-color-systems §3`), which already prescribed shipping
  both `inactive` (preserved) and `disabled` (exempt) and defaulting to the
  former — the engine just hadn't implemented it. *Rationale:* user decision after
  research — "an option where disabled just barely meets contrast minimums," as a
  user selection.
- **Status palettes are engine-supplied; danger is carved (white-label).** A
  brand supplies primary + neutral; the engine synthesises success/warning from
  canonical hues. If the primary is in red territory the brand red *is* the
  danger red (NB); otherwise the engine carves a dedicated danger red the brand
  never specified (aurora). Proven by running a second, non-red brand end-to-end.
  *Rationale:* status-from-anchors only worked because NB happened to supply
  them; a real white-label brand won't, and `danger == primary` for a red brand
  is a coincidence that breaks for everyone else (review finding).
- **Open brand-palette set + action decoupled from brand.** The white-label
  input takes `primary` + `neutral` + an arbitrary `brandColors[]` (secondary /
  tertiary / accent — any number), and `action` is now a FIRST-CLASS semantic
  role mapped independently of `brand`. Many brands' hero colour is a poor or
  reserved interactive colour, so `actionPalette` points action wherever the
  brand needs; it defaults to `primary` but the engine **emits a note flagging
  the decision** so it's confirmed, never silently assumed. Proven on aurora: a
  violet hero brand whose `foreground.interactive.default` resolves to a separate azure
  `accent.500`, while NB keeps `action = brand` (red) by design. *Rationale:*
  user direction — "action is not always the primary brand colour; needs
  flexibility built in, and the system should confirm which colour drives
  actions."
- **Two emit profiles, one engine.** `nbds.*`/rgb for the NB regression
  (byte-comparable to real NB) and `prism.*`/hex for product output
  (DTCG-aligned, Style-Dictionary-ingestible). Resolves the namespace + value-format
  review notes without losing NB comparability.
- **NB's per-step hue kinks are NOT reproduced, by design.** Per-step hue drift
  would be a brand input the schema deliberately resists ("resist the seventh").
  The `amber.600`/`red.300` outliers characterise NB's hand-authoring; they are
  not an engine gap (review finding — reframed from an earlier "opt-in feature").
- **Dimension axis mirrors the color architecture: primitives + semantic
  aliases.** A primitive `dimension` grid (4px: 0,1,2,4,6,8,…,128) with `space`,
  `radius`, and component `size` tokens aliasing into it — the same shape as
  color ramps + semantic roles. Reproduces our chosen targets **exactly** (23/23)
  and aurora runs a *different* form factor (compact / scale 2) through the same
  code. Integer px, so the bar is exact equality, not perceptual ΔE.
- **Naming taxonomy POV — numbered-multiplier space, t-shirt only at the
  component layer** (knowledge-base 02/22/24; matches the user's preference and
  the Prism2 house standard). The reasoning, pressure-tested rather than copied
  from NB (which is a *fidelity test*, not the taxonomy authority):
  - **Space** is a numbered-multiplier scale at the *reference* tier:
    `space.100`=1×, `.200`=2× … on an **8px rhythm** (`space.100`=8px). The
    number means "n× base" *invariantly across brands* — the white-label-honest
    encoding the KB calls for. NB ships a legacy t-shirt ramp (`4xs…3xl`), which
    the KB explicitly warns against (t-shirt breaks past ~7 steps); we
    deliberately did **not** follow it. So SPACE validates against **Prism2**
    (16/16), the system whose taxonomy we adopted; radius — t-shirt in both
    systems — still validates against **NB** (5/5).
  - **Two bases, by design:** a 4px *fine grid* backs radius/borders; an 8px
    *space rhythm* backs spacing. Prism2 proves this split (fine 2/4/6 for
    corners, 8-step rhythm for layout).
  - **Density moved to the component tier.** A numbered scale is already
    near-primitive, so remapping `space.400` by density is murky. Instead the
    numbered scale is density-free, and `density` drives the **component `size`**
    layer: each t-shirt size (`xs…xl`) is a *contract* binding a control height
    **and** paired padding from the shared scales, so a `md` button/input/select
    agree. `compact` resolves `size.md` to smaller metrics while the *name*
    stays `md` (name-stable, value-shifts). This is Curtis's three tiers made
    literal: reference (numbered) → component (t-shirt) → (radius, bounded
    semantic).

---

## Open items / next steps (roughly prioritized)

**The token layer is complete; the next phase is the E2E pipeline (`07-e2e-journey.md`).**
The goal is a designer↔developer↔agent workflow ending in production-ready UI —
i.e. completing layers 2–4 of the practice's four-layer AI stack (the engine is
layer 1). Agreed build sequence (owner confirmed "safest path to a working plugin"):

- **★ NOW — E2E integration (`07` §11).** The direction shifted from "build the next
  adapter" to "connect the tools we already own through the `design.md` contract." Two
  active tracks:
  - **Here (prism3-tokens): the Wendy's spike — ✅ DONE, then PROMOTED to the shipped CLI (2026-07-01).**
    A standard-`design.md` reader (`engine/standard-design-md.ts`) + colour-role classifier
    (`engine/classify-colors.ts`, the one genuinely new parser piece), run against a **real
    `brand-skills` Wendy's `design.md`** (`examples/wendys.design.md`, 24 colours + 25 type tokens)
    → a full token system (`out/wendys.tokens.json` + `.ai.json`) + a **full-parity fidelity report**
    (`engine/out/wendys-fidelity-report.md`). **Results:** anchor reproduced **ΔE00 0.00**
    (exact-anchor preservation), 627/627 aliases, 248/248 contrasts, `error`→`danger` carved as a
    distinct palette; primary/secondary/tertiary pin exactly; neutral ramp fits the 11 observed greys at
    mean ΔE00 <1.5 (derived hue/chroma); status hues pinned (L placed by the ramp); aggregate colour ΔE00
    **2.02** across 24 swatches — the ramp/status/neutral divergence is the point (Decision A). Every
    predicted alignment finding confirmed: type roles `mega-*`→`display`/`button-*`→`label`;
    `error`≡`primary-dark`, `info`≡`secondary` (observed dups the engine doesn't propagate); the file's
    stated `primary`-on-white "~4.6:1" is stale for its own `#C8102E` (engine measures **5.88:1**). The
    optional **`x-prism3` block** (§11.4) round-trips: the reader maps its levers → `BrandInput`
    (radiusScale/typeScale/density/motionTempo/actionPalette/iconContrast/surfaces/gradients); Wendy's
    carries no block → engine defaults (the plain-spec guarantee). **Promotion:** the reader + classifier
    are no longer spike-only — `cli.ts` now **auto-detects the dialect** (a top-level flat `colors:` map ⇒
    standard; else engine-native) and runs either through the same core, with `--fidelity` writing the
    report; `standardToBrandInput` (classify + families + x-prism3) and `fidelity.ts` (report builder)
    are the shared modules. The bespoke `spike-wendys.ts` runner was retired; its self-verify folded into
    `test.ts` (189 → **202**). Run: `npx tsx Prism3/engine/cli.ts Prism3/examples/wendys.design.md --fidelity`.
    This closes the round-trip: brand-skills emits `x-prism3`, the shipped engine CLI consumes it.
  - **brand-skills alignment — ✅ DONE (2026-07-01, this thread).** Implemented in `brand-skills`
    (branch `claude/prism3-e2e-integration-8fwul4`), across its three layers (schema → SKILL → CLI):
    (1) **type-role rename** — recommended typography names moved to the engine's vocabulary
    (`display/title/body/label/caption/eyebrow/code`), retiring `headline-*`; custom names still
    allowed + SKILL mapping guidance (`mega-*`→`display-*`, `button-*`→`label-*`). (2) **colour-role
    contract** — documented (no rename): the classifier convention + `error`→`danger` bridge (keep
    emitting `error`). (3) **optional `x-prism3:` block** — hand-authored in `surfaces.md`, passed
    through verbatim by `refresh-design` to a top-level `x-prism3` key; scoring-neutral (no new
    `.brand/` file, no manifest/health impact). Spec: `brand-skills/docs/superpowers/specs/
    2026-07-01-prism3-engine-alignment-design.md`. Tests 159 → 162 green; no version bump.
    **Token Press provisioning deferred** (private, different-org, export-stage — downstream).
- **A. `design.md` + CLI adapter — ✅ DONE (2026-07-01).** A brand brief
  (`design.md` frontmatter → `BrandInput`, prose for agent latitude) compiled by
  the CLI over the pure core. Proves the core-as-a-library and the authoring
  on-ramp in the easy Node environment before the Figma sandbox. No LLM required to
  use it; agent-draftable. **As built:** `engine/design-md.ts` (a dependency-free
  block-style YAML-subset parser — indentation nesting + block sequences + flow
  `{}`/`[]` leaves + scalar typing + frontmatter/prose split) → `BrandInput`,
  validated against `theme-schema.json`; `engine/cli.ts` (`tsx cli.ts <design.md>
  [--out <dir>]`) parses → validates → `brandTheme` → `emitTheme`, exiting non-zero
  on a schema violation, a broken alias, or a failed contrast contract.
  `emit-dtcg.ts` was refactored to **export the reusable core** (`buildTree` /
  `emitTheme` / `validateBrandInput`) behind an `isMain` guard, and now compiles
  both example brands **from** `examples/*.design.md` (single source of truth).
  `examples/aurora.design.md` is the **faithfulness** test — it reproduces
  `out/aurora.tokens.json` **byte-for-byte** (verified: empty `git diff`; the CLI
  path is byte-identical to the regression path); `examples/harbor.design.md` is
  the net-new **coverage** brand (deep-teal, `action = primary`, warm-neutral greys
  + tinted page, measured status, comfortable/sharp, system stack + compact scale,
  gradients off), validated behaviourally (schema-conforms, 622/622 aliases resolve,
  248/248 contrasts hold). Both are wired into `test.ts` (202/202). Full spec + lever
  table in `07-e2e-journey.md` §6. NOTE: the "~30 line parser" estimate in the
  locked plan was optimistic given the nested typography/gradients surface — the
  block-style parser is ~200 lines, still dependency-free and scoped to `BrandInput`.
- **★ NEXT — Theming interfaces (`08-theming-interfaces`, 2026-07-01).** The customization
  surfaces are now a committed shape, not a direction note. Locked: (1) a **NEW** Prism3 Figma
  plugin built on the engine core (not an evolution of the existing theming plugin — the core is
  reused, the plugin is a fresh materialization + control shell); (2) **near-continuity** between
  the Figma plugin and the web playground — one shared **lever manifest** + live-preview model,
  not two hand-maintained UIs. Revised build sequence (`08` §7):
  - **B0. Lever manifest — ✅ DONE (2026-07-01).** `engine/levers.ts` → `schema/lever-manifest.json`:
    the shared-control contract, **35 levers** across 7 groups (20 `advanced`), each with
    group/label/description/control (`color`/`slider`/`enum`/`toggle`/`list`/`palette-ref`/`object`)
    + defaults + UI ranges/enum options. The plugin, playground, and MCP tool schema all render from
    it — the *presentation* half that `theme-schema.json` (validation half) lacks. **Can't drift:**
    `test.ts` asserts every key resolves in the schema, every enum matches the schema enum (as a set),
    every default matches, and the committed JSON is up to date (208/208). **Pure — no `node:*`**
    (the plugin/playground/MCP bundle it into a browser/Figma sandbox); the write step is the
    `emit-levers.ts` I/O shell. `id` is host-supplied identity, not a lever; the gate asserts every
    *other* required field is a lever. Run `npx tsx Prism3/engine/emit-levers.ts`.
  - **B1a. Preview spec — ✅ DONE (2026-07-01).** `engine/preview.ts` → `schema/preview-spec.json`:
    a portable, data-only description of **8 sample components / 22 variants** (button + states,
    secondary button, input, card, alert per semantic, nav item, badge, type specimen), each binding
    UI props to root-relative semantic token paths + the contrast pairs to overlay (52 token refs).
    The plugin and playground render the SAME live preview from it (extracts the binding knowledge
    latent in `visualize.ts`). **Pure — no `node:*`** (write step = `emit-preview.ts`). **Gates
    (`test.ts`):** every referenced token path resolves to a real leaf in the emitted token tree
    (binding-validity), contract mins are sane, **no contract over-claims the engine guarantee**
    (declared min ≤ the engine's min for that role+surface — the PR #20 review hardening), committed
    JSON current (215/215). Run `npx tsx Prism3/engine/emit-preview.ts`.
  - **B1b. Resolved-preview projection — ✅ DONE (2026-07-01).** `engine/resolve-preview.ts`:
    `resolvePreview(theme)` — the runtime read-model the surfaces consume reactively. Projects the
    preview spec to **concrete colours per mode** (every referenced role → its hex in light/dark/
    hc-light/hc-dark) + **live contrast results** (each declared contract computed on the REAL
    resolved fg-on-bg, per mode, with pass/fail — the contrast overlay, `04`'s differentiator).
    **Pure — no `node:*`**: resolves via `resolveAllModes` (which now carries each role's `hex`,
    a small additive enrichment to `modes.ts`) + the pure spec, not `buildTree`. **Gate:** every
    referenced role resolves to a hex in every mode, and **every declared a11y contract actually
    holds on the resolved colours in all 4 modes** — the automated version of the PR #20 manual
    contrast check. 215/215; `out/*` unchanged (the `hex` field is emit-invisible). It's a
    per-live-theme read-model, not a committed artifact.
  - **B1 dogfood — ✅ DONE (2026-07-02, PR #22).** `engine/visualize.ts` now renders the shared
    preview model in-repo before the host renderers exist: for each brand it resolves `previewSpec`
    (B1a) + `resolvePreview(theme)` (B1b) and paints every component/variant as a styled chip —
    bg/text/border from the resolved role colours, radius/padding from the token tree, type from the
    resolved composite — with the per-mode L/D/HL/HD contrast overlay driven by the same `byMode.pass`
    results. Proves the "define once, render everywhere" model composes a real UI + live overlay from
    one source, de-risking the leap to a separate plugin/playground repo. **Additive, output-scoped:**
    only `visualize.ts` (+ regenerated `out/tokens.html`) changed; pure core untouched, `out/*.tokens.json`
    byte-identical, 215/215. **← next: B1c-proper — the host renderers (DOM playground + Figma-node
    plugin) that paint from the same `resolvePreview` output; land with B2/B3.**
  - **B1c. Host renderers** — the DOM (playground) + Figma-node (plugin) renderers that paint the
    components from `resolvePreview`'s output. The binding + overlay logic is now proven via the B1
    dogfood above; B1c ports it to the two live hosts. Land with B2/B3.
  - **B2. New Figma plugin shell** — bundles the core, renders knobs from the manifest,
    materialises via `$extensions.prism3.figma` (`08` §2/§5).
  - **B3. Web playground** — same manifest + preview, DOM/CSS-var host.
  - **Parallel validation:** Style Dictionary consumption (owner-driven) + **Figma-MCP import** of
    `out/*.tokens.json` (validates the Figma directives, de-risks plugin materialization, and
    unblocks Token Press testing — highest-value near-term).
- **C. MCP adapter** over the core — "an agent themes Prism3" as a callable surface
  (the KB's MCP-first payoff). Its tool schema derives from the B0 lever manifest.
- **D. (later) Component library** — components-as-data → Web Components + React +
  Storybook + `.ai.json` + Figma Code Connect (layers 2–3). In scope eventually;
  mapped now so upstream choices don't foreclose it. Heavy per-component research
  already in the KB (UIC series). **Architecture now locked in
  `14-component-layer.md`** (2026-07-03): definitions seeded from the KB's ~40
  component briefs, token-name-bound, deterministically materialized to Figma via
  the B2 plugin (write leg) with an extraction-diff regression (verify leg;
  Specs CLI's seat). Build sequence in `14` §6 — starts with the schema + 3
  components when this activates.

Parked, owner-flagged: **light-grey surface value tuning** — done visually once real
UI layouts exist, not against swatches.

Older backlog (still valid, lower priority than the pipeline above):

1. **"Beyond color" is COMPLETE — see `05-token-coverage-roadmap.md`.** Every token
   category NB + Prism2 ship is now generated: colour + the dimension axis
   (grid/space/radius/sizes), **typography** (the headline font-swap lever +
   composites + fluid), **shadow/elevation** (mode-aware), **motion**
   (`motionPersonality` lever), **layout/breakpoints**, the quick wins
   (**border-width**, **focus** ring dims, **icon 3:1 toggle**), and (opt-in)
   **gradients** (DTCG composite, ramp-aliased stops, OKLCH + sRGB pre-sample,
   Figma Paint Style, worst-case-stop contrast). What's left is plumbing, not new
   categories. Component sizing is still a prototype — values are sensible
   defaults, not yet validated against a real component set; revisit when the
   component layer is real.
2. **Prove downstream consumption.** Feed `out/*.tokens.json` through Style
   Dictionary and/or the Figma MCP — confirm a real tool ingests it and the four
   modes map to Figma variable modes. Turns "generation" into "pipeline".
3. **Round-trip the raw-figma format.** Emit the second parallel format
   (`raw-figma/`) the repo keeps, preserving `variableId` linkage (root `CLAUDE.md`).
4. **Figma binding constraints.** Verify variable/mode constraints via the Figma
   MCP (still outstanding from the architecture review).
5. **Tune status-hue defaults against a reference set** (Tailwind/Radix/Material/
   USWDS + NB's measured green/amber). Current canonical hues (success 145,
   warning 75, danger 27) are plausible but not evidence-derived; functionally
   safe (placed by luminance) but worth grounding. Overrides already wired via
   `BrandInput.status` / schema `statusColors`.
6. **Semantic-layer decision backlog (`03-open-questions.md`).** Items 1–4
   RESOLVED and shipped — elevation/surface naming (ordinal ladder, `overlay`
   dropped), scrim + opacity/alpha primitives, disabled strategy (accessible
   default, 3:1 floor), white/black policy. Remaining: **Item 5** (icon 3:1
   toggle — parked by decision; icons currently mirror text, one-line floor swap
   when wanted). Next non-backlog frontiers: shadows/effects axis (deferred from
   Item 1), typography + motion (item 1 above), downstream consumption (item 2).
7. **Theming playground / dashboard (`04-theming-playground.md`).** Direction
   note only — a live theming dashboard that reskins real components + composed
   pages as tokens change (web app lead; Figma plugin as a second surface). The
   interactive successor to `visualize.ts`; differentiator is a live
   contrast-contract overlay. Not slated for build; documented for direction.
8. **Figma round-trip (code → Figma) (`05-token-coverage-roadmap.md` →
   *Cross-cutting*).** Analysis recorded, build deferred. Figma variables are
   only `COLOR`/`FLOAT`/`STRING` + scopes — no composite type — so typography
   exports as atoms (→ a Text Style binds them) and shadow/transition have **no**
   variable representation (Effect Style / code-only). Pipeline clarified: raw
   Figma → **Adam's custom plugin** → SD-ready DTCG (SD has *not* run on the
   example packages yet). Backlog: a three-tier disposition contract
   (`variable`/`style-part`/`code-only` + scope) as the cheap now-step, then an
   `emit-figma.ts` writer + style manifest + companion plugin. Open decision —
   update an existing template (preserve `VariableID`s) vs build from scratch —
   tracked as `03-open-questions` Item 9. KB POV write-up also backlogged.
   **Verified research** now lives in the knowledge-base repo, run
   `_research/_inbound/2026-06-28-figma-variables-styles-roundtrip` (four
   primary-source agents): the variable type ceiling + 8-field typography binding
   surface, **lineHeight/letterSpacing bind as px only** (unitless `1.5` → 1.5px),
   **text-decoration/case unbindable** (links = separate Text Styles), shadow
   *numerics* bind, Figma Motion (Config 2026) adds timing/easing variables, REST
   Variables API is **Enterprise-only** (styles can only be created via the Plugin
   API). **Materialization decision (locked for the typography build):** canonical
   value in `$value`; a machine-readable directive in `$extensions.prism3.figma`
   for the exporter (e.g. lineHeight `px-from-ratio`); intent *echoed* into
   `.ai.json` as derived narrative — the exporter reads `$extensions` data, never
   the prose sidecar. Generalises to letter-spacing, fluid sizes, etc.
   (`05-token-coverage-roadmap` → Typography + *Cross-cutting: Figma round-trip*).

---

## Constraints to respect (from root CLAUDE.md)

- The base repo is design-tokens-only (JSON, no build). The `Prism3/engine/`
  tool is a new, self-contained addition — don't impose a build system on the
  token data.
- When editing existing brand tokens, change **both** the `raw-figma/` and
  `tokens/` (DTCG) copies and keep `variableId` linkage intact. (The engine
  currently emits a fresh DTCG tree under `engine/out/`; it does not yet write
  back into the brand token dirs.)
- Preserve namespaces (`nbds.*` for NB, `nbds.pds.*` for Prism2). Validate by
  JSON parse + every `{…}` alias resolving.
