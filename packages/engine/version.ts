/**
 * Prism3 engine — VERSIONING (the constants + the pure classifier).
 *
 * Deliberately a LEAF module: it imports nothing from the engine, so `tree.ts` can stamp
 * `ENGINE_VERSION` into every emitted artifact while `token-contract.ts` imports both this and
 * the whole engine, with no cycle. Everything here is pure — the corpus build and the CLI live
 * next door in `token-contract.ts`.
 *
 * TWO versions, deliberately independent, because they answer different questions:
 *
 *  - `ENGINE_VERSION`  — "what code produced this?" Stamped into every emitted tree and reported
 *                        as the MCP `serverInfo.version`. Bumps on any behaviour change, including
 *                        a pure VALUE change.
 *  - `CONTRACT_VERSION`— "can my app still resolve the names it references?" Bumps ONLY when the
 *                        guaranteed token-name surface changes.
 *
 * The split is the useful part. A consumer app writes `prism.color.text.primary` in its CSS; it
 * does not care that the brand's primary hue moved 4 degrees — that is the engine doing its job.
 * It cares enormously if `text.primary` stops existing, because the reference silently resolves to
 * nothing. So VALUES are not versioned and NAMES are. Tying them together would either cry wolf on
 * every brand tweak or stay silent through a rename; separating them lets each be strict.
 */

