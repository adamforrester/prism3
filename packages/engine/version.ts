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
export const ENGINE_VERSION = '0.8.0';

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
export const CONTRACT_VERSION = '4.0.0';

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
