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
export const ENGINE_VERSION = '0.25.0';

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
export const CONTRACT_VERSION = '5.4.0';

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
  { path: 'color.interactive.primary.on-inverse.border', replacedBy: 'color.interactive.primary.inverse.border.rest', since: '3.0.0' },
  { path: 'color.interactive.neutral.on-inverse.border', replacedBy: 'color.interactive.neutral.inverse.border.rest', since: '3.0.0' },
  { path: 'color.interactive.destructive.on-inverse.border', replacedBy: 'color.interactive.destructive.inverse.border.rest', since: '3.0.0' },
  // #891 — the inverse-context qualifier drops `on-`. Generated rather than hand-typed: 30 entries
  // written out longhand is 30 chances to fat-finger a segment, and the pairing here is 1:1 by
  // construction. It is still checked rather than asserted — a wrong slot name makes `path` miss the
  // removed set (no `migrated` entry) AND `replacedBy` miss the live set (a dangling deprecation),
  // so either half of a typo fails `token-contract.ts --check` loudly.
  ...(['primary', 'neutral', 'destructive'] as const).flatMap((c) =>
    ['text.rest', 'text.hover', 'text.pressed', 'fill.rest', 'fill.hover', 'fill.pressed',
     'border.rest', 'border.hover', 'border.pressed', 'on-fill'].map((slot) => ({
      path: `color.interactive.${c}.on-inverse.${slot}`,
      replacedBy: `color.interactive.${c}.inverse.${slot}`,
      since: '4.0.0',
    }))),
  // #891 — `border` spelled the qualifier two ways at once; both become segments under one group.
  // `border.inverse` is the leaf-to-group promotion, so its own replacement is the `default` child.
  { path: 'color.border.inverse', replacedBy: 'color.border.inverse.default', since: '4.0.0' },
  { path: 'color.border.focus-inverse', replacedBy: 'color.border.inverse.focus', since: '4.0.0' },
  // #892 — the two leaves that became 17-role groups. The promoted tier is the honest replacement:
  // it carries the value the leaf had, so a consumer following the pointer keeps the same ink rather
  // than silently adopting a different tier.
  { path: 'color.text.on-inverse', replacedBy: 'color.text.on-inverse.primary', since: '5.0.0' },
  { path: 'color.icon.on-inverse', replacedBy: 'color.icon.on-inverse.primary', since: '5.0.0' },
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
  removed: string[];
  /** `$type` changed on a path that still exists — a break for anyone consuming the old type. */
  retyped: Array<{ path: string; from: string; to: string }>;
  added: string[];
  /** Removals that ship a `DEPRECATIONS` entry. Still breaking; merely breaking WITH a fix. */
  migrated: Deprecation[];
  /** Deprecation entries whose `replacedBy` does not exist — a migration pointing nowhere. */
  danglingDeprecations: Deprecation[];
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
 * are MINOR — new names cannot break an existing reference. Note that `brandDependent` is NOT an
 * input here: a path moving in or out of that set says something changed about the CORPUS, not
 * about what the engine promises, so it must not be able to force a bump.
 */
export const classify = (baseline: Contract, live: Record<string, string>, deprecations = DEPRECATIONS): Diff => {
  const removed = Object.keys(baseline.guaranteed).filter((p) => !(p in live)).sort();
  const added = Object.keys(live).filter((p) => !(p in baseline.guaranteed)).sort();
  const retyped = Object.keys(baseline.guaranteed)
    .filter((p) => p in live && live[p] !== baseline.guaranteed[p])
    .sort()
    .map((path) => ({ path, from: baseline.guaranteed[path], to: live[path] }));

  const byPath = new Map(deprecations.map((d) => [d.path, d]));
  const migrated = removed.map((p) => byPath.get(p)).filter((d): d is Deprecation => d !== undefined);
  // A replacement that is not in the LIVE guaranteed set is the rot case: the table keeps telling
  // consumers to migrate to something the engine no longer emits.
  const danglingDeprecations = deprecations.filter((d) => !(d.replacedBy in live));

  const level: Level = removed.length || retyped.length ? 'major' : added.length ? 'minor' : 'none';
  return { removed, retyped, added, migrated, danglingDeprecations, level };
};
