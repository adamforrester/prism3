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
 *
 * ── WHO WRITES `ENGINE_VERSION` (#1807, decided 2026-09-30) ─────────────────────────────────────
 *
 * Only the FOLD (`fold.ts` at the repo root). A PR that owes an engine bump adds a change note,
 * `packages/engine/changes/<slug>.md`, whose front matter DECLARES the class (`engine: patch|minor|major`)
 * and whose body is the changelog prose; it never edits the constant or the changelog below. After a
 * batch of merges the fold assigns ONE version for the batch (the highest declared class), writes the
 * constant and the changelog under the FOLD MARKER, deletes the notes and regenerates the stamps. So a
 * version names a fold, which may cover several PRs, and `main` runs a merged change under the previous
 * number until the fold lands. `lint-emission-version.ts` and `lint-component-surface.ts` accept an
 * added note as the bump; the former also fails a PR that is not a fold for editing either.
 * `CONTRACT_VERSION` is unchanged by this: a PR still bumps it itself, with its baseline.
 *
 * ── WHAT COUNTS AS THE ENGINE SURFACE (#1252, decided) ──────────────────────────────────────────
 *
 * `ENGINE_VERSION` bumps on any change to what a consumer can OBSERVE, and that is BOTH the emitted
 * trees AND the PROJECTED COMPONENT SURFACE. Movement in `out/` is ONE TRIGGER, not the definition.
 *
 * The distinction had gone unstated and two merged PRs answered it opposite ways on the same shape.
 * #1251 bumped for `field-label` gaining a `tone` axis and a third size rung (a Figma set going 4 → 12
 * members); #1224 did not bump for splitting button's `intent` axis into two whole new defs and 864 new
 * projected members. Both were legal, because component payloads ARE NOT COMMITTED UNDER `out/` — the
 * plugin builds them from the defs at run time — so `lint-emission-version.ts`, the gate that asks "did
 * the emission move without the version", is structurally blind to the entire projection. Its silence
 * over a def change is a fact about its scope rather than evidence that behavior held still.
 *
 * A designer who opens a set and meets a new variant axis, or 864 members where there were 432, has met
 * a different engine. So that is a behavior change and it takes a bump — a MINOR when the surface grows
 * or shrinks, by the ordinary rule.
 *
 * `lint-component-surface.ts` enforces it against `schema/component-surface.json`, an authored baseline
 * only an explicit `--accept` rewrites. Two properties of it belong here rather than only in that file:
 *
 *   · IT IS BRAND-INDEPENDENT, and therefore strictly cleaner than the emission arm. `figmaAnatomySet`
 *     takes a def and no theme, so the baseline moves when the ENGINE moves and never when a brand
 *     input does — where `lint-emission-version.ts` states as its own limit that editing a brand file
 *     moves `out/` and demands a bump with no engine code changed.
 *   · IT IS DELIBERATELY OVER-SENSITIVE. The per-member digest is `planStamp`, which hashes the whole
 *     plan rather than a hand-picked field list, so a plan field no executor reads still moves it and
 *     the gate will sometimes demand a bump for a change no designer sees. Accepted: it errs safe, and
 *     it is the same trade `lint-emission-version.ts` already makes by taking `out/**` wholesale. The
 *     alternative — a curated field list — is a second statement of what a member is, and would go
 *     silently blind the next time a plan field is added (docs/34 shape 8).
 *
 * #1224 IS RECORDED AS AN UNDER-BUMP UNDER A CONVENTION THAT STARTS HERE, in `docs/00-progress.md`, and
 * is deliberately NOT retro-bumped: restamping a merged artifact would assert something that was not
 * true at ship time. Full policy, including what this deliberately does not cover (the code-side prop
 * API), is `docs/30-versioning-and-compatibility.md`.
 */

/**
 * The code. Bumps on any behaviour change — including one that only moves values. Its history is
 * `CHANGELOG.md` next door, which only `fold.ts` writes (#1807, Q319.3).
 */
export const ENGINE_VERSION = '0.237.0';

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
 * 10.0.0: the media veil's three rungs rename from WCAG-floor names to INTENSITY names — six guaranteed
 * paths removed, six added, 0 retyped, so MAJOR (#1317). `color.veil.<pol>.{large,body,enhanced}` become
 * `color.veil.<pol>.{subtle,medium,strong}` on both polarities, and a consumer resolving `color.veil.dark.body`
 * gets nothing — which is why this is MAJOR and not the value-only ENGINE bump the alphas alone would be
 * (0.59.0 above; the emitted values are byte-identical). The removals ship `DEPRECATIONS` entries pointing
 * at the intensity twin, so a consumer or codemod can follow the rename, and the Figma variable rename
 * derives from those entries via `rename-map.ts` with no `MATERIALIZATION_RENAMES` rule (a rung rename
 * moves the role, which projects to a real variable rename — a materialization rule would double-claim it).
 * The level was DERIVED from `token-contract.ts --check` (it reported MAJOR and named all six removals),
 * not chosen here. (577 → 577)
 *
 * 9.4.0: `control.size.{sm,md,lg}.radius` — three guaranteed paths added, 0 removed, 0 retyped, so MINOR
 * (#1015). A selection control's corner, clamped to its OWN box edge — `min(radius.sm, snap2(edge ÷ 8))`
 * — rather than taken from the card ramp, so it keeps its proportion as the box shrinks with brand
 * density. Additive on the NAME surface, which is the only surface this version answers for: every
 * existing `control.size.*` and every `radius.*` name still resolves, nothing was renamed, nothing
 * retyped.
 *
 * The part worth reading twice is what this bump does NOT cover, because it is the clean illustration of
 * the split this file exists to keep: checkbox's built corner CHANGES on aurora, 4px → 2px at all three
 * rungs. That is a value move on a brand-dependent quantity — `ENGINE_VERSION` answers for it (0.43.0
 * below) and `CONTRACT_VERSION` deliberately does not. A consumer holding `prism.control.size.md.radius`
 * resolves it before and after; a consumer holding `prism.radius.sm` resolves it before and after too,
 * because the old binding lived in a component DEF, not in the token surface. The level was DERIVED from
 * `token-contract.ts --check` (it reported MINOR and named all three), not chosen here. (574 → 577)
 *
 * 9.3.0: `control.size.{sm,md,lg}.inset` plus `core.dimension.5` — four guaranteed paths added, 0
 * removed, 0 retyped, so MINOR (#997). The switch track reads the inset as uniform padding so its thumb
 * clears the track's ends; the dimension rung is the grid entry that inset aliases at the default
 * density, which the grid extras now supply. Additive: every existing `control.size.*` and
 * `core.dimension.*` name still resolves, and no value of an existing path moves. The level was DERIVED
 * from `token-contract.ts --check` (it reported MINOR and named all four), not chosen here.
 *
 * 9.2.0: `control.size.{sm,md,lg}.line-box` — three guaranteed paths added, 0 removed, 0 retyped, so
 * MINOR (#1201). The selection-control alignment box (see `ENGINE_VERSION` 0.33.0 above) reads these to
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
 *
 * 10.1.0 — ADD `size.md.min-height`, the interactive target-size floor (#1437, owner-decided 2026-09-15). ONE
 * new guaranteed dimension path: `<root>.size.md.min-height` = `max(size.md.height, AAA_TARGET_PX)` = the `md`
 * control height raised to the WCAG 2.2 SC 2.5.5 enhanced 44px target wherever a dense brand falls below it (a
 * FLOOR, so a spacious 56 stays 56). Emitted unconditionally by every corpus brand, so it lands in the
 * GUARANTEED intersection, not `brandDependent`. ADD, so MINOR — 10.0.0 → 10.1.0 (adding a path never forces a
 * MAJOR; `brandDependent` is untouched; nothing is removed or retyped). Placed inside the existing `size.md`
 * group rather than as a new top-level `size.*` key, so the rung-iterating gates are unaffected. Bound by
 * `select` (#1426) so a field control meets the enhanced target at every density; the family generalization
 * (text-field, the checkbox/switch rows) is tracked in #1437 and does not move the contract further (they
 * would bind the same existing name). `token-contract.ts --accept` records it and refuses unless
 * `CONTRACT_VERSION` was raised by exactly this MINOR first. (guaranteed +1)
 *
 * 10.2.0 — #1425 scales `switch-control` to Prism 2's toggle proportions, ADDING the switch's own two tier
 * fields to the guaranteed surface: `control.size.{sm,md,lg}.track` (its cross-axis edge, a ladder distinct
 * from the square box `height`) and `.thumb` (its traveling mark, 0.75× the track, distinct from radio's
 * `dot`), plus the `core.dimension.{3,18}` primitives the new thumb/inset px promote into every brand's grid
 * (`core.dimension.30`, from comfortable/spacious `lg` thumbs, joins brand-dependent — aurora never reaches it).
 * Additions only — a clean MINOR, layered on main's 10.1.0 (#1426's `size.md.min-height`, which this keeps):
 * 10.1.0 → 10.2.0. Checkbox and radio are untouched: they read only `height`/`dot`, whose values do not move.
 *
 * WHY THIS IS NOT A MAJOR — the `core.dimension.5` trap, recorded because the first cut of #1425 hit it. The
 * switch's `inset` re-derives from `(height − dot) / 2` to `(track − thumb) / 2`, which drops aurora's UNUSED
 * `control.size.lg.inset` from 5px to 4px — and that leaf was aurora's ONLY reference to `core.dimension.5`, so
 * the primitive would have DEMOTED out of aurora's grid (a guaranteed-surface removal → MAJOR, and a hard block
 * at `lint-materialization-renames`, which has no path for a non-rename deletion). It is not avoidable by
 * choosing switch numbers: the density window makes compact-`lg` the same rung as comfortable-`md`, so pinning
 * Prism 2's 32px at the default `md` forces compact-`lg` to 32 (inset 4, no 5). The fix is not to churn the
 * grid's small-primitive floor for an unrelated tier's arithmetic: `buildDims` now also feeds the box
 * mark-clearance `(height − dot) / 2` — the quantity that WAS `inset` before #1425, aurora's 3/4/5 — so
 * `core.dimension.5` stays exactly as guaranteed as it was on `main`, sourced by a real geometric value rather
 * than a phantom. The switch's own clearance is fed beside it. Surface stability kept, MINOR earned honestly.
 * (#1425)
 *
 * 10.3.0 — #1341 adds ONE guaranteed name: `core.palette.transparent`, the alpha-0 "no paint" color
 * primitive that every brand now emits (the default `color.field.fill` aliases it). A pure ADDITION — a
 * new name cannot break an existing reference — so a clean MINOR: 10.2.0 → 10.3.0. Nothing is removed or
 * retyped. The rest of #1341/#1342 moves VALUES, not names: `color.field.fill` / `color.inverse.field.fill`
 * keep their names and `color` type (only their default value becomes the transparent alias), the
 * contrast-aware `color.field.border.{rest,hover}` re-point their gating ground (`background.secondary`,
 * the darkest permissible) without moving a path, and select's hover reuses the existing
 * `color.interactive.neutral.overlay.hover` — no new role. So `transparent` is the whole guaranteed diff.
 * (#1341/#1342)
 *
 * 14.1.0 — #1852 adds THREE guaranteed names: `radius.xl`, `radius.2xl` and `radius.3xl`, the container corners
 * (card, panel, sheet, dialog) above `radius.lg`'s 6px. All three are rungs of the scaled ladder (`baseMd × 2`,
 * `× 3` and `× 4`, then `radiusScale`, snapped to the 2px sub-grid: 8, 12 and 16px at the default; owner
 * decision 2026-09-30, reproducing Prism 2's container ramp), so every brand at every scale emits them and all
 * three land in the GUARANTEED intersection. They alias existing `core.dimension.*` steps, so no primitive is
 * added. A pure ADDITION — a new name cannot break an existing reference — so a clean MINOR: 14.0.0 → 14.1.0.
 * Nothing is removed or retyped. (#1852)
 *
 * 14.0.0 — the spacing model (owner-decided MAJOR 2026-09-29, zero consumers confirmed): REMOVE the shared
 * size scale's spacing tokens, `size.{xs,sm,md,lg,xl}.{padding-x,padding-x-visual,padding-y,gap}` — 20 guaranteed
 * paths, gone from DTCG, the Figma `size` collection and every other emission. `size.*` now holds control
 * heights (and `size.md.min-height`) only. A component's padding and gaps are `space.*` steps its own def
 * states, and density moves them one step (`applySpacingDensity`); no per-component token replaces them, so
 * there is no `replacedBy` and no DEPRECATIONS entry: the migration is "bind the `space.*` step the
 * component's spec names". A guaranteed removal with no migration path: 13.2.0 → 14.0.0. Nothing is added or
 * retyped. Recorded in `docs/30` and `docs/28` §5.4.
 *
 * 13.2.0 — #1318 adds THREE guaranteed names: `color.veil.dark.clear` and `color.veil.light.clear`, the clear
 * ends a directional veil fades to (0% black and 0% white, appearance-invariant and fill-only like the other
 * veil roles), and `core.palette.white-alpha.0`, the 0%-white primitive the light one aliases. The dark one
 * aliases the existing `core.palette.transparent`, which is already 0% black. Every brand emits all three, so
 * all three land in the GUARANTEED intersection. A pure ADDITION — a new name cannot break an existing
 * reference — so a clean MINOR: 13.1.0 → 13.2.0. Nothing is removed or retyped. (#1318)
 *
 * 13.1.0 — #1670 adds FOUR guaranteed names. The two roles: `motion.duration.spin` (800ms, one turn of a
 * spinner) and `motion.duration-reduced.spin` (2600ms, the slow turn under reduced motion). And the two
 * value-keyed primitives they alias, `motion.duration-ms.800` and `motion.duration-ms.2600`: the turn is not
 * tempo-scaled, so every brand at every tempo now emits both, where 800 used to exist only at the standard
 * tempo. All four land in the GUARANTEED intersection. A pure ADDITION — a new name cannot break an existing
 * reference — so a clean MINOR. Nothing is removed or retyped. (#1670)
 *
 * 13.0.0 — #1639 (owner-decided 2026-09-26, the mechanical fallout of the disposition): DEMOTE the single-role
 * weight composites a brand can swap. `eyebrow` and `code` ship one weight each by default and may replace
 * it (every category must keep one; `label` must keep `emphasis`), so `type.eyebrow.{sm,md,lg}.emphasis`
 * and `type.code.inline.default` — 4 paths — move to `brandDependent`. Realized the only honest way: a
 * `minimal-weight-swap` corpus member swaps both sets and the paths drop out of the intersection. A
 * guaranteed removal is MAJOR whether or not the path is still emitted elsewhere (reported as DEMOTED, no
 * migration): 12.0.0 → 13.0.0. No component binds either family by name. `type.label.*.emphasis` stays
 * guaranteed: the engine refuses a label set without it. Nothing is added or retyped. (#1639)
 *
 * 12.0.0 — #1632 (owner-decided MAJOR): DEMOTE the weight roles a brand declines out of `guaranteed`. A brand
 * that narrows `typography.weights` ships no styles for the weights it doesn't use, which is the lever's
 * purpose ("if we are removing anything we are removing unused weights"). No corpus member pulled the lever,
 * so the default sets' `strong` composites were guaranteed and nb-redesign missed 17 of them at its own
 * settings: `type.{body,caption}.<size>.strong` + `-strong-link` (10), `type.display.sm.strong`, and
 * `type.title.{2xl,xl,lg,md,sm,xs}.strong`. Realized the honest way, as for #957 and #1479: a new
 * `minimal-weights` corpus member (nb-redesign's weight sets on the sparse input) drops the 17 out of the
 * intersection. They report as DEMOTED, still emitted by every brand that keeps `strong`, no migration, no
 * DEPRECATIONS entry. A guaranteed removal is MAJOR: 11.3.0 → 12.0.0. Nothing is added to `guaranteed` or
 * retyped. No component binds a demoted path by name: `field-label` resolves its weight by intent (#1602).
 * ENGINE STANDS: `out/**` is byte-identical (the corpus member is contract-only and emits no artifact). The
 * single-role sets (`label`/`eyebrow`/`code`) are the stated residual, #1639. (#1632)
 *
 * 11.3.0 — #1486 adds FOUR guaranteed names: `color.text.link.pressed`, `color.icon.link.pressed`, and their
 * `color.inverse.{text,icon}.link.pressed` twins — the new engaged link state. Every corpus brand emits links
 * (the link block in `buildContent` is unconditional and runs for both the page and inverse grounds, and for
 * both the text and icon profiles), so all four land in the GUARANTEED intersection, not `brandDependent`. A
 * pure ADDITION — a new name cannot break an existing reference — so a clean MINOR: 11.2.0 → 11.3.0. Nothing
 * is removed or retyped. The perceptibility stepping (#1486) moves link-state VALUES only, which carries no
 * contract (`link.default/hover/visited` keep their names). `token-contract.ts --accept` records the four adds
 * and refuses unless `CONTRACT_VERSION` was raised by exactly this MINOR first. (#1486)
 *
 * 11.2.0 — #1260 adds ONE guaranteed name: `type.label.lg.emphasis`, the large-button label rung minted at
 * 18px/emphasis (the body-lg size at the label tier's own weight). The label tier binds Inter in every
 * corpus brand (including `minimal`, which takes the default face), so the new composite lands in the
 * GUARANTEED intersection, not `brandDependent`. A pure ADDITION — a new name cannot break an existing
 * reference — so a clean MINOR: 11.1.0 → 11.2.0 (rebased). Nothing is removed or retyped. `size.large.type` (a
 * component binding, not a token path) re-points from `type.label.md.emphasis` to the new rung; the `md`
 * name is untouched and still bound elsewhere, so the only guaranteed-surface move is the single ADD.
 * `token-contract.ts --accept` records it and refuses unless `CONTRACT_VERSION` was raised by exactly this
 * MINOR first. (#1260)
 *
 * 11.1.0 — #1471 mints the interactive ICON ink role: `color.interactive.<family>.icon.{rest,hover,pressed}`
 * and its `color.inverse.interactive.<family>.icon.*` twin, for every built-in family (primary/neutral/
 * destructive) and every opt-in `interactivePalettes` column. A pure ADDITION — new names cannot break an
 * existing reference — so a clean MINOR: 11.0.0 → 11.1.0. Nothing is removed or retyped; the new roles are
 * VALUE-IDENTICAL to the sibling `text.*` roles (same resolved color), so no existing name moves and no value
 * a consumer already reads changes. Components (button/icon-button) now bind their glyph ink to these names
 * instead of borrowing `text.*`. (#1471)
 *
 * 11.0.0 — #1479 (owner-decided MAJOR, no consumers): DEMOTE the upper breakpoint tiers out of `guaranteed`.
 * `breakpoint.{lg,xl,2xl}` and `grid.{lg,xl,2xl}.{columns,gutter,margin}` — 12 paths — move to
 * `brandDependent`. The breakpoint COUNT is a per-brand lever (`layout.breakpoints`), and `bpNames` slices
 * the t-shirt ladder to the count, so a 2/3/4-floor brand emits none of these tiers. They were guaranteed
 * only because every corpus brand happened to ship 5+ floors — the identical over-claim `minimal` exists to
 * catch (a lever's DEFAULT is a value like any other), one axis in; `breakpoint.xs`/`grid.xs.*` are already
 * brand-dependent for the mirror reason (only aurora's 6 floors reach them). The demotion is realized the
 * only honest way — a new `minimal-bp2` corpus member (2 floors) drops the 12 paths out of the intersection —
 * NOT by hand-editing the baseline. A guaranteed removal is MAJOR whether or not the path is still emitted
 * elsewhere (it reports as DEMOTED, still emitted, no migration): 10.3.0 → 11.0.0. Owner confirmed no
 * consumers bind these names, so there is no real breakage; after this, a brand changing its breakpoint
 * count never forces a contract move again. No DEPRECATIONS entry — a demotion has no replacement path, the
 * name itself is what the 5-and-6-floor brands still emit. Nothing is added or retyped. (#1479)
 */
/**
 * 14.2.0 (#2053, owner 2026-10-04): MINOR. `radius.hairline` (1px, aliasing `core.dimension.1`) joins the
 * guaranteed surface. It was opt-in (`radiusHairline`, #1362) and so brand-dependent; every brand now emits
 * it, the NB fixture included, because `radiusScale` pushes it unconditionally. An added path cannot break a
 * reference. Nothing is removed or retyped. `radiusHairline` stays accepted in brand input and changes nothing.
 */
/**
 * 14.3.0 (#2266 PR 1, owner Q78 A and Q101 A, 2026-10-07): MINOR. The new `type.body.xs` rung (12px, body's line
 * height, face and tracking) adds `type.body.xs.default` and `type.body.xs.default-link` to the guaranteed surface.
 * Its other weights (`strong`, `emphasis`) and the italics follow the brand's body set exactly as `body.sm`'s do, so
 * they are brand-dependent, as body.sm's are. An added path cannot break a reference. Nothing is removed or retyped.
 */
/**
 * 14.4.0 (#2322, owner 2026-10-08): MINOR. Three tracking roles join the guaranteed surface, with their steps:
 * `core.font.letter-spacing-role.tightest` (−4%, `letter-spacing.neg-40`), `.snugger` (−1.5%, `neg-15`) and `.open`
 * (+1%, `letter-spacing.10`). All three steps were already on the locked ladder; only roles bind them now. The six
 * roles before them keep their names and values, so nothing a consumer reads moves. Nothing is removed or retyped.
 */
/**
 * 14.5.0 (#2324, owner Q110, 2026-10-08): MINOR. Labels are always underlined-capable: `type.label.{sm,md,lg}.emphasis-link`
 * join the guaranteed surface, minted for every brand whatever `typography.links` lists, because a button at the text
 * appearance underlines its label at rest and in every state (the underline is fixed). `default-link` follows the
 * brand's label weights, as `default` does, so it is brand-dependent. An added path cannot break a reference.
 * Nothing is removed or retyped.
 */
/**
 * 14.6.0 (owner decisions Q225 A and Q226 A, 2026-10-10): MINOR. Labels always carry the default weight:
 * `type.label.{sm,md,lg}.default` and `.default-link` join the guaranteed surface, minted for every brand whatever its
 * label weights or `buttonLabelWeight` say, because Tabs binds the default label on an unselected tab and emphasis on
 * the selected one. Until now they were brand-dependent (emitted only under `buttonLabelWeight: default`). An added path
 * cannot break a reference. Nothing is removed or retyped.
 */
/**
 * 14.7.0 (#2586, owner Q266 A, Q267 A, Q275 and Q282 A, 2026-10-13): MINOR. `type.label.{sm,md,lg}.line-box` join
 * the guaranteed surface: one line of the `type.label.{rung}` type (font size × line height), baked to px as
 * `control.size.*.line-box` is for body, so a glyph beside a wrapping title can center on its first line. It sits with
 * the type it measures, the first non-composite leaf under `type.*`. An added path cannot break a reference. Nothing
 * is removed or retyped.
 */
/**
 * 14.8.0 (#2669, owner Q550 e, 2026-10-22): MINOR. `border-width.x-heavy` (6px, aliasing `core.dimension.6`) joins
 * the guaranteed surface, the step above `heavy`: the large Slider's track, so the three slider sizes read 2, 4 and
 * 6px. An added path cannot break a reference. Nothing is removed or retyped.
 */
export const CONTRACT_VERSION = '14.8.0';

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

/**
 * #1317 — the media veil's rungs renamed from WCAG-floor names to INTENSITY names, both polarities.
 * `[polarity, old rung, new rung]`, stated LITERALLY here rather than imported from `modes.ts`'s
 * `VEIL_RUNGS`, so a typo dangles in `token-contract.ts --check` instead of agreeing with the subject it
 * records (`docs/34` shape 1). Read TWICE in `DEPRECATIONS`: the #1148 value-tier entries follow their
 * `replacedBy` to the new live name (the rungs were renamed out from under them), and the #1317 block
 * itself is `color.veil.<pol>.<old>` → `color.veil.<pol>.<new>`. One pairing, so the two cannot diverge.
 */
const VEIL_RUNG_RENAMES: ReadonlyArray<readonly [string, string, string]> = [
  ['dark', 'large', 'subtle'], ['dark', 'body', 'medium'], ['dark', 'enhanced', 'strong'],
  ['light', 'large', 'subtle'], ['light', 'body', 'medium'], ['light', 'enhanced', 'strong'],
];

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
  ] as Array<[string, readonly string[]]>).flatMap(([group, leaves]) =>
    leaves.map((leaf) => ({
      path: `color.appearance.${group}.${leaf}`,
      replacedBy: `color.${group}.${leaf}`,
      since: '9.0.0',
    }))),
  // `veil` is DELIBERATELY ABSENT from the loop above, because #1317 broke its `path` and `replacedBy`
  // leaves apart. #1148 moved the value-tier veil rungs to the short spelling under their OLD floor-names
  // (`color.appearance.veil.dark.body` → `color.veil.dark.body`); #1317 then renamed the rungs to
  // intensities (the block below), so `color.veil.dark.body` is no longer live. These six #1148 entries
  // therefore keep their `path` — history: the appearance-tier spelling really was retired at 9.0.0 — and
  // follow `replacedBy` to the NEW live name, the "renamed out from under them" rule the 3.0.0 border
  // entries already follow. `VEIL_RUNG_RENAMES` is where the old→new pairing is stated once.
  ...VEIL_RUNG_RENAMES.map(([pol, oldR, newR]) => ({
    path: `color.appearance.veil.${pol}.${oldR}`,
    replacedBy: `color.veil.${pol}.${newR}`,
    since: '9.0.0',
  })),
  // ── #1317: THE VEIL RUNGS RENAME FROM FLOOR-NAMES TO INTENSITY ──────────────────────────────────
  //
  // `veil.<pol>.{large,body,enhanced}` → `veil.<pol>.{subtle,medium,strong}`, both polarities — six
  // guaranteed paths renamed. The floor-names claimed a per-image contrast guarantee the engine cannot
  // keep (the floor is the worst pixel of an UNKNOWN image); the intensity names claim only magnitude,
  // which a designer can see. See `modes.ts`'s veil note for the owner's reasoning.
  //
  // A PURE NAME CHANGE — the VALUES do not move. The floors stay in `VEIL_RUNGS` as the default-picker,
  // so each rung derives to the identical alpha step and `regen --check` shows the emitted alphas
  // unchanged. That is a MAJOR by the removal rule (a guaranteed path leaves), and `replacedBy` names the
  // intensity twin so a consumer following the pointer keeps the same wash under a new name.
  //
  // THE FIGMA SIDE IS DERIVED FROM HERE, not recorded in `MATERIALIZATION_RENAMES`. A rung rename moves
  // the ROLE (`veil/dark/body` → `veil/dark/medium`), so `projectionsOf` yields a real variable rename;
  // a materialization rule would be a second record in front of one Figma operation, which
  // `lint-materialization-renames.ts` fails as `multiplyClaimed`. Stated literally (not imported from
  // `modes.ts`) so a typo dangles in `--check` rather than agreeing with its subject (`docs/34`).
  ...VEIL_RUNG_RENAMES.map(([pol, oldR, newR]) => ({
    path: `color.veil.${pol}.${oldR}`,
    replacedBy: `color.veil.${pol}.${newR}`,
    since: '10.0.0',
  })),
];

/** Semver levels, ordered — `LEVELS.indexOf` is the comparison. */
export const LEVELS = ['none', 'patch', 'minor', 'major'] as const;
export type Level = typeof LEVELS[number];

/** The committed baseline's shape (`schema/token-contract.json`). */
export type Contract = {
  contractVersion: string;
  /** No `engineVersion` (#1807): `token-contract.ts --check` refuses a baseline that carries one. */
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
 * Does `CONTRACT_VERSION` disagree with the baseline's recorded `contractVersion` in a way no surface
 * change can explain (#1768)? Read by BOTH `token-contract.ts` modes, before either decides anything.
 *
 *  - `'behind'` — the constant is LOWER than the version the baseline records. Always wrong, at every
 *    level: the only thing that ever raises the baseline's number is an `--accept` that saw the constant
 *    at that value, so a lower constant is a revert, a bad merge resolution or a hand edit. A consumer
 *    pinned to the higher number would read a lower one for the same surface. `--check` printed
 *    "unchanged" over this, because `classify` compares PATHS and never looked at the numbers.
 *  - `'ahead'` — the constant is HIGHER and no guaranteed path moved, so the bump has nothing to record.
 *    `--accept` already refused this (`satisfiesBump(…, 'none')` is equality) while `--check` printed
 *    "unchanged" over it: the two modes of one gate gave opposite verdicts on the same tree.
 *
 * DELIBERATELY NOT FLAGGED: a bump LARGER than a real diff requires (a MAJOR for an added path, or two
 * majors for one removal). `docs/30` states the rule as "raised by AT LEAST the increment the diff
 * requires", and `satisfiesBump` pins over-bumping as safe. Over-bumping costs a consumer a needless
 * review, never a silent miss, so it stays the owner's policy call rather than this gate's.
 *
 * Compares numerically per component, never as strings: `'9.10.0' < '9.9.0'` lexically.
 */
export const contractVersionDrift = (baseline: string, current: string, level: Level): 'behind' | 'ahead' | undefined => {
  const [ba, bi, bp] = parse(baseline);
  const [ca, ci, cp] = parse(current);
  const order = ca !== ba ? ca - ba : ci !== bi ? ci - bi : cp - bp;
  if (order < 0) return 'behind';
  if (order > 0 && level === 'none') return 'ahead';
  return undefined;
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