/**
 * The code. Bumps on any behaviour change — including one that only moves values.
 *
 * 0.3.1: semantic ink (`text|icon.<sem>`) now gates against its own `-subtle` tint as well as the page
 * floor, so it resolves a rung darker on white-page brands. Values only — no name moved, so
 * CONTRACT_VERSION stands. Exactly the case this split exists for.
 *
 * 0.3.2: muted semantic ink (`text|icon.<sem>-subtle`) is GATED at the large-text bar (`tertiaryMin`)
 * instead of shipping ungated at a fixed rung. Standard light/dark values are unchanged — every brand
 * already cleared 3:1 — so the only value move is HC, where the fixed rung could not respond to the
 * raised bar and now escalates a rung. A `min` going 0 → 3 is not a NAME change, so CONTRACT_VERSION
 * again stands; note that the contract covers path + `$type`, not the contrast metadata. (#570)
 *
 * 0.3.3: `border.focus-inverse` is emitted — a focus ring gated at `nonTextMin` against
 * `background.inverse.primary`. The single `border.focus` was gated on the page and reused on inverse
 * surfaces, where it measured 2.09:1 (hc-light) / 2.40:1 (hc-dark), below SC 1.4.11 in the two modes
 * that exist for users who most depend on seeing focus. No existing value moves — this ADDS a path,
 * which is why `CONTRACT_VERSION` moves too (a MINOR, unlike 0.3.1/0.3.2 above). (#573)
 *
 * 0.3.4: `WEIGHT_STYLE_NAME_MONO` (a hardcoded 600→Medium collapse for mono faces) is removed from
 * `emit-figma-font.ts`. It was a guess working around a spelling-variance bug (`Semi Bold` vs
 * `SemiBold`) that #499/#530 already fixed properly — the plugin write lane now resolves the emitted
 * style name against the family's REAL loaded styles at write time, so a mono family carrying 600
 * under any spelling now resolves it correctly instead of having it suppressed. `fontStyleName`'s
 * `mono` and non-`mono` tables now agree at every weight; no corpus brand's default configuration
 * exercises a mono face at weight 600 (`code` only ever takes the `default` role), so this bumps the
 * version for the behavior change without moving any committed corpus artifact. Values only — no
 * token name moved, so `CONTRACT_VERSION` stands. (#538)
 *
 * 0.4.0: the engine emits a second, CONFORMING projection of every tree — `<brand>.base.tokens.json`
 * plus one `<brand>.<mode>.overlay.tokens.json` per theme mode. The canonical tree is unchanged and
 * remains the source of truth; per-mode values still live under `$extensions.prism3.modes`, which
 * DTCG defines as ignorable, so the projection is what a stock consumer can actually read. A minor
 * rather than a patch because the artifact SET grew, not because anything existing moved — no token
 * name and no canonical value changed, so `CONTRACT_VERSION` stands. (#609)
 *
 * 0.5.0: the interactive outline EDGE is stateful — `interactive.<c>.border` (one value anchored at
 * palette step 500) becomes `interactive.<c>.border.{rest,hover,pressed}`, and the same for
 * `on-inverse.border`. Values move as well as names: the chromatic columns now FOLLOW THEIR INK,
 * which lands on a different ramp step than the old anchor in 34 of 40 corpus brand×mode×column
 * combinations — 17 of 20 for `primary` alone, and in every dark, hc-light and hc-dark mode. (The old
 * anchor was step 500 escalated by `chromatic()` only as far as `nonTextMin` demanded, so it already
 * sat off 500 in 2 of those 40; the count above is measured old-vs-new, not "differs from 500".)
 * Both versions move — this is the rare change that is simultaneously a behaviour change and a name
 * change, so it is worth stating that they moved for different reasons rather than as one event.
 * (#576)
 *
 * 0.6.0: the conforming projection now OMITS non-DTCG types, which today means `spring` — 3 leaves per
 * brand, 12 across the corpus, gone from `<brand>.base.tokens.json`. The canonical
 * `<brand>.tokens.json` is untouched and still carries them, so no token name and no canonical value
 * moved: `CONTRACT_VERSION` stands, and `token-contract.ts --check` confirms it rather than this
 * comment asserting it. A minor rather than a patch because the artifact CONTENT shrank — a consumer
 * sourcing the projection sees three fewer tokens, which is a compatibility-relevant change even
 * though what they lose is a value that read `[object Object]`.
 *
 * The reason it is a fix and not a removal: those files exist to make a conformance promise (#609), and
 * a `$type` outside the spec makes the promise false while producing a garbage value in the same
 * stroke. `spring` is a real part of the motion vocabulary and stays in the tree that is ours.
 * Nothing here decides springs' future — if the motion vocabulary ever becomes standard, `spring`
 * joins `DTCG_TYPES` and the projection gains those tokens back with no other change. (#642)
 *
 * 0.7.0: mode-varying shadows reach their overlays. Two things move, and they are worth separating.
 * (1) The emitted `$extensions.prism3.modes` entry for a shadow is now the WRAPPED `{ $value: [...] }`
 * shape every other mode entry already used, instead of the bare layer array — one shape for one
 * concept. (2) Because the projector's guard tested for that wrapper, 28 mode-varying shadows (7 per
 * brand × 4 brands) were silently absent from every `<brand>.dark.overlay.tokens.json`, and now
 * appear. A conforming consumer sourcing `base + dark.overlay` was rendering LIGHT shadows in dark
 * mode; it now renders the dark ones. (#708)
 *
 * A minor rather than a patch for the same reason 0.6.0 was: the artifact CONTENT changed in a way a
 * consumer can observe — there, the projection lost three tokens; here, each dark overlay gains seven.
 * Overlay membership is the whole point of the projection, so a change to it is compatibility-relevant
 * even though it is a change from wrong to right. The canonical tree's mode-entry SHAPE moving is the
 * second reason: anything reading `$extensions.prism3.modes` directly (ours today, but the extension
 * is emitted) sees a different shape for shadow than it did at 0.6.0.
 *
 * No token name and no `$type` moved — every leaf involved already existed in both the base and the
 * canonical tree — so `CONTRACT_VERSION` stands, and `token-contract.ts --check` confirms that rather
 * than this comment asserting it. Worth stating plainly, because a change that alters which values a
 * consumer resolves while moving no name is precisely the case the two-version split exists for.
 *
 * 0.38.0: every projected ICON MEMBER carries an ink (#1211). `icon`'s `paintKeys` gains a second,
 * SLOT-keyed entry — `['tone.{tone}', '{slot}']` — bound to `color.icon.primary`, so a coordinate that
 * names no tone resolves the primary icon role instead of resolving nothing. `paintOf` walks the list in
 * declaration order, so a named tone still wins at every one of the eight; what changes is the case that
 * was never rendered when the old shape was written.
 *
 * MEASURED, and the measurement is the whole reason this is a defect rather than a design: `variantAxes`
 * is `['name']` alone, so NO member of the 39-member set carries a `tone` coordinate, `tone.{tone}` is
 * unfillable at every one of them, and all 39 shipped with no fill bound. The def's own comments called
 * that "the correct projection of `currentColor`, not a dropped binding". It is neither — Figma has no
 * `currentColor`, so it resolves the literal in the glyph document to BLACK, and the set shipped 39
 * unbound black glyphs. That prose predates any rendered default icon and was wrong on contact with the
 * output; it is reversed in `components/icon.ts` rather than left standing beside the fix.
 *
 * ONE HALF OF THE OLD ARGUMENT SURVIVES AND SHAPES THE FIX. There is no token whose value is "inherit",
 * so `tone.inherit` still binds nothing and the floor is keyed on the SLOT instead — it is not a ninth
 * tone, it is what `paintOf('icon')` finds after the tone template fails to fill. `test.ts` pins both
 * halves in one place, because splitting them lets either be "fixed" back into the other.
 *
 * VALUES-only in the token layer: no token name and no `$type` moves, and `color.icon.primary` was
 * already emitted and already bound by `tone.primary`. So `CONTRACT_VERSION` stands at 9.3.0 and
 * `token-contract.ts --check` confirms it rather than this comment asserting it. A MINOR rather than a
 * PATCH for the reason 0.6.0 and 0.7.0 were: the emitted projection changes observably — 39 members gain
 * a bound `descendantFills`, and `schema/paint-census.json` records the move.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. The set stays ONE `ComponentDef` projecting a 39-member
 * COMPONENT_SET (`variantAxes: ['name']`) — 39 separate components need a projector singleton mode
 * `figmaAnatomySet` does not have (it throws on a member with no variant coordinate, #795/#802) and
 * `applyComponentPlan` unconditionally combines, so that reshape is #1226's. And the 16/20/24 size
 * ladder is untouched: `ICON_SIZES` and every `size.*.icon` rung binding stand, because moving them
 * reverses #756's gated default-rung rule (#1206).
 *
 * 0.37.0: the inverse PRIMARY button takes a BRAND-colored label, auto-selected (#1244, refining #1208
 * and #1231). The inverse fill is unchanged — still the uniform neutral extreme #1231 decided — and only
 * `inverse.interactive.primary.on-fill` moves, from a neutral ink to the most vivid step of the brand
 * ramp that still clears 4.5:1 against that fill. `destructive` and `neutral` keep the neutral ink; each
 * has its own contrast story and is a separate decision (#1253, #1254).
 *
 * THE RULE IS DIRECTION-INDEPENDENT, and that is the part worth reading twice. Scan the brand ramp from
 * the END THAT CONTRASTS LEAST with the fill and take the first step clearing the floor: the lightest
 * passing step on a near-white fill, the darkest passing step on a near-black one. Both are "the most
 * brand-vivid step that is still legible", which is the property the owner asked for. The literal
 * "lightest that passes" was measured first and rejected: on the near-black dark-mode fill it returns
 * step 025 at ~15:1 — a nearly white tint, i.e. what #1208 already shipped under another name. Landed
 * values are 550 in light and 400 in dark for nb / aurora / harbor alike, which is the near-identical
 * index the even-step palette predicts.
 *
 * NO STEP PASSING is an honest failure rather than a silent neutral: the most extreme step is bound and
 * the mode contrast contract reports it. Substituting a neutral would hide the one thing a designer
 * needs to see about that brand.
 *
 * HIGH CONTRAST IS EXEMPT: `hc-light` and `hc-dark` keep the max-extreme ink `onColor` already gives
 * them — pure black at 17.27:1 and pure white at 16.00:1 on nb — and only `base` and `dark` take the
 * brand step. The brand step measures ~4.6:1, so applying #1244 there was a 73% contrast drop in the
 * two modes that exist FOR low-vision users. #1244 is a decision about the DEFAULT appearance; it was
 * never a decision to relax the high-contrast one, and the two are not the same trade. It shipped for
 * review without this branch and the first gate ratified it, because a flat 4.5 floor passes at 4.62
 * and at 17.27 alike; `test.ts` now holds the HC modes to the extreme rather than to the floor.
 *
 * WIREFRAME routes through `palOf`, so the greyscale contract still holds ("every wireframe alias routes
 * to palette/neutral/*") — caught by that gate on the first run, when the ink resolved to `accent/950`.
 *
 * VALUES ONLY: no token name or `$type` moves, so `CONTRACT_VERSION` stands at 9.3.0 and
 * `token-contract.ts --check` confirms it. Emitted colour moves in every brand and mode.
 *
 * 0.36.0: `field-label` gains the two Prism 2 controls that use existing patterns (#872, and the
 * `field-label` half of #862). `size` goes to three rungs and TYPE follows it — `type.body.{sm,md,lg}
 * .default`, 14/16/18px at 150% line-height, which is Prism 2's form-label ladder exactly and the tier
 * #862 predicted (`type.label.*` is 12/14, emphasis-only, no `lg`). Ink follows a new `tone` axis onto
 * `color.text.{primary,secondary}` — semantic roles, never shades, so a brand retuning its text palette
 * carries this without the def moving. The default size still resolves to the `md` rung, which
 * `lint-rung-names` (#756 arm 3) checks corpus-wide and `test.ts` now also pins at the def.
 *
 * NOTHING SHARED MOVED, and that is the scope rather than luck. `tone` was already in `VARIANT_AXES`
 * and already the ink axis on `icon` and `field-message`, and the `type` template still names ONE
 * placeholder, so the projector's `{size}`-only expansion is untouched. Prism 2's third control — the
 * Regular/Bold weight — is NOT built: it needs a coordinate-driven `type` resolver and a new name in
 * #756's deliberately closed axis vocabulary, which are decisions rather than bindings. Filed as #1248
 * and routed to review before any code; this def binds `.default` (400, Prism 2's own default cell)
 * until that lands.
 *
 * NO EMITTED TOKEN VALUE MOVES — `out/` changes only by this stamp, and `CONTRACT_VERSION` stands at
 * 9.3.0 since no guaranteed name or `$type` moves (`--check` confirms). The bump is for BEHAVIOR a
 * consumer sees: `field-label`'s Figma set goes from 4 members to 12, its code API gains a prop, and
 * every rung's type role changes tier. `lint-emission-version` reports 0 artifacts moved and is right —
 * component payloads are not committed under `out/`, so a gate watching regen artifacts cannot see a
 * component projection change. Its silence is a fact about its scope, not evidence behavior held still.
 *
 * 0.35.0: two button-QA colour-derivation corrections in `modes.ts`, both VALUES-only (no token name
 * or `$type` moves, so `CONTRACT_VERSION` stands at 9.3.0 — `token-contract.ts --check` confirms). Takes
 * 0.35.0 because #997's switch-inset 0.34.0 (below) is spent. (1) #1208 — the inverse FILLED fill is now
 * a uniform neutral near-white (light) / near-black (dark) for every interactive family, where it used to
 * be a light step of the family's own palette (primary → brand.100, destructive → danger.100); family
 * identity on a dark band is carried by the outline/text ink and the on-fill ink, not by tinting the
 * filled surface. (2) #576 — the neutral outline BORDER now follows its text ink like every colour family
 * (near-black on the page, white on the inverse band), retiring the special-case mid-grey edge; reads
 * deliberately LOUDER, contrast-safe by construction (the ink cleared the stricter text bar). Every mode's
 * contrast contract re-verified — no floor drops.
 *
 * 0.34.0: the switch thumb's CLEARANCE from its track's ends (#997). `control.size.{rung}` gains an
 * `inset` leaf — `(height - dot) / 2`, so 3/4/5/6/7 across `CONTROL_RUNGS` — and `switch`'s track binds
 * it as uniform padding. Before this the thumb sat FLUSH at both extremes: it is a flow child of a
 * fixed-size track distributed MIN/MAX by `positionWhen`, an alignment has no offset to give, and the
 * space scale (4/8/12/...) carried nothing for `md`'s 5px to bind. `dot`'s argument exactly, one
 * consumer over — the arithmetic has nowhere downstream to happen, so the tier holds it.
 *
 * DERIVED from `dot`, never a second ratio, and that is what makes a fifth tier field safe: the padded
 * inner box is exactly one thumb tall at every rung and density by construction, so the inset cannot
 * drift from the thumb it clears. `test.ts`'s membership pin moved from four fields to five, which is
 * that gate working rather than yielding — it fired on the first run of this change.
 *
 * Prism 2 supplied the RELATIONSHIP and could not supply the number. `toggle-switch.json` sites its own
 * thumb with a uniform `padding: 4` on the TRACK — an equal inset on four sides, i.e. the thumb centred
 * — which is the construction adopted here. Its literal 4 is `height / 8` and follows from a 0.75 thumb
 * ratio where this tier's is 0.5; on this ladder that is 2.5px at `md`. So the shape transfers and the
 * value is re-derived, which is also why every rung stays an integer.
 *
 * Emitted artifacts move in all four brands, and `core.dimension.5` is newly emitted: 3, 5 and 7 are on
 * neither the base-4 grid nor the space extras, so the inset px join the grid extras the way `dot`'s did
 * (#910) and the alias resolves rather than falling back to a literal. `CONTRACT_VERSION` moves to 9.3.0
 * — four paths added, none removed or retyped — derived from `token-contract.ts --check` rather than
 * asserted here.
 *
 * 0.33.0: the selection-control LINE-BOX (#1201, building the fix #1009 filed). Follows #1216's 0.32.0
 * (the 36/44/56 size-ladder move, below) — 0.32.0 is spent, so this takes 0.33.0. `control.size.{rung}`
 * gains a `line-box` leaf — the baked height of one line of the `body.{rung}` label (`fontSize ×
 * lineHeight`, per rung). checkbox / radio / switch wrap their control in a box exactly that tall and
 * centre it within, while the control+label ROW stays top-aligned, so the control tracks the FIRST line
 * of a wrapping label instead of floating mid-paragraph — the construction #1009 wanted and could not
 * build, because a line-box is a ratio × a size and Figma variables cannot multiply, but the PRODUCT is
 * a fixed px a variable holds. ADDS three guaranteed paths (`control.size.{sm,md,lg}.line-box`), so
 * `CONTRACT_VERSION` moves 9.1.0 → 9.2.0 (MINOR, additive, from main's 9.1.0). No existing token name or
 * value moves; the anatomy restructure adds a wrapper node to three defs and changes no emitted colour
 * or dimension. (#1201)
 *
 * 0.32.0: the shared component-size ladder moves to Prism 2's 36/44/56 for small/medium/large at the
 * default density (#1207). A pure VALUE move — every path and every `$type` is where it was, so
 * `CONTRACT_VERSION` stands and `token-contract.ts --check` says so rather than this comment. Minor
 * rather than patch for the reason 0.6.0 and 0.7.0 were: a consumer resolving `size.md.height` gets a
 * different number, across all four brands and six component defs.
 *
 * The defect was that the DEFAULT control sat under WCAG 2.2 SC 2.5.5 (AAA, 44px): 40px on aurora,
 * the brand the studio boots. `AAA_TARGET_PX` is now asserted against that one rung — the default
 * density's `md` — and deliberately not against the others, since `compact` exists so a brand can go
 * tighter on purpose and a sweep would either fail or force `density` to stop meaning anything.
 *
 * `SIZE_RUNGS.h` (a spaceBase multiple) became `SIZE_RUNGS.px`, because 36 and 44 are 4.5x and 5.5x
 * of 8 and are not on the space scale at all — the old field's stated contract could not survive the
 * decided values. The emitted leaf has always aliased the `dimension` grid, so the px ladder states
 * what the output already was. Heights no longer scale with `spaceBase`; unreachable, since
 * `SPACE_BASE` is locked at 8 and `brandTheme` passes exactly that. Padding stays a multiple.
 *
 * 0.31.0: the `controlShape` FORM lever (#1163). A brand can now choose `rounded` (default) or `pill`
 * for its pill-able controls — today button and icon-button, tomorrow anything that declares a
 * `pill-radius` derivation. `pill` rebinds those controls' corner from `radius.md` to a new
 * `radius.capsule` rung (a 999px sentinel), which Figma clamps to height ÷ 2 at every size. `radius.capsule`
 * is a SECOND pill rung, kept distinct from `radius.round` (128px, the rung switch and radio bind
 * intrinsically): 128 stops being a full pill above a 256px control height, so a lever that promises an
 * unconditional pill needs a rung whose ceiling no real control reaches — and raising it must not touch the
 * intrinsic pills. It is a CORNER_RADIUS-scoped radius bound to a radius corner, off the 4px grid on purpose
 * (a sentinel, not a ladder step), so it emits as a literal. This ADDS one guaranteed path, `radius.capsule`,
 * which is why `CONTRACT_VERSION` moves 9.0.0 → 9.1.0 (MINOR, additive — see below); `rounded` still
 * reproduces every plan byte-identically. `switch`/`radio` carry no `pill-radius` derivation and so are
 * structurally outside the pill-able set — asserted in `test.ts` so the lever can never square them off. (#1163)
 *
 * 0.30.0: ONE COLOUR COLLECTION (#1148/#1150). The two-tier colour split ends. `color.surface` — the
 * pointer tier, one alias per non-inverse role — is DELETED, and the value tier is renamed from
 * `color.appearance` to `color`, taking the short names with it: `nbds/color/appearance/text/primary`
 * becomes `nbds/color/text/primary` and there is nothing left to alias into. 243 variables in one
 * collection with four appearance modes, where there were 243 + 130 in two. The artifact count goes
 * 111 → 108: fifteen files leave (`color.appearance.<mode>.json` × 4 and `color.surface.json`, per
 * Figma brand) and twelve arrive (`color.<mode>.json` × 4 × 3).
 *
 * WHAT THE COLLAPSE BUYS, and it is one thing said three ways. A designer picking a colour saw two
 * collections and had to know which; a role bound from the pointer tier could not vary by appearance
 * (that was the tier's whole limitation, and it is why every inverse role was excluded from it and had to
 * be bound by name); and the pointer tier shipped `ALL_SCOPES` on every row, so it offered every variable
 * everywhere Figma asks for a colour. One collection removes the choice, makes every role
 * appearance-responsive including the 113 inverse ones, and puts the value tier's real scopes in front of
 * the designer. #1013's argument for the split was appearance-INDEPENDENCE for consumers who want a fixed
 * colour; nothing shipped ever wanted one.
 *
 * WHY THE VALUE TIER TAKES THE SHORT NAME RATHER THAN THE POINTER TIER KEEPING IT, and this is FORCED by
 * the Figma API rather than chosen: `Variable.variableCollectionId` is `readonly`, so a variable can never
 * be re-parented. Renaming the pointer collection onto `color` would strand the values and all four
 * appearance modes in a collection called `color.appearance` with nothing pointing at them. The migration
 * consequence for an existing file follows from the same fact — the old `color.surface` collection is
 * ORPHANED rather than removed, because there is no operation that folds it in. See `COLLECTION_RENAMES`.
 *
 * #1150 RIDES ALONG BECAUSE IT IS THE SAME WRITE. Figma lists a collection in CREATION order, so the
 * order the emitter writes role families in is the order a designer reads down the panel. It is now stated
 * once, in `tree.ts`'s `COLOR_FAMILY_ORDER`, and drives BOTH the DTCG key order and the Figma write order
 * — verified by mutation (reorder the list, re-emit, both follow) rather than by reading the code. The
 * order is `background, foreground, text, icon, interactive, disabled, border, scrim, veil, field,
 * inverse`: ground, then what sits on it, then what responds, then the edge, then the washes, then the one
 * composite — and `inverse` LAST, since it re-states every family above and anywhere else splits each
 * family into two places on screen. A resolved family the list does not name is a THROW, not a silent
 * append. That the panel itself follows creation order is the owner's Figma check, not ours: the repo can
 * only measure the write order.
 *
 * The name surface is `CONTRACT_VERSION` 9.0.0 below — 225 guaranteed paths removed, measured before the
 * bump was chosen.
 *
 * 0.29.0: ONE `inverse` GROUP (#1140). Every inverse colour role relocates to a single top-level
 * `inverse.` group — `color.appearance.background.inverse.primary` becomes
 * `color.appearance.inverse.background.primary`, `…text.on-inverse.primary` becomes
 * `…inverse.text.primary` — so the inverse form of any role is `inverse.` + the role, with nothing to
 * look up. 113 emitted paths move; `main` at 0.28.0 emits none under `appearance/inverse/` and this
 * emits 1,356 occurrences of it across the artifact set. The edge ladder also gains a third rung
 * (`border.tertiary`, `inverse.border.tertiary`, and the pointer row `color.border.tertiary` the surface
 * tier generates from the new non-inverse role) and drops `border.inverse.default`, which was
 * byte-identical to its `primary` twin. Reasoning in `docs/20` §9.9; the name surface is
 * `CONTRACT_VERSION` 8.0.0 below, which is the MAJOR this rename forces.
 *
 * A MINOR rather than a PATCH by the ordinary rule — a consumer reading `out/**` sees 113 different
 * names — and the bump is recorded here rather than assumed, because IT WAS MISSED. #1141 shipped the
 * whole rename with this constant still reading 0.28.0, so every regenerated tree carried #1139's
 * generator stamp: an artifact set claiming to have been produced by code that could not have produced
 * it. Nothing caught it. The gates all compare the emission to ITSELF (`regen --check`) or to the
 * contract baseline, and no gate asserts that a moved emission moves `ENGINE_VERSION` — the one
 * assertion that would have. It was caught in review, by diffing the emitted paths against `main`.
 * Whether that earns a gate is a separate call and deliberately not made here; the shape of it is
 * awkward for the usual reason (`docs/34`), since the obvious implementation derives "did the emission
 * move" from the emission the same regen produces.
 *
 * 0.28.0: INVERSE GOES BACK TO A NAME (#1133). The `color.surface` pointer collection loses its second
 * mode: `default`/`inverse` becomes one `Default`, and the per-brand `color.surface.{default,inverse}.json`
 * pair becomes a single `color.surface.json`. Three brands × two files → three files, so the ARTIFACT
 * COUNT goes 114 → 111 and `verify.ts` / `ci.yml` are edited to match.
 *
 * The revert, not a redesign. Mode-encoding shipped at 0.13.0 and it only pays if you flip EVERYTHING:
 * #1128 measured 112 of 128 rows changing value between the two modes, which is the number that makes a
 * mode look obviously right. The requirement is not a full-region flip — it is a BOUNDED set of inverse
 * atomic elements plus inverse variants of page-level blocks, and no surveyed system ships an inverse
 * mode or collection (Carbon, Material 3, Fluent and Atlassian all name it). A name expresses a bounded
 * set; a mode applies to every row in the collection or to none. Reasoning in `docs/20` §9.8.
 *
 * THE APPEARANCE TIER AND ALL 113 OF ITS INVERSE LEAVES ARE UNTOUCHED, which is the whole point: those
 * are the values an inverse component variant binds, and `focus-ring` has been binding one by name since
 * 0.9.0. So is the two-tier split (#1082/#1013), whose justification is appearance-INDEPENDENCE and never
 * mentioned inverse; so is the brand namespace (0.27.0) and the `core` fan-in. The collection KEEPS the
 * name `color.surface` — argued in `docs/20` §9.8, and the short version is that renaming it costs a
 * `COLLECTION_RENAMES` entry in exactly the machinery #1097 de-chained, with no era to tell the pre-#1082
 * `color` (a value tier) from the post-revert one (a pointer tier).
 *
 * ONE ROW MORE, NOT FEWER: 128 → 129. `color.scrim.default` had been the coverage register's single
 * `omit` entry, kept out of the tier because nobody had decided what a scrim should do on an inverse
 * ground. There is no per-surface behaviour left for that to be undecided about, so it gets its pointer
 * and the short name comes back — see `CONTRACT_VERSION` 7.1.0, which is a MINOR for that one addition.
 * That also retires a #1013 DEPRECATIONS entry: `classify` only checks a `replacedBy` against the live
 * set, so an entry whose `path` is emitted AGAIN passes silently. Filed as its own gate gap.
 *
 * The 0.26.0 entry below still describes the axis as `base-only` in `axes.ts` and the studio pill's
 * comment as citing `scrim.default`'s `omit` disposition. Both statements were true at 0.26.0 and are
 * false now, and neither is edited: a changelog entry records what shipped at a version, the same rule
 * `DEPRECATIONS` follows for its `path` field. The live state is here.
 *
 * 0.27.0: THE BRAND NAMESPACE ON EVERY FIGMA VARIABLE, and the DTCG `core` tier with it (#1097/#1102).
 * The widest rename the project has run — 671 / 711 / 730 distinct variable names for nb / aurora /
 * wendys, 2112 across the corpus. Three Figma-side changes land as ONE, because each would otherwise
 * cost its own migration and its own verification pass over the same names:
 *
 *   (1) every emitted variable gains the BRAND ROOT as its first segment — `color/background/primary`
 *       becomes `nbds/color/background/primary` for nb and `prism/color/background/primary` for the two
 *       engine-native brands. `emit-figma-color.ts`'s `stripNs` is what took it off before this change.
 *   (2) the three `core-*` collections consolidate into ONE `core` collection holding `palette/*`,
 *       `dimension/*` and `font/*`. Three files still emit it — `core.palette.json`,
 *       `core.dimension.json`, `core.font.json` — each declaring `$collection: 'core'`, which makes this
 *       the first place in the engine where a file STEM is not a collection NAME.
 *   (3) the `color` collection is renamed `color.surface` (#1089), so both colour tiers name their axis
 *       in Figma's mode picker rather than one naming it and one not. The variables inside keep their
 *       `color/*` names, so this part moves no DTCG path.
 *
 * And #1102 folds in the DTCG half of (2): `palette.*`, `dimension.*` and `font.*` move under a `core`
 * tier — `prism.palette.red.550` becomes `prism.core.palette.red.550`, 164 paths. NOT separable, because
 * a variable name tracks its DTCG path: landed after #1097 it would rename the same 164 variables a
 * second time, and as one change it is a single rule chain producing a single final name.
 *
 * FIGMA STYLES ARE THE STATED EXCEPTION, and they keep the transform they already had: a text style is
 * `display/sm/strong` where its DTCG path is `prism.type.display.sm.strong`, dropping the root AND the
 * tier. So after this bump "a variable's name is its DTCG path with dots for slashes" is true, and the
 * same sentence about a STYLE is false. `docs/10` states it where the transform lives, because a reader
 * who generalises from variables to styles gets a name Figma does not have.
 *
 * `font-fluid/*` deliberately does NOT go under `core`: it is a COMPUTED tier, not a primitive, and it
 * is emitted into `type-sets`. The materialization rule keys the tier on the name's own first segment
 * for exactly that reason — so a fourth primitive group is a one-word change, and `font-fluid` needs no
 * exception to stay outside.
 *
 * EMITTED FILENAMES FOLLOW COLLECTION NAMES, so 15 artifacts are RENAMED rather than rewritten. The
 * artifact count is UNCHANGED at 114 because every one of the 15 is a rename — but `regen --check`'s
 * removal arm cannot see a file the engine stopped emitting (#1059), so run against a tree still
 * holding the old stems it reads 129. The stale copies are `git rm`-ed explicitly here, and 114 is
 * derived from the emitted set rather than read off what regen printed. That is #1082's lesson applied
 * a second time, and the reason it is worth writing down: the wrong number is the plausible one.
 *
 * A minor rather than a major on the ENGINE version, for the same reason 0.26.0 was: `ENGINE_VERSION`
 * answers "what code produced this?" and makes no compatibility promise. The promise is the contract's,
 * and `CONTRACT_VERSION` takes the major (7.0.0 below).
 *
 * THE NAMESPACE ITSELF CONTRIBUTES NOTHING TO THAT MAJOR, and (1) and (3) above contribute nothing to it
 * either. Measured both ways: 714 guaranteed paths on the merge base and 684 here, and in BOTH baselines
 * ZERO carry a brand-namespace root — the contract is "keyed below the configurable root" (its own note),
 * and the root added by (1) IS that root. (3) renames a COLLECTION, not a token, so its 128 variables keep
 * their `color/*` names. What takes the major is (2) and #957: 164 paths moving under `core.*`, and 30
 * paths demoted out of `guaranteed`. Recorded here because a bump credited to the namespace would be a
 * false provenance record no gate can catch — the version number is the same either way — and because
 * someone reading 7.0.0 as evidence that renaming a root breaks consumers would design around a cost that
 * does not exist. (#1097, #1102, #1089, #957)
 *
 * 0.26.0: THE TIER SWAP (#1013). The value tier moves to `color.appearance.*` and the surface alias
 * tier takes the short name `color.*`, in BOTH formats — the Figma `color` collection is renamed
 * `color.appearance` and its 242 variables with it, the `surface` collection is renamed `color` and
 * its 128 variables with it, and the DTCG tree gains a `color.appearance` level under which every
 * former `color.<role>` leaf now sits. Emitted Figma FILENAMES follow the collection, so six files
 * per brand cease to exist (`color.{light,dark,hc-light,hc-dark}.json`,
 * `surface.{default,inverse}.json`) and six take their place; they are deleted explicitly in this
 * change because `regen --check`'s removal arm cannot see them (#1059).
 *
 * `CONTRACT_VERSION` goes to 6.0.0 in the same breath — 114 guaranteed paths are removed and 242
 * added, and a removal is a MAJOR. The two versions move together here for once, and for genuinely
 * different reasons: the contract moved because names moved, the engine moved because the ARTIFACT
 * SET moved. No colour value changes anywhere in the corpus — every emitted paint is byte-identical
 * to 0.25.0 under a different name, and the second mode on the alias tier is a pointer to a name
 * that already existed. This is the mirror of the case the split usually illustrates, and the same
 * mirror 0.8.0 was: names move, values do not.
 *
 * A minor rather than a major on the ENGINE version even though the artifact set changed, because
 * `ENGINE_VERSION` answers "what code produced this?" and is not a compatibility promise — the
 * promise is `CONTRACT_VERSION`, and it took the major.
 *
 * TWO DOWNSTREAM CLAIMS THE SWAP FALSIFIED, both fixed here rather than filed, because each is a
 * shipped or gated surface asserting something about the names that moved:
 *   · `tools/exporter-comparison/axes.ts` declared the surface axis `absent` from the DTCG projection,
 *     which was true only while the value tier held the short name — a pointer tier and its targets
 *     under one name have nothing to project separately. It is `base-only` now: the `default` member
 *     pairs path-for-path, `inverse` still has no overlay (#1027). The naive fix — swapping the key and
 *     leaving the kind — drops every `color.appearance.*` path as well, because the drop is keyed on a
 *     path's FIRST SEGMENT and `color` now prefixes `color.appearance.*`. Measured: 1074 unpaired
 *     across three brands, reported as agreement. That trap is written at `absentFromProjection`.
 *   · the studio printed `color.<role>` on every colour pill, so 114 of them named a path that stops
 *     resolving. `colorPath` picks the tier from `surfaceRows` — the derivation both materialisations
 *     read — rather than pattern-matching `inverse`, which misses `scrim.default`.
 *
 * 0.25.0: the media veil — `color.veil.{dark,light}.{large,body,enhanced}`, six roles a designer picks
 * from when laying text over a photograph (see `CONTRACT_VERSION` 5.4.0 below). Additive; no existing
 * value or name moves.
 *
 * The engine's first APPEARANCE-INVARIANT colour family, and that is a consequence rather than a
 * choice: the derivation's ground is the worst pixel of an unknown image — sRGB white under a dark
 * veil, sRGB black under a light one — which is a constant, so no theme input reaches it and no mode
 * can move the result. Both polarities are therefore live in every mode, because a photograph has no
 * polarity the theme can read.
 *
 * Each rung is the LEAST emitted alpha step clearing its WCAG floor at that worst pixel (3 / 4.5 / 7),
 * which puts the light polarity a step below the dark one at every rung — sRGB gamma lets a white wash
 * lift a black pixel faster than a black wash drops a white one. Prism2's 40/60/80 is deliberately NOT
 * inherited: measured, its weakest dark step buys 2.85:1, below even the 3:1 large-text floor, so the
 * reference ladder would ship a token whose purpose is contrast for text and which buys none for any
 * text.
 *
 * Two downstream counts move with it, both additive, and named here because 0.13.0 below states the old
 * one: the `surface` Figma collection goes 122 → 128 rows, and its self-aliased register 10 → 16, since
 * an inverse band does not change a photograph and so the same token is genuinely right in both modes
 * (`inverse-coverage.ts`, `alias: 'self'`). (#1030)
 *
 * 0.24.0: every projected TEXT node now CLAIMS its vertical alignment (#1009 half 2). A new
 * `FigmaNodePlan.textAlignVertical`, defaulted to `CENTER` by the projector and overridable per part via
 * `PartDef.verticalAlign`; both executors write it, and `anatomyErrors` refuses it on any kind but
 * `text` because Figma throws on that write.
 *
 * **It moves nothing anyone can see, and that is why it is safe to introduce as a default rather than a
 * required field.** Measured over every projected member: **774 TEXT nodes, ZERO with a bound height**,
 * and a hugging text node's box IS its content — so `TOP` and `CENTER` land the glyphs in identical
 * pixels. The value of the change is that the property stops being a SILENCE. #865's operation is
 * *neutralise what we did not claim*, and its neutral value here is `TOP`, already Figma's default, so
 * clearing would have been a no-op; #1009 wanted the opposite operation, a claim, and the two are not
 * interchangeable. A minor rather than a patch because the emitted plan gains a field.
 *
 * A note for whoever reads this next expecting the QA symptom to be gone: it is not. #1009 arrived as one
 * observation and is TWO properties on two different nodes. Half 1 — a control top-aligning against its
 * label — lives on the PARENT frame and is not fixed here. It is measured (a `medium` checkbox binds a
 * 16px control against a 24px line box, so the box centre sits 4px high) and it is GUARDED, because the
 * obvious repair is wrong: blanket-centring the row floats the control mid-paragraph on a label that
 * wraps, and the Prism2 reference is explicit that the box tracks the FIRST LINE. The exact repair wants
 * a control frame the height of the line box, and line-height is a RATIO token against a rem font size —
 * Figma variables do not multiply, so no px line-height variable exists to bind one to.
 *
 * 0.23.0 IS TAKEN BY #1021 (field-message glyphs), merged first — hence 0.24.0 rather than a second
 * 0.23.0 entry the later merge would have to reconcile. (#1009)
 * 0.23.0: a validation tone draws its own glyph, and a def can declare that its box legitimately moves
 * (#1010, field-message). Three `presentWhen`-gated `vector` parts replace one `kind: 'slot'` part whose
 * INSTANCE_SWAP property nominated a placeholder — the 39-glyph set had landed in #920 and this def bound
 * none of it. `FigmaProperties.footprintVaries` is the second half and the reusable one.
 *
 * WHY THE SECOND HALF WAS NEEDED, because a value change would not normally reach the grammar. The
 * footprint cohort (`planSetLayout`) exempts `size` and slot fill from "swapping a variant must not resize
 * the member", which describes Button: the two axes that legitimately change its box. `presentWhen` (#910)
 * then added a third way for a variant to change what nodes exist, and nothing revisited the key — because
 * `checkbox` and `radio` gate a mark INSIDE a size-bound control, so their box holds still and the rule was
 * right to compare them. This def is the first where a gated part is a flow child of the row: three tones
 * carry a 16px glyph, the default carries none, and the executor reported three footprint misses on a
 * correct build. Declared per def rather than derived from `presentWhen`, which would have exempted
 * `checkbox` on `selection` and deleted the one comparison that def most needs.
 *
 * No token name moved and no value changed. The glyph's artboard binds `icon.size.xs`, in the contract
 * since before this branch; the def's own `glyph-size` key is def-local. So `CONTRACT_VERSION` stands and
 * `token-contract.ts --check` confirms it rather than this comment. MINOR rather than PATCH because the
 * grammar gained a field and every field-message member gained or lost a node.
 *
 * 0.22.0 IS TAKEN BY #1016, which is open and not merged at the time of writing — hence 0.23.0 rather than
 * a second 0.22.0 entry that the later merge would have to reconcile. If #1016 is abandoned this log skips
 * a MINOR, which costs nothing: the numbers are ordered, not dense.
 * 0.22.0: a selection control's box stops drawing a border in the same family as its own fill (#1011).
 * Seven paint keys are REMOVED from `checkbox`, four from `radio` and three from `switch`, and nothing
 * is added — the fix is a deletion, because the paint grammar already said this: an unbound slot returns
 * `undefined` and paints nothing, so the ABSENCE of `unchecked.fill` is the binding "this coordinate has
 * no fill". What changes on screen: an unselected box is transparent over the page instead of painting
 * `field.fill` (measured 1.00-1.22:1 against the page — a fill that was never visible as a fill), and a
 * selected box paints its fill with no border instead of `fill.selected` beside `border.rest`, which had
 * been two bindings disagreeing about one boundary.
 *
 * The premise the three defs shared was wrong rather than carelessly applied, which is why all three had
 * it: `interactive.<intent>.fill.*` and `interactive.<intent>.border.*` are byte-identical at every rung
 * they SHARE across 5 brands x 4 modes, so a fill/border pair reads as two shades of one idea — but the
 * border ladder has no `selected` rung at all, so `fill.selected` had no border to agree with and fell
 * through to `border.rest`. `lint-paint.ts` gains a fourth arm that measures whether a fill bounds itself
 * against the page (>= 3:1, SC 1.4.11) and fails a same-family border beside one; it named all three defs
 * in a single run before any was fixed. Switch's OFF track keeps its rim, measured: no brand's neutral
 * fill clears 3:1 (1.21-1.58:1 at rest), so that rim is the track's only edge.
 *
 * No token NAME or `$type` moves — this removes REFERENCES to tokens, not tokens — so `CONTRACT_VERSION`
 * stands at 5.3.0, and `token-contract.ts --check` confirms it rather than this comment asserting it.
 *
 * 0.21.0: a part can say WHERE it sits per variant value, and a box that is deliberately not square can
 * bind its main axis (#990, switch's anatomy). `PartDef.positionWhen` is keyed on one variant axis and
 * projects onto the PARENT frame's `primaryAxisAlignItems`; `PartDef.width` binds the main-axis edge that
 * `size` — one key for both axes of a square — cannot express.
 *
 * The projection target was measured rather than chosen. #990's option 1 was `layoutGrow`/`layoutAlign`
 * on the child, described in the issue as the broader fix because it also closes #989; the vendored
 * typings say otherwise. `layoutAlign`'s MIN/CENTER/MAX are DEPRECATED — Figma moved counter-axis
 * alignment onto the frame as `counterAxisAlignItems`, with all children in an auto-layout frame now
 * required to share it — and `layoutGrow` is a 0/1 stretch flag along the primary axis. Both are stretch
 * flags. Main-axis PLACEMENT exists only on the parent. So option 1 leaves a thumb exactly as unable to
 * travel as it was, #989 stands on its own merits, and the narrower field is not a compromise.
 *
 * Two preconditions are asserted rather than reasoned about, because both project a clean no-op: the
 * parent's main-axis sizing must be `fixed` (a hugging parent is as long as its child, so start/center/end
 * are one coordinate — and `fill` maps to AUTO too, which is #989), and the part must be its parent's only
 * FLOW child (`primaryAxisAlignItems` distributes the whole group; `absolute`/`overlay` do not count,
 * which is what lets a focus ring share the track with the thumb).
 *
 * ITS CEILING, stated because it decides which future asks this can serve: MIN/CENTER/MAX is three
 * positions. A two- or three-value axis travels — a segmented control of three, tabs of three. A slider's
 * continuous thumb and a four-segment indicator are not expressible this way and need real offsets, which
 * is a different mechanism and not an extension of this one.
 *
 * No token name moved. Switch binds `control.size.*.{height,width,dot}`, all nine of which have been in
 * `token-contract.json` since 0.19.0 — `width` had been emitted since #951 and bound by nothing — so
 * `CONTRACT_VERSION` stands and `token-contract.ts --check` confirms it rather than this comment.
 * Switch's own token keys are def-local and outside the contract's surface; the `off.icon`→`off.indicator`
 * rename in the same PR is a def-local key made to match `BOX_PAINT_SLOTS`, not a public path. (#990)
 *
 * 0.20.0: overriding a ground re-derives its dependents' VALUES, not only their ratios (#979).
 *
 * 0.18.0 recomputed a dependent's ratio in a post-pass but could not touch its value — a dependent is
 * picked by a closure that has already returned. 134 dependents across the 18 input-less grounds were
 * left carrying the old ground's answer, 98 of them below their bar.
 *
 * THE ASSUMPTION, ASSERTED RATHER THAN REASONED ABOUT, which #979 made its own condition. It proposed
 * two passes and warned that an override must not feed back into itself across them. Reading the
 * resolution answers something stronger: an override's value is `ramps.get(palette).find(step).rgb` —
 * a pure function of the declared input, with nothing derived in it. It cannot depend on a pass, so it
 * cannot feed back, and the second pass would compute the identical tree at twice the cost. So this
 * ships as ONE pass with overrides substituted into the grounds derivation reads, and `test.ts` (a6)
 * asserts both halves: an overridden role's emitted colour IS its palette step, and a second
 * derivation over the same input is identical.
 *
 * #964's lesson applied twice over — "verify the assumption" and "check whether the assumption is the
 * BINDING one" are different steps. The binding property was never ordering; it was that an override
 * is an input, not a result.
 *
 * MEASURED, on the sparsest brand across the 18 grounds at two steps each. Below-bar dependents fall
 * 98 → 59, and the 59 that remain are all legitimate: 32 MOVED with their ground (the derivation
 * followed; the ladder simply ran out) and 27 are WASHES, whose colour is white or black by polarity
 * and has no ladder to move along at all. ZERO are stale. That last number is why `staleDependents`
 * is REMOVED rather than kept — #964 offered either, and the case it would have been kept for does
 * not exist.
 *
 * Arm B of `lint-ratio-truth` gains the distinction that removal depends on: a below-bar dependent of
 * an overridden ground is accepted only if it is a wash or its colour MOVED. Unchanged, not a wash,
 * ground moved — that is a value that did not re-derive, and it now fails by name. The class is
 * currently empty, which is what makes it a regression guard rather than a description.
 *
 * TWO SITES WERE INITIALLY WRONG and the gate caught them: `field.inverse.fill` and
 * `background.inverse.secondary` share a source candidate but are DIFFERENT ROLES, so substituting the
 * shared value moved a dependent whose own ground had not been overridden. The rule the fix encodes is
 * that the substitution takes the ground the dependent DECLARES, with that ground's own value as the
 * fallback — never a neighbour's.
 *
 * No emitted artifact moves: no corpus brand uses `overrides`. `CONTRACT_VERSION` stands at 5.3.0. A
 * minor because a brand that DOES use overrides now resolves different (correct) colours. (#979)
 * 0.19.0: `control.size.*` grows a third field, `dot` — the inner mark of a control whose mark is a
 * filled shape rather than a glyph, at half the box edge (#910, radio's anatomy). Three px per brand:
 * nb/wendys/harbor 8/10/12, aurora 6/8/10, so it shifts a rung with density exactly as `height` does
 * and is NOT the brand-invariant glyph ladder under a third name. #900 recorded that this dimension
 * would be "deliberately absent", derived by anatomy from `height` plus a declared inset; both
 * spellings of that are refused by the code as it stands (`inset` is `absolute`-only, and `sizing:
 * 'fill'` maps to `AUTO`, so padding-plus-fill projects a dot of zero), and closing either would put
 * `layoutGrow` through the plan type, the projector and both executors. The tier field is the smaller
 * change and `scale.ts` carries the correction. Radio also gains its `anatomy` block and
 * `figmaProperties` in the same PR, which moves no token name. (#910)
 *
 * 0.18.0: overriding a ground re-derives what was measured against it (#964). #956 gave the two
 * page/band grounds a declarative input and REFUSED them in the override layer; the other 18 had
 * nowhere to be sent, so they were applied and merely warned about, and their dependents kept the
 * ratio they derived from the old ground. Same "reports contrast it does not have" defect at 1–29
 * roles instead of 60.
 *
 * The asymmetry that decided the design, and it was measured rather than assumed. When a ground moves,
 * its dependents' RATIOS move — pure arithmetic over the final colours, recomputed here. Their VALUES
 * do not, and cannot be: `interactive.<c>.on-fill` is `onColor(rest.rgb)` from a local inside `iFill`,
 * not a lookup, so every dependent of the 18 is picked by a closure that has already returned. That
 * ruled out the obvious fix — ordering the override into derivation so later reads see it — because
 * derivation does not read roles back; it reads locals. The topological-order question #964 raised
 * never arose: the property that would have needed asserting is not the one that was binding.
 *
 * So the reported number becomes TRUE, and where an unchanged value no longer clears its bar the
 * final sweep names it. Measured: **67 dependents are left value-stale across the 18 grounds, and in
 * the worst case all 67 fall short — every one warned, none silent.** That is allow-and-flag doing
 * exactly what it promises. Making the VALUES re-derive needs the derivation rules reachable after
 * the fact, which is a larger change and is filed rather than smuggled in.
 *
 * DIRECT dependents only, which is correct rather than a shortcut: a dependent's own colour does not
 * change, so anything measured against IT is unaffected. The edge set covers `legibleFor` as well as
 * `against` — since 0.17.0 a wash reports the legibility of a second role it names, and moving that
 * desynchronises it identically.
 *
 * `rgbByRole` is now updated when an override applies. It was not, so a later override reading it for
 * its own `against` saw the pre-override colour: override ORDER was silently significant.
 *
 * The `staleDependents` warning is KEPT and reframed rather than removed. Its subject changed — no
 * longer "these report a number for a surface that is gone", now "these were GENERATED against the
 * old ground and were not re-derived". The per-role contrast warnings name which ones fall short;
 * this one is the only thing that says WHY, and that link became actionable exactly when the numbers
 * became true.
 *
 * NO emitted artifact moves — no corpus brand uses `overrides`, so the entire change is invisible to
 * `out/**`, and `CONTRACT_VERSION` stands at 5.2.0. A minor rather than a patch because a brand that
 * DOES use overrides gets different (correct) contrast metadata and new warnings. (#964)
 *
 * 0.17.0: `against` means ONE thing on every role (#963). It carried two opposite senses and nothing
 * in the data said which. On an ordinary role it names the surface the role sits on, and
 * `ratio = contrast(me, against)`. On a translucent WASH the arrow reversed: `against` named the INK
 * that ends up on top, and the ground the wash composited over was recorded nowhere at all.
 *
 * A wash now declares its shape. `against` is the GROUND — so the field reads the same way on every
 * role — and two new ones carry what used to be crammed into it: `contrastModel: 'ink-on-composite'`
 * and `legibleFor`, the ink that must survive on the composited result, which is what `min` actually
 * bounds. Both are emitted only on those 18 roles per mode, so an ordinary role's plain
 * `against` + `contrast` now means exactly what a consumer would assume it means.
 *
 * DECLARED at the `put` site, never inferred, for a concrete reason rather than a stylistic one:
 * `scrim.default` carries `alpha: 0.4` and is genuinely `ink-on-surface`, so reading the model off
 * "does it have an alpha" would misclassify a real role on day one. It is also #956's trap in new
 * clothes — a discriminator derived from the code it is meant to check agrees with itself.
 * `ResolvedRole` is a union, so `legibleFor` and `alpha` are REQUIRED exactly when the model is
 * `ink-on-composite`: the shape that caused this is no longer expressible.
 *
 * The payoff is verification. `lint-ratio-truth.ts` excluded all 18 outright — 1,296 ratios per run
 * taken on trust — because with the middle term missing they were not recomputable at all. It now
 * dispatches on the declared model and checks both shapes: **10,080 → 11,376 ratios**, plus a fifth
 * arm asserting the label and the shape agree in both directions.
 *
 * NO emitted colour moves and no token name moves, so `CONTRACT_VERSION` stands at 5.2.0. A minor
 * rather than a patch because the emitted METADATA SHAPE changed observably: `against` on 18 roles
 * per mode now names a different (and correct) token, and two fields appear beside it.
 *
 * One thing worth recording precisely, because the tempting summary is wrong: `ai.json`'s
 * `contrast_with.token` was ALREADY correct. That field wants the ink, and `against` happened to be
 * carrying it — every emitted `contrast_with.token` is byte-identical across this change. It had to
 * be repointed at `legibleFor` to STAY correct once `against` moved, which is a migration, not a fix,
 * and the unchanged output is the evidence it followed correctly. What it genuinely gains is
 * `composited_over`: "4.5:1 with text.primary" was never actionable without knowing which ground the
 * wash sat on to make it true, and that was recorded nowhere an agent could read. (#963)
 *
 * 0.16.0: a GROUND is declared, not overridden (#956). `surfaces.<mode>.inverseBase` joins `base` and
 * `floorStep`; the `overrides` post-pass now REFUSES a ground that has such an input, naming it; a
 * ground without one is applied and WARNED with the dependents it left stale; and every role below
 * its `min` is warned, whatever moved it.
 *
 * The defect: `overrides` runs AFTER derivation and rewrites one role. Correct for a leaf, silently
 * wrong for a ground — everything measured against it kept the value AND the ratio it derived from
 * the old one. Routed through it, an inverse band of `neutral 300` left 53 of 53 gated roles claiming
 * contrast they did not have, worst true ratio 1.00:1, and **zero warnings**, because the warning was
 * computed from the same stale number. Allow-and-flag degraded to allow-and-silently-lie.
 *
 * `base` never had this, and that is the whole design argument rather than a coincidence: it was
 * always declared where `resolve()` could see it, so moving it re-derives the ladder and everything
 * gated on it. Measured both routes to the same page color — `surfaces.light.base = 300` gives 0
 * falsely-passing and 0 stale ratios; `overrides['background.primary']` gives 33 and 41. The fix is
 * therefore not a new mechanism but the existing one extended to the band that lacked it.
 *
 * A minor rather than a patch because the accepted INPUT surface moved in both directions — one field
 * added, and a class of previously-accepted `overrides` entry now rejected. **No token name moves and
 * no color moves**, so `CONTRACT_VERSION` stands at 5.2.0 (576 guaranteed, unchanged).
 *
 * The one committed-artifact change is a reference string, and it was a real shipped error: nine
 * `against` fields still read `text.on-inverse` after #892 promoted that leaf to a group at
 * CONTRACT_VERSION 5.0.0. They resolved to no role, so the lookup fell back to the PAGE surface — the
 * one ground those roles are definitively not on. #922's rule ("a rename is finished when its
 * consumers are re-run, not when they are re-read") one layer down, where the consumer is DATA and so
 * never runs at all and no compiler complains.
 *
 * Also ships `lint-ratio-truth.ts` (gate 41). `test.ts`'s long-standing "all mode contrast contracts
 * hold" reads each role's own recorded `ratio`, so it asks the reporting path whether the reporting
 * path is right and agrees with itself in exactly the failure that matters. The new gate recomputes
 * from the FINAL emitted colors — 10,080 ratios across 5 corpus brands and 13 declared-surface cases
 * — and never reads `ratio` to decide the truth. It sweeps moved grounds deliberately: at defaults
 * every brand is clean, so a corpus-only run would report a confident zero over the only inputs that
 * cannot exhibit the bug. 18 translucent overlays are excluded and counted in its own output, because
 * they model `against` in the OPPOSITE direction (the role is the wash, `against` is the ink on top,
 * `ratio` is ink-vs-composite) — a one-field-two-meanings problem filed rather than renamed here.
 *
 * 0.15.0: the `inverse` lever is REMOVED — `levers.ts`, `BrandInput.inverse`, `Theme.inverseContext`,
 * the JSON-schema property and the three guards in `modes.ts`. The inverse surface-context is now
 * unconditional.
 *
 * A minor rather than a patch because the accepted INPUT surface shrank: a brand input carrying
 * `inverse` is now REJECTED by `theme-schema.json` (`additionalProperties: false`), where before it
 * was honoured. Rejecting beats silently ignoring, because `inverse: false` has no honest
 * normalization — the only thing the engine could still do is generate the family anyway, which is
 * the exact opposite of what the input asked for, so accepting it quietly would be a lie the author
 * gets no signal about. `'conventional'` → `'reduced'` (`normalizeDisabledStrategy`) is the precedent
 * for absorbing a retired input rather than rejecting it, and it does not apply here: that value had
 * a nearest honest answer to land on.
 *
 * NO emitted value moves and no name moves. Every corpus brand left the lever at its default, so all
 * four trees are byte-identical apart from the `notes` line that reported the lever's state.
 * `CONTRACT_VERSION` therefore STANDS at 5.1.0 — the counter-intuitive half, and worth stating
 * plainly: removing a LEVER is not removing a PATH. The 79 paths it could delete were already
 * `guaranteed`; the lever was a way to make the engine BREAK that guarantee, not something the
 * guarantee rested on. Removing it makes the contract true rather than changing what it says.
 *
 * Measured before the fix, not inferred: `inverse: false` took a brand from 236 emitted colour roles
 * to 157, and all 79 lost paths are in the committed `guaranteed` set — 13.9% of 570. #895 measured
 * 30 when it was filed; #892 grew it to 79 without anyone re-deciding, which is what turned
 * "document the sharp edge" into "remove it". (#895)
 *
 * 0.14.0: the `control.size.*` tier — a small control's OWN box (`{sm,md,lg}.{height,width}`), which
 * no token expressed. Purely additive: six new leaves per brand, no existing value or name moves, and
 * no brand's `dimension` ladder changes because every rung was already on the grid at the default base.
 *
 * A MINOR rather than a PATCH for the reason the whole tier exists: the artifact gains content a
 * consumer can observe, and it gains a Figma collection — `control.json`, the tenth FLOAT collection,
 * which the write plan, the paste path and the read-back all now expect by name. A brand's emitted file
 * set moving is compatibility-relevant even though nothing already emitted changed.
 *
 * The one thing worth reading twice is the DENSITY behaviour, because it is the property that says this
 * is a real tier and not a rename. `icon.size.*` is 16/20/24 in all four brands — fixed by construction,
 * since an off-grid glyph blurs. This ladder is windowed by the same `DENSITY_START` `componentSizes`
 * uses, so aurora (compact) emits 12/16/20 where nb, harbor and wendys emit 16/20/24. Had it come out
 * equal in all four it would have BEEN the glyph ladder under a new name, whatever its descriptions
 * claimed; `test.ts` asserts the divergence and the icon ladder's invariance side by side so the pair
 * reads as one decision. (#900)
 *
 * 0.13.0: the `surface` Figma collection (#893) — two modes, 122 rows, every one an alias into
 * `color`. A MINOR because the artifact SET grew: a consumer of `out/figma/**` sees two new files.
 *
 * `CONTRACT_VERSION` deliberately STANDS at 5.1.0, and the reason is the point rather than an
 * omission: this adds no DTCG path. The collection is Figma-only by design — `axes.ts` classifies its
 * axis as `crossesAs: 'absent'`, the only axis so classified — because it stores POINTERS into tokens
 * the projection already carries. A consumer reading DTCG sees exactly what #891 + #892 finalised.
 * The contract's job is "can my app still resolve the names it references", and nothing here moves a
 * name it could reference. (#893)
 *
 * 0.12.0: #892's last tranche — the seven remaining inverse borders, the five bold inverse semantic
 * fills, and `disabled.inverse.*`. All additive. `disabled` being ground-dependent is the part worth
 * naming: the family is cross-cutting across INTENT, which says nothing about the surface, and a
 * muted neutral picked to read as inert on a white page is nearly invisible on a near-black band.
 * Also ships `inverse-coverage.ts` — the register that makes a deliberate gap distinguishable from an
 * oversight, checked both directions in `test.ts`. (#892, #893)
 *
 * 0.11.0: `buildContent` takes a GROUND and runs twice, so the inverse band's 17 content roles per
 * family are generated by the same code as the page's rather than by a parallel near-copy. Values on
 * the page are byte-identical; the only value that could have moved is the old `on-inverse` leaf's,
 * and it does not — the promoted `on-inverse.primary` is the same `pickMostExtreme` against the same
 * ground. All 736 mode contrast contracts pass, which is the check that the derivation really is the
 * same rule and not a weaker one wearing its description. (#892)
 *
 * 0.10.0: the five `foreground.inverse.<semantic>-subtle` tints. Additive, and a PREREQUISITE rather
 * than a convenience: `semanticInk` gates each status ink against the floor AND against its own
 * tint, so an inverse status ink can only be "the same rule against a different ground" once the
 * inverse tint exists to be that second ground. Without them the inverse inks would gate on one
 * ground while their page siblings gate on two — a weaker rule under a description claiming the
 * stronger one. Polarity flips (light step on a dark band), same as the overlay wash. (#892)
 *
 * 0.9.0: nineteen inverse-context tokens the surface cascade (#871/#893) cannot alias without —
 * `field.inverse.*` (4) and the five states every interactive inverse column was missing (15). All
 * additive; no existing value or name moves. Two of the three are corrections rather than new design:
 * the inverse fill loop read a hand-written `['default','hover','pressed']` where the page's `iFill`
 * walks `FILL_STATES`, so `fill.focused` — the keyboard-focus fill on a dark hero — never existed;
 * and the neutral overlay wash is chosen by PAGE family, so on an inverse band it washed a near-black
 * surface with near-black. It now takes the opposite polarity, and both descriptions say which ground
 * they are for. (#892)
 *
 * 0.8.0: the #891 rename (see `CONTRACT_VERSION` 4.0.0 below) plus two prose fixes it exposed. The
 * inverse outline edge shipped a `$description` VERBATIM IDENTICAL to the page edge — "the outline
 * edge; follows the ink", never qualified for the dark band — because both came from one hardcoded
 * sentence in `iBorder`, which now takes the ground as a parameter. And `ai-metadata.ts` described
 * the whole inverse column as "interactive ink on an inverse surface", which is the same
 * over-generalization the rename fixes: three of its four sub-slots are not ink, so it dispatches
 * per sub-slot now. No VALUE moves — every emitted colour is byte-identical to 0.7.0 under a
 * different name — so this is the mirror of the case the two-version split usually illustrates:
 * names move, values do not. (#891)
 */
