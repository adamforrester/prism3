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
 */
export const ENGINE_VERSION = '0.3.3';

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
 */
export const CONTRACT_VERSION = '2.1.0';

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
