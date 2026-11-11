# Engine changelog

The history of `ENGINE_VERSION` (`version.ts`). Only `fold.ts` writes below the marker comment that follows: a PR adds a change note under `changes/` instead, and the fold turns a batch of notes into one version (#1807, `CONTRIBUTING.md` §2). `lint-emission-version.ts` fails any other diff that changes the text below the marker.

The text was moved here verbatim from the comment above `ENGINE_VERSION` in `version.ts` (Q319.3), so it keeps that comment's order: a few pre-#1807 entries, then the FOLDED CHANGE NOTES section (each fold newest first), then the rest of the pre-#1807 entries. A `---` rule stands where one comment block ended and the next began.

<!-- ENGINE CHANGELOG (#1807) — only fold.ts writes below this line. -->

0.90.0: the `controlShape` FORM lever gains two fixed off-ramps — `boxed` (binds `radius.none`, sharp 0px)
  and `hairline` (binds `radius.hairline`, the 1px sentinel #1362) — for the four-way set Boxed · Hairline ·
  Rounded · Pill (#1371, owner-decided 2026-09-15). 0.90.0 and not 0.89.0 because this merged onto post-#1347
  main, which took 0.89.0 — the next free ENGINE above it. Projected-surface move (a pill-able control's
  corner rebinds under the new shapes); no corpus brand sets it, so committed `out/` moves only its version
  stamp. `hairline` implies the opt-in hairline rung (`brandTheme` provisions it); `boxed` needs no coupling.
  Full docblock beside the constant. CONTRACT stands at 10.0.0 (a lever, no guaranteed name moves).

0.89.0: the checkbox family adopts Prism 2's naming AND builds the group (#1347, OPTION B, owner-decided
  2026-09-15). 0.89.0 and not 0.88.0 because this rebased onto post-#1423 main, which took 0.88.0 for the
  radio-control ring rebind (see the 0.88.0 entry below) — the next free ENGINE above it. Two
  projected-surface moves:
  (1) RENAME `checkbox` → `checkbox-row`. The labelled Row def keeps its behaviour verbatim; only its
      `id` (and `name` → `Checkbox.Row`) change, so its projected member set is byte-identical (3 size
      members) and the baselines rename the KEY, not the digest. `checkbox-control` is unchanged;
      `radio`/`switch` repoint `inherits: 'checkbox'` → `'checkbox-row'`.
  (2) ADD `checkbox-group` — a `field-label` above a stack of `checkbox-row`s, built from Prism 2's
      specs. It nests the already-collapsed Row (`checkbox-row` projects size-only since #1330), so the
      group does NOT inherit the control's 54-member explosion — the nest chain is four deep
      (`focus-ring` ← `checkbox-control` ← `checkbox-row` ← `checkbox-group`), the corpus's deepest.
      Projects a SIZE-only 3-member set; paints nothing of its own (its ink is the nested children's).

  ENGINE and NOT CONTRACT, on #1252: the PROJECTED component surface moves (a renamed def, a new def),
  but NO emitted TOKEN NAME is added, removed or retyped — a component `id` is not in the versioned
  token contract (`schema/token-contract.json` is the emitted token-name surface; docs/30). So
  `CONTRACT_VERSION` STANDS at 10.0.0 — `token-contract.ts --check` reports `level: none` (guaranteed set
  unchanged) and `--accept` refreshes only the informational `engineVersion` stamp. The #1347 brief
  called for a MAJOR CONTRACT bump to 11.0.0; that premise is a misread of what the contract covers
  (component prop/id names are explicitly out of it, docs/30) and is CORRECTED here rather than
  fabricated — full note in `docs/00-progress.md`. `regen --check` moves each artifact's own generator
  stamp (0.87.0 → 0.88.0); `lint-emission-version` is green (no emission-VALUE change — the token layer is
  untouched). `lint-component-surface` re-`--accept`ed (the `checkbox` baseline key → `checkbox-row`, plus
  a new `checkbox-group` entry); `lint-paint` census likewise re-`--accept`ed. Several composition-model
  choices Prism 2 does not settle (group-level error visual, inter-row gap, select-all, variable row
  count, the group `size` axis) are HELD and surfaced for owner decision rather than invented — see
  `checkbox-group.ts` and `docs/00-progress.md`.

0.82.0: checkbox-control inner-glyph calibration (#1346, both items owner-triaged). Two changes:
  (1) The check/dash are inset to 0.80 of the control box. QA read them slightly large; before this the
      `mark`/`dash` frames bound the FULL box and drew the artwork's own ~71% grid inset, so the check
      ink spanned 70.7% of the box width. Prism 2 sizes it smaller — `checkFill` 16 in a 20px control
      box (the focus frame is 28 at −4, so box = 28 − 2×4 = 20; cross-checked by its cornerRadius 2 =
      the engine's `edge ÷ 8`), a 16/20 = 0.80 mark ratio. The ~71% artwork inset is common to Prism 2's
      `checkFill` and the engine's `check` glyph, so it cancels; the NET move is the FRAME from 1.0 to
      0.80, rendering the check ink at 0.80 × 70.7% = 56.6% of the box (the dash 58.3% → 46.6%). The new
      schema field `glyphScale` (on `mark`/`dash`) pads the emitted glyph DOCUMENT's artboard to
      `grid ÷ 0.8` (24 → 30, centred, path `d` untouched) so the existing box binding renders the grid
      at 0.80 — an internal, def-local multiplier, NOT a shrunk frame (which would need a per-rung
      `control.size.*.mark` token, a guaranteed name and a CONTRACT bump, the class #910's `dot` bumped
      for). `lint-glyph-geometry` re-derives the padded artboard from a scale it declares itself
      (`SCALED_GLYPH`), and `test.ts` pins the rendered 0.80 against the projected artboard, both by
      name; a revert to a full 24 grid fails both.
  (2) The pressed border is CONFIRMED + DOCUMENTED, adds nothing (owner 2026-09-13): the empty box's
      pressed state reuses the rest border (`unchecked.border` → `color.field.border.rest`), there is no
      `color.field.border.pressed` role, and none is minted — consistent with #1342's no-new-
      `field/fill/hover` call. Header + token comment record why; no binding or token moves.

ENGINE and not CONTRACT, on #1252: the PROJECTED component surface moves (the mark/dash artboard is
padded, so their `glyphSvg` documents and `glyphViewBox` read-back change from 24 to 30), but no emitted
TOKEN NAME is added, removed or retyped — `glyphScale` is a def-local literal baked into the glyph
document, never a token, and the frame still binds the existing `control.size.*` box variable. So
`CONTRACT_VERSION` STANDS at 10.0.0; `token-contract.ts --check` confirms the guaranteed 577 unchanged
and `--accept` refreshes only the baseline's informational `engineVersion` stamp. `regen --check` moves
each artifact's own generator stamp (0.81.0 → 0.82.0) and the two checkbox-control glyph documents;
`lint-emission-version` is green (no emission VALUE change — the token layer is untouched).
`lint-component-surface` and `lint-paint` census re-`--accept`ed at the forward bump only if the padded
artboard moved a recorded figure (the member counts and paint slots are unchanged; the glyph geometry is
not part of those censuses).

0.81.0: `select` cluster, part 1 of #1329 (#1342 / #1343b / #1344; the #1343a default width and #1345
responsive auto-layout are HELD — see below). Two projected-surface moves and one doc-only confirmation:
  (1) #1343b — the `icon` slot repoints `color.icon.secondary` → `color.icon.primary`. That one key
      paints BOTH the trailing chevron's vector AND the leading swap's descendants, so both glyphs go
      full-contrast to match the value text (the leading glyph the caller nominates already defaulted to
      `icon.primary`). No new token NAME — an existing emitted role.
  (2) #1344 — `empty` leaves the projected `stateAxis` (owner: "Yes remove"), dropping the set from
      status(4)×state(5)×leading(2)=40 to status(4)×state(4)×leading(2)=32 members. It STAYS a real
      `state` (the placeholder-vs-value ink distinction is carried in the paint model — `label.empty`,
      `error.border.empty` — and reached at the empty coordinate of the declared grid), admitted out of
      the projected axis by the `codeOnly` entry leading with `empty`, exactly as `button`'s `inactive`
      is. So it is an INTERNAL, content-driven ink distinction, not a variant a designer picks.
  (3) #1342 — CONFIRMED + DOCUMENTED, adds nothing: hover is carried by the BORDER (`border.hover` →
      `color.field.border.hover`, present at select.ts and reached at the hover coordinate) and the field
      FILL is stateless by design (text-field's model). No `color/field/fill/hover` role is minted.

ENGINE and not CONTRACT, on #1252: the PROJECTED component surface moves (icon ink repointed, `empty`
column dropped), but no emitted TOKEN NAME is added, removed or retyped — the icon binding reuses the
existing `color.icon.primary` role and the `empty` change touches only a component paint key, never a
guaranteed token path. So `CONTRACT_VERSION` STANDS at 10.0.0; `token-contract.ts --check` confirms the
guaranteed set unchanged and `--accept` refreshes only the baseline's informational `engineVersion`
stamp. `regen --check` moves only each artifact's own generator stamp (0.80.0 → 0.81.0);
`lint-emission-version` is green (no emission VALUE change). `lint-component-surface` re-`--accept`ed at
the forward bump (`select` 40 → 32); `lint-paint` census `set` re-`--accept`ed (`select` set 40 → 32
members, and the icon ink content moved), `grid` unchanged (still 20 declared coordinates — `empty`
stays in `states`). MUTATIONS (docs/34): the `#1344`/`#1343b` `test.ts` block reverts each change and
fails a NAMED assertion (icon → secondary; `empty` back on the projected axis; `empty` dropped from
`states`). No schema refusal was touched.

0.80.0: icon-button gains a `shape` variant axis — `square | circular`, square default (#1353, owner-
decided 2026-09-10). PURE GEOMETRY: the two values differ ONLY in the container's corner radius (`square`
→ `radius.md`, `circular` → `radius.round`) and are token-identical in colour, state and every other
binding, so it is a 2-value AXIS and not a component split. Each of the three icon-button components goes
54 → 108 members (appearance × size × shape × state). ENGINE, not CONTRACT, on #1252: the PROJECTED
component surface moves (new axis, doubled sets), but no emitted TOKEN NAME moves — `token-contract.ts
--check` confirms the guaranteed set unchanged and `--accept` refreshes only the informational
`engineVersion` stamp at contract 10.0.0 (the #1354/#1348 precedent). The `controlShape: pill` brand lever
(`applyControlShape`) was generalized to repoint the ROUNDED rung (`radius.md`) by ref rather than the
literal key `radius`, so it still rounds the `square` shape off and leaves the intrinsic `circular` rung —
the same rule it applies to switch/radio; the #1163 controlShape test carries the by-name mutation.
`regen --check` moves only each artifact's own generator stamp (0.79.0 → 0.80.0); `lint-emission-version`
is green (the version moved with no emission-VALUE change).

0.77.0: the inverse FILLED fill now STEPS per state (#1389, F3, owner decision B4a). The inverse
`interactive.<fam>.fill.{rest,hover,pressed,focused,selected}` walks the neutral ramp toward the
ground — light 050→150→250, dark 850→750→650, focused=hover, selected=pressed — uniformly across
primary/neutral/destructive. Emitted VALUES move in every corpus tree; no token NAME moves.

PREMISE RE-CHECK (the F1 rule, #1387), before any code moved: reading the emitted `out/*.tokens.json`
on 0.76.0, `inverse.interactive.primary.fill.{rest…selected}` was byte-identical (neutral.050 light /
neutral.850 dark) in all four corpus brands — genuinely flat. `neutral`/`destructive` already stepped
(their `on-fill` is the neutral extreme, which survives the darkening); only `primary` was held, by
`holdInverseFill` (the #1351-pt-2 decision this reverses). Reproduced, not an audit misread.

THE STEP + THE DIRECTION FIX. The fill loop dropped `holdInverseFill` (all families step) and flipped
the walk from `-dir` to `dir`. `-dir` walked toward MORE contrast with the band (like the outline/text
ink): in light it overshot the white extreme and reflected inward onto 050→150→250 by luck, but in
dark it walked toward the black extreme and only reflected on `pressed`, emitting a NON-MONOTONE
850→950→650. `dir` steps toward the inverse SURFACE (the ground) — +1 light, −1 dark — giving the
owner's exact monotone rungs in both modes with no reliance on the reflection guard.

THE on-fill CONTRAST TENSION, and why it is a lever not a nudge. Stepping the fill darker lowers the
contrast of any ink on it; the primary `on-fill` is a single VIVID brand step (#1244) gated at
`fill.rest`, so on the stepped fill it dips below AA on hover/pressed — measured over the corpus,
4.69→3.62→2.75 (the #1351 defect-2 wall). B4a's a11y decision: hover/pressed are TRANSIENT states that
may dip; `rest` must still clear AA (it does). The brand ink is the DEFAULT. A brand that needs AA in
every state sets the new `strictInteractiveContrast` lever (off by default), which swaps primary's
inverse `on-fill` to the neutral high-contrast extreme (the ink the other families already use), which
clears 4.5 on the stepped fill at 7.6–16:1. `destructive` needs NO change here — its "red is lighter
ink" note (#1367/#1352 class) is about the OUTLINE/TEXT ink's page contrast, not this filled surface.

#1239 STILL HOLDS. That invariant is REST-ONLY, CROSS-FAMILY (the three families' `fill.rest` are one
value on the neutral ramp). Per-state stepping leaves rest uniform — all three still resolve neutral.050
(light) / 850 (dark) at rest, by construction (one shared `fillRest`) — so the invariant is untouched.

ENGINE and not CONTRACT (#1252's split). Emitted values move → ENGINE bumps. The lever RE-SELECTS an
existing role's value; it adds NO guaranteed token PATH, so `CONTRACT_VERSION` STANDS at 10.0.0 and
`token-contract.ts --check` confirms the guaranteed set unchanged (`--accept` refreshes only the
baseline's informational `engineVersion` stamp to 0.77.0). `regen --check` moves each emitted tree's
own `$extensions.generator.version` (0.76.0 → 0.77.0) — the values moved, so `lint-emission-version`
requires the bump.

MUTATION-BY-NAME (docs/34), commit-between-mutations (the checkout-restore trap). Two independent gates
in `test.ts` (block d3), each derived independently of the producer: (A) the fill STEPS — the emitted
neutral rung is read and asserted to increase per state on a light-mode (near-black) inverse surface
and decrease on a dark-mode (near-white) one, non-degenerate and mirrored, represented across all 3
families × 4 brands. Re-holding primary fails `#1389 GATE A … STEPS per state` by name; reverting the
walk to `-dir` fails `#1389 GATE A … MONOTONE toward the ground` via the dark 850→950→650. (B) the
per-state on-fill contract + lever — `rest` is a HARD 4.5 floor in every mode, lever OFF keeps the
BRAND ramp, lever ON swaps to the NEUTRAL extreme AND clears 4.5 at every state. Reverting the lever
wiring fails `#1389 GATE B … swaps primary on-fill to the NEUTRAL extreme` by name.

0.76.0: the focus ring is CONCENTRIC and no longer carries a stale nominal-side binding (#1388, F2,
owner-approved). Two host-executor changes, both in the one absolute-inset loop that already positions
and sizes the nested ring — the same binding surface, which is why #1388 flagged them together.

PREMISE RE-CHECK (the F1 rule, #1387). Both symptoms were confirmed against the CURRENT engine before
any code moved, by reading the projected plan and the emitted tokens rather than trusting the audit:
(1) `figmaAnatomySet(focusRing)` binds `{width, height → size/md/height, strokeWeight → focus/ring/width}`
and NO radius — the standalone ring and every nested instance is a radius-0 hard square, and neither
executor ever wrote a corner radius. (2) The ring's own `nominal-side` binds width AND height to
`size.md.height`; a nested INSTANCE inherits that, and on aurora `size.sm.height`=28, the inset is
`offset(2)+width(2)=4`, so a small button's ring resizes to 28+2×4 = 36 = `size.md.height` — the
coincidental agreement #1388 names, which a density move decouples. Both reproduced; neither is F1's
misread-derived-value.

THE CONCENTRIC FORMULA. A ring positioned at `-inset` and sized `host + 2×inset` must take corner
radius `hostRadius + inset` or its straight run cuts across the host's rounded corner. `inset` is the
same `gap + strokeWidth` the position/size use, so the ring grows uniformly on every axis INCLUDING its
radius — concentric by construction. Read per-corner off the host node (a bound corner reads back its
resolved number; the host binds all four to `radius/md`) and written to the ring's four corners. One
derivation, three cases: a radius-0 host → `inset` (a rounded-rect ring around a square control, not a
hard square); a full-round host (radio, radius ≥ half its side) → `host + inset ≥ ringSide/2`, which
Figma clamps to the ring's own half-side so a circle stays a circle; an ordinary rounded host stays at
the constant gap. The owner's worked example (radius-8 button, +4 inset → 12) is this formula.

THE STALE NOMINAL SIDE, cleared. `#1290` predicted this exactly and named its own fix: "clear the
instance's inherited width/height before resizing, in the host executor, not here". The absolute loop
now calls `setBoundVariable('width', null)`/`('height', null)` on the ring instance before the resize,
so the resized box is authoritative and no `size/md/height` binding survives. `strokeWeight` (the ring's
own brand stroke) is untouched — only the two dimensions the host overwrites are cleared.

ENGINE and not CONTRACT, on #1252's decision, and this one moves NO committed artifact but the version
stamp. The change is entirely in the two executors (`write-components.ts` and the `anatomy-figma.ts`
paste payload); the projected PLAN is byte-identical (the radius is derived at paste from the host node,
like `x`/`y`/inset, and carries no new plan field), so `lint-component-surface` and `paint-census` do
not move and are NOT re-`--accept`ed. No token NAME is added, removed or retyped — a corner radius is a
component geometry fact, not a token path — so `CONTRACT_VERSION` STANDS at 10.0.0 and
`token-contract.ts --check` confirms the guaranteed 577 unchanged; `--accept` refreshes only the
baseline's informational `engineVersion` stamp to 0.76.0, at contract 10.0.0 unchanged. `regen --check`
moves only each emitted tree's own `$extensions.generator.version` stamp (0.75.0 → 0.76.0), which
`lint-emission-version` requires the bump for — the emission (the stamp) moved, so the version must.

THE GATE GAP #1388 FLAGGED, now closed (docs/34). Nothing checked a resolved radius on a built node —
`diffAnatomy` compares plan-to-host STRUCTURE and iterates the plan's fields, and the ring's radius is
neither a plan field nor structure — so the THREE offline shims (`test.ts`'s `makeFigmaStub`,
`component-shim.ts`, and `lint-unclaimed-defaults.ts`'s own stub, all taught `setBoundVariable(field,
null)` to unbind) were extended to model a per-corner radius (a bound corner reads back resolved; an
unbound one reads what was written, default 0) and the ring instance's INHERITED nominal-side binding,
and `test.ts`'s absolute-part execution block gained the gate. Its EXPECTED is INDEPENDENT of the
concentric code: the host's own radius (set by the bind loop, read back off the built host) plus the
declared inset, never read back from the ring-radius producer. A parity assertion pins the PLUGIN
executor's radius to the paste path's (which is itself pinned to that oracle), so both executors are
covered. The circle and radius-0 cases are REPRESENTED (a full-round host asserted to yield radius ≥
side/2, a radius-0 host asserted to yield exactly the inset), not merely counted, and the clear has a
positive control (a fresh un-hosted ring instance must carry the inherited binding the host removes).

MUTATION-BY-NAME (docs/34), run by commit-between-mutations (the checkout-restore trap): (a) reverting
the concentric derivation (dropping the four-corner write, so the ring stays radius 0) fails the named
`anatomy/ring #1388: the ring's radius is CONCENTRIC` assertion AND both edge-case assertions, in both
executors via the parity gate; (b) dropping the `setBoundVariable(…, null)` clear fails the named
`anatomy/ring #1388/#1290: the host CLEARS the ring instance's inherited width/height bindings`
assertion while its positive control stays green. Each restored.

0.75.0: the icon-property canon + the #1309 Figma display-name mechanism (#1380, owner-decided from a
live Prism2 reference). A component's Figma property NAME was the code prop/axis name verbatim
(`planSetProperties` used the `texts`/`swaps` KEY; the presence-axis panel name was the slot-axis
`name`), so a designer-facing label like `↳ swap leading icon` could not exist without becoming a React
prop. #1309 adds an OPTIONAL `figmaName` decoupling — on `texts`, `swaps` (now a `string | {part,
figmaName}` union) AND the presence axes (`slotAxes[].figmaName`) — so the code prop/axis stays
idiomatic (`leadingVisual`, `label`, `leading`/`trailing`) while the PROJECTED name changes. The canon,
applied to button + select: `label` (text) first, then `leading icon` / `trailing icon` true/false
variant SWITCHES each immediately followed by `↳ swap leading icon` / `↳ swap trailing icon` (the `↳ `
= U+21B3 + space renders nested beneath its switch). icon-button (owner-decided 2026-09-09): its
required icon stays required — no presence switch — and its swap gets `swap icon`, lowercase, NO `↳`
(nothing to nest under). The presence-axis display name flows through the member-name coordinate (the
segment Figma derives the variant property from), so `figmaAxisNames`, the cohort key and the payload
`cellOf`'s `SLOT_KEYS` all carry it in step. `planSetProperties` now orders text → swap → boolean, the
"label at the top" half of the canon. ENGINE and not CONTRACT on #1252's decision: Figma display names
and the projected member NAMES move (the component surface), so `schema/component-surface.json` and
`schema/paint-census.json` are re-`--accept`ed for button, select and icon-button ONLY; every other def
stays byte-identical and `regen --check` moves only each artifact's generator stamp (0.74.0 → 0.75.0).
No token NAME moves and no React prop moves (a Figma display name is neither), so `CONTRACT_VERSION`
STANDS at 10.0.0 and `token-contract.ts --check` confirms the guaranteed 577 unchanged. Mutation
(docs/34): a mutated `figmaName` moves the plan digest and fails `lint-component-surface` BY NAME (and
the `test.ts` display-name literals + the roundtrip host-truth block); a reordered `planSetProperties`
fails the roundtrip's "panel order (#1380)" host-truth assertion BY NAME. Closes #1309; #1331 (select
count) and #1379 (button count) stay open — this renames/reorders, it does not cut counts.

0.74.0: `nest-exposed` is BUILT and the checkbox Row collapses 54 → 3 (#1330, owner-approved;
reverses #761). A composed component nested its child and RE-ENUMERATED the child's variant axes into
its own matrix (checkbox Row = 3 selections × 3 sizes × 6 states = 54 members that only mirrored
`checkbox-control`). `nest-exposed` — the `NestingRelation` kind deferred since #761 — instead NESTS the
child and EXPOSES the named child axes (Figma exposed nested-instance properties), so the consumer drives
them from the parent. The Row now `expose`s the control's `selection` + `state`, `follow`s its own
`size`, and projects a SIZE-ONLY 3-member set. A new `FigmaNodePlan.nestExpose` carries the exposed axes;
both executors mark the nested instance `isExposedInstance`; `test-roundtrip.ts` reads the marking back.
ENGINE and not CONTRACT on #1252's decision: the projected component SURFACE moves (checkbox Row member
count 54 → 3, and its nest node gains `nestExpose`), so `schema/component-surface.json` and
`schema/paint-census.json` are re-`--accept`ed for the Row only; every other def stays byte-identical and
`regen --check` moves only each artifact's generator stamp (0.73.0 → 0.74.0). No token NAME moves (a
Figma variant/axis collapse is component-API surface, not a token name — the #1327/#1333 reading), so
`CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms the guaranteed 577 unchanged.

0.73.0: the overloaded `tone` variant axis is SPLIT (#1334, owner-approved 2026-09-08). `tone` had
carried three concepts: `icon`'s semantic INK role, `field-message`/`select`'s validation OUTCOME
(`[default, error, warning, success]`), and `field-label`'s label EMPHASIS (`[primary, secondary]`).
`lint-axis-values.ts`'s register recorded the strain — the validation set stood `overlapping` with
icon's ink set and the emphasis set a `subset` of it. The owner's split retires the overloaded name:
the validation axis → `status` (on `field-message` and `select`, which the plugin studio UI already
calls "status"), `field-label`'s emphasis axis → `emphasis`. `tone` STAYS on `icon` alone (the ink
axis, which was never the overload — the issue enumerated only the two overloaded uses, and renaming
icon's axis would be a separate owner decision), so `VARIANT_AXES` keeps `tone` and gains `status` and
`emphasis` (16th and 17th names). The rename lands on the `variants` key, the paint-key placeholder
(`{tone}` → `{status}`/`{emphasis}`), `presentWhen`/`footprintVaries`/`byVariant` coordinates,
`select`'s nested `follow: ['status']` and its `field-label` nest's `emphasis` coordinate, and the
mirrored consumer props (`field-message.tone` → `status`, `field-label.tone` → `emphasis`; `select`'s
prop stays `validation`).

TOKEN KEYS DO NOT MOVE, WHICH IS WHY CONTRACT HOLDS. Paint keys resolve the placeholder to the axis
VALUE (`{status}` → `error`), so a def's `tokens` keys (`error.label`, `error.border.rest`, …) are the
value plus slot and are byte-identical after the rename — no token name is added, removed or retyped.
A component axis name is component-API surface, not a token name (docs/30; the #1327/#1333 reading), so
`CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms it rather than this comment
asserting it; `--accept` refreshes only the baseline's informational `engineVersion` stamp to 0.73.0.
No `DEPRECATIONS` or `MATERIALIZATION_RENAMES` entry is owed — an axis rename is neither a token-PATH
move nor a Figma-COLLECTION rename (the #1327 reading); both gates pass with 0 claims.

ENGINE and not CONTRACT, on #1252's decision. The token layer does not move — `regen --check` is
byte-identical but each artifact's own generator stamp — so this is an ENGINE bump the `out/` diff
cannot see, demanded from the PROJECTED-SURFACE side: the member NAMES carry the axis (`status=error`
replacing `tone=error`; `emphasis=…` replacing `tone=…`), so each affected member's `planStamp` moves
and `schema/component-surface.json` is re-`--accept`ed for `field-message` (4), `select` (40) and
`field-label` (24) at unchanged member COUNTS. `lint-emission-version` is blind to it — component
payloads are not committed under `out/` — which is exactly the gap `lint-component-surface` covers.
`paint-census.json` DOES move for all three defs — and unlike #1333's TEXT-property rename, which left
it alone. The census hashes a `(coordinate, node path, slot, variable)` row, and the coordinate carries
the axis NAME (`status=error` replacing `tone=error`; `emphasis=…` replacing `tone=…`), so the hash
moves even though the resolved paint KEYS (`error.label`, `error.border.rest`) and the assignment COUNTS
are unchanged. Re-`--accept`ed for `field-label`, `field-message` and `select`; every other def's census
is byte-identical.

NO STUDIO/PLUGIN UI TEXT MOVED. The axis name is the projection (the Figma variant property name); the
studio/plugin surfaces do not display the component axis name to the user, and the studio's own
"emphasis"/"status" strings are unrelated concepts (button/neutral emphasis, weight roles, the
`status.*` colour levers). The consumer-facing "Validation" label on select is unchanged.

MUTATION-BY-NAME (docs/34). Reverting ONE axis rename in a def moves that def's members' `planStamp` at
the same member count and fails `lint-component-surface.ts` BY NAME (the #1252 gap). The rename is also
caught by `lint-axis-values.ts` (ARM A finds the reverted set undeclared, ARM B finds the new register
entry stale) and by hand-written `test.ts` literals: `fieldMessage.variants.status`, the projected
member names `status=default | status=error | …`, `field-label.variants.emphasis`, and the plugin
`test-write-components.ts` member-name join — none derived from the def. The `field-message`/`select`
alignment is load-bearing: `select`'s `follow: ['status']` passes the axis through by name, so if only
one of the two were reverted the nest would mismatch as well.

0.72.0: two OPT-IN caption FINE-PRINT rungs (#1360 + #1363, owner decision, 2026-09-09), both off by
default so no corpus brand moves. The size ladder floors at 10px and `fontSizeLadder()` was
brand-invariant, so a 10px caption (#1360) and a sub-10px 8px rung (#1363) were unreachable by any
brand input; both land as enumerated opt-in levers modelled on `titleFloor` — set membership on one
group, touching nothing else. `typography.captionFloor: 11 | 10` (default 11); `10` adds
`caption.sm` = 10px, a step already on the ladder. `typography.sizeFloor: 10 | 8` (default 10); `8`
PREPENDS an 8px step to `fontSizeLadder` and adds `caption.xs` = 8px. Both were measured on the New
Balance redesign — 10px is its single highest-volume text size (1,073 nodes) and 8px is real fine
print (144 nodes) at a literal 1:1 scale.

8px IS AN ESCAPE HATCH, AND THE ENGINE SAYS SO. 8px sits below every practical legibility floor and
below the size range this system's contrast ratios were reasoned about, so `sizeFloor:8` pushes a
FLAGGED note into the decisions log the way `actionPalette` flags a decoupled action colour — a
deliberate, recorded exception, never a rung a brand reaches by accident. `captionFloor:10` (10px is
ordinary fine print, on the default ladder) is not flagged.

DEFAULT-OFF, SO THE CORPUS IS BYTE-IDENTICAL. No corpus brand (aurora/harbor/wendys/nb/minimal/
minimal-levers) sets either lever, so every emitted `out/**` byte is unchanged except each artifact's
own generator stamp — the caption note clause and the escape-hatch note are BOTH gated on the opt-in,
so a default brand's `$extensions.prism3.decisions` does not move. `regen --check` confirms it. The
levers are threaded theme.ts (`fontSizeLadder` gains a `floor` arg; `buildComposites` pushes the two
caption rungs smallest-first through the existing ramp guard; `validateBrandInput` enforces both
enums), registered in `levers.ts` (regenerating `schema/lever-manifest.json`, 39 → 41 levers) and
`schema/theme-schema.json` (so the input is accepted and the manifest→schema parity gate in `test.ts`
passes).

ENGINE and not CONTRACT. `caption.sm` / `caption.xs` are emitted ONLY for a brand that opts in, so
neither is a GUARANTEED path (no corpus brand emits it) and neither is even brand-DEPENDENT in the
baseline (the contract corpus does not opt in) — the token-name surface every corpus brand emits is
unchanged, so `CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms the
guaranteed set holds; `--accept` refreshes only the baseline's informational `engineVersion` stamp to
0.72.0.

MUTATION-BY-NAME (docs/34). Nothing gated the type SIZE ladder for these opt-in rungs before this —
`lint-ramp-*` gate studio radius/space ramp previews and `lint-axis-values` gates component
`VARIANT_AXES`, neither the type ladder. So `test.ts` block C1d is the gate, and it REPRESENTS both
rungs and the flag: it asserts the default caption tier is md/lg only, that `captionFloor:10` adds
caption.sm=10, that `sizeFloor:8` adds caption.xs=8 AND floors the ladder at 8, that opting in
APPENDS caption rungs only (every non-caption composite byte-identical), and that `sizeFloor:8` is
FLAGGED as an escape hatch in notes. Removing the caption.sm push, the caption.xs push, the 8px
`fontSizeLadder` prepend, or the escape-hatch `notes.push` each fails a NAMED assertion in C1d.

0.71.0: an OPT-IN 1px `radius.hairline` sentinel (#1362, owner Option A, 2026-09-08). The radius ramp
rides an even 2px sub-grid (`snap2` → `Math.round(v / 2) * 2`), so 1px / 3px / 5px are unreachable from
ANY `radiusScale` / `baseMd` — every non-`none` rung is even by construction. New Balance's redesign
uses 1px as its dominant corner (68 nodes, a deliberate near-sharp look), which the closest faithful
input (`radiusScale: 1`) renders at 2px. Rather than change the `snap2` math (which would move the
whole scaled ramp for every brand), a FIXED, UNSCALED `hairline` = 1px rung is added the same way the
`round`/`capsule` pills are — pushed AFTER the scaled-ladder computation and its monotonicity guard, so
it perturbs neither — but gated on a new `radiusHairline` brand-input lever (a `form` toggle, off by
default). Unlike the pills it is not a pill (no clamp) and is ON the 4px dimension grid, so `tree.ts`
aliases it (`radius.hairline → {…dimension.1}`) rather than minting a literal.

DEFAULT-OFF, SO THE CORPUS IS BYTE-IDENTICAL. No corpus brand (aurora/harbor/wendys/nb) sets
`radiusHairline`, so their emitted radii are unchanged to the byte — `regen --check` moves only each
artifact's own generator stamp. The lever is threaded scale.ts → theme.ts (`buildDims`, and both the
baseline and per-mode `radiusScale` calls so a `modeLevers.radius` ramp carries the sentinel too and
still no-diffs on it, 1px being mode-invariant), registered in `levers.ts` (regenerating
`schema/lever-manifest.json`) and `schema/theme-schema.json` (so `validateBrandInput` accepts it and
the manifest→schema parity gate in `test.ts` passes).

ENGINE and not CONTRACT. `radius.hairline` is emitted ONLY for a brand that opts in, so it is not a
GUARANTEED path (no corpus brand emits it) and not even brand-DEPENDENT in the baseline (the contract
corpus does not opt in) — the token-name surface every corpus brand emits is unchanged, so
`CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms the guaranteed set holds;
`--accept` refreshes only the baseline's informational `engineVersion` stamp to 0.71.0.

MUTATION-BY-NAME (docs/34). The radius SENTINELS were not gated for presence at all before this — the
`round`/`capsule` pills are pushed unconditionally and nothing asserted they exist (`test.ts` L-03
filters `!r.pill` and never checks the pills themselves). That is the docs/34 finding, and it is fixed
here rather than filed: a new `test.ts` block asserts each sentinel is PRESENT and UNSCALED across
scales (round=128/capsule=999 pill, hairline=1 non-pill, all fixed at scale 0…2), that `hairline` is
ABSENT unless opted in, that opting in leaves the scaled ladder byte-identical, and that a brand opting
in emits `radius.hairline` aliasing `{…dimension.1}`. Removing the `hairline` push in `scale.ts`, or
the `round`/`capsule` push, fails these assertions BY NAME.

0.70.0: the TEXT-BEARING button family sizes its icon ONE RUNG SMALLER than its control (#1350, owner
Option A, 2026-09-08). `button` / `button-destructive` / `button-neutral` rebind their leading/trailing
icon slots from `icon.size.{sm,md,lg}` = 20/24/32 down to `icon.size.{xs,sm,md}` = 16/20/24 at
small/medium/large. The audit (#1350) found the old `large` icon at 32 too big; the owner fixed
`large` = 24 and shifted the whole family down one rung. `icon-button` is UNCHANGED.

THIS INTENTIONALLY BREAKS THE #324/#756 THREE-WAY IDENTITY, and the reversal is scoped to buttons.
#756 had a standalone `<Icon>`, a Button's leading visual, and an icon-button glyph all render the same
size at a given control size (medium → 24 everywhere). The owner has sanctioned a labelled button
carrying a glyph one rung smaller than a standalone icon — the label already carries the button, so the
flanking glyph reads better small. `icon-button` has no label to lean on, so it KEEPS the 1:1 identity
and still matches a standalone icon. The composition identity now holds for icon-button and is
deliberately offset for buttons. This is recorded in `docs/00-progress.md` and in the header comments
of both `lint-rung-names.ts` (arm 3) and `button.ts`'s `size.*.icon` block.

THE #756 GATES ARE RE-POINTED, NOT DELETED (docs/34 — the invariant changed shape, it did not
disappear). `lint-rung-names.ts` arm 3 now checks the default rung PER TIER FAMILY and expects the
button family's `icon.size.*` family at `OFFSET_DEFAULT_RUNG` (exactly one rung below `md`), every
other family still at `md`; the expected rung is derived from the RULE (`RUNG_ORDER` minus one), never
from the button's own binding. `test.ts`'s icon-button↔button parity assertion now asserts the button's
leading visual is EXACTLY one `ICON_SIZES` rung below the icon-button's glyph (and that they diverge),
against the ladder order as the independent oracle. Both still FAIL BY NAME if the button icon drifts to
any rung other than the sanctioned offset — a revert to `md`(24) or a slip to `xs`(16) each fail.

ENGINE and not CONTRACT, on #1252's decision. A component binding is a REFERENCE to a token name, never
a token name, and every rung it now points at (`icon.size.{xs,sm,md}`) already ships in all four brands
— no token path is added, removed or retyped — so `CONTRACT_VERSION` STANDS at 10.0.0 and
`token-contract.ts --check` confirms it. What moves is the PROJECTED COMPONENT SURFACE: the three
button defs' leading/trailing icon members now bind a different `icon.size.*` variable and measure a
different artboard, so each member's `planStamp` moves and `schema/component-surface.json` is
re-`--accept`ed for the three defs (member COUNT holds at 432 each). `lint-emission-version` is blind
to it — component payloads are not committed under `out/` — which is the exact gap `lint-component-surface`
covers. `regen --check` moves only each artifact's own generator stamp; `token-contract.ts --accept`
refreshes only the baseline's informational `engineVersion` stamp to 0.70.0, at contract 10.0.0.

MUTATION-BY-NAME (docs/34): (a) reverting a button icon rung in the def (e.g. `size.medium.icon` back to
`icon.size.md`) moves the button members' `planStamp` and fails `lint-component-surface` BY NAME.
(b) mutating the button icon to a NON-sanctioned size — back to `md`(24), or a two-rung slip to `xs`(16)
— fails the re-pointed `lint-rung-names` arm 3 AND the `test.ts` parity assertion BY NAME, proving the
offset invariant still bites. Both restored.

0.63.0: stale icon-count prose is corrected and gated (#1293). Two prose halves move and one gate is
added. (1) The 0.49.0 entry above said the engine emits `icon` as "a set of 39 members" — wrong on both
halves by the time it merged (the SHAPE: `icon.ts` declares `emitAsComponents`, so each glyph is a
standalone component, #1012/0.47.0; and the COUNT), and it is rewritten to name the def flag and the
surviving reason for the `COMPONENT_SET` diagnosis row (a designer's own library), with no number. (2)
`icon.ts`'s `codeOnly` said the fill grammar was "verified across all 40 sources"; #1316 had grown the
set to 43, so it now names the source instead of a count. That second edit is why this bumps ENGINE:
`codeOnly` is part of the projected component plan, so `lint-component-surface` sees the icon SURFACE
digest move even though `regen --check` is byte-identical and `lint-emission-version` reports nothing —
the #1252 case, an ENGINE bump the `out/` diff cannot see, demanded from the projected-surface side.

`CONTRACT_VERSION` STANDS at 10.0.0: no token name moved, and a glyph count in a comment is not a token
path — `token-contract.ts --check` confirms it. The durable half is `lint-icon-count.ts`: it derives its
EXPECTED from `ICON_NAMES.length` and forbids the icon def's metadata prose from restating a glyph count
that disagrees, so this drift class cannot recur silently. Takes 0.63.0 — 0.61.0/0.62.0 are spent by the
select and image-placeholder components building alongside; a plain integer collision, no interaction.

0.62.0: the engine grows an aspect-ratio LOCK and a clipsContent opt-in, and `image-placeholder` is
the component that uses them (#1316, owner Option A 2026-09-07). Two capabilities, one component, one
MINOR — and the interesting half is that the ratio is a component-STRUCTURE property rather than a
token, so the whole thing binds only existing roles and `CONTRACT_VERSION` stands at 10.0.0.

THE LOCK, AND WHY IT IS ONE. `image-placeholder` is an empty-state media frame with a `ratio` axis of
`1:1 | 4:3 | 16:9`. The ratio must hold while the frame's real size flexes, and the obvious shape —
bind a width token AND a height token per ratio — is the shape the engine has always STRIPPED
(`unlockAspectRatio`): a Figma node cannot hold two dimension bindings while its aspect ratio is
locked (the second `setBoundVariable` evicts the first), and dimension tokens vary per brand, so a
two-binding frame would change RATIO when a brand re-derived its dimensions. So the box binds ONE
nominal dimension (`width` → `container.narrow`, the veil idiom) and declares `aspectRatio: 'ratio'`;
the projector parses the member's own `ratio` value (`16:9` → 16/9) onto the plan (`FigmaNodePlan
.aspectRatio`), and both executors resize the frame to that proportion and call `lockAspectRatio()`,
so Figma DERIVES the second dimension. The `ratio` axis VALUE is the ratio — parsed by `parseRatio`,
not mapped by a second per-variant table — which is the clean expression Option A approved.

`ratio` REOPENS THE CLOSED `VARIANT_AXES` LIST — the fifteenth name, and the mechanical fallout of an
owner naming the axis (a component's variant API is a design call). It clears the list's bar: a
width-to-height PROPORTION no existing name expresses, distinct from `size` (a scale rung) and `width`
(a single main-axis length). `lint-axis-values.ts` carries `['1:1','4:3','16:9']` as a `sole` set, and
`anatomyErrors` refuses a `ratio` value that is not a positive `W:H` (the lock would capture NaN).

clipsContent — a box may now opt into cropping its overflow (`FigmaNodePlan.clipsContent`, default
false, carried onto the plan only when true so EVERY existing box's plan is byte-identical). Threaded
to the sites both executors hardcoded (`anatomy-figma.ts`'s payload branch, `write-components.ts`'s box
branch and `claimDefaults`), which keeps `lint-unclaimed-defaults`'s existing `clipsContent` row
satisfied — the executor still WRITES the value, now from the plan. `image-placeholder` opts in so a
dropped photo cannot overflow the frame; no other box does.

THE NEUTRAL ROLES: `fill` → `color.background.secondary` (a neutral surface one step off the page, so
the empty frame reads as filled rather than a hole), `icon` → `color.icon.tertiary` (the most muted
ink, for a de-emphasized "no image" marker). Both existing semantic roles, so no token is added.

THE PASTE-TIME-DERIVE RISK, RESOLVED TO A: Figma documents `lockAspectRatio()` deriving the second
axis on RESIZE, and a variable binding IS a resize, so the derive should hold at paste time — but that
a `setBoundVariable` triggers it live is a real-Figma-only fact, the accept-and-discard class the
round-trip gate names. The offline gates prove what they can — the lock is captured with the RIGHT
ratio, read back as `targetAspectRatio` — and the derive-on-paste is filed for the real-host arm
(`tools/component-roundtrip/`). Nothing falsified A, so there was no fallback to Option C.

THE READ-BACK GATE (docs/34). `anatomy-readback.ts` classifies `aspectRatio` (built `targetAspectRatio`
vs the PLAN's ratio) and `clipsContent`, so the corpus round-trip covers both per member. On top of
that, `test-roundtrip.ts` carries an INDEPENDENT block: it builds `image-placeholder` through the shim
and checks each member's frame against an owner-decided ratio CONTRACT authored in the gate, so a ratio
flipped/added/dropped in the def fails BY NAME (plan-as-oracle cannot catch a coherent def flip). The
shim and the test.ts payload stub both model `lockAspectRatio()`/`targetAspectRatio` — capturing from
the live width/height a resize just set, never from a plan input, so the read-back is an independent
witness. `test.ts`'s payload resize assertion is re-pointed from "node is never resized" to "node is
never resized AFTER its bind loop" (resize-then-bind is safe; the aspect-lock resize runs before it).

MUTATIONS RUN (docs/34): (a) flipping a ratio value in the def fails `test-roundtrip`'s aspect-lock
block by name (contract mismatch) and `lint-axis-values` (register mismatch); (b) breaking the
clipsContent thread fails `lint-unclaimed-defaults`'s `clipsContent` row / the round-trip clipsContent
check by name; (c) mutating the fill binding fails `test.ts`/`lint-paint`. Each restored.

NO COMMITTED ARTIFACT MOVES — component payloads are not committed under `out/`, and the def binds
existing tokens, so `regen --check` moves only this file's own generator stamp. The bump is demanded
from the projected-surface side (#1252's case): `lint-component-surface` gains `image-placeholder`'s 3
members and `paint-census` gains its grid, both re-`--accept`ed; `lint-standalone-floor`'s
`MUST_PROJECT` gains it. `lint-nesting` is unchanged — `image-placeholder` nests nothing and is nested
by nothing. `token-contract.ts --check` confirms 10.0.0 stands (a component binding is a reference to a
token name, never a token name); `--accept` refreshes only the baseline's informational `engineVersion`
stamp to 0.62.0, at contract 10.0.0 unchanged.

0.61.0 is `select`'s (the entry below) — it merged to main while this was in review, so this takes
0.62.0, the next free integer above main. Merged origin/main in: kept this 0.62.0 entry and select's
0.61.0 one, kept `CONTRACT_VERSION` at 10.0.0, and `componentDefs` carries BOTH defs.

0.61.0: `select` is a COMPONENT (#761 mechanism resolved) — the composed, native-first field, and the
FIRST def that NESTS the two shared field parts (`field-label` and `field-message`) rather than only
naming them in `composition` as `text-field` does. It is ONE unified component (not a checkbox-style
decomposition): a `box` column holding a nested `field-label`, a bordered control box (fill + stateful
border, radius, a fixed single-line height, a leading-glyph swap slot, the value/placeholder text, and
a trailing `chevron-down` vector) with an absolute `focus-ring`, and a nested `field-message` below.
tone(4) x state(5) x leading(2) = 40 members.

THE VALIDATION AXIS IS SPELLED `tone`, ALIGNED TO field-message's OWN `tone` — the point of the whole
shape. `nest-exposed` was refused in this engine at the time (#761; built later in 0.74.0, #1330), so the
nested message is `nest-fixed` with `follow: ['tone']`, which passes the axis through BY NAME. So select's validation axis is named `tone`
(values `[default, error, warning, success]`, identical to `field-message`), and the follow is a
same-name same-value passthrough rather than a value mapping. The consumer prop / UI still reads
"Validation". `lint-axis-values`'s overlapping `tone` entry gains `select` and records the alignment.

VALIDATION → BORDER FOLLOWS text-field EXACTLY: `error` is a BORDER-ONLY swap (→ `color.border.danger`,
the tone-led `error.border` key), warning / success are MESSAGE-ONLY (the border stays neutral, the
nested message carries the tone). No `border.warning` / `border.success` roles are invented — the tier
does not emit them and text-field does not color the border for those tones. `lint-paint`'s arm 1
gains one PROVENANCE_EXCEPTION, `select|error.border` (tone `error` → the `danger` role), the same
mapping `field-message|error.*` already carries.

NO NEW TOKEN, SO CONTRACT_VERSION STANDS AT 10.0.0 — every binding is an existing semantic role
(`field.border.*`, `border.focus`, `border.danger`, `field.fill`, `field.placeholder`, `text.primary`,
`icon.secondary`, `focus.ring.*`, the cross-cutting `disabled.*`). A component binding is a REFERENCE
to a token name, never a token name, so no guaranteed path moves; `token-contract.ts --check` confirms
it and `--accept` refreshes only the baseline's informational `engineVersion` stamp to 0.61.0.

NO COMMITTED ARTIFACT MOVES — component payloads are not committed under `out/`, and the def binds
existing tokens, so `regen --check` moves only this file's own generator stamp. The bump is demanded
from the projected-surface side (#1252's case): `lint-component-surface` gains `select`'s 40 members
(re-`--accept`ed), `lint-paint`'s census gains its grid/set, and `lint-nesting`'s edges go 8 -> 11
(`select` nests `field-label`, `field-message` and `focus-ring`). `lint-standalone-floor`'s
`MUST_PROJECT` gains `select` (its root is a column with children — a real extent).

MUTATION (docs/34): (a) pointing the `message` nest at a non-existent component (`field-messag`) fails
`lint-nesting.ts` arm nest-resolves BY NAME (`select.message nests 'field-messag', which is not a
component in componentDefs`); restored. (b) repointing `error.border` from `color.border.danger` to
`color.field.border.rest` (a neutral border that resolves) fails `lint-paint.ts` arm 2 (census) BY
NAME — the paint hash for `select` moves — and, once the exemption is removed, arm 1 too; restored.

0.60.0: the media veil is a COMPONENT (#1030, renamed #1317, built here). `veil` binds the six
semantic `veil.{dark,light}.{subtle,medium,strong}` roles into a standalone, full-bleed overlay — a
`box` root with one `fill`, keyed by two axes `value` (dark | light) x `intensity` (subtle | medium |
strong), 2x3 = 6 members. The fill for a coordinate binds the matching role and nothing else.

NO NEW TOKEN, SO CONTRACT_VERSION STANDS AT 10.0.0. The `veil.*` roles already ship (renamed by
#1317, this file's 0.59.0 entry); a component binding is a REFERENCE to a token name, never a token
name, so no guaranteed path moves. `token-contract.ts --check` confirms it rather than this comment
asserting it; `--accept` refreshes only the baseline's informational `engineVersion` stamp to 0.60.0,
at contract 10.0.0 unchanged (the same refresh 0.47.0/0.57.0 describe). A prior build tried to bind
the raw alpha PRIMITIVES and hit the semantic-layer wall; this binds the semantic `veil.*` roles, the
accepted path (`button` binds `color.field.*` the same way).

TWO AXIS NAMES REOPEN THE CLOSED `VARIANT_AXES` LIST (#756 closed it; #1248 reopened it once for
`weight`). `value` and `intensity` are the owner's axis-name decision — the component's variant API
is a design call — and each clears that list's bar (a distinct kind of distinction no existing name
expresses): `intensity` is a wash's MAGNITUDE (nearest `weight`/`appearance`, and neither), `value`
is a dark-vs-light lightness polarity (nearest `tone`/`surface`, and neither). `lint-axis-values.ts`
carries both as `sole` sets. The axis VALUES are lower-case (`dark`/`light`) so `lint-paint.ts` arm 1
covers every fill with no exemption — the key's lead is the value and the ref carries it as a segment
(`dark.subtle` -> `color.veil.dark.subtle`).

SOLID WASHES ONLY. Prism 2's `Gradient from top/bottom/left/right` variants are DEFERRED (#1318,
owner-held): the engine has no gradient-paint capability, so a gradient axis would bind no paint.
Recorded in the def's `codeOnly` and `notes.unverified`.

A NORMAL STANDALONE BUILD — neither `notStandalone` nor `emitAsComponents`. A veil is full-bleed and
has no intrinsic size, but a standalone Figma component has no parent to fill, so the root binds a
NOMINAL square side (`container.narrow`, 720px, a semantic role not a primitive) exactly as
`focus-ring` does (#1280) — present only so the library artifact is a wash-shaped rectangle a
designer resizes rather than Figma's 100x100 default frame. `lint-standalone-floor.ts`'s `MUST_PROJECT`
gains `veil`.

NO COMMITTED ARTIFACT MOVES — component payloads are not committed under `out/`, and the new def binds
existing tokens, so `regen --check` moves only this file's own generator stamp. The bump is demanded
from the projected-surface side (#1252's case): `lint-component-surface` gains `veil`'s 6 members and
`paint-census` gains its grid, both re-`--accept`ed. `lint-nesting` is unchanged — `veil` nests
nothing and is nested by nothing.

MUTATION (docs/34): pointing `veil`'s `dark.strong` fill at `color.veil.light.strong` (a wrong
polarity that resolves) fails `lint-paint.ts` arm 1 BY NAME — `provenance: veil|dark.strong —
value='dark' is absent from 'color.veil.light.strong'`. Restored. The census (arm 2) also catches a
wrong-RUNG mutation (`dark.strong` -> `color.veil.dark.subtle`), which resolves and satisfies
provenance but moves the paint hash.

0.59.0: the media veil's three rungs are renamed for INTENSITY, not for the WCAG floor they clear —
`large`/`body`/`enhanced` become `subtle`/`medium`/`strong` on both polarities (#1317). Owner
decision: naming a rung `body` claimed it "clears 4.5:1", a per-image guarantee the engine cannot
keep — the floor is measured against the worst pixel of an UNKNOWN image, so a real photo's combined
contrast under the wash depends on the specific image. The floors stay in `VEIL_RUNGS` as the
DEFAULT-PICKER (each rung still derives to the least alpha step clearing its floor), so the emitted
alphas are BYTE-IDENTICAL — light 40/50/60, dark 50/60/70 — and only the six token NAMES move.
`regen --check` confirms the values held: the only value-carrying bytes that move under `out/**` are
the veil path segments themselves plus this file's generator stamp.

A CONTRACT bump rides with it — six guaranteed token paths are renamed — recorded in `DEPRECATIONS`
(old rung → new rung, both polarities) so `token-contract.ts --accept` demands the bump and the Figma
variable rename derives from it via `rename-map.ts`. The Figma half needs NO `MATERIALIZATION_RENAMES`
rule: a rung rename moves the ROLE (`veil/dark/body` → `veil/dark/medium`), which `projectionsOf`
turns into a real variable rename, and a materialization rule would be a second record in front of one
operation — the `multiplyClaimed` refusal `lint-materialization-renames.ts` exists to raise.

0.3.1: semantic ink (`text|icon.<sem>`) now gates against its own `-subtle` tint as well as the page
floor, so it resolves a rung darker on white-page brands. Values only — no name moved, so
CONTRACT_VERSION stands. Exactly the case this split exists for.

0.3.2: muted semantic ink (`text|icon.<sem>-subtle`) is GATED at the large-text bar (`tertiaryMin`)
instead of shipping ungated at a fixed rung. Standard light/dark values are unchanged — every brand
already cleared 3:1 — so the only value move is HC, where the fixed rung could not respond to the
raised bar and now escalates a rung. A `min` going 0 → 3 is not a NAME change, so CONTRACT_VERSION
again stands; note that the contract covers path + `$type`, not the contrast metadata. (#570)

0.3.3: `border.focus-inverse` is emitted — a focus ring gated at `nonTextMin` against
`background.inverse.primary`. The single `border.focus` was gated on the page and reused on inverse
surfaces, where it measured 2.09:1 (hc-light) / 2.40:1 (hc-dark), below SC 1.4.11 in the two modes
that exist for users who most depend on seeing focus. No existing value moves — this ADDS a path,
which is why `CONTRACT_VERSION` moves too (a MINOR, unlike 0.3.1/0.3.2 above). (#573)

0.3.4: `WEIGHT_STYLE_NAME_MONO` (a hardcoded 600→Medium collapse for mono faces) is removed from
`emit-figma-font.ts`. It was a guess working around a spelling-variance bug (`Semi Bold` vs
`SemiBold`) that #499/#530 already fixed properly — the plugin write lane now resolves the emitted
style name against the family's REAL loaded styles at write time, so a mono family carrying 600
under any spelling now resolves it correctly instead of having it suppressed. `fontStyleName`'s
`mono` and non-`mono` tables now agree at every weight; no corpus brand's default configuration
exercises a mono face at weight 600 (`code` only ever takes the `default` role), so this bumps the
version for the behavior change without moving any committed corpus artifact. Values only — no
token name moved, so `CONTRACT_VERSION` stands. (#538)

0.4.0: the engine emits a second, CONFORMING projection of every tree — `<brand>.base.tokens.json`
plus one `<brand>.<mode>.overlay.tokens.json` per theme mode. The canonical tree is unchanged and
remains the source of truth; per-mode values still live under `$extensions.prism3.modes`, which
DTCG defines as ignorable, so the projection is what a stock consumer can actually read. A minor
rather than a patch because the artifact SET grew, not because anything existing moved — no token
name and no canonical value changed, so `CONTRACT_VERSION` stands. (#609)

0.5.0: the interactive outline EDGE is stateful — `interactive.<c>.border` (one value anchored at
palette step 500) becomes `interactive.<c>.border.{rest,hover,pressed}`, and the same for
`on-inverse.border`. Values move as well as names: the chromatic columns now FOLLOW THEIR INK,
which lands on a different ramp step than the old anchor in 34 of 40 corpus brand×mode×column
combinations — 17 of 20 for `primary` alone, and in every dark, hc-light and hc-dark mode. (The old
anchor was step 500 escalated by `chromatic()` only as far as `nonTextMin` demanded, so it already
sat off 500 in 2 of those 40; the count above is measured old-vs-new, not "differs from 500".)
Both versions move — this is the rare change that is simultaneously a behaviour change and a name
change, so it is worth stating that they moved for different reasons rather than as one event.
(#576)

0.6.0: the conforming projection now OMITS non-DTCG types, which today means `spring` — 3 leaves per
brand, 12 across the corpus, gone from `<brand>.base.tokens.json`. The canonical
`<brand>.tokens.json` is untouched and still carries them, so no token name and no canonical value
moved: `CONTRACT_VERSION` stands, and `token-contract.ts --check` confirms it rather than this
comment asserting it. A minor rather than a patch because the artifact CONTENT shrank — a consumer
sourcing the projection sees three fewer tokens, which is a compatibility-relevant change even
though what they lose is a value that read `[object Object]`.

The reason it is a fix and not a removal: those files exist to make a conformance promise (#609), and
a `$type` outside the spec makes the promise false while producing a garbage value in the same
stroke. `spring` is a real part of the motion vocabulary and stays in the tree that is ours.
Nothing here decides springs' future — if the motion vocabulary ever becomes standard, `spring`
joins `DTCG_TYPES` and the projection gains those tokens back with no other change. (#642)

0.7.0: mode-varying shadows reach their overlays. Two things move, and they are worth separating.
(1) The emitted `$extensions.prism3.modes` entry for a shadow is now the WRAPPED `{ $value: [...] }`
shape every other mode entry already used, instead of the bare layer array — one shape for one
concept. (2) Because the projector's guard tested for that wrapper, 28 mode-varying shadows (7 per
brand × 4 brands) were silently absent from every `<brand>.dark.overlay.tokens.json`, and now
appear. A conforming consumer sourcing `base + dark.overlay` was rendering LIGHT shadows in dark
mode; it now renders the dark ones. (#708)

A minor rather than a patch for the same reason 0.6.0 was: the artifact CONTENT changed in a way a
consumer can observe — there, the projection lost three tokens; here, each dark overlay gains seven.
Overlay membership is the whole point of the projection, so a change to it is compatibility-relevant
even though it is a change from wrong to right. The canonical tree's mode-entry SHAPE moving is the
second reason: anything reading `$extensions.prism3.modes` directly (ours today, but the extension
is emitted) sees a different shape for shadow than it did at 0.6.0.

No token name and no `$type` moved — every leaf involved already existed in both the base and the
canonical tree — so `CONTRACT_VERSION` stands, and `token-contract.ts --check` confirms that rather
than this comment asserting it. Worth stating plainly, because a change that alters which values a
consumer resolves while moving no name is precisely the case the two-version split exists for.

0.58.0: three glyphs join the icon set — `play-circle`, `pause-circle` and `image` (media / content).
The two circle-enclosed transport glyphs are the owner's verbatim Remix paths (play-circle-line,
pause-circle-line); `image` is Remix's `image-line` (the mountain + sun placeholder), normalized to
the set's `fill="currentColor"` single-path 0 0 24 24 header. `emit-icons.ts` regenerates
`icon-glyphs.ts`, so `IconName` grows 40 → 43, `ICON_PATHS` gains three entries and `ICON_FILL_RULES`
is unchanged (none of the three declares a non-default winding rule).

ONE MOVE, ENGINE ONLY — the SAME case as 0.47.0 (#1012, "a 40th glyph joins the set"), and worth
restating because the task that requested this expected a CONTRACT MINOR and the tooling disagrees.
The projected component SURFACE grows: `icon` gains three members, so `schema/component-surface.json`
moves 40 → 43 and `lint-component-surface --accept` restamps it (which is why the ENGINE bump is owed
and that gate refuses the accept until it is made). The token layer does not move — `regen --check`
is byte-identical but this file's own generator stamp — so this is an ENGINE bump the `out/` diff
cannot fully see, demanded from the projected-surface side (#1252's case).

`CONTRACT_VERSION` STANDS at 9.4.0, exactly as 0.47.0 decided and for the same reason: `CONTRACT_VERSION`
governs the guaranteed TOKEN-NAME surface — the color/dimension paths every brand emits — and a glyph
name is not a token path. Confirmed by the requested mutation test, which FALSIFIED the "the new names
are contract surface" hypothesis rather than confirming it: with the three glyphs added and no version
change, `token-contract.ts --check` reports the guaranteed set byte-identical (577 → 577) and passes at
9.4.0; and raising `CONTRACT_VERSION` to 9.5.0 makes `--accept` REFUSE — *"this change is NONE but
CONTRACT_VERSION is still 9.5.0 (baseline 9.4.0)"* — so 9.5.0 cannot be recorded without inventing a
token-path change that does not exist. The vocabulary growth is carried where it belongs: the projected
component-surface baseline (40 → 43, ENGINE-gated) and the `icon.name` component-API contract that
`docs/30` and `icon-set.ts` describe (adding a name there is MINOR, removing/renaming MAJOR), neither of
which is the token-name contract this const versions. The baseline's informational `engineVersion` stamp
is refreshed by `--accept` to track the ENGINE bump above, at contract 9.4.0 unchanged.

0.57.0: the text-string component property is `Label` / `Message`, not `children` (#1242). Every def
whose text property was keyed `children` — the button family (button / button-destructive /
button-neutral, one `makeButton` factory), `field-label`, and `field-message` — is swept off the
React-ism. `children` is the React idiom for a component's slotted content, and the projector uses the
`figmaProperties.texts` KEY verbatim as the Figma component-property NAME (`planSetProperties`), so a
designer opening the properties panel met `children` — a word about React, on a surface for designers.
Owner-recommended `Label` for the button; `field-label`'s text IS a label, so it takes `Label` too;
`field-message`'s text is a MESSAGE, so it takes `Message` (the meaningful name that def's own comment
had wanted and the coupling used to forbid) rather than mislabelling a validation caption "Label".

THE PROP AND THE PANEL NAME ARE ONE NAME, which is the whole finding. `figmaPropertyErrors` validates
every `texts` key against `props[].name`, so the Figma-facing property name cannot diverge from the
code-side prop name — the React-ism was leaking precisely because the two are the same string. The
rename therefore moves BOTH the prop and the `texts` key together in each def; they are not two edits
but one, enforced.

NO CODE CONNECT MAPPING EXISTS TO BREAK. Code Connect is a FUTURE, auto-generated projection (docs/19
§5, filed #258) — "the spec knows both the Figma component and the code component, so the mapping is
derived". Because the mapping is derived from this one def, renaming the property here IS the mapping
moving; there is no separately-authored `.figma.tsx` in the repo (confirmed by sweep) whose hand-written
`props: { … }` would now dangle. A generator that maps by name stays trivial: the Figma property and the
prop remain one name.

ENGINE and not CONTRACT, on #1252's decision, and the same case as a glyph name (0.47.0). The token
layer does not move — `regen --check` is byte-identical but this file's own generator stamp, and
`CONTRACT_VERSION` stands at 9.4.0: `CONTRACT_VERSION` versions the guaranteed TOKEN-NAME surface, and a
component-property name is a component-API name, which docs/30 puts deliberately outside it (as the
code-side prop API is). What moves is the PROJECTED COMPONENT SURFACE: the property name rides on each
member's plan (`propertyRef.prop`), so `planStamp` moves and `schema/component-surface.json` is
re-`--accept`ed (authored baseline, never regen). `lint-emission-version` is blind to it — component
payloads are not committed under `out/` — which is exactly the gap `lint-component-surface` covers.

CAUGHT BY NAME, both directions (docs/34). `test.ts` compares each projected property name against a
hand-written literal, independent of the def: the button set's properties are `['Label', 'leadingVisual']`
(and the TEXT prop is `Label` / `Label:TEXT`), `field-label`'s required text prop is `Label`, and
`field-message` projects a TEXT property named `Message` (a new assertion — that def had no property-name
gate before). Mutating any `texts` key back to `children` fails the named assertion, not merely the suite.
0.56.0: `icon-button`'s `intent` axis is SPLIT into three sibling COMPONENTS (#1225) — `icon-button`
(primary), `icon-button-destructive`, `icon-button-neutral` — the icon-only counterpart of #1223/#1224's
Button split, built by a `makeIconButton` factory from one shared anatomy. Intent stops being a variant
axis and becomes component identity; the only thing that differs between the three is the
`color.interactive.<family>.*` binding, and `test.ts`'s factory guardrail pins that (docs/34).

A MINOR, and demanded from the PROJECTED-SURFACE side (#1252's case), not from `out/`. The one 162-member
`icon-button` set (3 intent × 3 appearance × 3 size × 6 state) becomes three 54-member sets (3 appearance
× 3 size × 6 state each): a designer opening a set now meets a smaller variant matrix and, in the panel,
TWO new sibling components — that is a different engine. `lint-component-surface` carries it in
`schema/component-surface.json` (icon-button 162 → 54, plus the two new siblings at 54; `--accept`
restamps). `lint-emission-version` stays silent because component payloads are not committed under `out/`,
which is the exact gap #1252 added `lint-component-surface` to cover — this release's `out/` diff is EMPTY.

`CONTRACT_VERSION` STANDS AT 9.4.0, and that is the property rather than an omission: a component identity
is not part of the guaranteed token-NAME surface. The split adds and removes no DTCG path — the three
siblings resolve the SAME `color.interactive.{primary,neutral,destructive}.*` tokens the one def resolved,
only fixed per component instead of crossed as an axis. `token-contract.ts --check` reports unchanged and
confirms it rather than this comment asserting it. Same reading #1223/#1224 took for the Button split.

#1300's border binding (`border-width.hairline` on the container, #1278) is CARRIED INTO EACH sibling by
the shared factory — one bind, three components — which is the shape #1278's first cut had to name
icon-button separately for at all (`inherits: 'button'` is prose; the button factory binding reached it
not at all). The #1278 arms now span all three icon-button siblings alongside the three button ones.

`lint-axis-values`'s `intent` register entry — scoped to `['icon-button']` alone since #1223 with a
provisional reason naming this open question — is REMOVED: no def carries `intent` as a variant axis any
more, and an entry no def uses is what its own ARM B fails as stale. The concept survives as component
identity, which is not a variant axis and so not that register's subject.

0.55.0: the CHECKBOX COMPOSES — `checkbox-control` is a new atomic def and `checkbox` becomes the
labelled Row that NESTS it in flow (#1226 step 2, #901). The first real consumer of `kind: 'nest'`,
ever: PR-A shipped the mechanism with zero consumers and #1298/#1299 (0.52.0/0.53.0) made its `follow`
axes and its own height reach the node, so this is the shape those three PRs were built for.

WHAT MOVED, AND THE SHAPE THE OWNER DECIDED. The painted box, its two glyphs and its focus ring — the
whole of `control` and below — extract VERBATIM into `checkbox-control` (54 members, `selection × size
× state`, nesting `focus-ring` unchanged). `checkbox` keeps its `id` and its 54-member Row set; where
it inlined the box it now holds a `nest` of the atom. The `controlBox` line-box wrapper (#1201) and the
top-aligned row STAY on the Row: the owner decided the wrapper remains a real `box` (carrying the
line-box height and the centring) and only its CHILD becomes the nest — so the small control is centred
within the taller line box and does NOT stretch to fill it. That is why #1299 was not the direct
dependency the plan first assumed: the centring box handles alignment, and the nest carries the inner
control's own square (`size`→`control.size.*.height`), shorter than the line box it sits in.

THE NEST FOLLOWS ALL THREE AXES the atom carries — `selection`, `size`, `state` — resolved from
`paintCoord` (#1298), so a checked/large/hover Row nests the checked/large/hover Control member. The
no-stretch pin is asserted BY NAME in `test.ts` #1201: a nest bound to the line box instead of the
control square fails that assertion, and the nb token check proves the two keys resolve to different
heights. The Row sheds its `{selection}`-led paint keys (its remaining paint is the label ink), so
`lint-paint`'s `selection` exemption is now exercised by `checkbox-control` with `radio`/`switch`.

NEW SETS ARE NOT COMMITTED UNDER `out/`, so `regen --check` moves only this file's generator stamp —
the token trees are untouched (the new def binds existing tokens; no token name, `$type` or value
moves). The bump is demanded from the projected-surface side (#1252's case): `lint-component-surface`
gains `checkbox-control`'s 54 members and re-lays `checkbox`'s (its `control` part is now a
`NESTED_INSTANCE`), so `--accept` restamps the baseline, and `paint-census` gains the new def's grid.
`lint-nesting` edges go 7 → 8: `checkbox`'s direct `focus-ring` edge moves onto `checkbox-control`,
and `checkbox` → `checkbox-control` is the new one (net +1). `CONTRACT_VERSION`
stands at 9.4.0, and `token-contract.ts --check` confirms it rather than this comment asserting it: a
component binding is a REFERENCE to a token name, never a token name, so no guaranteed path moves.

0.54.0: BOTH button defs' borders are BOUND to `border-width.hairline` (#1278). The width does not
move — Prism 2 draws its outline buttons at 1px and that is owner-confirmed — so this binds the token
that already resolves to 1 rather than choosing a figure. What moves is PROVENANCE. The 1 was the two
executors' literal (`if (!node.strokeWeight) … = 1`): the right number with nothing behind it, so a
brand re-runging its border floor moved every other bordered part while the button stayed on Figma's
fallback, and no gate could have said so.

ENGINE and not CONTRACT, on #1252's decision. `border-width.hairline` already exists in all four corpus
brands (aliased to `<root>.core.dimension.1`) — no token is added, no name moves, so `token-contract
--check` reports unchanged and `CONTRACT_VERSION` stands at 9.4.0. What DOES move is the projected
component surface: all three button intents keep their 432 members and every one of them now carries a
bound `strokeWeight`, which a designer sees in Figma. `lint-emission-version` cannot see it — component
payloads are not committed under `out/`, and this release's `out/` diff is EMPTY — which is exactly the
gap `lint-component-surface` was added to cover.

THE SCOPE CLAIM IS NOW TWO TOKENS RATHER THAN ONE TOKEN AND ONE FALLBACK, and that is a real gain over
#1228 rather than tidiness. #1228 bound the three measured selection controls to `border-width.thick`
and left an arm asserting the buttons bound NOTHING — which could only catch a sweep in one direction.
A change putting every border on 1px would have moved the controls alone and read as correct. Both
directions fail by name now, and the two rungs staying different (2px is a control weight, 1px is a
button's) is the assertion rather than a coincidence.

FOUR PARTS, NOT THREE, AND THE FOURTH IS WHY `inherits` IS WORTH DISTRUSTING. `icon-button` carries the
same `border` slot on its own `container` and is a SEPARATE def with a 162-member set; its
`inherits: 'button'` records the API delta and nothing in the projector resolves through it, which that
file's own `paintKeys` note already said. So binding the `makeButton` factory covered three intents and
reached it not at all — and no gate could have said so: `lint-unclaimed-defaults` reads the executors'
literal `strokeWeight = 1` as a CLAIMED default, correctly, which is precisely what makes it the wrong
instrument for this question. The def binds the rung explicitly now and the #1278 arms span all 594
members of both sets.

`icon-button`'s CHUNK PIN moved 6 -> 7 and is re-pinned rather than worked around, on the instruction
that pin carries. #681's 5 -> 6 was shell growth; this is per-MEMBER growth — one more binding on every
one of 162 members — so 27/28/27/28/27/25 members per chunk became 26 x 6 + 6. No chunk breached the
budget at any point (peak 41,987 -> 41,861 against 42,000), which is the byte budget doing the job a
variant count could not.

ONE FIXTURE HAD TO STOP MEASURING A LITERAL. `test.ts`'s stub derived a node's border-box footprint from
`node.strokeWeight`, so the moment the weight became BOUND the term went to `2 x 0` and #503's footprint
drift stopped being reported at all — the arm reading `[]`, which looks like "no drift" and was really
"cannot see the stroke". The stub now reads bound-or-literal, as Figma does, and the four border-width
rungs are pinned to their real pixels so the arm's hand-written `2` stays falsifiable.
0.53.0: a nest part's `height` reaches the node instead of being dropped in silence (#1299, #1226 PR-B).
`node()`'s non-box branch read `p.size` and nothing else, so a `height` the schema ACCEPTED projected no
binding at all — a third posture beside the two that were already coherent: `layout`, `padding`, `gap`,
`width` and `strokeWidth` are REFUSED by name on a non-box, and `absolute` refuses `size` outright.
`height` was neither honoured nor refused, which is the one posture that loses an author's intent without
telling them.

Honoured for `nest` ALONE, and the narrowness is the decision rather than an oversight: `vector`'s height
is already schema-refused, and slot/overlay/text is a question nothing in the corpus asks — measured, not
assumed (no def authors `height` on any non-box part today). Filed as #1305 rather than fixed here, and
the engine suite PINS the scope, so widening it later fails a named assertion instead of drifting.

A nest's height is what a composed control needs from the host: the #1201 line box that aligns a checkbox
with the FIRST line of a wrapping label is a height on the nested Control, not on the row that holds it.

NO COMMITTED ARTIFACT MOVES — no shipped def authors a nest at all yet (the 7 nesting edges are all
`absolute` focus-rings), so the bump is for the MECHANISM and `CONTRACT_VERSION` stands: no token name is
involved. The executor needed no change, and that is asserted rather than assumed — the plugin lane reads
`boundVariables.height` back off the built INSTANCE, so "the bind loop is generic over node type" is a
measurement here, not a reading of its source.

0.52.0: a nested coordinate can follow the axes a composed consumer actually needs — `size` and
`state` (#1298, #1226 PR-B). `nestVariantOf` resolves each `follow` axis from `paintCoord` instead of
the caller's argument map, and the schema's reachability test becomes `figmaProperties.variantAxes` ∪
`state` instead of membership in `variants`.

THIS CORRECTS PR-A'S CHANGELOG, which said `nestVariantOf` "already loops all follow axes". True of the
loop, false of the mechanism, and worth stating plainly because the sentence was the reason nobody
looked: what the loop read was `slots`, and two of the three axes a Control→Row nest must follow do not
arrive there. `size` is a POSITIONAL parameter of `figmaAnatomyPlan` and is filtered out of
`figmaAnatomySet`'s grid spread on purpose, so `slots.size` never exists; `state` did reach the loop and
was refused one layer up, by a schema test asking `axis in variants` — where `state` is deliberately
NOT a `variants` key (the two collide, and 1202 says so).

The `size` half FAILED TOWARD A REAL MEMBER, which is why it blocked the composed consumers rather than
merely annoying them: the fixed fallback still resolved, so a `size=small` Row would have nested a
`size=medium` Control and built green in a live file. The same silence covered every axis in `variants`
but absent from `variantAxes` — button declares `width` and does not project it, so `follow: ['width']`
validated and reached nothing. Both are now refused by name, and the message names the projected
coordinate rather than the declared one.

`axisValue` is deliberately untouched: `size` IS a `variants` key, so widening it there would fold
`size` into `coord` and retire the "structure-only plan ⇒ empty coord" invariant `lint-paint` reads.
Routing through `paintCoord` also collapses a third substitution rule — paint keys, binding keys
(#1248) and nest coordinates now fill from one map.

NO COMMITTED ARTIFACT MOVES, and that is measured rather than argued: the only defs using `follow`
today are the three button intents, all following `['surface']`, which was already reachable. So the
bump is for the MECHANISM, per the rule this constant states — and `CONTRACT_VERSION` stands, because
no token name is involved at all.

0.51.0: every SHIPPED brand roots at a namespace of its own, and `prism`/`pds3` are RESERVED (#1283).
aurora `prism` -> `ads`, harbor `prism` -> `hds`, wendys `prism` -> `wds`, joining New Balance's
long-standing `nbds` under the same `<brand>ds` convention. Three of the four had been sitting on the
engine default without choosing it, which made a read path spelling `prism/` correct in three brands
out of four — the #1097 defect class one layer up, with `nbds` the only thing keeping any arm honest.
Wendys could not have declared a root at all: the STANDARD dialect had no field for one, so
`x-prism3.root` is added beside `density` and `actionPalette`, and the brief declares `wds` there.

A MINOR, and the largest observable change in this file's history by row count: every emitted token
name in three brands changes its first segment — 1210 Figma variables renamed across aurora and
wendys, recorded as `brand-roots-1283` in `MATERIALIZATION_RENAMES` (the register for renames the
contract cannot see). It also forced #1097's rule to stop asking "does this start with the LIVE root",
which was a correct way to ask "is this namespaced yet" only while no brand ever CHANGED root.

`CONTRACT_VERSION` STANDS AT 9.4.0, and that is the property rather than an omission: the guaranteed
surface is keyed BELOW the configurable root, so `prism.color.text.primary` and
`ads.color.text.primary` are the same guaranteed path. `token-contract.ts --check` reports unchanged
with all three roots moved and confirms it rather than this comment asserting it — the only line
moving in the committed baseline is this constant's own stamp. Had the surface moved, that would have
been a finding about where the contract is keyed, not something to `--accept` past.

The reservation is a naming policy over the SHIPPED CATALOG and is deliberately NOT enforced in
`brandTheme`: `input.root ?? 'prism'` is untouched, an arbitrary `BrandInput` may still declare either
reserved name, and the check is a gate over every committed `out/<id>.tokens.json` read for the root
it actually EMITTED — the only reading that could have caught wendys, which declared nothing. The
canonical default theme those namespaces are held for is NOT authored here (#1296).

0.50.0: the PASTE PATH gets the same swap diagnosis, and the two executors stop disagreeing (#1288).
`swapMissAdvice`, its `SwapFound` union and the two consequence clauses move out of
`apps/plugin/src/write-components.ts` into `anatomy-figma.ts`, beside `nestMissAdvice` and for the same
reason: the plugin IMPORTS the helper, the emitted payload interpolates its four sentences, and neither
can drift from the other while there is one definition. The payload's two swap sites — `PAYLOAD_BUILD`'s
`INSTANCE_SWAP` branch and the property loop in `PAYLOAD_DECLARE_PROPS` — now compose the four-way
message byte-identically to the plugin's two consumers, which are untouched.

THE DESIGN QUESTION 0.49.0 LEFT OPEN HAS A FALSE PREMISE, and the correction is the interesting part of
this release. That entry (and #1288 quoting it) deferred the paste path because *"it composes its advice
at EMIT time and has no `root.findAll` to read the file state from"*. Emit time decides only WHICH
strings ship; the payload itself RUNS IN THE FILE, so `figma.root.findAll` is available to it exactly as
it is to the plugin — the nest path's own payload has been calling it, inline in `PAYLOAD_BUILD`, for two
releases. So there was never a degraded version to design: the paste path gets the same four rows, the
same wording and the same second search. Left uncorrected, that premise would have justified a
permanently worse message on the surface a designer reaches through a paste.

WHAT THE SENTINEL IS ACTUALLY FOR, then. `SWAP_TARGET_SLOT` (`__SWAP_TARGET__`) is the swap counterpart
to `NEST_TARGET_SLOT`, and it is needed for the one thing emit time really does constrain: the four
sentences are BAKED into the payload before any node's `swapTarget` is known, so each names the sentinel
and the payload substitutes the real name at paste time. Where the nest path needs one such row, the
swap path needs all FOUR — every swap sentence names its own target, which is #1262's finding, and a
starved run reports two adjacent swap misses in one report (`leadingVisual`, and `spinner` at
`state=pending`), so "the component just above" would bind to a neighbour.

THE PARITY GATE IS EXTENDED RATHER THAN ADDED. `test.ts`'s ONE STUB, TWO DRIVERS block already required
byte-identical miss strings out of both executors on the nest path's fifth miss (#681); it now does the
same for swaps, across all four file states and both consumers. It could not have caught this drift
before: the starved run's file still holds `FPO-default-icon`, so every swap resolved, and the #681 case
only removes `focus-ring`. That is precisely how 0.49.0's plugin-only change stayed green for a release
while the two executors told a designer different things about the same file.

WHY THIS BUMPS ENGINE, on 0.49.0's own reasoning: these are SHIPPED PROSE in `apps/plugin/dist`, which
`lint-us-english` scans as a surface of this engine, and they now ship twice over — once as the imported
helper and once inside the emitted payload string in `main.js`. `CONTRACT_VERSION` stands at 9.4.0 and
`regen --check` reports all 108 committed artifacts byte-matching: no def moved, and no `out/**` byte
moves but this file's own generator stamp. One correction to 0.49.0's prose was deferred from here to
its own change: its claim that the engine emits `icon` as "a set of 39 members" was stale on both
halves — the shape (it materializes as separate components, #1012/0.47.0) and the count — and #1293 has
since rewritten that entry to name `icon.ts`'s `emitAsComponents` and drop the number, plus added
`lint-icon-count.ts` so an icon-metadata count claim cannot drift from `ICON_NAMES.length` again.

0.49.0: a missing SWAP TARGET is diagnosed instead of merely named (#1280 PR-C, #1212 residue). Both
`INSTANCE_SWAP` consumers in `apps/plugin/src/write-components.ts` — the node loop and the property loop
— now run the #681 second search on the failure path and report through a four-way `swapMissAdvice`
(`ABSENT | COMPONENT_SET | INSTANCE | OTHER`), each sentence naming its own target and each call site
adding the one consequence clause it owns.

THE SWAP PATH HAD #681's DEFECT ONE NODE TYPE OVER, and had it longer. The node loop reported
`leadingVisual.swapTarget -> FPO-default-icon` and nothing else; the property loop reported
`... (not found; property not created)`, and "not found" is the same wrong claim `nestMissAdvice`
retired — wrong for three of the four file states it covers. So "the slot is empty" and "the slot is not
swappable" were indistinguishable in the report, which is exactly how the owner's button-icon symptom
read.

THE `COMPONENT_SET` ROW IS THE ONE A DESIGNER ACTUALLY HITS once icons are wired, and it is why this is
a fix rather than a rewording. An `INSTANCE_SWAP` default is a single node id (Figma refuses the
component key, `''` and `null` alike), and a designer's own icon library is very often a `COMPONENT_SET`
— so in that state the designer has published EXACTLY what a swap target expects and still gets a miss.
What is missing is a nomination of one member, and no message said so. (The row is NOT about prism3's
own emission: `icon.ts` declares `figmaProperties.emitAsComponents`, so the engine materializes each
glyph as a standalone top-level `icon/<glyph>` COMPONENT rather than one set — #1012/0.47.0. The
surviving reason is the designer's library, which is what #1292's test now states in code; the
membership is `ICON_NAMES.length` in `icon-glyphs.ts` and is deliberately not restated here — #1290's
lesson, and this entry was corrected to it in #1293.)

WHY THIS BUMPS ENGINE AT ALL, stated because the immediately preceding release argued the opposite for
its own plugin-only change (0.45.0's #1279 entry: no `out/**` movement, so no bump). These strings are
SHIPPED PROSE in `apps/plugin/dist`, which `lint-us-english` already scans as a surface of this engine,
and they are the only channel a designer has for this failure. First cut off `b116d7b` and first stamped
0.46.0; the rest of that cluster then landed ahead of it — #1281/#1282 took 0.46.0, #1012 took 0.47.0 and
#1280 PR-B took 0.48.0 — so this rebases to 0.49.0 and closes the cluster. A plain integer collision, no
interaction with any of the three.

`CONTRACT_VERSION` stands at 9.4.0, and so does every byte under `out/**` except this file's own
generator stamp: no def moved, no projected component surface moved, and `lint-component-surface`
reports 0 def(s) moved against base. The whole diff is one plugin source file and its harness.

NOT SHARED WITH THE PASTE PATH, and that is a scope boundary rather than a judgment that the two should
differ. `nestMissAdvice` lives in `anatomy-figma.ts` precisely so the plugin and the emitted payload
cannot drift in wording, and the paste path has both of these swap sites too. This release enriches the
plugin's messages only — the surface the symptom came through — so the paste path keeps the bare
wording, filed as #1288 rather than left in a comment: the design question there is that the paste path
composes its advice at EMIT time and has no `root.findAll` to read the file state from.

0.48.0: the focus ring is BUILDABLE ALONE, which is what every host that nests it was waiting on
(#1280 PR-B). `focus-ring`'s one part binds a NOMINAL square side — `size: 'nominal-side'` →
`size.md.height`, one key driving both axes — so its two members acquire `bound.width` +
`bound.height` where they previously acquired nothing, and `figmaProperties.notStandalone` is deleted.

THE DEFECT WAS A DEADLOCK BETWEEN TWO CORRECT HALVES, which is why it survived two releases in plain
sight. A host reaches the ring through `nests: 'focus-ring'`, and a `nestTarget` resolves by NAME
against the designer's LIVE FILE — so the ring must be built and published before any host can nest
one. The standalone build was refused, correctly, because the members bound no extent and Figma
supplied a 100x100 default frame (#869). And the refusal's own remedy sentence said *"build it as part
of a host instead"*, naming a path that does not exist. So the loop closed on itself: build Button,
read `focusRing.nestTarget -> not in this file — build focus-ring FIRST`, open the picker, and the ring
is not offered. Neither half was wrong; together they made the ring unbuildable and therefore
un-nestable, and because an unresolved `nestTarget` builds NOTHING and returns null, every host built
silently without a ring. The owner's QA reported it as "the focus ring never appears on the button".

THE NUMBER IS NOMINAL AND LABELLED SO. A ring genuinely has no size of its own — nested, its extent is
its host's grown by the offset, written by the host's executor — so `nominal-side` exists only to make
the library artifact ring-shaped, and it is overwritten the moment the ring is nested. `size.md.height`
because the ring's commonest host is a control at that rung; any other rung would have been as
defensible, and none of them is a design decision.

A BINDING, NEVER AN AXIS, and the distinction is the whole trap. Since #795 a `size` AXIS would make
`planComponentName` write a `size=` segment into every member name, and `nestVariantMatch` requires a
host's coordinate to account for every axis a member name carries — so `{surface:'default'}` would
match nothing and all five hosts' nesting would break at once, invisibly. A `size` BINDING renames no
member. `variantAxes` stays `['surface']`, and the omission is now more load-bearing than before.

`lint-standalone-floor` arm B FORCED the deletion rather than the author remembering it, which is that
arm doing precisely what its header predicted — while predicting the wrong cause: it expected a SCHEMA
field (#740) to give the ring a size it could not express, and what actually arrived was a reason two
tiers from geometry. The converse asks whether the declaration is still TRUE, not whether the author's
story about how it might stop being true came about. Removing the declaration also removed arm B's only
corpus input, so the gate gains `ARM_CASES` — a four-row truth table over (sized, declared) checked
against the same predicates the walk runs, because an arm nothing can reach is this gate's own
`layoutMode` measurement one level up.

THE TOKEN LAYER DOES NOT MOVE — `size.md.height` was already emitted in every corpus brand and is not
touched — so the only change under `out/**` is this file's own generator stamp. The bump is demanded
from the other side, `lint-component-surface` arm B (#1252's case): one projected component surface
moves and no `out/` diff can see it. `CONTRACT_VERSION` stands at 9.4.0; no token name and no `$type`
moved, and `token-contract.ts --check` confirms that rather than this comment asserting it. Rebased past
#1281+#1282 (0.46.0) and #1012 (0.47.0) while this was in review, so it stamps 0.48.0 rather than the
0.46.0 it was first cut as — a plain integer collision, no interaction with either change.

ONE THING THIS RELEASE CANNOT PROVE, recorded because no gate here can reach it: an INSTANCE inherits
its main component's bindings, and the executor's measured note says `resize()` CLEARS every dimension
binding — so the nominal side should not survive onto a nested ring, which the host resizes. Both of
those were measured on bindings the executor SET, never on one INHERITED through an instance, and no
shim can tell the difference. If a nested ring is ever found sitting at the md control height instead
of its host's box, that is this binding surviving the resize, and the fix is in the host executor. The
real-host check that settles it is #1290; the risk is stated for a reader here, in the `nominal-side`
comment in `components/focus-ring.ts`, and in the `docs/00-progress.md` entry for this change.

0.47.0: `icon` materializes as SEPARATE slash-grouped components, and a 40th glyph joins the set
(#1012). Two moves, one MINOR. (1) The projected component SURFACE grows: `icon` gains a 40th member,
`FPO-default-icon` — a "for placement only" lettered disc, a real nameable `icon/FPO-default-icon`
inside the vocabulary rather than a fallback outside it — so the surface baseline moves 39 → 40 and
`lint-component-surface --accept` restamps it (which is why the bump is owed and the gate refuses the
accept until it is made). (2) `figmaProperties.emitAsComponents` lets a def materialize as separate
top-level `<id>/<glyph>` COMPONENTs instead of one COMPONENT_SET — Figma folds the slash into an
assets-panel folder, which is the delivery an icon library wants and a variant set is not. That flag is
read by the plugin at write time and never enters the plan, so it moves NO plan stamp: the 40-member
count is the only thing that moves the surface digest, and the projected members themselves are
byte-identical to what a set would have combined. The token layer does not move — no `out/**` diff but
the generator stamp — so this is an ENGINE bump the `out/` diff cannot fully see, demanded from the
projected-surface side (#1252's case). JIT-rebased past #1281+#1282, which took 0.46.0 while this was in
review, so this is 0.47.0 rather than the 0.46.0 it was first stamped — a plain integer collision, no
interaction between the two changes.

A NEW PIPELINE CAPABILITY rode in with the glyph and is worth recording because it is reusable: the FPO
disc knocks its "FPO" letters out with `fill-rule="evenodd"`, which nonzero winding fills back solid.
The glyph pipeline carried no winding rule (`emit-icons.ts` extracted only the `d`, `glyphDocument`
emitted `<path d fill="currentColor">`), so the placeholder forced the gap open: sources may now
declare `fill-rule`, `icon-glyphs.ts` carries the non-default ones in a sparse `ICON_FILL_RULES`, and
`glyphDocument` writes the attribute — gated by a round-trip test, and inert (byte-identical) for every
glyph that needs no rule.

`CONTRACT_VERSION` STANDS at 9.4.0, and the reason is worth stating because a first reading (and this
issue's own plan) expected it to move: adding `FPO-default-icon` grows the `icon.name` VALUE vocabulary,
but `CONTRACT_VERSION` governs the guaranteed TOKEN-NAME surface — the color/dimension paths every brand
emits — and a glyph name is not a token path. `token-contract.ts --check` confirms it: the guaranteed
set is byte-identical (577 → 577), so the token contract did not move. The gate is even stricter than
that permits — a `none`-level `--accept` refuses to stamp a raised `CONTRACT_VERSION` — so 9.5.0 could
not be recorded without inventing a token-path change that does not exist. The vocabulary growth is
carried where it belongs: the projected component-surface baseline (39 → 40, ENGINE-gated) and the
`icon.name` component-API contract that `docs/30` and `icon-set.ts` describe, neither of which is the
token-name contract this const versions. The baseline's informational `engineVersion` stamp is
refreshed by `--accept` to track the ENGINE bump above, at contract 9.4.0 unchanged.

0.46.0: interactive states move TWO genome rungs each, and the outline ink tracks its border at
every state (#1281 + #1282). Both are one change to how a control expresses engagement, which is
why they ship together: the deeper interval is what makes the ink's tracking visible, and the ink
tracking is what stops the deeper interval reading as a border that moved on its own.

#1281 — THE INTERVAL. `stateRungs` replaces four copies of `st === 'hover' ? 1 : 2` (page fill,
page ink, and the inverse-band twins of both) with one rule: hover is `STATE_RUNGS` past rest,
pressed twice that, and `STATE_RUNGS` is 2. On a ~20-rung genome 50 apart, one rung moved nb's
primary 550 → 600 → 650 — a change a designer has to hunt for, and one that vanishes on a brand
whose ramp is flat through the mid range. Two rungs reads 550 → 650 → 750. Expressed as RUNGS
rather than values, because the interval is what a genome promises and a per-value table would be
the rule written once per brand and wrong for the next one.

#1282 — THE COUPLING. `outline.{label,icon}.{hover,pressed}` are bound. #576 made the outline EDGE
stateful and left the ink pinned to `.rest`, so the border moved and the text it surrounds did not.
The roles existed the whole time — `iText` has emitted `text.{rest,hover,pressed}` since #576, and
`iBorder` consumes those very candidates — so the border was tracking an ink the component then
declined to bind. Three keys, no derivation change, and "the edge matches its label" now holds at
every state rather than only at rest.

PRESSED IS UNGATED FOR CONTRAST, and this is an OWNER DECISION taken on measured numbers rather
than a derivation. At four rungs the one rest-derived `on-fill` ink loses its now-lighter pressed
fill in dark mode: harbor/primary 2.62, wendys/primary 2.54, wendys/destructive 2.41 against the 3
bar, plus hot-yellow/hc-dark's subtle fill at 5.77 against HC's 7. Put to the owner with those
numbers and decided: what a pressed state owes is DISTINCTION FROM REST, not legibility in its own
right. The alternatives were a smaller interval (the thing #1281 exists to fix) or a stateful
`on-fill` family (rejected long before this, for flipping the label's colour mid-press). Declared
as `min: 0` at both sites, so the ratio is still computed and published and a reader sees a
contract that says "not gated here" — never a red cell indistinguishable from a regression. The
preview's ungated set is ENUMERATED and checked both ways, because a floor zeroed by accident
passes forever.

SYSTEM-WIDE, confirmed with the owner rather than assumed: the interval lives on
`color.interactive.*`, so every consumer of that family moves with it — `icon-button` as well as
the three buttons. That is the intent (a state rule is a property of the family, not of one
component), and there is no per-consumer mechanism at the token tier that could scope it anyway.

VALUES ONLY: no token NAME and no `$type` moves — `text.{hover,pressed}` and
`border.{hover,pressed}` have been emitted since #576 and #1282 only BINDS them — so
`CONTRACT_VERSION` stands at 9.4.0 and `token-contract.ts --check` confirms it. Emitted colour
moves in every brand and mode, and the button family's projected surface moves with the four new
bindings (`lint-component-surface --accept`).

0.45.0: the three MEASURED selection controls paste their borders at 2px (#1228). `checkbox`,
`radio` and `switch` bind `border-width.thick` through the `strokeWidth` field 0.44.0 added, on the
one bordered part each has — the box, the disc, the track. Prism 2 ships all three at
`strokeWeight: 2` / `strokeAlign: INSIDE`; without a thickness to bind they pasted at the executors'
1px, which for the switch was the whole 1.4.11 argument drawn at half weight (the off track's border
is the ONLY thing distinguishing it from the page — no fill in the tier clears 3:1 at any brand).

A FLAT 2px, one value at every rung, and that is the owner's call over this issue's own caution that
Prism 2's 2px is a ratio on a ladder we do not share. The outline BUTTONS carry a `border` slot too
and stay at 1px, and that is Prism 2's figure as well (owner-confirmed; the checked-in
`reference/Prism2/component-specs/` holds no button spec, which is why the controls' 2 can be cited to
a file and the buttons' 1 cannot). So 2px is a CONTROL figure rather than a house border weight, the
two defs' different answers are both faithful, and the scope is now asserted from the button side in
the plugin suite — an "every bordered part gets 2px" sweep fails by name instead of shipping.

`strokeWidth: null` on the SELECTED variant needed no per-variant mechanism, which is #1011 paying
off: those coordinates bind no border slot at all, so there is no stroke to thin. That is also what
made the executors' LAST ungated stroke site reachable. `claimDefaults` runs AFTER the bind loop and
its unstroked branch wrote `strokeWeight = 1` flat — invisible until a part bound a thickness at a
coordinate with no border paint, which is exactly what these three do at `checked`/`indeterminate`
and `on`. Live, that literal UNBINDS the variable and reports no miss, so the build would have looked
clean and shipped 1px. It is now gated on the plan's bindings, the corner idiom one branch earlier.

THE TOKEN LAYER DOES NOT MOVE — `border-width.thick` was already emitted at 2px in all four corpus
brands, aliased to `<root>.core.dimension.2` — so the only change under `out/**` is this file's own
generator stamp. The bump is demanded from the other side, `lint-component-surface` arm B (#1252's
case): three projected component surfaces move, and no `out/` diff can see it. `CONTRACT_VERSION`
stands at 9.4.0; no token name and no `$type` moved, and `token-contract.ts --check` confirms that
rather than this comment asserting it.

0.44.0: the focus ring pastes at its brand's own stroke weight (#1266). `PartDef` gains
`strokeWidth`, a token key bound onto a `box` part's `strokeWeight`, and `focus-ring`'s one part
binds it to `focus.ring.width`. Before this, no def could express a stroke's THICKNESS at all: a
part could name the paint on its edge (`paintSlots`, #933) and nothing else, so both executors fell
through to `if (!node.strokeWeight) node.strokeWeight = 1` and every ring pasted at 1px in all four
corpus brands — each of which emits `focus.ring.width: 2`.

THE VISIBLE HALF IS THE GAP, NOT THE THICKNESS, and that is why this is worth a version rather than a
footnote. A Figma stroke is drawn INWARD from the node's bounds, which is why #801 has every host site
its ring part at `-(offset + ring-width)` = -4 rather than at -2. That arithmetic assumed the 2px it
was compensating for; against a 1px ring it over-compensated, so the background sliver WCAG 1.4.11
requires measured 3px where 2px was designed, and the indicator itself was half its declared
thickness. Both executors now write the 1px default only when nothing bound the property — gated on
the list of bindings that RESOLVED, not on the plan, because an unresolved name still needs a
fallback or the stroke paints nothing at all. Gating it on the presence of a literal would be worse
than the bug: live, writing `node.strokeWeight = 1` after `setBoundVariable('strokeWeight', v)`
UNBINDS the variable, so a build doing both would report clean and ship the old ring.

THE TOKEN LAYER DOES NOT MOVE, and the bump is demanded from the other side. The ring is built at
plugin/paste time, and `focus.ring.width` was already emitted, resolved and guaranteed — so the only
change under `out/**` is this file's own `$extensions.generator.version` stamp, one line per tree,
which every bump produces and which is therefore evidence of nothing. What ACTUALLY requires the bump
is `lint-component-surface`'s arm B (#1252): `focus-ring`'s `planStamp` moves because its members now
carry `bound.strokeWeight`. Three Button stamps move too and NOT for that reason — the projected field
is written only where a part declares `strokeWidth`, which no Button part does, and stripping every
`bound.strokeWeight` out of Button's plans leaves its digest bit-identical. What moves them is one
`codeOnly` STRING whose old text ("`PartDef` still has no stroke field", "the projected members are
strokeless") this change falsifies; `codeOnly` rides on the plan by design and `planStamp` hashes the
plan wholesale. Restoring that one string returns all three to main's committed digests exactly, which
is how the split was established rather than assumed (see `docs/00-progress.md`). No token name,
`$type` or value moves, so `CONTRACT_VERSION` stands at 9.4.0 with `--check` confirming it.

VERSION NOTE: takes 0.44.0, one past main, for the reason 0.42.0's own note states — every lower
minor is occupied (0.40.0 #1248, 0.41.0 #1257, 0.42.0 #1226 PR-A, 0.43.0 #1015) and a re-stamp goes
FORWARD to the next free minor rather than backwards into a number a merged commit already carries
(#1271). THIRD stamp on this branch: 0.41.0 was correct when written, 0.43.0 was correct when written
one rebase later, and each collided with a version PR that landed while this one was in review. That
the number moved twice without the diff moving is the argument for keeping the stamp out of the prose
that reasons about it — everything above this note is unchanged across all three.

0.43.0: the CONTROL CORNER, clamped to its own box (#1015). Three writers move together. `scale.ts`
gains `controlRadius(edge, radiusSm) = min(radiusSm, snap2(edge ÷ 8))`; `tree.ts` emits it as a sixth
field beside the `height` it is derived from (`control.size.<rung>.radius`), with a per-mode override
wherever either input moves; `emit-figma-dims.ts` adds it to the AUTHORED field list, because a corner
bound to a variable a client's file does not carry renders unbound. Checkbox's def repoints from
`radius.sm` to the per-rung key.

A VALUE MOVES, on one brand, and that is the whole reason this bump is a MINOR rather than a stamp:
aurora's built checkbox corner goes 4px → 2px at all three rungs. Four of five brands are BYTE-IDENTICAL,
and `min` is what buys that — a bare ⅛ ratio would round nb's 24px `large` corner UP from 2 to 4 and
move four brands to fix one. So the clamp direction is load-bearing, not defensive.

What was wrong before is not the value but the RUNG-BLINDNESS: `radius.sm` is a rung on the card ramp,
so one token served three box sizes, and aurora's 4px landed on a 12px `small` square — a third of its
edge, where the same token is a fourteenth of a card's corner. Prism 2's own controls sit near ⅛ of
their edge, which is where the ratio comes from. NOT fully reached, stated because the target and the
mechanism disagree: aurora's `small` lands at 0.167 rather than 0.125, because on a 12px edge the ratio
and the 2px radius sub-grid cannot both hold, and the sub-grid wins (a 1.5px corner is not a corner).

`CONTRACT_VERSION` moves too — to 9.4.0, for the three ADDED names, not for the moved value. See there
for why the value move is invisible to the contract, which is the cleanest example of the split in
this file. Takes 0.43.0 provisionally; re-stamps forward on the just-in-time rebase before merge if a
concurrent version PR lands first (#1271).

0.42.0: the IN-FLOW `nest` mechanism (#1226 PR-A). The projector generalizes `nest-fixed` + `follow`
from the out-of-flow `absolute` case (a focus ring) to a new in-flow `nest` PartKind — a part that
materializes as an instance of another component AND takes a cell (a Checkbox.Row's control, C/D/E in
the sequence). Same `NESTED_INSTANCE`, `nestVariantMatch` and `createInstance`; the only new projection
is that a `nest` carries no `absoluteInset`, so it stays a flow child. Plus two gates (`lint-nesting`:
nest-resolves + acyclic) and a build-order runtime miss that NAMES the target to build first. NO def uses
`nest` yet (its consumers are PR C/D/E), so NO emitted TOKEN artifact moves — `regen --check` is
byte-identical except this stamp, and `lint-emission-version` reports 0 artifacts moved. The bump is for
the BEHAVIOR change a consumer sees (a new projectable kind, and the reworded runtime miss that ships in
`apps/plugin/dist`) — principle 5's "any behaviour change", the same reasoning #872's 0.36.0 gives for a
component projection not committed under `out/`. NOT decided by a gate: `lint-component-surface` is
one-directional (a moved surface OWES a bump, never the converse) and this moves no surface, and
`lint-emission-version` prints "the version moved with no emission change, which is legal". CONTRACT stands
at 9.3.0 — `nest` adds no token name (`--check` confirms). Takes 0.42.0 on the just-in-time rebase before
merge: every lower minor is occupied — 0.39.0 (#1018), 0.40.0 (#1248), 0.41.0 (#1257) — so it re-stamps
FORWARD to the next free minor past main rather than merging backwards (#1271). Third re-stamp on this
branch as concurrent version PRs landed first; the fix for the churn is to merge it, not to renumber again.

0.41.0: an OVERLAY LEAF'S PROVENANCE describes its own value (#1257). Two writers move together.
`tree.ts`'s colour mode entry gains `aliasOf: rr.path`, mirroring the `aliasLeaf(lr.path, …)` one
tier up — a value and the name it resolves through are one fact, and every other field in that
entry was already per-mode. `emit-dtcg-overlay.ts` then merges the mode entry INTO
`$extensions.prism3`, replacing the base's per-mode fields, instead of spreading it over the leaf.

WHAT WAS WRONG, and it is a filing error rather than an arithmetic one. The projector built a
mode's leaf as `{ ...projectLeaf(n), ...m, $value: m.$value }`. A mode entry's fields are
`contrast`/`against`/`min`, which on a leaf live UNDER `$extensions.prism3` — so the spread put the
mode's CORRECT rating outside `$extensions` as a stray sibling of `$type` that no consumer reads,
and left the BASE mode's `aliasOf` and `contrast` under `$extensions` beside a value they do not
describe. Measured on the parent commit: **2369 aliased colour leaves across all twelve overlays,
every single one**, naming a path its own `$value` does not resolve to — `{…palette.white}` beside
`aliasOf: …palette.neutral.050` — and 2057 carrying a stale contrast. The right numbers were
present the whole time, 163/163 correct in `nb.hc-light`, one level too shallow.

VALUES AND PROVENANCE ONLY: no token NAME and no `$type` moves, so `CONTRACT_VERSION` stands at
9.3.0 and `token-contract.ts --check` confirms it. The projected COMPONENT surface does not move
either — `lint-component-surface.ts` reports 0 defs, which is the expected answer for a change in
the token trees and worth having asked rather than assumed. What moves is every overlay artifact
and the canonical trees' mode entries, which is why this is a MINOR: a consumer reading a projected
overlay standalone — the exact use those files exist for — was being handed provenance for a
different mode's value.

`MODE_SCOPED` in `emit-dtcg-overlay.ts` is the authored list of fields a mode entry supersedes, and
the rule it encodes is that a mode's SILENCE about one of them is a claim rather than an
inheritance. `min` is the case that forces it: a role gated at 4.5 in light and ungated in
`hc-light` emits no `min` there, and carrying the base's forward would print a floor the mode does
not promise.

VERSION NOTE: takes 0.41.0 because 0.40.0 is spent. This branch was stamped 0.40.0 while #1261
(#1248, the weight axis) was in flight claiming the same number, with the collision recorded here
rather than guessed around. #1261 landed first, so this re-stamped on its rebase — the outcome the
note predicted, kept in place of the prediction so that the number having moved reads as the
expected resolution rather than as a mis-stamp.

0.40.0: a binding key resolves from the member's WHOLE COORDINATE, and `weight` joins the axis-name
vocabulary (#1248, completing #872's third control). Two changes, and they ship together because
either alone is inert: the axis has nothing to vary without the resolver, and the resolver has
nothing to resolve without the axis.

THE RESOLVER. `anatomy-figma.ts` filled a `type` or geometry binding key by substituting `{size}`
and nothing else — `expandKey(key, [size])`, at two call sites. Nothing had decided that; it is the
axis the first templated key happened to need, and every later def inherited the limit as if it
were a rule. Both sites now fill from `paintCoord`, the same map `fillPaintKey` reads, through one
`fillKey` primitive. Behaviour-preserving on the corpus as it stood — measured, not assumed: the
resolver change alone regenerated every artifact byte-identically and left the suite at 2823
passing, which is what made it safe to land the axis in the same PR.

THE AXIS. `weight` (`regular | bold`) is the twelfth name in `VARIANT_AXES`, and the first added
since #756 closed the list. `field-label` declares it and binds the full 3 x 2 grid onto
`type.body.{sm,md,lg}.{default,strong}`. Values are Prism 2's own words rather than the type-role
names they resolve to, and the role each maps to is measured against `reference/Prism2/component-
specs/form-label.json` rather than matched by name: `bold` -> `.strong` = `weight-role.strong` =
700 = Inter's Bold, which is the `fontStyle` Prism 2's Bold variants set. `.emphasis` (600) is the
nearer-looking role and the wrong one.

THE PROJECTED SURFACE DOUBLES, which is the compatibility-relevant part and why this is a MINOR.
`field-label`'s Figma set goes 12 -> 24 members and its paint grid 36 -> 72 coordinates; the census
baseline records both. Its code API gains a `weight` prop.

NO TOKEN NAME OR VALUE MOVES, and `CONTRACT_VERSION` stands at 9.3.0 with `--check` confirming it
rather than this comment asserting it. Worth stating precisely, because "an axis was added" sounds
like a surface change and is not one here: the three `type.body.*.strong` roles the new axis binds
were ALREADY emitted and already guaranteed (574 names before, 574 after). A component binding is a
REFERENCE to a token name, not a token name — the contract versions the latter.
0.39.0: PER-MEMBER text defaults (#1018). `figmaProperties.texts.<prop>` gains an optional
`byVariant: { <axis>: { <value>: string } }` — the per-coordinate placeholder a set member renders,
with `default` staying the fallback for any coordinate it does not name. A component set carried ONE
text default for the whole set, so `field-message`'s error / warning / success members rendered the
`tone=default` helper copy ("Use 8+ characters") — a validation-message set shipping helper text on its
error member, the opposite of the errorPattern rule the def exists to make unavoidable. The projector
(`anatomy-figma.ts`) now resolves the placeholder against the member's coordinate (mirroring `positionOf`);
`figmaPropertyErrors` rejects a `byVariant` key naming an axis or value the set does not enumerate (#1018).
`field-message` is the only def that uses it — its error/warning/success members now carry their own copy;
`tone=default` keeps "Use 8+ characters" (the labelPattern example the def deliberately chose). VALUES-only
in the token layer: a placeholder is not a token, so no token name or `$type` moves and `CONTRACT_VERSION`
stands at 9.3.0 (`token-contract.ts --check` confirms). The ENGINE bump is for BEHAVIOR a consumer sees —
`field-message`'s error/warning/success members render different `characters`, which also moves that def's
`planStamp` in `schema/component-surface.json` (#1259's gate, `--accept` restamps it; `field-message` is
the only def whose stamp moves). Takes 0.39.0 — 0.36.0/0.37.0/0.38.0 are spent (#872, #1244, #1211/#1249),
rebased over the component-surface gate landing on main.

0.38.0: every projected ICON MEMBER carries an ink (#1211). `icon`'s `paintKeys` gains a second,
SLOT-keyed entry — `['tone.{tone}', '{slot}']` — bound to `color.icon.primary`, so a coordinate that
names no tone resolves the primary icon role instead of resolving nothing. `paintOf` walks the list in
declaration order, so a named tone still wins at every one of the eight; what changes is the case that
was never rendered when the old shape was written.

MEASURED, and the measurement is the whole reason this is a defect rather than a design: `variantAxes`
is `['name']` alone, so NO member of the 39-member set carries a `tone` coordinate, `tone.{tone}` is
unfillable at every one of them, and all 39 shipped with no fill bound. The def's own comments called
that "the correct projection of `currentColor`, not a dropped binding". It is neither — Figma has no
`currentColor`, so it resolves the literal in the glyph document to BLACK, and the set shipped 39
unbound black glyphs. That prose predates any rendered default icon and was wrong on contact with the
output; it is reversed in `components/icon.ts` rather than left standing beside the fix.

ONE HALF OF THE OLD ARGUMENT SURVIVES AND SHAPES THE FIX. There is no token whose value is "inherit",
so `tone.inherit` still binds nothing and the floor is keyed on the SLOT instead — it is not a ninth
tone, it is what `paintOf('icon')` finds after the tone template fails to fill. `test.ts` pins both
halves in one place, because splitting them lets either be "fixed" back into the other.

VALUES-only in the token layer: no token name and no `$type` moves, and `color.icon.primary` was
already emitted and already bound by `tone.primary`. So `CONTRACT_VERSION` stands at 9.3.0 and
`token-contract.ts --check` confirms it rather than this comment asserting it. A MINOR rather than a
PATCH for the reason 0.6.0 and 0.7.0 were: the emitted projection changes observably — 39 members gain
a bound `descendantFills`, and `schema/paint-census.json` records the move.

WHAT THIS DELIBERATELY DOES NOT DO. The set stays ONE `ComponentDef` projecting a 39-member
COMPONENT_SET (`variantAxes: ['name']`) — 39 separate components need a projector singleton mode
`figmaAnatomySet` does not have (it throws on a member with no variant coordinate, #795/#802) and
`applyComponentPlan` unconditionally combines, so that reshape is #1226's. And the 16/20/24 size
ladder is untouched: `ICON_SIZES` and every `size.*.icon` rung binding stand, because moving them
reverses #756's gated default-rung rule (#1206).

0.37.0: the inverse PRIMARY button takes a BRAND-colored label, auto-selected (#1244, refining #1208
and #1231). The inverse fill is unchanged — still the uniform neutral extreme #1231 decided — and only
`inverse.interactive.primary.on-fill` moves, from a neutral ink to the most vivid step of the brand
ramp that still clears 4.5:1 against that fill. `destructive` and `neutral` keep the neutral ink; each
has its own contrast story and is a separate decision (#1253, #1254).

THE RULE IS DIRECTION-INDEPENDENT, and that is the part worth reading twice. Scan the brand ramp from
the END THAT CONTRASTS LEAST with the fill and take the first step clearing the floor: the lightest
passing step on a near-white fill, the darkest passing step on a near-black one. Both are "the most
brand-vivid step that is still legible", which is the property the owner asked for. The literal
"lightest that passes" was measured first and rejected: on the near-black dark-mode fill it returns
step 025 at ~15:1 — a nearly white tint, i.e. what #1208 already shipped under another name. Landed
values are 550 in light and 400 in dark for nb / aurora / harbor alike, which is the near-identical
index the even-step palette predicts.

NO STEP PASSING is an honest failure rather than a silent neutral: the most extreme step is bound and
the mode contrast contract reports it. Substituting a neutral would hide the one thing a designer
needs to see about that brand.

HIGH CONTRAST IS EXEMPT: `hc-light` and `hc-dark` keep the max-extreme ink `onColor` already gives
them — pure black at 17.27:1 and pure white at 16.00:1 on nb — and only `base` and `dark` take the
brand step. The brand step measures ~4.6:1, so applying #1244 there was a 73% contrast drop in the
two modes that exist FOR low-vision users. #1244 is a decision about the DEFAULT appearance; it was
never a decision to relax the high-contrast one, and the two are not the same trade. It shipped for
review without this branch and the first gate ratified it, because a flat 4.5 floor passes at 4.62
and at 17.27 alike; `test.ts` now holds the HC modes to the extreme rather than to the floor.

WIREFRAME routes through `palOf`, so the greyscale contract still holds ("every wireframe alias routes
to palette/neutral/*") — caught by that gate on the first run, when the ink resolved to `accent/950`.

VALUES ONLY: no token name or `$type` moves, so `CONTRACT_VERSION` stands at 9.3.0 and
`token-contract.ts --check` confirms it. Emitted colour moves in every brand and mode.

0.36.0: `field-label` gains the two Prism 2 controls that use existing patterns (#872, and the
`field-label` half of #862). `size` goes to three rungs and TYPE follows it — `type.body.{sm,md,lg}
.default`, 14/16/18px at 150% line-height, which is Prism 2's form-label ladder exactly and the tier
#862 predicted (`type.label.*` is 12/14, emphasis-only, no `lg`). Ink follows a new `tone` axis onto
`color.text.{primary,secondary}` — semantic roles, never shades, so a brand retuning its text palette
carries this without the def moving. The default size still resolves to the `md` rung, which
`lint-rung-names` (#756 arm 3) checks corpus-wide and `test.ts` now also pins at the def.

NOTHING SHARED MOVED, and that is the scope rather than luck. `tone` was already in `VARIANT_AXES`
and already the ink axis on `icon` and `field-message`, and the `type` template still names ONE
placeholder, so the projector's `{size}`-only expansion is untouched. Prism 2's third control — the
Regular/Bold weight — is NOT built: it needs a coordinate-driven `type` resolver and a new name in
#756's deliberately closed axis vocabulary, which are decisions rather than bindings. Filed as #1248
and routed to review before any code; this def binds `.default` (400, Prism 2's own default cell)
until that lands.

NO EMITTED TOKEN VALUE MOVES — `out/` changes only by this stamp, and `CONTRACT_VERSION` stands at
9.3.0 since no guaranteed name or `$type` moves (`--check` confirms). The bump is for BEHAVIOR a
consumer sees: `field-label`'s Figma set goes from 4 members to 12, its code API gains a prop, and
every rung's type role changes tier. `lint-emission-version` reports 0 artifacts moved and is right —
component payloads are not committed under `out/`, so a gate watching regen artifacts cannot see a
component projection change. Its silence is a fact about its scope, not evidence behavior held still.

0.35.0: two button-QA colour-derivation corrections in `modes.ts`, both VALUES-only (no token name
or `$type` moves, so `CONTRACT_VERSION` stands at 9.3.0 — `token-contract.ts --check` confirms). Takes
0.35.0 because #997's switch-inset 0.34.0 (below) is spent. (1) #1208 — the inverse FILLED fill is now
a uniform neutral near-white (light) / near-black (dark) for every interactive family, where it used to
be a light step of the family's own palette (primary → brand.100, destructive → danger.100); family
identity on a dark band is carried by the outline/text ink and the on-fill ink, not by tinting the
filled surface. (2) #576 — the neutral outline BORDER now follows its text ink like every colour family
(near-black on the page, white on the inverse band), retiring the special-case mid-gray edge; reads
deliberately LOUDER, contrast-safe by construction (the ink cleared the stricter text bar). Every mode's
contrast contract re-verified — no floor drops.

0.34.0: the switch thumb's CLEARANCE from its track's ends (#997). `control.size.{rung}` gains an
`inset` leaf — `(height - dot) / 2`, so 3/4/5/6/7 across `CONTROL_RUNGS` — and `switch`'s track binds
it as uniform padding. Before this the thumb sat FLUSH at both extremes: it is a flow child of a
fixed-size track distributed MIN/MAX by `positionWhen`, an alignment has no offset to give, and the
space scale (4/8/12/...) carried nothing for `md`'s 5px to bind. `dot`'s argument exactly, one
consumer over — the arithmetic has nowhere downstream to happen, so the tier holds it.

DERIVED from `dot`, never a second ratio, and that is what makes a fifth tier field safe: the padded
inner box is exactly one thumb tall at every rung and density by construction, so the inset cannot
drift from the thumb it clears. `test.ts`'s membership pin moved from four fields to five, which is
that gate working rather than yielding — it fired on the first run of this change.

Prism 2 supplied the RELATIONSHIP and could not supply the number. `toggle-switch.json` sites its own
thumb with a uniform `padding: 4` on the TRACK — an equal inset on four sides, i.e. the thumb centred
— which is the construction adopted here. Its literal 4 is `height / 8` and follows from a 0.75 thumb
ratio where this tier's is 0.5; on this ladder that is 2.5px at `md`. So the shape transfers and the
value is re-derived, which is also why every rung stays an integer.

Emitted artifacts move in all four brands, and `core.dimension.5` is newly emitted: 3, 5 and 7 are on
neither the base-4 grid nor the space extras, so the inset px join the grid extras the way `dot`'s did
(#910) and the alias resolves rather than falling back to a literal. `CONTRACT_VERSION` moves to 9.3.0
— four paths added, none removed or retyped — derived from `token-contract.ts --check` rather than
asserted here.

0.33.0: the selection-control LINE-BOX (#1201, building the fix #1009 filed). Follows #1216's 0.32.0
(the 36/44/56 size-ladder move, below) — 0.32.0 is spent, so this takes 0.33.0. `control.size.{rung}`
gains a `line-box` leaf — the baked height of one line of the `body.{rung}` label (`fontSize ×
lineHeight`, per rung). checkbox / radio / switch wrap their control in a box exactly that tall and
centre it within, while the control+label ROW stays top-aligned, so the control tracks the FIRST line
of a wrapping label instead of floating mid-paragraph — the construction #1009 wanted and could not
build, because a line-box is a ratio × a size and Figma variables cannot multiply, but the PRODUCT is
a fixed px a variable holds. ADDS three guaranteed paths (`control.size.{sm,md,lg}.line-box`), so
`CONTRACT_VERSION` moves 9.1.0 → 9.2.0 (MINOR, additive, from main's 9.1.0). No existing token name or
value moves; the anatomy restructure adds a wrapper node to three defs and changes no emitted colour
or dimension. (#1201)

0.32.0: the shared component-size ladder moves to Prism 2's 36/44/56 for small/medium/large at the
default density (#1207). A pure VALUE move — every path and every `$type` is where it was, so
`CONTRACT_VERSION` stands and `token-contract.ts --check` says so rather than this comment. Minor
rather than patch for the reason 0.6.0 and 0.7.0 were: a consumer resolving `size.md.height` gets a
different number, across all four brands and six component defs.

The defect was that the DEFAULT control sat under WCAG 2.2 SC 2.5.5 (AAA, 44px): 40px on aurora,
the brand the studio boots. `AAA_TARGET_PX` is now asserted against that one rung — the default
density's `md` — and deliberately not against the others, since `compact` exists so a brand can go
tighter on purpose and a sweep would either fail or force `density` to stop meaning anything.

`SIZE_RUNGS.h` (a spaceBase multiple) became `SIZE_RUNGS.px`, because 36 and 44 are 4.5x and 5.5x
of 8 and are not on the space scale at all — the old field's stated contract could not survive the
decided values. The emitted leaf has always aliased the `dimension` grid, so the px ladder states
what the output already was. Heights no longer scale with `spaceBase`; unreachable, since
`SPACE_BASE` is locked at 8 and `brandTheme` passes exactly that. Padding stays a multiple.

0.31.0: the `controlShape` FORM lever (#1163). A brand can now choose `rounded` (default) or `pill`
for its pill-able controls — today button and icon-button, tomorrow anything that declares a
`pill-radius` derivation. `pill` rebinds those controls' corner from `radius.md` to a new
`radius.capsule` rung (a 999px sentinel), which Figma clamps to height ÷ 2 at every size. `radius.capsule`
is a SECOND pill rung, kept distinct from `radius.round` (128px, the rung switch and radio bind
intrinsically): 128 stops being a full pill above a 256px control height, so a lever that promises an
unconditional pill needs a rung whose ceiling no real control reaches — and raising it must not touch the
intrinsic pills. It is a CORNER_RADIUS-scoped radius bound to a radius corner, off the 4px grid on purpose
(a sentinel, not a ladder step), so it emits as a literal. This ADDS one guaranteed path, `radius.capsule`,
which is why `CONTRACT_VERSION` moves 9.0.0 → 9.1.0 (MINOR, additive — see below); `rounded` still
reproduces every plan byte-identically. `switch`/`radio` carry no `pill-radius` derivation and so are
structurally outside the pill-able set — asserted in `test.ts` so the lever can never square them off. (#1163)

0.30.0: ONE COLOUR COLLECTION (#1148/#1150). The two-tier colour split ends. `color.surface` — the
pointer tier, one alias per non-inverse role — is DELETED, and the value tier is renamed from
`color.appearance` to `color`, taking the short names with it: `nbds/color/appearance/text/primary`
becomes `nbds/color/text/primary` and there is nothing left to alias into. 243 variables in one
collection with four appearance modes, where there were 243 + 130 in two. The artifact count goes
111 → 108: fifteen files leave (`color.appearance.<mode>.json` × 4 and `color.surface.json`, per
Figma brand) and twelve arrive (`color.<mode>.json` × 4 × 3).

WHAT THE COLLAPSE BUYS, and it is one thing said three ways. A designer picking a colour saw two
collections and had to know which; a role bound from the pointer tier could not vary by appearance
(that was the tier's whole limitation, and it is why every inverse role was excluded from it and had to
be bound by name); and the pointer tier shipped `ALL_SCOPES` on every row, so it offered every variable
everywhere Figma asks for a colour. One collection removes the choice, makes every role
appearance-responsive including the 113 inverse ones, and puts the value tier's real scopes in front of
the designer. #1013's argument for the split was appearance-INDEPENDENCE for consumers who want a fixed
colour; nothing shipped ever wanted one.

WHY THE VALUE TIER TAKES THE SHORT NAME RATHER THAN THE POINTER TIER KEEPING IT, and this is FORCED by
the Figma API rather than chosen: `Variable.variableCollectionId` is `readonly`, so a variable can never
be re-parented. Renaming the pointer collection onto `color` would strand the values and all four
appearance modes in a collection called `color.appearance` with nothing pointing at them. The migration
consequence for an existing file follows from the same fact — the old `color.surface` collection is
ORPHANED rather than removed, because there is no operation that folds it in. See `COLLECTION_RENAMES`.

#1150 RIDES ALONG BECAUSE IT IS THE SAME WRITE. Figma lists a collection in CREATION order, so the
order the emitter writes role families in is the order a designer reads down the panel. It is now stated
once, in `tree.ts`'s `COLOR_FAMILY_ORDER`, and drives BOTH the DTCG key order and the Figma write order
— verified by mutation (reorder the list, re-emit, both follow) rather than by reading the code. The
order is `background, foreground, text, icon, interactive, disabled, border, scrim, veil, field,
inverse`: ground, then what sits on it, then what responds, then the edge, then the washes, then the one
composite — and `inverse` LAST, since it re-states every family above and anywhere else splits each
family into two places on screen. A resolved family the list does not name is a THROW, not a silent
append. That the panel itself follows creation order is the owner's Figma check, not ours: the repo can
only measure the write order.

The name surface is `CONTRACT_VERSION` 9.0.0 below — 225 guaranteed paths removed, measured before the
bump was chosen.

0.29.0: ONE `inverse` GROUP (#1140). Every inverse colour role relocates to a single top-level
`inverse.` group — `color.appearance.background.inverse.primary` becomes
`color.appearance.inverse.background.primary`, `…text.on-inverse.primary` becomes
`…inverse.text.primary` — so the inverse form of any role is `inverse.` + the role, with nothing to
look up. 113 emitted paths move; `main` at 0.28.0 emits none under `appearance/inverse/` and this
emits 1,356 occurrences of it across the artifact set. The edge ladder also gains a third rung
(`border.tertiary`, `inverse.border.tertiary`, and the pointer row `color.border.tertiary` the surface
tier generates from the new non-inverse role) and drops `border.inverse.default`, which was
byte-identical to its `primary` twin. Reasoning in `docs/20` §9.9; the name surface is
`CONTRACT_VERSION` 8.0.0 below, which is the MAJOR this rename forces.

A MINOR rather than a PATCH by the ordinary rule — a consumer reading `out/**` sees 113 different
names — and the bump is recorded here rather than assumed, because IT WAS MISSED. #1141 shipped the
whole rename with this constant still reading 0.28.0, so every regenerated tree carried #1139's
generator stamp: an artifact set claiming to have been produced by code that could not have produced
it. Nothing caught it. The gates all compare the emission to ITSELF (`regen --check`) or to the
contract baseline, and no gate asserts that a moved emission moves `ENGINE_VERSION` — the one
assertion that would have. It was caught in review, by diffing the emitted paths against `main`.
Whether that earns a gate is a separate call and deliberately not made here; the shape of it is
awkward for the usual reason (`docs/34`), since the obvious implementation derives "did the emission
move" from the emission the same regen produces.

0.28.0: INVERSE GOES BACK TO A NAME (#1133). The `color.surface` pointer collection loses its second
mode: `default`/`inverse` becomes one `Default`, and the per-brand `color.surface.{default,inverse}.json`
pair becomes a single `color.surface.json`. Three brands × two files → three files, so the ARTIFACT
COUNT goes 114 → 111 and `verify.ts` / `ci.yml` are edited to match.

The revert, not a redesign. Mode-encoding shipped at 0.13.0 and it only pays if you flip EVERYTHING:
#1128 measured 112 of 128 rows changing value between the two modes, which is the number that makes a
mode look obviously right. The requirement is not a full-region flip — it is a BOUNDED set of inverse
atomic elements plus inverse variants of page-level blocks, and no surveyed system ships an inverse
mode or collection (Carbon, Material 3, Fluent and Atlassian all name it). A name expresses a bounded
set; a mode applies to every row in the collection or to none. Reasoning in `docs/20` §9.8.

THE APPEARANCE TIER AND ALL 113 OF ITS INVERSE LEAVES ARE UNTOUCHED, which is the whole point: those
are the values an inverse component variant binds, and `focus-ring` has been binding one by name since
0.9.0. So is the two-tier split (#1082/#1013), whose justification is appearance-INDEPENDENCE and never
mentioned inverse; so is the brand namespace (0.27.0) and the `core` fan-in. The collection KEEPS the
name `color.surface` — argued in `docs/20` §9.8, and the short version is that renaming it costs a
`COLLECTION_RENAMES` entry in exactly the machinery #1097 de-chained, with no era to tell the pre-#1082
`color` (a value tier) from the post-revert one (a pointer tier).

ONE ROW MORE, NOT FEWER: 128 → 129. `color.scrim.default` had been the coverage register's single
`omit` entry, kept out of the tier because nobody had decided what a scrim should do on an inverse
ground. There is no per-surface behaviour left for that to be undecided about, so it gets its pointer
and the short name comes back — see `CONTRACT_VERSION` 7.1.0, which is a MINOR for that one addition.
That also retires a #1013 DEPRECATIONS entry: `classify` only checks a `replacedBy` against the live
set, so an entry whose `path` is emitted AGAIN passes silently. Filed as its own gate gap.

The 0.26.0 entry below still describes the axis as `base-only` in `axes.ts` and the studio pill's
comment as citing `scrim.default`'s `omit` disposition. Both statements were true at 0.26.0 and are
false now, and neither is edited: a changelog entry records what shipped at a version, the same rule
`DEPRECATIONS` follows for its `path` field. The live state is here.

0.27.0: THE BRAND NAMESPACE ON EVERY FIGMA VARIABLE, and the DTCG `core` tier with it (#1097/#1102).
The widest rename the project has run — 671 / 711 / 730 distinct variable names for nb / aurora /
wendys, 2112 across the corpus. Three Figma-side changes land as ONE, because each would otherwise
cost its own migration and its own verification pass over the same names:

  (1) every emitted variable gains the BRAND ROOT as its first segment — `color/background/primary`
      becomes `nbds/color/background/primary` for nb and `prism/color/background/primary` for the two
      engine-native brands. `emit-figma-color.ts`'s `stripNs` is what took it off before this change.
  (2) the three `core-*` collections consolidate into ONE `core` collection holding `palette/*`,
      `dimension/*` and `font/*`. Three files still emit it — `core.palette.json`,
      `core.dimension.json`, `core.font.json` — each declaring `$collection: 'core'`, which makes this
      the first place in the engine where a file STEM is not a collection NAME.
  (3) the `color` collection is renamed `color.surface` (#1089), so both colour tiers name their axis
      in Figma's mode picker rather than one naming it and one not. The variables inside keep their
      `color/*` names, so this part moves no DTCG path.

And #1102 folds in the DTCG half of (2): `palette.*`, `dimension.*` and `font.*` move under a `core`
tier — `prism.palette.red.550` becomes `prism.core.palette.red.550`, 164 paths. NOT separable, because
a variable name tracks its DTCG path: landed after #1097 it would rename the same 164 variables a
second time, and as one change it is a single rule chain producing a single final name.

FIGMA STYLES ARE THE STATED EXCEPTION, and they keep the transform they already had: a text style is
`display/sm/strong` where its DTCG path is `prism.type.display.sm.strong`, dropping the root AND the
tier. So after this bump "a variable's name is its DTCG path with dots for slashes" is true, and the
same sentence about a STYLE is false. `docs/10` states it where the transform lives, because a reader
who generalises from variables to styles gets a name Figma does not have.

`font-fluid/*` deliberately does NOT go under `core`: it is a COMPUTED tier, not a primitive, and it
is emitted into `type-sets`. The materialization rule keys the tier on the name's own first segment
for exactly that reason — so a fourth primitive group is a one-word change, and `font-fluid` needs no
exception to stay outside.

EMITTED FILENAMES FOLLOW COLLECTION NAMES, so 15 artifacts are RENAMED rather than rewritten. The
artifact count is UNCHANGED at 114 because every one of the 15 is a rename — but `regen --check`'s
removal arm cannot see a file the engine stopped emitting (#1059), so run against a tree still
holding the old stems it reads 129. The stale copies are `git rm`-ed explicitly here, and 114 is
derived from the emitted set rather than read off what regen printed. That is #1082's lesson applied
a second time, and the reason it is worth writing down: the wrong number is the plausible one.

A minor rather than a major on the ENGINE version, for the same reason 0.26.0 was: `ENGINE_VERSION`
answers "what code produced this?" and makes no compatibility promise. The promise is the contract's,
and `CONTRACT_VERSION` takes the major (7.0.0 below).

THE NAMESPACE ITSELF CONTRIBUTES NOTHING TO THAT MAJOR, and (1) and (3) above contribute nothing to it
either. Measured both ways: 714 guaranteed paths on the merge base and 684 here, and in BOTH baselines
ZERO carry a brand-namespace root — the contract is "keyed below the configurable root" (its own note),
and the root added by (1) IS that root. (3) renames a COLLECTION, not a token, so its 128 variables keep
their `color/*` names. What takes the major is (2) and #957: 164 paths moving under `core.*`, and 30
paths demoted out of `guaranteed`. Recorded here because a bump credited to the namespace would be a
false provenance record no gate can catch — the version number is the same either way — and because
someone reading 7.0.0 as evidence that renaming a root breaks consumers would design around a cost that
does not exist. (#1097, #1102, #1089, #957)

0.26.0: THE TIER SWAP (#1013). The value tier moves to `color.appearance.*` and the surface alias
tier takes the short name `color.*`, in BOTH formats — the Figma `color` collection is renamed
`color.appearance` and its 242 variables with it, the `surface` collection is renamed `color` and
its 128 variables with it, and the DTCG tree gains a `color.appearance` level under which every
former `color.<role>` leaf now sits. Emitted Figma FILENAMES follow the collection, so six files
per brand cease to exist (`color.{light,dark,hc-light,hc-dark}.json`,
`surface.{default,inverse}.json`) and six take their place; they are deleted explicitly in this
change because `regen --check`'s removal arm cannot see them (#1059).

`CONTRACT_VERSION` goes to 6.0.0 in the same breath — 114 guaranteed paths are removed and 242
added, and a removal is a MAJOR. The two versions move together here for once, and for genuinely
different reasons: the contract moved because names moved, the engine moved because the ARTIFACT
SET moved. No colour value changes anywhere in the corpus — every emitted paint is byte-identical
to 0.25.0 under a different name, and the second mode on the alias tier is a pointer to a name
that already existed. This is the mirror of the case the split usually illustrates, and the same
mirror 0.8.0 was: names move, values do not.

A minor rather than a major on the ENGINE version even though the artifact set changed, because
`ENGINE_VERSION` answers "what code produced this?" and is not a compatibility promise — the
promise is `CONTRACT_VERSION`, and it took the major.

TWO DOWNSTREAM CLAIMS THE SWAP FALSIFIED, both fixed here rather than filed, because each is a
shipped or gated surface asserting something about the names that moved:
  · `tools/exporter-comparison/axes.ts` declared the surface axis `absent` from the DTCG projection,
    which was true only while the value tier held the short name — a pointer tier and its targets
    under one name have nothing to project separately. It is `base-only` now: the `default` member
    pairs path-for-path, `inverse` still has no overlay (#1027). The naive fix — swapping the key and
    leaving the kind — drops every `color.appearance.*` path as well, because the drop is keyed on a
    path's FIRST SEGMENT and `color` now prefixes `color.appearance.*`. Measured: 1074 unpaired
    across three brands, reported as agreement. That trap is written at `absentFromProjection`.
  · the studio printed `color.<role>` on every colour pill, so 114 of them named a path that stops
    resolving. `colorPath` picks the tier from `surfaceRows` — the derivation both materialisations
    read — rather than pattern-matching `inverse`, which misses `scrim.default`.

0.25.0: the media veil — `color.veil.{dark,light}.{large,body,enhanced}`, six roles a designer picks
from when laying text over a photograph (see `CONTRACT_VERSION` 5.4.0 below). Additive; no existing
value or name moves.

The engine's first APPEARANCE-INVARIANT colour family, and that is a consequence rather than a
choice: the derivation's ground is the worst pixel of an unknown image — sRGB white under a dark
veil, sRGB black under a light one — which is a constant, so no theme input reaches it and no mode
can move the result. Both polarities are therefore live in every mode, because a photograph has no
polarity the theme can read.

Each rung is the LEAST emitted alpha step clearing its WCAG floor at that worst pixel (3 / 4.5 / 7),
which puts the light polarity a step below the dark one at every rung — sRGB gamma lets a white wash
lift a black pixel faster than a black wash drops a white one. Prism2's 40/60/80 is deliberately NOT
inherited: measured, its weakest dark step buys 2.85:1, below even the 3:1 large-text floor, so the
reference ladder would ship a token whose purpose is contrast for text and which buys none for any
text.

Two downstream counts move with it, both additive, and named here because 0.13.0 below states the old
one: the `surface` Figma collection goes 122 → 128 rows, and its self-aliased register 10 → 16, since
an inverse band does not change a photograph and so the same token is genuinely right in both modes
(`inverse-coverage.ts`, `alias: 'self'`). (#1030)

0.24.0: every projected TEXT node now CLAIMS its vertical alignment (#1009 half 2). A new
`FigmaNodePlan.textAlignVertical`, defaulted to `CENTER` by the projector and overridable per part via
`PartDef.verticalAlign`; both executors write it, and `anatomyErrors` refuses it on any kind but
`text` because Figma throws on that write.

**It moves nothing anyone can see, and that is why it is safe to introduce as a default rather than a
required field.** Measured over every projected member: **774 TEXT nodes, ZERO with a bound height**,
and a hugging text node's box IS its content — so `TOP` and `CENTER` land the glyphs in identical
pixels. The value of the change is that the property stops being a SILENCE. #865's operation is
*neutralise what we did not claim*, and its neutral value here is `TOP`, already Figma's default, so
clearing would have been a no-op; #1009 wanted the opposite operation, a claim, and the two are not
interchangeable. A minor rather than a patch because the emitted plan gains a field.

A note for whoever reads this next expecting the QA symptom to be gone: it is not. #1009 arrived as one
observation and is TWO properties on two different nodes. Half 1 — a control top-aligning against its
label — lives on the PARENT frame and is not fixed here. It is measured (a `medium` checkbox binds a
16px control against a 24px line box, so the box centre sits 4px high) and it is GUARDED, because the
obvious repair is wrong: blanket-centring the row floats the control mid-paragraph on a label that
wraps, and the Prism2 reference is explicit that the box tracks the FIRST LINE. The exact repair wants
a control frame the height of the line box, and line-height is a RATIO token against a rem font size —
Figma variables do not multiply, so no px line-height variable exists to bind one to.

0.23.0 IS TAKEN BY #1021 (field-message glyphs), merged first — hence 0.24.0 rather than a second
0.23.0 entry the later merge would have to reconcile. (#1009)
0.23.0: a validation tone draws its own glyph, and a def can declare that its box legitimately moves
(#1010, field-message). Three `presentWhen`-gated `vector` parts replace one `kind: 'slot'` part whose
INSTANCE_SWAP property nominated a placeholder — the 39-glyph set had landed in #920 and this def bound
none of it. `FigmaProperties.footprintVaries` is the second half and the reusable one.

WHY THE SECOND HALF WAS NEEDED, because a value change would not normally reach the grammar. The
footprint cohort (`planSetLayout`) exempts `size` and slot fill from "swapping a variant must not resize
the member", which describes Button: the two axes that legitimately change its box. `presentWhen` (#910)
then added a third way for a variant to change what nodes exist, and nothing revisited the key — because
`checkbox` and `radio` gate a mark INSIDE a size-bound control, so their box holds still and the rule was
right to compare them. This def is the first where a gated part is a flow child of the row: three tones
carry a 16px glyph, the default carries none, and the executor reported three footprint misses on a
correct build. Declared per def rather than derived from `presentWhen`, which would have exempted
`checkbox` on `selection` and deleted the one comparison that def most needs.

No token name moved and no value changed. The glyph's artboard binds `icon.size.xs`, in the contract
since before this branch; the def's own `glyph-size` key is def-local. So `CONTRACT_VERSION` stands and
`token-contract.ts --check` confirms it rather than this comment. MINOR rather than PATCH because the
grammar gained a field and every field-message member gained or lost a node.

0.22.0 IS TAKEN BY #1016, which is open and not merged at the time of writing — hence 0.23.0 rather than
a second 0.22.0 entry that the later merge would have to reconcile. If #1016 is abandoned this log skips
a MINOR, which costs nothing: the numbers are ordered, not dense.
0.22.0: a selection control's box stops drawing a border in the same family as its own fill (#1011).
Seven paint keys are REMOVED from `checkbox`, four from `radio` and three from `switch`, and nothing
is added — the fix is a deletion, because the paint grammar already said this: an unbound slot returns
`undefined` and paints nothing, so the ABSENCE of `unchecked.fill` is the binding "this coordinate has
no fill". What changes on screen: an unselected box is transparent over the page instead of painting
`field.fill` (measured 1.00-1.22:1 against the page — a fill that was never visible as a fill), and a
selected box paints its fill with no border instead of `fill.selected` beside `border.rest`, which had
been two bindings disagreeing about one boundary.

The premise the three defs shared was wrong rather than carelessly applied, which is why all three had
it: `interactive.<intent>.fill.*` and `interactive.<intent>.border.*` are byte-identical at every rung
they SHARE across 5 brands x 4 modes, so a fill/border pair reads as two shades of one idea — but the
border ladder has no `selected` rung at all, so `fill.selected` had no border to agree with and fell
through to `border.rest`. `lint-paint.ts` gains a fourth arm that measures whether a fill bounds itself
against the page (>= 3:1, SC 1.4.11) and fails a same-family border beside one; it named all three defs
in a single run before any was fixed. Switch's OFF track keeps its rim, measured: no brand's neutral
fill clears 3:1 (1.21-1.58:1 at rest), so that rim is the track's only edge.

No token NAME or `$type` moves — this removes REFERENCES to tokens, not tokens — so `CONTRACT_VERSION`
stands at 5.3.0, and `token-contract.ts --check` confirms it rather than this comment asserting it.

0.21.0: a part can say WHERE it sits per variant value, and a box that is deliberately not square can
bind its main axis (#990, switch's anatomy). `PartDef.positionWhen` is keyed on one variant axis and
projects onto the PARENT frame's `primaryAxisAlignItems`; `PartDef.width` binds the main-axis edge that
`size` — one key for both axes of a square — cannot express.

The projection target was measured rather than chosen. #990's option 1 was `layoutGrow`/`layoutAlign`
on the child, described in the issue as the broader fix because it also closes #989; the vendored
typings say otherwise. `layoutAlign`'s MIN/CENTER/MAX are DEPRECATED — Figma moved counter-axis
alignment onto the frame as `counterAxisAlignItems`, with all children in an auto-layout frame now
required to share it — and `layoutGrow` is a 0/1 stretch flag along the primary axis. Both are stretch
flags. Main-axis PLACEMENT exists only on the parent. So option 1 leaves a thumb exactly as unable to
travel as it was, #989 stands on its own merits, and the narrower field is not a compromise.

Two preconditions are asserted rather than reasoned about, because both project a clean no-op: the
parent's main-axis sizing must be `fixed` (a hugging parent is as long as its child, so start/center/end
are one coordinate — and `fill` maps to AUTO too, which is #989), and the part must be its parent's only
FLOW child (`primaryAxisAlignItems` distributes the whole group; `absolute`/`overlay` do not count,
which is what lets a focus ring share the track with the thumb).

ITS CEILING, stated because it decides which future asks this can serve: MIN/CENTER/MAX is three
positions. A two- or three-value axis travels — a segmented control of three, tabs of three. A slider's
continuous thumb and a four-segment indicator are not expressible this way and need real offsets, which
is a different mechanism and not an extension of this one.

No token name moved. Switch binds `control.size.*.{height,width,dot}`, all nine of which have been in
`token-contract.json` since 0.19.0 — `width` had been emitted since #951 and bound by nothing — so
`CONTRACT_VERSION` stands and `token-contract.ts --check` confirms it rather than this comment.
Switch's own token keys are def-local and outside the contract's surface; the `off.icon`→`off.indicator`
rename in the same PR is a def-local key made to match `BOX_PAINT_SLOTS`, not a public path. (#990)

0.20.0: overriding a ground re-derives its dependents' VALUES, not only their ratios (#979).

0.18.0 recomputed a dependent's ratio in a post-pass but could not touch its value — a dependent is
picked by a closure that has already returned. 134 dependents across the 18 input-less grounds were
left carrying the old ground's answer, 98 of them below their bar.

THE ASSUMPTION, ASSERTED RATHER THAN REASONED ABOUT, which #979 made its own condition. It proposed
two passes and warned that an override must not feed back into itself across them. Reading the
resolution answers something stronger: an override's value is `ramps.get(palette).find(step).rgb` —
a pure function of the declared input, with nothing derived in it. It cannot depend on a pass, so it
cannot feed back, and the second pass would compute the identical tree at twice the cost. So this
ships as ONE pass with overrides substituted into the grounds derivation reads, and `test.ts` (a6)
asserts both halves: an overridden role's emitted colour IS its palette step, and a second
derivation over the same input is identical.

#964's lesson applied twice over — "verify the assumption" and "check whether the assumption is the
BINDING one" are different steps. The binding property was never ordering; it was that an override
is an input, not a result.

MEASURED, on the sparsest brand across the 18 grounds at two steps each. Below-bar dependents fall
98 → 59, and the 59 that remain are all legitimate: 32 MOVED with their ground (the derivation
followed; the ladder simply ran out) and 27 are WASHES, whose colour is white or black by polarity
and has no ladder to move along at all. ZERO are stale. That last number is why `staleDependents`
is REMOVED rather than kept — #964 offered either, and the case it would have been kept for does
not exist.

Arm B of `lint-ratio-truth` gains the distinction that removal depends on: a below-bar dependent of
an overridden ground is accepted only if it is a wash or its colour MOVED. Unchanged, not a wash,
ground moved — that is a value that did not re-derive, and it now fails by name. The class is
currently empty, which is what makes it a regression guard rather than a description.

TWO SITES WERE INITIALLY WRONG and the gate caught them: `field.inverse.fill` and
`background.inverse.secondary` share a source candidate but are DIFFERENT ROLES, so substituting the
shared value moved a dependent whose own ground had not been overridden. The rule the fix encodes is
that the substitution takes the ground the dependent DECLARES, with that ground's own value as the
fallback — never a neighbour's.

No emitted artifact moves: no corpus brand uses `overrides`. `CONTRACT_VERSION` stands at 5.3.0. A
minor because a brand that DOES use overrides now resolves different (correct) colours. (#979)
0.19.0: `control.size.*` grows a third field, `dot` — the inner mark of a control whose mark is a
filled shape rather than a glyph, at half the box edge (#910, radio's anatomy). Three px per brand:
nb/wendys/harbor 8/10/12, aurora 6/8/10, so it shifts a rung with density exactly as `height` does
and is NOT the brand-invariant glyph ladder under a third name. #900 recorded that this dimension
would be "deliberately absent", derived by anatomy from `height` plus a declared inset; both
spellings of that are refused by the code as it stands (`inset` is `absolute`-only, and `sizing:
'fill'` maps to `AUTO`, so padding-plus-fill projects a dot of zero), and closing either would put
`layoutGrow` through the plan type, the projector and both executors. The tier field is the smaller
change and `scale.ts` carries the correction. Radio also gains its `anatomy` block and
`figmaProperties` in the same PR, which moves no token name. (#910)

0.18.0: overriding a ground re-derives what was measured against it (#964). #956 gave the two
page/band grounds a declarative input and REFUSED them in the override layer; the other 18 had
nowhere to be sent, so they were applied and merely warned about, and their dependents kept the
ratio they derived from the old ground. Same "reports contrast it does not have" defect at 1–29
roles instead of 60.

The asymmetry that decided the design, and it was measured rather than assumed. When a ground moves,
its dependents' RATIOS move — pure arithmetic over the final colours, recomputed here. Their VALUES
do not, and cannot be: `interactive.<c>.on-fill` is `onColor(rest.rgb)` from a local inside `iFill`,
not a lookup, so every dependent of the 18 is picked by a closure that has already returned. That
ruled out the obvious fix — ordering the override into derivation so later reads see it — because
derivation does not read roles back; it reads locals. The topological-order question #964 raised
never arose: the property that would have needed asserting is not the one that was binding.

So the reported number becomes TRUE, and where an unchanged value no longer clears its bar the
final sweep names it. Measured: **67 dependents are left value-stale across the 18 grounds, and in
the worst case all 67 fall short — every one warned, none silent.** That is allow-and-flag doing
exactly what it promises. Making the VALUES re-derive needs the derivation rules reachable after
the fact, which is a larger change and is filed rather than smuggled in.

DIRECT dependents only, which is correct rather than a shortcut: a dependent's own colour does not
change, so anything measured against IT is unaffected. The edge set covers `legibleFor` as well as
`against` — since 0.17.0 a wash reports the legibility of a second role it names, and moving that
desynchronises it identically.

`rgbByRole` is now updated when an override applies. It was not, so a later override reading it for
its own `against` saw the pre-override colour: override ORDER was silently significant.

The `staleDependents` warning is KEPT and reframed rather than removed. Its subject changed — no
longer "these report a number for a surface that is gone", now "these were GENERATED against the
old ground and were not re-derived". The per-role contrast warnings name which ones fall short;
this one is the only thing that says WHY, and that link became actionable exactly when the numbers
became true.

NO emitted artifact moves — no corpus brand uses `overrides`, so the entire change is invisible to
`out/**`, and `CONTRACT_VERSION` stands at 5.2.0. A minor rather than a patch because a brand that
DOES use overrides gets different (correct) contrast metadata and new warnings. (#964)

0.17.0: `against` means ONE thing on every role (#963). It carried two opposite senses and nothing
in the data said which. On an ordinary role it names the surface the role sits on, and
`ratio = contrast(me, against)`. On a translucent WASH the arrow reversed: `against` named the INK
that ends up on top, and the ground the wash composited over was recorded nowhere at all.

A wash now declares its shape. `against` is the GROUND — so the field reads the same way on every
role — and two new ones carry what used to be crammed into it: `contrastModel: 'ink-on-composite'`
and `legibleFor`, the ink that must survive on the composited result, which is what `min` actually
bounds. Both are emitted only on those 18 roles per mode, so an ordinary role's plain
`against` + `contrast` now means exactly what a consumer would assume it means.

DECLARED at the `put` site, never inferred, for a concrete reason rather than a stylistic one:
`scrim.default` carries `alpha: 0.4` and is genuinely `ink-on-surface`, so reading the model off
"does it have an alpha" would misclassify a real role on day one. It is also #956's trap in new
clothes — a discriminator derived from the code it is meant to check agrees with itself.
`ResolvedRole` is a union, so `legibleFor` and `alpha` are REQUIRED exactly when the model is
`ink-on-composite`: the shape that caused this is no longer expressible.

The payoff is verification. `lint-ratio-truth.ts` excluded all 18 outright — 1,296 ratios per run
taken on trust — because with the middle term missing they were not recomputable at all. It now
dispatches on the declared model and checks both shapes: **10,080 → 11,376 ratios**, plus a fifth
arm asserting the label and the shape agree in both directions.

NO emitted colour moves and no token name moves, so `CONTRACT_VERSION` stands at 5.2.0. A minor
rather than a patch because the emitted METADATA SHAPE changed observably: `against` on 18 roles
per mode now names a different (and correct) token, and two fields appear beside it.

One thing worth recording precisely, because the tempting summary is wrong: `ai.json`'s
`contrast_with.token` was ALREADY correct. That field wants the ink, and `against` happened to be
carrying it — every emitted `contrast_with.token` is byte-identical across this change. It had to
be repointed at `legibleFor` to STAY correct once `against` moved, which is a migration, not a fix,
and the unchanged output is the evidence it followed correctly. What it genuinely gains is
`composited_over`: "4.5:1 with text.primary" was never actionable without knowing which ground the
wash sat on to make it true, and that was recorded nowhere an agent could read. (#963)

0.16.0: a GROUND is declared, not overridden (#956). `surfaces.<mode>.inverseBase` joins `base` and
`floorStep`; the `overrides` post-pass now REFUSES a ground that has such an input, naming it; a
ground without one is applied and WARNED with the dependents it left stale; and every role below
its `min` is warned, whatever moved it.

The defect: `overrides` runs AFTER derivation and rewrites one role. Correct for a leaf, silently
wrong for a ground — everything measured against it kept the value AND the ratio it derived from
the old one. Routed through it, an inverse band of `neutral 300` left 53 of 53 gated roles claiming
contrast they did not have, worst true ratio 1.00:1, and **zero warnings**, because the warning was
computed from the same stale number. Allow-and-flag degraded to allow-and-silently-lie.

`base` never had this, and that is the whole design argument rather than a coincidence: it was
always declared where `resolve()` could see it, so moving it re-derives the ladder and everything
gated on it. Measured both routes to the same page color — `surfaces.light.base = 300` gives 0
falsely-passing and 0 stale ratios; `overrides['background.primary']` gives 33 and 41. The fix is
therefore not a new mechanism but the existing one extended to the band that lacked it.

A minor rather than a patch because the accepted INPUT surface moved in both directions — one field
added, and a class of previously-accepted `overrides` entry now rejected. **No token name moves and
no color moves**, so `CONTRACT_VERSION` stands at 5.2.0 (576 guaranteed, unchanged).

The one committed-artifact change is a reference string, and it was a real shipped error: nine
`against` fields still read `text.on-inverse` after #892 promoted that leaf to a group at
CONTRACT_VERSION 5.0.0. They resolved to no role, so the lookup fell back to the PAGE surface — the
one ground those roles are definitively not on. #922's rule ("a rename is finished when its
consumers are re-run, not when they are re-read") one layer down, where the consumer is DATA and so
never runs at all and no compiler complains.

Also ships `lint-ratio-truth.ts` (gate 41). `test.ts`'s long-standing "all mode contrast contracts
hold" reads each role's own recorded `ratio`, so it asks the reporting path whether the reporting
path is right and agrees with itself in exactly the failure that matters. The new gate recomputes
from the FINAL emitted colors — 10,080 ratios across 5 corpus brands and 13 declared-surface cases
— and never reads `ratio` to decide the truth. It sweeps moved grounds deliberately: at defaults
every brand is clean, so a corpus-only run would report a confident zero over the only inputs that
cannot exhibit the bug. 18 translucent overlays are excluded and counted in its own output, because
they model `against` in the OPPOSITE direction (the role is the wash, `against` is the ink on top,
`ratio` is ink-vs-composite) — a one-field-two-meanings problem filed rather than renamed here.

0.15.0: the `inverse` lever is REMOVED — `levers.ts`, `BrandInput.inverse`, `Theme.inverseContext`,
the JSON-schema property and the three guards in `modes.ts`. The inverse surface-context is now
unconditional.

A minor rather than a patch because the accepted INPUT surface shrank: a brand input carrying
`inverse` is now REJECTED by `theme-schema.json` (`additionalProperties: false`), where before it
was honoured. Rejecting beats silently ignoring, because `inverse: false` has no honest
normalization — the only thing the engine could still do is generate the family anyway, which is
the exact opposite of what the input asked for, so accepting it quietly would be a lie the author
gets no signal about. `'conventional'` → `'reduced'` (`normalizeDisabledStrategy`) is the precedent
for absorbing a retired input rather than rejecting it, and it does not apply here: that value had
a nearest honest answer to land on.

NO emitted value moves and no name moves. Every corpus brand left the lever at its default, so all
four trees are byte-identical apart from the `notes` line that reported the lever's state.
`CONTRACT_VERSION` therefore STANDS at 5.1.0 — the counter-intuitive half, and worth stating
plainly: removing a LEVER is not removing a PATH. The 79 paths it could delete were already
`guaranteed`; the lever was a way to make the engine BREAK that guarantee, not something the
guarantee rested on. Removing it makes the contract true rather than changing what it says.

Measured before the fix, not inferred: `inverse: false` took a brand from 236 emitted colour roles
to 157, and all 79 lost paths are in the committed `guaranteed` set — 13.9% of 570. #895 measured
30 when it was filed; #892 grew it to 79 without anyone re-deciding, which is what turned
"document the sharp edge" into "remove it". (#895)

0.14.0: the `control.size.*` tier — a small control's OWN box (`{sm,md,lg}.{height,width}`), which
no token expressed. Purely additive: six new leaves per brand, no existing value or name moves, and
no brand's `dimension` ladder changes because every rung was already on the grid at the default base.

A MINOR rather than a PATCH for the reason the whole tier exists: the artifact gains content a
consumer can observe, and it gains a Figma collection — `control.json`, the tenth FLOAT collection,
which the write plan, the paste path and the read-back all now expect by name. A brand's emitted file
set moving is compatibility-relevant even though nothing already emitted changed.

The one thing worth reading twice is the DENSITY behaviour, because it is the property that says this
is a real tier and not a rename. `icon.size.*` is 16/20/24 in all four brands — fixed by construction,
since an off-grid glyph blurs. This ladder is windowed by the same `DENSITY_START` `componentSizes`
uses, so aurora (compact) emits 12/16/20 where nb, harbor and wendys emit 16/20/24. Had it come out
equal in all four it would have BEEN the glyph ladder under a new name, whatever its descriptions
claimed; `test.ts` asserts the divergence and the icon ladder's invariance side by side so the pair
reads as one decision. (#900)

0.13.0: the `surface` Figma collection (#893) — two modes, 122 rows, every one an alias into
`color`. A MINOR because the artifact SET grew: a consumer of `out/figma/**` sees two new files.

`CONTRACT_VERSION` deliberately STANDS at 5.1.0, and the reason is the point rather than an
omission: this adds no DTCG path. The collection is Figma-only by design — `axes.ts` classifies its
axis as `crossesAs: 'absent'`, the only axis so classified — because it stores POINTERS into tokens
the projection already carries. A consumer reading DTCG sees exactly what #891 + #892 finalised.
The contract's job is "can my app still resolve the names it references", and nothing here moves a
name it could reference. (#893)

0.12.0: #892's last tranche — the seven remaining inverse borders, the five bold inverse semantic
fills, and `disabled.inverse.*`. All additive. `disabled` being ground-dependent is the part worth
naming: the family is cross-cutting across INTENT, which says nothing about the surface, and a
muted neutral picked to read as inert on a white page is nearly invisible on a near-black band.
Also ships `inverse-coverage.ts` — the register that makes a deliberate gap distinguishable from an
oversight, checked both directions in `test.ts`. (#892, #893)

0.11.0: `buildContent` takes a GROUND and runs twice, so the inverse band's 17 content roles per
family are generated by the same code as the page's rather than by a parallel near-copy. Values on
the page are byte-identical; the only value that could have moved is the old `on-inverse` leaf's,
and it does not — the promoted `on-inverse.primary` is the same `pickMostExtreme` against the same
ground. All 736 mode contrast contracts pass, which is the check that the derivation really is the
same rule and not a weaker one wearing its description. (#892)

0.10.0: the five `foreground.inverse.<semantic>-subtle` tints. Additive, and a PREREQUISITE rather
than a convenience: `semanticInk` gates each status ink against the floor AND against its own
tint, so an inverse status ink can only be "the same rule against a different ground" once the
inverse tint exists to be that second ground. Without them the inverse inks would gate on one
ground while their page siblings gate on two — a weaker rule under a description claiming the
stronger one. Polarity flips (light step on a dark band), same as the overlay wash. (#892)

0.9.0: nineteen inverse-context tokens the surface cascade (#871/#893) cannot alias without —
`field.inverse.*` (4) and the five states every interactive inverse column was missing (15). All
additive; no existing value or name moves. Two of the three are corrections rather than new design:
the inverse fill loop read a hand-written `['default','hover','pressed']` where the page's `iFill`
walks `FILL_STATES`, so `fill.focused` — the keyboard-focus fill on a dark hero — never existed;
and the neutral overlay wash is chosen by PAGE family, so on an inverse band it washed a near-black
surface with near-black. It now takes the opposite polarity, and both descriptions say which ground
they are for. (#892)

0.8.0: the #891 rename (see `CONTRACT_VERSION` 4.0.0 below) plus two prose fixes it exposed. The
inverse outline edge shipped a `$description` VERBATIM IDENTICAL to the page edge — "the outline
edge; follows the ink", never qualified for the dark band — because both came from one hardcoded
sentence in `iBorder`, which now takes the ground as a parameter. And `ai-metadata.ts` described
the whole inverse column as "interactive ink on an inverse surface", which is the same
over-generalization the rename fixes: three of its four sub-slots are not ink, so it dispatches
per sub-slot now. No VALUE moves — every emitted colour is byte-identical to 0.7.0 under a
different name — so this is the mirror of the case the two-version split usually illustrates:
names move, values do not. (#891)

0.69.0: the DESTRUCTIVE outline/text ink now clears the floor on darker surfaces, not just white
(#1352, owner-settled). The button label/icon for the `text` and `outline` appearances binds
`interactive.destructive.text.*`, which gated only against `background.primary`: it cleared 4.5:1 on
white (~danger 500, e.g. aurora #c94c44 at 4.56) but only ~3.3:1 on `background.tertiary`, so a
destructive text/outline button failed AA the moment it sat on a slightly-darker card. The owner's
decision: destructive ink must pass ≥4.5 on white AND on the darker surfaces it can sit on, pulling
from a status-negative dark enough to clear the floor rather than the lighter brand/interactive red.
So the ink is now gated against the WORST-CASE page tier (`background.tertiary`) and, on the inverse
band, against the worst-case inverse tier (`inverse.background.tertiary`, the LIGHTEST inverse
surface). It lands a rung darker on the page (danger 600 neighbourhood, ~#a13731 — the same
status-negative `text.danger` already uses) and a rung lighter on the inverse band, each clearing
4.5:1 on every tier of its context. The FILL and on-fill are untouched; only the outline/text ink and
the border that follows it move. Deriving "the darkest negative that clears the floor" is mechanical
(a step pick), not a brand-hue choice, so it is done rather than flagged. VALUE-ONLY: no token path is
added, removed, or retyped, so `CONTRACT_VERSION` STANDS at 10.0.0 (`token-contract.ts --check`
confirms it) and no projected surface moves (`lint-component-surface`/`lint-paint` green — paint
PLACEMENT is unchanged, only the resolved colours). `regen --check` moves the affected `out/**`
destructive-ink values. The mutation-by-name gate is `lint-ratio-truth`: the ink's `against` is
declared as the strict surface INDEPENDENTLY of the ground it derives against, so reverting the ground
to `baseRgb` (the light red) drops the recomputed ratio below 4.5 and fails by name for the
destructive role — the docs/34 finding that on-darker-surface contrast had not been gated, now closed.

0.68.0: the focus ring now ADAPTS PER MODE to sit on its own ground (#1336, owner-settled). `focusRing`
resolves the action ramp against the ground the ring is painted on at the action bar (`actionMin`, 4.5),
anchored on the brand action step — keeping the anchor where it clears (light-mode page ring UNCHANGED)
and otherwise taking the nearest step that does: lighter on a dark ground, darker on a light one. The
default ring (`border.focus`) takes this in the STANDARD modes and keeps `actionRest` in HC, which
already adapted at the escalated 7:1 HC bar and reproduces real-NB's hand-authored HC focus exactly —
so the change is scoped to the standard modes that were inert. The inverse ring (`inverse.border.focus`)
takes `focusRing` in EVERY mode: it had no NB-authored HC value to preserve and its HC non-response was
the audited defect. Before this the default standard ring was `actionRest` (gated against the mode FLOOR
at the 3:1 fill floor the anchor cleared on both the light and dark page) and the inverse ring resolved
at the 3:1 `nonTextMin` bar the anchor cleared in every mode, so both froze to one brand step across
grounds of opposite lightness — aurora's default stayed #007cbb light→dark, its inverse #007cbb in all
four modes. Now the default lightens in dark (aurora #007cbb → #0088be) and the inverse darkens on the
light band it sits on in dark (aurora #007cbb → #006e99), each clearing ≥4.5:1 on its real surface; nb's
standard dark default lands on red/450, real-NB's own hand-authored dark focus, closing a divergence
rather than recording one. VALUE-ONLY: no token path is added, removed, or retyped — the
`color.border.focus` / `color.inverse.border.focus` names and the `focus-ring` def's bindings are
untouched — so `CONTRACT_VERSION` STANDS at 10.0.0 (`token-contract.ts --check` confirms it) and no
projected surface moves (`lint-component-surface` / `lint-paint` green: paint PLACEMENT is unchanged,
only the resolved colours). `regen --check` moves the affected `out/**` focus-ring values, which is the
mutation-by-name gate: reverting the derivation without regenerating fails `regen --check` by name.

0.67.0: every Figma TEXT component-property name is now LOWERCASE (#1333, owner-settled). The
TEXT-property namer used the `figmaProperties.texts` KEY verbatim as the Figma property name, and four
defs capitalized it — `button`'s `Label`, `field-label`'s `Label`, `field-message`'s `Message`,
`select`'s `Value` — while every INSTANCE_SWAP and VARIANT name was already lowercase and three defs
(`checkbox`/`radio`/`switch`) already spelled their TEXT prop `label`. Normalized to `label` / `message`
/ `value`. The rename lands on the SINGLE SOURCE the schema couples: `figmaPropertyErrors` validates
each `texts` key against a `props[].name`, so the code-side prop and the Figma panel name move together
— both lowercased — which keeps #1309's display-name split unnecessary and unbuilt for now.

ENGINE and not CONTRACT, on #1252's decision. A component-property name is component-API surface, which
`docs/30` puts deliberately outside the guaranteed TOKEN-NAME surface — no token path is added, removed
or retyped, so `CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms it; `--accept`
refreshes only the baseline's informational `engineVersion` stamp. The bump is demanded from the
projected-surface side (#1252's case): the property name reaches the plan (`propertyRef.prop` and the
set-level `FigmaPropertyPlan.name`), so `planStamp` moves for every def whose TEXT name was capitalized —
`button` / `button-destructive` / `button-neutral` / `field-label` / `field-message` / `select`, six
surfaces at the SAME member count, different digest, re-`--accept`ed into `schema/component-surface.json`.
`checkbox`/`radio`/`switch` were already lowercase, so their digests are BYTE-IDENTICAL and are not
re-accepted. `lint-paint.ts`'s census is UNCHANGED and NOT re-accepted — it hashes paint binding NAMES
and PLACEMENTS, and a TEXT-property rename touches neither. `regen --check` moves each committed token
artifact only by this file's own generator stamp (0.66.0 → 0.67.0); `lint-emission-version` is green
(the version moved with no emission-value change). No rename registry entry is owed: a component-property
rename is neither a token-PATH move (`DEPRECATIONS`) nor a Figma-COLLECTION rename
(`MATERIALIZATION_RENAMES`).

MUTATION (docs/34, on the surface gate protecting the renamed surface): reverting any one name back to
capitalized in its def (e.g. `field-message`'s `texts` key `message` → `Message`) moves that def's
`planStamp` and fails `lint-component-surface.ts` arm A BY NAME — *"surface/field-message: plan digest
… , baseline … — the same member COUNT, projecting different plans"* — while the member count holds.
`test.ts`'s hand-written property-name assertions (FieldLabel `label`, FieldMessage `message`, Button
`label:TEXT`) also fail by name; they are literals, never derived from the def. Restored, then
re-`--accept`ed at the forward bump.

0.66.0: the inverse PRIMARY filled fill now HOLDS CONSTANT across states (#1351 part 2), closing the
second real WCAG AA failure #1351 recorded. On `surface=inverse` the primary filled button is a
near-white surface carrying a BRAND `on-fill` ink (#1244/#1255); that ink is a single value gated
against `fill.rest`, so while the fill WALKED darker per state (rest neutral.050 → hover .150 →
pressed .250 in light) the ink's RENDERED contrast collapsed on hover/pressed — 4.69 → 3.62 → 2.75
over the corpus on the real inverse backdrop, two AA fails. The owner's settled fix is #1351's
option (a) — cap the darkening, all the way to constant: `modes.ts`'s `invColumn` now holds the
primary inverse fill at its rest value for every `FILL_STATES` step, so the brand ink sits on the
SAME near-white ground in every state and its rest contrast (≥4.5) holds through hover/pressed/
focused/selected. Per-state feedback lives in the outline/text ink (which steps, #1358 part 1); the
filled fill steps nowhere, which is the settled inverse model. PRIMARY ONLY — destructive/neutral
keep the neutral walk (their near-black `on-fill` survives it) pending #1253/#1254.

ENGINE and not CONTRACT. This moves VALUES, not names: `inverse.interactive.primary.fill.{hover,
pressed,focused,selected}` now alias neutral.050 (light) / .850 (dark) instead of the walked steps,
across all four modes and every corpus brand. No token path is added, removed or retyped, so
`CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms it; `--accept` refreshes
only the baseline's informational `engineVersion` stamp to 0.66.0. Unlike part 1 this is a pure
EMISSION change, not a projected-surface change: no button binding moves, so `lint-component-surface`
and `lint-paint`'s census are BYTE-IDENTICAL and are NOT re-`--accept`ed (the census hashes binding
NAMES, not resolved values). `regen --check` moves each brand's committed `out/` artifacts (the fill
values and their recomputed ratios) and `lint-emission-version` requires the bump — the emission
changed, so the version must.

THE GATE BLIND SPOT #1357 STILL STANDS (filed by part 1, not closed here). The token contract gates
`on-fill` against `fill.rest` only — the rest pairing, which always passed — so no token-tier gate
ever composited the constant ink over the WALKED hover/pressed fill, the rendered pairing that
failed. Holding the fill constant makes fill.hover/pressed EQUAL fill.rest, so the rest gate now
covers every state by construction; but a component-level gate that composites the appearance's own
ink over its own per-state fill (the #1357 arm) is still what would have caught the original defect,
and it remains #1357's PR (docs/34 — folding it in here would be half-doing it).

MUTATION (docs/34): reverting the `holdInverseFill` guard so the primary inverse fill walks again
re-emits the darker hover/pressed/focused/selected values, which `regen --check` reports BY NAME as
drift against the committed artifacts (`inverse.interactive.primary.fill.*` in every brand's `out/`
token + figma + overlay files). Restored, then re-`--accept`ed at the forward bump. `lint-ratio-truth`
recomputes every affected ratio from the final colours and stays green (near-white on the dark band
clears `nonTextMin` more easily held than walked), which is the point — the fix cannot lower a floor.

0.65.0: the `text` appearance's label/icon ink now STEPS with state on the inverse band (#1351 part 1),
closing a real WCAG AA failure. `button.ts`'s `intentTokens` gains four keys — `text.{label,icon}.{hover,
pressed}` → `color.interactive.<family>.text.{hover,pressed}` — so the `text` appearance resolves its ink
per state exactly as `outline` has since #1282. The defect: on `surface=inverse` the overlay wash is a
translucent WHITE layer, so hover/pressed LIGHTEN the ground while a pinned `text.rest` ink stays put, and
the composited contrast collapses. Measured over the emitted corpus, composited over each band's own
overlay: rest-ink fell to 2.62:1 at worst (button/button-destructive `text` hover/pressed, every non-HC
brand), and the per-state ink recovers it to 5.07:1 at worst — the same treatment `outline` already had.
Neutral is `walkable: false`, so its states collapse onto rest and a neutral text button is byte-identical.

ENGINE and not CONTRACT, on #1252's decision. The `text.hover`/`text.pressed` roles already ship (emitted
by `iText` since #576 and bound by `outline` already), so this binds EXISTING token names — no token path
is added, removed or retyped, `CONTRACT_VERSION` STANDS at 10.0.0 and `token-contract.ts --check` confirms
it; `--accept` refreshes only the baseline's informational `engineVersion` stamp to 0.65.0. The bump is
demanded from the projected-surface side (#1252's case): the three button components' `text`-appearance
hover/pressed members now paint a stepped ink, so their `planStamp` digests move at the SAME member count
— `lint-component-surface.ts` and `lint-paint.ts`'s census are re-`--accept`ed. No committed `out/`
artifact VALUE moves (component payloads are not committed under `out/`); `regen --check` moves only each
artifact's own generator stamp and `lint-emission-version` is green (version moved with no emission change).

THE GATE BLIND SPOT IS FILED, NOT CLOSED HERE (#1357, and the PR body says which). The token contrast
contract gates `inverse.interactive.<c>.text.rest` against the RAW `inverse.background.primary` (passes,
~4.87) and gates the overlay wash's legibility for `inverse.text.primary` (the strong page ink, passes) —
NEITHER composites the outline/text appearance's own per-state ink over its own per-state overlay, which is
the rendered pairing that failed. A gate that catches THIS class must be COMPONENT-level (it must resolve
which ink the appearance actually binds per coordinate, apply the projector's `color.inverse.*` rewrite,
pair it with the overlay on the same coordinate, composite, and assert AA), because a token-tier check
cannot see that the button bound `text.rest`. `lint-paint.ts` arm 4 already demonstrates the whole
pipeline (plan a def → read the variables it paints per coordinate → resolve their values per mode →
contrast), so the gate is tractable as its own mutation-proven arm — but folding a new cross-tier contrast
gate into this focused, decision-free WCAG fix would be half-doing it (docs/34), so it is #1357's PR.

MUTATION (docs/34, on the surface gate protecting the moved paint): reverting any of the four new keys in
`intentTokens` back to `.text.rest` moves the affected button components' `planStamp` and fails
`lint-component-surface.ts` arm A BY NAME at the same member count, and moves `lint-paint.ts`'s census
hash. Restored, then re-`--accept`ed at the forward bump. (Part 2 — the `filled` inverse-PRIMARY `on-fill`
holding constant while the fill darkens — carries a design choice and is NOT touched here; #1351 part 2.)

0.64.0: a DECISION-FREE consistency pass over the component defs (#1326 canon), in two groups.

GROUP A — component-projection consistency on `select`, the one def out of step with its siblings:
  (1) a STALE `text`-part comment described a `label.filled` binding at a `filled` state that the def
      never had — the `tokens` block re-points the value ink at the `empty` state (`label` bare = the
      full-contrast value, `label.empty` = the muted placeholder), and the part's own `note` already
      said so. A `//` comment is not part of the projected plan, so this half moves no surface.
  (2) the root part key `root` → `container`. Every other def names its root part semantically
      (button/icon-button `container`, checkbox/radio/switch `row`, field-label `label`, …); `select`
      alone carried the bare `root`. `container` is the existing key that fits a column stack (not a
      `row`), following button/icon-button rather than inventing a name. The key reaches the plan as a
      node name, so THIS is the only change in the release that moves a projected surface —
      `select` at 40 members, SAME count, different `planStamp` digest, re-`--accept`ed into
      `schema/component-surface.json`.
  (3) `composition.supersededBy: []` added, for shape parity with the current defs that pair
      `supersedes` with an explicit `supersededBy` (checkbox / checkbox-control / image-placeholder /
      veil). Metadata, not projected.

GROUP B — the boolean-prop naming canon (#1326 decision 2): DOM-backed booleans are BARE, synthetic-
state booleans are `is`-prefixed. `switch` `isReadOnly` → `readOnly` and `pending` → `isPending`;
`button` / `icon-button` / `field-label` `isDisabled` → `disabled`. These are code-side React prop
names; `figmaAnatomySet` does not project them (`lint-component-surface`'s stated limit 3), and both
switch booleans map to `codeOnly` states rather than to the projected state axis — so the whole group
moves NO Figma surface, which the surface gate confirms (only `select` drifted).

ENGINE and not CONTRACT, on #1252's decision. A component-property name and an anatomy part-key name
are component-API surface, which `docs/30` puts deliberately outside the guaranteed TOKEN-NAME
surface — no token path is added, removed or retyped, so `CONTRACT_VERSION` STANDS at 10.0.0 and
`token-contract.ts --check` confirms it (577 guaranteed unchanged); `--accept` refreshes only the
baseline's informational `engineVersion` stamp to 0.64.0. No rename registry entry is owed: a
component-property rename is neither a token-PATH move (`DEPRECATIONS`) nor a Figma-COLLECTION rename
(`MATERIALIZATION_RENAMES`) — both gates pass with 0 claims. `regen --check` moves only each artifact's
own generator stamp; `lint-emission-version` is green (the version moved with no emission change).

MUTATION (docs/34, on the surface gate protecting the renamed surface): reverting `select`'s root part
key `container` → `root` in the def moves its `planStamp` and fails `lint-component-surface.ts` arm A
BY NAME — *"surface/select: plan digest … , baseline … — the same member COUNT, projecting different
plans"* — while the member count holds at 40. Restored, then re-`--accept`ed at the forward bump.

── 0.82.0 → 0.83.0: `select` gains a 320 min-width floor + rides its declared responsive fill (#1343a,
   #1345) ─────────────────────────────────────────────────────────────────────────────────────────

The HELD half of the select cluster (#1343a default width + #1345 responsive auto-layout), on the
#1343 owner decision. `select`'s control gains `minWidth: 320` — a LITERAL px floor, not a token.
Prism 2's select is `root width 320 · HUG` with its inner containers FILLing that width
(`reference/Prism2/component-specs/select.json`); the engine cannot project a child that FILLs
(`sizing: 'fill'` → AUTO, #989/#990), so the floor sits on the visible control — which renders at ≥320
while the hugging column inherits that width, and, because the sizing stays AUTO not FIXED, the field
FLEXES above the floor rather than being pinned (#1345 rides on the floor). A NEW projected property
(`FigmaNodePlan.minWidth`), so the surface moves: ENGINE MINOR. No new schema mechanism touches the
width-refusal — a min-width on the control avoids it entirely (`PartDef.minWidth` is a plain literal, no
`width` binding, no sizing change), so no direction-aware refusal change and no refusal mutation is owed.

CONTRACT STANDS at 10.0.0. 320 is a projection default in 8px increments, not a semantic value — the
owner decision was explicit that it is NOT a `field.width` token — so no guaranteed token NAME is added,
removed or retyped; `token-contract.ts --check` confirms the guaranteed 577 unchanged and `--accept`
refreshes only the baseline's informational `engineVersion` stamp at contract 10.0.0. `regen --check`
moves only each artifact's own generator stamp (no emitted tree changes — a component geometry literal
is not a token); `lint-component-surface.ts` needs a bump-gated `--accept` because `select`'s `planStamp`
moved (the new `minWidth` field is inside `JSON.stringify(plan)`), and its member count holds at 32.

MUTATION (docs/34, in `test.ts`, pinning the floor INDEPENDENTLY of the projector — EXPECTED is the
authored 320 / the responsive contract, ACTUAL is read off the emitted plan):
  · #1343a — removing `minWidth` from the control (`{ ...control, minWidth: undefined }`) drops
    `control.minWidth` from the plan, flipping *"#1343a select control carries the 320 min-width floor"*
    to failing BY NAME.
  · #1345 — flipping the control's `layout.sizing.x` from `'fill'` to `'fixed'` turns its
    `primaryAxisSizingMode` AUTO → FIXED, flipping *"#1345 select control FLEXES (not hard-fixed)"* BY
    NAME — the field would then sit at a hard size instead of flexing above the floor.
  `lint-component-surface.ts` arm A ALSO catches the `minWidth` removal (the `planStamp` moves), a
  second, coarser by-name guard on the same property.

── 0.83.0 → 0.84.0 — the node-visibility BOOLEAN projection, proven by select's leading glyph (#1331) ──

A new projection PRIMITIVE: a `figmaProperties.booleans` entry drives a part's `visible` — the part is
EMITTED at every member and its visibility flipped in place by a Figma BOOLEAN component property, rather
than a variant/slot axis that emits the node in some members and DROPS it in others (multiplying the set)
or `presentWhen` (which drops the node at gated-out coordinates). New plan fields (`FigmaNodePlan.visible`
/ `visibleProp`), a new `planSetProperties` BOOLEAN derivation whose default is the node's BUILT
visibility, and a widened one-property-per-node rule (keyed on the Figma FIELD, so `visible` coexists with
a swap's `mainComponent` on one node). The projected surface moves, so ENGINE MINOR.

FIRST CONSUMER — select's leading glyph, a `leading` slot ×2 variant axis until now, becomes the boolean
`leading icon`. The set HALVES: status(4) × state(4) × leading(2) = 32 → status(4) × state(4) = 16. Clean
for select because the glyph sits inside `content`, taking no #326 padding asymmetry a boolean cannot
drive (button's edge-hugging leading/trailing stay variant axes — #1379, out of scope).

CONTRACT STANDS at 10.0.0. A variant axis becoming a boolean property is component-API surface, not a
token name — no guaranteed token NAME is added, removed or retyped; `token-contract.ts --check` confirms
the guaranteed 577 unchanged and `--accept` refreshes only the informational `engineVersion` stamp.
`regen --check` moves only each artifact's own generator stamp (no emitted tree changes — component defs
emit into no committed file). `lint-component-surface.ts` needs a bump-gated `--accept` (select's member
count 32 → 16 and its plan digest move); `paint-census` moves for select (its `set` shrinks 32 → 16 while
the DECLARED grid census is unchanged — the leading glyph was always painted, and still is, at every
member; only the projected member count halves).

NEW REFUSAL ARM (docs/34 / principle 6): a `booleans` entry on a `presentWhen`- or `when`-gated part is
refused — a boolean is the sole presence mechanism on its part, and a second (variant/state) gate would
drop the node at some coordinates, leaving the boolean nothing to toggle. `test.ts`'s #1331 block reverts
the arm and confirms it fails BY NAME. The widened field-based collision keeps a by-name arm proving two
SAME-field claims (two swaps on one node) still fail. BEHAVIOR mutation (docs/34): the leading glyph is
emitted at EVERY projected member with its `visible` driven by the boolean — reverting `leading` to a slot
variant axis re-doubles the set to 32 and re-drops the node in the false members, flipping the #1331
count/mechanism assertions BY NAME; `test-roundtrip` reads the `leading icon` BOOLEAN property + the
part's `visible` back off the built node (host truth).

---

0.86.0 — image-placeholder's empty-state marker grows from a 32px icon rung to a 180px def-local literal
(#1340). VALUE + PROJECTED-SURFACE change, so ENGINE MINOR.

A new projection field: `PartDef.glyphPx` — a LITERAL square px a non-root `vector`'s glyph frame is
built at (the executor resizes the imported SVG frame to it, the outline's SCALE constraints scaling the
drawn grid to fill), instead of binding a token via `size`. A def-local literal in the `minWidth`/
`glyphScale` family, carried on `FigmaNodePlan.glyphPx` only when set (every existing glyph's plan is
byte-identical). image-placeholder's marker was `size: 'glyph-size'` → `icon.size.lg` (32px), which read
as a stray small icon against the 720px frame (#1340). It is now `glyphPx: 180`.

WHY A LITERAL AND NOT A TOKEN. No icon rung reaches a marker-of-the-frame proportion (they top out at
`icon.size.xl` = 40px) and no other semantic dimension names near it; minting one would move CONTRACT and
hand a brand a knob nobody should re-theme. 180px is grounded in Prism 2's own centered-glyph proportion
for this exact frame family (`playCircleLine` 160px on the 480px-tall 4:3 frame = 1/3 of the shorter side;
1/3 of prism3's 540px 4:3 nominal shorter side = 180). It is a FIXED floor held across the three ratios,
not a size that tracks the frame's flexing extent on resize — true resize-tracking would need a Figma
scale-constraint / percentage projection the engine lacks (the fluid `100%` container is skipped for the
same reason), filed as a follow-up.

CONTRACT STANDS at 10.0.0. `glyphPx` is a def-local literal; no guaranteed token NAME is added, removed or
retyped, and the marker merely stops REFERENCING `icon.size.lg` (still emitted, other defs bind it), which
the contract does not track. `token-contract.ts --check` confirms the guaranteed 577 unchanged and
`--accept` refreshes only the informational `engineVersion` stamp. `regen --check` moves only each
artifact's own generator stamp (component defs emit into no committed file). `lint-component-surface.ts`
needs a bump-gated `--accept` (image-placeholder's marker plan digest moves — `glyphPx` added, the `size`
binding dropped); `paint-census` is UNCHANGED (glyphPx is geometry, not paint — the marker still paints
`icon` at the same coordinate).

NEW REFUSAL ARM (docs/34 / principle 6): `glyphPx` and `size` on one part are refused (the glyph's square
stated twice, once as a binding and once as a literal — the projection would keep whichever it read last).
`test.ts`'s #1340 block reverts the arm and confirms it fails BY NAME (alongside the wrong-kind and
root-vector arms). BEHAVIOR mutation (docs/34): the marker's projected plan carries `glyphPx: 180` and the
built glyph frame comes back 180px square — reverting to the old `icon.size.lg` rung (a bound `size`, no
`glyphPx`) flips both the projected-plan and the built-size assertions BY NAME; `test-roundtrip` reads the
180px frame back off the built node (host truth) via the new `glyphPx` readback classifier.

---

0.87.0 — the button family's DISABLED BORDER rebinds to track the disabled ink (#1349, owner-triaged
`engine`+`a11y`, decision-free). A pure component-binding change, so ENGINE MINOR (the emitted paint moves
at one coordinate). Applies to button / button-destructive / button-neutral, which are one `makeButton`
factory sharing a single `disabled.border` line, so all three move together.

OLD → NEW: `disabled.border` bound `color.disabled.border` — a muted neutral matched to `disabled.fill`
(both `neutralLow()`, gated `min: 0`, no contrast contract), which on a dark/inverse band paints DARKER
than the disabled label/icon it surrounds (nb dark: border `neutral.750` vs ink `neutral.550`). It now
binds `color.disabled.icon`, the disabled ink's graphical-object peer. A border is a non-text graphical
object whose whole a11y bar is SC 1.4.11's 3:1 against adjacent colors — it does not need to be darker
than the ink, and matching the ink gives it a REAL contract where the old role carried an exemption.

CONTRAST: the disabled border is STRUCTURAL (`anatomy-figma.ts` STRUCTURAL = {fill, border}), so it paints
only on `outline` — no fill, edge on the page — which is exactly the ground `disabled.icon` is gated against
(`background.primary`). So the border inherits that role's measured ratio: nb/aurora 3.16:1, harbor 3.32:1
(reduced, `disabledMin` floor 3), HC modes ≥4.5:1 — clears 3:1 in every mode by construction. The disabled
ink is NOT contrast-exempt here (modes.ts gates both strategies since #290), so there is no exemption to
reconcile: the border now rides a live ≥3 contract rather than the old `min: 0`.

CONTRACT STANDS at 10.0.0. `color.disabled.icon` and `color.disabled.border` both remain emitted (the latter
still bound by icon-button, text-field, select and the *-control trio), so no guaranteed token NAME is added,
removed or retyped — one component swaps which existing role it references. `token-contract.ts --check`
confirms the guaranteed 577 unchanged; `--accept` refreshes only the informational `engineVersion` stamp.
`lint-component-surface.ts` needs a bump-gated `--accept` (the button families' `outline` disabled coordinate
now paints the `disabled.icon` variable) and `paint-census` moves with it (the census records which variable
each coordinate paints, and this coordinate's variable changed).

NO NEW REFUSAL ARM — a pure token rebind adds no schema field and no refusal, so only a BEHAVIOR mutation is
owed. BEHAVIOR mutation (docs/34): `test.ts`'s #1349 arm pins, per family, that the disabled BORDER role
EQUALS the disabled ICON role and is NOT `color.disabled.border`, and re-measures the resolved ratio ≥3
across the corpus × every mode via resolveAllModes — so a revert to the old darker binding fails a NAMED
assertion rather than shipping the heavier edge again.

---

0.88.0 — radio-control's OUTER SELECTION RING rebinds from the field-border colour to the INTERACTIVE
family on select (#1423, owner-triaged `engine`, decision-free — Prism 2 is the oracle). A pure
component-binding change, so ENGINE MINOR (the emitted paint moves at the checked coordinate). The same
shape as the #1349 button rebind: a role rebind, no new token NAME.

OLD → NEW: the decomposed def (#1348) bound `color.field.border.*` at BOTH selections — a fully
constant-colour ring — on the reading that "the ring stays constant" meant colour as well as weight. QA
of the Figma import (2026-09-15) found that left a SELECTED radio's ring grey where Prism 2 ships it
brand (spec: unchecked #82899D, checked #1E1EFF / hover #0812C3 / active #090A83). The CHECKED ring now
binds `color.interactive.primary.border.{rest,hover,pressed}` — per-state, the interactive family's full
ladder, including a `pressed` rung the field-border family does not emit. The UNCHECKED ring KEEPS the
neutral `color.field.border.*` (Prism 2's static grey `selected=false` edge), so selection now recolours
the ring as well as adding the inner dot. The border WEIGHT is unchanged — one constant 2px key.

CONTRAST: the interactive border role is gated against the page (`background.primary`) at `nonTextMin`
(modes.ts `iBorder`, rated to clear it), so the recoloured checked ring rides a live ≥3 SC 1.4.11
graphical-object contract in every mode — verified live via resolveAllModes across the example brands ×
every mode (`test.ts` #1423). The unchecked ring is unchanged, so its contract is untouched.

CONTRACT STANDS at 10.0.0. `color.interactive.primary.border.*` and `color.field.border.*` all remain
emitted (the latter still bound by unchecked here and by text-field / select / the other *-control defs),
so no guaranteed token NAME is added, removed or retyped — one component swaps which existing role its
checked ring references. `token-contract.ts --check` confirms the guaranteed surface unchanged; `--accept`
refreshes only the informational `engineVersion` stamp. `lint-component-surface.ts` needs a bump-gated
`--accept` (radio-control's checked coordinate now paints the interactive border variables, and adds a
`pressed` paint) and `paint-census` moves with it (the census records which variable each coordinate
paints, and this coordinate's variable changed).

NO NEW REFUSAL ARM — a pure token rebind adds no schema field and no refusal, so only a BEHAVIOR mutation
is owed. BEHAVIOR mutation (docs/34): `test.ts`'s #1423 arm pins that the CHECKED ring role EQUALS the
interactive role per-state and is NOT `color.field.border.*`, that the UNCHECKED ring stays neutral, and
re-measures the resolved ratio ≥3 across the corpus × every mode — so reverting the bind back to
`field.border.*` fails a NAMED assertion rather than the ring silently going grey again. #1348's arm (3c)
dropped its colour-equality clause (it now pins the constant WEIGHT only, the half of "constant border"
that survives), so the recolor has one home and cannot be gated by two assertions that contradict.

---

0.96.0 — emitted COMPONENT SETS keep their variant-set FRAME so they read as sets on the canvas (#1430,
owner-triaged quality-of-life; the first question was correctness and the answer clears it). DIAGNOSIS,
with evidence (the (a)-vs-(b) fork the issue posed): the emitted sets ARE real `ComponentSetNode`s —
`write-components.ts` builds them with `figma.combineAsVariants` and the host reads them back as
`type === 'COMPONENT_SET'` (now asserted in `test-roundtrip.ts`). So this is NOT case (a), a projection
that emits plain frames; the node model is right and variant-switching / the properties panel / publishing
all work. It is case (b): a PRESENTATION strip. `combineAsVariants` returns a container Figma dresses as a
variant set — a 5px radius, a purple dashed border and a fill — and #865's default-claim (`claimDefaults`)
BLANKED all of it to a bare frame, so an emitted set was indistinguishable from any other frame on a busy
canvas.

THE FIX preserves the BORDER rather than blanking it, still as a #865 CLAIM: for the set node (the sole
`claimDefaults(null)` call), `strokes`/`strokeWeight`/`strokeAlign`/`dashPattern` and the four corner
radii are claimed by ECHOING what the host dressed the set with, not by writing a neutral literal. Echo
rather than a hardcoded purple because the exact values are Figma's own and are recorded nowhere offline
to re-assert — echoing keeps an emitted set's border pixel-identical to a native one, which is the whole
of the ask; a guessed literal would be the thing that drifts. The set's OPAQUE default FILL is the one
framing property NOT preserved — it is cleared to transparent, because keeping it would put a solid box
behind whatever a designer arranges around the set and would trip #1387's no-opaque-white rule; a set's
canvas identity is its dashed purple border, not a fill. Every non-framing default still neutralizes.
This matches the PASTE path, which never neutralized the set (its #865 claim is member-only), so the two
executors now agree on the set's frame as well.

PLUGIN-SIDE — no `out/**` diff comes from the logic itself (the set frame is a live Figma object, not an
emitted artifact), so `lint-emission-version` does not compel this bump (it reports 0 moved artifacts —
executor-only, the #1429/#1428 shape). But the built set is a consumer-OBSERVABLE change and
`ENGINE_VERSION` is the "what code produced this" answer (and the MCP `serverInfo.version`), so it moves;
the only `out/**` churn is the re-stamped `generator.version`.
0.96.0 and not 0.94.0 because this merged onto post-#1424/#1433/#1428 main: 0.94.0 was the radio/checkbox
row QA bundle and 0.95.0 the #1428 select ref-wiring scope fix; #1429 was gate-only and consumed no
integer, so 0.96.0 is the next free ENGINE integer above 0.95.0 (never lower). The provisional first cut
was 0.98.0 off 0.93.0 main.

CONTRACT STANDS at 10.2.0. No guaranteed token NAME is added, removed or retyped — this is node-type
styling, not tokens — so `token-contract.ts --check` confirms the guaranteed surface unchanged (586) and
`--accept` refreshes only the informational `engineVersion` stamp.

SAFETY NET (docs/34): the set-ness and the frame are HOST-OBSERVABLE, so they are asserted by name in
`test-roundtrip.ts` (#1430): the shared `component-shim` now models the frame `combineAsVariants` applies
(a bare `COMPONENT_SET` could not tell the fix from the #865 blank — shape 4), and the gate reads back off
every emitted set that it is a real `ComponentSetNode` carrying a non-empty dashed stroke and a set radius.
The oracle is authored in the gate, not derived from the executor; reverting either `isSet` branch to the
#865 blank trips it by name, and a negative arm (a set stripped of its stroke IS reported) proves the
check is not vacuous. It runs over the whole projected corpus, since the strip affected every set.

---

0.95.0 — the component ref-wiring re-find SCOPES PAST NESTED INSTANCES (#1428, host-truth binding fix, no
design decision). `select` COMPOSES field-label AND field-message, and both carry a part named `text` —
the same name as select's own value `text`. Both executors re-find each part by name to wire its Figma
component-property reference (the paste payload's `PAYLOAD_WIRE_REFS`, the plugin's read-back/recovery),
and `findOne` descends INTO a nested instance: on the live host it returned one of the instance's own
`text` layers — a sublayer of ANOTHER component, which cannot hold this set's reference — so Figma refused
with "Could not create a new component property reference" and select's `value` reference was dropped
(QA 2026-09-15). `leadingVisual` (a unique name) and `message` (matched on the nested-instance node
ITSELF, a valid target) never collided, which is why only `value` failed. Both executors now use a scoped
`findOwnPart` that matches a part by name without descending into a nested instance; a referenced part is
always the member's own layer, so the scope loses nothing.

ENGINE and not CONTRACT. A consumer who pastes the payload or runs the plugin now gets select's `value`
property reference where it was silently dropped — an observable change in the engine's output — so the
bump is owed by the surface rule (version.ts's "what a consumer can OBSERVE"). It adds, removes and
retypes NO guaranteed token name, so CONTRACT STANDS at 10.2.0 (`token-contract.ts --check` confirms the
guaranteed surface unchanged). The projected component SURFACE digest does not move either — the fix is in
the two EXECUTORS, not in `figmaAnatomySet`, so `lint-component-surface`'s `planStamp` is byte-identical
and `lint-emission-version` is blind to payloads by construction (both facts stated above). Committed
`out/` therefore moves ONLY on the `engineVersion` stamp, the same shape as the 0.90.0 control-shape entry
below. Recorded here because neither emission gate forces this bump — it is owed by policy, not by a red.

BEHAVIOR mutation (docs/34): `test-roundtrip.ts`'s #1428 arm drives select's PLUGIN executor, and
`test.ts`'s #1428 arm its PASTE payload, each through a stub whose nested instances carry a colliding
`text` part that refuses a reference write exactly as a sublayer of another component does. Each has a
reachability floor proving the collision materialised, then asserts select's `value` reference survives on
every member. Revert `findOwnPart` in either executor and its arm fails BY NAME with the live host's own
"Could not create a new component property reference" (paste) / `DISCARDED` (plugin read-back) message.

0.95.0 and not 0.94.0 because this rebased onto post-#1424/#1433 main, which took 0.94.0 (the radio/checkbox
row QA bundle); #1429 (the button-overlay gate) was gate-only and consumed no integer, so 0.95.0 is the next
free ENGINE integer above 0.94.0 (never lower). The provisional first cut was 0.96.0 off 0.93.0 main.

---

0.93.0 — `switch-control` is SCALED to Prism 2's toggle proportions (#1425, owner-triaged `engine`+`a11y`,
decision-free calibration). It was ~half Prism 2's scale — a 16px track at aurora's largest switch rung,
a thumb half that, failing to read as a switch and leaning on the row for the whole hit target — because
it BORROWED the square-control box (`control.size.*.height`) for its track and radio's `dot` for its thumb.
The tier now carries the switch's OWN two fields, `track` (its cross-axis edge) and `thumb` (its traveling
mark), a SEPARATE density-windowed ladder from the box: the default `md` is Prism 2's 32px track holding a
24px thumb (0.75), pill-cornered, 2px-bordered, at a 2:1 width. `switch-control` rebinds its track height to
`.track`, its thumb to `.thumb`, and the glyph follows the (larger) thumb; the `switch` Row rebinds its
nested-height pin to `.track` so the instance is not squashed back to the box height. `width` moved from
`2× height` to `2× track` and `inset` from `(height − dot) / 2` to `(track − thumb) / 2` — both switch-only
fields, so checkbox and radio (which read only `height`/`dot`) are untouched. ENGINE MINOR — emitted
dimensions move, no code contract changes shape. 0.93.0 and not 0.88.0 because this merged onto post-#1426
main, which had taken 0.88.0–0.92.0; this is the next free ENGINE integer above 0.92.0 (never lower).

THE CONTRACT MOVES A MINOR (see CONTRACT 10.2.0): `track`/`thumb` are additive. The one trap #1425's first
cut hit is that the `inset` re-derivation drops aurora's UNUSED `control.size.lg.inset` from 5→4, which would
have DEMOTED `core.dimension.5` (aurora's only reference to it) — a MAJOR and a hard block at
`lint-materialization-renames`. It is not avoidable by picking switch numbers (the density window ties
compact-`lg` to comfortable-`md`, so 32 at `md` forces compact-`lg` to 32, inset 4, no 5). The fix keeps the
grid's small-primitive floor stable: `buildDims` also feeds the box mark-clearance `(height − dot) / 2` (the
quantity that WAS `inset` before #1425, aurora's 3/4/5), so `core.dimension.5` stays guaranteed exactly as on
`main`. Surface stability, MINOR earned honestly — not a MAJOR papered over.

BEHAVIOR mutation (docs/34): `test.ts`'s #1425 arms pin, per density, the switch `track` ladder (distinct,
increasing, and TALLER than the box `height` at every rung — the undersize this fixes), `thumb = 0.75 × track`
read off resolved px (so a `SWITCH_THUMB_RATIO` mutation fails by name), `inset = (track − thumb) / 2`, and
`width = 2 × track`; the authored `EXPECTED_CONTROL` table pins comfortable-`md` at Prism 2's 32/24/64/4.

---

0.92.0 — #1426 `select` QA, all FOUR fixes, owner-decided (2026-09-15). ENGINE MINOR (the projected surface
moves on all four) and — uniquely for this lane — a CONTRACT MINOR too (10.1.0, the one new emitted name in
#1437). Serialized LAST behind the lanes that landed on main first — #1347 (0.89.0, checkbox-row rename),
#1371 (0.90.0, control-shape off-ramps) and #1368 (0.91.0, face pin) — so this takes the next free integer
above main's 0.91.0: 0.92.0.
  (1) CARET PINNED RIGHT. The control's `justify` goes `start` → `space-between`, so the trailing chevron
      sits at the field's right edge at every value length rather than tracking the value string
      (`content` fills in code but hugs in Figma, #989). Projects `primaryAxisAlignItems: SPACE_BETWEEN`.
  (2) `showMessage` BOOLEAN. A node-visibility boolean (#1412) that hides the composed FieldMessage
      entirely — DEFAULT TRUE, and the FIRST use of the mechanism on a `nest` part. A component prop, not
      a token; no CONTRACT move.
  (3) 44px INTERACTIVE FLOOR (#1437). The control binds `size.md.min-height` = `max(size.md.height,
      AAA_TARGET_PX)` — the md control height raised to the WCAG 2.5.5 enhanced 44px target wherever a
      dense brand falls below it (a FLOOR: a spacious 56 stays 56; a compact 36 lifts to 44). This is the
      one new emitted guaranteed name, so CONTRACT moves 10.0.0 → 10.1.0 (the MINOR is recorded under
      CONTRACT_VERSION below). Placed inside the existing `size.md` group so the rung-iterating gates are
      unaffected; `emit-figma-dims` emits it as a `size/md/min-height` variable on the height scopes.
  (4) EXPOSE THE FIELD-LABEL (#1438). select's `label` nest goes `nest-fixed` → `nest-exposed`, exposing
      field-label's size/emphasis/weight; marking the instance exposed also surfaces its label text and
      `required` in Figma. A projected-surface change, no token move.

ENGINE and not (only) CONTRACT on #1252's decision for (1),(2),(4): the projected component surface moves
with no emitted token path. (3) additionally moves the guaranteed name surface, which is why THIS lane —
unlike the select fixes that preceded it — carries a CONTRACT bump.

NEW REFUSAL ARMS: none. All four use existing mechanisms (the `space-between` justify value, the #1412
boolean projection, the `size.*` tier + a max, the #1330 nest-exposed relation), adding no schema field
and no refusal — so only BEHAVIOR mutations are owed (docs/34). `test.ts`'s #1426/#1437/#1438 blocks carry
them: the SPACE_BETWEEN projection (revert `justify`→`start` → `MIN`), the message boolean's every-member
presence + shown-by-default-not-a-constant, the floor formula `max(md,44)` proven non-vacuous on the
compact brand, select's binding to the floor, and the projected `nestExpose` marking (revert to
nest-fixed drops it). The host-truth for the boolean and the exposure is `test-roundtrip` and the #1392
payload gate (now provisioning select's full nest + swap set). `lint-component-surface` took a bump-gated
`--accept` (select's plan moves: `primaryAxisAlignItems`, the `message` boolean, the `min-height` binding,
the label's `nestExpose`); `paint-census` is unchanged (no paint moved).

---

0.91.0 — a text CATEGORY may PIN a VERBATIM FACE per weight-role slot (#1368, owner-resolved the
three type-model forks 2026-09-15). `typography.faces.<category>.<weightRole> = { family, style }`
names the exact Figma face a slot binds, OVERRIDING the numeric-weight → style-name derivation, so a
WIDTH cut the weight axis can't reach (NB's ITC Garamond Std *Light Condensed*, PostScript
`ITCGaramondStd-LtCond`) binds from a brand input at last. ENGINE MINOR: the emitted Figma STYLE of a
pinned composite changes (the baked `fontStyle`), so what a consumer observes moves. (Integer above
0.90.0 — #1347/#1423 then #1371's control-shape off-ramps landed on main first, taking 0.89.0 and
0.90.0; this lane rebased onto each and takes the next free integer.)

THE FORK, AS THE OWNER RESOLVED IT. (i) The pin is `{family, style}`, not fontStyle-only — resolved to
Figma's family + style. (ii) It is a per-(category, weight-role) SLOT pin, not a broad map: the
mechanism generalizes (any slot a category ships can name a face) but is populated one slot at a time;
NB pins display/subtle and title/subtle only, a single Light cut each, so there is NO multi-weight
condensed sub-family here. (iii) The numeric `fontWeight` variable still follows the slot's weight-role
numeric (Light = 300 = NB's subtle), staying truthful — only the STYLE drives the Figma text. `family`
MUST equal the category's bound family: the Text Style binds `fontFamily` to the `font.family.<cat>`
variable and the write lane loads `fontName.family` FROM that variable (`write-plan.ts`
`fontFamilyPrimary`), so a divergent family would be silently dropped at the host — `buildComposites`
refuses it instead.

CONTRACT STANDS at 10.0.0. A face pin is brandDependent: it adds NO guaranteed token NAME — it changes a
baked style VALUE on existing `type.*` composites and hangs a `$extensions.prism3.facePin` on them; no
path is added, removed or retyped. `token-contract.ts --check` confirms the guaranteed surface unchanged;
`--accept` refreshes only the informational `engineVersion` stamp.

THE SCHEMA STAYS LEAN — NO GATE CEILING RAISE (owner directive 2026-09-15). The `faces` field is
expressed with OPEN keys (`additionalProperties`, not a 7×5 enumeration) and terse descriptions, and the
pin leaf is `{family, style}` (the optional `postscript` provenance field was dropped as it drove
nothing), so `tools/list` stays under its existing 60,000-char ceiling — no bump to that gate.

NEW REFUSAL ARMS (docs/34 — a refusal owes its own by-name mutation test). `buildComposites` throws by
name on: a pin on an unbound category, a weight-role the category does not ship, a malformed/empty
{family, style}, and a family that diverges from the category's bound family. `test.ts`'s #1368 block
pins each throw AND the positive emission (a brand naming a verbatim face EMITS that family+style — the
host-truth write-plan row carries `fontStyle: 'Light Condensed'` + `fontFamilyPrimary: 'ITC Garamond
Std'`, and the numeric weight stays `subtle`), so deleting the mechanism or a guard fails a NAMED
assertion, not just "the suite goes red".

---

0.90.0 — the `controlShape` FORM lever gains TWO fixed off-ramps (#1371, owner-decided 2026-09-15):
`boxed` (binds `radius.none`, a fixed 0px / sharp corner, independent of the corner-softness dial) and
`hairline` (binds `radius.hairline`, the fixed 1px sentinel #1362). The complete four-way set is now
Boxed · Hairline · Rounded · Pill. It stays a SEMANTIC model — each value names a relationship to a rung,
never a raw radius — so `rounded` still tracks the softness ramp and `pill` is still the unconditional
height ÷ 2. ENGINE MINOR: adding enum values + their emitted radius bindings moves the PROJECTED COMPONENT
SURFACE for a brand that picks one (the pill-able controls' corner rebinds), which is an observable-surface
change (#1252) even though no corpus brand sets it, so committed `out/` moves only on the `engineVersion`
stamp.

MECHANISM: `applyControlShape` was generalized from a single `pill`-vs-rest branch to a `CONTROL_SHAPE_RUNG`
map (rounded→identity, pill→`radius.capsule`, boxed→`radius.none`, hairline→`radius.hairline`), still
repointing the ROUNDED rung BY REF (`radius.md`) so it reaches button's `radius` key and icon-button's
`radius.square` key alike and still LEAVES the intrinsic `circular`/switch/radio round rung. `rounded`
remains the IDENTITY, so the default plan is byte-identical.

THE HAIRLINE↔RUNG COUPLING, decided mechanically (not a UX fork). `radius.hairline` is opt-in — it exists
only with `radiusHairline` on — so `controlShape: hairline` would otherwise bind a rung a brand never
provisioned and dangle. `brandTheme` couples them: choosing the shape IMPLIES the rung (the same
`radiusHairline` local that `buildDims` already threads is OR'd with `controlShape === 'hairline'`), so the
binding always resolves. `boxed` needs no coupling — `radius.none` is the ramp floor, always emitted.

CONTRACT STANDS at 10.0.0. `controlShape` is a LEVER, not a token name, so widening its enum adds no
guaranteed name; `radius.none` was already emitted and `radius.hairline` is `brandDependent` (opt-in, never
a guaranteed name) — so no guaranteed token NAME is added, removed or retyped. `token-contract.ts --check`
confirms the guaranteed surface unchanged; `--accept` refreshes only the informational `engineVersion` stamp.

NO NEW REFUSAL ARM — the enum simply admits two more values (schema `enum` + `brandTheme`'s enumLevers), so
a BEHAVIOR mutation is what is owed. BEHAVIOR mutation (docs/34): `test.ts`'s #1371 arm derives the bound
radius var from the projected PLAN (independent of the `CONTROL_SHAPE_RUNG` map it checks) and pins, by
name, that boxed→`radius/none` and hairline→`radius/hairline` at every size while `circular`/switch/radio
stay `radius/round` — so reverting a map entry fails a NAMED assertion. The coupling arm reads the EMITTED
tree and pins that a brand setting only `controlShape: hairline` still emits `radius.hairline = 1px` while
`boxed` provisions nothing — so dropping the OR flips it. Enum widening is gated both ways (a valid
off-ramp validates clean; garbage is still rejected).

0.90.0 and not 0.89.0 because this merged post-#1347 main, which took 0.89.0 for the checkbox-row rename +
checkbox-group build — the next free ENGINE above it (never lower).

---

── FOLDED CHANGE NOTES (#1807) — `fold.ts` writes each fold directly below this line, newest first. ──

0.238.0 — folded 2026-11-11 from 264 change notes, newest merge first.

[fix-3488-dialog-reduced-fade · minor · ed24ef3f] Dialog keeps a fade under reduced motion (#3488, owner decision Q-M5 A on #3413, amending Q491 A). Under
prefers-reduced-motion every placement and the backdrop now fade only, with no slide and no scale, on
`motion.duration-reduced.normal` to open and to close, where the def said they opened and closed at once with no
fade. A fade is not vestibular motion, and it keeps the cue that a layer opened. The `motion.reduceMotion` field and the
code-only motion description move, with `components.ai.json`, `component-defs.json`, the Dialog docs page and the
maintainer schema; the `prism3-motion` skill drops its note that the def still dropped the fade. No token moves, so
CONTRACT is unchanged.

[fix-3487-motion-prose-tokens · minor · 83100148] Tab, Tabs and Banner name motion tokens instead of milliseconds (#3487). The tab underline's slide and the tabs
panel cross-fade now say `motion.transition.default`, and Banner's dismiss says `motion.transition.exit` with no
"about 150 to 200ms" beside it, in each def's `motion` field and its matching code-only description. A duration in
milliseconds is right for one tempo only, so an agent reading the catalog copied a number that is wrong for every other
brand. `components.ai.json`, `component-defs.json`, the three docs pages and the maintainer schema move; no token moves,
so CONTRACT is unchanged.

[claude-3524-report-web-rail · patch · 4b1d9310] Report a problem in the web studio (#3524): a tile beside Help at the foot of the rail opens the same Report a problem
dialog as the plugin, which opens the prefilled issue in a new browser tab. Panel only: no committed artifact, emission
or component surface moves.

[claude-3523-report-palette-mode-names · patch · ef6498b1] Report a problem (#3523, Q147 A): with the brand's settings left out, its palette names and custom mode names are now
replaced with [brand] too, each only as a whole segment of a line. Panel only: no committed artifact, emission or
component surface moves.

[claude-2069-report-problem · patch · a47d85d7] Report a problem (#2069, Q116 A): a button at the foot of the plugin's Activity drawer opens a diagnostic report (the
build, the engine version, the host and each operation's latest result) with the brand's settings off by default, Copy,
and "Open a prefilled issue", which opens GitHub's issue form in the browser. No file names or keys are included, and
nothing is sent from the plugin. Plugin and panel only: no committed artifact, emission or component surface moves.

[claude-1909-collision-choice · patch · 0cc91feb] Apply Theme's collision choice (#1909, Q112 A): when an apply would touch content Prism3 did not make, the panel lists
each collision and the person chooses Skip or Rename for each, or one choice for all, and the apply runs again with
those choices. A collision with no choice is refused as before, the pre-flight runs again over the resolved plans before
any write, and nothing is remembered. An agent's apply is unchanged. Plugin and panel only: no committed artifact,
emission or component surface moves, and the component executor is unchanged.

[badge-inline-size-align · minor · 7ce4809a] Badge's inline label takes the contained label's text size at each size (#3475 part 1, owner decision Q93 B): `type.label.sm.default`
(12px) at medium and `type.caption.md.default` (the corpus's 11px) at small, in place of the body roles (16px and 14px)
#3199 set. The inline style keeps its regular weight and its dot-and-text look. Its dot cell follows the new line box,
`type.label.sm.line-box` at medium and the new `type.caption.{md,lg}.line-box` at small, so the inline members are 14px
tall at medium and 15px at small (14px on the reference brand). `typeWeight` gains `keys`, which scopes the fixed weight
intent to named token keys, so the contained small label stays the bold caption while the inline one is the regular
caption. The member names and count are unchanged. CONTRACT is raised to 14.15.0 for the added caption line-box paths.

[claude-3476-nested-divider-subtle · minor · ed5d6ab7] Accordion and Dialog nest their dividers at emphasis subtle instead of bold (#3476, owner decision Q72 B), for every
brand, so their separators draw color.border.primary, the lighter edge, rather than color.border.secondary. Divider's
own default stays bold, so a placed divider keeps its color. Both strengths are decorative rules with no contrast
minimum. The Accordion and Dialog Figma sets keep their members and member names; only each nested divider's variant
changes. No token name moves, so CONTRACT is unchanged.

[claude-3440-adherence-figma · patch · b48a0d40] The desktop bridge (tools/figma-bridge) takes PRISM3_BRIDGE_ARM=0|1|2 for the agent-adherence test (#3440). Arm 0 sends
no note, serves no resources and refuses the context command; arm 1 adds the note; arm 2, the default, is the bridge as
it was. A new --record <file> option logs every figma_run call and its outcome, refused calls included. Without either,
the bridge behaves as before. No emitted artifact moves, AGENT_PROTOCOL_VERSION stays 1, and CONTRACT is unchanged.

[claude-3436-second-keep · patch · 47ba829d] Plugin: a second Keep run over a set with kept hand edits keeps it under Kept edits (#3436). The changes its edits keep out, recorded by the first run, stand on the set's ledger entry until Overwrite or Accept as baseline is chosen, or the edits are gone. No emitted artifact, token or projected component surface moves.

[claude-3424-stopped-set-ledger · patch · b3ef1794] Plugin: an update that stops inside a set no longer records that set as current in the as-built ledger (#3424). Its old entry stands, so the set stays due and Update file offers the update that finishes it. No emitted artifact, token or projected component surface moves.

[claude-3441-codeonly-data-2 · minor · 8e4f930e] A correction to page navigation's note (#3345), which the merge with #3441 made due: two component pages join `out/components/`, making 229 committed artifacts, not 227. Page navigation also moved the component-defs export: `currentIndicator` joins its brand `settings` and its lever chain, and its format moved `prism3-component-defs/1.0` → `1.1` (a field added: minor). PageNav's and PageNav.Item's `anatomy.codeOnly` entries are data, as every def's are, and `syncBoundary` lists them.

[claude-3441-codeonly-data · minor · 8e4f930e] Each component definition's `anatomy.codeOnly` entry is data (#3441, owner decision #3437 Q1 A): a class from the declared register in `code-only-register.ts`, one of four dispositions (CARRIED, LOWERED, REFUSED or UNSUPPORTED, names as decided in Q3441.1 A), and its prose kept whole as `description`. `components.ai.json` (format `prism3-component-docs/1.0` → `1.1`, a field added: minor) adds `syncBoundary` to every component: each entry's class and disposition, never its prose. The component-defs export (format `prism3-component-defs/1.1` → `1.2`, a field added: minor; page navigation's `currentIndicator` took it to `1.1`) carries the same `syncBoundary` on every def. The maintainer record carries all three. A new gate, `lint-code-only-classes.ts`, fails an unregistered class, a missing disposition, a register class no entry uses, and an admission not classed `not-projected`. Plans, the Figma emission and the token contract are unchanged.

[claude-3345-page-nav · minor · 2c6050fa] Page navigation (#3345, owner decisions 2026-11-03: Q1 A, Q2 A, Q3 A amended, Q4 A, Q7 B, Q10 B): two new components and a new
optional brand input. `page-nav` (PageNav) is a navigation of links between two to six sibling pages, the current one
marked: a row holding a native items slot of `page-nav-item` (PageNav.Item), 2 members (`size` medium, small). The item
nests Link at its standalone look: another page at `selection=unselected` (plain at rest, underlined at hover), the
current page at `selection=selected` (plain, with Link's 2px current-page bar), 4 members (`selection` × `size`). In code it is a `<nav>`
with a `<ul>` of `<a href>`, the current one `aria-current="page"`, and no tab roles. Tabs and Tab now point page
changes at PageNav, so their docs and `components.ai.json` entries move; Link lists PageNav among its partners.
`currentIndicator: full | partial` (Form, default `partial`) is the width of Link's current-page bar, which every current
link draws, a PageNav item's included: Partial is round(0.5 × the title's width), centered; Full is the title's width,
as before. A new part field, `footShare`, carries the share; both component executors draw such a bar at that share,
centered, constrained SCALE across. `applyCurrentIndicator` materializes it into Link before projection; it is the identity
at Full. Because Partial is the default, a brand that sets nothing now draws every current Link's bar at half the title's
width, so Link's selected members are due on Update. No token is added or renamed, so CONTRACT is unchanged and every
committed token emission is byte-identical. Two component pages join `out/components/` (227 committed artifacts). Link's,
PageNav's and PageNav.Item's docs say the bar's width is the brand's Current page indicator.

[claude-3438-tc-holds · minor · 26da06e9] A standalone Link's trailing icon takes `color.icon.link.visited` at `:visited`, beside the label's
`color.text.link.visited` (#3438, owner decision Q-TC1 B). Visited stays code only, so the change is in Link's code
contract; Figma carries no visited member. The contract's names do not move, so CONTRACT is unchanged.

[claude-3425-defs-export · minor · 7251d992] The component-defs export (#3425, owner decision Q45 A). TypeScript stays the only hand-edited form of a component
definition; component-defs-export.ts publishes it as generated JSON. out/components/component-defs.json is every def's
shipped fields (its components.ai.json entry) beside its spec model (its specs.json entry), with a format id, the
engine and contract versions, and a per-component digest, validated against the authored
schema/component-defs.schema.json. out/components/component-defs.specs.json is the same export as a Specs components
set, valid against the published @directededges/specs-schema 0.39.0 (packages/tokens/check-specs.mjs, stock Ajv). A
brand's own export resolves its component settings and adds each geometry token's px: cli.ts --component-specs, MCP
export_theme include ["componentSpecs"] (opt-in), and the Studio's Export > Component specs in the Figma plugin.
projectDef moves to project-def.ts, re-exported from emit-component-docs.ts. The drift gate's artifact count rises by
two. No token path moves, so CONTRACT is unchanged; no executor code moves.

[claude-3422-theme-tick · patch · 75528bfa] Plugin: Update file opens with Theme ticked only when the file's variables differ from the brand (#3422, Q44 A), the same signal the badge counts, so the badge and the ticks agree. When the file matches, Theme stays in the checklist, unticked, and a tick applies the brand again; it reads "Up to date" only when the recount measured the file and found it matching (Q44.2 A). The file differs when its saved brand differs, or when its variables were written by another emission than this plugin's: Apply Theme now stamps a print of what it wrote beside the brand (Q44.1 A). A file that is not set up always ticks it. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-update-leaves-due · patch · 74009d6c] Plugin: Update file updates, in the same run, the sets its Theme step unblocks, and Keep no longer reads as current when kept hand edits keep out the plan's values (#3421, Q39 A). Such a set is named in the verdict and listed under a new Kept edits group, with its own Keep, Overwrite or Accept as baseline. A kept node's bound read-back is filed under `kept` in the set's build record, not as a miss, so `EXECUTOR_REVISION` rises. No emitted artifact, token or projected component surface moves.

[claude-3399-focus-edge · minor · c508d84d] A focused field now draws a 2px focus edge in place of its border, with no ring (#3399, owner decisions Q22 A, Q22.1 A and Q3399.1 A). The edge is the field's own stroke at the focus width (`focus.ring.width`), drawn inside from the outer edge at the field's own radius, so the box keeps its size and no corner gap is left. A default field draws it in the focus color, and an error, warning or success field in its status color. On a default field the inner 1px changes from the fill at 3:1 or more; the outer 1px change from the rest border can fall below 3:1, a trade-off each field's notes record. This applies to Text field, Textarea, Select, Password field, Card number field, Search field, the Code input cell and Counter (outline); Counter's ghost and every field in the underline Field style keep the outside ring. It replaces #3328's ring inside the border, and `PartDef.borderInset` goes with it. A `strokeWidth` key may now name `{state}`, and an absolute part may gate on a variant axis with `presentWhen` (EXECUTOR_REVISION 52). Select no longer names `focus-ring` among the components it is often used with. No token is added or renamed.

[claude-3392-banner-edge · minor · e5776eb2] Banner's `width` axis is renamed `edge`, and its `full` value `full-bleed` (#3392, owner decision 2026-11-04). The axis
changes the corners and which sides carry the edge, not a width, so it is named for what changes (#3383's rule). The
code prop is `edge` (`contained | full-bleed`, `contained` the default), and the token slot keys follow
(`edge.{edge}.radius`, `edge.{edge}.edge-side`). `edge` joins `VARIANT_AXES` as its thirty-fourth name; Button keeps
`width`, now its only set. The rename rides `COMPONENT_RENAMES` (an axis entry and a value entry), so an update renames
a built Banner's members in place and every placed instance keeps its member. The set keeps its 10 members and its
paint. No token name moves, so CONTRACT is unchanged.

[claude-update-check-progress-3302 · patch · f029acf3] Plugin: Update file shows how far its check has got (#3302). While the plugin reads the file, the dialog's foot reads "Reading this file…" with an empty bar. Then it reads "Checked n of N sets", and the bar fills as each set is checked. The set being checked reads "Checking…". A checked set shows its result as it lands, and a set not reached yet shows no line. The check now reports each set as it finishes (`update-check-progress`). Nothing moves by time. No emitted artifact, token or projected component surface moves.

[claude-3382-divider-strength · minor · fd0255ff] Divider gains an emphasis axis, bold | subtle (#3382, owner decision Q15 revised A): bold binds color.border.secondary,
the color every divider drew before, and subtle binds color.border.primary. Bold leads, so it is the code default and
Figma's default member, and placed dividers and the Accordion and Dialog dividers keep their color. The rule and the
labeled divider's two lines are drawn as an inside stroke at border-width.hairline instead of a fill, so the border
color shows in Figma's stroke picker; the box is one hairline thick, so the pixels are unchanged. The Figma set grows
from seven members to fourteen. The code-only separator binding is renamed separator.rule.border, so it stays clear of
the new emphasis grammar. No token name moves, so CONTRACT is unchanged.

[claude-3346-indicator-role · minor · 478c0235] The selection mark gets its own role (#3346, owner Q1 revised A, E1 A and E3 A, 2026-11-03). Every interactive family
now emits `interactive.<c>.indicator.{rest,hover,pressed}`, on the page and the inverse band: the shape that marks a
control as selected or on, holding the label's color as resolved. The tab's selected bar, the radio's checked ring, the
tag's selected outline, the switch's off thumb and the slider's disc bind it instead of `interactive.*.border.*`, so an
outline-edge setting can never reach them, and no shape binds a text role. A label override now carries to the
matching `.border.<state>` and `.indicator.<state>` (`withIndicatorTwins`), unless that role is overridden itself; a
border override never reaches the indicator. Under Tag style Underline the unselected line keeps
`interactive.primary.border.*`. No existing token value moves in any example brand; on the reference brand's master
input the selection marks turn near-black, and its outline edge's hover and pressed now match the label.
`CONTRACT_VERSION` 14.14.0: 18 added paths.

[claude-3383-variant-rule · patch · 60288955] skills: the variant rule (#3383, owner decision Q3 A). `prism3-build-component` §6 gains it for def authoring (a
variant axis only when layout or structure changes; show/hide is a boolean, text a text entry, a nested choice
`nest-exposed`, width the container's, a color-only state or status stays an axis), and its closing checklist checks
it. `prism3-rebind` gains it for local components built in a rebuild (§3) and for auditing someone else's rebuild
(§11, step 8). Skill prose only: no committed artifact, token or projected component surface moves.

[claude-3364-kept-view-variable-value · patch · 5f19a924] Plugin: Update file's check no longer reuses a kept member read after a variable's value is edited in the Variables panel
(#3364). Figma reports no document change for that edit, so the hand-edit pass and each check print the file's local
variables (values by mode, and each collection's modes), and a print that moved, or cannot be read, drops every kept read.
No emitted artifact, token or projected component surface moves.

[claude-3360-field-message-first-line · minor · 25d9b880] FieldMessage's status glyph centers on the message's first line (#3360, owner decisions Q-FM1 A and Q-FM1.1 B). A
one-line message reads exactly centered, and a wrapping message keeps the glyph beside its first line. The row stays
top-aligned. The glyph sits in its own cell and the caption in another, and the row's new `firstLine` field pads the
shorter of the two down by half the difference: the caption by (glyph − line) ÷ 2 where the glyph is the taller, the
glyph by (line − glyph) ÷ 2 where the caption's line is. Before, the glyph's top met the caption's top, which put the
glyph 0.3px above a 15.4px caption line and 1px above a 14px one. The caption starts at the same height in every
status, the default included, so a validation result moves no text.

No token is added and the token contract does not move. The offset is computed from two numbers the def already binds:
the glyph's size (`icon.size.xs`) and one line of the caption's type, unrounded. In Figma both executors write it at
paste from the caption node's line height and the glyph variable's value, because a padding binds one variable and
never a max or a half of two, so it is frozen per file and Update recomputes it. In code it is computed live,
`max(0px, (glyph - 1lh) / 2)`. The component spec records the two paddings as computed values, with the formula and no
px. In existing files one Update adds the two cells and moves the glyph and the caption into them.

The class is `minor` because the projected component surface moves (the def's anatomy, `out/components/field-message.md`
and `specs.json`) along with the executor's output for this set. The token emission does not move.

[claude-3343-check-credits-run-adds · patch · 1f3fb250] Update's check counts a component the same run adds as present. A set that nests a provider logo's new marks (Wallet button) read as blocked until a second run, though the run it checked was the one adding them. The run now reads and writes a single-component def before the set that nests its components (#3343).

[claude-3300-context · minor · b02e48f3] The agent link answers a read-only `context` command (#3300): what the open file is, for an agent's first read. It names
the stored brand and its modes, the variable collections, whether the file is themed, the sets Prism3 built and which
are due (from the as-built ledger, so partial), the commands that read and those that write, where to read more, and the
engine MCP server to use for brand work. It lists what is read-only by default: pages whose name contains FINAL,
locked layers and Original copies, from one capped walk of every page. It writes nothing. AGENT_PROTOCOL_VERSION stays
1, no emitted token artifact moves, and CONTRACT is unchanged.

[claude-3328-field-focus-inset · minor · c1cd0846] A focused field now draws its focus inside itself, at its own radius (#3328, owner decision Q3328.1 A). The border takes the focus color and the 2px focus ring sits inside it, so the focus reads as one 3px edge with no outer frame. The ring takes the field's own radius variable, so no corner is written as a number. This applies to Text field, Textarea, Select, Password field, Card number field, Search field, Code input and Counter (outline) (Q3328.2 A). Counter's ghost and every field drawn in the underline Field style keep the outside ring. A part can now declare `borderInset`, the host border width it sits inside, and both executors honor it (EXECUTOR_REVISION 50). No token is added or renamed.

[claude-3306-per-set-choices · patch · 9045887a] Plugin: Components offers a box per set in each family with two or more roots (#3306, owner decisions Q3306.1–6 A): Buttons, Icon button, Flush icon button and Icons & assets, worked out from the catalog's nests. A set that a chosen set nests and the file lacks shows ticked and held, tagged Needed, and its box's name says which set needs it. Needed sets are worked out each time the list is drawn, never stored in the file's add queue. Every family box now has three states, and a needed set counts toward them. A family box that is on takes out only the sets chosen in that family. Update file's To add has one "Also adds" line naming everything built alongside the chosen sets: the needed sets and, on a first run with usage panels on, the sets the panels' template is made from. Private parts are built but not named. The badge still counts only the chosen sets. The executor is unchanged, and no emitted artifact, token or projected component surface moves.

[claude-3163-dialog-body-scroll · minor · 7792801e] Dialog body scroll (G14, #3163; owner decision Q3130.8 A on #3130): the Dialog body is the scroll region at every
placement. A box part can now declare `scroll: 'vertical'`, which the schema accepts only on a box and only with
`clipsContent: true`, and which projects as `overflowDirection = VERTICAL`. Both executors (the plugin's and the paste
payload's) now write `overflowDirection` on every frame, `NONE` unless the plan says otherwise, and the paste payload
carries it onto a native slot. Dialog's `body` declares both, so it crops what overflows it and scrolls vertically: a
pinned footer no longer draws over a long form at full or end, where the body takes the height the header and footer
leave. Center and bottom hug, so there the crop shows only once a designer fixes the height. Dialog keeps its 24 members,
its properties and its layer names, so existing files update in place and instances keep their content. Dialog's
code notes now name the code shape: a flex-column panel with the body at `flex: 1 1 auto; min-height: 0; overflow-y:
auto`. No token is added and no token name moves, so CONTRACT is unchanged and every committed emission is
byte-identical. Dialog's projected surface moves (accepted).

[claude-3335-interactive-restructure · minor · 43866e6e] Two new brand inputs for outline and text hover (#3335, the owner's Q3335.3 A and Q3335.5 A). `outlineWash: { hover, pressed }`
sets the wash's opacity brand-wide, as steps of the opacity scale (5, 10, 20, 30 or 40), pressed above hover, selected
following pressed. It replaces the neutral wash's fixed 10/20 (`overlay-neutral`, and `opaque-fill`'s tags, segmented
controls and pagination) and the tinted wash's fixed 20/30 start (`solid-tint`, still stepped per set for the label's
floor and for visibility). `outlineHoverFill.<mode>.sets.<set>` picks one button set's opaque hover and pressed fill;
the mode-wide pick stays every other set's default, and a set the brand does not have is refused by name. Both are
optional and default to what the engine did before, so every brand that sets neither is byte-identical. The lever
manifest gains `outlineWash.hover` and `outlineWash.pressed` (enums, swept by the lever sweep), and the theme schema
both inputs. No token name moves, so CONTRACT is unchanged.

[claude-3365-neutral-action-palette · minor · ebe2d245] The actionPalette lever description names neutral, which the Studio and the plugin now offer in the Action palette select
(#3365), and says what it leaves alone; schema/lever-manifest.json regenerates from it. The engine already accepted
actionPalette: neutral. No token value or name moves for any corpus brand, so CONTRACT is unchanged.

[claude-3308-cover-first-run · minor · 21244709] A first Update file run draws the cover and About this library (#3308, Q3308.4 A). A run that includes Set up file and
Theme now ends with one more step, which runs the in-place update over no sets: its finish draws the cover, bound to the
theme the run just wrote, and About this library. Until now Set up file, the run's first step, had no brand to draw the
cover with, and nothing later in the run drew either, so a fresh file waited for a second Update file. The plugin is
unchanged. No token, emitted tree or projected component surface moves, so CONTRACT is unchanged.

[claude-3330-list-x-small · minor · 3432dc3a] List and List item gain an `x-small` size (#3330), for tight rule lists such as password requirements. It sets the item text in body extra-small, 12/18, with a 16px bullet or number column, a 6px bullet, and a 16px check in a 24px icon column. The gap between items is 4px and follows density. Every type has the step, so each set grows from 9 to 12 members; an Update adds the 3 new members and leaves the existing 9 in place. No token is added or renamed.

[claude-3205-panel-format-due · patch · 7f538632] Plugin: Update file offers a usage panel drawn by an older panel format, even when its set is current (#3205). The as-built ledger now records, on each family's lead set, the panel format its usage panel was checked at, and a set whose format is behind today's reads due for its panel. So raising the panel format makes every usage panel due once, as #3318 intended. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3347-password-label-row · minor · a7efcef5] Password field's label row is one label line tall again, 18 / 21 / 24 by size (#3347, Q380 A). In real Figma it measured
26 on every member: the host floors a hugging row at a stretched child's own content height, and the nested small
Button's was its 6px block padding around its 14px "Show" line. The toggle instance's top and bottom padding are now
bound to `space.0` as an instance override (new `PartDef.nestPaddingBlock`, token key `toggle.pad-block`). Button's own
set is unchanged, and "Show" stays centered on the row. Password field binds one more token (`space.0`), and its spec
and docs page list the toggle's padding. The component shim models the measured floor (`stretchFloorsHug`), and
`test:roundtrip` asserts the row's height on all 84 members. No property, variant or token name moves.

[claude-3308-doc-block-first-run · minor · 4b134953] Update file builds the usage panels' template on a first run (#3308, Q3308.3 A). With Documentation's usage panels on
and a file with no _Doc-block, Update file's run also builds Badge, Tag, List item and Divider first (To add lists them
as "Also builds"), then _Doc-block, before the queued sets, so every queued set gets its usage panel in one run. Until
now each set said "No usage panels drawn" and the owner's first run read five sets "built with problems". The panel's
sets step asks each build for it (build-components' docBlock); the Components page's build and an agent's are unchanged,
and so is a run with the panels off. The file's read names the template's sets the file lacks (docBlockLacks). No token,
emitted tree or projected component surface moves, so CONTRACT is unchanged.

[claude-update-check-calls-3313 · patch · c433015e] Plugin: Update file's check makes far fewer host calls on a full library (#3313). It reads the file's component names once per check, not once per set. For each set that the hand-edit pass read at open, and that has not changed since, it reuses the pass's member reads. A document change that touches a set drops that set's kept read. A write, or a change that can't be traced to a set, drops all of them. The check still reads how each member draws against the file's variables, and each set's publish status, every time. The apply reads every set again before it writes. On a template-sized stand-in the check falls from about 2.8M host calls to about 0.84M, and its answer is unchanged. No emitted artifact, token or projected component surface moves.

[claude-3014-fill-under-hug-height · patch · 1ce7cecc] `lint-fill-under-hug.ts` gains its height twins (#3014, owner decision Q3014.1 A): a stretch across a row that hugs its
height, or a grow down a column that hugs it, fails by def and part path unless the gate's `MEASURED_SAFE` list names
it. The host keeps a hugging height (measured on a real file on 2026-11-02), and the list holds the three shapes that
measurement covered: Accordion's leading and trailing indicators, and Password field's Show/Hide button. A stale entry
fails too. No committed artifact moves.

[claude-3344-tabs-indicator-overlap · minor · 496e39f2] Tabs: the selected tab's 2px indicator overlaps the list's 1px baseline, bottom edges aligned, and paints over it (owner
decision on #3344). Until now the list kept a 1px inset under its tabs, so the indicator sat on the baseline as a second
line. The list's bottom inset is gone, so the tabs reach the list's bottom edge and the list is 1px shorter, and the
baseline comes before the row of tabs, so it draws under them. The baseline is still one part of the list, pinned across
its foot. No color, weight or size moves, and the executors are unchanged. The Tabs plan, its docs page and specs, and
the token-usage report move; CONTRACT is unchanged.

[claude-3137-usage-panels-update · patch · 9e557275] Plugin: Update file offers the usage panels a file is missing (#3137, owner decisions Q3137.1–8 A). While Documentation has panels on, the file read finds, with an indexed search for panel tags a page at a time, each family whose lead set is in the file and has no live usage panel. Update file lists them under Components as Usage panels, with one tick, "Draw {n} usage panels", on by default. Up to six names show inline; past six they sit under "Show the {n} sets". The panels ride the in-place update, scoped to those sets, so the page makes room and a version is saved first. The badge counts the group as one item, and its name adds ", usage panels". Documentation's Usage panels card gives the count and offers "Draw them with Update file". With panels off, its off line says how many panels stay, and Update file › Clean up offers "Remove {n} panels", which removes only the panels that still hold what was drawn. The agent gets the same removal as `panels-clean`. The executor is unchanged, and no emitted artifact, token or projected component surface moves.

[claude-3300-bridge-note · patch · e9dd34ab] The desktop bridge (tools/figma-bridge) tells a connecting agent how to work in a Prism3 file (#3300). Its
initialize and server/discover results carry a short note, and figma_status carries the same note as readFirst: never
detach a Prism3 instance, keep hand edits, leave FINAL pages, locked layers and Original copies alone, change only
component properties on a library instance, bind semantic roles by name, and save a named version before a write. The
bridge also serves five read-only resources from its checkout: the rebind and consume skills, commands.json,
figma-conventions.json and llms.txt. No emitted artifact moves, AGENT_PROTOCOL_VERSION stays 1, and CONTRACT is
unchanged.

[claude-3298-inspect-menu-narrow · patch · d5da7ca0] At the narrow tier the Inspect menu stays inside the window: the preview header holds it, at Inspect's right edge and capped at the header's width less 12px a side, with the privacy note and the build stamp wrapping inside it (#3298). At 380 it had run 161px off the window's left edge on both hosts. The Inspect menu's 320px minimum (#3147) applies at the wide tier only, so at 380 the privacy note fills the menu out to that cap. 1280 is unchanged.

[claude-3327-window-placement · patch · 3a07072f] Plugin: Minimize parks the strip at the canvas's lower right, 16 px in from the right and the bottom, and Restore brings the full window back centered over the visible canvas (#3327). Each placement is computed at the moment of the toggle from `figma.viewport.bounds` and `figma.viewport.zoom` and applied with `figma.ui.reposition`; a window the user drags stays where it is until the next toggle. The 16 px margin is a starting value to be tuned in real Figma: a plugin cannot see Figma's bottom toolbar, so on a canvas too narrow for the toolbar and the strip side by side the strip overlaps it. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3308-run-continues-past-problems · minor · b74aeab9] Update file's run goes on past a To add step whose sets were all built, some with problems (#3308). Until now a set
built with problems made the step's verdict not ok, and the run stopped there: the owner's first run read "Stopped at
To add" with "1 failed", and never reached the style guides. A set that failed to build, or a stop that left sets
unbuilt, still ends the run. The run's verdict line then reads "File updated" as a warning, naming the step's own
words, and a multi-set build with problems is marked "⚠", so Activity counts it as a warning, not a failure.

[claude-3147-release-prep · patch · 47eed6c9] The plugin's release build refuses a checkout that is not clean and current (#3147, the owner's Q3147.16 A): npm run -w
@prism3/plugin build:release exits 1, before writing anything, when the build stamp's commit is -dirty or
git-unavailable, when the checkout is behind origin/main, or when it cannot tell (releaseCheck in
apps/plugin/git-stamp.mjs). The dev build keeps the warning, and under CI the release build warns with the same reasons
and builds. The network build's privacy note at the foot of the Inspect menu is the owner's approved wording (Q3147.7 A,
Q3147.17 A), and it wraps within the menu rather than widening it; in the wide tier the menu is at least 320px wide, so the note
runs to about six lines. tools/release/prepare.ts prepares a release record
(two zips and a draft note) and prints the tag, push and draft-release commands; it publishes nothing. No committed
artifact or component surface moves, and CONTRACT is unchanged.

[claude-3308-queue-deps-first · minor · 5711e62e] A build of several sets (Components' action bar, and Update file's To add) builds each set after the queued sets it
nests (#3308). A set's build already builds every set it nests that the file lacks, so a queued set that another queued
set nests was built twice: once by the first set's build, then again from the queue, where every member read "ALREADY
PRESENT" and the set was counted as built with problems. The owner's first run built Checkbox.Row that way. The queue
otherwise keeps the list's order, and a set listed twice runs once. The plugin and the wire are unchanged.

[claude-3305-drawer-mono-10px · patch · 66421e2d] The Activity drawer sets its monospace text, a run's console lines, the publish description and the status counter, at 10px instead of 12px. Its reasons, titles and other UI-face text stay at 12px (#3305).

[claude-3225-banner-body-neutral-link · minor · 62104fff] Banner gains a body text property, a neutral tone and an inline link (#3225, owner decisions 2026-11-01). The body
sentence moves out of the native slot into a text part driven by `body text` (code `children`, default the old
placeholder); the slot stays for rich content behind the Figma-only `rich body` toggle, empty and off, and is renamed
`richBody` in place so the `body` toggle can take its name. A fifth tone, `neutral`, last on the axis: the secondary
background, the `border.tertiary` edge and no glyph, so the set grows from 8 to 10 members. An inline Link follows the
body's last word in a row that wraps and aligns on the text baseline; a `link` prop typed exclusive with `actions`.
The schema gains `LayoutDef.wrap` (projected as `layoutWrap: WRAP`, written by both executors) and a hugging text
below the root, whose max width is derived from the build width. `COMPONENT_RENAMES` gains the `slot-text` kind, and
Update carries each placed banner's edited body into the property. The primary and link inks are also held on
`background.secondary` (`INK_SURFACES`), which moves no example brand's value. No token name moves, so CONTRACT is
unchanged.

[fix-3297-status-hold · patch · 89c83809] Plugin and desktop bridge: the agent link's status no longer flips between "Listening · bridge" and "Listening · mailbox" every 2 s when Prism3 has the link on in two files (#3297). The bridge server lets a newer paired connection replace the older one, so the two instances evicted each other on every retry. The server now closes the replaced connection with a new close code, 4409, meaning another paired instance holds the bridge. The displaced relay then sends `yield: true` with each hello, and the server refuses that hello with 4409 while a plugin is attached instead of letting it replace the holder. Those retries back off from 2 s to 30 s, and the instance takes the bridge once the holder leaves. A dropped socket now keeps the word for 5 s, and the word changes only if no retry has reconnected by then. The full status line of the waiting file says the bridge is connected to Prism3 in another file (DRAFT wording). Pairing is unchanged. A refused socket no longer makes the relay's error handler recurse under Node's WebSocket. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3265-anatomy-numbered-instances · patch · f9f77083] Usage panels' anatomy legends number each instance of a repeated part (#3265, owner decisions Q3265.1 A and Q3265.2 A).
One instance reads "Cell 4" with its own note; neighbors alike on the specimen make one run, "Cells 1–6", captioned by
their shared note or else the nested component's summary. Before, a repeat merged by its settings wherever it stood and
read "Item ×4" under its first part's caption. No committed artifact, emission or component surface moves.

[claude-3309-activity-command · minor · 9b297fb2] The agent link answers a read-only `activity` command (#3309): the Activity drawer's runs this session, newest first,
the panel's own runs included, so an agent can diagnose a run the owner started without the drawer's text copied by
hand. Each run carries its operation, who ran it (the panel, or the agent command), its time, the verdict's kind and
ok, its headline, summary and lines, each set the build left not clean with the reasons its verdict read (a miss that
is not a skipped member, a missing canvas template), and the build stamp it ran from. The main thread keeps the log in
memory (apps/plugin/src/activity-log.ts): each verdict as it posts it to the panel, and the panel's own summary of a
multi-set build and of Update file's run, which the panel now posts as an activity-note. Nothing is kept in the file
and the command writes nothing. `since` and `limit` page it. AGENT_PROTOCOL_VERSION stays 1, no component surface
moves, and CONTRACT is unchanged.

[claude-3013-mode-control-focus · patch · 2815f741] The preview's mode control keeps keyboard focus when it switches between its radios and its select as the window narrows or widens, instead of dropping it to the page (#3013).

[claude-3205-specimen-sizing-reset · patch · 30509829] Plugin: a usage-panel example keeps its width once its panel is on the page (#3205 follow-up). #3211 fixed each specimen at its member's width with that width as its floor, but in Figma Dialog's example still ended up fixed at the 62px it hugs inside a 687px stage. The likely cause: the host drops a nested instance's size overrides when its tree moves, and the panel moves onto the page only after every specimen is sized. Now each specimen is sized again after the panel lands, before its anatomy markers are placed. The panel format is raised, so Update redraws every usage panel once. Real-Figma confirmation is still owed. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-open-yield-3301 · patch · f740c9cb] Plugin: opening the plugin on a full library no longer holds Figma's main thread for long stretches (#3301). The status strip reads "Reading this file…" from the first moment, before anything else runs. A set's plans are projected and printed a member at a time, with the thread handed back about every 50 ms (`figmaAnatomyMembers`, `checkAnatomySet` and the plugin's `printSteps`; `figmaAnatomySet` and every print are unchanged). The background hand-edit pass no longer projects a set's plans to find it, and reading a set's members hands back about every 50 ms as well as every 24 members. No emitted artifact, token or projected component surface moves.

[claude-3303-panel-print-own-draw · patch · 97f47132] Plugin: Update no longer treats a usage panel Prism3 drew, and nobody touched, as a hand edit (#3303). The print recorded when a panel is drawn read every layer inside the panel's instances: the `_Doc-block` blocks, List.Item rows, Badge chips, markers. Those layers come from each instance's main component, and Update rebuilds those components, so an untouched panel printed differently afterwards. It was kept as "… (edited)" below a fresh panel (23 sets in the template after one Update). Now the print reads each instance only through what it overrides: the text, properties and visibility the draw wrote, plus anything a designer changed since. A text, fill or visibility edit inside a block still keeps the panel. Spec panels share the print and get the same reading. A panel printed before this change is compared in its own form: it is replaced while it still matches, and kept once a component it nests changes, as before. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3017-panels-off-update · patch · 8ddf4d5b] Update file no longer draws a usage panel while Documentation has Usage panels off. The apply's furniture step drew the panel for every set it touched, whatever the switch said (#3017).

[claude-2908-busy-label-no-ellipsis · patch · ea002d71] Busy labels drop their own "…" (#2908, owner decision Q2908.1 A). While a run is out, Update file reads "Updating" and
Draw specs reads "Drawing specs". The spinner cell beside the words is unchanged, so a running control shows one busy
signal. No committed artifact, emission or component surface moves, and CONTRACT is unchanged.

[claude-3145-brandmark-relayout · patch · 0353e9ab] Plugin: an Update re-lays a provider-logo block still on the old 48px grid (#3145). Before #3142 a single-component block was laid out at a fixed 48px pitch, so the wide marks sat over their neighbors, and an Update kept those positions. Now, while two of the marks Prism3 placed overlap, the Update moves each of them to the measured pitch, keeping its row and column. A mark moved off the old grid by hand, and a component Prism3 did not build, stay where they are; if a new spot is taken by anything else on the page, nothing moves and the outcome names the mark. Positions only: every component keeps its id and key. EXECUTOR_REVISION 45 -> 46, reaching provider-logo. No emitted artifact, token or projected component surface moves.

[claude-3226-badge-dot-space-100 · minor · 16ffbb20] Badge's presence dot (`type=dot`) binds `space.100`, the inline status dot's size: 8px in every brand and at every
density (#3226, owner decision Q3226.1 A). It bound `control.size.sm.dot`, the radio's inner mark, which follows the
brand's radio-dot share and emitted 12px in the reference brand. The dot no longer shrinks to 6px at compact. No token
is added or renamed, so CONTRACT is unchanged.

[claude-3149-components-no-inspect · patch · 34dd92d5] The Components page shows no Inspect menu in its preview header, on the plugin and the web (#3149, owner decisions
Q3149.1–.4 A). The empty header row stays at wide widths, so the two panes' dividers still line up, and collapses at the
narrow tier. Inspect, with the build stamp and the privacy note at its foot, stays on every Theme page. No committed
artifact, emission or component surface moves.

[claude-3147-phase2a-read-commands · minor · 5348b821] The agent link answers four read-only node commands (#3147 Phase 2a, the owner's Q3147.10 and Q3147.14 A): inspect
(the listed layers and their descendants to a depth: type, name, page, size, locked, the main component with its key,
instance properties, the variables bound by name and the text style), component-keys (every local set and component
with its key, publish state and variant properties), audit-frames (a rebuild's done check: legacy instances, unstyled
text, raw fills, stand-in dividers and default or rule-breaking frame names, against legacy lists the agent passes)
and snapshot (one layer as a local PNG). They run over the file mailbox and the desktop bridge
(apps/plugin/src/agent-reads.ts), post no verdict, and write nothing to the file. Walks are capped, and a layer that throws on read is
listed unreadable while its siblings are still read. A snapshot of a node that is not in the file is refused bad-args.
run-code stays dev-only (Q3147.13 A). AGENT_PROTOCOL_VERSION stays 1, no component surface moves, and CONTRACT is
unchanged.

[claude-3261-stamp-fetch-skip · patch · 05f5abbe] Plugin build: the check for a checkout behind origin/main no longer fetches when the build stamp says git could not run, or under `--watch` (#3261). Where git cannot run, the build prints its one warning pair, without a second note from a fetch that fails for the same reason or the fetch's 20 s timeout where git hangs. A watcher no longer blocks on the fetch after it starts. A build that runs once with a working git still fetches and warns as before. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3243-verdict-verb-agreement · patch · 27b93851] Plugin: the Update verdict's counts agree with their verbs (#3243). One field the verify lists reads "1 field still differs from the plan", where it read "1 field still differ". One member left reads "1 left as it is", and a set with one member not built by Prism3 reads "1 not built by Prism3, left as it is". The plural lines are unchanged. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3264-ui-copy · patch · a996aba4] Update file's copy (#3264 decision 2, DRAFT strings): the Activity row for the theme write reads "Theme", the busy
refusal reads "Update file is already running. Try again when it finishes.", and the cover note for a file with no brand
says to run Update file with Theme ticked. Two unread "Apply Theme first" strings are removed. No artifact moves.

[fix-action-anchor-pin-note · patch · 09ab60d7] The action-anchor note reports a pinned step (#1894). When `actionPalette` names a brand color and `actionAnchorStep`
pins the step, the decisions log now names the pinned step and says it is applied exactly, instead of the brand
color's auto-placed step and "moved only if it misses…". The pin itself was already applied exactly; only the note
was wrong. Without a pin the note is unchanged. No token or committed artifact moves, so CONTRACT is unchanged.

[claude-1024-paste-rename-migration · minor · 83f5ee24] The CLI paste path (materialise-to-figma.ts) migrates renamed variables, as the plugin executor has since #1013
(#1024). A new first pass, `migrate`, ships the source of the rename pass and runs it in the file: collections
first, atomically, then each axis's variables against the names that axis is about to write. A renamed variable
keeps its id, and so every binding, instead of being orphaned beside a fresh one. The apply half of the pass
(openMigration, renameCollections, renameVariables) moved from apps/plugin/src/write-figma.ts into rename-map.ts,
so both paths run one definition; rename-runtime.ts assembles its source for the payload. No token, emitted tree or
projected component surface moves, so CONTRACT is unchanged.

[claude-3242-dry-run-nest-member · patch · 995bed94] Plugin: Update's dry run now notices a nested instance on the wrong member (#3242). A member whose stamp and as-built record read current, but whose nested instance is another member of its set than the plan's coordinate, reads "to update", and the field is listed as a `nestVariant` change on that part. The check is the one the apply's verify has run since #3206, now shared by both. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-badge-copy-3234 · minor · be141187] Badge copy that the inline style made stale (#3234, owner Q3234.1 A, Q3234.2 A, Q3234.3 A). The `size` prop names both
styles in its existing order (contained 12px / about 30px and 11px / about 19px; inline 16px on a 24px line and 14px on a
21px line). The usage sentence and `ai.whenToUse` say "next to what it describes" instead of a second sense of "inline".
The do reads "Keep a contained label to one or two words, and use the same casing everywhere", and the `label` prop and
`accessibility.labelPattern` say the same. `components.ai.json` and the Badge docs page move; no token moves, so CONTRACT
is unchanged.

[claude-3220-placeholder-follows-secondary · minor · 4a4fbad2] `color.field.placeholder` now takes `text.secondary`'s own fit (#3220, owner Q3212.5 A): the same candidates, bar and ground. The field hosts bind `text.secondary` for the placeholder, so the token and the components now show one placeholder ink. Under `secondaryTextGround: page` the placeholder moves with the secondary ink (the reference brand: `neutral.500` in light, measured on `background.primary`). In high contrast, every brand's placeholder moves one step darker to `text.secondary`'s HC floor fit (for example prism3 `neutral.650` → `neutral.700` in hc-light). Before, it was fitted on `background.secondary`, which is white in HC. No token name moves.

[claude-update-due-tag-3133 · patch · fc2b573c] Update file: a due set's tag wraps under its name where the two do not fit on one line, so at 380 it stays inside the
dialog instead of running past its edge (#3133). No committed artifact moves.

[claude-plugin-commit-stamp-3239 · patch · 6978f008] Plugin: every build stamps the git commit it came from, beside the tree token (#3239). The stamp is now `<ISO seconds> tree-<8 hex> <commit>`, where the commit is the short sha, `<sha>-dirty`, or `git-unavailable` when git cannot run. The menu stamp, the verdict note, the console line and the agent link's `link` record carry it. The build warns, without failing, when the checkout is behind `origin/main`, and says plainly when git cannot run. Wording is DRAFT for the owner. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-3167-tabler-digest · patch · df400094] The chrome suite holds the vendored Tabler icon set to a digest taken from the package (#3167). The glyph check read its
expected icons from the same file the chrome draws from, so a hand edit to an icon's paths passed. The vendoring script
now also writes each icon's digest from the package, and the suite checks the set against it before any glyph check
runs. The icons, every emitted artifact, token and component surface are unchanged.

[claude-3160-reach-proxy · patch · a0bdf3cb] lint-executor-reach sees a host call the component shim lacks (#3160). The executor calls optional host APIs through
optional chaining, and a method the shim does not implement made that call a no-op on both sides, so a drawing change
through one read as unchanged. Every node the gate draws now records each property it is asked for and lacks, and a
host API the new executor asks for reads as a drawing change. The ledger test gains a case that crosses a missing
reach entry alone. The executor, the record and every emitted artifact are unchanged.

[claude-3157-divider-followups · minor · f25b622a] The token-usage report marks a binding key "(not drawn)", and lists it under keysNotDrawn in the JSON, when it shares
its token with a key the projection draws but no member draws it (#3157): Divider's horizontal.line.width and
vertical.line.height (dropped by the grow rule) and vertical.true.width (dropped by the hug) no longer read as bound.
Divider's notes.unverified also names the unmeasured update of a plain vertical member on a file built before #3143.
test.ts gains a case for the sizingWhen-beside-size refusal.

[fix-chrome-exits-3207 · patch · b583a994] Menus, dialogs and the Activity bar's unread dot now leave with an exit instead of vanishing (#3207). A menu fades out,
a dialog's scrim fades while the dialog shrinks back, and the dot shrinks away, each on the chrome's fast duration and
exit curve. Under reduced motion each is a short fade. The shell marks a closing surface as leaving, keeps it inert so
it holds no focus and reads as closed, and removes it once its exit ends. No committed artifact, token or projected
component surface moves, and CONTRACT is unchanged.

[claude-3188-protocol-relative · patch · f123eb5c] lint-network-reach reads protocol-relative hosts (#3188). A request written `//host/...` takes the page's scheme, and
the gate's host scan needed one, so an offline-only request written that way passed. A second shape reads a `//host`
after a quote, `(`, `=` or whitespace, on both builds, held to the same allowed and reference-only lists. No existing
arm narrows, and no emitted artifact, token or component surface moves.

[claude-3219-redesign-page-secondary · patch · 790e6e81] The redesign seed (`examples/nb-redesign.design.md`) sets `secondaryTextGround: page` (#3219, owner Q3212.4 A), so a brand imported from it fits `text.secondary` and `icon.secondary` on the page: `#767576`, 4.6:1 on white, where the floor fit was `#696869`. No committed artifact moves: the seed has no emitted tree.

[claude-badge-hand-sets-3091 · patch · b416aa84] Update file's badge: a component set deleted, added or renamed by hand is counted correctly at the next recount, without
waiting for the next read of the file's sets (#3091). No committed artifact moves.

[claude-3186-centring · patch · 4caaa18e] lint-us-english sees the `-ring` form of the `-re` stems (#3186): `centring`, `manoeuvring`. RE_ENDINGS matched
`centre` as a substring, so a word that drops the `e` before `-ing` walked through it. A new arm over the same stems
catches it, sampled both ways in SELF_CHECK. The one shipped occurrence, a stylesheet comment carried verbatim in the
web bundle and the plugin UI, now reads `centering`. No emitted artifact, token or component surface moves.

[claude-escape-review-3240 · patch · ace869ed] `lint-doc-gates.ts` holds the escape review in step (#3240): the PR template's **Escape review** heading, `CONTRIBUTING.md`'s rule and `.claude/commands/review-pr.md`'s review step must each keep their marker. Process and gate only: no emitted artifact, token or projected component surface moves.

[claude-3175-paypal-sdk-min · minor · 518e324e] WalletButton records PayPal's 150px SDK minimum as a code-only note (Q3175 A, #3175): the codeOnly width line tells
the consumer to give a PayPal button a 150px slot, and contested records the decision. The design file's width floor
stays 120 for every provider, so no member, token or emitted tree moves; only the maintainer surface carries the
reworded lines. test.ts holds the note by name (#3175 PAYPAL WIDTH NOTE).

[fix-offline-main-bridge-token-3218 · patch · e5720270] "Prism3 Studio Offline" no longer reads the desktop bridge's pairing token on its main thread (#3218). The offline
build has no bridge, so its main thread now carries none of the token plumbing: no clientStorage key, no read on
launch, and no paired or unpaired handling. The plugin's main-thread build takes the PRISM3_NETWORK define its UI
build already had, and the release gate fails if the token's key returns to the offline bundle. No committed artifact,
token or projected component surface moves, and CONTRACT is unchanged.

[claude-3206-verify-nested-member · patch · f37e9fee] Plugin: Update's apply verify now notices a nested instance left on the wrong member (#3206). After the write it reads each nested instance's main component off the file and compares its coordinate, axis by axis, with the one the plan names. A mismatch that is not a hand edit the run kept is listed with the other fields that still differ, so a partial Update no longer reports as verified. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[fix-chrome-motion-followups-3217 · patch · addf9e4e] The Activity drawer's closing slide plays only when an open drawer closes (#3217). It used to play at boot, and on every
narrow-to-wide resize, under a drawer that was already closed. It moved 0px, so nothing showed, but every settle-wait
waited for it. The plugin's verdict harness now waits for the drawer's motion with the capped wait the smoke harnesses
use, and fails by name if the cap trips. No committed artifact, token or projected component surface moves, and
CONTRACT is unchanged.

[claude-3208-apply-theme-yield · patch · a6a0ac95] Plugin: Apply Theme no longer freezes the panel while it writes (#3208). Every stage (float, color, styles, grid, type variables, text styles, motion) offers a hand-back after each variable or style it writes, and the plugin takes it once about 50 ms of work has run, the cadence a component write keeps. Until now only the color stage handed back, every 200 variables, and the float stage not at all, so the strip's timer stalled and Stop could not be clicked for long stretches. What an apply writes is unchanged. `EXECUTOR_REVISION` rises to 45 because the style executor the component executor shares takes the new argument; no set draws differently, so revision 45 names none. No emitted artifact, token or projected component surface moves.

[claude-badge-inline-3199 · minor · 76a1636b] Badge gains an inline status style (#3199, owner decisions Q-ST1 A and Q1–Q8 A): a new authoring axis, `style: contained | inline`, on the status label. An inline badge is an 8px status dot and plain body text on a text line, with no fill, padding, radius or edge, as tall as the line (24px at medium, 21px at small). The label is `text.primary` in `type.body.md.default` or `type.body.sm.default`; the dot is the tone's icon role (neutral `icon.secondary`), bound to `space.100` and centered in a cell one line box tall, so a wrapping label keeps it on the first line. The set grows from 40 to 50 members. The 40 existing members gain `style=contained`, the first value, and an update renames them in place, keeping their ids. The paint keys gain the style segment (`{tone}.{type}.{style}.{emphasis}.{slot}`), and Tab item's nested count badge names `style=contained`. No token name moves.

[claude-3147-phase1-bridge-network · patch · ad6a9a47] The desktop bridge ships in the network build, "Prism3 Studio" (#3147 Phase 1). The agent link's relay
(apps/plugin/src/agent-bridge-relay.ts) moved from behind PRISM3_DEV to behind PRISM3_NETWORK, so it is in the dev
build and in release/, and absent from "Prism3 Studio Offline" (release-offline/), which offers the file mailbox only.
The plugin manifest lists ws://localhost:17331 in allowedDomains, with a reasoning that names the local connection, and
no devAllowedDomains. A connection to the bridge server (tools/figma-bridge/server.ts) becomes the plugin only by
proving a pairing token (#3204, Q3204.1 A): the server issues a one-time code only on demand (a figma_status call while no plugin is
connected, or a --pair start), live for 10 minutes, with at most 3 codes retired by wrong guesses before pairing closes
until the next request (Q3204.5 A). The plugin asks for it once
per machine and keeps the token in figma.clientStorage, and every later connection answers the server's challenge with
an HMAC of the token. The secret behind the token is kept in a user-only file, and --rotate replaces it. The server
still refuses, with 403 before the handshake, an upgrade whose Origin is not "null", and binds to loopback only, as
defense in depth. The Activity drawer's link word names the transport: "Listening · bridge" or "Listening · mailbox",
and "Listening · mailbox only" in "Prism3 Studio Offline". The run-code command stays dev-only. AGENT_PROTOCOL_VERSION stays 1. No committed artifact or
component surface moves, and CONTRACT is unchanged.

[claude-verify-unsharded-hint · patch · 508e99e6] When a sharded gate (the chrome suite) fails or times out in `npm run verify`, its output now ends with a line
naming `npm run verify -- --unsharded` beside `VERIFY_TIMEOUT_SCALE` (#3227, owner decision Q-CI2 A): on a machine
with few CPUs the side-by-side shards compete for them, and one whole run is the better way out. A self-check arm
fails by name if the hint is dropped from a FAIL or time-out, or printed under a PASS. Three comment headers in
`apps/studio/` now describe the sharded default. No engine code, committed artifact or token moves, so CONTRACT is
unchanged.

[claude-verify-chrome-shards · patch · 32b3b7b9] `npm run verify` runs the chrome suite in CI's shards, side by side (#3216): the `chrome` row starts one
`test:chrome` per shard at once, each with `CHROME_SHARD=<n>`, reading the shard list from
`apps/studio/chrome-shards.mjs`, and reads as a PASS only when every shard passed. `--unsharded` runs it
whole. `shardMapProblems` holds the shards verify runs to `ci.yml`'s matrix and the shard map, by name, in
`lint-doc-gates.ts` and before every local run. `plugin-test` gets a measured time limit of its own (#3183).
The review procedure leans on CI for the full gate list. No engine code, committed artifact or token moves,
so CONTRACT is unchanged.

[claude-3189-baseline-adopt-paged · patch · 5bd8df90] Capture baseline and Adopt read the file once, a page per turn (#3189), through the update's run host (`runHost`, #3177),
in place of a whole-file search per set in one turn. Each posts `run-progress` readings (`capture`, `adopt`: check, the
def reached and n of N, finish), and the panel's status strip shows an agent's run in the command's Activity words, with
no Stop and no clock. Results are unchanged. Plugin and panel only: no committed artifact, emission or component surface
moves, and the executor is unchanged.

[claude-nb-secondary-floor · minor · c6899434] The page's secondary ink can be fitted on the page (owner Q-TXT1 A): a new optional brand input,
`secondaryTextGround: floor | page`, default `floor`. `floor` keeps today's fit, where `text.secondary` and
`icon.secondary` clear their bar on the contrast floor (`background.secondary` unless `floorStep` moves it). `page`
fits them on `background.primary`, the lightest secondary that still clears the bar on the page, in light and dark;
high contrast keeps the floor fit; the role's
description and `.ai.json` per-surface wording are measured, so they say it holds on `background.primary` and falls
below the bar on `background.secondary`. The inverse band keeps its own floor. The reference brand's legacy fixture
sets `page`: `text.secondary` and `icon.secondary` move from neutral.550 (#636A6F, 5.49:1 on white) to neutral.500
(#70767C, 4.59:1) in light; dark keeps 450, and both high-contrast modes are unchanged. Every brand that leaves
the input unset emits byte-identical artifacts. No token name moves. CONTRACT unchanged.

[fix-3205-usage-example-width · minor · f704c656] Plugin: a usage-panel example is never narrower than its component declares (#3205). Dialog's Anatomy example drew about 60px wide, its title and text one letter per line, because the specimen kept the template placeholder's hug: the draw sized a specimen from the sizing its member reports, and a member read as hugging was left to hug. Now a def that builds its root at a width (placementWidth or builtSize) gets a fixed specimen at its member's width, with that width as the specimen's minWidth too, whatever the member reports; a def with a literal root minWidth gets that floor on a hugging specimen. Every drawn panel is due once, so Update redraws each in place.

[claude-3200-field-label-primary · minor · 91c609cb] Every field host nests FieldLabel at emphasis=primary, and FieldLabel's own default is primary (#3200, owner decision
Q-PH1 A). The hosts: Text field and the three built on it (Password field, Search field, Card number field), Textarea,
Select, Code input, Counter, Checkbox group, Radio group, Segmented control and Slider. The label now leads in
color.text.primary and the placeholder keeps color.text.secondary, so the two no longer read as the same gray.
FieldLabel's emphasis axis is ordered [primary, secondary] so its first member carries the new default; secondary
stays selectable. An Update swaps each placed label instance to the primary member in place, keeping every id and
hand edit. No token name moves, so CONTRACT is unchanged.

[fix-3209-no-proxy-over-host · patch · 2284603a] Update check and apply: no Proxy over the Figma host (#3209). #3177 answered the run's searches from one read by wrapping
the host in a JS Proxy (withRoot, readRun's root) whose get trap returned bound copies of its methods. On Figma those
methods are own data properties, neither writable nor configurable, and a Proxy over them must return their own value,
so every check and apply threw on getLocalTextStylesAsync and left every set Due. The wrappers are now plain objects
(apps/plugin/src/host-facade.ts) whose fallback is a Proxy over an empty object, which no invariant binds; componentFigma
in mcp-steps.ts had the same exposure and moves too. The shim gains fixHostMethods, which fixes a copy's methods as the
host does, and the update-apply and mcp-paste suites run over it. The read-once behavior is unchanged; no committed
artifact moves.

[claude-3150-chrome-motion · patch · 754d6944] The chrome moves (#3150, the owner's Q3150.1–11 A, 2026-10-31), on the plugin and the web studio alike, from one stylesheet. The Activity drawer slides up from the bottom edge and sinks back on close, at 1280 and as the sheet at 380, with its chevron turning as it moves. The 380 strip shifts in with the first run. The bar row's dot for a result nobody has opened pops in. A menu (Theme, Inspect, the brand menu) shifts in, and a tooltip fades in. A dialog (Update file, the start window and its guard) scales in over a fading scrim. The error strip fades in and out, and Update file's rows fade in once the file is read. Fold-out content fades in, with its height snapping, and collapses at once. A panel enters on the default theme's normal duration (200ms), a small surface on the fast one (100ms), and every exit leaves on the fast one, on the enter and exit easing roles only. Under reduced motion every transform drops and every surface crossfades on 100ms. Resize, live text, minimize and restore, tabs and page changes do not move. A surface the shell removes leaves at once. These are chrome only: no token, emitted tree or component surface moves, so CONTRACT is unchanged.

[claude-wallet-button-styles · minor · 933cf19d] WalletButton draws each wallet's own button per style (#3174). A new style axis carries each provider's styles in its SDK's own names (Apple Pay black, white and white-outline; Google Pay black and white; PayPal gold, blue, silver, white and black; Shop Pay purple), valid provider × style pairs only, with any first: the stand-in with the provider's logo and no fill, at the coordinate every member built before keeps. Each style shows the logo exactly as the provider's SDK draws it, on the ground and 1px edge the SDK paints, from a new button/ mark kind in the provider logo set (11 marks, captured from each provider's public SDK on 2026-10-30, each with its provenance record). The logo binds the button's height, so each provider's logo-to-height ratio holds at every size. The code prop buttonStyle becomes style, an enum of the same names, with any passing no style to the provider. Google Pay has no small member, as Shop Pay has none, because its SDK draws nothing under 40px. WalletButton goes from 20 members to 68.

[claude-3198-accordion-divider · minor · cb5f9b78] Accordion gains a `divider` boolean (#3198, owner decision Q-ACC2 A): a Figma component property, on by default, bound
to the nested Divider's visibility in every one of the 48 members, and a code prop of the same name and default. The
Divider part is now optional. An Update on a file built before it adds the property in place, keeping every member and
node id and every hand edit. The docs and the .ai.json say when to turn it off (DRAFT prose, for the owner). No token
path moves, so CONTRACT is unchanged.

[claude-3170-busy-strip · patch · dcbeaf76] The plugin's busy states (#3170 part 2, Q3170.1–6 A): a status strip at the panel's foot for the read after open (page n
of N) and Update file's run (the set or stage, n of N, a bar by sets, the elapsed time, "Still working on <set>" after
3 s of silence), the checklist's Updating and Updated rows, every writing control off with "Update is running", "Stop
after <set>" at a set boundary, and the verdict line. The in-place update and Apply Theme post `run-progress` and hand
the thread back at every set or stage boundary, after about 50 ms inside a set, and every 200 color variables. Plugin
and panel only: no committed artifact, emission or component surface moves, and the executor is unchanged.

[claude-3171-grids-page · patch · 325c4ff9] `style-guide-groups.ts`: a third tier, `layout`, with two groups, Grids above Containers, for the plugin's Grids & layouts page (#3171, owner decisions Q3171.1–7, all A). `styleGuideGroupOf` returns `grids` for a `grid` guide and `containers` for a dimension guide of container widths (the new `container` fact). No emission changes.

[fix-3192-single-component-placement · patch · a57ab05e] Plugin: a single-component def (Icon, ProviderLogo, Spinner) no longer lays its grid out from the page origin (#3192). A fresh block is placed as the page move already places a single-component block: right of everything on the page, header included, level with the page's top set or component, so the block header Provider logos gets (#3172) lands clear of the page's own; on an empty page it still starts at the origin. A component that Update file (or a re-run build) adds to an existing block extends that block: one pitch right of the row that holds its kind (the `provider` in `provider-logo/provider/facebook-blue`), else the first free slot of the block's own grid. Either way it overlaps no node on the page, and existing components keep their place and id. EXECUTOR_REVISION rises to 44. Its reach entry names icon and provider-logo, and the ten sets whose fresh build in the reach gate moves only its page position, because the dependency blocks prebuilt on their page no longer overlap. No emitted artifact, token or projected component surface moves.

[fix-2497-bridge-resend-on-reconnect · patch · b1ec365f] The desktop bridge keeps a command's result across a plugin reconnect (#2497). A long command, such as a minutes-long
update-components apply, used to fail with "the plugin reconnected while this command was running" while the plugin
finished it anyway, so the result envelope was lost. The plugin's relay (apps/plugin/src/agent-bridge-relay.ts) now keeps
the commands it delivered across a lost socket and its last 8 results by command id. On every connect its hello names the
ids it holds, and it re-sends the kept results. The bridge server (tools/figma-bridge/server.ts) keeps a call waiting for up
to --grace-ms (default 120000) after a disconnect, answers it with the first result that carries its id and logs a repeat
as ignored. It never re-sends a command, so nothing runs twice. A command the reconnected plugin does not hold fails at
the hello with that reason. The wire gains only the optional hello field `held`; the command and result envelopes are
unchanged, so AGENT_PROTOCOL_VERSION stays 1. No committed artifact or component surface moves, and CONTRACT is unchanged.

[fix-3172-provider-logos-header · patch · 728467ab] The provider logos get a section header of their own on Icons & assets (#3172, owner decisions Q3172.1–3, all A). In
the plugin, a def a page's taxonomy leaf lists in `blockHeaders` (provider-logo, titled "Provider logos") gets a
Size=Medium `_Section-header` 80px over its own block, tagged with the def (shared plugin data `headerFor`), beside the
page's one header, which stays the lead's and is measured without the block. Build draws it; Update and Set up file move
the header on the former Brand marks page with the marks (same node and id), rewrite its Title while it reads the
placeholder or the old name ("Brand mark", "Brand marks") and its Description while it reads the placeholder, and
report the emptied page as safe to delete. Update lists the header in its check, so a file whose marks already moved
gets it on the next run; a second Update does nothing. No committed artifact moves.

[claude-update-paged-search · patch · c956a7da] The Update check and apply no longer search the whole file in one turn, several times per set (#3177). Each run reads
the file once, a page per turn, and every set's lookups are answered from that read. The apply reads a page again after
it writes the set on it, and the whole file again after it moves sets between pages.

[claude-plugin-open-no-full-walk · patch · 97c412dc] Plugin open no longer searches the whole file in one turn (#3170). The read of the file's sets loads and searches
a page per turn, and requests made while a read is going share it. The hand-edit pass finds each set in that read
and projects one set's plans per turn. The panel's first turn posts the brand and the settings before any read starts.

[claude-toast-message-14-3165 · minor · fa5d9be7] Toast's message is 14px, `type.body.sm.default`, not 16px (owner request, #3165), after the option rows' 14px label
(#3153). The card takes a floor at `size.md.height`, bound as its `minHeight` (Q3165.1 A), so a one-line toast with no
action measures 36 / 44 / 56 at compact / comfortable / spacious, on the control-height ladder, instead of 33 / 37 / 45.
With the action it stays 52 at comfortable. The success glyph sits in #3153's line-box cell (a floor of the message's
`type.body.sm.line-box`, centring the glyph), so it is centered on the message's first line. No other text part moves: the action is a nested Button with its own label
type. Toast's projected plan moves (2 members, same count). No token path moves, so CONTRACT is unchanged. A file built
before updates both members in place.

[claude-link-x-small · minor · 93b1624f] Link gains an x-small size (#3179, owner decision D-A5 A): 12px body text, `type.body.xs.*` (the inline default binds
`type.body.xs.default-link`), for dense metadata such as an order row or a legal line. The value is `x-small`, the word
Icon and Spinner use for the rung below small (Q3179.1 A), placed after medium in the axis. The trailing icon stays 16px
(`icon.size.xs`). Link's set goes from 144 to 192 members; an Update adds the 48 x-small members and leaves the 144 in
place. No token is added, so CONTRACT is unchanged. `lint-hit-target` gains a standalone Link arm that holds each size's
line box to WCAG 2.5.8's 24px, as drawn or through the code-side hit area its codeOnly states (x-small 18px, small 21px).

[claude-option-row-gap-3173 · minor · fb74f54b] Checkbox.Row, Radio.Row and Switch.Row set the gap between the control and the label to 8 / 12 / 12px (small / medium
/ large; Switch.Row has no large) at comfortable density (#3173, owner decision Q3173 A). Medium moves from `space.100`
to `space.150`; small and large are unchanged. Density still moves the gap one step, so compact is 6 / 8 / 8 and
spacious 12 / 16 / 16. Checkbox.Group and Radio.Group follow, because they nest the rows. The description sits in the
label's text column, so its start edge moves with the gap. An Update corrects an existing file in place: the medium
members of each row are rewritten, every key and id kept. No token name moves, so CONTRACT is unchanged.

[claude-3138-two-builds-fonts · minor · 984b6d96] A serif face falls back to a serif (#3140, owner decision Q3138.6 A). A curated family-name map (`font-class.ts`) gives a
known serif or serif display family the serif tail, `ui-serif, Georgia, Cambria, Times New Roman, Times, serif`, in
place of the sans one, so a page that can't load the face draws a serif. An unknown family keeps the sans tail, an
authored full stack is trusted verbatim, and a face on `code` keeps the mono tail. No new brand setting. The example
brand's Playfair Display display and title faces, and their typeface primitive, move to the serif tail; the reference
brand's faces are sans and do not move. No token is renamed or added, so CONTRACT is unchanged.

[claude-3180-accordion-label-regular · minor · 4aa5b7f5] Accordion's title binds the regular label composite, type.label.{sm,md,lg}.default, instead of emphasis at every size and
for every brand (#3180, owner Q-ACC1 A). The size ladder and the label line box (#2586) are unmoved: every label composite
at one rung shares its size and line height. The projected surface moves (48 members, same count, new digest), the
component page and specs, and the token-usage report. An Update rewrites the title's text style in place; a member
hand-edited on its header keeps that edit, because the as-built record is per node. No token name moves, so CONTRACT is
unchanged; the executor is unchanged, so EXECUTOR_REVISION stays.

[claude-provider-logo-3148 · minor · eb474af7] BrandMark is ProviderLogo (#3148, owner decision Q847 A): the def `brand-mark` is `provider-logo`, display name "Provider logo", and its Figma components are `provider-logo/<kind>/<name>`. The marks are third-party providers' logos, not the design system's own brand. `COMPONENT_RENAMES` records the rename, so Update file renames the components of a file built before it in place, each keeping its id and every instance placed from it. WalletButton, CardNumberField and SignInButton nest the new name. The vocabulary modules are `provider-logo-glyphs.ts` and `provider-logo-set.ts`, their exports `PROVIDER_LOGO_*`, and the coded names `ProviderLogo`, `ProviderLogoName` and `ProviderLogoProvider`. No token name moves, so `CONTRACT_VERSION` stays.

[claude-option-row-14-3153 · minor · 8a26aeb1] Checkbox.Row, Radio.Row and Switch.Row set their label one body rung below the row's size, for every brand, with no
lever (#3153, owner decision Q852; Q3153.1 A, Q3153.2 A). A medium row is a 20px control beside a 14px `body.sm` label;
small and large are 12 and 16, and Switch.Row is 12 and 14. On Checkbox.Row and Radio.Row the control cell follows the
label's own line box: the line box is the cell's minimum height and the cell hugs the control, so it is max(control,
line). Where the control is the taller, the label is set down by half the difference, so the control stays centered
on the label's first line. Switch.Row keeps a fixed cell one label line tall, because growing it to the 32px track
would take the medium row to 48px, off the 44px ladder. The rows' minimum heights are unchanged, except compact small,
which lands on its 28px floor instead of 29.

Checkbox.Row and Radio.Row now project `description` into Figma (owner decision Q853 A). It sits under the label in a
new text column, so it starts at the label's start edge. It is one type step below the label, floored at 12px (12, 12
and 14), in `color.text.secondary`, 4px under the label. A `description` boolean, off by default, shows it, and a
`description text` property sets it. In existing files one Update inserts the text column and moves the label into it,
keeping every node's id; the description is added hidden.

Two token families join the guaranteed surface (CONTRACT 14.13.0, MINOR): `type.body.{xs,sm,md,lg}.line-box`, one line
of each body rung, and `control.size.{sm,md,lg}.label-inset`, the label's set-down, max(0, box − line) ÷ 2, which is 0
in every corpus brand at comfortable density. Both are Figma variables in the `control` collection.

[claude-list-spacing-3155 · minor · b6aa9a9e] List and List.Item spacing (#3155, owner decisions 2026-10-29). The List's item gap is one step wider at every size,
12 / 16 / 20px (`space.150` / `200` / `250`), revising Q280.2 A's 8 / 12 / 16; it still follows density. List.Item's
bullet is 6 / 8 / 8px (`space.075` / `100` / `100`; medium 8 the owner's, small and large Q3155.1 A), bound through a
new component key `size.{size}.bullet` on the space ladder instead of the radio dot (`control.size.{size}.dot`), so it
no longer follows density or the radio dot setting. The icon marker column is one step wider, 32 / 40 / 48px
(`space.400` / `500` / `600`; medium 40 the owner's, small and large Q3155.2 A), revising Q280.1 A's 24 / 32 / 40, so the
icon sits 12 / 16 / 16px from the text. The bullet and number column keeps Q340 A's 20 / 24 / 32. The radio dot
setting's description no longer says list bullets follow it. An Update corrects an existing file in place: 6 List.Item
members (bullet and icon) and all 9 List members are rewritten, every key and id kept. No token name moves, so CONTRACT
is unchanged.

[feat-facebook-brand-blue · minor · aadd9056] SignInButton's Facebook styles and the facebook marks move to Facebook's current brand blue, #0866ff, from #1877f2
(#3136, owner decision Q837 A). The blue style's fill and the white style's label ink are #0866ff, and `social/facebook`
and its derived `provider/facebook-blue` paint #0866FF. White on the new blue measures 4.82:1, so every SignInButton
style now clears the 4.5:1 text floor at rest and focus-visible (the Facebook hover and pressed states, under the
Q-S13 A wash, measure 3.00 to 4.13:1 and are recorded as contested), and the 4.23:1 provider-shortfall note is gone. No member, name or token moves,
so CONTRACT is unchanged.

[claude-add-queue-3129 · patch · a964443e] Sets to add are chosen on Components and kept in the file (#3129, Q832 A, Q833 A, Q3129.1–13 all A, Q3129.14 B, Q3129.15–16 A). In the plugin,
Components draws one box per family on each row the file could add a set of (a family partly in the file queues its
missing parts), three-state boxes on sections, and Select all and Deselect all on each tier's caption line; a queued
set's tag reads To add. The shared settings sit under a Component settings tier, the page title moves to the left of the
levers header with the search flush right, and Components shows no mode control and always previews Light,
putting back Theme's mode on the way out, as Palettes does. Each box posts one new
`add-queue` message, and the plugin keeps the queue in the root's shared plugin data, one `addQueue.<defId>` key per set
in namespace `prism3`. `file-sets` and `file-due` carry the queue, minus the sets the file holds and the sets the engine
cannot build. A build that lands a set whole clears its key where the as-built ledger records it, and every Update file
run ends with a queue write that clears the keys of sets the file holds or the engine dropped. Update file lists the
queue and the due sets under one Components section, as To add (Remove, Remove all from two rows up, Add all on a fresh
file, absent when the queue is empty) and Due, with Components' names; a fresh file no longer opens with every set ticked. The badge counts the
queue too, and its name splits the count ("Update file, 7 to add, 3 due"). The web studio is unchanged. No emitted
artifact, token or projected component surface moves, and the executor is unchanged (`EXECUTOR_REVISION` holds).

[claude-executor-reach-3101 · patch · df427653] Update file counts a component set as due after a plugin release that changes how Prism3 draws components only when
that change redraws the set (#3101, the follow-up to Q811.1 / Q820 A). Each EXECUTOR_REVISION now names the sets it
redraws in the plugin's `executor-reach.json`; the as-built ledger and the update's dry run read a set recorded under an
older revision as current unless a revision since then names it. A new gate, `lint-executor-reach.ts`, draws every set
with the base's executor and the PR's in the component shim and fails an entry that names fewer sets than moved. The
record starts with the revisions measured back to its floor; a set recorded at or below the floor is due as before.
No committed artifact moves.

[feat-divider-vertical-labeled · minor · 1992b6ab] Divider gains a vertical labeled member (#3143, owner Q3143.1–.7 all A): the set goes from 6 to 7 members. The label
stays upright between a line above and a line below; the root is a column (`directionWhen` on `container`) that hugs the
label across and is `size.xl.height` tall, with `space.150` between the label and each line, following density. New
schema field `PartDef.sizingWhen` (hug only, per coordinate, validated, resolved before projection beside
`directionWhen`). The projection no longer writes a bound size on the axis a part grows along (build check 1); only the
divider's plans move. The two plain vertical members' root becomes VERTICAL with the same pixels. No token name changes,
so CONTRACT is unchanged; neither executor changes, so EXECUTOR_REVISION is unchanged.

[claude-sign-in-button · minor · c63a7ccb] SignInButton (#2343 PR 5): Continue with Apple, Google or Facebook, drawn by Prism3 to each provider's rules (owner
decisions Q-S1 to Q-S17, all A, Q831 A and Q846 A). It joins the catalog with 96 members (8 provider × style pairs ×
3 sizes × 4 states), on its own Sign-in button page. One provider glyph joins the mark set, provider/facebook-blue,
derived from social/facebook and scaled to the provider inset, so Brand mark gains one member. Apple black and
Facebook blue paint the black provider/apple and provider/facebook glyph white (Q846 A): the literal entry's markTint,
read by a `literal: 'mark'` nest, becomes the plan's literalTint, which both executors paint on every vector of the
glyph and read back (EXECUTOR_REVISION 43). No other host or mark may tint. The engine gains a literal record
(ComponentDef.literal, PartDef.literal):
a provider's own fill, edge, wash, label ink, wording and font, carried as values and written as plain paints and a
literal font by both executors, with read-back. A nested part may also map several host axes at once
(NestingRelation.variantWhere), which the provider glyph needs. No token name moves, so CONTRACT is unchanged.

[claude-brand-mark-borders-3134 · minor · 38460954] Brand marks (#3134, owner direction 2026-10-28). `PartDef.tileEdge` gains `edgeWhen`, which narrows the 1px edge alone to the members it names: a tile it leaves out keeps its bound corners and its crop and draws no stroke. BrandMark names only the tiles whose own fill is under 3:1 against a white page, read from each file, so `payment/amex`, `payment/generic`, `payment/shop-pay` and `payment/venmo` lose their edge and every white tile (and Klarna's pale pink) keeps it. `provider/apple` and `provider/facebook` are drawn black (#000000) where they were white, so they show on the canvas like every other mark (the owner: "a consumer tints them as needed"). No token tree moves.

[claude-reference-brand-type · patch · a55f0be9] The reference brand's redesign seed brief (`examples/nb-redesign.design.md`) now matches the brand's stored typography input in full (owner decision Q821 A): its stored leading (`lineHeights` compact 1.25 and snug 1.20, `leadingShift` +1 on display, title and body), label weights default and emphasis, and fluid sizing from a 375px viewport. No committed artifact moves; every other brand is byte-identical.

[claude-due-by-plan · patch · 913aafc3] Update file counts a component set as due after an engine update only when its drawing would change (#3082 part 1,
owner decision Q811 A). The plugin's as-built ledger records, per set, a print of the plans it was drawn from: one hash
of the projection, plus a short hash per part and facet. When only ENGINE_VERSION has moved, a set whose plans print as
recorded reads current and is re-recorded by the next write; a set whose plans moved is due, with a one-line reason
naming what moved ("Engine update: focus ring size"). An EXECUTOR_REVISION move still makes every set due (Q811.1).
An entry from before this change, with no print, stays due once the engine has moved past it, so the next update records it. No committed artifact moves. The badge's live recount and the ledger's answer at open read the same prints, memoized across reads.

[claude-style-guide-effects-frame-3135 · patch · 8d873e92] `style-guide-groups.ts`: the effect styles and the gradient styles get a group each, Effect styles and Gradient styles, stacked last on the semantic page, and `styleGuideGroupOf` returns them for `shadow` and `gradient` (owner direction on #3135, superseding Q378 Q6 A for those two). No emission changes.

[claude-chrome-size-pass-agent-switch · patch · 39f18234] The chrome's size pass and the Agent switch (#3083; the owner's Q3083.1 A, Q3083.2 B to Q3083.7 B, 2026-10-28), on the plugin and the web studio alike. Type takes a step down: the view title 20 to 18, section and dialog titles 16 to 14, and body and controls 14 to 12, with secondary text staying 12. Controls take a step down too: buttons and segments 36 to 32, and fields, selects and the segmented track 40 to 36. The top bar, the tab row and the narrow tier's 28 stay. The plugin's Agent tile becomes a bare "Agent" and a switch on the top bar, with a 36 × 20 track and a 16px knob, and the label drops at 380. The tile's dot and the on mark's fill and edge are gone. In Update file, the hand-edits choice moves from a segmented control in the body to a compact "Hand edits" select in the foot, before Cancel and Update file, reading "Keep", "Overwrite" and "Accept as baseline" (DRAFT). These are chrome only: no token, emitted tree or component surface moves, so CONTRACT is unchanged.

[claude-glyph-viewbox-per-kind · patch · c4e74377] The paste executor's glyph artboard read-back compares at Figma's float32 precision, so a brand logo drawn at a width
float32 cannot hold exactly (34.97 × 24 reads back 34.970001220703125 × 24) no longer reports a false "sized to its
ink" miss (#3127). A miss on a non-square glyph now names its own box rather than a square. No committed artifact moves.

[claude-type-caption-tracking-levers · minor · 5837a115] Two opt-in typography levers (#3077, owner decisions 2026-10-27, caption A and tracking A). `typography.sizes` takes
`caption` at the brand level: md and lg, one static size each, on the size ladder, at or above 10px, through the strict
ramp check (caption.xs and caption.sm stay pinned by sizeFloor and captionFloor; sizeOverrides and each mode's
typeSizes stay heading-only, so caption keeps one size in every mode). `typography.tracking` pins every style in a text
type to one named letter spacing role, any of the nine including open, in place of the size-derived role and its
trackingShift nudge, for the pinned text types only. Unset, both change nothing, so every brand that sets neither is
byte-identical. The reference brand sets them: its redesign seed builds title.2xs 20px (18px on mobile), caption.md
10px, open (+1%) letter spacing for display, title, body, caption and label, and wide (+2%) for eyebrow; its legacy
fixture takes the caption and letter spacing parts. Values move, not names, so CONTRACT is unchanged.

[claude-3128-update-fresh-hang · patch · 5e9acf90] Plugin: Update file on a fresh file no longer stops for good at its second set (#3128). A build releases the run guard as soon as its verdict posts. Until now it held the guard through the settle probe that follows, which is telemetry and writes nothing. The panel posts its next set, or Update file's update step, the moment that verdict lands, so the post was refused and the panel waited for a verdict that had already been sent. The panel now also ends a build run when the host refuses a set the run posted: that set reads as failed, with the host's words, the sets after it as not built, and the run no longer reads as running. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-search-components-levers · patch · 3ad56726] Settings search reaches every lever (#3093), on the plugin and the web studio alike. On Components, search now matches
the levers in each section's settings blocks by label, description and key, opens the block that holds a match and shows
only the matching levers in it, so "dialog", "dialog surface", "white" and "raisedSurface" all find Dialog surface. On
every page a lever whose page draws its own label or description is still found by the manifest's words. Color › Surfaces
& fills draws the panel over the scrim, `foreground.raised`, as a read-only row whose "Set by Dialog surface" link opens
that lever in Components › Dialog. Studio only: no token, emitted tree or component surface moves, so CONTRACT is
unchanged.

[claude-radio-dot-lever · minor · 2eea2c36] Radio dot size (#3086, owner decision Q816 A, with no new token): a new optional brand input, `radioDot: 50 | 60 | 70 | 80`
(Form, after Banner style, default 50). It sets `control.size.{sm,md,lg}.dot` to that share of the radio's box edge, at
every size, snapped to the 2px sub-grid and never wider than the box minus its 2px ring. 50 is half the edge, the dot
every brand had. Only those three tokens' values move, so no token is added and CONTRACT is unchanged. The reference
brand sets 70 in its legacy fixture and its redesign seed: 12 / 14 / 16 at sm / md / lg (was 8 / 10 / 12). Its sm and
lg dots link to `core.dimension.12` and `.16`; its md dot is a plain 14px, because no dimension step holds 14 there and
the setting adds no primitive. List bullets and the badge dot bind the same tokens, so they follow. Every brand at the
default is byte-identical. Radio.Control's description now says the dot is half the ring unless the brand sets a larger
one. The lever copy is a DRAFT for the owner. The Studio and the plugin draw it in a new Radio section on the
Components page, as Radio options.

[claude-rebind-annotations-layout-fills · patch · 9b665d7b] prism3-rebind: section 9 asks for the differences as in-file annotations by category and for the rebuilt page laid out like the source; section 4 gains a trap row for unappended nodes left on the current page, and widens two: the image-fill row leaves a hand-set gradient out, and the parking row covers mains reached through existing instances. Skill prose only.

[claude-update-badge-live · patch · 875cd4c0] Update file's badge counts everything Update file would change, live (#3081, Q810 A). It counts the component sets due
against the brand the panel holds, plus one item for Theme changes the file does not hold yet, and the button's
accessible name says the same count. The panel asks for the count after a setting changes (debounced, one ask for a
burst) and after each write's verdict, with a new `due-request`. The plugin answers with `file-due` from the as-built
ledger and the file's stored brand alone: it reuses the sets the last `file-sets` read found, and never runs the full
check. A write starting or ending makes it read the file's sets again. The Theme item comes from the stored brand, which
Apply Theme writes, not from the panel's `isDirty`, whose baseline Apply does not reset. No emitted artifact, token or
projected component surface moves, and the executor is unchanged.

[claude-branded-button-factory · patch · 40185ffd] The branded-button helpers (#2343 Q-S11 A): WalletButton's provider map, height, radius and ring tokens, nested mark
part, focus-ring part and height exclusions move to packages/engine/branded-button.ts, for SignInButton to share.
WalletButton's projection is byte-identical: no committed artifact and no component surface moves.

[claude-rebind-slot-and-paragraph-links · patch · 0a9b10bf] prism3-rebind gains four plugin-API trap rows (slot sample content, stale handles after a slot edit, plugin restarts clearing globals, links inside long paragraphs) and widens the stalled-import row to cover serial import loops and the fallback to instances already in the file.

[claude-plugin-open-no-page-load · patch · 1f48afbf] Plugin open no longer loads every page before the panel is ready (#3110). At `ui-ready` the main thread answers
`file-sets` from the as-built ledger alone, one root read with no page loaded, marked `partial`, and the badge counts
from it. The full read follows: it loads the pages one at a time and hands the thread back between them
(`loadPagesYielding`), so the file keeps answering, then replaces the ledger's answer. Every other place in `main.ts`
that needs every page loads them the same way, Build style guides and its cleanup included. The agent link's component
payloads (`mcp-steps.ts`, off by default) are not changed. Both reads after open carry `atOpen`: the panel never lets one replace
an answer it asked for, so a checklist opened mid-read keeps its own answer. The panel reads a set the ledger
does not name as Checking until then, and Update file's checklist waits for the full read. `PRISM3_OPEN_TIMINGS`, when
set to an array on the global, collects each stage's time. No emitted artifact, token or projected component surface
moves, and the executor is unchanged.

[claude-grid-margin-note-correction · patch · 98795ca4] Correction to the claude-grid-margin-lever note (#3065, #3070). That note gives the reference brand's md margin of 44 as
"whole-pixel 41px columns at 1440 with 24 columns and 16px gutters". The 41px figure is the brand's desktop spec in
its own two-mode layout, where md (768+) carries the 24-column, 16px-gutter desktop grid. It is not true of the
engine's 5-breakpoint grid, where md is 8 columns and a 44 margin gives 71px columns at 768. The margin, its link to
`core/dimension/44` and every emitted value are as that note says. Prose only: no committed artifact moves.

[claude-bridge-handshake · patch · 39245096] The figma-bridge MCP server (tools/figma-bridge/server.ts) answers initialize by the engine server's rule (#3109): a client asking
for 2025-11-25, 2025-06-18 or 2026-07-28 gets 2024-11-05 back, and 2024-11-05 is echoed. It answered 2026-07-28 before, which
Claude Code refuses, so the plugin's agent link could not be registered. The rule moves into one exported function in mcp.ts,
negotiateHandshakeVersion, which both servers call; the engine server's answers do not change. The probes live in
mcp-handshake-probes.ts with a register of every MCP server, and mcp-test.ts fails on an initialize handler the register does not name.
No committed artifact or component surface moves, so CONTRACT is unchanged.

[claude-outline-hover-fill · minor · 11175559] Opaque outline hover fill (#3071, owner Q824 A): a fourth `outlineInteraction` value, `opaque-fill`, gives outline and
text controls an opaque hover and pressed fill, `interactive.<color>.hover-fill.{hover,pressed}` plus `inverse.` twins,
beside the neutral wash. A new lever, `outlineHoverFill`, picks the page step per editable mode
(`{ light: { hover: neutral.050 } }`); pressed defaults to the next step toward the ink. Unnamed modes, the generate-only
modes and every inverse band take the default rule: the neutral step nearest 1.15:1 against the ground, and the next
step for pressed. The control's label and icon (`interactive.<color>.{text,icon}.{hover,pressed}`) are measured on the
fill and clamped along their own ramp as links are (#1510), and each names the fill as its second contracted pair,
so hover and pressed are both gated. `applyOutlineInteraction` binds the fill on Button (outline, and text under
`buttonTextHover: fill`), Icon button (outline, ghost) and Flush icon button; Tag, Segmented control and Pagination
keep the wash. The reference brand (its legacy fixture and its redesign seed) sets hover `neutral.050`, pressed
`neutral.100`. The new roles are brand-dependent: CONTRACT is unchanged, and brands without the method are unchanged.

[claude-kept-edit-report · patch · ac3225d0] Plugin: Update file with "Keep" no longer reports a kept hand edit as a part not written as planned (#3086 part 2). A node kept as a hand edit is not written, so the plan's binding is absent there by design. The run report now names it with the hand edits kept, in plain words with the layer name first, for example "1 hand edit kept (dot size)" or "1 hand edit kept (container padding)", never a code name (DRAFT wording, owner Q826 A). A binding the host drops on a node no one edited is still reported as not written as planned.

[claude-card-payment-field · minor · 7b353caf] A new component, `card-number-field` (CardNumberField, #2343 PR 4, the card-number half of #2429): TextField with
the card network's payment tile at the trailing edge of the box, built by the shared field factory (84 members,
TextField's count). The factory gains a third edge, `mark`: the box's trailing cell is a swap slot that binds its
height alone (`size.{size}.mark-height`, `icon.size.sm` at small and medium, `icon.size.md` at large), keeps the tile's
proportion (`aspectLock`), takes no ink from the field at any state (`fixedPaint`), and starts at the generic tile.
`swapDefault` on a `fixedPaint` slot now names a brand mark (`brand-mark/<kind>/<name>`) instead of an icon. The
`brand` prop offers the card networks only (Q-C7 A, the owner, 2026-10-27): a typed list in the def (`generic`, `amex`,
`diners-club`, `discover`, `maestro`, `mastercard`, `visa`), each checked to be a tile in the mark set's tile kind, and
never a wallet or pay-later tile. The tile kind is still read by artboard, so the `card/` to `payment/` rename reached
it without an edit. Only existing token roles are bound, so CONTRACT is unchanged. A new gate, `lint-mark-slots.ts`,
holds the slot to its own literal network list (each a tile in the folder), the generic default and the tile's
proportion;
`lint-mark-colors.ts`'s host arm now refuses any paint on a carried mark and lists its hosts by hand.

[claude-chrome-icons-tabler · patch · 384bd69a] The chrome's glyphs move to Tabler Icons (#3083, Q813 A; the owner picked Tabler), on the plugin and the web studio alike:
every glyph is a Tabler outline icon vendored as path data from @tabler/icons 3.49.0 (`apps/studio/src/shell/icons/`,
with its MIT license), drawn on the 24 grid at a 1.5 stroke, so the rail's 24px icons draw a 1.5px line where they drew
2.25px. The workspace takes no dependency, and the built chrome carries the license. Chrome only: no token, emitted tree
or component surface moves, so CONTRACT is unchanged.

[claude-layout-picker-dimensions · patch · 4bb444a7] The studio's Layout gutter and margin picker follows the engine's link order (#3092, Q785 A): the spacing steps first,
then, in their own group, the brand's core dimension steps that no spacing step has, so a 44px margin can be picked and
links to core dimension 44. The value picker gains named groups. Chrome only: no token, emitted tree or component
surface moves, so CONTRACT is unchanged.

[claude-scrim-strength · minor · d559d841] The scrim's strength (#3050, owner Q825 B, replacing Q825 A): a new optional brand input, `scrimStrength: standard |
strong` (Color, a value setting, default `standard`). It picks which existing `black-alpha` step `color.scrim.default`,
the backdrop behind a dialog or sheet, aliases in each mode. `standard` keeps the steps before the input: 40 light,
60 dark, 60 hc-light, 70 hc-dark. `strong` is 80 light and dark and 90 hc-light and hc-dark, so high contrast stays at
least one step heavier where the ramp allows. No alpha step is added and no token name moves; every brand that leaves
the input unset emits byte-identical artifacts. The reference brand's legacy fixture and its redesign seed set
`strong`, so its scrim moves to 80 / 80 / 90 / 90. CONTRACT unchanged.

[claude-underline-lever · minor · 989e60ee] A brand can set its link underline (#2942, owner decisions Q1–Q6, Q800 and Q801, all A). `typography.underline`
takes `{ thickness, offset }`, each a share of the font size or `auto`. Both default to `auto`. A set value is held to
a whole percent and clamped, not refused: thickness 1–20%, offset 0–50%. A set field emits
`core.font.underline.thickness` or `.offset` (`$type: number`, `$extensions.prism3.figma` a `style-part` with its
PERCENT). Every `-link` text style carries it as `textDecorationThickness` / `textDecorationOffset` PERCENT in
`text-styles.json`, and both Figma write paths (the plugin's Apply Theme and the paste path) write it into every
underlined style, or AUTO when the brand leaves it unset, so a style reused by name never keeps another brand's value.
Plain styles are not touched. The reference brand sets 5% / 25%, in its legacy fixture and its redesign seed brief.
Every other brand's emission is byte-identical. The two paths are brand-dependent, so CONTRACT is unchanged.

[claude-glass-brand-roles · minor · 8ca2a766] Brand glass roles (#3073, owner Q806, Q807 A): a new brand-input lever, `glassRoles`, adds glass fills beside the
shipped `color.glass.surface`, named `color.glass.<name>`. Each names one color source, a semantic role's palette color
read per mode (`role: foreground.primary`, the card ground) or one palette color (`palette: neutral.050`, `white`,
`black`), and an alpha from 1 to 99. The engine emits it as a palette alpha step, `<palette>-<step>-alpha.<n>` minted
through the white/black ramps' `alphaLeaf` (only the steps a mode reads), or the existing `white-alpha` / `black-alpha`
step on white or black, so the Figma variable carries the alpha and a bound fill stays translucent. Names are refused
when they are `surface` or not kebab-case; a role source must resolve to an opaque palette step in every mode; an
override aimed at a brand glass role is refused, and a role source follows an override of its role. The reference
brand (its legacy fixture and its redesign seed) adds `card` = the card ground at 70%. Brand-added roles and their
alpha steps are brand-dependent: `color.glass.surface` is unchanged in every brand, and CONTRACT is unchanged.

[claude-wallet-button · minor · 32c5aa01] WalletButton, the express-checkout button a wallet provider draws (#2343 PR 4): Apple Pay, Google Pay, PayPal and
Shop Pay, on a new `provider` axis, at three sizes and two states. In code it is a container the provider's own
element mounts into, which draws the button (every wallet forbids a hand-drawn one); Prism3 sets the height, a 120px
width floor, the brand's `radius.md` and the focus ring. In Figma each of its 20 members is the provider's area with the
provider's own logo, nested whole as `brand-mark/logo/<provider>` with its own paint, its height bound and its width
from its proportion; the member draws no fill. A size outside a provider's height range has no member: Shop Pay starts
at medium (40px floor) and PayPal stops at medium (55px ceiling). The projector now names a nest of a
standalone-component def by its member component, `<id>/<value>`, with no `nestVariant`, so a component can nest one
brand mark. `test.ts` holds each provider's height range, width floor, Google Pay's half-height corner, the absence of
paint and the unaltered logo against rules typed from the providers' guidelines. Only existing token roles are bound,
so CONTRACT is unchanged.

[claude-ia-rail-polish · patch · f55fc7b3] The IA v2 chrome's rail polish (#2909, the owner's hands-on look of 2026-10-26), on the plugin and the web studio alike:
the rail's labels at 9px and -1% tracking, its icons 24 x 24 in a square 32px mark (it was a 40 x 28 landscape, a
min-width and a min-height on two different tokens), the labels "Components" and "Appearance" whole, Minimize at the
rail's foot drawing a collapse glyph (the mirror of the strip's Restore) and the Agent tile on the top bar where Minimize
was, and Theme's tab row one spacing step wider (space.150 to space.200, 12px to 16px). Chrome only: no token, emitted
tree or component surface moves, so CONTRACT is unchanged.

[claude-divider-labeled · minor · b4c78c77] Divider: a labeled variant, the rule broken by a short centered label such as "Or" (#3051, owner Q3051.1–.7, all A). A new `labeled: false | true` variant axis (the name Pagination.Item already uses) adds one member, horizontal with inset none, so the set goes from five members to six. The labeled member draws a line, the label and a line in one row, `space.300` apart and centered on the label's line box (`type.label.md.line-box`); the label is `type.label.md.default` in `color.text.secondary` behind a `label` text property, default "Or". In code a `label` string prop makes the labeled divider; the wrapper takes no role, both lines are aria-hidden and the label is read as plain text. The schema gains `paintGroup`, a declared admission to the one-box-per-paint-slot rule for one surface drawn in pieces. Accordion and Dialog name `labeled: false` on their nested dividers.

[claude-grid-margin-lever · minor · 9d0d9c8e] A grid margin or gutter off the spacing scale now builds (#3052, owner decision Q785 A). `grid.<bp>.margin` and
`grid.<bp>.gutter` link to the first of these that exists: the `space/*` step with that px; otherwise the brand's
`core/dimension/*` step with that px; otherwise a plain px, flagged off-scale (`$extensions.prism3.offScale` and a
decisions note). The value is never snapped. `resolveGap` no longer throws for an off-ladder override (#1593); it
refuses only a value that is not a length. The reference brand's md margin is 44 in its legacy fixture and in its
redesign seed brief: whole-pixel 41px columns at 1440 with 24 columns and 16px gutters. It links to
`core/dimension/44`, in DTCG and in the Figma `layout` collection, and the md grid style's offset is 44. Every other
brand's emission is value- and alias-identical. No guaranteed token name moves, so CONTRACT is unchanged.

[claude-dialog-surface-raised · minor · 5bf86353] The raised surface (#3049, owner Q721 A; Q3049.1 C, Q3049.2 A, Q3049.3 A, Q3049.4): a new guaranteed role,
`color.foreground.raised`, the panel a dialog or sheet draws over the scrim, and a new optional brand input,
`raisedSurface: card | page | white` (Color, default `card`). The input acts in the light family only (light, hc-light):
`card` holds the card surface's palette step, `page` the page's, `white` the palette's white. Dark and hc-dark always
hold the card, so a dialog keeps its lift. Unset, the role aliases the card's own step in every mode, so every brand
that leaves it unset emits values identical to `foreground.primary`; no existing token value moves in any brand. The
reference brand's legacy fixture and its redesign seed set `white`, so its light dialog panel is white. An override on
`foreground.primary` carries to the raised surface wherever it holds the card. Dialog's panel binds the new role, so
its set builds differently under names that all stay; the primary and link inks are held on it in place of the card
(the same step under the default). The scrim's `.ai.json` names it as the modal surface. CONTRACT 14.11.0 → 14.12.0.

[claude-brand-marks-artwork · minor · 72240599] The owner's brand-mark artwork replaces the placeholders (#2343 PR 3): 74 marks in four kinds. The `card/` kind is
renamed `payment/` (owner decision Q780 A), one full-bleed 32×20 tile for every logo in an "accepted payments" row
(15 tiles: card networks, wallets and buy-now-pay-later, plus `payment/generic`, the owner's "no card type yet"
card). The `wallet/` kind is renamed `logo/` (Q783 A), one 24-high logo per provider hugging its artwork (14
logos). `social/` is the full set of 21, each in full color and as `-mono` (Q782), and `provider/` holds the Apple,
Google and Facebook sign-in glyphs. `social/x` and `social/x-mono` were supplied as `twitter`; the files are the X
glyph. Every file has a provenance record stating that the owner assembled it from several public sources and
hand-edited it, with the sources not recorded. Files were normalized only as far as `emit-marks.ts` requires, each
step listed in the record's `normalized`: clip paths dropped, ground rectangles written as paths, color keywords
written as hex, `<use>` inlined, one gradient transform folded, gradient definitions moved first, and on two social
marks a few coordinates that spilled past the dropped clip clamped to the artboard. No color changed.
`brand-mark`'s `name` axis moves: `card/*` → `payment/*`, the black wallet lockups → `logo/*`, `wallet/paypal` →
`logo/paypal-wordmark`, declared in `COMPONENT_RENAMES`; `wallet/apple-pay-white`, `wallet/google-pay-white` and
`provider/apple-white` are dropped. The plugin's Update now reads a single component under a value the ledger renamed
or dropped, so a mark built before the rename is renamed or deprecated in place. A provenance record may say
`fullBleed: false` (payment tiles only; `payment/generic`, which has no ground), which skips only the tile-ground
check. No token name moves, so CONTRACT is unchanged.

[claude-documentation-specs-tab · patch · ad0c1ac7] Plugin: Documentation's Specs tab is a real control (#2830, Q2830.3 A). Its Draw specs draws the spec panels for the component sets on the current page, through the same action as the agent's draw-specs command, and shows the result under the button. The agent's command still draws every family in the file. Build and Update still never draw a spec panel. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-rebind-checkout-lessons · patch · 6762a04e] skills/prism3-rebind: §2 gains six pre-flight items from a checkout rebuild (structural inventory, key screens by pattern, keys from instanced mains, mapping another typeface by role and size, keeping source copy exactly, excluding plugin widgets); §3 says to fill each breakpoint from its own source; §4 gains six plugin-API trap rows (layout-direction change, FILL text in a wrap row, a pending import blocking other calls and resumed duplicates, exportAsync hanging, a collapsed disclosure without a slot, a text property not driving a nested label). Skill prose only: no committed artifact, token or projected component surface moves.

[claude-card-mark-tile-tokens · minor · 9ac72a40] Card marks are full-bleed tiles whose corners and edge the component draws (#2343, owner decision Q720 A). The four
`card/*` files are re-exported with square corners and no rounded tile, their ground kept, and their provenance
records say so. On every `card/*` member the frame that holds the artwork binds its four corner radii to
`radius.sm` and its stroke weight to `border-width.hairline`, strokes in `color.border.primary`, and clips the artwork
to its corners, so every tile has the same corner and the same 1px edge at every height a host binds and in every
mode. A new `tileEdge` field on a `vector` part carries it, gated on the members it names. Square and wallet marks are
unchanged. `brand-mark`'s plans move for its 4 card members (19 members, same count); only existing token roles are
bound, so CONTRACT is unchanged. `lint-mark-colors.ts` holds the bound edge on every card member, and
`lint-glyph-geometry.ts` refuses a card file that bakes a rounded tile or a border.

[claude-shard-chrome-2898 · patch · 8890f0b5] CI runs the chrome suite (`apps/studio/test-chrome.mjs`) as three parallel shards instead of one job (#2898). The suite's
sections run under `if (runs('<id>'))` guards, `CHROME_SHARD=<n>` picks the sections `chrome-shards.mjs` gives shard n,
and every run writes its record to `apps/studio/chrome-record/`. A new gate, `test:chrome-shards`, holds the records to
the unsharded suite's own section list, each section exactly once, then runs the suite's end-of-run checks over all the
shards. No engine code, committed artifact or token moves, so CONTRACT is unchanged.

[claude-chrome-mode-fit-race-3033 · patch · ccef1a40] The chrome suite reads the preview header's mode control only once it has settled (#3033). The control picks radios
or the select in a frame after the header resizes, and the 4-mode check read it straight after the pane toggle, so at
380 it could see a radio the select was about to replace. Every read in that section now waits until the select shows
or no radio is clipped, for at most 2 s. Test-only: no committed artifact changes.

[claude-rebind-restore-lessons · patch · c19994ec] skills/prism3-rebind: §11 gains the snapshot-and-restore procedure around a structural library publish
(key by path, store values not IDs, prove the snapshot matches the file, diff before writing, report carried /
restored / failed, treat "path gone" as a library regression), and §4 gains two trap rows (no single-field
override reset, so an override equal to the main's value is inert; large results go to disk, not through
context). Skill prose only: no committed artifact, token or projected component surface moves.

[claude-brand-mark-pipeline · minor · 1c83ffed] Brand marks, the second icon type (#2343 PR 1, #2316). Provider marks live in packages/engine/marks/ by kind (social,
provider, wallet, card), named by brand-mark-set.ts and recorded file by file in marks/provenance.json. emit-marks.ts
writes brand-mark-glyphs.ts: each mark's SVG document re-serialized with its fills and gradient stops copied verbatim,
refusing strokes, text, images, masks, filters, clip paths, CSS, transforms and currentColor, and refusing a file with
no provenance record. A new brand-mark component (emitAsComponents) projects one standalone brand-mark/<kind>/<name>
Figma component per mark, drawn from that document with literal fills and no ink: the projector resolves its glyph
against the mark vocabulary and pushes no descendantFills into it. Every mark committed today is a neutral
placeholder, except card/generic. Two new gates, lint-mark-provenance.ts and lint-mark-colors.ts; a brand-mark arm in
lint-glyph-geometry.ts (artboard per kind, ink inside it, every listed mark projected); lint-icon-count.ts holds the
brand-mark prose to stating no count of marks. No token name moves, so CONTRACT is unchanged.

[claude-banner-style-2924 · minor · 762d818a] Banner style (#2924, owner Q693 A, Q707 A): a new optional brand input, `bannerStyle: tinted | outlined` (Form, after
Dialog title size, default `tinted`). One surface for every banner the brand ships: Tinted fills each tone with
`color.foreground.{tone}-subtle`, as today; Outlined fills it with the page color, `color.background.primary`. Both keep
the 1px edge in `color.border.{tone}`, the glyph in `color.icon.{tone}` and the text in `color.text.primary`.
`applyBannerStyle` materializes it into the Banner def before projection, after Dialog title size and before weight
intent, in the plugin's `materializeForBrand`, the lever sweep and the spec chain; it is the identity at Tinted and for
every def but Banner. A value setting: it moves four fill bindings, so Banner keeps its 8 members, axes, properties and
layer names. No token is added and no token name moves, so CONTRACT is unchanged and every committed token emission is
byte-identical. Banner's container note, code notes and usage gain the setting, so its docs, `components.ai.json` and
projected surface move (accepted). The lever copy is a DRAFT (Q2 on #2924). Bold is held on #3038.

[claude-update-theme-unticked-3023 · patch · 38267b64] Plugin: with Update file's Theme step unticked, the checklist's due read, its check and the update measure against the brand the file keeps, not the panel's, so an update without Theme lays the stored brand's plans and the next load reads those sets as current (#3023, Q701 B). Ticking or unticking Theme checks the file again, so the counts shown are the ones the run writes. No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-link-over-media-2986 · minor · a1468523] Link over photography (#2986, owner decision Q690 A): every `text.link.*` role's `avoid_when` in the emitted
`.ai.json`, and its `inverse.text.link.*` twin's, now says that over a photograph a link is set in
`inverse.text.primary` with its underline kept as the link cue, on a media veil (`veil.*`) when the photo is busy,
and that `inverse.text.primary` flips in dark mode while the veil does not. Icon links are unchanged. The same rule is
written into the `prism3-consume` and `prism3-rebind` skills, and `lint-skills.ts` check 8 fails by name if either
skill or any text-link role stops stating it. No token is added or renamed and no value moves, so CONTRACT is
unchanged.

[claude-fixed-paint-hosts · minor · 1fcafd71] Fixed paint and the aspect lock in hosts (#2343 PR 2), the host side of the brand marks. Two new part flags: fixedPaint
(on a slot, overlay or nest) keeps the hosted content's own paint, so the part carries no descendantFills and the plan
states fixedPaint; aspectLock (on a slot or nest) binds the part's height alone, and both executors resize the instance
to its main component's proportion and lock it before the height binds, so a card mark stays 8:5 at any height. A slot
may bind a height only under aspectLock. On Update, a glyph or mark redrawn inside its main component now reads as a
hand edit at its frame and is kept and reported (the as-built record gains an artwork hash, Baseline.art; a record
without it makes no claim), so a brand that edits a brand-mark component in Figma keeps its drawing (owner decision
Q-B3 A). And an untouched glyph that takes no host ink (a brand mark) compares its vectors' fills as well as their
paths in place, so a mark whose provider changed only a color takes the new import. EXECUTOR_REVISION 40 (#3019 took 39). No def sets either flag yet; no token or projected surface moves, so CONTRACT is
unchanged.

[claude-field-hover-border-only-2926 · minor · 4a554256] Fields hover by border only (#2926, owner decision 2026-10-26, Q1′ D and Q2′ A). Text field, Password field, Search
field, Select, Textarea and Code input cells bind no hover wash (`overlay.hover` → `interactive.neutral.overlay.hover`
is gone, and their frame parts paint no overlay slot), under Outline and Underline field styles and under every
outlineInteraction setting, which now reaches buttons, icon buttons, tags, segments and page cells only. Buttons and the
other controls keep their wash, and there is no lever. field.border.hover and inverse.field.border.hover move from two
ramp steps to four above rest in every brand and mode, about 1.9–2.2:1 rest→hover (was 1.39–1.47), and still clear
3:1 on background.secondary (6.4–9.9:1). Rest, focus (border.focus plus the 2px ring) and the status borders at hover
are unchanged. Descriptions, ai.json guidance and the field docs say so. No guaranteed name moves, so CONTRACT is
unchanged.

[claude-glass-effect-style-2869 · minor · 14f5e8ce] Glass (#2869, owner Q464 A; owner decisions Q2869.1–5 A, 2026-10-26): a background-blur treatment for text over the
bottom of a photograph, emitted for every brand. `blur.glass` is a 32px DTCG dimension, so a stock Style Dictionary
build carries it to CSS as `--<root>-blur-glass` for `backdrop-filter: blur(...)`. In Figma it is a FLOAT variable,
`blur/glass`, in a new `blur` collection scoped to effect radii. `color.glass.surface` is the fill, with its alpha in
the value: white at 70% on the light family, black at 70% on the dark, 90% in high contrast. It varies by mode like
the scrim, because Figma forces a variable-bound paint to opacity 1. A new `glass` Effect Style holds one
BACKGROUND_BLUR whose radius binds `blur/glass` in the plugin and the paste path (setBoundVariableForEffect). A file
without the variable reports a miss and keeps the literal radius.

[claude-published-library-safety-2831 · minor · d61c9e23] Update's dry run catches one more change that breaks library consumers, and Update file's checklist shows it (#2831,
#2864). On a published set, a layer the plan no longer has, which the update removes, is now listed as breaking:
consumer overrides on it are lost. When the plan adds a layer under the same parent, the line names that layer as the
likely new name and says a declared part rename keeps the layer in place. Each published set with a breaking change
now gets one "Breaks library consumers" line in Update file's checklist. The line names each case, what breaks, and what
the update does about it: a dropped member is kept and marked deprecated. The wording is a placeholder. Unpublished
sets are unchanged. No token is renamed or added, so CONTRACT is unchanged.

[claude-cover-redesign-2915 · minor · ecd0ed9f] The library cover is redesigned (#2915, owner decisions Q1–Q5 A). A plain page ground (`color/background/primary`); the
library's name centered in the brand's display face and `color/text/brand` at 120 px; the subtitle "Design system" under
it and the version, now `v0.238.0`, at bottom-left, both in `color/text/secondary`; and an empty "Logo" slot
top-right (#2891). Every color is bound, and each ink holds 4.5:1 on the ground in every example brand and mode. Anything
placed in the logo slot is not a hand edit, so the name and the version keep updating. Update redraws an unedited
first-design cover in this design inside the same frame, and keeps an edited one, setting only its version text. The
name is `BrandInput.name`, else the id made readable (`prism3` becomes Prism3), and then Update says no display name is
set. The default theme's and the redesign seed's briefs gain a display `name`, and a standard-dialect brief's `name` now
reaches `BrandInput.name` (#2892). The Studio's Brand name field edits `name`, not `id`. No token is renamed or added, so
CONTRACT is unchanged.

[claude-usage-panel-width-anatomy · minor · db970094] Plugin: usage panels show each specimen at its member's own width (#2970 item 1). A specimen kept the template placeholder's hug after its swap, so Banner's text wrapped one letter per line and Checkbox.Row's label wrapped; a fixed-width member's specimen now takes that width. The panel is as wide as its widest specimen needs and never narrower than 560px, and Theming's two modes stack when side by side would make it 960px or wider. Build's seat, Update's spacing and the apply all read that width, so a wider panel moves the spec column and the next set right. A family's panel is titled with its page's name, and "In this family" lists each part with its own summary and a link to its set (#2970 item 4); Related names a family member by its family, linked to the lead's set. Anatomy markers are checked against their parts by bounding-box containment, Breadcrumbs' slot items included (#2916). Every drawn panel is due once.

[claude-ia-v2-phase2 · patch · ae758a99] The panel moves to IA v2 phase 2 (#2909). The web studio gets the plugin's left rail, with Theme, Components and Export,
and Help and Appearance at its foot (Q2909.9 A). Components groups its sections under the four tiers, Components /
Subcomponents / Content components / Blocks, each set's tier its file section (Q2909.17 A). The Decisions log is cut
from Inspect; its two notes no lever said (an anchor outside sRGB, the danger hue the engine chose) show on those levers
(Q2909.7 A). Control shape's one home is Components' new shared block; Shape, Button options and Field options show the
levers homed elsewhere as read-only lines that open their home (Q2909.3 A, .4 A). The plugin keeps an as-built ledger
in the file's root plugin data: Build and the in-place Update record each set they land, and Update file's checklist
reads what is due from it, fills hand edits in from a background pass after load, and checks only the flagged sets in
full before it updates them in place (Q2909.8 A). The bar's unused Figma menu, Apply Theme slot and prune dialog are
removed (#2998). No emitted artifact, token or projected component surface moves, and the executor is unchanged.

[claude-accordion-indicator-2878 · minor · 16bf1455] Accordion carries the indicator pair as its own variant axis, `indicator` (`chevron | plus-minus`, chevron first), and
its nested `_accordion-indicator` follows it per member beside `expansion` and `size` (#2878, Q-block A). The nested
instance is no longer exposed (`nest-exposed` → `nest-fixed` with `follow`). The set goes from 24 to 48 members. The code
prop `indicator` already existed and is unchanged. Additive for library consumers: Update renames the 24 existing
members to `indicator=chevron` in place and builds the 24 plus-minus members. No token name moves, so CONTRACT is
unchanged.

[claude-component-specs-in-page · minor · fc420263] Plugin: spec panels on the component page (#2830 phase 2; owner's answers Q2830.1 B, Q2830.2–.9 A). A new agent command, draw-specs, draws one spec panel per family in its own 880px column, 40px right of the family's usage panel and top-aligned with it. The panel holds anatomy numbered as the usage panel numbers it, then per-size redlines over a live specimen, each labeled with the variable and the px the file holds. Then come the color tables, then nesting and properties. Each color table has one row per binding, in fixed columns sized so every variable name in any set stays on one line, with a swatch and the hex the file resolves. A binding a state drops gets a row whose variable reads "none", with no swatch (Q2994.1, built on the recommendation A, pending the owner's answer). Update now reserves the spec column beside every family's usage panel, so every set moves once on the next Update. Build and Update never draw a spec panel. Update moves a live one with its set, and a usage panel redrawn further right pushes it right. A hand-edited spec panel is kept as "(edited)", below the fresh one in the spec column.

[claude-link-contrast-tertiary-2991 · minor · a5f7556a] The contrast floor is stated as the one text promise (#2991, Q689 A). Each floor-gated ink in `.ai.json` (the secondary, tertiary, status and link inks, text and icon, and their inverse twins) gains an `avoid_when` sentence naming the surfaces deeper than its floor, which carry no contrast promise by design, and the lever that moves the floor (`floorStep`, or `inverseSecondary` on the band). The surfaces are computed per brand from the resolved values. No token value or name moves.

[claude-tabs-stretch-hug-2928 · minor · 184f7d56] No component stretches a child across a frame that hugs its width any more (#2928, the shape owner QA Q537 found in
Pagination). The host turns that width fixed when the stretch is written, so the frame stopped following its content.
Tab.Item's 2px indicator and Tabs' 1px baseline are now pinned across their parent's foot (`foot`, out of the flow,
constrained `STRETCH`), with a bottom inset of the bar's height so the label row and the tabs sit where they did. A tab
whose label grows keeps its bar under the whole label, and a list with a fourth tab keeps its baseline under all four.
CodeInput's label and message no longer stretch: the field hugs the widest of its label, cells and message, so six
cells from medium up no longer run past a field frozen at the label's 320. New gate `lint-fill-under-hug.ts` fails by
def and part path on a stretch across a hugging column, or a grow along a hugging row, in any projected member. The
component shim models a horizontal `STRETCH` constraint, and `test:roundtrip` measures all three sets with the host
rule on, after their content grows. No property, variant or token name moves.

[claude-gate-gaps-2965 · patch · bac636ac] Two `test.ts` arms and one Slider `notes.projection` sentence close gate gaps from the Slider review. #2965: the brand-invariant
stroke steps are pinned in px in every corpus brand's composed tree, in every mode: `border-width` none / hairline /
thick / heavy / x-heavy at 0 / 1 / 2 / 4 / 6px, and `focus.ring` width / offset / offset-field at 2 / 2 / 0px, from a
literal table. #2967: every nested Slider input is asserted a medium TextField, and Slider's `notes.projection` says the
`range text` → `defaultValue` keying is mechanical, not a prop mapping, which `test.ts` asserts. The note reaches
`schema/component-maintainer.json` only; no token or projected component surface moves.

[claude-appearance-current-glyph · patch · e8a642a0] The plugin rail's Appearance tile draws the current choice's glyph again (Q2995.3 B, amending Q2909.19 A for Appearance
only): a monitor for Match Figma, a sun for light, a moon for dark, in place of the fixed half-filled circle. Its name and
tooltip still say the choice. The unused halfmoon glyph is removed. No emitted artifact, token or projected component
surface moves.

[claude-text-field-clear-hit-area-2930 · minor · 3d43f183] Text field: the clear button that `clearable` adds now states its hit area (WCAG 2.5.8), the way Search field's does (#2930). It is at least 24×24 CSS px, drawn around the 20px trailing glyph, and adds no height to the field: the `trailingIcon` description, the trailing affix code-only entry and the 2.5.8 line all say so. No token, part or member moves.

[claude-gate-gaps-2947 · patch · ca02eac5] `lint-hit-target.ts` measures the underline Tag (#2947). Every arm read Tag as authored, which is the pill, so the box
`tagStyle: underline` builds (20 / 26 / 32px, owner Q585 A) and its glyph-wide × slot went unmeasured. A new arm
materializes the tag through `applyTagStyle`, walks each member's plan to the height it draws at every density, and holds
each size, body and × slot apart, to WCAG 2.5.8's 24px as drawn or to a size `UNDERLINE_CODE_SIDE` names as code-side,
in both directions, with each named size stated in `codeOnly`. The 24px floor and the named sizes are literals. Gate
only: no emitted artifact, token or projected component surface moves.

[claude-gate-gaps-2948 · patch · d3ca858c] `lint-naming.ts` reads each §6 rule from the build-component skill where it first appears, so it now also asserts that
each rule's anchor sentence, and the §6 and §7 headings, appear exactly once in the whole skill (#2948). A second copy
that a clean merge leaves further down fails by the rule's name instead of drifting unread. A self-check appends a
contradicting copy of each rule to the real skill and asserts the count fails. Gate only: no emitted artifact, token
or projected component surface moves.

[claude-ia-v2-rail-phase1 · patch · 1e4b0976] The plugin's panel moves to IA v2 phase 1 (#2909): a 60px left rail with four areas (Theme, Components, Documentation,
Export) and Agent, Help and Appearance at its foot; a top bar of the brand, Minimize and Update file. Update file is the
plugin's one global write: a checklist (Set up file on a file that is not set up, Theme, the component sets the file
lacks, Style guides) and a Clean up tab that holds Prune stale with its own preview. Documentation holds the style-guide
settings, the usage-panel switch and the cover switch (#2977), kept in the file's root plugin data; Set up file, Build
and Update honor the two switches. No emitted artifact, token or projected component surface moves.

[feat-badge-on-media · minor · 569676f4] Badge gains a `size` axis, `small | medium`, and a third `emphasis` value, `surface` (#2983, owner direction
2026-10-24; owner decisions Q660 A / Q2983.4 A, Q2983.5 A and Q2983.6 A, 2026-10-24). Medium is today's status label and
leads the axis. Small sets `type.caption.md.strong` (11px, resolved per brand through `typeWeight`) at `space.025` ×
`space.100`, about 19px tall. Surface paints `background.primary` under the tone's text role (`text.primary` for
neutral) with no edge, for a label on a photo or any busy ground. The count and dot stay medium and bold only. The
Figma set grows from 20 to 40 members, and every existing member gains `size=medium`. The padding keys become
`{type}.{size}.pad-*` and the label type `{size}.type`. No token path is added, so CONTRACT is unchanged.
Tab Item's nested count badge now pins `size: 'medium'`, so its coordinate still names one badge member.

[claude-theme-link-colors-2990 · patch · dbcef5f1] Studio and plugin, Color › Interactive › Links (#2990): the Text link and Text link · inverse rows now measure each step at its worst across the surfaces the link sits on (the engine's floor ground plus the family's primary and secondary surfaces), and a step below the floor can no longer be picked. Before, it could be picked, and the engine then moved the pin to the nearest step that clears. Each of these two rows now shows its contrast in every mode and the steps hover, visited and pressed follow. A new test.ts arm (L-07) pins every link-palette step onto every text-link role in each editable mode and checks the resolved hexes against those surfaces in all four modes. The owner chose these answers (Q2990.1–5 A). No committed artifact moves.

[components-2669-slider · minor · 39042fe9] Slider (#2669, the owner's approval with every call A, then owner decision Q550): choose a value, or a range, by moving
a thumb along a track. One `Slider` with a `size` axis [medium, small, large] × a `type` axis [single, range] × five
states = 30 members; range comes from a two-value `value` in code. A header row holds a nested FieldLabel and the value
text (`type.body.sm.default`, `color.text.primary`), with no gap above the control row, which is `size.md.min-height`
tall at every size and holds the track: one thickness per size (`border-width.thick`, `heavy`, `x-heavy`: 2, 4, 6px) in
`color.field.border.rest`, the selected part at the same thickness in `color.interactive.neutral.border.rest`, and the
thumbs, drawn as growing segments around them. Optional labeled milestones (`type.body.xs.default`,
`color.text.secondary`), paired number inputs (nested TextFields) and a FieldMessage, all off by default; `label` and
`value` on. Each thumb nests a new Slider.Thumb (`_slider-thumb`, 3 sizes × 5 states = 15 members): a disc in
`color.interactive.neutral.border` rest, hover and pressed, `control.size.sm/md/lg.thumb` (18, 24, 30px), sitting on
the track with no ring; a `color.border.primary` halo, 4px at hover and 8px pressed; the shared focus ring; and
`color.disabled.icon` when disabled, with the selected part. In a range member the state shows on the maximum thumb; the
minimum one stays at rest. New token `border-width.x-heavy` (6px): CONTRACT 14.9.0 → 14.10.0. Its own page under
Components.

[claude-banner-min-width-2971 · minor · 9cc54d23] Banner gets a minimum width (#2971, owner decision 2026-10-23, Q2971.1–3 A): one floor for both the contained and the full width, bound to a new `container.min` token (320px, the narrowest column and the WCAG 1.4.10 reflow width). Every member binds it as its `minWidth` in Figma; code reads it as `min-inline-size: min(var(--container-min), 100%)`, clamped to the host so a column narrower than 320 never scrolls the page sideways. `container.min` is emitted for every brand, fixed rather than a lever, and joins the layout variable collection as `container/min`. `CONTRACT_VERSION` 14.9.0.

[fix-2976-update-clears-min-max · patch · 42ce6ada] In the plugin, Update now clears a minimum or maximum size the plan no longer sets (#2976). A file built under Tag style
Pill and updated to Underline kept the pill's height and 1.5x width as plain floors on every tag member, because Update
removed the binding but the host keeps the value a removed binding wrote, and a literal floor an earlier plan wrote stayed
too. In place, minWidth, maxWidth, minHeight and maxHeight are now set to none on any node whose plan neither binds nor
writes them, so an updated member has a fresh build's sizes. The executor revision rises to 38. No emitted artifact,
token or projected component surface moves.

[claude-panel-qa-r1-2970 · patch · e729b590] Usage panels, owner QA round 1 (#2970), plugin behavior only. The panel title is 18px at -4% letter-spacing and each
section title 16px at -3%, the studio's ls-tightest and ls-tighter, over the block's own title style. The Do and Don't
block turns on its Top padding. Related components is a bulleted list per group, not chips: each name links to its
component's set in the file by node, and a name with no set, and each Replaces entry, is plain text. The panel records
which sets it linked, so a set built or deleted since makes it due on the next update. No committed artifact moves.

[claude-dialog-title-size-2958 · minor · a6c2b53b] Dialog title size (#2958, owner Q588, Q588b A): a new optional brand input, `dialogTitleSize: large | medium | small`
(Form, after Tag style, default `large`). One title size for every dialog the brand ships, at every placement: Large
binds `type.label.lg.emphasis`, Medium `type.label.md.emphasis` and Small `type.label.sm.emphasis`. `applyDialogTitleSize`
materializes it into the Dialog def before projection, after Tag style and before weight intent, in the plugin's
`materializeForBrand`, the lever sweep and the spec chain; it is the identity at Large and for every def but Dialog. A
value setting: it moves one text-style binding, so Dialog keeps its 24 members, axes, properties and layer names. No
token is added and no token name moves, so CONTRACT is unchanged and every committed emission is byte-identical. Dialog's
code notes gain the setting's line, which the projected plans carry, so Dialog's projected surface moves (accepted). The lever copy is a DRAFT for the owner (Q1 on #2958). Accordion is not reached
(Q2 on #2958).

[claude-legacy-panel-print-2968 · patch · 509acacf] Plugin: a usage panel drawn before one panel per family (#2932) is no longer kept aside as "(edited)" when nobody edited it (#2968). Its print was taken over the whole panel, specimens and sizes included, so once the documented set was rebuilt it could never match. When it no longer matches, the panel is now read by its text: unedited when every text it shows outside its specimens is one Prism3 writes there, in today's wording or the wording before #2932, or one the _Doc-block template holds. An unedited panel is replaced in place, and a family member's old panel is removed. A line a designer rewrote still keeps the panel aside. No committed artifact moves.

[feat-pagination · minor · dc728e1e] Pagination and Pagination.Item (#2665, owner decision on the proposal: every call A). Pagination moves between the pages
of a long list or set of results: 12 members, `type` [numbered, compact, simple] × `style` [border, underline] × `size`
[medium, small, large], the style on numbered only. Pagination
draws its own previous and next (owner decision Q414 A), so it requires no Neutral button family (Q386): numbered is a
previous cell (a Pagination.Item, a left chevron), a native `items` slot of seven Pagination.Item instances showing page
5 of 10 (1 … 4 [5] 6 … 10, at least one item), and a next cell with a right chevron, 4px apart (`space.050`). compact
puts "Page 5 of 10" (`type.label.*.default`, `color.text.primary`) between the two cells. simple is the two cells
labeled, "Previous" after its chevron and "Next" before its own, at opposite ends of a row built at 428px. Previous and
next are `nest-exposed` on `state`, so a designer sets them to disabled at an end. Pagination.Item (`pagination-item`,
the `items` slot's preferred item, preferred-only, owner decision Q394 A) is 87 members: `type` [page, ellipsis,
previous, next] × `selection` [unselected, selected] × `style` [border, underline] × `labeled` [false, true] × `size`
[medium, small, large] × state [rest, hover, pressed, focus-visible, disabled], the current page at rest and
focus-visible only in each style, the ellipsis at rest only, the style on the current page only, and `labeled` and
disabled on previous and next only. Previous and next are the page cell with `chevron-left` or `chevron-right` one rung under
IconButton's glyph (`icon.size.xs`, `sm`, `md` at small, medium, large; owner decision Q428 A) in `color.interactive.neutral.icon.*`, a labeled one's word in `type.label.*.default` and
`color.interactive.neutral.text.*` on its own TEXT property ("previous label", "next label"), the neutral wash at hover
and pressed on an unlabeled cell only (a labeled cell has no fill and changes ink, owner decision Q426 A), and `color.disabled.icon` / `color.disabled.text` at disabled. A new variant axis name, `labeled`. A cell on `size.*.height`, at least as wide as it is
tall, `radius.md`; a page reads `color.interactive.neutral.text.*` with the neutral overlay wash at hover and pressed;
the current page (owner decision Q381) has no fill: a `border-width.hairline` border in `color.border.secondary` (owner decision Q427 A: a
subtle edge below 3:1, the emphasis weight being the second cue under WCAG 1.4.11), or a `border-width.thick` bar
as wide as its number in `color.border.tertiary` (it hugs a hidden copy of the number, so no frame fills a hugging one, owner QA Q537) (3:1 against the page in every brand and mode), its number `color.interactive.neutral.text.rest` in `type.label.*.emphasis`, its width held by a bold
reserve. The ellipsis is the decorative `more-horizontal-filled` icon (owner decision Q404 A), `aria-hidden` and not
interactive, at the chevrons' size in `color.icon.primary`, the page numbers' color: it has no text and no TEXT property, so each of the item's
TEXT properties holds one caption. Sizes lead with medium in both, Figma's first member being the code default.
A new `type` value set and a new `style` value set. Engine: `figmaProperties.excludeCoordinates` may name the state axis, so a set can drop a state from some
members only; the validator, the projector, the member count and the lint walkers read the state as one more dimension
of the grid. No executor code moves: the once-per-run override guard inside a native slot this def needs landed with
#2660. No new tokens; CONTRACT is unchanged.

[claude-lever-kind-2959 · minor · 83cd25b7] Every lever in the lever manifest declares its kind, value or structural (#2959, owner Q599 A). The test (owner Q610 A):
a structural lever needs different markup, logic or states per option in the coded component, so every coded component
must implement each option, and a new one needs the owner's OK in its wireframe; on a value lever only token values differ. schema/lever-manifest.json,
and so the MCP list_levers result, gains a kind field on each lever. Four levers are structural: fieldStyle,
searchFieldStyle, tagStyle and buttonIcons. test.ts fails a lever with no kind, by
name, and pins the structural set; lint-skills holds the prism3-build-component skill's lever table to the manifest.
No token, emitted tree or projected component surface moves, so CONTRACT is unchanged.

[claude-minimize-link-bar-2949 · minor · f9e2902f] The plugin can minimize to a link strip while the agent link stays on (#2949, owner decisions Q1 A, Q2 A, Q3 A and Q600 A). A Minimize tile beside the Agent tile, drawn only while the link is on, shrinks the window to a 480×40 strip: the link's dot, its status in the Activity drawer's words plus the running or last command and its age ("Agent listening · last: update-components 2m ago"), Restore and Turn off. Restore returns to the size from before, on the same page and state; Turn off switches the link off and restores the window. The strip skips the 380×420 floor and is never kept as the window size. Minimizing never changes the link or stops its poll. No token, emitted tree or projected component surface moves.

[claude-tag-underline-parity-2945 · minor · 3488751c] Tag, under Tag style Underline (#2945, owner Q589, Q590 A, Q592 A and the parity wireframe's A calls): the unselected line takes `interactive.primary.border`, the selected line's color, stepping to `.hover` and `.pressed`, where it took `interactive.neutral.border`. The weights are unchanged: 1px at rest, 2px on hover, pressed and selected. The tag has no side padding and no minimum width, and the × slot is only as wide as its glyph (16, 20 and 24px), so the line spans exactly icon + label + ×. A dismissible tag's label row drops its 4px leading inset, and the label sits 6, 8 and 8px from both the icon and the ×. The pill does not change. `PartDef.minWidthBase`, which only the underline's floor used, is removed.

"Button label weight" is now "Control label weight" (#2945, owner Q591 A): Default also sets tag labels in `type.label.{rung}.default`, in both tag styles. Badges keep Emphasis. The key stays `buttonLabelWeight`, so no brand file changes. No example brand sets Default, so no committed output moves.

[components-2428-code-input · minor · e4c7645b] Code input (#2428, owner decisions Q321, Q329, Q330, and the as-built wireframe approved 2026-10-16): two new component
defs. `code-input` is a field for a one-time code, one input drawn as a row of cells, `size` [medium, small, large,
xlarge] × `status` [default, error] × six states = 48 members, nesting FieldLabel, a native `items` slot of six cells
(four to eight, the cell preferred) and FieldMessage, hidden by default as on every field (#2926). `code-input-cell` is the cell, `size` × seven states = 28
members, at the owner's literal sizes (44×44, 48×56, 56×64, 68×72) with Text field's field chrome and the prototype
reactions Q344 sets (While pressing goes to the active cell). Two engine additions carry them:
`figmaProperties.pressState` names where While pressing goes on a set with no pressed look, and `typeWeight` names a
fixed weight intent for a type group, resolved per brand as `weightIntent` is, so the cell's title-step characters
resolve on every brand. FieldLabel's agent partners name Code input. No token is added: CONTRACT is unchanged.

The cell's character carries its size's text style in Figma (owner QA Q534 on #2789): `type.title.sm.strong` at
medium, `type.body.md.default` at small, `type.title.md.strong` at large and `type.title.2xl.strong` at xlarge, with the
title steps in the brand's bold title weight. Its line box is centered in the cell; code trims the box to the cap height
and the baseline (`text-box: trim-both cap alphabetic`) so the figure itself is centered. Figma keeps vertical trim
inside the text style, so a trimmed layer cannot keep its style; the owner kept the style (Q560 A on #2789), and the
Figma character is untrimmed.

Code input joins the Field style lever (#2719, owner decisions Q332 A and Q12 A on #2695): under `underline` each cell
draws one bottom line, 2px with the ring at the 2px offset on the active cells and `border.danger` in error, square,
with no hover wash and no disabled plate. `applyFieldStyle` squares a per-size corner key. Every paste payload also
drops its leading indentation (about 1 KB per chunk), so the indivisible paste unit stays under #1798's ceiling.

On the studio's Components page, Code input lists under Fields, beside the Field style setting that draws its cells
(owner decision Q-2789.3 A on #2789).

[claude-style-guide-group-paint-2953 · patch · ce831c9f] Style guide paints every group frame it draws (#2953, the owner's reference file): a fill bound to the file's
color/foreground/primary, a 1px inside stroke bound to color/border/secondary (each found by role name below the root,
as the usage panel finds its own) and a corner radius of 2. Every run paints a Prism3 group that still has no fill and
no stroke, so groups drawn before this are painted too. A group with any fill or stroke a designer set is never
repainted, an adopted hand-made group is never painted, and a standalone guide (Effect styles) stays unstyled. A file
missing either role leaves groups bare and the run names the missing role. Plugin behavior only: no committed artifact,
token or projected component surface moves, so CONTRACT is unchanged.

[claude-tag-underline-hug-2945 · minor · 830c62de] Tag, under Tag style Underline (#2945, owner Q585 A): the tag hugs its content, with no height floor at the rung. The frame is the label row plus the inset: 20, 26 and 32px at small, medium and large, where it was 36, 44 and 56. The × slot keeps the rung height as its width and hugs its height. The minimum width stays 1.5 times the rung height, through a new `minWidthBase` part field. The 24px target moves to code, as Link's does. The pill does not change.

[claude-keep-hand-edits-2943 · patch · 6c9cfe38] In the plugin, Update with hand edits kept now keeps every hand-edited path, including the fields a parent writes onto
its child (#2943). The executor's passes that place, size or re-corner a child from its parent (the focus ring's
concentric radius, a pin, an inset icon, a stretch) skipped no kept child, so a ring a designer had unbound and squared
came back concentric on every member whose root the update rewrote. The executor revision rises to 36. No emitted
artifact, token or projected component surface moves.

[components-2670-progress · minor · 8b4504ec] Progress (#2670, the approved proposal, every call A): the progress bar and ring. 12 members: `shape` [linear, circular]
× `type` [determinate, indeterminate] × `status` [active, complete, error] × `size` [medium, small], sized only as a ring
(40px and 24px on the icon ladder), and no end state on indeterminate work (`excludeCoordinates`). The ring is
determinate or indeterminate (owner Q545 B): the indeterminate ring is a still frame of its turning arc, a third of the
circle, with no value; in code the arc turns on the sweep pair. A linear bar is built at 360 and fills its container: a header, label and value on one baseline (the label in
`type.label.md.emphasis`, the value end-aligned in `type.body.sm.default` on `color.text.secondary`), then a 4px track in
`color.background.tertiary` whose fill takes `color.icon.brand`, `color.icon.success` or `color.icon.danger` by status and
ends in a 4px stop dot of the same color. The still members split the track by layout (the fill and the rest each grow):
50% at active and error, the whole track at complete, and a centered third for the indeterminate frame. A ring is two
glyphs on one square, the track (3px wide at 24px, owner Q544 A; 4px at 40px; in the track's color) and the value arc over it, from
twelve o'clock with round caps, and its value beside it. Complete and error nest a FieldMessage (success, error) for the glyph and the
caption. Booleans `label`, `value` and `message`; texts `label text`, `value text` ("50%", at active and error) and
`complete value text` ("100%", at complete, its own text parts), so each member shows its own value: one TEXT property
holds one default for every member it is bound in. Engine: a TEXT property may be `figmaOnly` (no code prop, a stated
`figmaName`), as a boolean already may; `complete value text` is one, since code renders both values from `valueText`. Three new component-owned glyphs
(`progress-arc-{type}-{size}`, `progress-ring-*`, `progress-stop`), on the parts `arcGlyph`, `ringGlyph`,
`fullRingGlyph` and `dotGlyph` (the Q350 `<shape>Glyph` names). Engine: a `vector` part may name its paint slot
(`paintSlot`), and may be drawn centered over its parent's in-flow child (`stackCentered`, projected as the overlay's
existing `absoluteCenter`, so neither executor changes). New motion pair, fixed at every tempo: `motion.duration.sweep`
(1600ms, one pass of the indeterminate segment) and `motion.duration-reduced.sweep` (2600ms), with the primitive
`motion.duration-ms.1600`; CONTRACT 14.7.0 → 14.8.0. Spinner names Progress as its alternative.

[claude-issue-2828-version-titles · minor · 287db46e] The plugin's saved Figma versions read "Saved before Prism3 updated 47 sets", "… updated Dialog", "… added Pagination", "… drew style guides" and "… applied the theme" (#2828, owner decision Q442 A). The engine version and the details (the set list, the table count, or "Variables and styles.") go in the version's description. One builder, version-title.ts, writes every title and is the only caller of saveVersionHistoryAsync. Build, Style guide and Apply theme now save a version before their first write, as Update did. No token, emitted tree or projected component surface moves.

[feat-usage-panels-p1-core · minor · 7ee3b343] Plugin: usage panels, phase 1 of #2927 (owner decision Q551 A). One panel per taxonomy page, beside the set of the
page's lead (`lead` in `file-taxonomy.ts`: Button, and the Row for Checkbox, Radio and Switch), listing the family's
sets and merging their Do and Don't items; only the lead's set makes room for it, and the members' own panels are
replaced, or kept aside when edited. Anatomy markers sit on their parts (#2916): every listed number on a specimen,
found by the def's part path (slot-hosted and instance-nested parts included), a hidden part shown through its boolean,
one more specimen per member for parts only another member holds, numbered across them; a 1px leader to the part, from
the host's laid-out boxes; a bracket for the root and any part holding another marked part; repeated parts merged into
one entry. The panel's print no longer reads a specimen's content, sizes or main components, so a rebuilt set does not
leave two panels stacked (the Progress double panel). The Figma conventions file names each page's panel lead.

[components-2579-banner · minor · 10c0afff] Banner (#2579, owner decision Q327): a persistent message in the page flow about an important state, with an optional
action. 8 members: `tone` [info, success, warning, danger] × `width` [contained, full]. No size or state axis. The
container is the tone's subtle surface (`color.foreground.{tone}-subtle`) with a 1px edge in the tone's border role
(`color.border.{tone}`, `border-width.hairline`), `radius.md` and edged all round contained (built 480), `radius.none` and
edged top and bottom only at full width (built 960, the sides on `border-width.none` through `strokeEdges`), padded
`space.200` with a `space.150` gap, both following density. Parts: the tone glyph (FieldMessage's mark per status, in
`color.icon.{tone}` at `icon.size.md`), a title in `type.label.md.emphasis` and a body as a native slot in
`type.body.md.default`, both in `color.text.primary`, one nested text Button action (small;
Button.Neutral when the file has it; one action only, owner QA Q533.1), and a dismiss FlushIconButton.Neutral (flush, small, close fixed: Q386; flush per owner QA 2026-10-19). Figma properties `title text`, `title`, `icon`,
`actions` and `dismiss`; the action and the dismiss are off by default. The `width` axis gains the
values `contained` and `full`; `tone` gains a four-value set. No new tokens; CONTRACT is unchanged. The schema's `builtSize` now admits a width-only map on a
row root; heights still need a column.

[claude-2872-link-current · minor · 0221419e] Link gains a current state for navigation rows (#2872, owner decisions Q507). A runtime `selection` axis
(`unselected | selected`, as Tab and Tag) on standalone links only, so the Link set grows from 96 to 144 members; inline
links stay out. A current link shows a 2px bar at the foot of its line box, filled in the link icon color and stepped by
state. The bar exists on current members only and sits out of the flow, pinned across the link's bottom edge (a new box
placement, `PartDef.foot`), so no existing member gains a layer and the box does not move. Hover on a current link
changes the color only: no underline joins the bar. The code prop is `current`, rendering `aria-current="page"`.
`unselected` leads, so a published Link updates in place: its 96 members become `selection=unselected`, with nothing
dropped, replaced or renamed for consumers. No token is renamed or added, so CONTRACT is unchanged.

[components-2666-breadcrumbs · minor · 0221419e] Breadcrumbs, BreadcrumbItem and BreadcrumbSeparator (#2666, the approved wireframe, every numbered call A, and owner
decision Q382 A after QA). Breadcrumbs is a `path` (full, parent) × `separator` (chevron, slash) × `size` (medium,
small) set of 6 members, the parent path without a slash member: the trail holds a native `items` slot of
BreadcrumbItem, two ancestors and the current page by default, at least two, the ancestors following the trail's
separator; the parent path is one Link up a level beside a `chevron-left` glyph. BreadcrumbItem is a `kind`
(ancestor, current, overflow) × `separator` × `size` set of 10 members, the current page without a slash member: an
ancestor nests Link (inline, default weight, underlined at every state), the current page is `text.primary` body text,
and the overflow step nests FlushIconButton.Neutral (flush, small, `more-horizontal-filled`); every step but the current
one ends in a nested `_breadcrumb-separator` in its separator's look. `_breadcrumb-separator` (BreadcrumbSeparator) is a
`type` (chevron, slash) set of 2 members: a 16px (`icon.size.xs`) `chevron-right` or `slash` in `color.icon.secondary`.
The icon set gains `slash`, drawn for this project (Remix has no plain slash): a 2px stroke on the 24px grid. Three new
variant axis names, `kind`, `path` and `separator`. All three sets lead with their code default (Q347 A, Q359 B).
Three new component pages under `out/components/`. No new token, so CONTRACT is unchanged.

[feat-search-field-2888 · minor · 0221419e] Search field (#2888, owner decisions Q514, 2026-10-21). `search-field` (SearchField) is the shared field factory's third
output: TextField's anatomy and token block, size x status x state = 84 members (Q?6 A), a leading `search` glyph shown
by default, the clear button as TextField's trailing glyph starting at `close-filled` and built hidden (Q?3 A), a
Figma-only `label` switch standing for the code prop `hideLabel` (Q?4 A), no submit button (Q?5 A), and the site
header as a docs example (Q?8 A). Its own page under Components. The factory gains the three Search-only switches
(`leading`, `trailing`, `labelSwitch`); TextField and Password field are byte-identical. A new Form lever,
`searchFieldStyle` ("Search field style": Follow field style / Outline / Underline, default Follow, Q?1 A and Q?2 A),
right after Field style: `fieldStyleFor` resolves the style the search field is drawn in and `applyFieldStyle` draws it
unchanged, so a brand that leaves it unset builds every def as before. Control shape's Boxed and Hairline corners reach
the search field as they reach Text field. `search-field` leaves Text field's `composition.planned` for its
`alternativeTo`. No token is added or renamed, so CONTRACT is unchanged. The clear button's hit area is stated as at least 24×24 CSS px around its 20px glyph, adding no height to the field
(WCAG 2.5.8; the review's Q1 A), and the field's message defaults off (owner decision on #2926, item 1), as #2929 sets
for the other fields.

[feat-2887-tag-style · minor · 96991757] Tag style lever (#2887, owner decisions Q513 1–8 and Q540). A new Form lever, `tagStyle`: "Tag style", Pill / Underline,
default Pill, right after Field style. Under Underline every tag draws one line under itself: the bottom side only
(`strokeEdges`), 1px (`border-width.hairline`) on an unselected tag at rest, focus-visible and disabled, and 2px
(`border-width.thick`) on hover, pressed and every selected state, in `interactive.neutral.border` unselected and
`interactive.primary.border` selected. Focus adds the ring and keeps the line weight. Square corners (`radius.none`)
and no fill in any state (no wash, no selected tint). The height becomes a `minHeight` at the same rung, so the hit
target holds, and the content row sits at the bottom on a new component-local key, `size.{size}.underline.inset`
(`space.050 / 075 / 100`, the same at every density), with the label row held at the glyph's height; the × slot keeps
its square and sits its glyph on the same inset. Applied to the def before projection by `applyTagStyle`, the identity
under Pill: every Pill plan is byte-identical, and the Underline set keeps the 45 members and every layer name, so Update
redraws it in place. `minWidthRatio` now also takes a bound `minHeight` as its base. Tag's codeOnly names both styles.
No token is added or renamed, so CONTRACT is unchanged.

[feat-2894-option-row-ladder · minor · 96991757] Option rows land on the control-height ladder (#2894, owner decision Q539: A on every question). Radio.Row,
Checkbox.Row and Switch.Row bind their floor `size.{size}.min-height` (36/44/56 at comfortable) as the row's
Figma `minHeight` as well as in code, and center one new inner box, `content`, in it; `content` keeps the control
and label top-aligned, so a wrapped label still holds the control on its first line (Accordion's Q276 A
construction). The constant 12px block padding becomes a per-size minimum, `size.{size}.pad-y` →
`space.075`/`100`/`150`, and joins `densitySpacing`. Every brand's rows move: 45/48/51 → 36/44/56 in Figma at
comfortable, Switch.Row 21/24 → 36/44. Token names do not move, so CONTRACT is unchanged. Files that already hold
these rows need an Update, which reparents the label and nested control under `content`.

[feat-field-message-default-off · minor · 96991757] The fields' status/helper message is off by default (#2926 item 1, owner decision). TextField, PasswordField, Select and
Textarea now emit their `showMessage` boolean (Figma property `message`) with `default: false`, so the composed
FieldMessage nest is built `visible: false` at every member and a placed field shows no message line until a designer
turns it on. The `showMessage` prop defaults to false in code to match, and the props' docs and the parts' notes say so.
Counter already defaulted off. The four field sets' projected plans move (component surface re-accepted); member counts,
property names and every token are unchanged, so CONTRACT is unchanged.

[claude-button-content-size-readout · minor · f72b1a07] Button label & icon gets clearer words (#2918, owner Q527 A). The lever's label is now "Medium button label & icon",
and its options are "Medium" (`match`) and "Small" (`smaller`). The description is reworded to match, and so are the
Button definition's note and the prism3-theme skill row that name the option. Copy only: the keys, the default and
what each value binds are unchanged, so brand inputs load as before and no token or component surface moves.

[claude-color-family-order-2900 · minor · e3a41ca3] The colour families now run background, foreground, text, border, icon, interactive, disabled, scrim, veil, field, inverse,
the order in the owner's master file; `interactive` moves from before `border` to after `icon`, in the emitted `color`
tree and the Figma create order, and every inverse group follows. Key order only: no token name or value moves, so
CONTRACT is unchanged.

[fix-doc-block-fill · patch · 3b51562d] Plugin: Set up file's _Doc-block template fills its block (#2902). The padding spacers, Field's row, Do-Dont's columns
and Chips' chips are set to FILL once appended to their auto-layout parent, where layoutAlign set before the append
left them hugging (Do-Dont's columns at 100px, Chips at ~986px that never wrapped). Field's label grows to its text at
the label column instead of sitting clipped at 1px. A file already set up is repaired in place on the next Set up file
run (repairDocBlock): the same set and members, so usage-panel instances keep pointing at it. No committed artifact
moves. Two usage-panel fixes ride along: Do and Don't items are written into List.Item's
text layer, read from its def (they were never written), and a set's own canvas labels and backdrop no longer keep its
usage panel from being drawn; an untagged layer still does.

[components-2668-toast · minor · 3a7a05a8] Toast (#2668, the owner's approved proposal, every numbered call A): a short status message over the page after the
user's own action. 2 members on a new `intent` axis, `neutral | success`, neutral first; no size and no state axis. The
card is the inverse surface, `color.inverse.background.primary`, with `shadow.lg` as an effect style, `radius.xl`, and
padding `space.100` block, `space.200` inline start and `space.100` inline end, built 360 wide and hugging its height.
The message is `type.body.md.default` on `color.inverse.text.primary`, wrapping; success adds the `check-circle` glyph (part `checkCircleGlyph`)
on `color.inverse.icon.success` at `icon.size.sm`, 12px from the message, and neutral has none. At the end edge, 4px
apart: an optional action, a nested Button (text, small, `surface: inverse`, off, reading "Action"), and the close, a
nested FlushIconButton.Neutral (flush, small, `surface: inverse`, on, the close glyph; Q386). FlushIconButton gains a
`surface` axis, `default | inverse`, appended last, which changes the glyph ink only. Figma properties: `message`, `action`,
`close`. Placement, one-at-a-time replacement, the timer (6000ms default, 5000ms floor, pausing on hover, focus and a
hidden window; no timer with an action), the live region and the F6 route are code-side, stated in `codeOnly`. Dialog,
Badge and Spinner drop `toast` from their planned lists. No new tokens; CONTRACT is unchanged.

[fix-thumbnail-review-nits · minor · fd3aa87f] The library cover's review follow-ups (#2893). A cover whose version text is gone is never drawn a second time beside
itself: Update writes nothing to it and says so, whatever its fingerprint reads. The `coverFrame` rule in
`figma-conventions.json` now reads "Every Update sets the version text while it is there".

[fix-button-group-fill-wrap · minor · 4f204e0c] Dialog and Button group: the fill line now says the label takes `overflow-wrap: anywhere`, so a single long word breaks
inside its button instead of overflowing it (#2880 review follow-up). The Dialog `actionsFill` note reads "The fill
footer: a Button group at fill, Cancel then Save, sharing the width equally." The emitted Dialog doc and the maintainer
schema carry the new prose. No member, name, prop or token moves, so CONTRACT is unchanged.

[claude-library-cover-2859 · minor · 2d58f4e1] The library file has a cover (#2859, owner decision Q509 A). Set up file draws a 1920 × 1080 cover on the Cover page and
sets it as the file thumbnail while the file still has Figma's default one; a thumbnail a designer chose is never
replaced. The cover shows the brand's name, set in its display face, and "Prism3 0.238.0" on the brand color:
the fill binds `foreground/brand` and both texts bind `text/on-brand`, the pair the engine contracts at 4.5:1 against
exactly that ground. Every Update keeps the version current. A cover a designer edited keeps every edit, and only its
tagged version text changes; with that text deleted, nothing is written and the run says so. `BrandInput` has a new
optional `name`, the brand's display name, which the cover shows, falling back to `id` as written. No token emits from
it, so CONTRACT is unchanged.

[claude-dialog-footer-fill-2880 · minor · a0f21e5a] Dialog gains a fourth footer, `fill`: a row whose buttons share the width equally, such as Clear all and Apply (#2880,
owner decision Q492 B). It nests the Button group at `layout=fill`, in the order inline, stacked, fill, none, at every
placement, end included, so the set grows from 18 members to 24. The defaults are Cancel then Save, with Cancel a Button.Neutral where
the file has it. The Button group's `fill` code line is now `flex: 1 1 0; min-width: 0`: the buttons keep equal shares
at every width and a long label wraps inside its button, where before it widened its button and wrapped the row.
Additive only: no member is renamed, dropped or retyped. No token path moves, so CONTRACT is unchanged.

[claude-library-versions-visible-2858 · minor · 29c19cfc] The library's versions are visible in the Figma file (#2858, owner decisions Q443 A and Q479). Every Update that writes
draws an "About this library" frame on the Cover page, beside the thumbnail frame: the engine and token contract versions,
the date of the Update, and what changed in the latest release. The dry run lists the frame when it is missing or drawn
for another engine, and a copy a designer edited is kept aside. When the frame is an Update's only work, no named
version is saved, and the dry run and the run log say so. After an Update, the plugin's Activity drawer offers the
library publish description with a Copy button. The release index (`docs/public/releases/index.json`) now carries every
Figma and token item of each release, which the plugin bundles; `release-notes.ts --index` rewrites it from the release
files. No token path moves, so CONTRACT is unchanged.

[claude-dialog-end-placement-2877 · minor · 8324839c] Dialog gains a fourth placement, `end`: a side sheet on the writing direction's end edge (#2877, owner decision Q483 A,
named by Q488 A). One width, 480px, built 800 tall with the body taking the height, every corner square, padded as a
centered panel, and no size, so the set grows from 15 members to 18 (the three end members after the full ones).
Aliases `side-sheet` and `drawer`. The scrim is canvas furniture on the end panel's start side. The reduced-motion
contract now says what happens: every placement opens and closes at once (the reduced duration is 0ms), not a fade.
The projected component surface moves (a new variant value); no token path moves, so CONTRACT is unchanged.

[naming-2759-part-renames · minor · 2284ed2f] Layers follow the naming table (#2759, owner decision Q350). Glyph layers are `<shape>Glyph`:
- Checkbox.Control's `mark` and `dash` become `checkGlyph` and `dashGlyph`.
- Field message's three status glyphs become `errorGlyph`, `warningGlyph` and `successGlyph`.
- Textarea's `grip`, Select's `chevron`, Image placeholder's `marker`, Spinner's `ring` and Tag's `check` take the
  suffix.
- The accordion indicator's four glyphs take the suffix too.

The other layer renames:
- A Row's control cell is `controlCell` (Checkbox and Radio's `controlBox`, Switch's `trackBox`).
- The main text of FieldLabel, Field message, Badge and List item is `label`.
- Two roots are renamed for their role: Divider's `divider` and FieldLabel's `label` become `container`. A root is
  the member itself, not a layer.

`COMPONENT_RENAMES` gains a `part` kind. An in-place update renames each layer before it writes anything else, so the
layer keeps its id and every override made on it in a placed instance. Before this change, a renamed part was
removed and rebuilt.

[naming-2759-component-renames · minor · af1ba40c] Tab is renamed Tab item (#2759, owner decisions Q353, Q365, Q394): the id `tab` is `tab-item`, display name `Tab.Item`.
It stays unprefixed because it is Tabs' slot item, which a file using a published library inserts (Q394 A); List item
and the segmented-control segment keep their ids for the same reason. `COMPONENT_RENAMES` gains a `def` kind. An
in-place update finds a set under its earlier id, renames it, and keeps the set's and every member's id, so placed
instances keep pointing at them. Its dry run says "Renamed from <old id>." The renames lint follows a def rename when
it compares the merge base with the tree.

[naming-2759-property-casing · minor · 1c566ab4] Figma property names are lowercase (#2759, owner decision Q345 A): Switch.Control's `State icon` is `state icon`,
Image placeholder's `Marker` is `marker`, Tag's `Check icon` is `check icon`, and Segmented control's `Label` is `label`.
The code props are unchanged. `COMPONENT_RENAMES` gains a `property-rename` kind, and an in-place update renames the set's
property instead of deleting it and adding a new one, so the property keeps its id and every placed instance keeps
the value a designer gave it. The renames lint accepts a `property-rename` entry as the claim for a property that
leaves a set.

[claude-counter-spinbutton-q425 · minor · eb16aef2] Counter accessibility (#2693, owner decision Q425 A): the shipped keyboard, focus and aria text state the spinbutton pattern in full. The counter is one Tab stop at the value; Up and Down Arrow, Page Up and Page Down, Home and End step it; `aria-valuetext` carries a formatted value; the minus and plus buttons are `tabindex="-1"` and not `aria-hidden`; one focus ring wraps the row. No token or layout change.

[claude-color-variable-order · minor · c6d1a40a] One canonical colour-variable order (#2860, #2836). The emitted `color` tree and the Figma create order now run the
families as background, foreground, text, interactive, border, icon, disabled, scrim, veil, field, inverse, and the roles
inside each in the order a designer reaches for them: primary, secondary, tertiary, the statuses in the engine's
SEMANTICS order (brand, success, warning, danger, info), their subtle tints, the on- inks, then link states; interactive
runs fill, on-fill, text, icon, border, overlay, subtle-fill with states rest, hover, pressed, focused, selected.
`foreground` lists danger with the other statuses instead of after the subtle tints. Every inverse group takes its
default group's order, and every group is one run. The order lives in color-order.ts, which tree.ts now calls; a role
it does not name throws rather than being appended. Key order only: no token name or value moves, so CONTRACT is
unchanged. The plugin's Update check lists colour variables that are out of this order in an existing file. It cannot
move them: the Plugin API has no call for it.

[claude-2830-spec-model · minor · 50bb28b3] Component spec model (#2830, phase 1). component-specs.ts builds one pure model per projected component from its def
and Figma anatomy plan: anatomy parts, per-size redlines (padding, gap, height, width, min-width) as token names with
literal or derived px where the build writes a number, text styles, per-state colors per part, and nesting with the
set's component properties. emit-component-docs.ts writes it to out/components/specs.json (one more committed
artifact) and as a Specs section in each projected component's page. apps/plugin/test-roundtrip.ts reads every built
set back against the model, both directions, by name. No token path moves, so CONTRACT is unchanged.

[claude-2714-shipped-prose · minor · ff3df4b3] Component shipped prose in one register (#2714, #1717). The older components' consumer fields (summary, description,
prop descriptions, accessibility, content, docs and ai's decision fields) now follow the build-component skill's "What
ships" rules, as the 13 newer ones already did: no code spans, no all-caps emphasis, no brief section references, no
"def", no issue numbers, and the acronyms HC, SR and AT spelled out. Icon, Focus ring and Field label gain a
`docs.contentGuidelines`, Dialog gains a `content.dialogPattern`, Button's and IconButton's summaries reach the
~90-character line, the segment's summary says emphasis weight as its description does, and the child parts' `whenToUse`
read in two templates ("Only as a child of Tabs. Generate Tabs, …" and "Inside Checkbox.Row, the common case. On its own only
…"). Tab, List item and the segment gain a do and a dont each. `components.ai.json`, every affected docs page and the
plugin bundle's component text move; no token moves, so CONTRACT is unchanged. `test.ts` gains the `#2714 component
register` and `#2714 child-only whenToUse` arms.

[claude-canvas-placement-consolidated · minor · e19107c3] Canvas placement in the plugin, consolidated (owner decision Q432 A; supersedes #2737, #2717, #2770 and #2760).
The gap between component sets on a page is now the white space a designer sees: 160px from the outer edge of one
set's canvas furniture (labels, brackets, backdrop) to the next set's, on every page (#2723, Q335 A). It replaces the
400px frame-to-frame gap of #2502. The plugin places a new set again once its labels are drawn. Update moves a set
whose labels sit closer than 160 to its neighbor's, or whose frame sits exactly 400 from its neighbor's, where the
earlier rule put it. After the furniture redraw, the same Update re-spaces once more from the labels as drawn (Q358 A),
and a set that sat exactly 160 away before the redraw goes back to 160 (#2734). Column labels on narrow sets read in
full, because the set's columns widen to the widest label (#2705). Under a page header, a set's labels go on the
header's left edge, not its frame, both for a rebuilt set and for one Update lifts below the header (#2735). The paste
payload writes 160. EXECUTOR_REVISION 34. No token or emitted artifact moves, and CONTRACT is unchanged.

[components-2751-unified-status · minor · 5dcea106] Unified errors (#2751, owner decision Q354, from the #2706 audit): every control that can be invalid takes the fields'
`status` axis. Checkbox control and Switch control lose their `error` state for `status` default | error, orthogonal to
rest, hover, pressed, focus-visible and disabled (Checkbox control 54 → 90 members, Switch control 24 → 40). Radio control
gains it (30 → 60), set by the Radio group, never by one radio alone. Checkbox row, Switch row and Radio row gain `status`
and follow it into their control (6, 4 and 6 members). Checkbox group and Radio group gain it (6 members each), follow it
into every row, and nest a FieldMessage under the options, present only at `error`. Fields are unchanged. The error look
is each control's existing one: the danger border on the box, track or ring, bound per selection and per non-disabled
state, so an errored control still hovers and focuses. Each def carries the fields' `validation` prop over default |
error; the groups also carry `validationMessage`.

Engine: `COMPONENT_RENAMES` gains a `move` kind, a value that leaves its axis for a coordinate on others. Checkbox control
and Switch control each declare `state=error` → `state=rest, status=error`, so Update renames the error members in place,
keeping their ids, and a placed error instance keeps showing error. `lint-axis-values` records the choice controls'
`status` as a subset of the fields'. No new token, so CONTRACT is unchanged.

[feat-846-doc-section-model · minor · 7574531a] Component usage docs, phase 1 (#846, wireframe approved 2026-10-19): one doc section model, component-doc-sections.ts,
turns a definition into the ordered sections of its usage doc — Overview, Anatomy, Styles, Usage guidelines,
Accessibility, Content guidelines, Theming, Related components, Building it in code — with the wireframe's field map.
A section with no data is left out, and what is missing goes to the new docGaps list in
schema/component-maintainer.json. out/components/<id>.md now renders the model's sections in order and nothing else,
so every page changes shape: part notes appear as Anatomy captions (notes written for maintainers are held back),
the axis prop's description joins the Styles table, Props move to Building it in code, Motion joins Accessibility, role and ARIA notes share a Screen readers row,
"Often used with" leaves out a partner already under "Built from",
and composition.planned leaves the page (it stays in components.ai.json, which does not change). Theming needs a
brand's modes, so the brand-independent page has none. lint-component-docs gains arm F: the model and every page
against the gate's own section rule.

[claude-q438-items-slot-size-note · minor · c72e9f09] Tabs, Checkbox.Group, Radio.Group, List and SegmentedControl say how their size reaches their items (Q438 A, #2829): the
summary, which is the Figma description and the first line of the docs page, now ends with "Size applies to the items you
haven't edited. After editing an item, select the items and set their size." The summary cap grows by that sentence for a
def with an items slot and a size. lint-component-docs.ts arm F holds the sentence on the def, the JSON and the page.
Emitted component docs change; no token, name or projected component surface moves, so CONTRACT is unchanged.

[claude-2817-ink-surfaces · minor · 2103b40a] The primary text ink (`interactive.primary.text.*`, with the icon and border that follow it) and the link ink (`text.link.*`,
with `icon.link.*`) clear 4.5:1 on every surface a component places them on: the page, `foreground.primary` (Dialog's panel)
and the five status tints (`foreground.<status>-subtle`, Banner's actions), in every mode (#2817, Q415 A as narrowed by
Q419 A). Each pick keeps its anchor step where it already clears them all, and otherwise takes the nearest step on the same
ramp that does: darker in a light mode, lighter in a dark one. The page keeps the mode's own bar (7:1 in high contrast).
Values move one step in light mode for aurora and both client fixtures, and for aurora's primary ink in dark; no token is
renamed or added, so CONTRACT is unchanged.

[components-groups-label-exposed · minor · 38559463] Group labels exposed (#2748, owner decision Q348 A on #2706). Checkbox group, Radio group and Segmented control nest
FieldLabel `nest-exposed`, exposing `emphasis` and `weight`, with `size` still followed: the shape Text field, Select,
Textarea and Password field already use. The starting coordinate stays secondary and bold, so no group looks
different; a designer now sets the heading's emphasis and weight, label text and required marker on the group
instead of inside the nested instance. Update marks an existing group's nested label exposed in place, keeping every
key and id. No executor code moves and no token is added or renamed, so EXECUTOR_REVISION and CONTRACT are unchanged.

[claude-2713-generation-priority · minor · c17b686f] `ai.generationPriority` follows a written scale (#2713). The build-component skill now defines it: 1 the default pick,
2 a top-level component, 3 a supporting top-level component or a sibling that loses its family's tiebreak, 4–5 a
specialization for a narrower place, 6 a part a host nests that can stand alone in a stated case, 9 a part never
generated alone. Ten defs move in `components.ai.json`: Focus ring 2 → 6; Checkbox, Radio and Switch controls, Field
label and Field message 3 → 6; Tab and List item 3 → 9; Segmented control 4 → 3; Counter 4 → 2, a field control rather than a specialization. `test.ts` holds every def to a
hand-written tier list, refuses a number off the scale, and refuses a 6 or 9 that no registered host nests. The field is
agent-only, so no docs page changes. No token moves, so CONTRACT is unchanged.

[claude-2711-states-admissions · minor · 1fbecc21] Component states and `codeOnly` admissions read one way (#2711). Checkbox group, Radio group, Tabs and Segmented control
declared `states: ['rest']`; they now declare `states: []`, like every other component whose states live on its children,
and the validator refuses `['rest']` alone. `components.ai.json`, the four docs pages and `docs/public/reference/figma-conventions.json` no
longer list a `rest` state for them (the last as a code-only state). Every `codeOnly` entry that admits an axis or state Figma does not carry now reads
`<name> — not projected: <why>. <what the code does>`, and `test.ts` holds the phrasing, refuses an entry that leads with a
name the set does project, and pins the 27 admissions by name. Dialog's per-breakpoint placement entry no longer leads
with `placement`, an axis its set projects. No token moves, so CONTRACT is unchanged.

[claude-inverse-colors-frame · patch · 7d2d27e2] `style-guide-groups.ts`: inverse color families get a group of their own, Inverse colors, drawn under Semantic colors (`under: 'semantic-colors'`), and `styleGuideGroupOf` reads a new `inverse` fact to choose it (owner decision, 2026-10-19). Semantic colors loses `inverseRow`. No emission changes.

[claude-list-marker-column · minor · cd05b8cc] List.Item: the bullet and number marker column is one step tighter, 20 / 24 / 32px at small / medium / large (#2727,
owner decision Q340 A). The column is now fixed per type rather than in every type: `markerBox` binds
`size.{size}.{type}.marker-column`, `space.250` / `300` / `400` for unordered and ordered, and `space.300` / `400` / `500`
(24 / 32 / 40px, unchanged) for icon, so an icon item's text edge sits further in than a bullet or number item's. The
column stays fixed: it does not follow density. The List's code note now says a nested list sits in its item's text
column, indented by that item's marker column. An Update corrects an existing file in place: the 6 bullet and number
List.Item members are rewritten, the 3 icon members read current, and the List set takes the new note, keeping every
key and id. No new token, so CONTRACT is unchanged.

[components-2738-field-label-disabled · minor · ef482712] Text field, Password field, Select and Textarea dim their nested FieldLabel on their disabled members in Figma, as they
already do in code (#2738, #1339). Each field's `label` part maps its `disabled` state onto FieldLabel's `state=disabled`
(`variantWhen`), and leaves the label at `state=rest` on every other member, read-only included. The `codeOnly` entry that
recorded the rest-only label as a projection limit is retired on all four. The projected component surface moves on the
12 disabled members of each field (their stamp and nested coordinate); Update swaps each existing label instance in place.
No token moves, so CONTRACT is unchanged.

[claude-dialog-close-flush-shape · minor · eb27c47b] Dialog's close button takes the flush shape (owner QA, 2026-10-19). It nested FlushIconButton.Neutral at
`shape: round`, which drew a circle and a decorative edge around the X; it now nests `shape: flush, size: medium`, the
bare glyph with no edge or fill, whose hover and pressed move the glyph ink alone. The hit area stays 44×44px, drawn
in code. Every Dialog member's plan, the docs and `.ai.json` follow. No token path moves, so CONTRACT is unchanged.

[claude-2736-dtcg-font-scope · minor · 295cf07b] The DTCG font hint agrees with Figma (#2736). `$extensions.prism3.figma.scope` is gone from the `core.font.size.*` and
numeric `core.font.weight.*` leaves, whose Figma rows carry no scope (size since #2602, the numeric weights since #2616).
The family leaves keep FONT_FAMILY, which their rows still carry, and the fluid type sizes keep FONT_SIZE. An absent
`figma.scope` now means the row is unscoped. Every emitted `*.tokens.json` moves; no token path or value changes.

[engine-2616-unscope-font-weight · minor · a19629cd] Numeric font weights are unscoped in Figma (#2616, owner decision Q334 A, 2026-10-15). `core/font/weight/*` is written
with `scopes: []` like every other `core` primitive, so the font-weight picker offers only the weight roles
(`core/font/weight-role/*`, still FONT_WEIGHT). `core/font/family/*` keeps FONT_FAMILY. TokenPress types an unscoped font
row by its path, so the numeric weights still export as `fontWeight`. A file that already holds them takes the new
scopes on its next Update.

[claude-counter-label-exposed · minor · e527b76e] Counter label exposed (owner decision Q399 A on #2693). The Counter nests FieldLabel `nest-exposed`, exposing `emphasis`
and `weight`, with `size` still followed: the shape the fields and, with #2756, the groups use. The starting coordinate
stays secondary and regular, so the Counter looks as it did; a designer now sets the label's emphasis and weight, label
text and required marker on the Counter instead of inside the nested instance. No executor code moves and no token is
added or renamed, so EXECUTOR_REVISION and CONTRACT are unchanged.

[components-rows-textarea-state-props · minor · 9be4d89e] Row and Textarea state props (owner decision Q351 A on #2706, and #2708). Checkbox.Row, Radio.Row and Switch.Row
each gain their own `disabled` prop, and Radio.Row also gains `readOnly`, so a consumer disables or locks the labeled
row rather than its nested control. Textarea restates the field props its declared states and label need: `label`,
`onChange`, `helpText`, `required`, `disabled`, `readOnly`, `isPending`, `id` and `name`, in Text field's shapes.
Every new boolean defaults to a real `false`. `components.ai.json` and the four docs pages move. The props are code
API: no Figma member moves, so the projected component surface, EXECUTOR_REVISION and CONTRACT are unchanged.

[components-2427-counter · minor · b2c87979] Counter, a new component (#2427; owner decisions Q283, Q286 A and the wireframe decisions on #2427, Q287 A on
#2457): a whole-number quantity between a minus and a plus button, for ecommerce. `appearance: outline | ghost`
(outline first, Q283.4 A) × `size: medium | small | large` (medium first, Q283.6 B, now every ladder's rule under Q1 B) ×
`state: rest | focus-visible | disabled` = 18 members, on its own page under Components. The row is 36 / 44 / 56px
(`size.sm` / `md` / `lg.height`). Outline draws the field's fill and edge (`color.field.fill`,
`color.field.border.rest`; `color.disabled.border` at disabled) with the glyphs 12 / 12 / 16px inside it; ghost draws
no box. The minus and plus are two nested FlushIconButton.Neutral instances, each with its `state` exposed so a
designer sets one disabled at a limit: flush on outline, round on ghost (Q287 A). The value is at least 32px wide, in
`type.body.{sm,md,lg}.default`. The label (FieldLabel) is hidden by default (Q283.9 B) and the message
(FieldMessage) is off by default. The minus and plus glyphs are per-instance swap overrides on the two nested buttons (#2645). No new token, so CONTRACT is unchanged.

A nest relation can now map a host value onto a differently named child axis: `variantWhen`, beside `variant` and
`follow` on `nest-fixed` and `nest-exposed` (`{ appearance: { ghost: { shape: 'round' } } }`). The projector merges
it between the fixed `variant` and `follow`; the validator refuses an unprojected host axis, an undeclared value, an
empty map, an axis with no values, an empty coordinate, a child axis also followed, a child axis set from two host axes, and a child axis the fixed `variant`
does not name. It replaces `atState` (#2317), which did one case of the same job: the Password field's Show button now
says `variantWhen: { state: { disabled: { state: 'disabled' } } }`, and its projected plan is unchanged.

[components-2661-button-group · minor · 74056387] Button.Group (`button-group`) is a new component: one to three Buttons in a native `items` slot, on a `layout` axis
of inline, stacked and fill (#2661, owner decision Q363). Dialog's footer now nests it, one Button.Group per footer
layout, in place of two fixed nested Buttons; the `actions` prop is a slot of one to three Button elements. The
group's Cancel is the primary outline Button on its own, and the host decides otherwise (Q363.8 as amended, Q386,
Q418): Dialog's nest of the group prefers Button.Neutral for it when the file has that set, through a new
`PartDef.nestItemPrefers`, projected as `nestItemPrefer`, which both executors apply to the nested instance's default
item and which is never a build dependency. A nest can also prefer a sibling for the component it nests
(`PartDef.prefersWhenBuilt`, projected as `nestPrefer`, resolved first and fallen back from without a miss). A slot's `preferredWhenBuilt` offers the Destructive and Neutral
families when the file has them, without a miss when it does not. `PartDef.directionWhen` sets a box's direction per
member, so the group's one slot is a row inline and at fill and a column stacked. `layout` joins `VARIANT_AXES`. The
update carries a placed Dialog's changed button labels onto the group's default buttons (`COMPONENT_RENAMES` slot
entry `within`). No token name moves, so CONTRACT is unchanged.

[components-2804-password-show-small · minor · 772cf306] Password field: the Show/Hide button is a small text Button at every field size, and the label row is one label line
tall (#2804, owner decision Q380 A). The nested Button no longer follows the field's size: it nests `size=small` on all
84 members, and it stretches to the label row (`STRETCH`), so the row hugs the label alone. The row measures 18 / 21 /
24px at small / medium / large instead of the button's 36 / 44 / 56, and the label sits 8px above the box at every size
(the root gap, where TextField's label sits) instead of 17 / 19.5 / 24px. In code the button in the row sets
`block-size: auto` and `padding-block: 0`. Its code-side hit area stays 44×44 at medium and large, anchored to the
row's bottom edge so it never reaches into the input box, and 24×24 at small. No token moves, so CONTRACT is
unchanged.

[feat-style-guide-groups · patch · fac3208b] `style-guide-groups.ts`: the style-guide group table (#2801, owner decisions Q378), the seven titled groups the plugin draws its style guides into and `styleGuideGroupOf`, which picks one by a guide's type and tier, never by a family name. No emission changes.

[fix-q379-update-placement-furniture · patch · 1f8ed1ee] In the plugin, an update now moves a set that sits in the page header's row, as an earlier build placed it beside a
wide header, to below the header where a fresh build places it (#2802). An update's check now lists a set's canvas
labels and backdrops that are missing or out of place as a change, so running Set up file and then the update again
draws them, without touching any member (#2803). The component executor's revision is raised to 29. No emitted
artifact, token or projected component surface moves.

[claude-2609-dialog-close-x · minor · a0c9e99a] Dialog's close button always shows the close icon (owner decision, 2026-10-16, #2609), and is a FlushIconButton.Neutral,
round, medium, instead of an IconButton.Neutral (owner decision Q385 A, settling Q377 A), so a file built without the
IconButton sets still builds Dialog. Its `close` part sets the nested button's `swap icon` to `close` on every member
through a per-instance override (#2645), and Dialog declares no swap property of its own. The `close` boolean is
unchanged. Dialog's projected plan moves (15 members, same count); no token path moves, so CONTRACT is unchanged.

[components-default-member-size-icons · minor · 6027501b] Every size ladder leads with medium, and Button's icon slots lead with off (#2752, owner decisions Q1 B and Q2 A).
The member Figma inserts, the set's top-left one, now carries the code default on every axis: an inserted control
is medium, and an inserted Button is a plain label button with no leading or trailing icon. The canvas and the
properties panel read medium, small, large. Field label keeps small first, because its code default is small, and
Spinner keeps its icon ladder, because it builds one component per size. No member is added, removed or renamed,
so an existing set updates in place as moves only. The code enums are unchanged. No token is added or renamed, so
CONTRACT is unchanged.

[components-2695-field-style · minor · a49aaeca] Field style lever (#2695, owner decisions Q332 A and Q333, option A on all sixteen calls). A new Form lever,
`fieldStyle`: "Field style", Outline / Underline, default Outline, right after Control shape. Under Underline every
field component (Text field, Password field, Select, Textarea) draws one line under the value: a 1px bottom line
(`border-width.hairline`) in the field's own border roles, 2px (`border-width.thick`) at focus-visible plus the shared
focus ring at `focus.ring.offset` (2px), no inline padding (`space.0`), square corners (`radius.none`) under every
Control shape, no hover wash, no disabled plate (the ink takes `disabled.text` / `disabled.icon`), and Textarea's grip
inset by 2px above the line. Applied to a def before projection by `applyFieldStyle`, like Control shape: every field
keeps its 84 members, and every Outline plan is byte-identical. Engine: `PartDef.strokeEdges` binds the four stroke
sides apart (`strokeTopWeight` … `strokeLeftWeight`), and a `strokeEdges` key may name `{state}`. Both executors' 1px
weight fallback now stands down for a per-side weight too (EXECUTOR_REVISION 30). The fields' codeOnly `style` entry
names both values as brand-set; `variants.style` stays `outline` alone, so no per-instance coordinate is added. No token is added or renamed, so CONTRACT is unchanged.
The plugin executor assigns a translucent bound paint twice, so an in-place Update that moves a fill from an opaque
variable to a wash (Field style Underline → Outline at hover) keeps the wash translucent in one Update (#2774).

[components-2649-items-slots · minor · b56a0137] Checkbox group, Radio group, Tabs, List and Segmented control hold their repeating children in a native Figma slot
named `items` (#2649, owner decision Q307 A), in place of the fixed rows behind Figma-only booleans that #2344 gave
them. Each slot holds three items by default (Tabs and Segmented control with the first selected); the row booleans
are gone (Option 2-8, Tab 4-6, Item 4-8, Segment 3-5), and the header, label and Segmented control's Label toggle stay
outside the slot. Every other axis and token is unchanged. In code each takes `items`, a slot prop in Nathan Curtis's
spec shape: `type: slot`, `anyOf` the item def, `minItems` 1, and `maxItems` 6 for Tabs and 5 for Segmented control.
The Figma slots carry the same limits through #2646's `slotSettings` and `preferred`: at least one item, the same
ceilings, and only the item def, preferred-only.
Two names a consumer may reference go away, a breaking change for code or files that name them: List's `children`
prop is renamed `items`, and the row booleans listed above are removed from each Figma set.
The component-renames ledger gains a `slot` entry kind recording each def's removed booleans and old row layers, the
axes baseline records each set's component properties, and the component-surface baseline names them. An in-place
update of a set built the old way carries every placed instance across: its visible rows become slot items in order,
each with its own variant, label and checked state, a hidden row is left out, and anything that cannot carry over is a
named line in the dry run.
With #2645's per-instance overrides, List's three default items read "1." to "3.": the second and third override
List.Item's number. The plugin executor writes a nested instance's overrides and texts once per instance in a run, as
the paste payload does. Before, making a native slot rebuilt its items a second time and reported every override miss
twice.

[components-2725-leading-icon-step-down · minor · 76271dec] Segmented control, Tab and Tag step their glyph down one rung, as Button does (#2725, owner decision Q337 A,
2026-10-15): small `icon.size.xs` (16px), medium `icon.size.sm` (20px), large `icon.size.md` (24px), where they bound
the 1:1 rung (20 / 24 / 32px). On Tag the one rung sizes the leading icon, the check and the ×, so the three stay one
size (owner Q356 A). Icon button and Flush icon button keep their own rung. `lint-rung-names.ts` records the three defs in
`ICON_OFFSET_DEFS`. No token is added or renamed, so CONTRACT is unchanged; Update rebinds the glyph in an existing
file in place.

[fix-2595-adopt-moved-children · patch · f828cd2c] In the plugin, an update that inserts a frame between a node and children it already has now moves those children
into the new frame instead of rebuilding them (#2595), so they keep their ids and a placed instance's overrides on
them carry over. The dry run lists each as moving into the new frame, kept, instead of removed, and compares it to its
plan where it lands. A node a designer edited by hand is not moved and is rebuilt as before. The component executor's
revision is raised to 28. No emitted artifact, token or projected component surface moves.

[fix-2696-counter-axis-fill-agreement · patch · 05be1ba5] The component read-back accepts FIXED where the plan says AUTO on an axis the parent stretches (#2696). A node with
`layoutAlign: STRETCH` takes its parent's size on that axis, so its own mode there is moot, and the host switches
the mode to FIXED when the stretch resizes the axis. The rule is narrow. It applies only to a planned AUTO, only on
the axis the stretch fills, and only while the host still holds the stretch. A planned FIXED is never relaxed. The
plugin Update's post-apply verify and its dry run read this one predicate. They stopped disagreeing on Accordion's
indicators at medium and large. No committed artifact or projected component surface moves.

[fix-2707-prop-default-types · minor · 1ccc1bd5] Component props (#2707): a boolean or number prop's default is now written as a boolean or a number, never a string. Thirteen
defaults move in `components.ai.json` and the component comparison report: Tag `selected`, `showCheck`, `disabled` and `readOnly`;
Tab `selected` and `disabled`; Segmented control option `selected` and `disabled`; Segmented control `disabled`; Link
`isExternal` and `asChild`; Badge `showZero` (`false`) and `max` (`99`). Before this, an agent reading the JSON got the truthy
string `"false"` on these props and a real `false` on every other component. `validateComponentDef` now refuses a `boolean` or
`number` prop whose default has another type, so the class cannot return unnoticed.

[q347-figma-default-member · minor · cfed070a] Figma's default member follows the code default (#2752, owner decision Q347 A). Three axes reorder so the member
Figma inserts, the set's top-left one, carries the code default: Icon button's `appearance` (all three families)
leads with `ghost`, Veil's `intensity` reads medium, subtle, strong, and Image placeholder's `ratio` leads with
`4:3`. No member is added, removed or renamed, so an existing set updates in place as moves only. The code enums are
unchanged. No token is added or renamed, so CONTRACT is unchanged.

[engine-2650-release-notes · minor · 8c6ace33] Release notes per version (#2650, owner decision Q308.1 A): each fold writes `docs/public/releases/<version>.md` and
`.json` and an index, generated by `release-notes.ts` from the committed Figma axes, surface digests, coded
components and token contract at the previous fold and at this one, each change classified breaking, new or fix
by docs/30's rule. `lint-release-notes.ts` re-derives every release from git. The plugin's Update check shows the
breaking and new Figma items of the version it builds at for the sets it would change. Backfilled from 0.234.0.

[fix-disabled-border-binds-border-role · minor · f6ba5411] A border never binds an icon or text color role (owner decision Q346, #2749). The disabled outline edge of Button,
Button.Destructive, Button.Neutral, IconButton, IconButton.Destructive, IconButton.Neutral and Tag now binds
`color.disabled.border` (and its inverse twin on an inverse surface) instead of `color.disabled.icon`, which #1349 and
#1697 had chosen so the edge would clear 3:1 against the page. The edge is now the same muted neutral every other
bordered control uses in its disabled state. `lint-paint.ts` gains arm 5, which refuses any stroke bound to a variable
the committed Figma emission does not scope `STROKE_COLOR`. Update rewrites the binding in place in a file built
earlier. No token is added or renamed, so CONTRACT is unchanged.

[feat-segmented-control-redesign · minor · 0c529a14] Segmented control (#2724, owner decisions Q336 A and Q342 A, 2026-10-15): the selected look is now a flat pill on a
neutral track, superseding the tint and 2px outline of Q269.3 and the 1px track outline Q278 kept. The control's track
fills with `color.background.secondary` and has no outline. A selected option's indicator fills with
`color.background.primary`, with no border and no shadow, and holds at hover, pressed and disabled; its label keeps
the emphasis weight and the bold reserve, which are the state cue. Unselected options keep the neutral wash at hover
and pressed. No brand color in the control. Both roles already existed, so CONTRACT is unchanged. The label clears
4.5:1 and the icon 3:1 on the pill and on the track at every wash, and the focus ring 3:1 against the track and the
page, in every committed brand and mode. An in-place Update removes the old indicator border and track outline.

[fix-2477-update-verdict-misses · patch · 037c86ec] In the plugin, the update's verdict now reads the misses from the build's own pass (#2477). A set with any miss is
"not verified", so the headline is never a ✓ while one is left. A member whose as-built record the host refused is
named as not finished and leaves the "updated in place" count, since the next dry run reads it out of date. Any other
miss is quoted with its own reason. No emitted artifact, token or projected component surface moves.

[fix-2413-damaged-hand-layer · patch · a6b2dc75] In the plugin, a member that draws other than its plan and also has a layer added or removed by hand now reads
"edited by hand" in the update's dry run, not "to update" (#2413). The apply skips such a member under every choice,
so the dry run now says what the apply does; its damage is still listed as differences. The apply's skip reason names
the damage as well as the layer. No emitted artifact, token or projected component surface moves.

[claude-accordion-large-pad-x · minor · 514e98bb] Accordion: the large size's side padding is 20px, not 24 (#2726, owner decision Q338 A). `size.large.pad-x` binds
`space.250` instead of `space.300`, so the header's inline padding and the open panel's inline inset step 12 / 16 / 20px
at small / medium / large (comfortable; compact 8 / 12 / 16, spacious 16 / 20 / 24). Small and medium are unchanged,
the panel's bottom inset stays 12 / 16 / 24, and Text field and Select keep 24 at large. An Update corrects an existing
file in place: the 8 large members are rewritten, keeping every key and id. No new token, so CONTRACT is unchanged.

[fix-rest-keeps-press-q344 · minor · 2ab55d49] Prototype reactions: a Rest member of an interactive set carries While pressing → Pressed again, beside While hovering →
Hover (owner decision Q344, #2733). This reverts the hover-only chain of #2702 that appears in the same changelog. A touch
prototype has no hover, so Rest's own press reaction is the only route to Pressed. On a desktop it never fires, because the
pointer hovers first. Hover keeps While pressing → Pressed. The change applies to every set whose `state` axis holds rest,
hover and pressed (16 defs). EXECUTOR_REVISION 27: a file built under the hover-only plan reads its Rest members as
needing an update, with the missing press reaction named, and the update puts it back in place. No token or emitted
artifact moves, and CONTRACT is unchanged.

[chore-q319-6-tokens-html-on-demand · minor · 691e69d7] out/tokens.html is built on demand and no longer committed (Q319.6, owner decision on #2583). regen.ts drops the
visualize step and lists the page in ON_DEMAND_OUT: both out/ walks (regen's and lint-payload-manifest's) skip it, and
regen --check fails by name if any step writes it or git tracks it. visualize.ts takes --out <dir>; the root script npm run tokens-html
builds it into out/, where it is gitignored. lint-us-english and lint-voice skip a local copy and scan a page
rendered into a temp dir (regen.ts renderOnDemand), so the page stays in their scope in CI. test.ts renders its own copy into a temp dir for the #2586 specimen check.
The preview rule leaves payload-manifest.json, and the drift gate's artifact count drops by one. No token, emitted tree
or projected component surface moves, so CONTRACT is unchanged.

[claude-nested-instance-overrides-2645 · minor · 15c8e8ae] Per-instance overrides on a nested instance (#2645): a `nest` or `absolute` part that is `nest-fixed` or
`nest-exposed` may declare `overrides`, a text value by a key of the nested def's `figmaProperties.texts` and an
icon glyph by a key of its `figmaProperties.swaps`. The projection resolves each to the Figma property name the
nested set declares, and each glyph to the icon set's component, and refuses a key the nested def does not declare
or a glyph the icon set does not draw. Plans carry them as `nestOverrides`. Both executors write them with
`setProperties` on the nested instance once it exists (on Update, on the instance kept in place, unless a designer
changed it by hand) and read each one back, through one shared writer; swap targets are pre-built as dependencies.
The component read-back checks them off the instance's own `componentProperties`. List's items 2 to 8 now read
"2." to "8." in Figma instead of "1.". EXECUTOR_REVISION 26:
a file built earlier reads its List members "to update", and Update writes the overrides in place.

[fix-rest-hover-only-reactions · minor · 757a6e2d] Prototype reactions chain rest → hover → pressed (#2702, owner decision 2026-10-15). A Rest member of an interactive
set now carries While hovering → Hover only; the Hover member keeps While pressing → Pressed. Rest no longer carries a
press reaction of its own. Every set whose `state` axis holds rest, hover and pressed is affected (16 defs), on every
other axis alike. EXECUTOR_REVISION 25: a file built earlier reads its Rest members "to update" with the extra press
reaction named, and the update removes it in place. No token or emitted artifact moves; CONTRACT is unchanged.

[components-2317-password-field · minor · 7eacb197] Password field (#2317, owner decisions Q301, 2026-10-14). TextField's def is now built by a shared field factory,
`makeTextField` in `components/text-field.ts` (Q301.8 A, the `makeButton` pattern), and TextField's output is
byte-identical: no TextField artifact or projected surface moves. `password-field` (PasswordField) is the factory's
second output: TextField's anatomy and token block with no trailing slot, the label in a row with a nested Button at
its end (Q301.2 B), text appearance, flush, primary intent and emphasis weight (Q301.3 B), its size following the
field's. size x status x state = 84 members, no visibility axis (Q301.6 A); the default member shows a masked value
and "Show". Its own page under Components (Q301.9 B). Engine: `NestingRelation.atState` maps a host state to nested
axis values (the toggle nests Button's disabled member at the field's disabled member and rest everywhere else), and
`PartDef.nestTexts` sets a nested instance's own TEXT property; both executors write it with `setProperties`
(EXECUTOR_REVISION 24), and the round-trip reads it back. No token is added or renamed, so CONTRACT is unchanged.

[components-2609-dialog · minor · 9d91b88b] Dialog (#2609, owner decisions Q303): a panel over the page for a short task or a decision. 15 members: `placement`
[center, bottom, full] × `size` [medium, small, large] × `footer` [inline, stacked, none], with size only on the
centered panel (`excludeCoordinates` removes bottom and full at small and large). No state axis. The panel is
`color.foreground.primary` with `shadow.xl` as an effect style, `radius.2xl` on all four corners when centered, the top
two as a bottom sheet and none full screen; its padding is `space.300` centered and `space.200` on the two small-screen
placements. A header (the title in `type.label.lg.emphasis`, an optional description in `type.body.md.default` on
`color.text.secondary`, and a nested IconButton.Neutral, ghost, medium, as the close button), a nested Divider above and
below the body behind one `dividers` toggle, the body as a native slot, and a footer of nested Buttons. The backdrop is
not in the component: the plugin draws an `_scrim-backdrop` instance, bound to `color.scrim.default`, behind each centered
and bottom member as canvas furniture. Two new axis names, `placement` and `footer`. Engine: a root's built size per
coordinate (`PartDef.builtSize`, which also builds a root at a literal height through the new plan field
`placementHeight`), a box's shadow as its effect style (`PartDef.elevation`), its top and bottom corners bound apart
(`PartDef.radiusEdges`), and a boolean over several parts shown together (`together`). No new tokens; CONTRACT is
unchanged.

[components-2457-flush-icon-button · minor · c3a0eac4] FlushIconButton, a new component in three color families (#2457; owner decisions Q283.3 A on #2427, Q287 A and
Q295 on #2457): an icon-only button made to be nested (a counter's minus and plus, a card's close). On IconButton's
own pattern (#1225) the family is the component: `flush-icon-button` (FlushIconButton, primary),
`flush-icon-button-destructive` (FlushIconButton.Destructive) and `flush-icon-button-neutral`
(FlushIconButton.Neutral), each on its IconButton's ghost roles (`color.interactive.<family>.icon.*`, and on round
`color.interactive.<family>.overlay.{hover,pressed}`; `color.disabled.icon` at disabled).

Two shapes, `shape: flush | round`, flush first. `flush` has no padding, no fill and no border: the box is the glyph,
20 / 20 / 24px (`icon.size.sm` / `sm` / `md`), and hover and pressed move the glyph ink alone; in code the hit area
extends to at least 44×44px at every size, and Figma draws the glyph square only. `round` is a circle the Counter's
height across (36 / 44 / 56px, `size.sm` / `md` / `lg.height`), full-round, with a decorative edge
(`color.border.secondary` on every family; `color.disabled.border` at disabled) and the family's wash at hover and
pressed. `shape` × `size` × `state` (rest, hover, pressed, focus-visible, disabled) = 30 members per family, 90 in
all, carrying Rest → Hover → Pressed reactions through the existing mechanism (#2574). The three sit on one page
under Subcomponents. The usage text states the 44px spacing between two flush icon buttons center to center (Q296 A).
The three IconButton sets are unchanged. No new token, so CONTRACT is unchanged.

[components-2580-link · minor · 0310a540] Link (#2580, owner decisions Q289 and Q297, 2026-10-14): a new component, `link`, a standalone link plus an inline look. A link
inside a paragraph stays a text range with the existing `-link` text styles. 96 members: `style` standalone | inline ×
`weight` emphasis | default × `size` small | medium | large × `surface` default | inverse × rest, hover, pressed and
focus-visible. Both styles set the body tier, 14 / 16 / 18px, with no 12px link (Q297.1): `default` binds
`type.body.<rung>.default`, `emphasis` the heaviest body weight the brand ships (`strong` in a default brand). Standalone
binds the plain style at rest and its `-link` twin at hover, pressed and focus-visible; inline binds the `-link` twin at
every state. Ink is `color.text.link.*` and `color.icon.link.*`, the
inverse twins on `surface=inverse`. One text line tall, no padding; an optional trailing icon on standalone links only, 16px with
14px and 16px text and 20px with 18px text (Q297.2); the shared focus ring. Visited, current and the 24px hit-area expansion are code only. Its own page under Components, with canvas
furniture and Q238 A reactions (48 sources, 72 reactions).

Engine: a part's `type` binding key may name `{state}` (type only, never geometry), expanded over the def's declared
states, and a structure-only plan resolves it at the first state. `weightIntent` takes an optional `intents` map, so an
axis that keeps its own value names (Link's `emphasis | default`) resolves per brand like field-label's `regular | bold`,
and the repoint keeps a `-link` suffix. A brand that ships one body weight drops Link's `weight` axis (48 members). Button's `href` is documented as the way to navigate
with a button's weight (Q289.6 A, no LinkButton), and `link` leaves the `planned` lists it was on. No new token, so
CONTRACT is unchanged.

0.237.0 — folded 2026-10-15 from 29 change notes, newest merge first.

[engine-2412-motion-variables · minor · 9831c76f] Motion reaches Figma in Figma's own motion types (#2412, owner decisions Q291 A). The `motion` collection's durations
(`motion/duration-ms/*`, `motion/duration/*`, `motion/duration-reduced/*`, `motion/stagger`) are TIMING variables in
seconds instead of FLOAT milliseconds, so a Figma animation can bind them. The easing curves join as EASING
`CUSTOM_CUBIC_BEZIER` variables (hidden from publishing), the easing roles as EASING aliases of them (re-pointed per
mode where a mode lever moves one), and the springs as EASING `CUSTOM_SPRING` holding `bounce` only (1 − the damping
ratio). Transitions have no Figma form: Figma has no composite variable (`MOTION_FIGMA_COVERAGE` says so per family).
Figma refuses `scopes` on both types, so they stay `ALL_SCOPES` and no executor writes one. Apply Theme writes the
collection through the new `buildMotionVarPlan` and the mixed-type executor, and the CLI paste path through a new
`motion-vars` pass. On a file themed at 0.235.0, Apply replaces the FLOAT motion variables in Prism3's own stamped
`motion` collection with TIMING ones under the same names, and says how many (owner decision Q293 A); every other
type mismatch still refuses. The CLI's `motion-vars` pass checks every row's type before any write and, on a mismatch, writes nothing and names it; it cannot see the stamp, so it never replaces. Every brand's `out/figma/<brand>/motion.json` moves. The DTCG does not, so CONTRACT is unchanged.

[components-2646-slot-constraints · minor · afe5d369] Native slot constraints (#2646, owner decision Q306.1 A). A `contentSlot` part may declare `slotSettings`
(`minChildren`, `maxChildren`, `allowPreferredValuesOnly`, `displayEmptyByDefault`) and `preferred`, a list of def ids.
`validateComponentDef` refuses them off a native slot, a count that is not a whole number, a min above its max, a max of
0, preferred-only with nothing preferred, an unknown setting, and an empty or repeated preferred list. The projection
checks each preferred id against the registry and throws naming one that is unknown, the def itself, a building block,
a def that does not project, one refused alone, or one that builds standalone components. The plan's slot node carries
them (`slotSettings`, `slotPreferred`) and the set's SLOT property plan takes them. Both executors write them on the
SLOT property with `editComponentProperty` after the property phase, each preferred id resolved to the key of the set
built under its name; a preferred def not in the file is a named miss, and a preferred-only slot with none of its
preferred sets built is written open, with a miss. The plugin executor also writes an Update's dropped constraints back
to Figma's defaults. The read-back (`anatomy-readback.ts`) compares both fields off the SLOT property the slot node
references, naming preferred keys through a new optional `componentName` port. No committed def declares a constraint
yet (Accordion's panel stays open, a DRAFT owner item), so no projected component surface or token moves, and CONTRACT
is unchanged. The engine's `0.237.0` stamp moves with the fold as usual.

[plugin-2485-furniture-moved-set · patch · ab8ce1b3] Plugin only (#2485). When a Build or Update draws a set's canvas labels and inverse backdrop, it now also removes
that set's own earlier furniture from any other page or frame. A set a designer moved no longer leaves its labels and
backdrop behind on the page it came from. Matching is by the set's id in the furniture tag, so another set's furniture
and untagged nodes are never touched. No emitted artifact, token or projected component surface moves.

[plugin-2601-dry-run-file-checks · patch · 84191c6a] In the plugin, the update's dry run now makes every check the apply's preflight made (#2601): a variable the plan
binds, a text or effect style it names, a component it nests or swaps to, and every font the set's text needs, loaded
during the dry run. Each one the file lacks is a blocker on the set, so the confirm step lists every set the apply
refuses. The apply's preflight is now the dry run's blockers, read again. A set's blockers are part of the preview
hash, so a font or variable that comes or goes between the check and the confirm refuses the apply. No emitted
artifact, token or projected component surface moves.

[plugin-2605-created-header-anchor · patch · 5b9b252b] Plugin only (#2605). A section header that file setup or a build creates now goes at the end of the previous
section's span instead of after that section's furthest page in the file. A Foundations page kept under Sandbox no
longer pulls a created `Components` header into Sandbox. The header reuses the divider that closes the span only when
the section's own pages follow it; with a designer's page or section there, it gets a divider of its own and the
designer's pages keep theirs. No existing page moves. No emitted artifact, token or projected component surface moves.

[components-2418-segmented-control · minor · b2027a36] Segmented control (#2418, owner decisions Q269 1-8 A, 2026-10-13): two new defs on their own page. `segmented-control-segment`
(SegmentedControl.Segment) is one option, selection x size x five states = 30 members: a cell on Button's height rung with
an indicator inset 4px inside it that carries a tint (`interactive.primary.subtle-fill.selected`) and a 2px
`interactive.primary.border.*` outline when selected, a neutral overlay wash at hover and pressed, and the label in the
emphasis weight when selected, held at its bold width by Tab's clipped reserve. The selected label keeps the neutral ink.
`segmented-control` (SegmentedControl) is the control, size only = 3 members: an optional nested FieldLabel above a 1px
`interactive.neutral.border.rest` track (`radius.md`) holding five nested options, 3 shown, behind the Figma-only toggles
Segment 3 to Segment 5; option 1 is selected. A `behavior` prop (view by default, form) is code-only. Engine: `grow` is now
valid on a `nest` part (Q269.6): the plan carries `layoutGrow: 1` and the instance's own main-axis mode FIXED, and both
executors write `layoutGrow` on the instance from the parent's pass, so the options share the track equally. Tab's
avoidWhen and Tabs' usage and avoidWhen name the segmented control instead of "not built yet". No token is added or
renamed, so CONTRACT is unchanged.

[engine-2602-descope-primitives · minor · e4b56252] #2602 (owner decisions, 2026-10-13 and Q292 A, 2026-10-14): every variable in the Figma `core` collection
is emitted with `hiddenFromPublishing: true`, and every one but the font family and weight rows with
`scopes: []`. That covers the palette, `dimension/*` and every `core/font/*` row: family, size, weight,
weight-role and the style cuts. Empty scopes hide a variable from every local picker in the file that
defines it, and hidden-from-publishing hides it from library consumers, so designers no longer de-scope
primitives by hand after each Apply. `font/family/*` keeps `FONT_FAMILY` and `font/weight/*` and
`font/weight-role/*` keep `FONT_WEIGHT`, because TokenPress types a font variable's DTCG `$type` from its
scope; fully unscoping them is #2616. The weight-role and cut rows were not hidden before; they are now,
with the rest of `core`, and the size and cut rows lose their font scope. Text Styles still bind the size
and cut variables through the Plugin API, which scopes do not limit. `layout`'s `grid/columns` drops
`ALL_SCOPES` for `[]`: no `VariableScope` member covers a layout-grid count, and nothing in Prism3 binds
it. Both write paths, the plugin's Apply and the paste payloads, read these values off the same emission.
Semantic scopes, names and values are unchanged, so CONTRACT is unchanged. The PRIMITIVE comment in
`emit-figma-color.ts` said `scopes: []` behaves as ALL_SCOPES and nothing can hide a variable locally.
That claim was wrong and has been rewritten.

[fix-2468-paste-paint-base · minor · c1a34050] The MCP paste payload bases each bound solid paint and each gradient stop on its variable's own resolved color for the node, black only where nothing resolves (#2468), mirroring the plugin executor's #2379 and #2391. A wash's alpha is the solid paint's opacity; a stop keeps its alpha in its color. No committed artifact moves.

[plugin-2598-furniture-placement · patch · 6cc31e72] Plugin only (#2598). A set built onto a page that holds a section header now takes the first free slot under the
header, scanning right from its left edge, whether or not a sibling set is still on the page; before, a sibling sent
it past everything in the row, beyond the header's right edge. A build or an update in a file without `_Label` or
`_inverse-backdrop` now says so in one line that asks the designer to run Set up file, and the update's line reaches
its summary as well as its lines. Such a run is a warning: its verdict is `ok: false` and its `✓` headline reads `⚠`
(owner decision Q284.3 A). `EXECUTOR_REVISION` 19. No emitted artifact, token or projected component surface
moves.

[plugin-2597-page-order-real-file · patch · 77f3ecfc] Page order on a real file (#2597), plugin only, no committed artifact moves: file-setup and the page-aware build
never move a page that already exists, and a build creates no divider beside a section header that exists. Every
page move goes through one primitive that lands right after its anchor under either reading of the host's
insertChild index, so the in-place Update's forward moves no longer land one slot early.

[components-2319-list · minor · 9c4e5439] List and List.Item (#2319, owner decisions Q273): a read list of short text items. `List.Item` is 9 members (`type`
[unordered, ordered, icon] × `size` [small, medium, large]): a marker in a fixed-width column one body line tall
(`control.size.*.line-box`), then text in `type.body.{sm,md,lg}.default` that wraps under itself. The bullet is a round
`control.size.*.dot` in `color.icon.primary`, the number is text in the item's own type in `color.text.primary`, and the
icon is a swap slot starting at `check` in `color.icon.primary`. `List` is 9 members, a column of nested items following
its type and size, three shown and five more behind Figma-only booleans, with a density-following item gap. No states,
no new tokens. A slot can now name its own default icon (`PartDef.swapDefault`): its swap property starts at
`icon/<glyph>` instead of the file's nominated default. The Divider lists List as a partner, no longer as planned.

[plugin-2592-dry-run-agrees · minor · 4fb252a5] `COMPONENT_RENAMES` holds its first two entries (#2592): Accordion's icon axis, `position` and `iconPosition`, both
renamed to `icon position`. Both names lived only on #2534's branch before it merged, so a set built from either head
now updates in place: its members are renamed and keep their keys and ids, where the update read a removed axis and
refused the set. The ledger speaks the Figma panel's names, so an axis that gains a display name (`variantAxisNames`)
is an axis rename to it, and `lint-component-renames.ts` already demands the entry when that happens on main. No
emitted artifact, token or projected component surface moves, so CONTRACT is unchanged. In the plugin, the update's
dry run and its apply share one refusal test (`setRefusal`): a collapse, an axis change over members not built by
Prism3, and a rename onto another member's name are blockers in the dry run, so the confirm step lists every set the
apply refuses for them. Adopt is refused by the same blockers, except the axis change over members not built by
Prism3, which Adopt clears by claiming them. A set whose only change is renames no longer reads as up to date.

[claude-2586-label-line-box · minor · 40a653b4] Label line-box tokens (#2586, owner Q266 A, Q267 A, Q275 and Q282 A, 2026-10-13): each label rung gains
`type.label.{sm,md,lg}.line-box`, one line of the `type.label.{rung}` type (font size times line height, rounded to a
px). It is baked as `control.size.*.line-box` is for body (#1201), because Figma variables cannot multiply, and is
carried into the single-mode Figma `control` collection as `type/label/{rung}/line-box`. A glyph beside a wrapping
title centers in a box this tall and sits on the title's first line at any label line height. `buildTree` throws when
two label composites at one rung disagree, naming both (as #1220). In every corpus brand the values are 14, 16 and 21px
at sm, md and lg. It is the first non-composite leaf under `type.*`: `tokens.html` draws type specimens for
typography leaves only, and the AI sidecar gives the leaf a role in its layout tier (beside `control.size.*.line-box`) instead of the primitive tier; the sidecar schema's layout pattern admits the path. CONTRACT
14.6.0 to 14.7.0 (three paths added). No component binds it yet.

[components-2594-accordion-header-row · minor · a35c3008] Accordion's header centers a new `titleRow` frame holding the indicator and the title (#2594, owner decision Q276 A).
The header was top-aligned so the glyph could sit beside a wrapped title's first line (Q262 A), and that put all of
the 44px floor's slack below a single line: 6px high at small. The row keeps its items top-aligned, so a wrapped title
still keeps the glyph on line one, and the header centers the row, so one line is centered at every size, type and
density. The gap moves from the header onto the row; padding, the focus ring and the Divider are unchanged. Every
binding is an existing role, so CONTRACT is unchanged. A set built before this updates in place, every member kept.

[claude-2569-border-ladder · minor · f362d372] The neutral border ladder is two decorative rungs, then the first accessible one (#2569, owner decision Q259 C with
1A, 2A and 3A; closes #2498). `border.secondary` targets ~2:1 against the page in light and ~2.4:1 in dark, with no floor
(step 250–300 in light; 650 in dark, a full 100 steps from `border.primary`'s 750, owner Q270.2; it had a 3:1 floor
since #1745). Its HC description drops "decorative" (Q270.6). `border.tertiary` is the quietest neutral step that clears the mode's
non-text bar (3:1; 4.5:1 in HC) against every page and surface tier, `background.*` and `foreground.*` (550 in light,
500 in dark across the corpus), contracted against `background.primary` and, as `alsoAgainst`, against whichever
of the other five grounds it measures lowest on. HC keeps its escalated targets and its steps. The inverse ladder
is unchanged. Badge's subtle neutral edge moves to `color.border.tertiary`; Divider gains a code-only
`separator.fill` binding (`color.border.tertiary`) for decorative=false, while its decorative default and Tab's hover
bar stay on `color.border.secondary`. Values and role descriptions move in every brand's light and dark modes; no
token name changes, so CONTRACT is unchanged.

[components-2417-accordion · minor · e546f0fd] Accordion (#2417, owner decisions Q182 and Q183): one expand and collapse section, 24 members (`expansion` ×
`iconPosition` × `size` × rest and focus-visible), its header the button, its panel a native Figma slot holding
placeholder text in page ink, a nested Divider under it, and the shared focus ring. Its open and closed glyph is a
building block, `_accordion-indicator` (12 members: `indicator` × `expansion` × `size`), nested in the header with
`indicator` exposed. Two new variant axes, `expansion` and `iconPosition`; a def id may lead with `_` for a building
block; `PaddingDef.blockEnd` pads a box's bottom apart from its top; and a new `body` paint slot for text that
belongs to the page rather than to the control around it. A wrapping text under a column now stretches across it (`layoutAlign: STRETCH`) rather than growing
down it, which left the panel's placeholder one line wide and overflowing; no shipped def had that shape before. The owner's QA of the live build: the header row is top-aligned with the glyph centered on the title's first line (Q262), the glyphs are 16/20/24px, the axis is `iconPosition` (Figma "icon position", through a new `FigmaProperties.variantAxisNames`), and
the focus ring is drawn inside the header's edge through a new `PartDef.drawnInside`, which an absolute part declares in
place of `strokeInset` when its stroke is meant to fall inside its host.

[engine-menu-line-icon · minor · 07ddeca3] The hamburger joins the shared icon set (owner decision Q253 A, 2026-10-12): `menu`, Remix Icon's `menu-line`, three
2px bars on the 24px grid, normalized like the rest of the set (`fill="currentColor"` on the path). The icon set goes
from 44 names to 45, so `icon-glyphs.ts`, the `icon` def's `name` axis and its committed docs list it, and every
component with an icon slot can take it. No token moves, so CONTRACT is unchanged. NOTICE.md's Remix Icon attribution
covers it.

[claude-2566-icon-scopes · minor · e8cad935] Icon color roles are fills only in Figma (#2566, owner decision): every icon is a fill, never a stroke. Every icon
color variable (`color.icon.*`, `color.inverse.icon.*`, `interactive.<c>.icon.*`, `disabled.icon` and their inverse
twins) now scopes to `FRAME_FILL` and `SHAPE_FILL` only. `STROKE_COLOR` is gone, so icon colors no longer appear in
Figma's border color picker. Scopes only: no variable name, value or alias moves, so CONTRACT is unchanged. The
committed Figma color files under `out/figma/` move. Apply Theme already rewrites a variable's scopes on update, so
re-applying a theme to an existing file moves its icon variables onto the new scopes in place.

[claude-2552-consumer-build · minor · e5a4f5df] The consumer token build (#2552, owner decision Q250 A, 2026-10-12): the conforming projection is now the clean
consumer set. `<brand>.base.tokens.json` and every `<brand>.<mode>.overlay.tokens.json` carry no `$extensions`
anywhere, so a token holds only `$value`, `$type` and `$description`, and the base file no longer carries the
generator stamp or the `decisions` log. Measured against the previous projection: all 20 files are byte-identical to
it with `$extensions` removed, and nothing else moved. `buildOverlaySet(tree)` strips by default;
`buildOverlaySet(tree, { metadata: true })` keeps the metadata for the studio's internal "Include build metadata"
export. The single-file `<brand>.tokens.json` keeps every extension (its non-default modes live there) and stays
internal. No token name changes, so CONTRACT is unchanged. `lint-consumer-build.ts` holds the projection to this shape.

[components-tabs-selected-weight · minor · ce21523d] Labels always carry the default weight, and a selected tab is set in the emphasis weight (owner decisions Q225 A and
Q226 A). Every brand now emits `type.label.{sm,md,lg}.default` and `.default-link` and their Figma text styles,
whatever its label weights or `buttonLabelWeight` say (CONTRACT 14.6.0, six added paths; NB's legacy theme ships them
too). Tab binds `type.label.*.default` unselected and `emphasis` selected, and holds every tab at its bold label's width
with a hidden bold copy of the label (a zero-height, clipping `reserve` box whose `labelReserve` text the same Label
property drives, `texts.<prop>.also`), so selecting a tab still never moves its neighbors. Revises Q178.1 A's one weight;
its goal stands. "Button label weight: Default" now only rebinds the button family. An empty label weight set is still
refused by name (#1639).

[components-2518-tabs-centered · minor · ae3ec5cc] Tabs gains an `alignment` axis, `start` (the default, the approved list) and `center` (#2518, owner decision Q222 A).
A centered tab list keeps each tab hugging its label and sits centered in a bar that spans its placement; the
baseline spans the full width. The Figma member is built 480 wide, room for six large tabs (DRAFT). Tabs goes from 3
members to 6 (size × alignment); the start members project byte-identical to before. `alignment` joins the closed list
of variant axis names, and a root box can declare `center` (axis, value, build width) to center its children at one
coordinate. Every binding is an existing role, so CONTRACT is unchanged.

[engine-2417-native-slots · patch · dc9523ce] Native Figma slots (#2417): a `box` part declaring `contentSlot: true` projects as a `CONTENT_SLOT` node and builds
as Figma's own SLOT, the region a designer fills with their own content on an instance, with one SLOT property per
slot name on the set; a text part inside one carries literal `characters`, since Figma refuses a property
reference there. Both executors build it, the read-back expects a SLOT, and the update path converts a slot a
member gains. No def declares one yet, so no committed artifact or projected component surface moves; Accordion is
the first that will.

[claude-2502-furniture-rollout · minor · 633e5cf9] Canvas furniture on every component def that builds a set (#2502, owner decision Q212 A). The switch, renamed
`CANVAS_FURNITURE` from `CANVAS_FURNITURE_PILOT`, now lists all 27 such defs; Icon and Spinner build single components
and stay off. For the five newly covered defs with a `surface` row axis (Button destructive, Button neutral and the
three icon buttons), `planSetLayout` now groups `surface` outermost, so their inverse rows form one block, as Button's
have since #2471. Layout only: no member is added, removed or renamed, no token moves, so CONTRACT is unchanged, and an
existing file sees the regrouped members as moves on its next Update. The paste payload places a new set 400px right of
its neighbors, not 160, matching the plugin's widened `SET_GAP`, so a later set's row labels fit between the two.

[ui-2467-grid-style-names · minor · e06ab97f] The layout grid styles drop their `Grid /` group and are named by the bare breakpoint: `sm`, `md`, `lg`, `xl`,
`2xl`, plus `xs` where a brand has it (#2467, owner decision Q185 A). Figma's styles panel no longer shows them
inside a "Grid" group. Only `out/figma/<brand>/grid-styles.json` moves; the DTCG trees and the `layout.grid`
variables are unchanged. The plugin renames an old `Grid / <bp>` it owns to `<bp>` in place, keeping its id so
every layer using it stays linked, and never creates `<bp>` beside it. Ownership is the #1884 mark, else the
engine's grid-description signature, never the name: a client's own `sm` is not adopted. The apply skips that
one size, leaves the client's style untouched, names it in the result line and applies every other size (owner
decision Q234 A); the pre-flight raises no conflict for grid styles. The opt-in prune spares an old `Grid / <bp>` whose size the plan
still emits, and no longer reads a bare size as a style group. CONTRACT is unchanged: style names are not in
the token contract.

[components-2501-axis-order · minor · 6342ab61] One axis value order in every component def (#2501, owner decisions Q213, Q220 A and Q221 B). Sizes run smallest
to largest, except text-field, textarea and select, which keep `medium, small, large` as a named exception so the
field a designer inserts stays Medium (Figma takes a set's default from its top-left member). States run Rest,
Hover, Pressed, then Focus, then Disabled: button, icon-button and their destructive and neutral siblings now project
`rest, hover, pressed, pending, focus-visible, disabled` (Focus visible was before Pressed), and their code `states`
put `inactive` after `disabled`. The fields' and switch-row's code `states` put `pending` after the press group.
No member is added, removed or renamed, and no token moves, so CONTRACT is unchanged; an existing file sees the
reordered members as moves on its next Update.

[claude-2455-divider-v2 · minor · ab858f2f] Divider (#2455): a new component, a 1px rule that separates groups of content, after the KB brief
(`components/divider.md`, category foundations). Two axes, `orientation` (horizontal | vertical, a new name in
VARIANT_AXES) and `inset` (none | inset | middle-inset, a disjoint value set under the existing name), five
members (a vertical rule takes no start-only inset), no states. A padded root paints nothing; its one child,
the rule, fills it: thickness `border-width.hairline`, color `color.border.secondary`, a nominal standalone
length a host stretches, and the inset as the root's padding (`space.200`; `space.100` for a vertical middle
inset). A `decorative` code prop, default true (`aria-hidden`); with `decorative=false` it is an `<hr>` or a
`role="separator"`. No Figma property for it, since it changes no pixel. No token name moves, so
CONTRACT_VERSION does not.

[claude-2406-canvas-furniture · minor · 555b4d6a] The canvas-furniture pilot (#2406 Q171, #2188 Q172 and Q173 A, 2026-10-09): `CANVAS_FURNITURE_PILOT` in
`anatomy-figma.ts` switches it on per def, for Button, Tag and Text field. For a piloted def with a `surface` row axis,
`planSetLayout` moves `surface` to the outermost row grouping, so every `surface=inverse` row sits in one contiguous
block (Button: rows 48 to 95). Layout only: member names, coordinates, keys and the plan order the members are built and
combined in are unchanged, so the properties panel's value order holds (#2386). Both executors lay a piloted set out
the same way, since both call `planSetLayout`. No emitted artifact, token or projected component surface moves, so
CONTRACT is unchanged. The plugin reads the same switch to place `_Label` instances and an `_inverse-backdrop` around
the set.

[claude-2411-metadata-rules · minor · 305136d9] Token and component metadata follow one rule: consumer prose says what a thing is for and names no tool (#2411,
owner decision Q167, 2026-10-09). No free-text note survives in the token trees: the `figma.note`, `prism3.note`
and `a11y.note` strings and the mode-override notes are gone, each fact now held by a structured field or dropped
where one already held it. Gradients carry `figma.requires` and `figma.interpolation`, and their `a11y` block
carries `floor` and a per-ink `clears` verdict, computed from each ink's own measured worst case. That closes
#2422: the old note said neither ink cleared 4.5:1 whenever either one failed, while white text measured 5.36:1.
Each brand's Figma `gradient-styles.json` copies the same structured verdict. Every step of a status palette carries
`$extensions.prism3.hueSource` ("brand" or "default"), so the defaulted danger and info ramps' `$description`
keeps the purpose only. The grid descriptions, two decisions and the strikethrough guidance no longer name a
tool; strikethrough's per-surface half moves to `modifiers.strikethrough.{code,figma}` in the `.ai.json`
(schema prism3-ai-metadata/0.5). Component strings that only explained the Figma projection move to the
maintainer-only `notes.projection`. CONTRACT is unchanged: no token path is added, removed or retyped.

[claude-2416-tabs · minor · 2baf731e] Two new components, Tab and Tabs (#2416, owner decisions Q177, Q178 and Q179). `tab` is one trigger:
`selection` [unselected, selected] × `size` [small, medium, large] × five states, 30 members, with node-visibility
booleans for a leading icon (and its swap) and a count, the count a nested Badge (count · bold · neutral). A selected
tab shows the primary text color and a 2px bar in `color.interactive.primary.border.*` at `border-width.thick`; the
label keeps one type binding in both states, so selecting a tab never moves its neighbors. There is no hover wash:
an unselected tab at hover and pressed shows a 2px bar in `color.border.secondary`, the neutral edge role contracted
at 3:1 against the page. `tabs` is the list: `size` (3 members), six nested Tab instances following its size, tab 1
selected, tabs 4 to 6 behind Figma-only toggles, over a 1px `color.border.primary` baseline. Both build on their own
`↳ Tabs` page under Components. Every binding is an existing role, so CONTRACT is unchanged.

0.236.0 — folded 2026-10-10 from 7 change notes, newest merge first.

[engine-2345-image-placeholder-ratios · minor · 928eba45] #2345 (owner direction 2026-10-07): image-placeholder gains four ratios, portrait 2:3, 3:4 and 4:5 and landscape 3:2,
beside 1:1, 4:3 and 16:9, ordered tallest to widest, so the set builds seven members; the default stays 4:3. Its
"no image" marker now scales with the frame: it leaves the auto-layout flow, sits centered and is constrained
SCALE/SCALE, which the frame's aspect lock keeps uniform, so a 64px thumbnail shows a 16px marker rather than a
cropped 180px one. A new `PartDef.scaleWithParent` carries it, projected as `absoluteCenter` plus a new
`absoluteScale` plan field that both executors honor and the read-back checks. A Figma-only `Marker` boolean,
on by default, hides the marker once an image is supplied. There is no code prop: in code the marker follows
whether an image is supplied. No token name moves (CONTRACT unchanged).

[claude-2408-flush-hit-area · minor · 7541db76] A medium or large flush text button's hit area is at least 44×44 in code (#2408, owner Q154 A and Q170 B, 2026-10-09), and a small one's at least 24×24, the WCAG 2.5.8 floor (owner Q174 B). Button, Destructive and
Neutral share the rule: `codeOnly` and the `inset=flush` line in `docs.do` now state it, with the technique (a
transparent `::before` inset outward and centered on the label), replacing "at least its default sibling's size".
The box stays label-width so the label still lines up, and Figma is unchanged. Regenerated into
`out/components/button*.md`, `components.ai.json` and `component-maintainer.json`. No token moves, so CONTRACT is unchanged;
the projected plans' `codeOnly` text moves (no member, geometry or binding), so `schema/component-surface.json` is
accepted. `lint-hit-target` gains a FLUSH MEMBERS arm that requires each flush def to state the rule.

[claude-icon-instances-2380 · minor · dc26854e] Every icon-set glyph inside a component is an instance of its icon component (#2380, owner
decision Q137 A). A vector part whose glyph is in the icon set, in any def but icon itself, projects as a
NESTED_INSTANCE of icon/<glyph> instead of an inline SVG import: field-message's three status glyphs,
checkbox-control's check and dash, switch-control's two thumb glyphs, tag's check and dismiss glyphs, select's
chevron, textarea's resize grip and image-placeholder's marker. Each keeps its size binding (or glyphPx) and
takes its ink as descendantFills; no swap property is added. The spinner's composed glyph and the icon def's
own glyph stay inline. Checkbox's 0.8 inset (#1346) moves from a padded artboard to a new plan field,
glyphInset: the part is a frame bound to the control box holding one instance named glyph, placed at 0.8 of
the frame with SCALE constraints, so the rendered ink is where it was. The padded-artboard path is removed.
Both executors build the inset and size a glyphPx instance; the read-back checks glyphInset against the
parent box. CONTRACT unchanged.

[engine-q152-row-min-width · minor · df1ec58b] Checkbox-row, radio-row, checkbox-group and radio-group shrink with their column, as the fields do (owner decision Q152.3: Q99 B reaches the
rows). The row's root is built at 320 (`placementWidth`, the fields' #2292 mechanism) and fills its column when a
host places it, down to the fields' 120 floor (Q152.2). Before, the root hugged above a `minWidth: 320` floor, so a
row in a column narrower than 320 held at 320 and overflowed it. An unplaced row still reads at 320, and the label
still fills the row and wraps. Both values are literal projection defaults, so no token name or value moves and
CONTRACT is unchanged. Checkbox-group and radio-group follow their rows (owner decision Q155 A): their container, which floored at 320,
is now built at 320 and fills its column down to the same 120 floor.

[components-2318-focused-filled · minor · 66368ac5] Text field, select and textarea project the focused field that holds a value, `state=focus-visible-filled` (#2318,
owner decision Q157, 2026-10-09). It is the focus-visible member's focus ring and focus border (each status keeps its
own border) around the filled member's value in `text.primary`, with no placeholder. Each set grows from 72 to 84
members (size 3 × status 4 × state 7), 12 new per field; the 72 existing members project exactly as before, so an in-place
update adds the 12 and renames, moves or replaces nothing. On the new member text field draws its caret at the END of
the value (owner decision Q166 C), in a new `caretEnd` part on a new `caret-end` paint slot; textarea and select draw no
caret there. An absolute part's `when` may now name a list of states, so the one focus ring shows at both focus states;
an overlay's `when` still names one. No token name or value moves, so CONTRACT is unchanged.

[engine-2344-group-rows · minor · 7582fe27] Checkbox-group and radio-group carry up to eight rows (#2344, owner decision Q156 A), Prism 2's mechanism at eight
rows where it had six. Each group nests eight rows: row 1 is always shown, and rows 2 to 8 each sit behind a
node-visibility boolean, "Option 2" to "Option 8", with rows 1 to 3 shown by default, so a group reads as the three
rows it always did. Booleans don't multiply the set: each group stays at 3 members. The booleans are a new
FIGMA-ONLY form (`figmaProperties.booleans.<key>.figmaOnly: true`): it drives no code prop, because in code the
row count is `children`. A Figma-only key must not be a declared prop, and must carry a `figmaName`. No token name
or value moves, so CONTRACT is unchanged.

[docs-2340-strikethrough-modifier · minor · b741c76e] Strikethrough is a documented modifier on the existing text styles, not a style of its own (#2340, owner Q150 D,
2026-10-09). Every body and caption composite's `.ai.json` entry (body/xs included, the `-link` variants not) now
says how to strike text: the same style plus a line-through modifier (`<del>` or `<s>` with
`text-decoration-line: line-through` in code, a strikethrough override on the style in Figma), with visually hidden
text naming it ("Original price:", "Sale price:"), and that Prism3 mints no strikethrough style. No token, style or
value moves, so CONTRACT is unchanged; only the five brands' `.ai.json` guidance changes.

0.235.0 — folded 2026-10-09 from 5 change notes, newest merge first.

[claude-2350-flush-text-buttons · minor · 982f0f58] Flush text buttons in 0.235.0 (#2350 part 1, owner Q143 items 1 and 2, the correction to item 3, and Q145 A).
Button, Destructive and Neutral gain an `inset` axis, `default | flush` (name, values and wording DRAFT for the owner),
on the text appearance only: `figmaProperties.excludeCoordinates` removes it from filled and outline, so each set grows
from 432 to 576 members (144 flush text members). A flush member binds both inline paddings to `space.0` and drops the
#1667 minimum width, so it hugs its label and the label sits on whichever content edge it aligns to: start, end, or
both in a centered row. Under "Locked to edges" both pinned icons sit at the edge, each side's reserve less the inset.
The container paints no overlay wash, so a flush button hovers by color only even when the brand's "Text button hover"
is "Fill". The height is the default sibling's, so the hit target keeps its floor. Expressed by a new box field,
`PartDef.flush: { axis, value, key }`, validated in `anatomyErrors`, and a twenty-first axis name, `inset`, in
`VARIANT_AXES`. Icon buttons get no flush. No token name or value moves; CONTRACT unchanged.

[claude-field-sizing-2266 · minor · 337f166c] One field sizing system, in 0.235.0 (#2266, owner decisions Q84 A, Q101 A and Q99 B). field-label is re-laddered to 12 / 14 / 16 (`type.body.xs/sm/md`), so each label sits one body step below the input of its field size. text-field, select and textarea project `size` small / medium / large as a Figma variant (24 to 72 members each; select gains the size prop for the first time). The input type scales with the size (`type.body.sm/md/lg`, 14 / 16 / 18), and so do the caret, the padding and the height. Small and medium keep the 44px floor (`size.md.min-height`) and large takes `size.lg.height`. The nested label follows the field's size instead of exposing it. The variant order leads with `medium`, so the default variant is the medium field and an in-place update lands every pre-existing member on it. The three controls' width floor drops from 320 to 120 (DRAFT), so a field shrinks with a narrower column; the root is still built at 320. The group legends follow the re-laddered label (a medium legend is 14 bold). field-message stays 11px. The small size is documented as fine-pointer only: under `@media (pointer: coarse)` the code sets the small input to 16px, so iOS does not zoom on focus. No token name moves, so CONTRACT is unchanged.

[claude-motion-figma-2394 · minor · cea29b76] Motion reaches Figma (#2394, owner decision Q146 A). Every brand's Figma emission gains a `motion`
collection, `out/figma/<brand>/motion.json`: the `motion.duration-ms` primitives (hidden from publishing),
and `motion.duration`, `motion.duration-reduced` and `motion.stagger` aliasing them, all as FLOAT
milliseconds. The variables carry no scope, because Figma's VariableScope has no time member (plugin-typings
1.131.0 and the live API reference, both checked 2026-10-09) and no Figma property binds a duration. A brand
whose mode levers run a different tempo gets one mode per such mode, the semantic aliasing that mode's
primitive (the radius precedent). Apply Theme writes the collection through the float write plan. Easing,
spring and transition stay DTCG-only: Figma has no variable type for them. The DTCG output is unchanged, so
CONTRACT is unchanged.

[claude-2361-boxed-corners · minor · 2f75e708] `controlShape: boxed` puts fields and the checkbox on the 0px corner too, the same way Hairline does (#2361,
owner decision Q139, 2026-10-08). `applyControlShape` now repoints, under `boxed` as well as `hairline`,
text-field, select and textarea's field corner (`radius.sm`) and checkbox-control's per-rung clamped corner
(`control.size.<rung>.radius`), to the shape's rung (`radius.none` under Boxed). The map is renamed from
`HAIRLINE_CORNER_REFS` to `FIELD_CORNER_REFS`, and the shapes that reach it are named in `FIELD_CORNER_SHAPES`.
The defs are still named by id, never selected by ref, so Badge's status corner (also `radius.sm`) stays put.
The checkbox clamp still holds: 0px is below `snap2(edge / 8)` on every edge. Radio and switch keep
`radius.round`. Pill and Rounded reach only buttons and icon buttons, as before. No token name or value moves,
so CONTRACT is unchanged; a Boxed brand's in-place component update shows the four defs' corners as named
differences.

[claude-2361-hairline-corners · minor · 920b1f7f] `controlShape: hairline` puts fields and the checkbox on the 1px corner too (#2361,
owner 2026-10-08, "1px corners everywhere", consistency first). `applyControlShape` now also repoints, under
`hairline` only, text-field, select and textarea's field corner (`radius.sm`) and checkbox-control's per-rung
clamped corner (`control.size.<rung>.radius`) to `radius.hairline`. The defs are named by id in
`HAIRLINE_CORNER_REFS`, never selected by ref, because Badge's status corner also binds `radius.sm`. The
checkbox clamp still holds: 1px is below `snap2(edge / 8)` on every control edge of 8px or more, and the
smallest is 12px. Radio and switch keep `radius.round`. Boxed, Rounded and Pill reach only buttons and icon
buttons, as before. No token name or value moves, so CONTRACT is unchanged; the change is which existing rung
four defs bind at build time, which a Hairline brand's in-place component update shows as named differences
on those members.

0.234.0 — folded 2026-10-08 from 3 change notes, newest merge first.

[engine-2324-text-button-underline · minor · 4f70b47e] #2324 (owner Q110 and the 2026-10-08 answers): a button at the text appearance underlines its label, at rest and in
every state, disabled included, on Button, Destructive and Neutral. The underline is fixed. Every brand now mints
underlined label styles, `type.label.{sm,md,lg}.emphasis-link` (and `default-link` under `buttonLabelWeight: default`),
whatever `typography.links` lists; they describe themselves as a text button's label, not a `text.link.*` link.
Text-appearance buttons bind them through a per-appearance label key, `size.<size>.<appearance>.type`. A text button
is never filled at rest, and by default not on hover or pressed either: a new Button option, `buttonTextHover`
("Text button hover": `text`, "Text & icon only", the default; or `fill`, "Fill"), gives it the outline appearance's
overlay wash on hover and pressed. Neutral's interactive ink now walks like the other families (rest unchanged; hover
and pressed reflect toward the middle of the ramp, 950 to 850 and 750 in light; 025 to 100 and 200 on the inverse
band), so its text and outline buttons change on hover and pressed, on both grounds; its border follows. The token contract gains the three label link paths
(CONTRACT 14.4.0 to 14.5.0).

[studio-2322-heading-type · minor · a2bfc7cb] #2322: three tracking roles join the type ramp, between and beyond the six: tightest (-4%), snugger (-1.5%, between
tight and snug) and open (+1%, between normal and wide). Their steps were already on the locked ladder; every brand
now emits them, and the token contract adds the six paths (CONTRACT_VERSION 14.4.0). The six roles before them keep
their names and values, and no composite binds a new role, so no brand's type moves. A tracking nudge still steps
along the six (TRACKING_SHIFT_KEYS). A new role a brand does not set takes its default, clamped between its two
resolved neighbors, so a brand that re-anchored a neighbor past it still builds.

[engine-2266-body-xs · minor · 30189907] #2266 PR 1 (owner Q78 A and Q101 A): a new body rung, `type.body.xs`. It is 12px, on body's line height (normal,
1.5, an 18px box), tracking (normal, 0) and family role, with the same weight and variant set each brand's
body.sm carries, italics included where a brand ships them. Every body.xs composite's DTCG $description and its
.ai.json $description read, verbatim: "Smallest body text, 12px. Secondary text and metadata only, never running
text." The .ai.json when_to_use and avoid_when say when to use it and when to use caption.lg (also 12px)
instead. Its Figma text styles say "for secondary text and metadata only" where body's say "for running text".
Every brand gains four (prism3 eight) composites and text styles. No existing token moves. The token contract
gains type.body.xs.default and default-link (CONTRACT 14.2.0 to 14.3.0). No component binds body.xs yet: that is
PR 2.

0.233.0 — folded 2026-10-07 from 4 change notes, newest merge first.

[engine-2241-hueless-gray · minor · 12b57a36] #2241: a pure gray has no hue. Below a chroma of 1e-4 (ACHROMATIC_C, color.ts) the OKLCH converter used to
return an atan2 of rounding noise, about 89.88 degrees for every gray, and code downstream treated it as a
real hue. rgbToOklch now returns a measured color whose hue is null there (CSS Color 4's "powerless" hue), so
every caller must decide what a missing hue means. At the brand-input boundary (the hex import, the studio's
start from a color and its color picks) a hue-less color is stored with hue 0, CSS Color 4's convention for a
missing hue, so brand files keep the schema's numeric hue (a technical decision, recorded on #2280: it holds
because every reader checks chroma first). Nothing reads a hue below the threshold: the shadow tint's no-hue
rule (#2184, owner Q58 B and Q73 A) reads the same ACHROMATIC_C, starting from a pure gray now gives a gray
neutral rather than one leaning to a noise hue, and so does a gray primary under Follow primary or a design.md
import with no neutral swatches (owner Q87 A), whose notes now say it has no hue. No corpus color is a pure
gray, so no committed artifact moves.

[plugin-2295-name-differences · patch · db0f11c0] #2295: the anatomy read-back reads an aspect-locked frame's targetAspectRatio as Figma types it, a {x, y}
Vector whose ratio is x / y, instead of as a number. On the real host the number-only check failed on every
locked frame, so all three image-placeholder members on the NB master read as differing from their plan with
nothing edited. No committed artifact moves.

[engine-2292-fields-fill · minor · 8df125d7] #2292: text-field, select and textarea fill their column when placed FILL. Each field's root is now built at
320 (`placementWidth`, the #1757 mechanism field-label and field-message already use), and `fillsAxis` treats a
root built at its placement width as bounded across, so the bordered control (textarea's through `body`) FILLS
the root, FIXED along its row with the column's STRETCH, keeping its `minWidth: 320` floor. An unplaced field
still reads at 320; an instance set to fill a 505px column now has its input box at 505, where it stayed at 320.
Projected component surfaces move (the three field sets' roots and controls); no token name moves, so
CONTRACT_VERSION stands. No size, floor value or visual changes.

[engine-2242-note-rounding · minor · 03be6777] #2242: the decisions-log notes print no long decimals. They are shipped prose (every brand's
$extensions.prism3.decisions, and the reports), and they interpolated input numbers raw, so a value carrying
full converter precision printed as "tinted to hue 89.87556274151122". The shadow note now prints its tint hue
in whole degrees, as the studio shows hue. The other numbers the notes print (the primary's hue and chroma, a
brand color's and a status color's hue, a pinned gray's lightness, an out-of-gamut anchor's OKLCH, the
shadow's softness and amount, the radius scale and base radius, each breakpoint's width, the max and narrow
containers, the type ladder's first and last sizes, the display cap and the fluid-type viewports) print at the
precision the corpus already used: hue to 2 places, lightness and chroma to 4. Committed artifacts move only
where a shadow tint hue was not whole: prism3's decisions now read "tinted to hue 267" (was 266.75) and
wendys's "tinted to hue 249" (was 249.14). No token name or value moves, so the token contract stands.

0.232.0 — folded 2026-10-06 from 4 change notes, newest merge first.

[lane-field-label-hug · minor · d323d0fe] #1762 (owner-decided 2026-09-30, option 3; decision record `docs/28` §5.5, which changes #1757's
decision 2): field-label's name HUGS its text and wraps at a MAX WIDTH instead of filling the row, so the
required marker sits right after the name in Figma rather than at the row's trailing edge ("Label ··· *" at
320). New `PartDef.wrap: 'hug'` projects `maxWidth` on the text node (no `layoutGrow`, auto width); the max
width is DERIVED — the root's `placementWidth` less one row gap per sibling, in px on the fixed space scale
(`spacePx`) — so field-label's is 320 − 4 = 316 at every member. The marker's own width is not subtracted (a
brand-font advance the engine does not hold), so a long required name overruns 320 by it, and a field
stretched wider in Figma keeps the 316 wrap point: both accepted. Both executors write the max width after the
append (the paste twin splices its line in only where a plan carries one) and read it back. Every host of
field-label (select, text-field, textarea, checkbox-group, radio-group) nests the changed main component.
The projected component surface moves → ENGINE bump. CONTRACT STANDS (no token name moves).

[engine-2227-floor-on-a-ground · minor · 171c1cb3] A contrast floor must be a step a page ground sits on (#2227, #2239, owner Q57 A). `surfaces.<mode>.floorStep`
on a step that none of `background.primary`, `background.secondary` or `background.tertiary` takes is refused
once the modes resolve, with a sentence naming the steps that are: "surfaces.light.floorStep: 300 is not a step
a light page ground sits on — the floor is the ground every floor-gated role is measured against. Use 50
(background.secondary) or 100 (background.tertiary)." It was accepted before: the Figma color emission threw
on it (`export_theme` -32603), and fills at floorSteps 500–750 shipped at 1.2–2:1 on the page while claiming
3:1. `validate_brand` and the generating tools report the sentence through the guarded build. The floor-gated
prose (the bold fills, the interactive fills, and the secondary, tertiary, status and link text) now names the
ground the floor sits on rather than always `background.secondary`: a floor held on the tertiary step says
"on background.tertiary". Auto, with no `floorStep`, is never refused, and keeps naming `background.secondary`. That includes a ladder
end (a Black or neutral 950 light page, a White or neutral 050 dark page), where the derived floor is a step
next to the page, not a ground, and every floor-gated claim still measures true on `background.secondary`. No
committed artifact moves.

[engine-2184-shadow-tint · minor · d17e10d6] #2184 (owner decision, 2026-10-06): with shadow.tint.hue unset, the shadow tint now follows the hue that
actually builds the neutral ramp. That is the primary's hue under Follow primary (neutral.auto), the custom
tint hue under Custom tint, and the pinned gray's hue under Pinned (neutral.anchor), the pin winning over
Follow primary as it does for the ramp. Before this the tint took the stored neutral.hue in all three, which
under Follow primary and Pinned is a hue the ramp ignores and the studio does not show. An explicit
shadow.tint.hue still wins. A gray neutral ramp, one whose chroma is below 1e-4, has no hue: a pure-gray pin
(r = g = b), or a Custom tint or Follow primary at chroma 0. Its shadow is untinted (owner Q58 B and Q73 A,
2026-10-06): no hue, while the tint amount still lifts it off pure black. The resolved tint hue is then null,
and the studio's hue slider is disabled and reads None rather than the converter's noise hue (#2241). The
baseline and every per-mode shadow ramp change together. No committed artifact moves: every corpus brand
either uses a custom tint, sets an explicit tint, or pins a gray whose hue equals its stored hue, and NB ships
pure-black shadows. A brand outside the corpus under Follow primary or a pinned gray gets a new shadow color
(a 130° to 185° hue move measured ΔE00 2.15 to 2.51 on the base color). The token names do not move, so the
token contract stands.

[engine-2227-secondary-shared-ground · minor · e8feeab2] The Figma color emission names a ground when a declared `secondary` lands on a step another ground also takes,
instead of throwing (#2227). A page `secondary` on the step of `base`, `tertiary` or an inverse tier left the
floor step aliased by two grounds, and `figmaArtifacts` threw "… which 2 page grounds alias …", so
`export_theme` with `include: ["figma"]` returned -32603 and the plugin's apply failed. The Figma line now
names the first of `background.secondary`, `background.primary`, `background.tertiary`, then the inverse
tiers, that sits on the floor step. The grounds are one color in light, so the line stays true. No committed
artifact moves; a floor step that no ground sits on is unchanged here and waits on #2227's refusal.

0.231.0 — folded 2026-10-06 from 3 change notes, newest merge first.

[engine-2209-score-consumption-guard · minor · b01cd28b] MCP's `score_consumption` refuses a malformed `refs` item or `pairs` entry as an `isError` result, not a
protocol error (#2209). `pairs: [null]`, a pair missing `fg` or `bg`, and `refs: [null]` each threw past
#2162's guard and escaped `tools/call` as a -32603 internal error. Each is now checked before the build and
returns `{ error: 'score_consumption input failed validation', errors: [...] }`, one sentence per bad entry
naming its index and what is wrong. A pair `kind` outside text, large-text and ui, which was scored silently
at the 4.5:1 text floor, is refused the same way. No token, name or value moves.

[ui-s112-style-guides-page · minor · 0deffd8c] Plugin: a style-guide table skipped for a missing token page names that page as the Build style guides page lists it,
without the taxonomy's arrow ("this file has no Primitive tokens page, and Set up file adds it"). No emitted artifact
moves.

[ui-2175-pinned-neutral · minor · abf5542d] The `neutral.anchor` lever is no longer flagged `advanced` (#2175, owner decision PN3, 2026-10-05). The lever
manifest (`schema/lever-manifest.json`) drops `advanced: true` from it, so a reader that follows the flag, such as
the Studio's Color › Palettes page, places it with the neutral hue and chroma rather than behind Show advanced.
Its key, label, control, description and saved value are unchanged. No token, name or value moves, so the
token contract stands (`token-contract.ts --check`: unchanged).

0.230.0 — folded 2026-10-06 from 4 change notes, newest merge first.

[engine-2198-max-seven-breakpoints · minor · 9b91eebb] Layout refuses more than seven breakpoints (#2198). `bpNames` names seven, xs to 3xl, and an eighth built
and took the placeholder name `bp7`. `buildLayout` now refuses a list longer than seven (owner decision
2026-10-06, Q43 A), with the count as entered: "The brand can have at most seven breakpoints. This brand has
<n>." The refusal is in the build path, so MCP `validate_brand` and the generating tools report it in that
sentence. Narrowing what the engine accepts is a behavior change, so this is a minor bump with no contract
change. No committed artifact moves: no committed brand, fixture or brief declares more than seven.

[engine-2162-theme-brand-iserror · minor · 2fcaa51b] MCP's generating tools report a build-time refusal as an `isError` result, not a protocol error (#2162).
`theme_brand`, `theme_from_brief`, `export_theme` and `score_consumption` caught `brandTheme` but called
`buildTree` outside any `try`, so a refusal that fires only once the modes resolve (an override naming an
unknown palette or step) escaped `tools/call` as a -32603 internal error, which a client may not hand back to
the model. All four now build through one guarded helper, and a refusal from either step returns
`{ error: 'BrandInput refused by the engine', errors: [<the engine's sentence>] }` with `isError`, the same
shape the schema failure uses. A `brandTheme` refusal used to read `{ error: 'brandTheme failed: <msg>' }`
and now uses that shape too. No token, name or value moves.

[ui-s112-style-guide-plumbing · minor · 9c396ae7] Plugin: the style guide's plumbing for the Build style guides page (UI redesign S11.2). A failed table no longer ends
the run: it is reported failed with the host's words and the next table is drawn ("⚠ 21 drawn, 1 failed"). A run can
be stopped after its current table (`style-guide-cancel`); a stopped run deletes no superseded table. A panel run posts
its table list and each table's move; `style-guide-catalog-request` answers with the file's collections, variables,
text styles, the tables a run would draw and whether Set up file has run. No emitted artifact moves.

[engine-2159-validate-full-build · minor · 4d593212] MCP `validate_brand` runs the same build path as `theme_brand` (#2159): `brandTheme`, then `buildTree`.
Since #2158 it ran `brandTheme` alone, so a refusal that fires only once the modes resolve, such as an
override naming an unknown palette or step, still passed `validate_brand` and then failed `theme_brand`.
Those refusals are now reported in the engine's own words. The guard is unchanged: a schema-invalid input
never reaches the build. No token, name or value moves.

0.229.0 — folded 2026-10-05 from 4 change notes, newest merge first.

[engine-2146-breakpoint-prose-validate · minor · 443cd7e4] The breakpoint prose says the first is always 0, and `validate_brand` reports the engine's own refusals
(#2146). The `layout.breakpoints` lever description changes "Studio keeps the first at 0px." to "The first
is always 0px.", and the schema's `breakpoints` description gains "The first must be 0." (owner decision
2026-10-05, Q26 a). The lever text moves `schema/lever-manifest.json`. MCP `validate_brand` checked the
schema only, so it called a brand valid that `theme_brand` then refused: a first breakpoint that isn't 0
(#2132) or an empty or reversed viewport range (#2068). It now also runs `brandTheme` on a schema-valid
input and reports what it refuses, in the engine's own words. No token, name or value moves.

[engine-2137-empty-breakpoints · minor · 35ee45fc] Layout refuses an empty breakpoints list (#2137). `layout: { breakpoints: [] }` built a brand with no
layout at all, and the first-breakpoint refusal (#2132) skipped it because an empty list has no first value
to name. `buildLayout` now refuses it first, with the owner's approved wording: "The brand needs at least
one breakpoint, starting at 0px." (owner decision 2026-10-05, Q22 a). Narrowing what the engine accepts is
a behavior change, so this is a minor bump with no contract change. No committed artifact moves: no
committed brand, fixture or brief declares an empty list. Offering the refusal up front in the studio is
the UI lane's follow-up.

[lane-style-guide-phase2 · minor · 7bad5da5] #259 phase 2 and #1795 (claimed as 0.200.0, 0.205.0, 0.210.0, 0.216.0 and 0.218.0 on its branch before #1807): the style-guide generator draws DIMENSION, FONT-VARIABLE and TEXT-STYLE tables. One
`dimension` table per collection (spacing and size as a spacing cell at the value's width, its width bound; a radius
as the radius swatch, its corners bound), one table per font kind per collection ("Abc 123" with the one property
bound), and one text-style table ("Abc 123" with the style applied, sizes per `type-sets` mode). Values in px and
REM at a 16px base; paragraph spacing and decoration columns on toggle; `PHASE_TYPES` widened; new panel Customize
fields and agent-link args (`pixels`, `rem`, `dimensionDisplay`, `fontDisplay`, `paragraphSpacing`,
`textDecoration`). A plugin behavior change (principle 5) → ENGINE bump; no engine emission or projected surface
moves, so `out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS at 14.0.0. Design record:
`docs/45-style-guide-generator.md` §6, "How phase 2 decides". In the same release (owner decision 15): a title
cell on every table type (`titleCell`), a leading "Name" column with the path humanized ("Text Primary"), a
designer's edit kept on rerun, and the title column left out of the superseded-table fingerprint. Also in it (the
review of 4faeb98a and the owner's live run of it): the spacing specimen found by the owner's cell structure, the
bracket's line bound and its right bar carried to the value (a MAX constraint override, else a named static move),
every resize guarded and read back, a cell with no layer to size counted; a FLOAT drawn as a length only when its
scopes or name say so (durations, shadow parts, gradient stops and paragraph spacing go to later phases); fonts
loaded and the column's mode pinned before any font binding; all four radius corners bound. And the owner's live QA
(decisions 13 restated and 16): a palette swatch FILLs its cell (floored at 80px), and tables flow left to right in
one row per category (color, dimension, font variables, text styles), the rows stacked down the page; Set up file's
spacing and radius cells built in the owner's layer structure. After the owner's live run of 0.205.0: a spacing
specimen is sized by a bound `paddingLeft` (the host silently drops a width written to a layer inside an
instance), its frame set to HUG again after the bind and read back; cells that cannot be sized are named once.
Owner decisions 18 and 19: one spacing style per run (filled by default), and REM in its own column. #1795: a
superseded table's name and place are read before it is removed, never after. After the live QA of 0.210.0
(decision 21): Set up file's spacing frames rest 0.01 wide with no padding (an instance's layer never hugs
narrower than its main), a zero value's specimen is hidden and counted as drawn, and every padding bind is
followed by FIXED then HUG so a smaller value shrinks the frame. Decision 20: the Pixels option is removed (the
agent link accepts and ignores `pixels`, named in the run's notes), and a text style's letter spacing and
paragraph spacing get REM columns.

[lane-style-guide-filter-yield · minor · 5ec56acd] #1778 + #259 (owner decisions, 2026-09-29): the style-guide generator runs ONE TABLE AT A TIME.
A `tables` option (panel Customize field, agent-link arg) draws only the tables named, by title or key; an
unknown name is reported; a filtered run supersedes nothing and moves only the tables below the ones it
redrew. The executor yields to the host after every table and every ~28 cells (the component writer's
`realYield`), and reports "table 7 of 22" to the pending pill and to an agent as progress phase `table`.
The header FILLs its table instead of keeping the component's page width, and the grid follows the owner's
examples: HUG tracks 2px apart, FILL cells, text on one line, a fixed-size specimen chosen by role that sits
on a ground only where it must (none on a palette row). One style-guide run at a time across the panel and
the agent link (#1785), through the plugin's run guard (#1957). A plugin behavior change (principle 5), so
an ENGINE bump; no engine emission or projected surface moves. CONTRACT stands. Design record:
`docs/45-style-guide-generator.md`.

0.228.0 — folded 2026-10-05 from 2 change notes, newest merge first.

[engine-2068-viewport-range-refusal · minor · 647c5b5c] Typography refuses an empty or reversed viewport range (#2068). `fluidClamp`
divides by maxViewport - minViewport, so a brand with minViewport equal to maxViewport emitted
`-Infinityrem + Infinityvw` (invalid CSS, the declaration dropped) and one with minViewport above
maxViewport emitted a clamp() that shrinks type as the viewport widens. Both built without an error.
`buildTypography` now throws when minViewport >= maxViewport, whether or not `fluid` is on (owner
decisions 2026-10-05: refuse, and Q16 = a). The message is the owner's approved wording, one sentence for
both cases: "The minimum viewport (<min>px) must be smaller than the maximum viewport (<max>px)." No
committed artifact moves: every committed brand's range is valid, with minViewport below maxViewport.
Offering the refusal up front in the studio is the UI lane's follow-up.

[engine-2132-first-breakpoint-zero · minor · 1016b106] Layout refuses a first breakpoint that isn't 0px (#2132). Breakpoints are mobile-first min-widths, so
the first is the layout for every width below the second, and a first floor of 320 left screens under
320px with no layout. `buildLayout` now throws when `layout.breakpoints[0]` is not 0, with the owner's
approved wording: "The first breakpoint must be 0px. This brand starts at <n>px." (owner decision
2026-10-05, F4 A). Narrowing what the engine accepts is a behavior change, so this is a minor bump with no
contract change. No committed artifact moves: every corpus and example brand starts at 0. Showing the
refusal on the studio's import is the UI lane's follow-up.

0.227.1 — folded 2026-10-05 from 1 change note, newest merge first.

[notes-2114-unresolved-ground · patch · a4ec4243] An override whose ground is neither a role nor a ramp step now names that ground in the warning's own
`unresolved` field (a string) instead of in `against` with `unresolved: true` (#2097 item 3, #2114).
`against` on an OverrideWarning keeps its one meaning, a second ground the miss is on, so lint-ratio-truth
would no longer read this warning as a confession for a pair that does not exist. No emitted artifact moves.

0.227.0 — folded 2026-10-04 from 1 change note, newest merge first.

[engine-lever-copy-2050 · minor · 2dbe9e55] Plain words for the shape, motion, layout and type lever names and descriptions (#2050, #2005), and the
typography lock reasons in REQUIRED_WEIGHT_ROLES, owner-approved copy. Each motion.transition.*
$description now names the curve its easing role resolves to, not the transition's fixed default (#2062).
No lever key or token path moves.

0.226.0 — folded 2026-10-04 from 1 change note, newest merge first.

[engine-2033-floorstep-strict · minor · 907ba977] surfaces.<mode>.floorStep refuses a value that is not a step on the neutral ramp (#2033, owner go-ahead
2026-10-04), the check base and inverseBase got in #1985: a typo must never silently move the contrast floor.
333 used to resolve to neutral.350 and 1234 to neutral.950, moving every floor-gated role with no error; both
now throw, naming the key and the nearest real step. A non-number is refused by name. Real steps are accepted
unchanged. The off-ramp refusal is now one helper shared by the six surface anchors and floorStep, and the
anchor messages are unchanged. Minor, not major: ENGINE major is refused below 1.0, what is refused was
already resolving to a floor nobody chose, and no corpus brand, fixture, gate case or Studio control relied on
snapping (every floorStep measured was a real step: 100, 200, 300, 800). No token path moves, so
CONTRACT_VERSION does not.

0.225.0 — folded 2026-10-04 from 3 change notes, newest merge first.

[engine-fo01-coverage-fallback-warn-2034 · minor · 4e432fe4] An override whose ground is neither a role in its mode nor a ramp step is now warned. The override pass still re-rates the pick on the page base, as before, but it adds an `OverrideWarning` with `unresolved: true` that names the role and the ground it could not find. It is no longer silent (#2034). No input reaches this today: every ground the engine writes is a role or a step, and 5,726 override cases across the corpus produced none. So no emitted artifact moves.

[engine-2053-radius-hairline-always · minor · 0f869e7a] radius.hairline (1px, aliasing core.dimension.1) is always emitted (#2053, owner 2026-10-04). It was
opt-in through radiusHairline (#1362), or implied by controlShape: 'hairline' (#1371); radiusScale now
pushes it for every brand, the NB fixture included, so a 1px corner is always reachable and the Studio
switch could read Off while a control shape used it. radiusHairline is still ACCEPTED in brand input, so
existing brand files load, but it changes nothing: a note says so, the lever manifest marks it
deprecated, and the schema marks it deprecated. controlShape: 'hairline' still binds radius.hairline.
Every emitted brand gains one radius token and one Figma variable. CONTRACT 14.1.0 to 14.2.0 (MINOR):
radius.hairline joins the guaranteed surface.

[engine-1985-surface-base-strict · minor · 7729217e] surfaces.<mode>.base and inverseBase refuse unknown keywords and steps that are not on the palette's ramp
(#1985, owner 2026-10-03, option A): a typo must never silently pick a color. 'grey' used to resolve to
neutral.025 and 333 to neutral.350; both now throw, naming the key and, for an off-ramp number, the nearest
real step. This is the check the four tier inputs got in #1972, now one check over all six surface anchors,
and the tier messages name the nearest step too. Minor, not major: ENGINE major is refused below 1.0, what is
refused was already resolving to an unintended color, and no corpus brand, fixture, gate case or Studio
control relied on snapping (1,688 resolutions measured, 0 off the ramp). No token path moves, so
CONTRACT_VERSION does not.

0.224.0 — folded 2026-10-03 from 2 change notes, newest merge first.

[engine-override-floor-ground-2025 · minor · 38e40092] An override is re-rated against its real ground when that ground is a palette step (#2025). A floor-measured role (foreground.*, text.link.*, icon.link.*, interactive.<c>.fill.*) names the contrast floor, a ramp step such as neutral.050, as its ground. The override pass looked that ground up among roles only and fell back to the page base, so an overridden floor role recorded its contrast on the page, a shortfall that existed only on the floor raised no warning, and the #1510 link clamp cleared the page instead of the floor. Across a sweep of every link override on six corpus brands, 4,810 link values were emitted below their contract on the floor (worst 2.66:1), each recording a ratio that cleared it. The ground is now read off the theme's ramps. Minor, not patch: no committed artifact moves, because no corpus brand overrides a floor-measured role, but a brand that does now emits a different link value and may gain a warning.

[engine-2024-icons-follow-text · minor · af875310] Under iconContrast '3:1', tertiary and -subtle icons follow their text too (#2024, owner 2026-10-03). The
always-carried set in withIconTwins (ALWAYS_TWINNED) gains (inverse.)text.tertiary and
(inverse.)text.<status>-subtle, whose text is held to the same 3:1 floor as an icon: the rule #1982 applied.
That makes 19 icons follow their text while unpaired; the other 12, (inverse.)icon.secondary and the bold
(inverse.)icon.<status>, still derive and edit on their own. An explicit icon override still wins.
Interactive icons were already carried (#1617). No token path moves, so CONTRACT_VERSION does not.

0.223.0 — folded 2026-10-02 from 1 change note, newest merge first.

[engine-icon-floor-follows-text-1982 · minor · 41fb2431] Under iconContrast '3:1', the seven icon roles that keep a 4.5:1 floor now follow their text (#1982):
icon.primary, inverse.icon.primary and icon.on-brand, -success, -warning, -danger and -info. The lever
does not lower their floor, so they already derived equal to their text, but an override on the text
was left behind on the icon. withIconTwins now carries those seven pairs under both lever values, as
it does the interactive ones. Every other pair still carries only under 'text'. An explicit icon
override still wins. No path is added or removed, so CONTRACT_VERSION is unchanged, and no committed
artifact moves: no corpus brand under '3:1' carries a text override on these.

0.222.0 — folded 2026-10-02 from 1 change note, newest merge first.

[engine-bg-tier-inputs · minor · 75104b3e] The background tiers are inputs (#1972). `surfaces.<light|dark>` takes four optional keys:
`secondary` and `tertiary` (the page's second and third tiers, neutral-only like `base`) and
`inverseSecondary` and `inverseTertiary` (the inverse band's, the same forms as `inverseBase`). Each is
read during derivation, so every role measured against the tier re-derives against it. A declared
`secondary` carries the contrast floor with it unless `floorStep` is set, so the 46 floor-gated roles
per mode re-measure too; high-contrast modes follow the standard floor, as they already do for `base`.
An `overrides` entry on any of the four is now refused, naming the input. Unset, every tier is the
ladder's own step and every artifact is byte-identical. The keys are checked in `brandTheme` (white,
black, or a step on the palette's ramp), because the schema validator skips `allOf`/`oneOf`. Token
paths are unchanged, so CONTRACT_VERSION does not move.

0.221.0 — folded 2026-10-02 from 1 change note, newest merge first.

[engine-icon-follows-text · minor · 2b413d28] A text override carries to its icon twin wherever the tree has one, when icons match text (#1968).
Before, only the interactive label inks did (#1617): an override on text.brand left icon.brand at its
derived value even under iconContrast 'text', the default, and the icon has no editor of its own.
withIconTwins now reads the twin map off the mode's tree (the path with its text segment swapped for
icon), so text.*, inverse.text.* and both link families carry. Under iconContrast '3:1' only the
interactive pairs carry, because a non-interactive icon then has its own floor and derives its own
value; the interactive glyph is the label's value twin under both lever values (owner, 2026-10-02).
An explicit icon override still wins. No path is added or removed, so CONTRACT_VERSION is unchanged,
and no committed artifact moves: no corpus brand carries a per-mode override.

0.220.0 — folded 2026-10-01 from 3 change notes, newest merge first.

[lane-links-follow-action · minor · 8b793d96] #1895: an unset `linkPalette` follows the palette the action role resolves to, `roleColors.action`
included (owner decision 2026-10-01). It followed the `actionPalette` lever, so a brand that moved action
with `roleColors.action` got action fills on the new palette and links still on primary. `theme.ts` now
resolves `input.linkPalette ?? roleToPalette.action`, and modes.ts then takes its existing
link-follows-action path, so the link anchors as the action fill does. An explicit `linkPalette` still
wins. No corpus brand sets `roleColors.action`, so no `out/` artifact moves; `schema/lever-manifest.json`
moves for the `linkPalette` description, which now says links follow the action color including a
`roleColors.action` override. The two decisions-log notes for a set `linkPalette` now compare against
the resolved action palette and say "the action color" instead of "actionPalette" (owner decision
2026-10-01). No token name moves.

[lane-write-safety-floor · minor · 5a70ec82] Plugin write-path safety floor (#1884, #506 case c): every effect, paint, grid and text style Apply Theme
writes now carries an ownership mark, shared plugin data `prism3`/`owned` = `1`, stamped whether the
style was created or reused. The apply pre-flight reads the mark before the description. A style a
designer re-described is still recognized as Prism3's. Before this, its next apply was refused and named
the style as not created by Prism3. Styles written before the mark existed are still recognized by the
engine's description templates, or by the persisted brand in a file older than the mode stamp, and the
next apply marks them. A file built by any earlier version re-applies with nothing created and no
conflict. Variables carry no mark: the pre-flight judges a variable by its collection's stamp and checks
its type in every era. Nothing changes for a foreign file. It is still refused whole before the first
write, and the verdict names each collision.

[lane-notes-voice · minor · 07db9e67] Every decisions-log note follows the voice standard's UI register (#1883). `theme.notes` ships in the
MCP `theme_brand` result, each emitted tree's `decisions`, the reports and the studio's Decisions log,
and its notes were engine-voiced: "CONFIRM" directives, all-caps words, issue numbers, a date and
maintainer terms ("hairline sentinel", "LIFT-primary", "DTCG composite spine"). Each note now says
what the engine decided, then why, in plain words. Text only: no decision changes, and no token,
contrast result or contract path moves. The `WCAG 1.4.1` citation the studio's link advisory reads is
kept verbatim. The provenance the notes carried (issue numbers, the date) moved to comments beside
each push. `lint-voice.ts` gains a DECISIONS LOG arm that renders every producer across the corpus, a
sweep of brand inputs and every schema enum value, reads the literals of every push, and fails an issue number, an all-caps word, a date, an internal id or a
maintainer term in any note, and any note no known producer claims.

0.219.0 — folded 2026-10-01 from 5 change notes, newest merge first.

[lane-radius-large-rungs · minor · 6670a1fc] Three container radius rungs, `radius.xl`, `radius.2xl` and `radius.3xl` (#1852). The ladder stopped at
`radius.lg` (6px at the default scale), so a card, panel, sheet or dialog wanting an 8-16px corner bound a
`core.dimension.*` primitive, which `radiusScale` never moves. The new rungs are `baseMd` x 2, x 3 and x 4,
scaled by `radiusScale` and snapped to the 2px sub-grid like the rungs below them: 8, 12 and 16px at the
default (owner decision, 2026-09-30, reproducing Prism 2's container ramp), 16, 24 and 32px on aurora
(`radiusScale` 2), 0 at `radiusScale` 0. They reach every emission the ladder already reaches: DTCG, the
per-mode overrides (`modeLevers.radius`, wireframe), the Figma `radius` collection, `.ai.json`, and the
reports. No component binds them yet. The Figma dimension sort now treats a key as a number only when the
whole key is one, so `2xl` and `3xl` list after `xl` rather than before `none` (`parseFloat('2xl')` is 2).
The colour emitter's copy of that sort takes the same rule; no colour key is digit-led, so no colour
output moves. Caveat, as for #1594: the order fixes CREATION order only. In a Figma file that already
holds the radius collection the plugin cannot reorder variables, so the three new rungs are appended after
`capsule` (and `hairline`, where a brand has it). Only a newly built file gets ladder order.
CONTRACT 14.0.0 to 14.1.0 (three guaranteed paths added).

[lane-paste-packer-remeasure · patch · 218c959e] #1814: `planSetChunks` measures every chunk as it will ship, at its final index and total, and keeps moving a
variant on to the next chunk until every chunk of more than one variant fits the budget. It used to move one
variant off an over-budget last chunk and never measure again. For every set and budget measured the chunks
are the same as before; the loop replaces an unstated one-byte margin with a measurement.

[lane-paste-axes-placement · minor · b1f0add1] #1809: the MCP paste script (the chunked `planSetChunks` payload) gets the two find-or-create
fixes the plugin got in #1780 and #1750. A paste over a component set whose variant AXES differ from the plan's
(an axis gained, lost or renamed) is refused on every chunk with the plugin's own `set -> AXES CHANGED` miss, and
nothing is appended into the old set. A new set pasted onto a page that already has content is placed
top-aligned with the sets there and 160px right of everything in its row, instead of at the origin over the
set before it. Chunk 1 places it; later chunks append and do not move it. The chunk shell grows 1,176 bytes, so
icon-button's set packs into 16 chunks, from 14.

[lane-weight-intent-exclusions · minor · 34464962] #1746: `validateComponentDef` refuses a `figmaProperties.excludeCoordinates` entry that names the def's
`weightIntent` axis. A brand that ships one weight for the group drops that axis (`applyWeightIntent`), and the
entry would then be ignored by the projector while `figmaVariantCount` still counted the rest of it, so #1355's
integrity check would fire on a def that validated. No def in the registry names it, so no emitted artifact
moves.

[lane-mcp-prose-scope · patch · da4d42eb] The MCP server's `theme_from_brief` `brief` argument description no longer uses an RFC 2119 `MUST`
(#1806): "It must open with a --- YAML frontmatter fence on the first line." The voice standard permits
those levels in the payload channel only, and an MCP description is not that channel. Found by the
voice gate's new MCP scope: `lint-us-english.ts` and `lint-voice.ts` now scan `tools/list` as the
server returns it over stdio (`mcp-served.ts`), with the six tool names asserted present. No committed
artifact moves.

0.218.0 — folded 2026-09-30 from 3 change notes, newest merge first.

[lane-theme-from-brief-default · minor · 8f664ecb] #1868: the MCP tool theme_from_brief returned no decisions log unless the caller named sections,
because its include default was an empty list, while its description promised the same payload as
theme_brand, whose default is the decisions log. Both tools now share DEFAULT_THEME_SECTIONS, and
theme_from_brief's include description says it replaces the default. A behavior change to a shipped
tool's default output, so an ENGINE bump. CONTRACT STANDS (no token name moves).

[lane-vocabulary-provenance · minor · 3750d9bd] Personality trait notes name no source brand (#1824). Each trait's `why`, which `resolveVocabulary`
copies into `theme.notes` (served by the MCP server, emitted as the tree's `decisions`, inlined into
every bundle), used to quote the example briefs by name, and some of those briefs are real brands'.
Each note now says what the trait sets and why, in the UI register, and a trait that applied no setting (every one kept) logs what it kept without a `why`. The research provenance moved to
`test.ts`, which ships nowhere and still checks every quote verbatim against the committed briefs
(#1685). Bundled comments and one rename rule's `why` that named a client were reworded the same way.
`lint-voice.ts` gains a CLIENT NAMES arm over both built bundles (raw, comments included) and every
rendered trait note. No committed artifact moves: no corpus brand sets `personality`.

[lane-mcp-initialize-fallback · minor · b86b1f41] #1867: the MCP server's `initialize` answered a protocol version it did not speak with its newest,
`2026-07-28`. That revision removed the handshake, so no client that sends `initialize` can use it:
Claude Code asks for `2025-11-25` and refused to connect. `initialize` now echoes a version it
speaks, and otherwise answers `2024-11-05` (HANDSHAKE_PROTOCOL_VERSION), the newest revision this
server speaks that still has the handshake. Stateless requests are unchanged. A behavior change to a
shipped server, so an ENGINE bump. CONTRACT STANDS (no token name moves).

0.217.0 — folded 2026-09-30 from 1 change note, newest merge first.

[lane-link-palette-default · minor · 25aa1446] #1812: `schema/lever-manifest.json` stops stating `linkPalette: default 'primary'`. The engine has no
static default for it: an unset `linkPalette` resolves to whatever `actionPalette` resolves to
(`theme.ts`, `input.linkPalette ?? actionPalette`), so on an accent- or neutral-action brand (aurora,
nb-redesign) the manifest named the wrong palette, and any surface or agent rendering "Auto" from it would
too. The lever's description already said "Defaults to following the action palette". New gate: every
lever's manifest default must be a no-op when stated explicitly, measured by running the engine (the DTCG
tree, `test.ts`) and the component materializer (`apps/plugin/test-write-components.ts`) with the lever
unset and set, with a per-(lever, value) sensitivity list for the values only the materializer sees. A shipped manifest change → ENGINE bump. CONTRACT STANDS (no token name moves).

0.94.0 — the radio/checkbox ROW QA bundle (#1424 + #1433), two owner-approved fixes on the two row defs.

#1424 — LONG LABELS WRAP INSTEAD OF OVERFLOWING. Prism 2's radio-button-row / checkbox-row let a long
label wrap to a second line (its description text is `layoutSizingHorizontal: FILL`); the engine had no way
to express "fill the main axis and reflow" — `sizing: 'fill'` maps to AUTO (#989), so a text node hugged
its glyphs and ran off the row. New `PartDef.wrap` (text-only) projects the two Figma facts that wrap a
label: `layoutGrow: 1` (fill the row's main axis, fixing the WIDTH) + `textAutoResize: 'HEIGHT'` (auto
height, so the fixed-width box reflows), carried on two new `FigmaNodePlan` fields threaded through BOTH
executors (`write-components.ts`'s neutralizer, driven off the plan; the emitted payload) and classified in
`anatomy-readback.ts`. Each row's `row` gets `minWidth: 320` (Prism 2's root width — a def-local literal,
the `select` #1345 precedent, NOT a token), because `layoutGrow` fills REMAINING space and a hugging row has
none; `anatomyErrors` refuses a `wrap` label under a floorless parent, which makes that floor load-bearing.

#1433a — ERROR-STATE FILL. Owner-decided: signal error on the control BORDER/RING (and the field-message),
and KEEP the selected control's inner fill (the checkbox's box + check, the radio's dot) on the INTERACTIVE
color — never red, since color is not error's sole carrier. The atoms already satisfied this (no
`checked.fill.error`/`checked.indicator.error` key, so error falls back to the interactive `checked.fill`/
`checked.indicator`); this bundle LOCKS it with a by-name gate that a red-fill mutation flips (docs/34).
No code change to the atoms — the deliverable is the enforcement.

#1433b — ROW TOP/BOTTOM PADDING. Prism 2's rows sit their content in `padding {top:12, bottom:12}`; the
engine's rows had none. Both rows now bind `pad-y → space.150` (= 12px on nb, the nearest existing spacing
step and an EXACT match — no new rung minted) and `pad-x → space.0` (inline zero, Prism 2's `{start:0,
end:0}`), mirroring `checkbox-group`'s own padding. A CONSTANT inset (the same 12 on both rows), not
size-scaled — Prism 2 uses 12 flat.

CONTRACT STANDS at 10.2.0 — taken from main UNCHANGED, no further bump. `wrap`/`layoutGrow`/`textAutoResize`/
`minWidth` are STRUCTURE (schema + plan + projection), never emitted token NAMES; the padding binds EXISTING
guaranteed names (`space.150`, `space.0`, both already emitted in every brand tier). No guaranteed token name
is added, removed or retyped, so on rebase this lane inherits main's 10.2.0 (#1426's `size.md.min-height` →
10.1.0, #1425's switch `track`/`thumb` + `core.dimension.{3,18}` → 10.2.0) with nothing to add —
`token-contract.ts --check` confirms the guaranteed 586 unchanged.

SAFETY NET (docs/34). #1424: `test.ts` reads the projected plan and pins label→(layoutGrow 1 + HEIGHT) /
control→fixed for both rows, with a mutation dropping `wrap` that flips it BY NAME, plus two refusal arms
(wrap on a non-text kind; wrap under a floorless row) each with a by-name mutation; `test-roundtrip.ts`
reads the same two facts back off the built shim with an oracle authored there (a def that stops wrapping
fails there though the generic plan-vs-host diff would still agree). #1433a: `test.ts` reads the projected
error member and pins fill-stays-interactive / border-goes-danger for both atoms, with a mutation binding
the forbidden red fill that flips it BY NAME.

0.94.0 — the next free ENGINE integer above main's 0.93.0. Rebased onto main after #1426 took 0.92.0
(select QA) and #1425 took 0.93.0 (switch-control scaling); this lane sits above both, never lower.

0.97.0 — #1341/#1342: the TRANSPARENT field fill. Adds the alpha-0 `core.palette.transparent` primitive
and defaults `color.field.fill` / `color.inverse.field.fill` to it (kept themable), so a field frames by
its border on any ground rather than an off-register inset surface. With a transparent fill the border IS
the boundary, so `color.field.border.{rest,hover}` are re-gated to clear the non-text floor (SC 1.4.11)
against the DARKEST permissible ground (`background.secondary`, the engine's own worst-case surface / the
`cfg.floor` every gated foreground already uses) — one step darker in light, byte-identical in dark/HC.
Hover (#1342) is an alpha WASH, not a solid fill: select's control gains an `overlay` slot reusing
`color.interactive.neutral.overlay.hover` (the button #1210/#1233 pattern). Disabled keeps its solid,
WCAG-exempt fill. This moves emitted VALUES (every brand's field fill + light border) AND the projected
component surface (select's overlay paint), both ENGINE-version triggers (#1252). Provisional integer —
a rebase relay reassigns it to the true next-free above main before merge.

0.99.0 — #1427: icon-button follows Button 1:1 apart from the `shape` axis — a new `surface` axis + the
glyph ink walking state. TWO decision-free fixes from the Figma-import QA (2026-09-15), across all three
families (icon-button / -destructive / -neutral, the shared `makeIconButton` factory): (1) the GLYPH INK
now walks state on `outline`/`text` (it was pinned to `.rest` while the container's edge/overlay moved —
Button's #1282/#1351 change reaching the icon-only control; the roles `iText` already emits, three keys
per appearance were missing), and (2) a new `surface` variant axis (default/inverse), APPENDED after
`shape` so the three axes Button shares keep their order and `shape` stays the icon-button-specific one.
The inverse members inherit #1384's white-inverse model 1:1 with the ICON as the "ink": the projector's
`color.* → color.inverse.*` rewrite (keyed on the `surface` axis by NAME) binds the SHARED
`inverse.interactive.<family>.fill` role #1384 made white, so an inverse icon-button is white fill + a
per-family icon-ink (the inverse on-fill, which #1384 GATE B floors ≥4.5 on white) — inherited, NOT
re-minted. NO hover-wash on the inverse fill: #1384 made it FLAT and deferred the wash as a separate
OWNER decision (still pending), so the inverse icon-button fill is flat too, matching #1384's buttons.
Each set doubles 108 → 216. Provisional integer — a rebase relay reassigns it to the true next-free
above main before merge (provisional off main's 0.98.0). ENGINE trigger: the projected component surface
moves (a new variant axis + per-state glyph ink), a `lint-component-surface` #1252 trigger; `out/**` is
stamp-only.

CONTRACT STANDS at 10.3.0 (NOT the orchestrator's provisional 10.4.0). A variant axis is a
component-PROJECTION change, not a token EMISSION change: it adds no guaranteed token NAME (the inverse
roles it binds — `color.inverse.interactive.<family>.*` — already ship, bound by Button since #1134). So
`token-contract.ts --check` shows guaranteed 587 unchanged and "no guaranteed path moved — no version bump
required"; `--accept` refreshes only the informational `engineVersion` stamp (0.98.0 → 0.99.0). The
objective gate result settles the bump, not the provisional guess (the #1384/#1429 precedent), and it is
the exact #1353 shape-axis precedent (adding a variant axis kept CONTRACT put). `lint-component-surface`
and `paint-census` re-accept at the forward bump (icon-button's set grows and its per-state ink coordinates
move).

SAFETY NET (docs/34): `test.ts`'s #1427 block pins the axis vocabulary/default, the ×2 surface partition,
the white-inverse fill/on-fill inheritance BY the shared role name (connecting the projection to #1384 GATE
A/B), the per-state glyph ink over 3 families × {outline,text} × {hover,pressed}, and the focus-ring's
`follow: ['surface']`. Two mutation arms flip a NAMED assertion on the SUBJECT: ARM A pins outline.icon.hover
back to text.rest (the ink goes static → the per-state assertion fails), ARM B drops the surface axis (no
surface=inverse member enumerated → the doubling assertion fails). The #1384 GATE A/B stay valid unchanged
— they assert the shared token roles icon-button now binds, so they cover it by construction.

0.98.0 — #1384: WHITE is the DEFAULT inverse fill for every button family. The inverse REST fill was a
brand-tinted neutral 050/850 step (#1208/#1389); the owner's QA read that as "not white", so the resting
inverse fill is now the CRISP ABSOLUTE `core.palette.white` / `core.palette.black` literal-color sentinel
(the #1341 mechanism — white already exists as a guaranteed primitive, now bound as a fill SOURCE). It is
MODE-DRIVEN because the inverse band flips per family: white where the band is dark (light-family modes),
black where the band is near-white (dark-family modes — a white fill there is degenerate and fails the 3:1
non-text contract). Hover/pressed keep #1389's per-state feedback (they step the neutral ramp toward the
band, byte-identical to before — only REST moves). Each family now carries its OWN ink on that fill: primary
→ the vivid action/brand step (#1244), DESTRUCTIVE → its DANGER step (the change — #1208/#1389 shipped a
neutral ink here, deferred as #1253; the owner now decides destructive carries danger ink), neutral → the
neutral extreme; every family's ink resolves ≥AA on white/black across the corpus. Emitted VALUES move
(inverse fill.rest + on-fill across the corpus), an ENGINE trigger via `lint-emission-version`. Provisional
integer — a rebase relay reassigns it to the true next-free above main before merge (provisional off main's
0.97.0). NO CONTRACT bump: `core.palette.white` is ALREADY guaranteed and no token NAME is added, removed or
retyped (the inverse fills rebind a VALUE); the orchestrator's provisional 10.4.0 assumed white was a new
name — it was not, so the contract stands at 10.3.0, settled by the empty `token-contract --accept` diff
(the #1429 precedent: the objective gate result decides the bump, not the provisional guess).

0.100.0 — #1456: the inverse interactive fill STEPS per state again (reverses #1384's FLAT fill). REST
keeps the crisp `white`/`black` absolute #1384 established, but hover/pressed (and their focused/selected
twins) now step 2 NEUTRAL rungs per state AWAY FROM THE EXTREME the absolute sits at — mirroring the page
fill's 050 → 150 → 250 walk: a light-family band (rest white) steps DARKER (hover neutral.100, pressed
neutral.200); a dark-family band (rest black) steps LIGHTER (hover neutral.900, pressed neutral.800). The
fill is UNIFORM across primary/neutral/destructive; the per-family ink stays (primary → brand, destructive
→ danger, neutral → extreme). WHY the #1384 flat decision no longer holds (owner, #1456): the on-fill ink
must clear AA on the REST fill ONLY — hover/pressed are transient states EXEMPT from the ink contract
(standard a11y practice), so a stepped hover/pressed fill whose ink dips below AA is BY DESIGN and the fill
steps freely. #1384 had flattened the fill precisely to keep the dark-band HOVER ink from dropping to
~1.78:1; under the REST-ONLY exemption that drop is acceptable. Emitted VALUES move (the inverse fill
hover/pressed/focused/selected states across the corpus), an ENGINE trigger via `lint-emission-version`.
Provisional integer 0.100.0 (next free above main's 0.99.0, MINOR increment continuing 0.94 → … → 0.99) —
a rebase relay reassigns it to the true next-free above main before merge. NO CONTRACT bump: hover/pressed
rebind to EXISTING neutral ramp rungs and rest keeps the absolute, so no guaranteed token NAME is added,
removed or retyped — `token-contract.ts --check` reports the guaranteed surface unchanged and the contract
stands at 10.3.0. GATE A (test.ts) is reconciled from "flat absolute" to "absolute at rest + 2-rung step
away from the extreme"; GATE B stays REST-ONLY. Mutations (docs/34): flattening any non-rest state back to
the absolute fails GATE A's FLAT arm by name; inverting the mode-mirror fails GATE A's DIRECTION arm.

0.101.0 — #1432: RENAME the icon-button appearance axis VALUE `text` → `ghost` (owner-decided 2026-09-17),
for the three icon-button families ONLY (`icon-button`, `icon-button-destructive`, `icon-button-neutral`).
A "text" appearance is meaningless on an icon-only control — `ghost` is the industry term for a
borderless/fill-less icon button. Button KEEPS `text`; the two families deliberately diverge on this one
appearance-value name (owner-accepted). This is an axis-VALUE rename only: `icon-button.ts` binds the
`ghost.*` paint KEYS to the SAME `color.interactive.<family>.text.*` ink roles, so the mechanical mapping
to button's `text` appearance behaviour is UNCHANGED. The PROJECTED component surface moves (member names
`appearance=text` → `appearance=ghost` and the `ghost.*` paint keys), a `lint-component-surface` #1252
trigger; `component-surface.json` + `paint-census.json` re-accepted at this bump. Provisional integer
0.101.0 (next free above main's 0.100.0) — a rebase relay reassigns it before merge.

NO CONTRACT bump — and this is the load-bearing correction to the issue's provisional (read before
"restoring" 11.0.0). The issue #1432 body and the lane brief both state this is a "guaranteed NAME-surface
change → CONTRACT MAJOR" and that `token-contract --check` will show a REMOVE (`…text…`) + ADD (`…ghost…`).
It does NOT, and cannot: `token-contract.ts` versions the emitted TOKEN-name surface (`tokenPaths` over
`buildTree(theme)`), and a component appearance-axis VALUE is not a token — it never enters the tree, the
baseline `schema/token-contract.json` contains no `icon-button` path, and `token-contract --check` reports
the guaranteed surface UNCHANGED (level `none`). This is the exact #1427 precedent: adding icon-button's
`surface` axis was likewise a projection change that left CONTRACT at 10.3.0, because "a component
prop/variant name is not part of the token-name contract". The gate ENFORCES this: `satisfiesBump(…,
'none')` accepts ONLY version equality, so setting CONTRACT_VERSION to 11.0.0 makes `token-contract
--accept` REFUSE ("this change is NONE but CONTRACT_VERSION is still 11.0.0") and leaves `--check`
permanently red — deadlocking `npm run verify`. CONTRACT therefore STANDS at 10.3.0 (stamp-only `--accept`
refreshes engineVersion 0.100.0 → 0.101.0), per principle 5 and the #1384/#1427/#1429 rule that the
objective gate result decides the bump, not the provisional guess. The icon-button appearance-value rename
IS a breaking change to the COMPONENT API surface — but that surface is ENGINE-tracked (this bump +
`lint-component-surface`), not token-contract-tracked. FLAGGED to the orchestrator/owner in the PR + the
docs/00-progress entry: reconciling "the component appearance value is a versioned name" with the token
contract would need a NEW mechanism (a component-API section in token-contract.ts), which is out of scope
for this rename.

0.102.0 — #1434: the field + selection-control placeholder/label DEFAULTS become generic illustrative
scaffolding, per owner sign-off (2026-09-16, all five approved). `field-message` "Use 8+ characters" →
"This is a standard message.", `field-label` "Email address" → "Label", `checkbox-row` "I agree to the
Terms of Service" → "Checkbox label", `radio` "Standard shipping" → "Radio option", `switch` "Airplane
mode" → "Toggle label". Emitted-artifact prose under docs/voice-standard.md, the recessive attribute (§1):
the tool's shipped placeholder must read as obviously replaceable scaffolding, never as a real product's
copy competing with the brand a customer is building. The three selection-control labels REVERSE filed
decision #798 (a canonical realistic label is no longer preferred — generic scaffolding wins). The
projected component surface moves (member text defaults) → ENGINE bump; CONTRACT STANDS at 10.3.0 — copy
is neither a token name nor a prop, so no guaranteed name moves.

0.103.0 — hotfix: the `radio-control` `checked.border` $description shipped the literal phrase "the Figma
import (2026-09-15)". Bundled into the plugin's main-thread `dist/main.js`, Figma's sandbox scans source
text for `import` followed by `(` and REJECTS the whole plugin as a "possible import expression"
(`rejectImportExpressions`) — so the plugin failed to load on import, a QA-blocking runtime failure the
build/CI gates never saw (they check `node:` builtins and drive the UI, not the main-thread sandbox
eval). Reworded the description (and its twin doc comment) to "the 2026-09-15 Figma import" — meaning
identical, the `import (` adjacency gone. Emitted-artifact/projected-surface prose change → ENGINE bump.
CONTRACT STANDS at 10.3.0 (no name moves). FOLLOW-UP FILED: a gate that scans the built bundles + emitted
prose for Figma-sandbox-rejected token sequences (`import\s*\(` and kin), so this class can't recur; the
latent occurrences in `version.ts` changelog + `anatomy-figma.ts` comments (not currently reachable into
`main.js`) are named there.

0.104.0 — #1447: `lint-us-english` was blind to two whole en-GB classes — doubled-L-before-suffix
(`travelling`, `labelled`, `signalling`, `modelled`) and the `-re` endings (`centre`, `centred`,
`centres`, `metre`) — because `prose-rules.ts` scanned only `-ise`/`-our` and the `grey` stem. The gate
now carries a `DOUBLE_L` stem alternation and an `RE_ENDINGS` substring scan (both word-boundary
anchored; `diameter`/`parameter`/`controlled`/`cancellation` cannot reach either), and the first run over
the built corpus found 506 REAL en-GB spellings in shipped text: `signalling` ×56 per `*.ai.json`
(`ai-metadata.ts` family meanings), `centred`/`centres` ×6 per token tree (`tree.ts` control-size
descriptions), and ~100 across the component defs' `description`/`note`/`aria`/`avoidWhen` prose plus the
comments that ship in the plugin bundle. All respelled to en-US — meaning identical, letters moved.
Emitted `$description`/`meaning` prose moves in every brand's `out/**` → ENGINE bump. CONTRACT STANDS
at 10.3.0 (no token name or component member moves; `token-contract --check` level `none`).

0.216.0 — #1750: every component set built onto a shared page landed at (0,0), so the second set on
`↳ Buttons` (and on Icon button, Checkbox, Radio, Switch) covered the first. The plugin executor
(`apps/plugin/src/write-components.ts`) now places a set it CREATES beside the page's existing content
(`placeNewSet`): top-aligned with the sets already there, and `SET_GAP` (160, a placeholder matching the
owner's hand layout) right of every node that shares its row. Nodes wholly above or below, like the page
header, do not push it. An existing set is never moved. `main.ts` now places page headers once the run's
builds are done, so a header first placed over a family built as one run spans every set in it. A PLUGIN
write-path behavior change → ENGINE bump; no engine emission or projected surface moves (branched from
#1808 at 0.215.0). CONTRACT STANDS at 14.0.0 (no token name moves).

0.215.0 — #1780: a Build over an existing component set whose variant AXES differ from the plan's (an axis
gained, lost or renamed — `veil` gaining `direction`, a `genre` axis renamed `type`) appended every new member
into the old set, because find-or-create matches the set by NAME and every planned member name was new, so
nothing matched and nothing read STALE. Figma reports a set whose members disagree on the axis list as broken.
The plugin executor (`apps/plugin/src/write-components.ts`) now reads the existing set's axis lists off its
coordinate-shaped member names and, when any differs from the plan's, REFUSES: nothing is built, appended or
stamped, and one miss names both lists and the remedy (rename the old set, build again). Axis NAMES only — a
new value on the same axes still appends. A PLUGIN write-path behavior change → ENGINE bump; no engine
emission or projected surface moves. CONTRACT STANDS at
14.0.0 (no token name moves).

0.214.0 — #1760: MCP `tools/list` inlines the brand schema COMPACTED. Every `description` in
`theme_brand`'s `brand` schema is cut to a one-line summary (its first sentence, plus any leading
OPTIONAL/OPT-IN tag), and every other keyword is verbatim, so validation is unchanged. `list_levers`
gains an optional `describe: [field]` argument that returns the named fields' full schema entries and
the `$defs` they reference. `tools/list` drops from 59,969 to 42,314 characters, against a
60,000 ceiling it had been meeting by trimming lever guidance. The gate now fails with 5,000 characters
of headroom left (room for ~20 more levers), and caps each inline summary at 200 characters. Four
schema descriptions were split at a semicolon or comma so their first sentence fits that cap.
`radiusHairline` gets back its when-to-use cue. A change to shipped MCP output → ENGINE bump. `out/**` and
`token-contract.json` move only their version stamp; `theme-schema.json` moves description prose only.
CONTRACT STANDS at 14.0.0 (no token name moves).

0.213.0 — #1720: `resolvePreview` no longer resolves a type binding the brand does not emit to
`sans-serif / 0 / 0px`. It read `node?.$value ?? {}` and every accessor after it fell through to its own
default. The preview spec binds `type.display.lg.strong` and `type.title.*.strong` by name, and two legal
inputs drop them: declining `strong` in display/title (#1632), and `typography.displayCeiling: 'sm' | 'md'`,
which drops `display.lg` (a lever the studio exposes). Such a
binding is now absent from `ResolvedPreview.type` (typed `Partial`, so a reader has to guard) and named in
the new `unresolvedType` list. Reported rather than thrown: the studio calls `resolvePreview` on every edit
and would otherwise refuse a valid brand over a value it never paints. `visualize.ts` throws by name on a
non-empty list. A read-model behavior change → ENGINE bump; no emitted value moves, so `out/**` and
`schema/*` move only their version stamp. CONTRACT STANDS (no token name moves).

0.212.0 — the dismissible Tag's label inset (owner-decided 2026-09-29 from live QA on a real Figma file;
decision record `docs/28` §5.4.4). On a dismissible tag the label-and-check row (`labelCheck`) takes a FIXED
4px leading inset (`space.050`, every density), and the content row's icon→label gap drops to match (6/8/12
→ 2/4/4 at comfortable), so the visible icon→label is 6/8/8 and a dismissible tag is 4px wider. The def
states the visible distance (density-following, held by the 4px gap floor) and the layer gap is derived as
visible − inset, never below 0 (`ComponentDef.visibleGaps`, `visibleGapStep`, applied in
`applySpacingDensity`). Select tags are pixel-identical; their `labelCheck` now binds explicit 0 paddings.
The projected component surface moves (dismissible `itemSpacing`, `labelCheck` padding bindings) → ENGINE
bump. CONTRACT STANDS at 14.0.0 (no token name moves; the new keys are def-internal bindings to existing
`space.*` steps).

0.211.0 — #1781: a nested part whose target is a component SET could resolve to a member of the WRONG set
with the same member name. Both executors matched the def's coordinate inside the named set, then looked
the matched member NAME up again in the document-wide COMPONENT map, where every set's `size=small` shares
one key and the last one searched wins. On a rebuild with stale sets renamed aside, `checkbox-group` nested
`switch-row`, `radio-group` and `__old__radio-group` rows, and `checkbox-row` nested `radio-control`'s
identically named member, each reported as success. Both executors now call one shared
`resolveNestMember` (the paste payload ships its source): the member is instantiated out of the named set's
own `children`, the set is matched by EXACT name (a renamed `__old__` copy never answers), and two sets
under the exact name are reported by name and nothing is nested. `anatomy-readback.ts`'s `nestTarget`
predicate now reads the instance's `mainComponent.parent` and fails by name on the wrong set. A PLUGIN
write-path and paste-payload behavior change (principle 5) → ENGINE bump; no token or projected surface
moves, so `out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS at 14.0.0 (no token name moves).

0.208.0 — #1790: the paste path's theme cleanup (`runCleanupTheme`, the `use_figma` scratch-file wipe)
had the read-after-remove defect that `applyPrunePlan` was fixed for in 0.203.0. It read `.name` off
each style and each collection right after calling its `remove()`, and on the next collection it read `variableCollectionId`
off the variables of a collection it had already removed (the host removes them with it). The host throws
on any read of a removed object (`in get_name: The style with id "S:…" does not exist`). The step now reads
every name, id, stamp, description and collection id it matches on or reports before the first
`remove()`. The `test-mcp-paste.ts` shim now treats a removed object as dead, as `test-prune.ts`'s does
(shared helpers in `apps/plugin/removal-shim.ts`). A PLUGIN write-path behavior change (principle 5) →
ENGINE bump; no emission or projected surface moves, so `out/**` + `schema/*` are a stamp-only regen.
CONTRACT STANDS at 14.0.0 (no token name moves).

0.207.0 — #1789: the plugin's font preload warned "1 typeface unavailable (Playfair Display|Semi Bold
Italic)" on a Figma whose Playfair ships `SemiBold Italic`, in the same apply whose text-style pass wrote
that style correctly. `preloadFonts` tested each candidate by exact `family|style` and never ran the #499
resolver. It now resolves every candidate's style against its family's real styles with the same
`resolveFontStyle`, loads the RESOLVED face (once, however many candidates resolve to it; a failed load is
still reported for every named candidate of that face, in any candidate order), and reports a named face
unavailable only when the resolver or the load says so. Every origin (theme, file, crossed)
resolves the same way; the origin still decides only whether a miss is reported. The verdict's "N font
styles name-resolved" stays the text-style pass's count. A PLUGIN write-path behavior change (principle 5)
→ ENGINE bump; no emission or projected surface moves, so `out/**` + `schema/*` are a stamp-only regen.
CONTRACT STANDS at 14.0.0 (no token name moves).

0.206.0 — the spacing model (owner-decided 2026-09-29, "size is for size, space is for space"; decision
record `docs/28` §5.4). `size.*` holds dimensions only: the shared scale stops emitting
`size.<rung>.{padding-x,padding-x-visual,padding-y,gap}` (CONTRACT 14.0.0, below), and every component states
its own padding and gaps as `space.*` steps at comfortable density (`ComponentDef.densitySpacing`). Density
follows by rule: `applySpacingDensity` moves each named step one step down the space ladder at compact and
one up at spacious, clamped at the ends, and no gap goes below 4px (`GAP_FLOOR_PX`). Button, text-field, textarea, select and the checkbox, radio and
switch rows are pixel-identical at comfortable; their compact and spacious spacing moves (the per-size table
is in the PR and the progress entry). Tag takes the owner's mockup values (padding 8/12/16, icon→label
6/8/12, label→check 4/6/8), a nested label-and-check row, a 0 trailing inset before the dismissible × slot,
and a minimum width of 1.5 × its height rounded to the nearest 8px (`minWidthRatio`, written into Figma as
a per-size literal by `applyMinWidthRatio`). The #325/#326 orderings move from the shared scale to a rule
asserted over every def at every density. Emitted trees, the Figma `size` collection and the projected
component surface all move → ENGINE bump.

0.203.0 — the plugin's confirmed prune stopped after its first style: `applyPrunePlan` read `.name` off
each style (and each variable) right after calling its `remove()`, and the host throws on any read of a
removed object (`in get_name: The style with id "S:…" does not exist`, seen live on a real Figma test
file at 0.202.0 after 1 variable, 6 modes and one text style had gone). The collection arm had the same
shape one line later (it listed the file's collection names after removing the stranded ones). The
executor now reads every name, id and collection id it matches on before the first `remove()`, and removes
each object at most once. The test shim now throws the host's error on a read of a removed object, which
it never did before, so nothing caught this. A PLUGIN write-path behavior change (principle 5) → ENGINE
bump; no emission or projected surface moves, so `out/**` + `schema/*` are a stamp-only regen. CONTRACT
STANDS at 13.2.0 (no token name moves).

0.202.0 — #1626 / #1763 (owner-decided 2026-09-29, "rest fill + deeper inverse ink"): the `on-fill` label
is measured against every interactive fill state it sits on. On the page, `interactive.<c>.fill.focused` and
`.fill.selected` resolve to the rest step in every mode (they used to walk like hover/pressed, and in `dark`
that put the near-white label at 2.32–2.62:1 on the switch's on track and the checkbox's checked box). On the
inverse band, the brand `on-fill` (primary, destructive) is re-picked by `brandOnFill`'s own rule over all
five state fills — the most vivid step clearing 4.5:1 on every one — so it lands a deeper step at rest too
(prism3 primary.500 → 650 light, 350 dark). Hover/pressed stay exempt by the owner's decision.
A `fill.rest` override now carries to its page `focused` / `selected` twins (`withFillStateTwins`), so an
overridden rest cannot strand the twins on the derived step (review of #1773). Every page interactive
`fill.rest` (and so focused/selected) now also clears its floor against `background.tertiary` (owner,
2026-09-29, the #1352 pattern): in `dark` nb, harbor, wendys and prism3 move one step lighter. An authored
anchor pin stays `exact` and skips that gate, so its tertiary miss is now reported: a `warnings` entry with
`against: 'background.tertiary'` and a `tierChecks` entry that `tree.ts` counts into `modeChecks` /
`modePass`, the way a missed override counts (review of #1773). The page `fill.selected` `.ai.json`
guidance says selection must show by other means. `onColor`'s pure-extreme pick takes WHITE on a near-tie
(both clear 4.5:1, within 0.05:1) in dark-family modes (owner, `pureExtremeInk`), for the interactive
on-fill and, extended by the owner the same day, the `text.on-<status>` / `icon.on-<status>` inks: prism3,
aurora, harbor and minimal dark on-fill labels and 42 dark status cells move black → white. Emitted values
move in every brand, and the projected surface moves wherever a def binds a focused/selected fill or the
inverse on-fill → ENGINE MINOR. CONTRACT STANDS at 13.2.0: no token name moves.

0.201.0 — #1782: the three FIELD STATUS borders (`border.danger` / `border.warning` / `border.success`)
clear their non-text floor on the grounds a status field actually draws them on. `text-field`, `textarea`
and `select` keep the status border at hover, where the control fills with the translucent
`interactive.neutral.overlay.hover` wash; contracted against `background.primary` alone, the 500 anchor
measured 2.64–3.00:1 against that wash composited over `background.secondary` (132 members, 44 cells).
The roles now also clear `background.secondary` and the wash composited over either page ground, through
`pickBrand`'s existing `alsoClear` at the role's own `nonTextMin` (4.5 in HC — an owner decision, since
the HC 500s already cleared 3:1), with the wash at the alpha the brand's dialect EMITS (`emittedAlpha`:
26/255 in hex, 0.1 in NB's rgb). A status border also never takes `border.focus`'s colour (owner
decision): the three roles pass the resolved ring to `pickBrand` as `avoid`, which moved nb dark
`border.danger` red.450 (the ring's step) → red.400. Values move one rung in light/dark (light → 550,
dark → 450) wherever 500 missed, and one or two rungs in HC (hc-light → 550/600, hc-dark → 400/450);
103 role-modes across the corpus + prism3, none in the NB master theme (no wash, and 500 already clears
`background.secondary`). `border.brand` / `border.info` are not field statuses and do not move. NB's
authored values now diverge in nine role-modes (`NB_KNOWN_DIVERGENCES` group seven). Emitted values move
in every washed brand → ENGINE bump. CONTRACT STANDS at 13.2.0 (no token name or projected member moves).

0.200.0 — Tag: Select and Dismissible types; Badge: a smaller radius for status labels (owner decisions,
2026-09-28; closes #1741 and #1743). TAG: a `type` variant axis (`select | dismissible`) and code prop
replace `interaction`; the plain clickable tag is dropped. Select carries an
optional leading icon and a TRAILING check mark behind a `check mark` boolean (on by default), present only at
`selection=selected`, and no dismiss. Dismissible has no selection (`excludeCoordinates` removes dismissible ×
selected, so the set is 45 members, up from 30) and a plain `close` glyph in a square trailing slot the tag's
height, replacing the nested IconButton.Neutral. The minimum width is the height, bound (`minWidthKey`, a new
`PartDef` field, the width twin of `minHeight`). Selected is a tint (`interactive.primary.overlay.selected`,
which the outline-interaction lever repoints to `subtle-fill.selected` on a solid-tint brand) and a 2px primary
outline (`border-width.thick`) at a constant label weight. The label wraps in code (#1758). SCHEMA: a boolean now
composes with a VARIANT `presentWhen` gate on its part (#1743 option (a)); a state gate is still refused.
BADGE: the status label's corner binds `radius.sm` (`{type}.radius`); count and dot keep `radius.round`. And the
owner's scope addition the same day: Badge's `genre` axis is renamed `type`, so Badge and Tag use one name.
`VARIANT_AXES` loses `genre` and gains `type`, so its count is unchanged; the values (`status | count | dot`),
the prop, the paint and geometry keys and the Figma variant property move with it. No token name carries it.
GATES: `lint-hit-target` measures targets inside a control and fails on an unlisted nested interactive
control (#1741). Projected members move for tag and badge → ENGINE MINOR. CONTRACT STANDS at 13.1.0: no token
name is added or removed (`border-width.thick` and `radius.sm` already exist).
  Review round: a new `PartDef.innerTarget` marks a target inside a control (Tag's × slot), and
  `lint-hit-target` compares the marks against its `INNER_TARGETS` in both directions, so neither can be
  dropped silently. Tag's prose no longer says selecting never reflows: the label keeps its width, and the
  check mark adds a cell. `figmaPropertyErrors` refuses a boolean whose variant gate lands only on excluded
  coordinates. Badge's contested note says `type`. Emitted prose moves; no projected member does. Same version.
  Owner decisions 2026-09-29: the Select check's Figma switch is `Check icon` (the plan digest moves, the
  member count does not); the widening check and the stepping selected edge are recorded as decided. Same
  version. The one emitted `subtle-fill.selected` for every brand is held (the `none` lever omits it by design).
  Then the owner's answer, "respect none": every brand whose `outlineInteraction` is not `none` emits
  `interactive.primary.subtle-fill.selected` (one leaf on overlay-neutral, by the solid-tint rule), Tag binds it,
  and `none` drops it. Emitted trees, overlays, Figma color files and sidecars move for every overlay-neutral
  brand. The role is brandDependent, so CONTRACT stands at 13.1.0. Same version.
  Re-review: the `.ai.json` sidecar describes the tint as a color role and never as a primitive, and a tinted
  role's `mode_overrides` state `{ color, opacity }` rather than the fill's palette step (sidecar schema 0.3 →
  0.4). An `innerTarget` part must bind `size` or both sides. Same version.
  Merged with main at 0.199.0 (#1765 and six more): two rules for a boolean over a `presentWhen`-gated part
  met — #1765's (two or more parts PARTITIONING one axis, switch-control's `State icon`) and this entry's (one
  part on a variant gate, Tag's `Check icon`). One rule replaces both: VARIANT gates only, the targeted parts'
  gates DISJOINT (no member builds two nodes for the boolean), and at least one member the set keeps building a
  node; coverage of an axis is no longer required. The projector evaluates the gate for every boolean part on one
  path, ahead of the slot-name lines. Neither def's projection moves (switch 24 members, one glyph each; Tag 45,
  the check on selected select members only). One merge-only break, fixed here: nb's single `color-aliases`
  materialise payload measured 44,813 bytes on this branch and 44,840 on main, and 45,144 merged, over the
  45,000 `figma_execute` ceiling. The pass is now packed into byte-budgeted chunks exactly as `color-create`
  is (#906); nb pastes it as 2. CONTRACT STANDS at 13.2.0, main's. Same version, renumbered 0.200.0.

0.199.0 — #1710 (owner decision, 2026-09-29): the read-only field keeps the editable field's boundary.
`text-field`, `textarea` and `select` rebind `border.read-only` from `color.border.secondary` to
`color.field.border.rest`, so the read-only member draws the same border as rest and filled in every mode.
`border.secondary` measured 2.69–2.81:1 on `background.secondary` in light in every brand, below the SC 1.4.11
floor; `field.border.rest` measures 3.16–4.63:1 there across every corpus brand, prism3 and the NB master
theme. The three defs' a11y and prose claims now name the boundary that is built. The projected read-only
members' stroke moves (`schema/component-surface.json`, the paint census) → ENGINE MINOR. CONTRACT STANDS at
13.2.0: no token name moves — the defs bind an existing role.

0.198.0 — #1745: Badge's three NEUTRAL pairs become mode contracts instead of example-brand measurements, so
every brand the engine generates is checked, not only the corpus. `border.secondary` is contracted against
`background.primary` at the mode's non-text bar (3:1, 4.5:1 in high-contrast), and its `pickClosest` now
takes that bar as a floor: a rung that lands under it is ineligible and the pick moves one step deeper.
`inverse.foreground.tertiary` (the bold neutral fill) moves from a `self` surface to a fill contracted
against `background.primary` at the same bar, and carries a SECOND pair, `alsoAgainst` — its label
`inverse.text.primary` at 4.5:1 — which the contrast sweep measures from the final colors and names in
`warnings` (with the partner in `against`) when it falls short; `tree.ts` counts that pair in `modeChecks`, so the
CLI and `emit-dtcg` exit non-zero on it, and both roles state it in their `.ai.json` `contrast_with`. NO emitted color moves in any corpus brand
or in the NB master theme; `out/**` moves by the new `against`/`min`/`contrast` metadata on those two roles,
the two new `contrast_with` entries per `.ai.json`, and the stamp → ENGINE MINOR. CONTRACT STANDS at 13.2.0
(no token name moves).

0.197.0 — #259 phase 1: the style-guide generator, COLOR (owner decisions, 2026-09-27/28). A plugin
feature: `apps/plugin/src/style-guide.ts` draws one table per color group onto `↳ Primitive tokens` /
`↳ Semantic tokens` from the file's own variables, with modes side by side (each swatch bound and
mode-pinned), each specimen on its contracted ground, and a contrast column from `resolveAllModes`.
`style-guide-cells.ts` builds or adopts three cell sets on `↳ File Components` during Set up file. New panel
step and `style-guide` agent command. A plugin behavior change (principle 5) → ENGINE bump; no engine
emission or projected surface moves, so `out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS at
13.1.0 (no token name moves). Design record: `docs/45-style-guide-generator.md`.

0.196.0 — #1318 (owner decisions, 2026-09-28): the veil's DIRECTIONAL GRADIENT washes, Prism 2's
`Gradient from top/bottom/left/right` scrim variants. A new variant axis `direction` (`full | from-top |
from-bottom | from-left | from-right`, default `full`) takes the veil from 6 members to 30; the six `full`
members bind the same solid fill as before. The engine gains COMPONENT-LEVEL gradient paint: a box part
declares `gradient` (the axis, a CSS angle per value, the far-stop binding key), and the projector writes
`gradientFill` — a linear gradient whose two stops are each bound to a color variable — which both
executors build in lockstep (the plugin through `write-styles.ts`'s stop binding, the paste through a
splice only a gradient payload carries). Two new roles, `veil.dark.clear` and `veil.light.clear`, and one
new primitive, `palette.white-alpha.0` (CONTRACT 13.2.0, below). Token trees move by the new leaves and
the stamp; the projected surface moves for `veil` only → ENGINE MINOR.

0.195.0 — #1354 (owner-decided 2026-09-28): the switch's off track is a light surface step in every brand,
and its thumb glyph is a Figma BOOLEAN. `switch-control`'s `off.fill` / `off.icon` move from the neutral
button fill (`interactive.neutral.fill.*`, which `neutralEmphasis: 'strong'` darkens — the NB master theme
drew #2D2C2C off beside #34383D on) to `background.tertiary`; `off.indicator` moves from `neutral.on-fill`
to the dark `interactive.neutral.border.rest`; the off `.hover`/`.pressed` fills are dropped and fall
through to rest. The check and the X ride one `State icon` BOOLEAN (default true) via #1331's
node-visibility mechanism, so the set stays at 24 members; `figmaProperties.booleans` gains a list form
(`part: [...]`) and `figmaPropertyErrors` admits `presentWhen`-gated parts only when they share one axis
and cover its values. `showStateLabel` defaults to `true` on switch-control and switch-row (a prop
DEFAULT change, not a rename). The disabled glyph (`disabled.icon.on-fill`) moves from `disabled.on-fill` —
the disabled thumb's own ink, which hid it — to `disabled.border`, 3.04–5.49:1 on the thumb (#1764). Off
hover/pressed show no visible change, owner-decided. Projected members move (`schema/component-surface.json`, the paint
census) → ENGINE MINOR. CONTRACT STANDS at 13.1.0: no emitted token name moves — the def binds existing
roles.

0.194.0 — #1751: `'fill'` sizing projects as FILL. It used to project as AUTO (hug), and the sizing modes were
applied x→primary, y→counter whatever the direction, so a column that filled across and hugged down read
backwards. Both executors (the plugin's `write-components.ts` and the paste twin) now map sizing by
direction, and a fill axis actually fills: FIXED on that axis, plus STRETCH or layoutGrow from the parent.
A nest carries its own mode as `instanceSizing`. The textarea message row fills the field and is justified
to its end: the message cell grows and its field-message text wraps, and the counter cell hugs. Projected
members move (`schema/component-surface.json`) → ENGINE bump. CONTRACT STANDS at 13.1.0.
  Review round (#1757): a new `PartDef.placementWidth` builds field-message's and field-label's roots at
  320, so their wrapping text no longer freezes at the default string's width; text-field's message and
  every field-label host stretch the nest; field-label's name wraps; select's value and placeholder wrap
  and its control hugs its height above the 44px floor; text-field's value row clips (#1758). Same
  version: the round lands before the first release of 0.193.0.

0.193.0 — #1752 (owner-decided 2026-09-28): a fourth button lever, `buttonLabelWeight` ("Button label
weight": Default | Emphasis, default Emphasis), for button / button-destructive / button-neutral only.
Under Default, `applyButtonLayout` rebinds each size's label type from `type.label.<rung>.emphasis` to
`type.label.<rung>.default`, after the medium offset, so a medium button at "One step smaller" binds
`type.label.sm.default`. `brandTheme` unions `default` into `typography.weights.label` for that setting, so
the style the button binds is always emitted. Tag and badge keep emphasis. A new input field, a new lever
and new projected-surface rows (`@button-label-default`, `@button-smaller-label-default`; every existing
row is unchanged) → ENGINE MINOR. Emphasis is the identity: every brand's token tree moves by the stamp
only, and `out/components` moves by button's one new docs line. CONTRACT STANDS at 13.1.0: no corpus
brand sets the lever, so the guaranteed surface does not move, and the `type.label.*.default` paths it
adds exist only on a brand that sets it.

0.192.0 — Button and IconButton summaries stop claiming the brand color (owner, 2026-09-28). "Triggers an
action in place, in the brand color" was untrue for a brand whose primary action is neutral (the
nb-redesign example and the owner's NB master file point it at a neutral). The summaries now describe the action, and the long descriptions say "the brand's primary action
style". Shipped prose moves (`out/components/*.md`, `components.ai.json`, the plugin bundle and page headers)
→ ENGINE bump. CONTRACT STANDS at 13.1.0.

0.191.0 — #1747 (owner, 2026-09-28): a bold badge carries the subtle badge's inset outline in transparent,
so forced-colors mode, which drops background fills, still draws every badge's edge. Code guidance only
(`codeOnly`): no member's geometry or paint moves. The def text reaches `schema/component-maintainer.json`
and the badge digest in `schema/component-surface.json` → ENGINE bump. CONTRACT STANDS at 13.1.0.

0.190.0 — Badge follow-ups (owner decisions, 2026-09-27 and 2026-09-28), and a sparse variant grid.
(1) `genre` joins `VARIANT_AXES` as the nineteenth axis name, and Badge projects it (status, count, dot).
(2) Badge takes the existing `emphasis` axis name with `subtle | bold`; only the status label has both,
the count and dot are bold-only. SUBTLE: the tone's tint under its text ink with a 1px inside edge in
`border.<tone>` (neutral: `foreground.secondary`, `text.primary`, `border.secondary`). BOLD: the solid tone
fill under `text.on-<tone>` (neutral: the inverse surface and its ink). Paint keys become
`{tone}.{genre}.{emphasis}.{slot}`. (3) The schema gains `figmaProperties.excludeCoordinates`, a list of
partial coordinates a set does not have: `figmaAnatomySet` skips them, `figmaAnatomyPlan` refuses them,
`figmaVariantCount` subtracts them by inclusion–exclusion, and `figmaPropertyErrors` refuses an unknown
axis or value, an empty entry, an exclusion that empties the set or strands a declared value, and one
that removes the first member or the code default. Badge's set is 20 members (30 less the 10 count and
dot members at `subtle`). A moved projected surface and moved `out/components/**` docs → ENGINE MINOR.
CONTRACT STANDS at 13.1.0: no token name moves, and the def binds existing roles only.

0.189.0 — a new component def, `tag` (owner decisions, 2026-09-27): the interactive token a user clicks,
toggles or removes, one component switched by an `interaction` prop (clickable | selectable | removable).
Its Figma set is selection (unselected | selected) × size × five states = 30 members, with the leading icon
and the nested IconButton.Neutral remove button as node-visibility booleans. It binds the interactive color
family only. `badge`, `icon`, `button` and `checkbox-row` move their `composition`/`ai` lists (a planned
`tag`/`chip` is built now), so their pages move too. A new def moves the projected surface and adds one
payload artifact (`out/components/tag.md`) → ENGINE MINOR. CONTRACT STANDS at 13.1.0 (no token name
moves; the def binds existing roles only).

0.188.0 — the page header is never narrower than its own Medium variant (live, 2026-09-27). A placed
`_Section-header` took the content's width alone, so the Spinner page (80px of content) got an 80px
header with its title broken one letter per line. The width is now the content's, floored at the width
the file authors the Medium variant at. A plugin behavior change → ENGINE bump.
CONTRACT STANDS at 13.1.0 (no token name moves).

0.187.0 — a new component def, `badge` (owner decisions, 2026-09-27): a static status label, count or
dot, one component switched by a `genre` prop, with no states and no interactive binding. Its Figma set
projects the status label across five `tone` members (neutral / info / success / warning / danger); the
count and dot are code-only until a genre axis is admitted. A new def moves the projected surface and
adds one payload artifact (`out/components/badge.md`) → ENGINE MINOR. CONTRACT STANDS at 13.1.0 (no
token name moves; the def binds existing roles only).

0.186.0 — #1296/#1718: the default theme gains its accent, gradients and extras, and the numeric weight
tier always carries the contract's standard weights. (1) ENGINE: `weightsRef` now unions the four
contract-guaranteed numerics (300/400/700/900, a literal `CONTRACT_WEIGHTS` list, deliberately not
derived from the default roles) onto the numerics a brand's weight roles use. A brand that remaps a role
no longer drops a guaranteed `core.font.weight.*` path (#1718, the always-emit option); every brand at
the default roles already emitted all four, so nb, aurora, harbor and wendys move only their version
stamps. (2) prism3: a violet `accent` brand color (#7A3CFF), a linear `brand` gradient (primary.600 →
accent.500, 135°) and a radial `glow` (accent.400 → primary.700), paired italics on body
(`italics: [body]`, beside `italicDefault: [display, title]`), shadows tinted toward the primary hue
(amount 0.35), and a brand-specific status set (success 155, warning 70, danger 25, info 230). prism3
gains `core.font.weight.700`. Emission moves → ENGINE MINOR. CONTRACT STANDS at 13.1.0 — no guaranteed
name moves; prism3 now emits every guaranteed path.

  (0.186.0, continued — the first pass) #1296: the canonical default theme, `prism3` at root `pds3`, and italic as a category's
DEFAULT cut. (1) A new lever, `typography.italicDefault: TypeGroup[]` (the shape of `italics`/`links`):
a listed category's bare composites are the italic cut — `$value.fontStyle: 'italic'` under the
ordinary name, and the derived Figma cut is the weight's italic instance (500 → "Medium Italic") — with
no upright variant; a category may not also be in `italics` (refused by name). (2) One method per job:
a `typography.faces` pin whose style names an italic cut (case-insensitive substring `italic`) is
refused and pointed at the lever, as is any pin inside an italic-default category; NB's upright
"Light Condensed" pins are unaffected. (3) The Figma cut SLOT stays keyed on the modifier in the
style's name, and its VALUE follows what the composite renders. (4) The plugin's text-style executor
reconciles each bound cut VARIABLE's value to the family's real spelling, per mode (#499's resolver),
so Playfair's 600 binds "SemiBold Italic" while Inter's binds "Semi Bold". (5) `prism3` is emitted to
`out/` and `out/figma/prism3/`, and becomes the studio and plugin boot brand. Existing brands' artifacts
are byte-identical before this bump; after it they restamp only. ENGINE MINOR; CONTRACT STANDS at
13.1.0 (`prism3` is not a corpus member; `token-contract --check` unchanged).

0.185.0 — component sets get 24px of inner padding, so the variant-set border shows (owner-reported and
approved 2026-09-27, 24 to match the grid's GAP). #1714 writes the border INSIDE the set's edge, and all
three layout scripts laid the grid out from (0,0), so an edge member covered it. The grid now starts at
(PAD,PAD) and the set is the grid's extent plus 2×PAD, in lockstep across `write-components.ts` and both
paste scripts. The one-shot paste now lays out AFTER the combine and resizes, as the other two do. No
plan moves; the executors and pasted payloads do → MINOR. CONTRACT STANDS at 13.1.0 (no token name
moves; `token-contract --check` level `none`).

0.184.0 — the plugin finds the two file-component sets whatever their name's case. Both of the owner's NB
files name the header set `_section-header` (lowercase s), measured live on 2026-09-27 at 0.183.0; the
plugin matched `_Section-header` exactly, so every build skipped the page header and reported that the
file had no header component, and Set up file would have built a second pair beside the owner's. Every
lookup of either set — the page header's set search and main-component check, and file setup's
"already built" check, now `ensureFileComponents` — goes through one case-insensitive match,
`isTemplateSet` (`apps/plugin/src/file-components.ts`). No set is renamed; a new set is still built as
`_Section-header` / `_Headings`. A PLUGIN behavior change → ENGINE MINOR; no engine emission or projected
member moves, so `out/**` restamps only. CONTRACT STANDS at 13.1.0 (`token-contract --check` level `none`).

0.183.0 — #1701: component docs are projected. A new emitter, `emit-component-docs.ts`, writes every
registered def's documentation from the same data: `out/components/components.ai.json` (one
brand-independent file, field names mirroring the def, validated against the authored
`schema/component-docs.schema.json`) and `out/components/<id>.md` (one page per def), both PAYLOAD; and
`schema/component-maintainer.json`, each def's `anatomy.codeOnly` and `notes.*`, which is NOT payload.
The split follows #1623 (owner decision, 2026-09-27): the payload carries the fields the plugin already
ships, and the page leaves out `ai`'s agent-only keywords and priority, which stay in the JSON. The
maintainer record is a regen artifact in a new `regen.ts` list, `MAINTAINER_ARTIFACTS`, drift-checked
but outside `SCHEMA_ARTIFACTS`, so the shipped-prose gates and this version's emission gate do not read
it. No page and no maintainer entry carries the engine version; the JSON's top-level `engineVersion`
is the one stamp. One def string moves (`radio-row`'s focus-ring note, `MUST` → `must`); no plan
moves. A new emitted surface → MINOR. CONTRACT STANDS at 13.1.0: no token name moves
(`token-contract --check` level `none`).

0.182.0 — #1700: the support defs align to their KB briefs, and the schema's vocabulary is closed and gated.
Projected surface: only three defs' `codeOnly` lists move (icon, focus-ring, field-message — stale entries
reworded), so their plan digests move at the same member counts. Everything else is def metadata no
projection reads: `category` is now the KB's seven (a closed union, validated; field-message → feedback,
veil and image-placeholder `media` → foundations), `composesWith` holds only what a def nests (gated as an
equality against `anatomy`; reverse and "sits beside" lists moved to `ai.commonPartners`), `inherits` must
be a registered id, aliases are kebab-case (spinner's three spaced ones renamed), a `contested` entry that
settles itself is refused (the settled ones moved to `evolution`), and every def header cites its KB brief
or says it has none. MINOR by the running convention. CONTRACT STANDS at 13.1.0: no token name moves.

0.181.0 — component sets carry Figma's purple dashed border again, because both executors now WRITE it.
Probed live 2026-09-27: `combineAsVariants` returns the set with `dashPattern: [10, 5]` and a 5px radius but
`strokes: []`, so #1430's "preserve what the host gave the set" preserved no paint and every built set
showed no border. The plugin's `claimDefaults` (`apps/plugin/src/write-components.ts`) and its paste twin
in `PAYLOAD_BUILD` (`anatomy-figma.ts`) now write `SET_BORDER` — one SOLID #9747FF stroke, 1px, INSIDE,
a 10/5 dash, 5px corners — onto a freshly combined set that comes back with no stroke paint; a set that
comes back already stroked keeps its own. A plugin and paste-payload behavior change (what a designer sees
on every built set) → MINOR. No plan, token value or name moves: `out/**` restamps only and the projected
member digests hold. CONTRACT STANDS at 13.1.0 (`token-contract --check` level `none`).

0.180.0 — the plugin places a page header on each component page (owner decisions, 2026-09-27). After a
build lands on its `↳ <family>` page, the plugin adds ONE instance of the `_Section-header` file component
(Size=Medium, FIXED width at the content's width, HUG height, its bottom 80px above the content's top) and
writes the family title and the primary def's `summary` into it. A rebuild finds the header by its main
component, adds no second one, never touches its Size, width or position, and rewrites text only while
it still reads the placeholder. A file with no `_Section-header` set skips the header and says so in the
build result (`apps/plugin/src/page-header.ts`, `test-page-header.ts`). A PLUGIN behavior change →
ENGINE MINOR; no engine emission or projected member moves, so `out/**` restamps only. CONTRACT STANDS
at 13.1.0 (`token-contract --check` level `none`).

0.179.0 — #1699: the field family and the switch align to their KB briefs (owner-delegated decisions).
Two projected-surface moves: (1) `select` gains `read-only` and `pending` (text-field's state set);
`read-only` projects, so the set grows status(4) × state(5) = 20 → 24, and the new column binds
text-field's `border.secondary` boundary plus the status-led `{error,warning,success}.border.read-only`.
(2) `field-label`'s defaults follow its hosts — `required: false`, `size: small`, `emphasis: secondary` —
so the `emphasis` values reorder to [secondary, primary] (the set's first member, Figma's default
variant, is now small / secondary / regular / rest) and the `required` marker builds hidden. Every host
that nests the label moves with it (the nested instance's built marker). The rest is def prose and
metadata that no projection reads: select's aliases and trigger keywords, text-field's prefix/suffix as
text affixes (API only), `motion` and `notes.evolution` on all six defs. MINOR by the running convention.
CONTRACT STANDS at 13.1.0: every binding is an existing role, so no guaranteed token name moves.

0.178.0 — #1698: the checkbox and radio families aligned to their briefs. The projected surface moves in
two ways. `radio-control` drops its per-option error (owner-delegated decision 1): no `error` state, no
`unchecked.border.error` / `checked.border.error`, so its set goes 36 → 30 members and `radio-row` stops
declaring `error` (its code-projection grid 21 → 18). And all six defs changed `codeOnly` or a part note
(the RTL / text-expansion entries; the glyph and dot notes now point at the new `motion` field), which
moves the plan digest of the other five at the same member count. The rest
is def metadata a consumer reads through the bundle: `motion` on all six, `radio-group`'s `name` now
required (decision 2), `checkbox-row` gains the `description` prop, WCAG entries reworded as intent where
the def does not meet them, group terms moved from rows to groups, `composesWith` listing only what a def
nests. No emitted token moves, so `out/**` restamps only. CONTRACT STANDS at 13.1.0: a component id,
prop or state is not a guaranteed token name (`token-contract --check` level `none`).

0.177.0 — the spinner carries its KB brief forward to the def standard, with the owner's decisions of
2026-09-27. Two shipped behavior changes: (1) the DEFAULT ANNOUNCEMENT — `label` defaults to "Loading" and a
standalone spinner is a polite `role="status"`; a host that announces its own busy state (Button /
IconButton `isPending`) opts out with `aria-hidden="true"`, which both hosts' `accessibility.aria` now state;
(2) the ENTER FADE — `motion.enter` is a quick opacity fade on the existing `motion.duration.fast`, kept under
reduced motion. One projected move: the four `spinner/<size>` members carry the revised `codeOnly` list (the
fixed arc, RTL force-clockwise, the fade, the anti-flash figures, the announcement). No other def's plan moves
(Button / IconButton change only `accessibility.aria` and a part note, neither in the plan). No token name
moves, so CONTRACT STANDS at 13.1.0 (`token-contract --check` level `none`); `out/**` moves by the stamp only.

0.176.0 — #1662 follow-up (owner decision 2026-09-27): the plugin's boot read-back compares the modes the
saved brand DECLARES with the modes the file's `color` collection HOLDS. `verifyReadback` takes the declared
set as a required second argument (`{ modes }`, or `{ skipped: <reason> }` when the file stores no brand or
the stored one cannot be read) and returns a tri-state `declaredModes` result beside `checks`: a declared
mode missing from the file FAILS the verdict and is named; a mode in the file the brand does not declare is
REPORTED, not failed (a designer's own mode); no saved brand SKIPS the comparison and the seed pill states
why. Before this a multi-mode brand whose other modes never landed (`addMode` refused on a plan tier's mode
cap) read "contract holds ✓" with one mode. PLANNED MODES (net review): a refused `addMode` throws and aborts
the apply before the brand is persisted (#131 persists only on success), and the float pass runs before
color, so a cap is usually refused on `layout`'s breakpoints with color untouched — the saved brand alone
reads a match. `reconcileModes` therefore records each collection's planned mode names on the collection
(`prism3/modes:planned`) BEFORE its first `addMode`; `read-figma` carries them as `snap.modesPlanned`, and
`verifyReadback` returns a tri-state `plannedModes` (pass / fail naming collection + modes / none when no
record) that also fails `ok`. A plugin behavior change (the seed pill's verdict) → MINOR. No
token value or name moves — `out/**` restamps the generator version only; CONTRACT STANDS.

0.175.0 — #1697: the button and icon-button families aligned to the KB button brief. Three projected
moves, all on the component surface (`out/**` moves by the version stamp only):
  (1) ICON-BUTTON'S DISABLED EDGE rebinds `color.disabled.border` → `color.disabled.icon`, the rebind #1349
      gave Button. The old role measured 1.48–1.80:1 against the page (fill-matched, gated `min: 0`); the
      disabled icon ink clears 3:1 in every mode, so the edge now meets SC 1.4.11. Six outline-disabled
      members per sibling move their stroke (and their inverse twins via the projector's rewrite).
  (2) ICON-BUTTON'S PENDING MEMBERS swap in the real spinner (`spinner/small|medium|large` at the icon's
      1:1 rung) in the icon's own cell, as Button's have since #1670. 36 members per sibling.
  (3) Every member of all six defs carries its def's revised `codeOnly` list (brief §9/§11 rules added on
      Button; the stale focus-ring and spinner-ceiling entries rewritten or retired on icon-button).
Also: per-sibling `ai` (trigger keywords, avoid-when, priority) and `docs.do`, per-family
`composition.alternativeTo`, restated `onClick`/`type` on icon-button, reasoned WCAG lists, and voice fixes
in shipped prose. No token name moves, so CONTRACT STANDS at 13.1.0 (`token-contract --check` level `none`).

0.174.0 — #1685: personality-trait citations are checked against the briefs they quote. Four `why`
strings in `vocabulary.ts` change, and each one ships: it is the bracketed text of the note `brandTheme`
returns when a `personality` trait fills a lever, and it is inlined into the studio bundle. `dense` now
states that no example brief asks for density and that it stands as the opposite pole of `generous`
(harbor's "not a dense dashboard" rejects density, and the old wording read as if it cited it). `sharp`
gains the citation it never had (nb-redesign: "Corners are sharp"). `premium` and `bold` split quotes that
spanned markup or an arrow the brief keeps outside its quote marks, so each quoted span is verbatim.
No lever value moves, and no corpus brand sets `personality`, so `out/**` moves by the version stamp
only. A note a consumer reads is observable output, so ENGINE bumps (MINOR, by the running convention).
CONTRACT STANDS at 13.1.0: no token name moves (`token-contract --check` level `none`).

0.173.0 — #1687: the legacy CLI paste path's `verify` pass (`materialise-to-figma.ts`) no longer fails a
single-mode brand's `modesDistinct` — the twin of #1662 in `read-back.ts`. With exactly one mode it now
passes iff `color/background/primary` is aliased to a variable that exists (not absent, not a literal);
multi-mode keeps `size > 1`. The same payload also referenced an undefined `byName` for
`fieldFamilyPresent` / `bareDangerPresent` (the index became `byTail` at #1097), so it threw before
returning; both now read `byTail`. A paste-path verdict behavior change → MINOR. No token value or name
moves — `out/**` restamps the generator version only; CONTRACT STANDS.

0.172.0 — #1662: the read-back's `modesDistinct` no longer fails a single-mode brand. The check asked
`new Set(perModeTargets).size > 1`, which a file with one mode can never satisfy, so every
`modes: ['light']` brand read "FAILED: modesDistinct" on the plugin's boot read-back (first seen live on
`nb-redesign`) — a vacuous failure, since the guard exists to catch modes collapsed onto one target and
one mode has nothing to collapse. With exactly one mode, `verifyReadback` now asserts only that
`color/background/primary` is bound in it (the same ABSENT case a multi-mode file fails on); zero modes
and multi-mode files are unchanged. A plugin behavior change (the seed pill's verdict) → MINOR. No
token value or name moves — `out/**` restamps the generator version only; CONTRACT STANDS.

0.171.0 — #1672: the legacy CLI paste path (`materialise-to-figma.ts`) writes a TINTED WASH's alias
opacity. Its `color-aliases` pass built its rows from `targetsByMode` alone, so a `solid-tint` brand's
`[inverse.]interactive.<c>.subtle-fill.<state>` would have bound as a plain opaque alias to its fill.
A wash row now carries its `opacity/<n>` variable per mode, the pass writes
`{ color: <alias>, opacity: <alias> }` (the shape `write-figma.ts` writes since #1646), and a missing
opacity variable is a named miss. `dims-create` now precedes `color-aliases` in the paste order, so the
opacity variable exists when the wash binds. No committed brand sets `solid-tint`, so every emitted
payload for a committed brand is byte-identical apart from the pass order; `out/**` restamps only.
A paste-path behavior change → ENGINE bump. CONTRACT STANDS (no token name moves).

0.170.0 — #1684: the desktop bridge's MCP `notifications/progress` only ever increase. `figma_run` passed a
reading's `done` straight through as `progress`, which restarts at build → wire, at each #1679 `retry` pass
and at the next set's build, so a client enforcing the MCP rule could drop the stream mid-build. The bridge
now folds each finished segment's last `done` into an offset (`createProgressCounter` in
`tools/figma-bridge/server.ts`) and omits `total`, since no honest one is known until the run ends; the
phase's own fraction stays in `message`. Behavior of a tool that reports ENGINE_VERSION as its
`serverInfo.version` (the #1661 precedent) → ENGINE bump; no emission or projected surface moves, so
`out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS at 13.1.0.

0.169.0 — #1670: the Spinner component, to the owner's spec (2026-09-26), and the button's pending state
swaps it in. `spinner` is a new def: four standalone `spinner/<size>` components on the icon ladder
(16 / 20 / 24 / 32), each one composed glyph — a full ring at 20% layer opacity under a 33% head arc with
round caps, drawn as filled outlines on the 24-unit artboard so the 2px band scales with size. The glyph
lives in the new `component-glyphs.ts`, outside the icon set. Button's pending overlay names it
(`nests: 'spinner'`) and swaps in the member on its slot's own icon rung (small → `spinner/x-small`,
medium → `spinner/small`, large → `spinner/medium`) instead of the caller's icon placeholder, and links to
no swap property. Both executors write each imported glyph layer's opacity from its SVG document. Two new
motion tokens, `motion.duration.spin` (800ms) and `motion.duration-reduced.spin` (2600ms), outside the
tempo-scaled ramp, so every brand's `out/**` moves. Projected surface: a new def, and every button
family's pending members change (their spinner's swap target). CONTRACT 13.0.0 → 13.1.0 (four adds).
Review round: the paste executor's opacity write gains a reader (the engine stub's importer builds one
VECTOR per `<path>` with its `opacity`, and a paste-path arm runs every spinner member through both
executors); every layer-opacity read matches the attribute named exactly `opacity`, never `fill-opacity`;
the geometry gate checks that each cap bulges outward past the arc's end; and the def no longer cites
WCAG 2.3.3 (it slows the turn under reduced motion, which that criterion does not ask for). Lands after
#1679's 0.167.0 and #1681's 0.168.0, so 0.169.0.

0.168.0 — #1681 (owner-decided 2026-09-26, option A): `body` and `caption` keep `default`, the same way
`label` keeps `emphasis`. Both join `REQUIRED_WEIGHT_ROLES` in theme.ts, so the engine refuses a body or
caption set without `default`, naming the form controls that bind `type.body.*.default` and
`type.caption.md.default` by name; either set may still gain weights. The studio disables both
`default` boxes with that reason as the tooltip. The contract doesn't move: those paths were already
guaranteed, and the refusal is what keeps that true (CONTRACT STANDS at 13.0.0, `--check` level
`none`). Also aurora's brief drops "the UI is dense" to match its comfortable density (#1215), so
the `dense` personality's `why` is re-sourced; the lever and schema descriptions state the new rule.

0.167.0 — #1679: a Build over an existing set REPAIRS the references a refusal window left unset. The owner's
master-file Button (2026-09-26) came out of 0.157.0's 17.5 s back-off with 73 references unset on 36 members;
all 73 took on the first try ~25 min later. The plugin (`apps/plugin/src/write-components.ts`) now reads each
reference on a member it did not build and writes only the ones that do not read the plan's property, through
the same back-off and read-back as a fresh member (`refsRelinked`; a clean existing set writes nothing); the
back-off gains passes at 20 s and 30 s (67.5 s worst case, `REF_BACKOFF_TOTAL_MS`); and reference misses are
keyed per slot and counted apart (`refsUnset`, split by `refsUnsetBy` into refused / lost / discarded), so the
verdict states what the file lacks and offers "build again to retry" only for slots the host still refused
after every pass. `refsRelinked` counts only slots that read unset for a property already on the set. The
progress pill names the back-off wait (`retry` phase, "Retrying property links…"), and a Build that only
repaired links says so in the headline pill. Plugin behavior → MINOR; stamp-only regen. CONTRACT STANDS.

0.166.0 — #1639 (owner-decided 2026-09-26): the engine refuses a `typography.weights` input that leaves
any type category with zero weight roles, naming the category, and refuses a `label` set without
`emphasis`, saying why (`button` binds `type.label.*.emphasis` by name). `REQUIRED_WEIGHT_ROLES` in
theme.ts holds the second rule. `eyebrow` and `code` may swap their single weight, so their default
composites demote to brand-dependent (CONTRACT 13.0.0, below). The studio's weight checkboxes refuse
both moves (the last ticked role of a category, and label's `emphasis`, are disabled with the reason
in their tooltip). The schema and lever descriptions state both rules; the schema carries no `minItems`
because MCP `tools/list` inlines it and sits at its 60,000-char budget, so the engine is the one refusal.
No example brand's input changes, so `out/**` moves by the version stamp only.

0.165.0 — #1215 (owner-decided 2026-09-26): aurora moves from `compact` to the default `comfortable`
density. The studio boots aurora, and its 36px medium control read as the engine's default; at
comfortable its size ladder is 36/44/56 (was 28/36/44) and its control ladder 16/20/24 (was 12/16/20).
Only aurora's `out/**` moves (tokens, ai.json, figma `size`/`control`/`core.dimension`, tokens.html,
modes-report, example-brands). Compact stays exercised by a new TEST-ONLY corpus member,
`minimal-compact` (token-contract.ts), which every compact-density arm in test.ts now builds from; it is
not an example brand and never reaches `out/` or the studio. CONTRACT STANDS at 12.0.0: `--check` level
`none`. Without the fixture the intersection would have gained `core.dimension.30` (aurora now emits it,
the compact member does not), a MINOR; keeping compact in the corpus holds the guaranteed set exactly.

0.164.0 — The field family gains a projected `filled` state (owner decision, 2026-09-25, Prism 2's
`Enabled (Empty) | Hovered | Filled | Focused | Disabled` on all three specs). `filled` joins the closed
`STATES` vocabulary and the projected state axis of text-field, textarea and select. The value text binds
the placeholder ink (`text.secondary`) at rest, hover and focus-visible (new `label.rest` / `label.hover` /
`label.focus-visible` keys), and the value ink (`text.primary`, the bare `label`) at filled and read-only;
disabled is unchanged. This fixes two live QA defects: the placeholder rendered in value ink at rest, hover
and focus on all three. Each status border gains a `.filled` key, so the boundary holds on a filled member.
Sets grow by one state column: text-field and textarea 20 → 24 members, select 16 → 20.
TWO TEXT LAYERS (Option C, owner decision 2026-09-26). #1567 measured that a bound TEXT node shows its
set's ONE default (#1575 met it too), so one `value` property could not show a placeholder on some members
and a value on others. Each def now has a `placeholder` layer (rest / hover / focus-visible / disabled) and
a `value` layer (filled / read-only), each driven by its own TEXT property with its own default:
"Placeholder", and "Entered text" (text-field, textarea) or "Selected option" (select). textarea gains the
`placeholder` prop its property keys on. The schema move is minimal: `presentWhen` admits one reserved key,
`state` (`STATE_GATE`), read by the projector as the plan's state, with by-name refusals for an undeclared
state, a gate reaching no projected state, an empty list and a no-op over every projected state.
THE FOCUS CARET (owner decision 2026-09-26). text-field and textarea draw a bar immediately before the
placeholder at focus-visible only: `border-width.hairline` wide, `control.size.md.line-box` (one line of
the value's body md type) tall, in `color.text.primary`. It paints a new `caret` slot (`PAINT_SLOTS`,
`BOX_PAINT_SLOTS`): CSS's `caret-color` is its own ink role, and every existing slot was spent on a sibling
(`paintOf` is part-blind). Code keeps the native caret with `caret-color` from `text.primary` (codeOnly).
select draws no caret; that is held for the owner. The member footprint does not move: the control holds its
320 floor. New state + def surface moves → MINOR; component-surface and paint-census baselines accepted for
the three defs. CONTRACT STANDS (a TEXT property is not a token; every binding is an existing name).

0.163.0 — The tinted wash lives in its own Figma variable, so Apply Theme no longer resets button hovers
(#1646, owner-approved 2026-09-25). Measured live: one Apply Theme reset all 288 `solid-tint` hover/pressed
paints on button, button-destructive and button-neutral from 0.1–0.3 to 1, because the host resets the
opacity of every paint bound to a color variable it rewrites. Each `[inverse.]interactive.<c>.subtle-fill.<state>`
leaf (already in the DTCG tree) is now emitted as a Figma color variable whose value per mode is the fill
variable's alias at the `opacity/<n>` variable (#1646 probe cases A–C, E), and `applyOutlineInteraction` binds
it at paint opacity 1. The plan's `paintOpacity`, `ComponentDef.paintOpacity`, both executors' second-
assignment step (#1656) and their opacity read-back are gone. Apply Theme writes the FLOAT axes before
color, so a wash's opacity target exists when it binds (paste path reordered to match). No step moves: every
wash's opacity equals the old paint opacity in every mode of every example brand. Figma surface and
projected bindings change for `solid-tint` brands → MINOR; the component-surface baseline is accepted
(the `@outline-solid-tint` rows). CONTRACT STANDS — the `subtle-fill` names were already in the tree, and
no corpus brand sets `solid-tint`, so the guaranteed surface does not move.

0.162.0 — #1667: three button BRAND levers, owner-decided 2026-09-25, for button / button-destructive /
button-neutral (not icon-button). `buttonIcons` ("Button icons": Attached to label | Locked to edges),
`buttonMinWidthMultiplier` (a slider, default 2.25 — Spectrum's `button-minimum-width-multiplier`) and
`buttonContentSize` ("Button label & icon": Match button size | One step smaller). All three are
materialized into the def before projection by `applyButtonLayout` (the `controlShape` path), in both
executors via `materializeForBrand`. (1) Every button size now carries a minimum width, height ×
multiplier rounded UP to the 8px grid (nb 36/44/56 → 88/104/128), in BOTH icon placements — so an
"Attached to label" button with a short label is wider than before, the consequence the owner accepted.
(2) "Locked to edges" (the owner's construction): the root keeps hugging above that floor, each icon slot
is PINNED out of flow at the visual padding from its edge with a MIN/MAX constraint (new `PartDef.pin` →
plan `pin`), and that side reserves inset + icon + gap as literal padding (new plan `paddingPx`), so the
hugging label centers in the space beside the icons and still widens the button. (3) "One step smaller" gives the MEDIUM size
small's label style and icon. `PartDef.minWidth` also takes a per-size map. The projected component
surface moves (new `@button-default/@button-edges/@button-smaller` rows, and the button defs' own rows for
their edited `codeOnly` prose) → ENGINE bump. NO token is emitted or renamed — `out/**` is a stamp-only
regen, and the levers live in brand input, not in the tree — so CONTRACT STANDS at 12.0.0
(`token-contract --check` level `none`).

0.161.0 — The textarea's resize grip and character counter in Figma (owner decisions (c) and (d),
2026-09-25). A new `resize-grip` glyph joins the icon set (drawn for this project; the `icon` set grows by
one member). A new `PartDef.corner` pins a `vector` into its parent's bottom-right corner, out of the flow,
`inset` in from both edges; the plan carries the inset's name (`cornerInset`) and both executors lift the
glyph, place it at parent − artboard − inset and constrain it MAX/MAX. Textarea draws the grip at the
smallest icon rung in the muted icon role behind a `resize handle` boolean (ON by default, as code's
`resize` is `vertical`), and a "0 / 200" caption trailing the message in a new message row behind a
`character count` boolean (OFF by default, as `showCount` is). The message and the counter switch
INDEPENDENTLY (the owner's answer 2): each boolean toggles a cell carrying the stack gap above it (a new
top-only `PartDef.paddingTop`), the control and the row sit in a gap-0 column, and the counter's cell grows
across the row (a new box `PartDef.grow`, `layoutGrow: 1`) so the caption trails with the message on or
off. Message only, counter only, both and neither each leave no empty row and no stray gap. The grip moves
no box. field-message, text-field and select project byte-identically. New glyph + three new schema fields
+ a new plan field + a def surface move → MINOR;
the component-surface and paint-census baselines accepted. CONTRACT STANDS (every binding is an existing
name).

0.160.0 — The textarea's reserved-rows floor was reported DISCARDED on all 20 members of a live build
(owner's MCP testing file, 2026-09-25, through the agent link) although the host had kept it: `minHeight` is
stored at single precision, so 3 × 16px × 165% = 79.19999885559082 read back as 79.19999694824219 and the
exact compare failed. The plugin executor, the paste payload and the read-back now accept a read-back within
`MIN_HEIGHT_TOLERANCE` (0.01px); a dropped or wrong floor misses by whole lines. The plugin shim stores
`minHeight` via `Math.fround`, as the host does, and the textarea rows gate gains the live case. Behavior of
the build report changes → ENGINE bump. CONTRACT STANDS — no token name moves.

0.159.0 — Textarea builds in Figma, its projection modeled on text-field: the same column (nested
FieldLabel, the bordered control, nested FieldMessage following `status`), the same status-led border, five
projected states, focus-ring nesting and footprint — status(4) × state(5) = 20 members, the single `md`
rung (`size` left `variants`, text-field's #795 reason; `lint-rung-names` admits the ladder stated once).
The control binds NO height: a new `PartDef.lines` on the value text names the `rows` prop, the plan
carries the count (`minLines`), and both executors write the text's `minHeight` = rows × the line height
the host reports for the styled node, after the append — so the box is rows × line height + padding in
every brand with no pixel in the def. New def surface + a new plan field → MINOR; the component-surface
and paint-census baselines accepted. CONTRACT STANDS (every binding is an existing name).
0.158.0 — The field-message row reserves its status glyph's height in every status (owner decision, option
(a), 2026-09-25). On a brand whose caption line box is shorter than the 16px glyph (`nb-redesign`: 12px at
1.25 = 15) the default message row measured 15 and the three status rows 16, so text-field built with 15
footprint misses and select with 12. A new `PartDef.minHeight` (a token-bound auto-layout height floor on
a `box`, projected as a bound `minHeight`) lets `field-message`'s row bind `minHeight: 'glyph-size'`
(`icon.size.xs`); the row still hugs, so it measures max(glyph, caption line box) in every member.
Projected surface moves (the row gains a binding) → MINOR; `schema/component-surface.json` accepted.
CONTRACT STANDS (no token name moves; the floor binds an existing name).
0.157.0 — #1664: component WIRING outlasts the host's per-member reference-refusal window. Live Button
builds (2026-09-25, via the agent link) left one contiguous run of members — 44 on one file, 54 on another —
whose every component-property reference refused (a throw, or an accepted write that read back undefined);
#1568's single deferred retry after a `setTimeout(0)` repaired none, and the same write succeeded minutes
later. The plugin (`apps/plugin/src/write-components.ts`) now retries the queued references in a BOUNDED
back-off — real waits of 0.5 s, 2 s, 5 s, 10 s, at most 4 passes, none on a clean build — brings the
accepted-but-not-kept shape into the same queue, and records each pass (`refsBackoff`) in the result, the
set's `build` report and the console. Plugin behavior → MINOR; stamp-only regen. CONTRACT STANDS.
0.156.0 — The AGENT LINK, transport B (the local desktop bridge): while the owner has the link on, the
plugin's UI iframe holds a WebSocket to `tools/figma-bridge/server.ts` on `ws://localhost:17331` (the one
`devAllowedDomains` origin the manifest adds) and relays its commands to the same main-thread dispatcher
the mailbox uses; the link state gains `transports.bridge` and a `link-off` refusal. Plugin behavior →
MINOR; stamp-only regen. CONTRACT STANDS.
0.155.0 — The AGENT LINK, transport A (the file mailbox): an agent can drive the running plugin by command
and read back a structured result. The plugin's main-thread handlers now report to an `ActionSink` (the panel
passes one that posts exactly what it posted before), one `ACTIONS` table serves the UI switch and the
agent dispatcher, and while the owner has switched the link on the plugin polls `figma.root`'s
`prism3agent` shared plugin data for commands (`apps/plugin/src/agent-*.ts`). Plugin behavior → MINOR; no
emission or projected surface moves, so `out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS.
0.154.0 — Owner-found (2026-09-25), 0.153.0's fix did not hold: the NB button still built with 221
`fills.opacity -> DISCARDED (wanted 0.2, read back 1)`. Re-measured on the owner's file through the Figma MCP,
on FRAME, COMPONENT and RECTANGLE: the FIRST time a paint bound to a color variable lands on a node, the host
resets its opacity to 1, whether the opacity was on the paint before binding (0.153's fix) or spread on after
(0.152). Re-assigning a copy of the now-bound paint with the opacity keeps it, and it survives
`combineAsVariants`. 0.153's probe had run on a rectangle already bound by the previous case, which is why it
read 0.2. Both executors now assign the bound paint, then the opacity; both offline models encode the
measured rule (first bound assignment at an index resets opacity, a re-assignment keeps it), so 0.153's
executors fail the #1614 legs by name. Executor behavior → MINOR. CONTRACT STANDS.
0.153.0 — Owner-found (2026-09-25): the tinted-wash (`solid-tint`) outline hover built OPAQUE on the real host —
221 `container.fills.opacity -> DISCARDED (wanted 0.2, read back 1)` misses on the NB button. Measured on the
owner's file through the Figma MCP: a paint bound with `setBoundVariableForPaint` keeps the opacity it was
bound AT, and drops an opacity spread onto the returned paint afterwards — which is what both executors did.
Both now pass the opacity into the paint BEFORE binding (`paint(var, where, opacity)`), in lockstep. The two
offline models (`component-shim.ts`, the `test.ts` paste stub) now model that host rule, so the existing
#1614 legs fail on the old executors instead of passing. Executor behavior → MINOR. CONTRACT STANDS.
0.152.0 — Owner-found (2026-09-25): Apply Theme aborted with "write failed: emit-figma-color: …inverse.
interactive.primary.fill.hover is not a neutral step off a white / black rest fill (rest brand-neutral.025)".
The #1645 Figma line for the inverse fill states RE-DERIVED its rung count from the light-mode aliases and
assumed the rest was white / black; a brand that overrides that rest to its own palette step (the plugin
UI allows it) made it throw, and the throw took the whole write down. The count is now the engine's own
per-state rule (`interactiveStateRungs`, hover/focused 2, pressed/selected 4), exported from `modes.ts`
so the walk and the Figma line state one number. Committed `out/**` is byte-identical apart from the
stamp (the re-derivation agreed with the rule for every committed brand). Behavior fix → MINOR. CONTRACT STANDS.
0.151.0 — #1393: the paste/MCP-console executor (`PAYLOAD_BUILD`) gains a `claimDefaults` pass, the twin of
the plugin executor's #865 neutralizer, kept in lockstep (same properties, values and carve-outs, including
the set's #1430 preserved framing). Before it, every frame whose plan declared no fill (outline/text at
rest) and every frame whose declared fill could not resolve kept `createFrame()`'s opaque white on a console
paste; both now clear to transparent, and the declared-but-unresolvable neutralize (#1387) is ported too.
The pass's `paragraphSpacing`/`leadingTrim` writes detach an applied text style (#1567), so `build` now
re-applies it after the pass, as the plugin does. No `out/**` artifact carries the payload, so the emission
is stamp-only; the payload a consumer pastes changes behavior → ENGINE bump. CONTRACT STANDS (no token name
or projected member moves).
0.150.0 — #991, #1463: `lint-us-english`'s rule widened to the en-GB classes it was blind to (`-oured`/
`-ourite`/`-ourable`, `-ogue`, `-ence` nouns, `-yse`, `artefact` and the other letter swaps, and the reverse
single-L class), and every spelling it then found in shipped text respelled to en-US: `catalogue` →
`catalog`, `licence` → `license`, `artefact` → `artifact`, `honoured` → `honored`, `colouring` →
`coloring`. Meaning identical, letters moved. `radio-row`'s shipped `focus` doc prose, the generated
`icon-glyphs.ts` header and the `prism3-consume` skill move → ENGINE bump. CONTRACT STANDS (no token
name or component member moves; `token-contract --check` level `none`).
0.149.0 — #1238: `composition.composesWith` follows `anatomy.parts[*].nests`. The button family (`button`,
`button-destructive`, `button-neutral`, `icon-button` and its two variants) and `text-field` nested the
focus ring while leaving it out of `composesWith`; they now list it, and `textarea` (no anatomy yet, binds
the ring) lists it by hand. A new `test.ts` arm fails any def whose anatomy nests a component its list
leaves out. The def strings ship in the plugin bundle and the `.ai.json` registry → ENGINE bump; no token
or projected component member moves. CONTRACT STANDS.

0.148.0 — owner decision 2026-09-24 ("Setting should cover destructive"): the `strictInteractiveContrast`
lever now swaps EVERY brand-ink inverse label to the neutral extreme — destructive's danger ink as well as
primary's brand ink — so with the lever ON no inverse state fill drops its label below 4.5:1 (destructive
dipped to ~2.5:1 on the #1456 stepped hover/pressed fills). The rule is by category (`inkPalette !== null`):
neutral and declared interactive palettes already carried the neutral extreme, so nothing else moves. The
default-off destructive inverse hover/pressed `$description` reverts to the approved primary wording (the
setting "keeps it at 4.5:1 or more"). Emission changes only with the lever ON (no committed brand sets it)
plus that description line → ENGINE bump. CONTRACT STANDS (no token name moves).

0.147.0 — #1623 sign-off (owner decisions on the description audit). Figma gets its OWN description register:
`figma-description.ts` builds every Figma variable and style description from structured data (px, each
mode's `min`, alpha, the ground role, the face) — never from the DTCG `$description` — at about 90
characters, and the `desc` passthrough is removed. DTCG prose moves too: inverse fill states state the
measured label drop (T-6), 3:1 text roles carry the large-text limit (T-7), palette bands are glossed with
their real step range and research jargon is replaced (T-8), the focus ring width no longer names an
unemitted 3px (F-17). Text, grid, effect and gradient style descriptions move, and the plugin prune
recognizer moves with them (accepting the legacy words). New gate `lint-figma-descriptions.ts`. Emitted
prose moves in every brand's `out/**` → MINOR. CONTRACT STANDS (no token name moves).
0.146.0 — #1623 sign-off: the `.ai.json` sidecar is built for machine readers (schema
`prism3-ai-metadata/0.3`, published as `schema/ai-metadata.schema.json` and validated in test.ts by the
in-repo `json-schema-lite.ts`). Owner decisions: `.ai.json` is the payload channel, so `avoid_when_level`
is gone and the one `MUST` is a `requirement` on each `contrast_with` entry, gated by `lint-voice.ts`'s
new `normative` rule (AI/C-1); tertiary and subtle inks carry a structured `usage_limit` and say "large
text, icons and non-essential text only" (AI/C-2, ELSEWHERE-2); no capitals for emphasis (AI/C-3);
`paired_with` splits into `sits_on` / `carries` / `tracks` (AI/D-3); the scrim tracks `foreground.primary`
(AI/D-2); `on-fill` relates to `fill.rest` only (ELSEWHERE-1); new `layout` and `motion` tiers plus the
font roles give every tree leaf an entry (AI/D-1). Emitted `out/*.ai.json` changes → MINOR. CONTRACT
STANDS (the sidecar is not the token-name surface; no token path moves).

0.145.0 — #1623 sign-off (component metadata): every def gains a one-line `summary`, which the plugin now
writes as the Figma description of each component set (or each component, for `emitAsComponents`); the
`composition` id lists hold only registered ids (unbuilt ones move to `composition.planned`, described
patterns to `composition.replacesPatterns`); seven display names move to the one convention
(`Button.Destructive`, `Button.Neutral`, `IconButton.Destructive`, `IconButton.Neutral`, `ImagePlaceholder`,
`Checkbox.Group`, `Radio.Group`); shipped component prose names no Prism 2; `notes` and `anatomy.codeOnly`
are stripped from the plugin bundle. A plugin behavior change and a def-metadata change → MINOR. The
projected component surface does not move (names, summaries and prose are not plan data), and no token
name moves. CONTRACT STANDS.
0.144.0 — #1611: the component build's footprint check compares members across RUNTIME axes only and holds
AUTHORING axes fixed. New `ComponentDef.axisKinds` (`runtime | authoring`, absent = runtime) classifies every
def's axes, and every projected `AnatomyPlan` now carries `axisKinds` for its variant axes and state axis —
so every plan stamp moves. The cohort key (`planSetLayout` `group`, and the chunked payload's
`FOOTPRINT_VARIES`) gains each authoring axis: field-label's `weight`/`emphasis` (clearing NB's four
bold-vs-regular misses at `small`), button's and icon-button's `surface`, icon-button's `shape`, focus-ring's
`surface`. `appearance` stays runtime (compared). No member, name or binding moves; the projected surface
moves by the new plan field → ENGINE bump. CONTRACT STANDS (no token name moves).

0.143.0 — #1623 sign-off, component API alignment (owner-decided). text-field replaces its `error` prop
with select's `validation` + `validationMessage` (same names, same value set; the Figma `status` axis maps
to it). textarea takes text-field's model: `error` leaves `states` for a `status` axis with text-field's
values and status-led border keys, the placeholder binds `color.text.secondary`, and it gains the same
validation props. checkbox-group and radio-group bind a 0px inter-row gap (`space.0`) — the rows self-space
with their own block padding. Component members move (props, a new textarea axis, the group gap binding)
→ `schema/component-surface.json` re-accepted, MINOR. CONTRACT STANDS: every bound role already ships.
0.142.0 — #1631 (owner decision: "we should not remove dimension tokens"): at `density: 'spacious'` the
dimension grid is also fed the COMFORTABLE control px. `core.dimension` is value-keyed, and at
comfortable 3 (an `inset`) and 18 (a `thumb`) exist only because the control px put them there;
spacious's controls produce neither, so spacious removed two guaranteed primitives. Now it keeps them
(its grid only grows; no existing alias moves). Compact is left alone: it is a corpus density (aurora),
and feeding it would add `core.dimension.30` to aurora, a CONTRACT MINOR (measured). No committed brand
sets spacious, so `out/**` moves only its stamp. CONTRACT STANDS at 11.3.0 — the guaranteed surface
does not move, it stops being violated (`token-contract --check` level `none`).
0.141.0 — The `outlineInteraction` option `solid-tint` is relabeled "Tinted wash" (was "Opaque subtle tint"),
owner decision after #1614 made the tint translucent: the old label described the retired opaque palette step.
Label only — the option key, its values and every emitted token are unchanged. `schema/lever-manifest.json`
moves its label → MINOR. CONTRACT STANDS.
0.140.0 — #1614 (owner decision, revised + amended): `solid-tint` is the category's EXISTING fill at an EXISTING
opacity step. Each `[inverse.]interactive.<c>.subtle-fill.{hover,pressed,selected}` is now a translucent wash
(`ink-on-composite`) of `[inverse.]interactive.<c>.fill.rest` at `opacity.20` hover / `opacity.30` pressed+selected,
carrying `tint: { fill, opacity }`; it was an opaque palette step from a nominal table. The hover steps DOWN
the scale until its label clears its bar on the composite (nb-redesign page primary and nb-redesign/Aurora band
primary land on `opacity.10`); any state steps UP until visible (ΔE00 ≥ 2.3 — the subtle neutral, #1621); pressed
sits ≥ one step above hover; ONE step per role across every mode, because a Figma paint opacity cannot vary
by mode (`settleSolidTint`). Tree: the leaf's `$value` is the resolved translucent color and
`$extensions.prism3.tint` references the fill role and the `opacity.<n>` token; the Figma color collection
emits NO subtle-fill variable. Figma: `applyOutlineInteraction` binds the fill variable with a plan
`paintOpacity`, which both executors write and read back. No primitive and no opacity token is minted (PR
#1622's baked primitives were superseded). A value change under a lever no corpus brand sets (#1112) plus a
moved `@outline-solid-tint` component surface → MINOR. `out/**` moves only its stamp, and
`schema/lever-manifest.json` its lever description; CONTRACT STANDS (no guaranteed path moves).
0.139.0 — #1623 batch B: the `.ai.json` sidecar says only what the token data supports. The primitive
tier dispatches below `core.` (946 "core primitive" entries, `intent` on none); type styles' `resolves_to`
is the emitted composite `$value` and weight roles are keyed at `core.font.weight-role.*`;
`contrast_with.token` names the floor's ROLE instead of a bare palette step; every ink's surface claim
and `paired_with` list is computed per mode (no more "on any surface"); pairings that fail in some mode
are dropped (veil, inverse intent fills, non-rest fills); the inverse decoration remaps role names in
prose; the note and `*_fields` lists match what ships. Three new sidecar gate arms in `test.ts` read the
committed `out/*.ai.json` against `out/*.tokens.json`. Emitted `.ai.json` changes → MINOR bump. CONTRACT
STANDS: no token name moves (`token-contract --check`).
0.138.0 — #1623 batch A: token description prose is made true in every mode it is read in, and stripped of
internal references. (1) Per-mode prose: `tree.ts` now carries a mode's own `description` in
`modes.<mode>` when it differs from light's, and the DTCG overlays emit it as that leaf's `$description`
(a leaf whose value holds but whose prose moves — a raised HC minimum — now joins the overlay). Figma
variables, which share one description across modes, get one sentence whose varying claims name the other
modes' values: `4.5:1 (7:1 in high-contrast modes)`; the layout grid variables list their value per
breakpoint instead of showing xs's in every mode. Templates name the ground role (`background.secondary`)
rather than a mode's palette step, and inverse roles no longer call the band "dark". (2) The step-500
"mid-tone AA pivot (≥4.5:1 on white & black)" is measured, not stamped: nb `green.500` and wendys
`secondary.500` now state their measured pair. (3) Issue numbers, "KB §4", "Prism 2" and "Primer" are gone
from token prose, along with code-comment caps and the "consumer-facing type style" tail. New gate
`lint-description-claims.ts` recomputes every `N:1` / `N%` in emitted prose per mode. Emitted
`$description` prose moves in every brand's `out/**` → ENGINE bump. CONTRACT STANDS at 11.3.0 (no token
name moves; `token-contract --check` level `none`).
0.137.0 — #1623 batch C: stale facts in component-def prose corrected (retired ids `radio`/`switch`/
`checkbox` → their `-row` defs; `radio-row`'s `ai.avoidWhen` no longer says the radio group is unbuilt;
`focus-ring`'s `docs.do` names the `surface` axis, not the retired `color`; icon-button's small heights
restated from the tokens; wrong `alternativeTo`/`commonPartners`/`composesWith` entries; `'false'`
strings typed as booleans), issue numbers and file paths stripped from consumer-facing def fields, and
the studio Components page's absent-def reason and icon count unit corrected. `lint-us-english` gains an
`-isable` branch and a `judgement` word match. The plugin bundle's def strings move → ENGINE bump; no
emitted token or projected component member moves, so `out/**` is a stamp-only regen. CONTRACT STANDS.

0.136.0 — #1617: a per-mode override on an outline/text control's LABEL ink carries to its GLYPH ink.
`interactive.<c>.icon.<st>` (and the `inverse.` column) is minted as a value twin of `…text.<st>` (#1471),
but the override layer rewrote exactly one role, so an override on `text.rest` moved the label and left
the icon at the derived value (label near-black, icon grey on the owner's NB file). New `withIconTwins`
expands a `text.<st>` override onto its `icon.<st>` twin unless the icon carries its own explicit
override (explicit wins); the icon is re-rated against its own `against` and swept for warnings like any
override. `border` stays independent. A value-resolution behavior change under overrides → MINOR bump;
no corpus brand overrides these roles, so `out/**` is a stamp-only regen. CONTRACT STANDS — no name moves.
0.135.0 — #1613 (owner decision (a)): `solid-tint` emits the INVERSE twin of the opaque outline/text
tint, `inverse.interactive.<c>.subtle-fill.{hover,pressed,selected}`, so a `surface=inverse` button /
icon-button hover resolves instead of missing (48 misses on the owner's solid-tint NB file → 0). MIRRORED
from the page derivation in `modes.ts` (one `emitTints` per ground): the band's opposite-polarity
nominals and walk, the band's own state ink `inverse.interactive.<c>.text.*`, pressed/selected ungated by
the same #1281 predicate. The page family is byte-identical (every corpus brand × mode at solid-tint,
compared before/after). The #1608 held pattern is removed from both gates. NEW EMITTED ROLES under a
lever → MINOR. No corpus brand sets `solid-tint` (#1112), so `out/**` moves only its stamp; CONTRACT
STANDS at 11.3.0 (the guaranteed surface is read off the corpus).
0.134.0 — #1608: an outline/text control's hover fill binds the family the brand's `outlineInteraction`
EMITS. `button` ×3, `icon-button` ×3, `select` and `text-field` bound `interactive.<c>.overlay.*` (the
translucent wash) unconditionally, which the engine emits only at `overlay-neutral`; a `solid-tint` /
`none` brand built the button with 96 `container.fills` misses (the owner's NB file). New
`applyOutlineInteraction` — the third materialize-before-projection sibling of `applyControlShape` /
`applyWeightIntent`, reusing `modes.ts`'s `outlineFillRole` — rebinds the wash to
`interactive.<c>.subtle-fill.<state>` at `solid-tint` and drops it at `none`; the plugin's
`materializeForBrand` applies it off the resolved theme. `overlay-neutral` is the identity (same object),
so `out/**` and the plain component-surface rows do NOT move; the MINOR bump is owed by the new
brand-conditional PROJECTION behavior, pinned by `lint-component-surface`'s new `<id>@outline-solid-tint`
/ `<id>@outline-none` rows. HELD, not invented: there is no inverse `subtle-fill` twin, so a
`surface=inverse` member at `solid-tint` still misses (a design question on the PR). CONTRACT STANDS
at 11.3.0 — no token NAME moves. A stamp-only regen (`$extensions.generator.version`).
0.133.0 — #1587: OPT-IN PER-RUNG DESKTOP/MOBILE type-size override (owner-decided 2026-09-23, four
decisions locked on the issue: override-derived storage, brand-axis only, inline-in-the-size-table UI,
Desktop/Mobile naming). `TypographyInput` gains optional `sizeOverrides`, keyed group → rung →
`{ desktop?, mobile? }`, on the heading groups only (display/title/eyebrow). A rung with no entry is
fully clamp-derived — today's behaviour, byte-identical — so no corpus brand moves and this is a pure
INPUT-SURFACE + BEHAVIOUR addition. The whole hook is that a composite already carries BOTH endpoints
(`sizePx` desktop, `sizeMinPx` mobile) and the entire fluid pipeline (`tree.ts` → `figma.modes` →
`emit-figma-font` → the web clamp AND the paste path) reads them: the override just AUTHORS the endpoint
the derive used to own. `mobileEndpoint` becomes the default, not the only source. A NEW build-time
coherence throw (alongside the #328 per-mode-size validation) refuses an override that inverts a rung
(mobile > desktop), leaves the ladder, drops below the heading floor, or breaks the mobile ramp's
monotonicity — each failing BY NAME, mirroring #1368's face-pin refusals; and `lint-size-override-
coherence.ts` re-asserts the invariant over the corpus INDEPENDENTLY (reading the composite's own
emitted `sizeMinPx`/`sizePx`, never re-running `mobileEndpoint`) plus that an inverting input is
rejected. Emitted bytes move only when a brand actually overrides a rung, so the corpus regen is a
stamp-only restamp → ENGINE bump. CONTRACT STANDS at 11.3.0 — per-viewport values land in the EXISTING
`type-sets`/`font-fluid` mode variables (mobile and desktop are two MODES of one variable, not two
names), so no guaranteed token NAME appears; `token-contract --check` stays green with no CONTRACT bump.
0.132.0 — #1602/#1601: components resolve weight by INTENT against a brand's available roles, collapsing
the axis when the intents coincide (owner-decided 2026-09-23). A weight axis declares `regular`/`bold`
intents; `applyWeightIntent` (the `controlShape`-shaped materialize-before-projection) resolves them per
brand — `regular`→default, `bold`→the heaviest body role at/above default — so NB (`body: [default,
emphasis]`) binds `emphasis`, not a `strong` it never emits (#1601's silent 252 discards). A single-body-
weight brand DROPS the axis (24→12). The DEFAULT projection is byte-identical (field-label authors its
default-brand roles), so `out/**` and the plain component-surface rows do NOT move; the MINOR bump is
owed by the new brand-conditional PROJECTION behavior, enforced by `lint-component-surface`'s new
`<id>@<scenario>` rows (a def gaining a per-brand surface is a surface change). #1601's cross-check
(`test.ts`) pins every def's `type.*` ref to an emitted composite per corpus brand, mutation-proven.
CONTRACT STANDS at 11.3.0 — no token NAME moves (field-label binds the same `type.body.*` names; the
brand simply resolves which role at each). A stamp-only regen (`$extensions.generator.version`).
0.131.0 — #1597: Figma COLOR PALETTE variables emit SORTED BY NUMERIC KEY so each ramp's leading-zero
  sub-steps (`025`,`050`) sort with their magnitude instead of trailing `950`. The SAME JS key-iteration
  quirk #1594 fixed for the dimension `space` collection, but in the separate `emit-figma-color.ts`
  palette emitter: it walks the palette tree through the shared `leaves()` helper, which iterated child
  keys in `Object.keys` order — integer-like (`"100"`…`"950"`) first ascending, then leading-zero strings
  (`"025"`,`"050"`) in insertion order — so every chromatic ramp emitted `…, 900, 950, 025, 050`, putting
  the two lightest tints at the BOTTOM of the Figma variables panel. Fix: a local `byNumericKey` mirror of
  #1594's helper (the colour/dimension emitters are deliberately separate modules, so each carries its own
  copy) plus an optional `orderKeys` param on `leaves` (defaults to identity — byte-identical for every
  other caller); the palette emit passes `byNumericKey`, so each ramp's steps emit `025, 050, 100, …, 950`.
  STABLE no-op for non-leading-zero groups: ramp names (`red`, `black-alpha`) and semantic keys
  (`background`) `parseFloat` to NaN and compare equal, and alpha steps (`5`,`10`…`90`) are already
  integer-like ascending — so ONLY the chromatic ramps with `025`/`050` reorder. Every brand's
  `out/figma/<brand>/core.palette.json` reorders (nb · aurora · wendys) → ENGINE bump. ORDER ONLY — no
  colour value, name, scope or alias moves; each `core.palette.json`'s variable set is byte-identical as a
  set. GATE (test.ts, docs/34): a hand-authored numeric ramp literal (NOT derived from `Object.keys`, the
  side under test) asserts the emitted palette ramp order; reverting the palette emit to raw `Object.keys`
  order fails it BY NAME. CONTRACT STANDS at 11.3.0 — ordering is not a token NAME or `$type`
  (`token-contract --check` level `none`; `--accept` refreshes only the informational `engineVersion`
  stamp). Caveat (state in PR): this fixes CREATION order, so FRESH builds get numeric order; an existing
  file's already-created variables keep their order (idempotent find-by-name apply doesn't reorder).

0.130.0 — #1593: per-breakpoint GUTTER + MARGIN OVERRIDES for the layout grid (owner-decided
2026-09-23, building New Balance). `buildLayout` gained `layout.gutterOverrides` / `layout.marginOverrides`
(keyed by breakpoint name, mirroring #1532's `columnOverrides`): a set entry wins over the `GUTTER_PX` /
`MARGIN_PX` ladder for that breakpoint, an unset one keeps the ladder. UNLIKE columns (rounded + clamped),
a gutter/margin override is validated ON-LADDER and THROWS off-ladder by name (`resolveGap`): gutter and
margin emit as ALIASES to `space/*` (`grid/gutter`·`grid/margin`, `emit-figma-dims.ts` + `tree.ts`'s
`gridSpaceAlias`), so a value MUST be a real spacing step or the alias would have no space token to point
at — snap-to-ladder was the owner's chosen shape for exactly that reason. The scale reaches down to
`space/050`=4px (and `025`=2px, `0`), which is the concrete NB use the feature unlocks: a 4px mobile
gutter, reachable instead of flooring at the derived 16px. NO EMITTER CHANGE — the Figma grid-style
emitter (#1480), the layout float-variable emitter and the DTCG grid node all already read
`theme.layout.grid`, so an override flows to the emitted per-breakpoint Grid Style value and the
`grid/gutter`·`grid/margin` alias with no downstream change (a custom 4px gutter aliases `space/050`
automatically). STUDIO: the Layout page's per-breakpoint grid table replaces the read-only gutter/margin
cells with a select of spacing steps (Auto = the derived ladder), the full ladder down to 4px. The plugin
runs the studio control UI verbatim, so it inherits the editor with no plugin change. No corpus brand sets
an override, so every emitted grid VALUE is BYTE-IDENTICAL; `out/**` moves only its
`$extensions.generator.version` stamp (`lint-emission-version` 0 artifacts). GATE (test.ts, docs/34): a
custom per-breakpoint gutter lands in the EMITTED grid AND aliases the right `space/*`, an unset
breakpoint keeps the ladder, and an OFF-LADDER override THROWS — EXPECTED hand-authored from the
documented ladder + snap rule, ACTUAL read from the emitted grid styles / DTCG. BY-NAME MUTATIONS: make
`buildLayout` ignore the gutter override (`resolveGap(...)` → the ladder value) → the "custom gutter lands
+ aliases" arm fails by name; drop `resolveGap`'s on-ladder guard (return the raw px) → the "off-ladder
throws" arm fails by name. CONTRACT STANDS at 11.3.0 — an override is a value/structure knob; gutter and
margin already emit as `grid/gutter`·`grid/margin` variables + grid-style values, so no guaranteed token
NAME is added (`token-contract --check` level `none`, stamp-only `--accept`).
0.129.0 — #1594: Figma dimension variables emit SORTED BY NUMERIC KEY so leading-zero sub-steps sort with
  their magnitude. JS object-key iteration emits integer-like keys (`"0"`…`"1200"`) first ascending, then
  leading-zero string keys (`"025"`,`"050"`,`"075"`) in insertion order — so `space`'s sub-steps landed
  AFTER `1200` in the emitted (hence Figma-created) order, reading as "missing" until you scroll. A single
  pure helper (`byNumericKey`, `emit-figma-dims.ts`) reorders each dimension `Object.keys` site by the key's
  numeric value; it is a STABLE no-op for named collections (t-shirt/rung keys `parseFloat` to NaN and
  compare equal), so of every dimension collection only `space` moves — `size` uses t-shirt keys and does
  NOT mis-order (the issue's `size 050/075` premise did not hold against the corpus; see the PR/progress).
  Every brand's `out/figma/<brand>/space.json` reorders (nb · aurora · wendys) → ENGINE bump. ORDER ONLY — no
  token value, name, scope or alias moves; each `space.json`'s variable set is byte-identical as a set.
  CONTRACT STANDS at 11.3.0 — ordering is not a token NAME or `$type` (`token-contract --check` level
  `none`; `--accept` refreshes only the informational `engineVersion` stamp). Caveat (state in PR): this
  fixes CREATION order, so FRESH builds get numeric order; an existing file's already-created variables keep
  their order (idempotent find-by-name apply doesn't reorder). The color palette ramps (`core.palette`,
  `emit-figma-color.ts`) mis-order the same way — out of scope here, filed as #1597.

0.128.0 — #1575: field-message shows ONE shared caption, not four (owner-decided Option 2). The #1567
live-host work proved #1474's four distinct per-status captions and #1018's single set-level `Message`
TEXT property are mutually exclusive on the real host: a characters-bound TEXT node is a VIEW onto the
property's one `defaultValue`, so every member displays the same string, and a per-member write only
reaches the last member written. Given the choice (drop the property for four literal captions, or keep
the property and share one), the owner KEPT the property — `figmaProperties.texts.message.byVariant` is
REMOVED, so the projection writes the single `default` ("This is a status message.") to all four
members. The members stay distinct by GLYPH + ink per status; only the caption STRING is shared. This
moves the PROJECTED component surface (the field-message member plans lose their per-status text) with NO
`out/**` change — component payloads are not committed, so `lint-emission-version` sees 0 artifacts and
only `lint-component-surface` catches it (#1252): ENGINE bump 0.127.0 → 0.128.0, baseline re-accepted.
CONTRACT STANDS at 11.3.0 — no token NAME or `$type` moves (a caption scaffold is not a token;
`token-contract --check` level `none`).

0.127.0 — #1496: the `linkPalette` LEVER (owner-decided 2026-09-17). Links were
hard-wired to the action palette (`linkBase = chromatic(r2p.action, …)` in `modes.ts`); a brand could not
give links a different colour without moving all interactive colour. `linkPalette` (control `palette-ref`,
mirroring `actionPalette`) points links at `primary`, `neutral`, or a `brandColors` entry INDEPENDENTLY.
`theme.ts` resolves it to a concrete palette name (`input.linkPalette ?? actionPalette`) plus a
`linkAnchorStep` computed exactly like the action's, and `modes.ts` derives `linkBase` + the state walks
from it. FOUR owner-confirmed properties: (1) DEFAULT = FOLLOW ACTION — an unset lever resolves to the
action palette and the anchor path is the action's own, so the emitted `link.*` COLOUR families are
byte-identical to pre-#1496 for every corpus brand (`regen --check` moves 0 corpus token VALUES,
`nb-regression` clean). The ENGINE bump 0.126.0 → 0.127.0 is NOT for a colour move — it is for the
emitted `schema/lever-manifest.json`, which GAINS the `linkPalette` entry and so is a moved emission vs
base. Adding a lever cannot leave the manifest byte-identical, and `lint-emission-version` compares the
emission against origin/main, not just the corpus token trees — so principle 5 requires the bump and
regen restamps every artifact's `$extensions.generator.version` to 0.127.0 (the earlier draft's "no
bump, byte-identical" reasoning read the corpus trees but overlooked the manifest — CI caught it).
(2) NEUTRAL a11y = WARN, NOT FORCE — when the resolved link ink is not COLOUR-distinct from body text
(`text.primary`, drawn from the neutral ramp), `theme.notes` flags that links must be underlined for WCAG
1.4.1 (Use of Color), pairing with `typography.links`; distinctness is measured HUE+CHROMA only (ΔE00 of
the link vs neutral ramp at a shared mid step, lightness factored out — a link differing from body text
only in lightness is the exact 1.4.1 failure). No auto-underline, no block. (3) TARGETS primary / neutral
/ custom — `neutral` is addressable (the studio Link-palette picker offers it, unlike actionPalette's).
(4) THE FLOOR ALWAYS HOLDS — the link ink is still rated up to `linkGuard` at the profile `semanticMin`
whatever the palette (#1510 unchanged). STUDIO: a Link-palette lead on the Links section + the inline
underline warning (reads the engine's own note). GATE: `test.ts` L-07 authors EXPECTED from the palette
the lever names (docs/34) — neutral/custom resolve off the named ramp, default off the action ramp
(lever absence inert), the warning fires for neutral / a near-grey custom and stays silent for a distinct
one (self-checked with the gate's own ΔE), and a low-contrast custom is still rated to the 4.5:1 floor.
BY-NAME MUTATIONS: repoint `linkBase`/the walks back to `r2p.action` → L-07's resolution arm fails by
name; delete the WCAG note push → L-07's warning-fires arm fails by name. MCP `tools/list` kept < 60,000
by compressing the sibling interactive-colour schema descriptions (#1368 precedent). CONTRACT STANDS at
11.3.0 — the link role NAMES are unchanged; only their resolved VALUES move, and only for brands that
opt in (`token-contract --check` level `none`).

0.126.0 — #1532: per-breakpoint COLUMN OVERRIDES for the layout grid. `buildLayout` gained
`layout.columnOverrides` (keyed by breakpoint name): a set entry wins over the 4/8/…/base ladder for
that breakpoint, an unset one keeps the ladder, and every value is rounded + CLAMPED to the base
`columns` bound [4, 24] so an out-of-range override emits a bounded grid, never a degenerate one. The
Figma grid-style emitter (#1480) and the layout float-variable emitter both already read
`theme.layout.grid`, so an override flows to the emitted per-breakpoint Grid Style / `layout.<bp>`
count with no emitter change. The studio Layout page surfaces the resolved per-breakpoint
columns/gutter/margin as a readout sourced from `theme.layout.grid` (the same derivation the emitter
reads, so it cannot drift from what ships) and makes columns editable per breakpoint. No corpus brand
sets an override, so every emitted grid VALUE is byte-identical; the emitted `out/**` moves only its
`$extensions.generator.version` stamp. CONTRACT STANDS at 11.3.0 — an override is a value/structure
knob, adds no guaranteed token NAME (`token-contract --check` level `none`).

0.125.0 — #1510: the link role becomes independently customizable on TWO axes — a global rung lever AND
a per-mode ABSOLUTE override, all four families editable. #1486 shipped the link state walk as a tuned
constant with the lever deferred; #1487 surfaced it read-only. This PR (superseding #1531) lands both.
(1) GLOBAL RUNG LEVER `linkStateRungs` (from #1531): a brand pins how far each engaged state (hover /
pressed / visited) steps from the resting link, as a RUNG COUNT walked the same floor-clearing way
`plainLink` is (along each ground's own `dir`), so it composes across all four `link.*` families and both
mode families and is floor-clamped. A rung COUNT, not a global absolute step, because a link's engagement
direction flips between the page and the inverse band. (2) PER-MODE ABSOLUTE OVERRIDES (owner-decided
2026-09-19): a brand pins an EXACT link color for a specific mode via the SAME per-mode `overrides` map
the Foreground/Text editor uses; the absolute value WINS over the rung/derived default (the override
layer runs after derivation). The load-bearing addition is the LINK FLOOR GUARD in `modes.ts`: the
general override layer WARNS-not-blocks (a hand-tuned foreground ink may dip by choice), but a LINK
override that fails its floor is CLAMPED — walked along the ramp to the nearest step clearing its own
`min`, in the ground-facing direction — so a user's absolute link color can never render below contract
(`text.link.*` at 4.5:1, `icon.link.*` at its icon floor). Scope: customizable modes (light/dark/custom),
as every per-mode override is (hc-* are derived). (3) STUDIO: the Links section makes ALL FOUR families
independently editable — each family's resting-link picker pins a per-mode absolute color (re-anchoring
its engaged states by their derived signed step-distance), and the page-text rung pickers keep the global
cross-mode default. NO corpus brand sets any of this, so every emitted VALUE is byte-identical — the
ENGINE bump is the derivation gaining the link-override guard + the `$extensions.generator.version`
restamp (`lint-emission-version`). CONTRACT STANDS at 11.3.0: the link state NAMES
(`color.text.link.{default,hover,pressed,visited,focused}` + icon / inverse twins) are unchanged — VALUES
only, no guaranteed path added/removed/retyped, `token-contract --check` level `none` (stamp-only
`--accept`). Gate L-05 (rung lever, from #1531) STANDS; NEW gate L-06 (test.ts, docs/34): a per-mode
absolute override lands the EXACT pinned step in that mode while the other mode keeps the derived value,
for a PAGE and an INVERSE family independently, and a sub-floor pick is clamped to clear 4.5:1 — EXPECTED
authored in the gate, grounds read off each role's own `against`, no engine link derivation imported.
BY-NAME MUTATIONS: (a) drop the override application → L-06's MOVE arm fails by name (the mode lands the
derived value, not the pinned step); (b) remove the link floor guard → L-06's GUARD arm fails by name
(emitted 1.08:1, the raw sub-floor step). No new lever/field, so the MCP `tools/list` 60k ceiling is
untouched (#1531's `linkStateRungs` block stands; the absolute override reuses the existing `overrides`).
0.124.0 — #1519: ICON-SWAP SITS DIRECTLY UNDER ITS PRESENCE BOOLEAN in the Figma panel (owner-directed,
owner QA 2026-09-18). `planSetProperties` no longer groups all booleans then all swaps; it now pairs each
icon swap DIRECTLY after the boolean that gates it, so the panel reads `leading icon` → `↳ swap leading
icon` → `trailing icon` → `↳ swap trailing icon` rather than the two toggles then the two swaps detached.
A swap pairs to a boolean when ONE glyph node carries both the visibility boolean (`visibleProp`) and the
content swap (`propertyRef.mainComponent`), which is select's and text-field's leading/trailing glyphs.
AFFECTED DEFS: `select` (`value` → `leading icon` → `↳ swap leading icon` → `message`) and `text-field`
(`value` → `leading icon` → `↳ swap leading icon` → `trailing icon` → `↳ swap trailing icon` → `message`).
NOT AFFECTED: `button` (×3 families) and `icon-button` (×3) — button's leading/trailing presence toggles
are VARIANT switches, not boolean component properties (#1331/#1379 keeps them variant because edge-hugging
presence changes container geometry a boolean cannot reach), and icon-button's icon is required (no boolean),
so neither has a boolean HERE to pair against and their component-property order is byte-identical to before.
For button the panel nesting of the swap beneath its switch is Figma's own render off the `↳ ` name prefix,
unchanged. GATE (docs/34): `test:roundtrip`'s #1380 panel-order oracle is updated to the new boolean→swap-
paired order for `select` and gains a `text-field` entry (both authored in the gate, not derived from
`planSetProperties`); the button/icon-button oracles are unchanged. BY-NAME MUTATION: reorder
`planSetProperties` back to the old all-booleans-then-all-swaps grouping → the #1380/#1519 order assertion
fails BY NAME naming the def and the wrong order (the swap lands after `message` instead of under its
boolean). The #1331 `iLi < iSwap` assertion in `test.ts` still holds (boolean stays immediately above its
swap). A projected-surface (property ORDER) change on two defs → ENGINE bump; `schema/component-surface.json`
is re-`--accept`ed after this forward bump if the plan/member digests move (property order is part of the set
plan). CONTRACT STANDS at 11.3.0 — property ORDER is not a guaranteed token NAME; `token-contract --check`
level `none`, stamp-only. `out/**` restamps only `$extensions.generator.version`.
0.123.0 — #1518: TWO text-field fixes, mirrored onto select (both owner-directed, owner QA 2026-09-18).
(1) DEFAULT WIDTH 320 (select parity). text-field's `control` gains `minWidth: 320` — the same responsive
width floor select carries (#1345: reads at 320, flexes above), a LITERAL not a token so no name moves. This
settles the width floor #1494/#1503 deferred ("a follow-up if one is wanted"); the owner set it at 320.
ONLY the control floor is in scope — the nested label/message `crossAxisFill` (the other half of #1503's held
text-field follow-up) is NOT applied here, so the parts still hug narrower than the 320 control (tracked, see
text-field.notes.unverified + the PR body). (2) PLACEHOLDER INK vs VALUE INK. Both text-field and select
re-point `label.empty` from `color.field.placeholder` to `color.text.secondary` (the muted body ink), keeping
the bare `label` at `color.text.primary` (full contrast): the empty-vs-value polarity now reaches the SAME two
shared text roles rather than a field-scoped placeholder role. Both roles already ship (no new guaranteed NAME).
Neither `label.empty` key is axis-value-led, so `lint-paint` arm 1 says nothing about it and no provenance
exception is added (a same-family re-point). GATE (docs/34): `test:roundtrip` gains a #1518 host-truth block
reading text-field's control `minWidth` back off the offline host (oracle 320 authored in the gate, mirroring
the #1503 group-root minWidth block); `test.ts` pins each def's value ink → `text.primary` and placeholder ink
→ `text.secondary` by name. TWO by-name mutations verified: (a) drop the 320 → the roundtrip minWidth assertion
fails by name; (b) repoint `label.empty` → `text.primary` → the ink assertion fails by name. A projected-surface
(minWidth) + paint (placeholder variable) change on two defs → ENGINE bump; `schema/component-surface.json` and
`schema/paint-census.json` are `--accept`ed after this forward bump (plans + placeholder grid move; member
counts hold — text-field 20 / select 16). CONTRACT STANDS at 11.3.0 (no token NAME moves; `token-contract
--check` level `none`, stamp-only). `out/**` restamps only `$extensions.generator.version`.
0.122.0 — #1503: PROJECT CROSS-AXIS CHILD FILL (`layoutAlign: 'STRETCH'`), the missing twin of `wrap`'s
main-axis `layoutGrow`. The auto-layout audit (#1475) found every column-stacked form component hugs its
width with children that do NOT fill it, where Prism 2 gives a fixed-320 root with rows / inputs set to
`layoutSizingHorizontal: FILL`; the owner decided Option B (follow Prism 2). Two engine gaps closed: a new
`PartDef.crossAxisFill` (→ plan `layoutAlign: 'STRETCH'`, Figma's only non-deprecated per-child cross-axis
stretch), applied to the child BY ITS PARENT in both executors' child loops so it reaches a nested INSTANCE
`claimDefaults` returns early on; and the "root width affordance" via the existing `minWidth` literal (320,
the `select` #1345 precedent — reads at 320, flexes above, no bound token). Landed on `checkbox-group`
FIRST (container `minWidth: 320`, three rows `crossAxisFill`), then `radio-group` mirrors it verbatim so the
two match by SHARING one resolution (#1475), then `select` (label + message fill the already-320-floored
control). `anatomy-readback.ts` classifies `layoutAlign`; `test:roundtrip` gains a #1503 host-truth block
asserting each part reads back `layoutAlign: STRETCH` and each group root `minWidth: 320`, with a docs/34
by-name mutation (drop `crossAxisFill` → reads `INHERIT`, fails by name). A projected auto-layout change on
several components → ENGINE bump; the surface + paint-census baselines are `--accept`ed after this forward
bump. CONTRACT STANDS at 11.3.0 — `layoutAlign` is a component layout fact, not a guaranteed DTCG token PATH
(`token-contract --check` level `none`, stamp-only), and 320 mints no token name. HELD for the owner (see
the PR body): text-field's width FLOOR (#1494 deferred it — the "exact fixed width per component" decision)
and field-message's cross-axis ALIGNMENT (MIN vs CENTER, flagged by the audit as an owner design call; its
caption fill is main-axis anyway) — the capability is ready for both the moment those are settled.
0.121.0 — #1520: the fluid `type-sets` variable collection now emits DESKTOP as its first (default) mode,
flipping `FONT_FLUID_MODES` from `['mobile','desktop']` to `['desktop','mobile']`. Figma treats a
collection's first mode as its default, so every text style whose `fontSize` binds a `type-sets` variable
resolved to its MOBILE value until the viewer switched — which is what made display type look capped at the
~48px mobile hero band. Owner's call (QA 2026-09-18): start desktop-first and have users switch to mobile.
The per-mode value is keyed by mode NAME (`value: mode === 'mobile' ? …`), not array index, so the order
flips the DEFAULT without moving any emitted value; the mirror copy in `materialise-to-figma.ts` (paste-path
file reader) flips too, and `test.ts` asserts the plan's mode order BY NAME (`desktop,mobile`). The
per-mode `type-sets.<mode>.json` files keep identical names/values, so the only `out/**` churn is this
file's own `$extensions.generator.version` re-stamp; the plan/plugin behavior (default mode) is where the
change is observable. CONTRACT STANDS at 11.0.0 — mode order is not a guaranteed token name
(`token-contract --check` level `none`).
0.120.0 — #1517: STATUS-LED BORDER for `warning` and `success` in `text-field` + `select` (owner-directed,
Prism 2 parity). Until now only `error` swapped the field border (`error.border.{state}` → `color.border.
danger`) while `warning`/`success` were message-only. This extends the status-led, border-ONLY swap to the
other two non-default statuses, mirroring `error` per non-disabled state: `warning.border.{state}` →
`color.border.warning`, `success.border.{state}` → `color.border.success` (text-field's five states rest /
hover / focus-visible / read-only / empty; select's four rest / hover / focus-visible / empty). The field now
signals status on BOTH the border and the nested field-message. NO NEW TOKEN NAME: `color.border.warning` /
`color.border.success` already ship for every brand (the `SEMANTICS` border ladder in `modes.ts`, the same
roles the message reaches for `text.warning`/`text.success`), so CONTRACT STANDS at 11.3.0 (`token-contract
--check` level `none`, stamp-only). Projected-surface + paint change (the warning/success members gain a
border binding) → ENGINE bump: `lint-component-surface` re-`--accept`ed (member plans move) and `lint-paint`
census re-`--accept`ed (the paint grids gain the new keys). `lint-paint` PROVENANCE_EXCEPTIONS is NOT extended
— `warning.border.*` → `color.border.warning` and `success.border.*` → `color.border.success` are SAME-family
(the ref carries the axis value as a segment), so arm 1's normal rule covers them and a per-key exception
would be flagged as stale (line 506-507); only `error` → `danger` (cross-vocabulary) keeps its exception. No
committed `out/**` VALUE moves (component payloads are not committed; the def binds existing roles), so
`regen --check` moves only each artifact's generator stamp. MUTATION (docs/34): repointing `warning.border.rest`
from `color.border.warning` to `color.border.success` (a role that RESOLVES) fails `lint-paint.ts` arm 1 BY
NAME (`status='warning' is absent from 'color.border.success'`) and arm 2 (the `select`/`text-field` paint
hash moves); restored.
0.119.0 — #1515: `image-placeholder` declares `footprintVaries: ['ratio']`, clearing two false footprint
misses. Owner QA read the projected set back with two misses — `ratio=4:3 measures 720×540 but ratio=1:1
measures 720×720 (same)` and the 16:9 twin — because the footprint cohort compared members expecting equal
size while the `ratio` axis (1:1/4:3/16:9) LEGITIMATELY changes the frame's height through its aspect lock.
The exemption is the field-message/#1010 mechanism (`footprintVaries` threads into `planSetLayout`'s cohort
key so each ratio becomes its own cohort), but the REASON it validates is new: the frame derives its
`aspectRatio` lock from the axis, not a `presentWhen`-gated part. So the schema's footprint-exemption check
gains a second legitimate mover — an axis some box's `aspectRatio` is derived from — beside the existing
`presentWhen` one; an axis that does NEITHER is still a blanket and still refused (mutation-proven by name:
strip the frame's lock and `ratio` is rejected). A projected-component-surface change (#1252 case) → ENGINE
bump; the projected member GEOMETRY moves (`schema/component-surface.json` per-member footprint), so that
baseline regenerates and is `--accept`ed. No emitted `out/**` VALUE moves — committed trees restamp only
`$extensions.generator.version`. CONTRACT STANDS at 11.3.0 — `ratio` is a component-structure property, not
a token name or React prop, so no guaranteed name moves (`token-contract --check` level `none`).

0.118.0 — #1469: ADD `radio-group`, the single-select twin of `checkbox-group`. `radio` had no group
("Radio Group: None available" in the QA build status); the owner directed adding it during QA. It is a
`field-label` above a vertical stack of `radio-row`s, composing the ALREADY-COLLAPSED Row (size-only since
#1348) so it inherits the Row's collapse rather than the atom's 36-member explosion — the same four-deep
nest chain (`focus-ring` ← `radio-control` ← `radio-row` ← `radio-group`) `checkbox-group` has. Its
auto-layout mirrors `checkbox-group` PART-FOR-PART per the #1475/PR#1504 audit (VERTICAL root, `pad-y`
`space.100`/8, `pad-x` `space.0`/0, the provisional `size.{size}.gap` inter-row gap, a secondary·bold
·required-on nested `field-label` size-followed, three `nest-fixed` rows), which Prism 2's
`radio-button-group.json` confirms is byte-for-byte `checkbox-group.json`. The ONLY deltas are what radio's
single-select semantics FORCE (not design): a SCALAR `value`/`defaultValue`/`onChange` (exactly-one, where
checkbox owns an array), `role="radiogroup"`, a single tab stop with roving tabindex, the load-bearing
shared `name` that enforces exclusivity, and no select-all (a multi-select affordance that does not apply).
The stale `radio-group` FORWARD-REFERENCE alias is removed from `radio-row` (the group now exists as its
own def). A new projected component-set NAME → ENGINE bump + `lint-component-surface`; radio-group is added
to the size-axis / hit-target / rung-names / standalone-floor registers (docs/34 scope floors). No emitted
`out/**` VALUE moves (the group paints nothing and adds no token); the surface + paint-census baselines are
`--accept`ed after this forward bump. CONTRACT STANDS at 11.3.0 — a component-set name is not a guaranteed
DTCG token PATH (`token-contract --check` level `none`, stamp-only), exactly as the #1347 checkbox-group
add did. OPEN OWNER DECISION carried unchanged from `checkbox-group`: the group hugs its width and its rows
do not fill it (the projection cannot emit cross-axis child FILL — #1503); `radio-group` copies that model
deliberately so the two match by sharing one resolution, per #1475's guidance.

0.117.0 — #1474: the `field-message` per-status text DEFAULTS become four DISTINCT scaffold strings so a
reviewer seeing the projected set can tell the statuses apart. Owner-directed from QA, and the copy is
owner-CHOSEN (Set A): default "This is a standard message." / error "Something needs fixing." / warning
"Double-check this." / success "All set." (was #1434's single "This is a standard message." rendered
across all four members). Still generic illustrative scaffold (voice-standard §1 recessive), never a
real product's rule — the placeholder a designer replaces. The #1018 per-member mechanism
(`byVariant.status`) is unchanged; only the four strings move. The projected component surface moves
(member text defaults) → ENGINE bump; `lint-component-surface` sees it via the plan digest
(#1252/#1434/#1470 shape), and `test-write-components` pins the four caption strings at the built node.
CONTRACT STANDS at 11.3.0 — a copy default is neither a token name nor a prop (`token-contract --check`
level `none`, stamp-only sync). The US-English + voice gates cover the new strings.

0.116.0 — #1468: the selection-control ROW composites are renamed to the `checkbox-row` convention —
`radio` → `radio-row` and `switch` → `switch-row`. Owner-decided during QA (2026-09-17): viewed side by
side, the bare `radio`/`switch` row ids read as an accidental divergence from `checkbox-row`, so the
`-row` suffix is made uniform. The atoms (`radio-control` / `switch-control`) are UNCHANGED, and the row
still nests its control exactly as before (nest-exposed, exposing selection/state, following size) — only
the composite id + component-set name move (`Radio` → `Radio.Row`, `Switch` → `Switch.Row`, matching
`Checkbox.Row`). The pre-#1468 bare ids are retained as `aliases` (the `checkbox-row` precedent). This is a
COMPONENT-SURFACE rename (the projected Figma component-set name), which is ENGINE-tracked (this bump +
`lint-component-surface`), NOT token-contract-tracked: no component id lives in the guaranteed token-NAME
surface (docs/30, #1252/#1347). CONTRACT STANDS at 11.3.0 — `token-contract --check` reports level `none`
(no token path added, removed or retyped). Every register/gate that named the old row ids moves with them
(`lint-axis-values`, `lint-standalone-floor`, `lint-rung-names`, `lint-hit-target`, `test.ts`,
`test-roundtrip.ts`, the skill root-part list, and the sibling defs' `composition` cross-refs).

0.115.0 — #1470: the `switch` default label placeholder becomes "Switch label" (was "Toggle label",
set by #1434). Owner-directed during QA: the placeholder names the component itself, matching the
`Checkbox label` / `Radio option` scaffolding on the sibling selection controls. Still generic
illustrative scaffold, not a realistic setting name (#1434's stance, reversing #798), so the
recessive attribute (voice-standard §1) holds — this only reverses #1434's specific wording. One
string in `components/switch.ts`; the projected component surface + emitted prose move (member text
default) → ENGINE bump. CONTRACT STANDS at 11.3.0 — a label default is neither a token name nor a
prop, so no guaranteed name moves. The US-English + voice gates cover the new string.

0.114.0 — #1494: TextField PROJECTS into Figma. It had an `anatomy` block only in `composition` (naming
its parts) and no `figmaProperties`, so it reached no Figma member; this gives it the full select shape —
a root column composing the nested `field-label` (nest-exposed) and `field-message` (nest-fixed, following
`status`) around a bordered input `control`, plus a projected surface of status(4) × state(5) = 20
members. Three owner-decided moves: (1) VALIDATION IS THE `status` AXIS — `[default,error,warning,success]`
aligned to field-message, so `error` LEFT `states` (it co-occurs with the interactive states rather than
replacing one) and the paint grammar became select's status-led `['{status}.{slot}.{state}',
'{slot}.{state}', '{slot}']`; the state-led `border.error` became status-led `error.border.{state}` bound
per non-disabled state → `color.border.danger` (border-only swap; warning/success message-only). (2)
read-only IS PROJECTED — the distinctive field state select lacks. (3) a TRAILING AFFIX slot
(`trailingVisual`, a presence boolean + swap) for the clear/reveal edge control select has no equivalent of;
Figma projects only its glyph, the interaction is code-only. `size`/`style`/`pending`/`empty` are admitted
OUT in `anatomy.codeOnly`. A projected-component-surface change (#1252 case) → ENGINE bump; no emitted
`out/**` value moves, so committed artifacts move only their version stamp. CONTRACT STANDS at 11.2.0:
TextField composes existing field tokens and adds NO new guaranteed token NAME (`token-contract --check`
level `none`; stamp-only `--accept` to sync the baseline's `engineVersion`). Baselines regenerated and
`--accept`ed: `schema/component-surface.json` (TextField gains 20 projected members) and
`schema/paint-census.json` (TextField enters the census — a `set` + a wider `grid`). Gate discipline:
arm 1 (provenance) gains five `text-field|error.border.*` exceptions (status `error` → `danger` role);
mutation-confirmed by name against `lint-paint` (see the progress entry).

0.113.0 — #1486: link interactive states made perceptible, and a `pressed` link state added. The engaged
link states used to step the action ramp a FIXED 1 rung (hover) / 2 rungs (visited) off the base, which is
barely a perceptual step and imperceptible where a saturated link is pinned near the ramp extreme (a brand
red must clear 4.5:1 AS TEXT, which lands it deep). The states now walk to a PERCEPTUAL interval instead: a
`LINK_STATE_DE` (CIEDE2000) tuned constant (7.0) makes each engaged state ≥ that Δ from the one before, so
`walk` consumes more rungs near a compressed extreme and hover/pressed/visited stay clearly distinct
(~ΔL* 8–12). Depth order default → hover → pressed → visited; `focused` stays a colour no-op. The new
`pressed` leaf lands on all four twins (`text`/`icon` link × page/inverse). Emitted link-state VALUES move
in every brand (nb hover 600→650, visited 650→850, plus the new pressed) → ENGINE bump. CONTRACT bumps
MINOR (11.2.0 → 11.3.0): `link.pressed` adds 4 guaranteed names (text/icon × page/inverse); the value
moves carry no contract. NB's engaged link states now diverge from its hand-authored export (recorded in
`NB_KNOWN_DIVERGENCES`, same owner stance as the relaxed fills: "NB's conservatism is a regression target,
not a reason to keep the bar"); `link/default` is unchanged and still byte-checked.

0.112.0 — #1480: emit reusable Figma GRID STYLES, one per breakpoint. Layout was emitted as FLOAT
variables only (the `layout` collection: grid/columns, grid/gutter, grid/margin, container/*,
breakpoint/*); a number cannot BECOME a live Figma column grid (Figma has no variable→layout-grid
binding), so a designer got the numbers and no applicable grid. This adds a new emitted STYLE surface:
`buildFigmaGridStyles` (emit-figma-styles.ts) → a `grid-styles.json` artifact per brand, one
`Grid / <bp>` COLUMNS/STRETCH grid style per breakpoint, sourced from the SAME layout data
(columns/gutter/margin). A plugin executor (`apps/plugin/src/write-grid-styles.ts`, sibling of
write-text-styles.ts) materialises them via `figma.createGridStyle()`, wired into the apply path.
Figma grid styles are STATIC (they can't mode-switch off a variable), so N breakpoints = N separate
styles, coexisting with the numeric `layout` variable collection — two representations of one dataset,
the variables staying the responsive source of truth. `out/**` GROWS by one artifact per brand (3 new
files, EXPECTED_ARTIFACTS 108 → 111) → ENGINE bump. CONTRACT STANDS at 11.2.0: a grid style is a Figma
STYLE, not a token name — `buildContract` reads DTCG token trees and never sees it, so no guaranteed
name moves (`token-contract --check` level `none`; stamp-only `--accept` to sync the baseline's
`engineVersion` field). Gate: `test.ts` #1480 asserts each breakpoint emits a COLUMNS/STRETCH grid
style with the right count/gutter/margin, expected values hand-authored from theme.ts's layout
contract (docs/34 shape 1), mutation-proven by name.

0.111.0 — #1484: `foreground.*` Figma variable scopes drop `TEXT_FILL`. The `foreground` semantic
family are on-color SURFACE/fill colours — the ground painted UNDER on-color content — not ink, so
carrying a `TEXT_FILL` wrongly offered them in Figma's text-fill picker. They now scope like their
surface twins `background`/`scrim`/`veil` (FRAME_FILL + SHAPE_FILL), and `text.*` remains the only
top-level color family that scopes as `TEXT_FILL`. Only the emitted `scopes` metadata on the
`color/foreground/*` variables changes across every brand's `out/figma/**` — no token value, no
name, no projected component member moves — so this restamps `out/**` and moves those scope arrays.
A new by-name gate (`test.ts` (e4)) pins the top-level `COLOR_SCOPES` role-families so a family
cannot silently regain the wrong scope; mutating `foreground` back to text-fill fails it by name.
CONTRACT STANDS at 11.2.0 — a Figma scope is emitted metadata, not a guaranteed token name
(`token-contract --check` level `none`).

0.110.0 — #1485: BIND the text-style cut (weight/style) to a STRING variable, so a WIDTH cut like ITC
Garamond Std *Light Condensed* is bindable and themeable in Figma — the numeric weight axis can never
reach a width. A Figma Text Style has ONE weight/style control; the engine used to bind it via the
FLOAT weight-role variable and BAKE `fontStyle` beside it (so a facePin, #1368, could only bake a
literal). Now `buildFigmaFont` emits a STRING cut variable per (category, weight-role, italic) slot
— `<root>/core/font/style/<cat>/<role>[-italic]`, scope FONT_STYLE — whose value is the facePin
verbatim or the weight-role's named-instance derivation, and `buildFigmaTextStyles` BINDS `fontStyle`
to it. The numeric weight-role FLOAT variable is RETAINED as parallel data (still emitted in `core`,
DTCG `$value.fontWeight` still aliases it) but is no longer bound on the Text Style — one authoritative
style binding, no conflicting double-bind. Per-CATEGORY, not per-role, because a facePin is keyed
(category, weight-role): display/subtle can pin "Light Condensed" while title/subtle derives "Light",
and a per-role-only cut would collapse the two (the silent cut swap the gate guards). Plugin
(`write-text-styles.ts`) + CLI paste (`materialise-to-figma.ts`) bind `fontStyle`, not `fontWeight`;
`materialise` gains a FONT_STYLE scope code ('y'). The emitted `out/figma/**` cut variables + bound
text styles move, and the DTCG `figma.binds`/`baked`/`note` metadata moves → ENGINE bump. CONTRACT
STANDS at 11.2.0 (rebased): the cut lives in Figma variables + `$extensions.prism3.facePin`, not a
guaranteed DTCG token NAME — `$value` is unchanged, so `token-contract --check` is level `none`
(brand-dependent). A follow-up covers TokenPress reading a fontStyle-bound variable to round-trip the
cut (a guest surface, out of scope for this PR).

0.109.0 — #1260: mint `type.label.lg` (18px at the label tier's own emphasis/600 weight) and re-point
`size.large.type` from `type.label.md.emphasis` to `type.label.lg.emphasis` across the button family
(button / button-destructive / button-neutral, off the one `makeButton` factory). Before this there
was no `lg` rung on the label tier (12/14 only), so a large button's label was typographically
identical to a medium one while height/padding/gap all moved; the owner resolved the target to
18px/emphasis (2026-09-17). The rung is the body-lg SIZE (18) at the label WEIGHT — the two rejected
routes were `lg`=16 (too small) and `type.body.lg` (18px but default/strong, wrong weight). Label is
reading/UI text and exempt from the typeScale shift, so `type.label.lg` resolves to 18px in every
density (compact/default/expressive), landing the owner's 18px at the comfortable/default density.
TWO surfaces move → ENGINE bump: emitted `out/**` GROWS (`type.label.lg.emphasis` is a new token in
every brand) AND the projected component surface moves (the large button member's text style). CONTRACT
bumps MINOR (11.1.0 → 11.2.0, rebased): `type.label.lg.emphasis` is a guaranteed name ADD, and an add cannot
break an existing reference.

0.108.0 — #1471: a dedicated interactive ICON ink role. The interactive column gained no `icon` sub-role,
so component glyphs inked from the interactive `text` role (button/icon-button outline/ghost/text). This
mints `interactive.<family>.icon.{rest,hover,pressed}` (and its `inverse.` twin) as a VALUE-IDENTICAL
mirror of `text.*` — the same resolved candidate, shared by value — and re-points every glyph ink key in
`button.ts` and `icon-button.ts` from `...text.*` to `...icon.*` (`filled.icon` stays on `on-fill`, a glyph
on a filled ground). Because the value equals `text`, emitted COLOURS are byte-identical (no visual change)
and every contrast contract is unchanged; the emitted trees move only their new `icon.*` leaves + the
version stamp, and the projected component surface moves its glyph bindings. Both families move together.
CONTRACT rises to 11.1.0 — this ADDS a guaranteed emitted name (see the CONTRACT entry).

0.107.0 — #1476: the emitted text styles now read LARGEST → SMALLEST within each type group, so the
Figma styles list reads top-to-bottom the way a designer reads a type ramp (within a role, lg before md
before sm). The composite walk (`emit-figma-font.ts` `orderComposites`) stable-sorts by a size-rank map
(3xl…2xs, largest first) applied WITHIN each group; the tier order and the weight-role variant order are
preserved (only the size axis flips). This is the single deterministic driver of Figma creation order,
so the emitted `text-styles.json` AND every plan consumer (the plugin's `applyTextStylePlan`, the paste
path) inherit it — and, the owner confirms, both the right-panel local-styles list and the Assets panel
follow creation order, so style names stay CLEAN (no numeric/zero-padded prefix). Every brand's
emitted `text-styles.json` under `out/figma` reorders → ENGINE bump. CONTRACT STANDS at 11.0.0 —
ordering is not a token name (no guaranteed name moves; `token-contract --check` level `none`).

0.106.0 — #1472/#1473: component-property references failed to wire on specific members (field-label 27
misses, select 36), all "set_componentPropertyReferences: Could not create a new component property
reference". Root cause: the plugin's component write path (`apps/plugin/src/write-components.ts`) re-found
a member's part for the #1337 recovery THROUGH the member handle it snapshotted right after
`combineAsVariants` — but the host keeps reconciling ids after combine and, for some members, reassigns
the MEMBER's own identity, leaving that snapshotted handle DETACHED while a fresh `set.children` read holds
a live, referenceable twin. Re-finding through the stale handle threw again, so the miss was permanent and
the property no longer drove the node (the coupled #1472 icon-swap symptom: an INSTANCE_SWAP whose
`mainComponent` reference never landed cannot swap). Fix: re-resolve the member from a fresh `set.children`
read (`liveByName`) before every re-find (recovery, ref/bound read-back, orphan scan). New host-truth gate
(`settleAfterCombine` shim mode + `test-write-components.ts`/`test-roundtrip.ts`) fails BY NAME when any
declared reference is left unwired on any member; mutation-proven. A PLUGIN write-path behavior change
(principle 5: any behavior change) → ENGINE bump; no engine emission or projected surface moves, so
`out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS at 11.0.0 (no token name or member moves).

0.105.0 — #1479: the breakpoint COUNT is made a truly brand-flexible axis (2/3/4/5/6 all supported and
auto-named), and the upper breakpoint tiers are reclassified `brandDependent` (CONTRACT 11.0.0, below).
The capability already existed by construction — `layout.breakpoints` is a per-brand lever and `bpNames`
slices the t-shirt ladder to the count — but was untested below 5 floors; this adds the gate that builds
2-, 3-, and 4-floor brands (and confirms 6) and asserts the emitted `layout` collection's auto-names and
per-breakpoint grid values, plus a `minimal-bp2` corpus member that demotes the upper tiers. NO emitted
token value and NO projected component member moves — a 5-floor brand emits exactly what it did before.
The ENGINE bump accompanies the contract reclassification and restamps `out/**`'s
`$extensions.generator.version` so the producer stamp tracks the release that moved the promised surface.
(#1479)