export const ENGINE_VERSION = '0.38.0';

/**
 * The guaranteed token-NAME surface. Starts at 1.0 while the engine is still 0.x, and that
 * inversion is intentional rather than a typo: the code is young, the names are settled. The
 * surface is 485 paths that every brand in the corpus emits — spanning both input dialects, a
 * hand-built legacy system (NB) and the sparsest input the engine accepts — with zero `$type`
 * disagreements between them. That is a thing worth promising, so it is promised at 1.x. (The
 * count moves with every bump below — 477 at 1.0.0 — so read it as "as of the latest entry".)
 *
 * 1.1.0: `on-inverse.border` (primary/neutral/destructive) landed in a PR that merged while this
 * one was in flight, adding 3 guaranteed paths — a MINOR bump, no removal or retype. (477 → 480)
 *
 * 1.2.0: the easing-role tier (`motion.easing-role.{default,enter,exit,emphasized}`) — a mode can
 * now re-point a ROLE to another curve instead of tuning a bezier per mode (#522/#527). 4 additive
 * paths, no removal or retype, so MINOR. (480 → 484)
 *
 * 2.0.0: the easing CURVE tier renamed to match what it names — a curve is a SHAPE, not a USE, and
 * the new role tier above left `motion.easing.{enter,exit,emphasized}` wearing names that belonged
 * to roles, not curves. Renamed to `motion.easing.{decelerate,accelerate,expressive}` (#531). 3
 * paths removed, 3 added — MAJOR, since a consumer resolving the old names gets nothing. The
 * removals are recorded in `DEPRECATIONS` below, each pointing at its replacement. (484 → 484)
 *
 * 2.1.0: `color.border.focus-inverse` — 1 added guaranteed path, no removal or retype, so MINOR.
 * Named as a flat suffix rather than nested under either existing leaf on purpose: both
 * `border.focus.inverse` and `border.inverse.focus` would turn a path consumers already reference
 * into a GROUP, which is a MAJOR break to add a token nobody asked to pay for. (#573) (484 → 485)
 *
 * 3.0.0: the interactive outline edge becomes stateful — the 6 bare `interactive.<c>.border` /
 * `interactive.<c>.on-inverse.border` leaves are REPLACED by `border.{rest,hover,pressed}` under
 * each. 6 removed, 18 added, so MAJOR; the removals are in `DEPRECATIONS` pointing at `border.rest`.
 * (#576) (485 → 497)
 *
 * This deliberately takes the opposite decision to 2.1.0 above, and the difference is the point.
 * 2.1.0 refused to turn an existing leaf into a group and paid a naming asymmetry
 * (`border.focus-inverse`) to keep a MINOR. Here the leaf becomes a group anyway, because the reason
 * to avoid it was the cost to consumers and the project is pre-alpha with none: the flat-suffix
 * dodge buys nothing and would leave `border-hover` permanently out of step with the
 * `{rest,hover,pressed}` shape that `fill.*` and `text.*` already use. Choose the right shape when
 * the break is free; pay for compatibility when someone is actually holding the other end.
 *
 * The alias that would have made this a MINOR is not merely undesirable, it is unrepresentable: a
 * node cannot be both a token (`$value`) and a group. Probed against stock Style Dictionary, a
 * `border` leaf carrying `rest`/`hover`/`pressed` children emits ONLY the leaf and drops all three
 * children silently — so the states would be invisible to exactly the conforming consumers #631's
 * gate exists to protect. A plausible-looking result rather than an error, which is the #575 shape.
 *
 * 9.3.0: `control.size.{sm,md,lg}.inset` plus `core.dimension.5` — four guaranteed paths added, 0
 * removed, 0 retyped, so MINOR (#997). The switch track reads the inset as uniform padding so its thumb
 * clears the track's ends; the dimension rung is the grid entry that inset aliases at the default
 * density, which the grid extras now supply. Additive: every existing `control.size.*` and
 * `core.dimension.*` name still resolves, and no value of an existing path moves. The level was DERIVED
 * from `token-contract.ts --check` (it reported MINOR and named all four), not chosen here.
 *
 * 9.2.0: `control.size.{sm,md,lg}.line-box` — three guaranteed paths added, 0 removed, 0 retyped, so
 * MINOR (#1201). The selection-control alignment box (see `ENGINE_VERSION` 0.32.0 above) reads these to
 * size itself to one line of its label. Additive: a consumer holding any existing `control.size.*` name
 * still resolves, and no value of an existing path moves. `token-contract.ts --check` confirms the count.
 *
 * 9.1.0: `radius.capsule` — one guaranteed path added, 0 removed, 0 retyped, so MINOR (#1163). The
 * `controlShape: pill` lever needs a radius rung whose clamp guarantees a full pill at any control height;
 * `radius.round` (128px) tops out at a 256px control, so a distinct 999px sentinel rung is emitted for every
 * brand and the lever repoints to it. Additive: a consumer holding any existing radius name still resolves,
 * and nothing was renamed or retyped — which is why this is MINOR and not the MAJOR a rename would force. It
 * is `brandDependent`-clean too (every brand emits it, so it is guaranteed, not conditional). (566 → 567)
 *
 * 9.0.0: THE `appearance` LEVEL IS DELETED AND THE VALUES TAKE THE SHORT NAMES BACK. 225 guaranteed paths
 * removed, 104 added, 0 demoted, so MAJOR — every `color.appearance.<X>` is now `color.<X>`, and a consumer
 * holding `color.appearance.text.primary` resolves to nothing. (687 → 566)
 *
 * THE MEASUREMENT CAME FIRST AND ITS SHAPE IS THE INTERESTING PART. 243 emitted value-tier paths move, and
 * the naive reading is "243 removals, 243 additions". It is 225 and 104, for two independent reasons that
 * happen to point the same way:
 *
 *   · 18 of the 243 are not GUARANTEED — the `overlay` slots 7.0.0 demoted, nine on each ground — so they
 *     are not in the baseline's `guaranteed` and cannot be removals from it. 243 − 18 = 225.
 *   · 130 of the 243 short target names ALREADY EXIST, because they are exactly the names the pointer tier
 *     held. `color.text.primary` does not appear in `added`: it was guaranteed at 6.0.0 as a pointer and is
 *     guaranteed now as a value, and what changed underneath it is that it can vary by appearance mode —
 *     which is a `$value` fact and not a contract fact. So the additions are the inverse roles and nothing
 *     else: 113 inverse paths minus the 9 brand-dependent ones = 104.
 *
 * **THAT SECOND BULLET IS THE MOST CONSEQUENTIAL SENTENCE IN THIS ENTRY.** A consumer who has been writing
 * `color.text.primary` since before 3.0.0 is untouched by #1013 AND by #1148 — the short name never moved,
 * only what stood behind it. The entire 225-path break falls on consumers who took #1013's advice and moved
 * to the appearance tier. That is the cost of the split, paid on the way out, and it is why the guarantee
 * is stated on names rather than on tiers.
 *
 * ALL 243 GET `DEPRECATIONS` ENTRIES ANYWAY, including the 18 no arm can check. The block says which lines
 * carry a guarantee and which ride along; do not read that table as uniformly verified.
 *
 * NOTHING IS RETYPED and nothing is demoted, which is worth saying because a tier deletion sounds like it
 * should shuffle the guarantee. It does not: every one of the 130 short names was already guaranteed across
 * the whole corpus as a pointer, and a pointer and a value have the same `$type`.
 *
 * 8.0.0's entry below spells its paths `color.appearance.*`, deliberately — the record of what was decided
 * then. Same rule the `DEPRECATIONS` table follows: history does not move, live names do. (#1148)
 *
 * 8.0.0: EVERY INVERSE ROLE MOVES TO ONE TOP-LEVEL `inverse` GROUP. 104 guaranteed paths removed, 106
 * added, so MAJOR — a rename is a removal plus an addition, and a consumer holding
 * `color.appearance.text.on-inverse.primary` resolves to nothing after it. (685 → 687)
 *
 * THE MEASUREMENT CAME FIRST, because the bump was genuinely in question. #1140 renames 113 emitted
 * appearance roles, and whether that is a MAJOR or no contract move at all depends entirely on how many
 * of the 113 are GUARANTEED rather than value-tier. Counted against the committed baseline: 104 of the
 * 113 carry an `inverse`/`on-inverse` segment in `guaranteed`, and 0 appear in `brandDependent`. The 9
 * that are neither are `interactive.{primary,neutral,destructive}.inverse.overlay.{hover,pressed,selected}`,
 * demoted in 7.0.0. So the answer is MAJOR, on 104 paths, and it would have been "no bump" had the inverse
 * roles been value-tier — which is the version of this change that was imagined before anyone counted.
 *
 * WHY THE ADDITIONS ARE 106 AND NOT 104. 103 of the removals are pure renames; the 104th
 * (`border.inverse.default`) is DROPPED as a duplicate — byte-identical to `border.inverse.primary` in
 * every mode — so it renames INTO a path that already has a claimant. Three paths are genuinely new, and
 * the third is the one worth naming because nobody adds it by hand:
 * `color.appearance.border.tertiary`, `color.appearance.inverse.border.tertiary`, and
 * `color.border.tertiary` — the POINTER row the new non-inverse role gets automatically, since pointer
 * membership is uniform over non-inverse roles since 7.1.0. `border` was the only surface/ink family
 * stopping at `secondary` while `background`, `foreground`, `text` and `icon` all carry three rungs, and
 * adding the rung on both grounds at once is what keeps `inverse(X) = inverse. + X` true with no
 * exceptions. The inverse rung gets no pointer row, by the same rule: an inverse role is bound by name.
 *
 * WHAT THE RENAME BUYS, stated as the contract sees it: the inverse marker had THREE positions
 * (`background.inverse.primary` @3, `interactive.primary.inverse.fill.rest` @4, `text.on-inverse.primary`
 * @3 with a different spelling), so "is this path inverse?" was a two-alternative any-depth question. It
 * is now a prefix. `on-` stops carrying two meanings for the second and last time — 4.0.0 made it mean
 * ink-on-a-thing everywhere and kept `on-inverse` as the one member whose thing was a GROUND rather than
 * a fill; 8.0.0 removes that member, so `on-` takes a ground and nothing else.
 *
 * 7.1.0's entry below still spells these paths the old way, deliberately — it is the record of what was
 * decided then, and its `color.appearance.border.inverse.focus` is now `color.appearance.inverse.border.focus`.
 * Same rule the `DEPRECATIONS` table follows: history does not move, live names do. (#1140)
 *
 * 7.1.0: `color.scrim.default` comes BACK. One added guaranteed path, no removal and no retype, so
 * MINOR — the smallest possible contract move, and it is the whole contract cost of #1133's revert of
 * inverse from mode-encoding to name-encoding (`ENGINE_VERSION` 0.28.0).
 *
 * WHY A SINGLE PATH, when the change removes a whole Figma mode. Because the mode was never in the
 * contract. The pointer tier carries a role's SHORT NAME and the appearance tier carries its VALUES; the
 * second mode changed which value a Figma variable resolved to and moved no DTCG name, which is exactly
 * the case the two-version split exists for. 6.0.0 below says so in its own words: "WHAT DTCG DOES NOT
 * CARRY: the `inverse` MODE."
 *
 * So the only path that moves is the one the mode had been keeping OUT. 6.0.0 removed
 * `color.scrim.default` because the role has no inverse counterpart and `inverse-coverage.ts` disposed
 * the gap as `omit` — no pointer row, no short name. With one mode there is no per-surface behaviour to
 * be undecided about, membership becomes uniform (every non-inverse role gets a pointer), and the role
 * rejoins the tier: 128 rows → 129.
 *
 * THE 113 INVERSE PATHS DO NOT COME BACK, and that is a decision rather than an oversight. They stay
 * `color.appearance.*.inverse.*` only, because naming an inverse leaf at the appearance tier is HOW
 * name-encoding works — a component variant binds `color.appearance.border.inverse.focus` deliberately,
 * the way `focus-ring` already does. A short `color.border.inverse.focus` alias would be a second
 * spelling for the leaf whose point is that it is named on purpose. Whether the pointer tier should
 * eventually offer short names for them is filed as its own question, not decided here.
 *
 * The `['scrim', ['default']]` DEPRECATIONS entry from 6.0.0 is retired in the same change — see the
 * note where it stood. `classify` checks a `replacedBy` against the live set and never a `path`, so a
 * deprecation for a path the engine emits again passes every gate while telling consumers to migrate off
 * a working name.
 *
 * 7.0.0: THE `core` TIER, plus the sixth corpus member. `palette.*`, `dimension.*` and `font.*` move
 * under `core.*` — 164 removed and 164 added — and 30 further paths stop being GUARANTEED without
 * ceasing to be emitted. Both halves are MAJOR, and the second one is why the two are worth separating.
 * (714 → 684)
 *
 * THOSE TWO HALVES ARE THE WHOLE ATTRIBUTION. The lane that ships this bump also puts a BRAND NAMESPACE
 * on every Figma variable (`ENGINE_VERSION` 0.27.0 above), and that change moves the contract by NOTHING.
 * Measured on both baselines — 714 paths before, 684 after — ZERO carry a brand-namespace root, because
 * `guaranteed` is keyed BELOW the configurable root (the note at the top of `token-contract.json` says so)
 * and the namespace IS that root. A brand switching from `prism` to `nbds` re-roots every emitted name and
 * breaks no reference the contract ever promised.
 *
 * Written out because the number cannot carry it. 7.0.0 is 7.0.0 whichever change is credited, so a bump
 * attributed to the namespace is a false record with no gate able to fire on it — the classic shape being
 * that the *value* is right and only the *reason* is wrong. And the misreading is costly in a specific
 * direction: someone taking 7.0.0 as evidence that renaming a root is BREAKING will treat `theme.root` as
 * frozen, and it is a lever precisely because it is not. (#1097)
 *
 * WHY A TIER AND NOT THREE TOP-LEVEL NAMES. These are the RAW PRIMITIVES the semantic layer is built
 * from, and a consumer reaching one directly is what `eval.ts`'s primitive-leak metric exists to
 * measure. Under one segment that metric is a one-segment test (`path.split('.')[0] === 'core'`) instead
 * of a membership test against a remembered list of three — so a fourth primitive group is flagged
 * automatically rather than scoring as a clean semantic reference, which is the one answer the metric
 * exists to prevent. It also makes the DTCG tree agree with Figma, where the same three groups are now
 * one `core` collection (`ENGINE_VERSION` 0.27.0 above).
 *
 * `opacity` is pointedly NOT among them. It is directly consumable, with no semantic layer to reach for
 * instead (#79), so it stays at the root and the primitive tier holds exactly three groups.
 *
 * Every one of the 164 removals ships a `DEPRECATIONS` entry pointing at `core.<the same path>`, held
 * LITERALLY for #1013's reason: a table generated from the transform that caused the removal agrees with
 * any bug in the transform, and the refusal could never fire (`docs/34`). Written out, a wrong segment
 * fails both ways — `path` misses the removed set, and `core.<wrong segment>` misses the live set.
 *
 * THE SIXTH CORPUS MEMBER, which rides along because it moves the same baseline. `minimal-levers` is
 * `MINIMAL_BRAND` with `outlineInteraction: 'none'` and `typography.displayCeiling: 'sm'` — two levers no
 * other member pulls, which is exactly why 30 paths were being promised: on the strength of nobody
 * having pulled them. 27 are `interactive.<c>.overlay.{hover,pressed,selected}` and their inverse and
 * surface-tier twins (a brand whose outline interaction is `none` emits no overlay at all), and 3 are
 * `type.display.{md,lg,xl}.strong` (a brand whose display ceiling is `sm` ships no larger rung). They
 * move `guaranteed` → `brandDependent`.
 *
 * A DEMOTION IS NOT A REMOVAL, and `classify` reports it as its own thing rather than as 30 removals
 * shipping no migration. The engine still emits every one of the 30 — for any brand that does not pull
 * the lever — so there is no replacement path to point at and a `DEPRECATIONS` entry would be a lie. It
 * is still MAJOR: what moved is the PROMISE, and a consumer who read the guarantee and referenced
 * `interactive.primary.overlay.hover` is now referencing something their next brand may not emit. That
 * is the whole content of this half of the bump, and the member adds no path no existing member emits,
 * so nothing else about the surface moves. (#957)
 *
 * AND A DEMOTION IS NOT ROT EITHER, which is where the dangling check had to learn the difference. 9 of
 * #1013's deprecations point at `color.appearance.interactive.<c>.inverse.overlay.<state>` — three of the
 * demoted paths per colour — and the check, which read the GUARANTEED set only, called all 9 rot and
 * exited 1. They are not rot: the replacement exists, conditionally. So the check reads guaranteed ∪
 * brandDependent now, and the conditional ones are REPORTED as `conditionalMigrations` rather than
 * accepted in silence. Widening without reporting would have been the same as deleting the check for
 * those 9 — a consumer following one of those pointers needs to know the answer depends on a lever their
 * own brand may have set. (#1102, #1097, #957)
 *
 * 6.0.0: THE TIER SWAP. `color.*` and the surface layer trade names. 114 removed, 242 added, so MAJOR,
 * and every removal ships a `DEPRECATIONS` entry pointing at `color.appearance.<the same path>`.
 * (586 → 714)
 *
 * The value tier — one leaf per resolved role, varying by appearance mode — moves from `color.*` to
 * `color.appearance.*`. The surface tier takes the vacated name: 128 leaves, one per role that has a
 * default/inverse pair, each a POINTER into `color.appearance.*`. In Figma the same two collections
 * trade names, so `color` is what a designer picks from and `color.appearance` is what it resolves to.
 *
 * WHY IT IS WORTH A MAJOR, in one sentence: a component that binds `color.<role>` becomes
 * surface-responsive with no change to the component, because the name it already binds now resolves in
 * the layer that has a mode. Before the swap that responsiveness was opt-in per binding and nothing
 * reported a binding that had missed it.
 *
 * WHY IT COMPOSES INSTEAD OF MULTIPLYING, which is the finding that made it safe to carry into DTCG
 * rather than keep Figma-only: a surface projection carrying a NAME agrees with the appearance tier in
 * 2560 of 2560 cells, where one carrying a VALUE disagrees in 1510 — measured over 128 alias rows × 4
 * appearances × 5 corpus brands, 0.25.0's six veil rows included. Composition is a property of the
 * pointer, not of the axes. (#1027)
 *
 * WHY 114 AND NOT 242. A role WITH an inverse counterpart keeps its short name — the path does not move,
 * only what it resolves to, so there is nothing to deprecate and nothing for a consumer to rewrite. The
 * 114 are the roles with no counterpart: 113 inverse roles, which cannot have a surface row because
 * inverse-ness is what the modes express, plus `scrim.default`, whose gap `inverse-coverage.ts` disposes
 * as `omit` rather than a self-alias. So the break falls exactly on the paths that were never
 * surface-contextual, and the paths an app actually references are untouched.
 *
 * WHAT DTCG DOES NOT CARRY: the `inverse` MODE. The pairing lives in the Figma collection's second mode;
 * DTCG emits the default column only. A surface overlay is a fifth overlay file per brand plus a decision
 * about where the surface axis sits in the extension namespace — #1027's work, deliberately not this
 * bump's. (#1013)
 *
 * 5.4.0: 6 added guaranteed paths, no removal and no retype, so MINOR — `color.veil.{dark,light}.
 * {large,body,enhanced}`, the media veil: a wash laid over a photograph so text on top clears a stated
 * contrast floor at the image's worst pixel. Rungs are named by the FLOOR each buys (3 / 4.5 / 7), not
 * by its alpha, because the alpha differs per polarity and the floor does not. (#1030) (580 → 586)
 *
 * ONE PROPERTY HERE IS WORTH PROMISING AND IS NOT VISIBLE IN THE PATH COUNT: these six are the first
 * colour paths in the contract that carry the SAME value in every mode. Every other colour role varies
 * by appearance, so a consumer reading a colour token has had to assume mode variance. A veil composites
 * over an unknown image, and an image has no polarity the theme can read — the derivation's ground is
 * sRGB white (under a dark veil) or sRGB black (under a light one), a constant rather than a theme
 * surface — so no mode input reaches the result. The invariance is a consequence of the derivation, not
 * a convention someone could relax; `test.ts` §9c asserts it per leaf per mode, and any mode variance
 * that did appear would also surface as an EXTRANEOUS leaf in `lint-overlay-completeness.ts`.
 *
 * AND WHY THEY ARE NOT UNDER `scrim.*`, since that is the single most likely future "cleanup". A scrim
 * is one mode-VARYING role behind a modal (40/60/60/70 by mode) that no designer picks; a veil is six
 * invariant variants a designer picks per image. Filed together, a picker would show `scrim.default`
 * beside `scrim.dark.40` with nothing but folklore distinguishing their behaviour — membership-by-
 * location, which is the defect `payload-manifest.json` exists to remove one tier down. `overlay` was
 * unavailable for the same class of reason: it already names the DTCG base+overlay projection.
 *
 * 5.3.0: 4 added guaranteed paths, no removal and no retype, so MINOR. Three are the intended ones —
 * `control.size.{sm,md,lg}.dot`, the inner mark of a control that draws one as a filled shape (radio's
 * dot; a switch's thumb next). (576 → 580)
 *
 * THE FOURTH IS `dimension.10`, and it is worth naming rather than absorbing into the count, because it
 * is the tier change reaching a layer nobody edited. Every `control.size.*` leaf ALIASES a dimension
 * step rather than minting a literal, so `buildDims` feeds the control px into the grid as extras
 * (#274). `dot` is half an odd-multiple height, and 10px was on NEITHER the base-4 ladder NOR the space
 * extras NOR the icon ladder — at the DEFAULT baseUnit, in every corpus brand. So the grid gains a step
 * and a consumer gains a guaranteed name. Additive either way, but a fourth path in a diff that
 * predicted three is the kind of surprise a MINOR is supposed to absorb visibly.
 *
 * THE GROUP SHAPE PAYING OFF, and worth one sentence because 5.2.0 below argued for it prospectively.
 * That entry chose a group over a leaf on the reasoning that a switch's track would force a second
 * field inside the same release, and 5.0.0 is what promoting a leaf costs. The third field arrived from
 * a def nobody had projected yet, and it is additive at MINOR — where the leaf shape would have made
 * the same addition a MAJOR with two `DEPRECATIONS` entries. The argument was for one anticipated
 * field; the return came from an unanticipated one, which is the stronger case for the rule. (#910)
 *
 * 5.2.0: 6 added guaranteed paths, no removal and no retype, so MINOR — `control.size.{sm,md,lg}.
 * {height,width}`, a small control's own box (checkbox square, radio circle, switch track). (570 → 576)
 *
 * Authored as a GROUP per rung from the start, and that is the whole reason it is a MINOR. The obvious
 * cheaper shape was one leaf per rung — a checkbox and a radio are square and need a single number —
 * with a switch's track ratio bolted on later. 5.0.0 above is what that costs: `text.on-inverse` was
 * authored as a leaf under an unstated convention, and promoting it to a group was a MAJOR, two
 * `DEPRECATIONS` entries and a rename mechanism, for a token whose VALUE never moved. The switch is
 * the third instance in the same tranche and its track is not square, so the group was going to be
 * needed inside the same release. Pay for the right shape while the break is still free. (#900)
 *
 * 5.1.0: 17 added guaranteed paths, no removal and no retype, so MINOR — `border.inverse.{primary,
 * secondary,brand,danger,info,success,warning}` (7), `foreground.inverse.<semantic>` (5) and
 * `disabled.inverse.*` (5). This completes #892's audit: 123 roles had no inverse counterpart when it
 * opened, and 11 remain by DECISION rather than by omission, every one named in `inverse-coverage.ts`
 * with its reason. (#892) (553 → 570)
 *
 * 5.0.0: `text.on-inverse` and `icon.on-inverse` become GROUPS of 17 roles each. 2 removed, 34
 * added — MAJOR, and both removals ship a `DEPRECATIONS` entry pointing at the promoted tier. The
 * leaf's VALUE does not move; it acquires a path segment.
 *
 * Principled rather than a new inconsistency: `on-brand` is ink on a FILL — a bounded element hosting
 * one label, where one ink is all it can need — while `on-inverse` is ink on a SURFACE, an unbounded
 * region hosting a full type hierarchy. A hierarchy needs the role set. `on-` still means exactly one
 * thing, ink on the named ground; what changed is how much that ground can hold.
 *
 * The six `on-*` inks are excluded from the inverse set on principle, not by likelihood: `text.on-brand`
 * is ink on a fill and the FILL is the ground, so a brand-filled badge inside a dark hero is still
 * brand-filled. The case where a fill does change on an inverse ground is `interactive.<c>.inverse.on-fill`.
 *
 * These were the LAST two context-node leaves — measured before writing them, seven of the nine were
 * already groups — so this completes the leaf-to-group migration rather than continuing it. How FUTURE
 * context nodes are authored is a separate change. (#892) (521 → 553)
 *
 * 4.2.0: 5 added guaranteed paths — `color.foreground.inverse.{brand,danger,info,success,warning}-subtle`.
 * No removal, no retype, so MINOR. `foreground.inverse` was already a group, so no leaf-to-group
 * promotion; the count of those stands at one (`border.inverse`, 4.0.0). (#892) (516 → 521)
 *
 * 4.1.0: 19 added guaranteed paths, no removal and no retype, so MINOR. `field.inverse.{fill,
 * border.rest, border.hover, placeholder}` — tranche 1 is four field components and a checkbox on an
 * inverse band had nothing to bind — plus `interactive.<c>.inverse.{fill.focused, fill.selected,
 * overlay.hover, overlay.pressed, overlay.selected}` across the three families, which completes the
 * inverse column to exactly the page column's 15 slots. (#892) (497 → 516)
 *
 * NOT the whole of #892. The audit is 123 leaves without an inverse counterpart; this covers 19 of
 * them and the remaining ~59 are blocked on a measured payload ceiling, not on a decision — see the
 * issue filed from this branch. Recorded here because a reader comparing the audit's number against
 * this bump will otherwise read the gap as an oversight, which is the exact confusion #892 exists to
 * end.
 *
 * 4.0.0: `on-` is made to mean exactly one thing. It carried two — INK ON the named thing
 * (`on-fill`, `text.on-brand`) and CONTEXT, "the variant used when placed on" — and both appeared in
 * a single path: `interactive.primary.on-inverse.on-fill` was context-qualifier followed by ink-on,
 * with no way to tell which sense applied at which segment. The context sense loses the prefix:
 * `interactive.{primary,neutral,destructive}.on-inverse.*` → `.inverse.*`. 30 removed, 30 added.
 *
 * `text.on-inverse` and `icon.on-inverse` are DELIBERATELY NOT renamed, and that is the part worth
 * reading twice. They are ink on the inverse ground — the `on-` sense that survives — and they are
 * the sixth member of a family (`on-brand`, `on-danger`, `on-info`, `on-success`, `on-warning`)
 * whose other five keep the prefix. `modes.ts` generating `on-inverse` immediately after the
 * `on-${r}` loop is the generator already saying so. Renaming them would have traded one
 * inconsistency for another and collided with `background.inverse`, which is the ground ITSELF
 * rather than ink on it — precisely the distinction `on-` exists to carry. The rule is not "no
 * token spells `on-inverse`"; it is "`on-` means ink-on, everywhere". (#891)
 *
 * `border` moves in the same bump, for a different reason: it was the one family spelling the
 * qualifier THREE ways at once — `border.inverse` (segment) and `border.focus-inverse` (hyphenated
 * suffix). Both become `border.inverse.{default,focus}`. 2 removed, 2 added; `default` for the
 * promoted leaf follows `text.link.default`.
 *
 * That reverses 2.1.0 above on its own stated terms rather than against them. 2.1.0 refused the
 * leaf-to-group cascade because it was "a MAJOR break to add a token nobody asked to pay for" — the
 * cost was the MAJOR, and we are already paying one here, with no consumers holding the other end.
 * 3.0.0 wrote the rule this follows: choose the right shape when the break is free.
 *
 * Context-before-role is why `border.inverse.focus` and not `border.focus.inverse`. After this bump
 * every family that has an inverse variant puts context first — `background.inverse.<tier>`,
 * `foreground.inverse.<tier>`, `interactive.<palette>.inverse.<role>.<state>` — and `border` becomes
 * the fourth rather than the lone exception. It is also the shape #892 needs: it adds inverse
 * counterparts for border's other seven roles, which land INSIDE a container that now exists. The
 * role-first alternative would have needed a separate leaf-to-group cascade per role, seven times,
 * each one putting context last. (#891) (497 → 497)
 */
export const CONTRACT_VERSION = '9.3.0';

/** A guaranteed path that was removed, and where its consumers should point instead. */
export type Deprecation = {
  /** The retired path, below the configurable root (`color.text.primary`, not `prism.color…`). */
  path: string;
  /** The path that replaces it. Must exist in the CURRENT guaranteed set — gated, see `classify`. */
  replacedBy: string;
  /** The `CONTRACT_VERSION` that retired it. */
  since: string;
};

/**
 * Renames that have shipped. NOT empty: the guaranteed surface has been renamed before. #531
 * (CONTRACT_VERSION 2.0.0) renamed `motion.easing.{enter,exit,emphasized}` to
 * `motion.easing.{decelerate,accelerate,expressive}` — the three entries below are that rename. It
 * exists because without it "MAJOR" is a dead end: a consumer learns their build broke but not what
 * to write instead. With it, a removal ships its own migration, mechanically appliable by a codemod
 * or an agent.
 *
 * `classify` refuses a `replacedBy` that is not itself in the live guaranteed set, so an entry
 * cannot rot into a pointer at nothing — the failure mode that makes most deprecation tables
 * worse than none.
 */
/** The 15 slots every `inverse.interactive.<palette>.*` group carries — spelled once, used three times. */
const INVERSE_INTERACTIVE_SLOTS = [
  'border.hover', 'border.pressed', 'border.rest',
  'fill.focused', 'fill.hover', 'fill.pressed', 'fill.rest', 'fill.selected',
  'on-fill',
  'overlay.hover', 'overlay.pressed', 'overlay.selected',
  'text.hover', 'text.pressed', 'text.rest',
] as const;

/**
 * ── WHERE EVERY INVERSE ROLE LIVES NOW (#1140) ──────────────────────────────────────────────────
 *
 * `[old group, new group, leaves]` for all 113 inverse roles: the group as #1013 and #1140 each retired
 * it, the group the engine emits today, and the leaves underneath. Two eras of `DEPRECATIONS` read this
 * table, which is a deliberate choice and not a shortcut, so the reasoning is worth stating.
 *
 * WHY ONE TABLE FOR TWO BUMPS. #1013 removed `color.<group>.<leaf>` (the short spelling) and #1140
 * removes `color.appearance.<group>.<leaf>` (the value-tier spelling) — the SAME 113 `(group, leaf)`
 * pairs, prefixed differently, because #1013's removals were exactly the roles with no pointer row, which
 * is exactly the inverse set. And both eras' `replacedBy` must name the SAME live path, since a
 * deprecation points at what exists today. So `replacedBy` is not two facts to be held independently; it
 * is one fact — "where does this role live now?" — and two copies of it are free to diverge, with the
 * older copy rotting silently. That is not hypothetical: the three entries at 3.0.0 below were renamed
 * out from under twice, and the comment there records both catches.
 *
 * WHAT STAYS LITERAL, AND WHY THAT IS THE PART THAT MATTERS. Both group columns and every leaf are
 * WRITTEN OUT, exactly as #1013's table already wrote them. Nothing here is derived from `modes.ts`,
 * `surfaceRowsFor`, or whatever performed the move — `docs/34` shape 1: a table generated from the
 * transform that caused the removal agrees with any bug in that transform, so `--accept`'s refusal of an
 * unjustified removal could never fire. Held literally, a wrong segment fails BOTH ways: `path` misses
 * the removed set (an unjustified removal) and `replacedBy` misses the live set (a dangling deprecation).
 *
 * `border.inverse.default` IS ABSENT FROM THE `border` ROW ON PURPOSE. #1140 drops it as a duplicate
 * rather than renaming it, so it has no 1:1 target and gets its own literal entry in each era's block
 * below, pointing at `inverse.border.primary` — the path it was byte-identical to. Folding it into this
 * row would claim a rename that did not happen.
 */
const INVERSE_GROUP_MOVES: Array<[string, string, readonly string[]]> = [
  ['background.inverse', 'inverse.background', ['primary', 'secondary', 'tertiary']],
  ['border.inverse', 'inverse.border', ['brand', 'danger', 'focus', 'info', 'primary', 'secondary', 'success', 'warning']],
  ['disabled.inverse', 'inverse.disabled', ['border', 'fill', 'icon', 'on-fill', 'text']],
  ['field.inverse', 'inverse.field', ['border.hover', 'border.rest', 'fill', 'placeholder']],
  ['foreground.inverse', 'inverse.foreground', ['brand', 'brand-subtle', 'danger', 'danger-subtle', 'info', 'info-subtle', 'primary', 'secondary', 'success', 'success-subtle', 'tertiary', 'warning', 'warning-subtle']],
  // `text`/`icon` were the two families spelling the marker `on-inverse`, and #1140 is where that
  // spelling ends: `on-` takes a GROUND, and an inverse SURFACE is a context rather than a ground, so
  // the ink folds into the same `inverse.` group as everything else (`inverse.text.primary`).
  ['icon.on-inverse', 'inverse.icon', ['brand', 'brand-subtle', 'danger', 'danger-subtle', 'info', 'info-subtle', 'link.default', 'link.focused', 'link.hover', 'link.visited', 'primary', 'secondary', 'success', 'success-subtle', 'tertiary', 'warning', 'warning-subtle']],
  ['text.on-inverse', 'inverse.text', ['brand', 'brand-subtle', 'danger', 'danger-subtle', 'info', 'info-subtle', 'link.default', 'link.focused', 'link.hover', 'link.visited', 'primary', 'secondary', 'success', 'success-subtle', 'tertiary', 'warning', 'warning-subtle']],
  ['interactive.primary.inverse', 'inverse.interactive.primary', INVERSE_INTERACTIVE_SLOTS],
  ['interactive.neutral.inverse', 'inverse.interactive.neutral', INVERSE_INTERACTIVE_SLOTS],
  ['interactive.destructive.inverse', 'inverse.interactive.destructive', INVERSE_INTERACTIVE_SLOTS],
];

/** The one inverse role #1140 DEDUPES rather than renames — see the note above. */
const INVERSE_DEDUPED = { group: 'border.inverse', leaf: 'default', replacedBy: 'inverse.border.primary' };

export const DEPRECATIONS: Deprecation[] = [
  { path: 'motion.easing.enter', replacedBy: 'motion.easing.decelerate', since: '2.0.0' },
  { path: 'motion.easing.exit', replacedBy: 'motion.easing.accelerate', since: '2.0.0' },
  { path: 'motion.easing.emphasized', replacedBy: 'motion.easing.expressive', since: '2.0.0' },
  // #576 — the outline edge gained states, so each bare leaf became a group. `border.rest` is the
  // honest replacement: it is the state the single value actually WAS (the resting edge), so a
  // consumer following the pointer keeps the same intent rather than silently adopting a hover.
  // Recorded even though the project has no consumers yet — `classify` refuses a `replacedBy` that
  // is not in the live guaranteed set, so these 6 entries are a free check that the rename landed on
  // paths that exist, in a diff where 6 removals and 18 additions are otherwise easy to fat-finger.
  { path: 'color.interactive.primary.border', replacedBy: 'color.interactive.primary.border.rest', since: '3.0.0' },
  { path: 'color.interactive.neutral.border', replacedBy: 'color.interactive.neutral.border.rest', since: '3.0.0' },
  { path: 'color.interactive.destructive.border', replacedBy: 'color.interactive.destructive.border.rest', since: '3.0.0' },
  // These three were authored at 3.0.0 pointing at `on-inverse.border.rest`, which #891 renamed out
  // from under them. The `path` is history and does not move — it is what the retired leaf was
  // literally called — but `replacedBy` must name something the engine still emits, so it follows
  // the rename. This is the rot case the gate exists to catch, and it caught it: `--check` failed
  // with "3 deprecation(s) point at a path the engine does not emit" before this line was touched.
  // …and #1013 renamed them out from under them a SECOND time, for the same reason and with the same
  // rule: `path` is history and never moves, `replacedBy` follows the live name. Every inverse role is
  // now under `color.appearance.*` because `color.*` is the surface tier and carries no inverse roles.
  // …and #1140 a THIRD time, which is what made these three worth deriving from one place rather than
  // typing again: the inverse marker moved to a leading `inverse.` group, so the live path is
  // `color.appearance.inverse.interactive.<palette>.border.rest`. Three catches, same shape each time —
  // `INVERSE_GROUP_MOVES` above is where the live name is now stated once for every era that needs it.
  { path: 'color.interactive.primary.on-inverse.border', replacedBy: 'color.inverse.interactive.primary.border.rest', since: '3.0.0' },
  { path: 'color.interactive.neutral.on-inverse.border', replacedBy: 'color.inverse.interactive.neutral.border.rest', since: '3.0.0' },
  { path: 'color.interactive.destructive.on-inverse.border', replacedBy: 'color.inverse.interactive.destructive.border.rest', since: '3.0.0' },
  // #891 — the inverse-context qualifier drops `on-`. Generated rather than hand-typed: 30 entries
  // written out longhand is 30 chances to fat-finger a segment, and the pairing here is 1:1 by
  // construction. It is still checked rather than asserted — a wrong slot name makes `path` miss the
  // removed set (no `migrated` entry) AND `replacedBy` miss the live set (a dangling deprecation),
  // so either half of a typo fails `token-contract.ts --check` loudly.
  ...(['primary', 'neutral', 'destructive'] as const).flatMap((c) =>
    ['text.rest', 'text.hover', 'text.pressed', 'fill.rest', 'fill.hover', 'fill.pressed',
     'border.rest', 'border.hover', 'border.pressed', 'on-fill'].map((slot) => ({
      path: `color.interactive.${c}.on-inverse.${slot}`,
      replacedBy: `color.inverse.interactive.${c}.${slot}`,
      since: '4.0.0',
    }))),
  // #891 — `border` spelled the qualifier two ways at once; both become segments under one group.
  // `border.inverse` is the leaf-to-group promotion, so its own replacement WAS the `default` child —
  // and #1140 dropped that child as a duplicate, so this entry now points where the duplicate pointed:
  // `inverse.border.primary`, the path `border.inverse.default` was byte-identical to in every mode.
  // The only entry in this table whose target was DELETED rather than renamed, which is why it is called
  // out: had it been left alone it would have dangled, and `--check` names it.
  { path: 'color.border.inverse', replacedBy: 'color.inverse.border.primary', since: '4.0.0' },
  { path: 'color.border.focus-inverse', replacedBy: 'color.inverse.border.focus', since: '4.0.0' },
  // #892 — the two leaves that became 17-role groups. The promoted tier is the honest replacement:
  // it carries the value the leaf had, so a consumer following the pointer keeps the same ink rather
  // than silently adopting a different tier. (#1140 moved the group: `on-inverse` is retired and the ink
  // sits under the one `inverse.` group, so the promoted tier is now `inverse.{text,icon}.primary`.)
  { path: 'color.text.on-inverse', replacedBy: 'color.inverse.text.primary', since: '5.0.0' },
  { path: 'color.icon.on-inverse', replacedBy: 'color.inverse.icon.primary', since: '5.0.0' },
  // ── #1013: THE TIER SWAP ────────────────────────────────────────────────────────────────────────
  //
  // `color.*` used to be the VALUE tier — one leaf per resolved role, varying by appearance mode.
  // It is now the SURFACE ALIAS tier: one leaf per role that has a default/inverse pair, pointing into
  // `color.appearance.*`. So a role WITH a pair keeps its short name and gains a second surface mode
  // (no entry needed — the path did not move, only what it resolves to), and a role WITHOUT one loses
  // `color.<role>` entirely. That second group was 114 at the swap and is 113 now, because #1133 retired
  // one of them (see the `scrim` note below).
  //
  // WHY THE LIST IS LITERAL AND NOT DERIVED. `surfaceRowsFor` knows exactly which roles have no row,
  // and importing it here would spell this table in one line. That line would also make the check
  // worthless: `token-contract.ts --accept` refuses a removal with no `DEPRECATIONS` entry, so a table
  // generated from the same function that caused the removal agrees with any bug in it — the removal
  // and its own justification would move together, and the refusal could never fire (`docs/34`). Held
  // literally, a wrong segment fails BOTH ways, loudly: `path` misses the removed set (an unjustified
  // removal) and `replacedBy` misses the live set (a dangling deprecation).
  //
  // THE LIST NOW LIVES IN `INVERSE_GROUP_MOVES` ABOVE AND IS STILL EVERY BIT AS LITERAL. #1140 needs the
  // identical 113 `(group, leaf)` pairs and the identical live targets for its own bump, so the pairs are
  // named once rather than typed twice; the full argument for that is at the table. Nothing here became
  // derived-from-the-subject — only the `color.` / `color.appearance.` prefixes are computed, which is the
  // same latitude #1102's block below takes and for the same reason: a constant carried into both columns
  // still dangles if it is wrong.
  //
  // `['scrim', ['default']]` WAS IN THIS LIST, AND #1133 RETIRED IT RATHER THAN REWORDING IT.
  //
  // At the swap, `color.scrim.default` was the one NON-inverse role that moved: it had no inverse
  // counterpart and the coverage register disposed the gap as `omit` rather than a self-alias, so no
  // pointer row kept the short name alive. #1133 removed the surface mode, which removed the question
  // the disposition answered — a single-mode row is never asked what it does on an inverse ground — so
  // the role gets its pointer and `color.scrim.default` is EMITTED AGAIN (`CONTRACT_VERSION` 7.1.0).
  //
  // A deprecation for a path the engine emits is worse than a missing one: it tells a consumer to stop
  // using a name that works, and it is the only kind of rot `classify` cannot see. The dangling check
  // is on `replacedBy` alone, and `color.appearance.scrim.default` is still perfectly live — so this
  // entry would have gone on passing every gate while saying something false. Removed by hand, and the
  // blind spot filed as its own issue rather than fixed here. It is also why `scrim` is absent from
  // `INVERSE_GROUP_MOVES`: that table is the inverse set, and `scrim` never was inverse.
  ...INVERSE_GROUP_MOVES.flatMap(([oldGroup, newGroup, leaves]) =>
    leaves.map((leaf) => ({
      path: `color.${oldGroup}.${leaf}`,
      replacedBy: `color.${newGroup}.${leaf}`,
      since: '6.0.0',
    }))),
  { path: `color.${INVERSE_DEDUPED.group}.${INVERSE_DEDUPED.leaf}`, replacedBy: `color.${INVERSE_DEDUPED.replacedBy}`, since: '6.0.0' },
  // ── #1140: ONE `inverse` GROUP ──────────────────────────────────────────────────────────────────
  //
  // The 113 inverse roles move from three marker positions to one leading `inverse.` group:
  // `color.appearance.background.inverse.primary` → `color.appearance.inverse.background.primary`,
  // `…text.on-inverse.primary` → `…inverse.text.primary`, and so on. 104 of the 113 are GUARANTEED, which
  // is what makes this a MAJOR (see the `CONTRACT_VERSION` 8.0.0 entry above — the count was measured, not
  // assumed). The other 9 are the `overlay` slots 7.0.0 demoted, and they get entries anyway: a consumer
  // is not the only migrator here, and the Figma variable rename is 113 rows whatever the contract says
  // about 9 of them.
  //
  // Same `(group, leaf)` pairs as #1013's block, one prefix along — the removals are the VALUE-tier
  // spellings this time, since the short spellings went at 6.0.0 and never came back.
  ...INVERSE_GROUP_MOVES.flatMap(([oldGroup, newGroup, leaves]) =>
    leaves.map((leaf) => ({
      path: `color.appearance.${oldGroup}.${leaf}`,
      replacedBy: `color.${newGroup}.${leaf}`,
      since: '8.0.0',
    }))),
  // The dedupe, not a rename: `border.inverse.default` was byte-identical to `border.inverse.primary` in
  // light and in dark, so it is dropped and its consumers are pointed at the twin. This makes the pair a
  // FAN-IN — two retired paths naming one live target — which the contract table holds happily and the
  // Figma rename map refuses to APPLY without disambiguation (`ambiguous-source`).
  //
  // **THAT REFUSAL IS RIGHT FOR THIS ENTRY AND WRONG FOR ITS PARTNER, and it is one refusal covering
  // both.** `planVariableRenames` groups by TARGET, so the group at `inverse/border/primary` holds two
  // live rows in a designer's file and neither moves. For THIS row — the dedupe — that is correct: a
  // migration cannot silently pick which of two variables becomes the survivor, and the designer has to
  // choose. For the OTHER row it is a defect: `border/inverse/primary` → `inverse/border/primary` is an
  // ordinary one-to-one relocation, in no doubt at all, blocked only by an unrelated dedupe that happens
  // to name the same target. Its bindings are left pointing at a variable the engine no longer writes —
  // the stranding #893 built the whole mechanism to prevent, arriving here through the shape of the
  // group rather than through a missing row.
  //
  // Measured on the live map: **111 of the 113 rows at 8.0.0 migrate; these 2 refuse.** Filed as #1142 —
  // the fix belongs in `planVariableRenames` (a group with one non-dedupe source can still migrate it),
  // not in this table, which is a record of history and correct as written.
  { path: `color.appearance.${INVERSE_DEDUPED.group}.${INVERSE_DEDUPED.leaf}`, replacedBy: `color.${INVERSE_DEDUPED.replacedBy}`, since: '8.0.0' },
  // ── #1102: THE `core` TIER ──────────────────────────────────────────────────────────────────────
  //
  // The three RAW-PRIMITIVE groups move under one `core` tier: `palette.red.550` becomes
  // `core.palette.red.550`, and the same for `dimension.*` and `font.*`. 164 paths. The Figma side of
  // the same change is the `core` COLLECTION (`ENGINE_VERSION` 0.27.0), and it is one change rather
  // than two because a variable's name tracks its DTCG path — landed separately these 164 variables
  // would be renamed twice.
  //
  // WHY THE LIST IS LITERAL, for #1013's reason above and not a new one: the transform is a one-line
  // prefix, so importing whatever performed the move would spell this table in a line — and make it
  // agree with any bug in the move, so `--accept`'s refusal could never fire (`docs/34`). Written out,
  // a wrong leaf fails BOTH ways: `path` misses the removed set (an unjustified removal) and
  // `core.<wrong leaf>` misses the live set (a dangling deprecation).
  //
  // The `core.` prefix IS derived from `path`, and that is safe for the same reason rather than in
  // spite of it — it is a constant, and a typo carried from `path` into `replacedBy` still dangles.
  // Deriving the PATHS is what would be circular; deriving the one segment that is the same on all 164
  // is not.
  //
  // `opacity` is deliberately absent: it is directly consumable with no semantic layer to reach for
  // instead (#79), so it is not a primitive in this sense and stays at the root. `font-fluid` is absent
  // too, and for a different reason — it is COMPUTED, not raw, and it is not a DTCG root at all.
  ...([
    ['palette', [
      'black', 'black-alpha.10', 'black-alpha.20', 'black-alpha.30', 'black-alpha.40', 'black-alpha.5',
      'black-alpha.50', 'black-alpha.60', 'black-alpha.70', 'black-alpha.80', 'black-alpha.90',
      'info.025', 'info.050', 'info.100', 'info.150', 'info.200', 'info.250', 'info.300', 'info.350',
      'info.400', 'info.450', 'info.500', 'info.550', 'info.600', 'info.650', 'info.700', 'info.750',
      'info.800', 'info.850', 'info.900', 'info.950',
      'neutral.025', 'neutral.050', 'neutral.100', 'neutral.150', 'neutral.200', 'neutral.250',
      'neutral.300', 'neutral.350', 'neutral.400', 'neutral.450', 'neutral.500', 'neutral.550',
      'neutral.600', 'neutral.650', 'neutral.700', 'neutral.750', 'neutral.800', 'neutral.850',
      'neutral.900', 'neutral.950',
      'white', 'white-alpha.10', 'white-alpha.20', 'white-alpha.30', 'white-alpha.40', 'white-alpha.5',
      'white-alpha.50', 'white-alpha.60', 'white-alpha.70', 'white-alpha.80', 'white-alpha.90',
    ]],
    ['dimension', [
      '0', '1', '2', '4', '6', '8', '10', '12', '16', '20', '24', '28', '32', '36', '40', '44', '48',
      '52', '56', '60', '64', '68', '72', '76', '80', '84', '88', '92', '96', '100', '104', '108',
      '112', '116', '120', '124', '128',
    ]],
    ['font', [
      'family.body', 'family.caption', 'family.code', 'family.display', 'family.eyebrow',
      'family.label', 'family.title',
      'letter-spacing-role.normal', 'letter-spacing-role.snug', 'letter-spacing-role.tight',
      'letter-spacing-role.tighter', 'letter-spacing-role.wide', 'letter-spacing-role.wider',
      'letter-spacing.0', 'letter-spacing.20', 'letter-spacing.50', 'letter-spacing.neg-10',
      'letter-spacing.neg-20', 'letter-spacing.neg-30',
      'line-height-role.compact', 'line-height-role.cozy', 'line-height-role.loose',
      'line-height-role.normal', 'line-height-role.relaxed', 'line-height-role.snug',
      'line-height-role.tight',
      'line-height.105', 'line-height.115', 'line-height.125', 'line-height.140', 'line-height.150',
      'line-height.165', 'line-height.175',
      'size.10', 'size.11', 'size.12', 'size.14', 'size.16', 'size.18', 'size.20', 'size.24',
      'size.28', 'size.32', 'size.36', 'size.40', 'size.48', 'size.56', 'size.64', 'size.72',
      'size.80', 'size.96', 'size.112', 'size.128', 'size.144', 'size.160',
      'typeface.jetbrains-mono',
      'weight-role.default', 'weight-role.emphasis', 'weight-role.max', 'weight-role.strong',
      'weight-role.subtle',
      'weight.300', 'weight.400', 'weight.700', 'weight.900',
    ]],
  ] as Array<[string, readonly string[]]>).flatMap(([group, leaves]) =>
    leaves.map((leaf) => ({
      path: `${group}.${leaf}`,
      replacedBy: `core.${group}.${leaf}`,
      since: '7.0.0',
    }))),
  // ── #1148: ONE COLOUR TIER ──────────────────────────────────────────────────────────────────────
  //
  // The `appearance` level is DELETED and the value tier takes the short names back. Every one of the
  // 243 `color.appearance.<X>` paths becomes `color.<X>`. This is the exact inverse of #1013's move: the
  // short names went to a pointer tier then and they come back to the values now, so a consumer who has
  // been writing `color.text.primary` since before 3.0.0 is unaffected by either change and a consumer
  // who followed #1013's advice to the appearance tier has to come back. That asymmetry is the cost of
  // #1013 and it is being paid here rather than argued about.
  //
  // 225 of the 243 are GUARANTEED, which is the MAJOR (`CONTRACT_VERSION` 9.0.0 — measured with
  // `token-contract.ts --check`, which reported exactly 225 removals, 0 demotions and 104 additions
  // before this block was written). The other 18 are the `overlay` slots #957 demoted, nine on each
  // ground.
  //
  // **THE 18 ARE CHECKED IN NEITHER DIRECTION, AND THEY ARE HERE ANYWAY.** Worth stating, because the
  // rest of this table is load-bearing and these lines are not: a brand-dependent `path` is not in the
  // baseline's `guaranteed`, so it never enters `removed` and no arm asks whether it was ever real; and
  // its `replacedBy` is `brandDependent` too, which `classify` exempts from the dangling check by design
  // (it reports them as `conditionalMigrations` instead). So a typo in one of those 18 tails passes every
  // gate. They are included for the reason #1140's block included the same nine pairs: a consumer of a
  // brand-dependent path is hit by this rename identically to a consumer of a guaranteed one, and
  // splitting the record by which side of the guarantee a path fell on would answer "what happened to my
  // token" for 225 people and not for the rest. The 225 checked lines are what makes the block trustworthy;
  // these 18 ride along, and a reader should know which is which rather than assume uniform coverage.
  //
  // NO FIGMA ROWS COME OUT OF THIS BLOCK, and that is the point rather than an omission. `projectionsOf`
  // strips the `appearance` tier segment from both sides via `TIER_SEGMENT`, so every entry here projects
  // to `roleOf(from) === roleOf(to)` and yields NOTHING. The Figma half is
  // `color-one-collection-1148` in `materialization-renames.ts` — one materialization rule, one record,
  // which is the invariant `lint-materialization-renames.ts` enforces as `multiplyClaimed`. Writing the
  // rename into both registers would fail that gate, by name, and rightly.
  //
  // WHY THE LIST IS LITERAL, for #1013's and #1102's reason and not a new one. The transform is a
  // one-segment prefix strip, so importing whatever performed it would spell this table in a line and make
  // it agree with any bug in the strip (`docs/34`). Written out, a wrong tail fails BOTH ways for the 225:
  // `path` misses the removed set (an unjustified removal) and `color.<wrong tail>` misses the live set (a
  // dangling deprecation). The two PREFIXES are computed, which is the same latitude #1102 takes — a
  // constant carried into both columns still dangles if it is wrong.
  ...([
    ['background', [
      'primary', 'secondary', 'tertiary',
    ]],
    ['border', [
      'brand', 'danger', 'focus', 'info', 'primary', 'secondary', 'success', 'tertiary', 'warning',
    ]],
    ['disabled', [
      'border', 'fill', 'icon', 'on-fill', 'text',
    ]],
    ['field', [
      'border.hover', 'border.rest', 'fill', 'placeholder',
    ]],
    ['foreground', [
      'brand', 'brand-subtle', 'danger', 'danger-subtle', 'info', 'info-subtle', 'primary', 'secondary',
      'success', 'success-subtle', 'tertiary', 'warning', 'warning-subtle',
    ]],
    ['icon', [
      'brand', 'brand-subtle', 'danger', 'danger-subtle', 'info', 'info-subtle', 'link.default',
      'link.focused', 'link.hover', 'link.visited', 'on-brand', 'on-danger', 'on-info', 'on-success',
      'on-warning', 'primary', 'secondary', 'success', 'success-subtle', 'tertiary', 'warning',
      'warning-subtle',
    ]],
    ['interactive', [
      'destructive.border.hover', 'destructive.border.pressed', 'destructive.border.rest',
      'destructive.fill.focused', 'destructive.fill.hover', 'destructive.fill.pressed',
      'destructive.fill.rest', 'destructive.fill.selected', 'destructive.on-fill',
      'destructive.overlay.hover', 'destructive.overlay.pressed', 'destructive.overlay.selected',
      'destructive.text.hover', 'destructive.text.pressed', 'destructive.text.rest', 'neutral.border.hover',
      'neutral.border.pressed', 'neutral.border.rest', 'neutral.fill.focused', 'neutral.fill.hover',
      'neutral.fill.pressed', 'neutral.fill.rest', 'neutral.fill.selected', 'neutral.on-fill',
      'neutral.overlay.hover', 'neutral.overlay.pressed', 'neutral.overlay.selected', 'neutral.text.hover',
      'neutral.text.pressed', 'neutral.text.rest', 'primary.border.hover', 'primary.border.pressed',
      'primary.border.rest', 'primary.fill.focused', 'primary.fill.hover', 'primary.fill.pressed',
      'primary.fill.rest', 'primary.fill.selected', 'primary.on-fill', 'primary.overlay.hover',
      'primary.overlay.pressed', 'primary.overlay.selected', 'primary.text.hover', 'primary.text.pressed',
      'primary.text.rest',
    ]],
    ['inverse', [
      'background.primary', 'background.secondary', 'background.tertiary', 'border.brand', 'border.danger',
      'border.focus', 'border.info', 'border.primary', 'border.secondary', 'border.success',
      'border.tertiary', 'border.warning', 'disabled.border', 'disabled.fill', 'disabled.icon',
      'disabled.on-fill', 'disabled.text', 'field.border.hover', 'field.border.rest', 'field.fill',
      'field.placeholder', 'foreground.brand', 'foreground.brand-subtle', 'foreground.danger',
      'foreground.danger-subtle', 'foreground.info', 'foreground.info-subtle', 'foreground.primary',
      'foreground.secondary', 'foreground.success', 'foreground.success-subtle', 'foreground.tertiary',
      'foreground.warning', 'foreground.warning-subtle', 'icon.brand', 'icon.brand-subtle', 'icon.danger',
      'icon.danger-subtle', 'icon.info', 'icon.info-subtle', 'icon.link.default', 'icon.link.focused',
      'icon.link.hover', 'icon.link.visited', 'icon.primary', 'icon.secondary', 'icon.success',
      'icon.success-subtle', 'icon.tertiary', 'icon.warning', 'icon.warning-subtle',
      'interactive.destructive.border.hover', 'interactive.destructive.border.pressed',
      'interactive.destructive.border.rest', 'interactive.destructive.fill.focused',
      'interactive.destructive.fill.hover', 'interactive.destructive.fill.pressed',
      'interactive.destructive.fill.rest', 'interactive.destructive.fill.selected',
      'interactive.destructive.on-fill', 'interactive.destructive.overlay.hover',
      'interactive.destructive.overlay.pressed', 'interactive.destructive.overlay.selected',
      'interactive.destructive.text.hover', 'interactive.destructive.text.pressed',
      'interactive.destructive.text.rest', 'interactive.neutral.border.hover',
      'interactive.neutral.border.pressed', 'interactive.neutral.border.rest',
      'interactive.neutral.fill.focused', 'interactive.neutral.fill.hover',
      'interactive.neutral.fill.pressed', 'interactive.neutral.fill.rest',
      'interactive.neutral.fill.selected', 'interactive.neutral.on-fill',
      'interactive.neutral.overlay.hover', 'interactive.neutral.overlay.pressed',
      'interactive.neutral.overlay.selected', 'interactive.neutral.text.hover',
      'interactive.neutral.text.pressed', 'interactive.neutral.text.rest',
      'interactive.primary.border.hover', 'interactive.primary.border.pressed',
      'interactive.primary.border.rest', 'interactive.primary.fill.focused',
      'interactive.primary.fill.hover', 'interactive.primary.fill.pressed', 'interactive.primary.fill.rest',
      'interactive.primary.fill.selected', 'interactive.primary.on-fill',
      'interactive.primary.overlay.hover', 'interactive.primary.overlay.pressed',
      'interactive.primary.overlay.selected', 'interactive.primary.text.hover',
      'interactive.primary.text.pressed', 'interactive.primary.text.rest', 'text.brand',
      'text.brand-subtle', 'text.danger', 'text.danger-subtle', 'text.info', 'text.info-subtle',
      'text.link.default', 'text.link.focused', 'text.link.hover', 'text.link.visited', 'text.primary',
      'text.secondary', 'text.success', 'text.success-subtle', 'text.tertiary', 'text.warning',
      'text.warning-subtle',
    ]],
    ['scrim', [
      'default',
    ]],
    ['text', [
      'brand', 'brand-subtle', 'danger', 'danger-subtle', 'info', 'info-subtle', 'link.default',
      'link.focused', 'link.hover', 'link.visited', 'on-brand', 'on-danger', 'on-info', 'on-success',
      'on-warning', 'primary', 'secondary', 'success', 'success-subtle', 'tertiary', 'warning',
      'warning-subtle',
    ]],
    ['veil', [
      'dark.body', 'dark.enhanced', 'dark.large', 'light.body', 'light.enhanced', 'light.large',
    ]],
  ] as Array<[string, readonly string[]]>).flatMap(([group, leaves]) =>
    leaves.map((leaf) => ({
      path: `color.appearance.${group}.${leaf}`,
      replacedBy: `color.${group}.${leaf}`,
      since: '9.0.0',
    }))),
];

/** Semver levels, ordered — `LEVELS.indexOf` is the comparison. */
export const LEVELS = ['none', 'patch', 'minor', 'major'] as const;
export type Level = typeof LEVELS[number];

/** The committed baseline's shape (`schema/token-contract.json`). */
export type Contract = {
  contractVersion: string;
  engineVersion: string;
  note: string;
  corpus: string[];
  /** path (below the root) → DTCG `$type`. Every corpus brand emits every one of these. */
  guaranteed: Record<string, string>;
  /** Paths some but not all corpus brands emit. Informational: NEVER forces a version bump. */
  brandDependent: string[];
  deprecations: Deprecation[];
};

export type Diff = {
  /** Paths the guarantee lost. INCLUDES `demoted` — see there for why they are also reported apart. */
  removed: string[];
  /** `$type` changed on a path that still exists — a break for anyone consuming the old type. */
  retyped: Array<{ path: string; from: string; to: string }>;
  added: string[];
  /** Removals that ship a `DEPRECATIONS` entry. Still breaking; merely breaking WITH a fix. */
  migrated: Deprecation[];
  /**
   * Paths that left `guaranteed` but are still EMITTED, for some inputs — they moved to
   * `brandDependent`. Reported apart from the rest of `removed` because the two need opposite
   * responses: a removal ships a `DEPRECATIONS` entry naming a replacement, and a demotion cannot,
   * since the path itself is what a brand that does not pull the lever still emits. Filed under one
   * heading, 30 demotions read as 30 removals shipping no migration (#957) — which is exactly the
   * signal the deprecation discipline depends on, spent on the one case where it means nothing.
   *
   * Still MAJOR, and counted in `removed` for that reason: what moved is the PROMISE, and a consumer
   * who read the guarantee is now referencing something their next brand may not have.
   */
  demoted: string[];
  /** Deprecation entries whose `replacedBy` does not exist AT ALL — a migration pointing nowhere. */
  danglingDeprecations: Deprecation[];
  /**
   * Entries whose own `path` is STILL GUARANTEED — a deprecation telling consumers to migrate off a
   * name that works (#1137).
   *
   * The mirror image of `danglingDeprecations`, and it was the unchecked half. That arm validates the
   * DESTINATION exists; nothing validated that the SOURCE is gone. A deprecation is the justification
   * for a removal — `migrated` is literally `removed.map(byPath.get)` — so an entry on a live path
   * justifies nothing and is read by every consumer as an instruction to move off a working name.
   *
   * Brand-dependent paths are deliberately NOT flagged: a path that left the guarantee but is still
   * emitted for some brands has genuinely stopped being promised, and telling a consumer to migrate is
   * the right advice. The defect is specifically a path that is still GUARANTEED. The filter states
   * that exclusion explicitly even though `live` already holds guaranteed paths only — the invariant
   * belongs where the arm is read, not only at the call site that happens to supply it.
   */
  liveDeprecations: Deprecation[];
  /**
   * Entries whose `replacedBy` is emitted but only `brandDependent` — a migration whose target
   * depends on a lever. Not rot (the check above would be wrong to fail them) and not clean either,
   * so it is REPORTED: widening the dangling check without this would be the same as deleting it for
   * these. 9 today, all #1013 pointers into the overlay roles #957 demoted.
   */
  conditionalMigrations: Deprecation[];
  level: Level;
};

const parse = (v: string): [number, number, number] => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`not a semver: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** True when `next` is at least a `level` increment beyond `prev`. `none` accepts equality. */
export const satisfiesBump = (prev: string, next: string, level: Level): boolean => {
  const [pa, pi, pp] = parse(prev);
  const [na, ni, np] = parse(next);
  if (level === 'none') return na === pa && ni === pi && np === pp;
  if (level === 'major') return na > pa;
  if (level === 'minor') return na > pa || (na === pa && ni > pi);
  return na > pa || (na === pa && ni > pi) || (na === pa && ni === pi && np > pp);
};

/**
 * Classify the live guaranteed surface against the committed baseline.
 *
 * Removals and retypes are MAJOR because both break a consumer that did nothing wrong. Additions
 * are MINOR — new names cannot break an existing reference.
 *
 * `brandDependent` still CANNOT FORCE A BUMP, and the level computation below does not read it: a
 * path moving in or out of that set says something changed about the CORPUS, not about what the
 * engine promises. It is an input for the two things that are not about the level at all — telling a
 * DEMOTION apart from a removal, and telling a CONDITIONAL migration apart from a dangling one. Both
 * of those questions are "is this path emitted anywhere?", which the guaranteed set alone cannot
 * answer; neither changes `level` by a rung. Defaulted to empty so a caller asking only about the
 * guarantee gets the stricter reading it asked for.
 */
export const classify = (
  baseline: Contract,
  live: Record<string, string>,
  deprecations = DEPRECATIONS,
  brandDependent: readonly string[] = [],
): Diff => {
  const removed = Object.keys(baseline.guaranteed).filter((p) => !(p in live)).sort();
  const added = Object.keys(live).filter((p) => !(p in baseline.guaranteed)).sort();
  const retyped = Object.keys(baseline.guaranteed)
    .filter((p) => p in live && live[p] !== baseline.guaranteed[p])
    .sort()
    .map((path) => ({ path, from: baseline.guaranteed[path], to: live[path] }));

  const byPath = new Map(deprecations.map((d) => [d.path, d]));
  const migrated = removed.map((p) => byPath.get(p)).filter((d): d is Deprecation => d !== undefined);
  const conditional = new Set(brandDependent);
  // A path that left the guarantee but is still emitted for SOME input was demoted, not removed.
  const demoted = removed.filter((p) => conditional.has(p));
  // A replacement the engine does not emit AT ALL is the rot case: the table keeps telling consumers
  // to migrate to something that no longer exists. One that is emitted but only brand-dependently is
  // a conditional migration — real, and worth saying so rather than passing in silence.
  const danglingDeprecations = deprecations.filter((d) => !(d.replacedBy in live) && !conditional.has(d.replacedBy));
  const conditionalMigrations = deprecations.filter((d) => !(d.replacedBy in live) && conditional.has(d.replacedBy));
  // And the mirror of the line above, which was missing (#1137): the DESTINATION was validated and the
  // SOURCE never was. `path` is history and does not move — but history is what a name USED to be, and
  // a `path` still in `live` is not history, it is the present.
  //
  // `!conditional.has(d.path)` IS A NO-OP TODAY AND IS WRITTEN ANYWAY. `live` holds the guaranteed
  // surface only, so a brand-dependent path is already absent from it and the second clause can never
  // change the answer. But that is a fact about the CALL SITE, not about this line — the comment above
  // said "conditional is excluded on purpose" over a filter that excluded nothing, so the invariant was
  // true and unstated where it is read. Spelled out, the exclusion is local: if `live` ever widens to
  // include brand-dependent paths, this arm keeps meaning what its comment says instead of quietly
  // starting to flag every demotion. The twin above carries the same clause for the same reason.
  const liveDeprecations = deprecations.filter((d) => d.path in live && !conditional.has(d.path));

  const level: Level = removed.length || retyped.length ? 'major' : added.length ? 'minor' : 'none';
  return { removed, retyped, added, migrated, demoted, danglingDeprecations, liveDeprecations, conditionalMigrations, level };
};
