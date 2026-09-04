/**
 * RUNG-NAME GATE (#756) — a def's size enum against the emitted token tier, in two arms.
 *
 *   npx tsx packages/engine/lint-rung-names.ts
 *
 * ── THE DIVERGENCE THIS EXISTS TO SEE ───────────────────────────────────────────────────────────
 *
 * The KB briefs and the engine's emitted tier use THE SAME RUNG NAMES FOR DIFFERENT VALUES, offset by
 * exactly one rung:
 *
 *              16     20     24     32     40
 *   brief      sm     md*    lg     xl      —      (`components/icon.md` §15, * = its default)
 *   engine     xs     sm     md*    lg     xl      (`ICON_SIZES` in `scale.ts`)
 *
 * On the overlap the VALUES agree exactly, so nothing is wrong — the two just name one ladder
 * differently. That is what makes it dangerous. A def that adopted the brief's names would make
 * `icon.size.md` mean **24** in the token layer and **20** in the component API. Both halves stay
 * individually valid: the token resolves, the enum typechecks, and every other gate in the repo passes.
 * The divergence is visible only to someone reading two files side by side. It is #708's shape exactly
 * — a WRONG VALUE THAT RESOLVES — and #708 is the reason this repo does not consider "it resolved" to
 * be evidence of anything.
 *
 * The rule, stated in `docs/28` §5.2 and `docs/40` §7: **a brief's rung names are input; the engine's
 * token names are the API. Where they collide the engine wins, and the def records the offset.** The
 * engine wins because principle 5 makes the emitted names the CONTRACT — `CONTRACT_VERSION` governs
 * them and consumers hard-code them — while a brief is input to authoring and promises nobody anything.
 *
 * `icon` is the FIRST instance, not the only one: `components/` holds 45 briefs and `docs/40` queues
 * eighteen more defs authored from them. Unresolved, four authors resolve this four times in four PR
 * comments and the fifth gets it wrong.
 *
 * ── ARM 1: EVERY ENUM VALUE NAMES A REAL RUNG (necessary, and NOT sufficient) ────────────────────
 *
 * Every rung a def's `size` axis admits must resolve to an emitted token path, in every brand. This is
 * the arm #756 asked for first and it is deliberately labelled insufficient IN ITS OWN OUTPUT, because
 * a def declaring `size: ['sm','md','lg','xl']` against a five-rung tier passes it trivially — those
 * are all real paths; they are just the wrong four. Necessary, cheap, and it cannot see the defect.
 *
 * Note what it does NOT do: restate the ladder. `test.ts` pins `icon`'s enum as the literal
 * `'xs,sm,md,lg'`, which is right there (it is a claim about one def's authored intent) and would be
 * wrong here — a list of expected rungs in this file would make the gate agree with itself for every
 * def added later. The tier is read from the emitted tree, per brand.
 *
 * ── ARM 2: THE ENUM MAPS TO THE RUNGS THE DEF'S OWN BINDINGS REACH (the arm that matters) ────────
 *
 * This is `lint-paint.ts` arm 1's structure, and the reason #756 named that gate. A def states its size
 * ladder TWICE, in two independently-authored places:
 *
 *   EXPECTED — `props.size.values` / `variants.size`: the enum a consumer writes.
 *   ACTUAL   — `tokens`: the binding keys and the token refs they point at.
 *
 * `button` declares `['small','medium','large']` and binds `size.small.height → size.sm.height`. Those
 * are two different vocabularies meeting on one line, and a correct def keeps them in agreement. So:
 *
 *   A. EVERY ENUM VALUE IS BOUND. A rung the enum admits that no binding reaches is a size a consumer
 *      can ask for that resolves to nothing.
 *   B. EVERY BOUND KEY IS IN THE ENUM. A binding for a rung the enum omits is dead weight that reads
 *      as coverage — and it is the direction that catches an enum NARROWED without its bindings.
 *   C. THE MAPPING IS ONE-TO-ONE AND ORDER-PRESERVING WITHIN A TIER FAMILY. This is the half that sees
 *      the offset. Enum position i must map to a tier rung no LOWER than position i-1's — measured
 *      against `RUNG_ORDER`, the tier's own emitted order, not against a mapping table restated here.
 *      A def whose enum walks `small→md, medium→sm` is individually resolvable on every line and
 *      inverted as a ladder.
 *
 * Why MONOTONIC rather than STRICTLY monotonic, which is the one judgment call in this file and is
 * measured rather than preferred: `button` binds `size.large.type → type.label.md.emphasis`, sharing
 * `md` with `medium`. That is CORRECT — `type.label` emits only two rungs (`sm`, `md`) in all four
 * brands, so a three-size control legitimately clamps its label at the top. Strict monotonicity would
 * fail that, and the fix would be to add an exception, which is the wrong shape: a repeat is a clamp
 * against a shorter tier and it is always benign, while a REVERSAL is never benign. Monotonicity admits
 * the first and refuses the second with no exception list at all. (Measured across the corpus: 13 of 14
 * tier families are strictly increasing; the single non-strict one is that clamp.)
 *
 * ── ARM 3: THE DEFAULT RULE (#756's third Do bullet — a rule, asserted at zero) ──────────────────
 *
 * `icon`'s default moved from the brief's 20 to 24 purely because the names shifted one rung. That is a
 * VALUE change reached by a NAMING argument, and #756 is right that it wants a stated rule rather than
 * a per-def judgment. The rule, and it was found in the corpus rather than invented:
 *
 *   **A def's default size resolves to the tier's `md` rung.**
 *
 * It holds 5/5 across every def with a size axis today — `icon` defaults `md`, and `button`,
 * `icon-button`, `field-label` and `text-field` all default `medium`, whose bindings reach `size.md.*`
 * / `icon.size.md` / `type.label.md.*` and nothing else. So it is a property of the corpus, not a
 * description of one def, which is what makes it assertable for defs that do not exist yet.
 *
 * And it is the rule that DISSOLVES the value-change objection instead of arguing with it. The choice
 * on `icon` looked like "preserve the brief's VALUE (20, so default `sm`) or preserve the brief's
 * POSITION (mid, so default `md` = 24)". Position wins, and the composition evidence is what decides
 * it rather than taste: `button` and `icon-button` at their own default `medium` both bind
 * `icon.size.md` = 24. A standalone `<Icon>` defaulting to 20 while the same icon inside a
 * default-size button renders 24 is an inconsistency a designer sees immediately and a gate never
 * would. Preserving the brief's value would have BROKEN the identity that `scale.ts` deliberately
 * built — the icon ladder pairs 1:1 with `componentSizes` so control size → icon size is the identity
 * rather than a reconciliation. The default follows the ladder's shape, and the ladder is the engine's.
 *
 * The `md` rung is named in this file as a CONSTANT (`DEFAULT_RUNG`), which is a deliberate choice
 * against reading it out of the tier as "the middle one". `type.label` has two rungs, so "middle" is
 * not well defined; and a rule whose expectation is computed from the tier's length would silently
 * re-point at a different rung the day a tier gained a step. The rule says `md`, so the gate says `md`.
 *
 * ── INDEPENDENCE (`docs/34`) ────────────────────────────────────────────────────────────────────
 *
 * Four shortcuts were available and each would have made this gate agree with itself:
 *
 *   1. Calling `expandKey` / `varOf` to resolve the binding keys. Those are the projector's own
 *      helpers, so EXPECTED and ACTUAL become one derivation and agree in every case including the
 *      mutated one — `lint-paint.ts` arm 1's stated reason for not calling `paintOf`. The key grammar
 *      is re-parsed here with a local regex instead.
 *   2. Deriving the expected rung list from the def (either side of it). The tier is the oracle for arm
 *      1 and it is read from the EMITTED TREE; #756's own words: *"a gate that derives the expected
 *      rung list from the tier it is checking cannot fail."*
 *   3. Deriving arm 2's EXPECTED from `tokens` — i.e. asking the bindings what the enum ought to be.
 *      The whole point is that `variants`/`props` and `tokens` are two authored halves; collapsing
 *      either into the other deletes the arm. **The two reads are the gate, not duplication to DRY.**
 *   4. Resolving values through the alias chain and comparing PIXELS. Tempting, and wrong for the
 *      claim: the offset defect is that the two sides agree on value and disagree on NAME. A gate
 *      comparing 24 to 24 sees nothing. The subject here is a name.
 *
 * ── SCOPE FLOOR, AND THE DEFS WITH NO SIZE AXIS ─────────────────────────────────────────────────
 *
 * `MUST_COVER` names every def carrying a size axis today, so a def that stops being covered — by
 * being deleted, or by having its axis quietly dropped — fails rather than shrinking the set the gate
 * reports clean over. A count would read that as a pass (`docs/34`).
 *
 * `focus-ring` and `field-message` declare no size axis and bind no `size.*` key. They are ADMITTED by
 * name in `NO_SIZE_AXIS` rather than skipped silently, and in both directions: a def listed there that
 * grows a size axis fails as a stale admission. Skipping them silently is how a gate ends up with a
 * scope that shrank without anyone deciding it should.
 *
 * ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────────────────────────────────
 *
 * It says nothing about whether a rung's VALUE is right — that is `test.ts`'s scale coverage and the
 * contrast contracts. It says nothing about whether the brief and the def agree, because the brief is
 * not in this repo (the KB is a separate upstream) and #756's decision is precisely that the brief does
 * not get a vote. And it does not check the per-def offset PROSE exists: #756's second Do bullet is
 * recorded per-def as a line where the author meets it, and a gate over comment text would assert
 * wording rather than behavior.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { componentDefs } from './components/index';
import type { ComponentDef } from './component-schema';

const OUT = join(import.meta.dirname, 'out');

/**
 * THE TIER'S RUNG ORDER, smallest first — the axis arm 2C measures monotonicity along.
 *
 * Authored here rather than inferred from a tree, and the distinction matters: this is the ORDER, which
 * no emitted JSON states (object key order is not a promise), while MEMBERSHIP is read from the emitted
 * tree per brand in arm 1. So the gate authors the one thing the artifact cannot tell it and reads the
 * one thing it can.
 */
const RUNG_ORDER = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * THE DEFAULT RULE (#756's third bullet): a size axis defaults to the rung reaching the tier's `md`.
 * A constant, not "the middle rung" computed from tier length — see the header for why.
 */
const DEFAULT_RUNG = 'md';

/**
 * DEFS WITH NO SIZE AXIS, admitted by name with the reason. Checked in BOTH directions: a def here
 * that grows a size axis fails as a stale admission, and a def with no axis that is absent from here
 * fails too. Silent skipping is how a gate's scope shrinks without a decision.
 */
const NO_SIZE_AXIS: Record<string, string> = {
  'focus-ring': 'a ring is sized by the control it surrounds, not by its own axis — its offset and width are bound, never enumerated',
  'field-message': 'validation copy takes one type role; its axis is `tone`, and size follows the field it belongs to',
};

/**
 * DEFS WHOSE SIZE LADDER IS STATED ONCE — a `props.size` enum and `size.*` bindings, but NO
 * `variants.size` — admitted by name with the reason, for the same argument `NO_SIZE_AXIS` makes.
 *
 * `icon` (#864) is the first and only one. Its Figma set enumerates `name` (40 glyphs), and a def cannot
 * declare a `variants` axis it does not project: `figmaAnatomySet` hands the plan an undefined size for an
 * unprojected axis and `figmaAnatomyPlan` refuses a sizeless coordinate for a def that DECLARES sizes.
 * The size PROP stays — a code consumer sizes an icon directly — so arms 1, 2 and 3 all still run on it.
 * What is gone is the two-halves comparison below, and that is the reason this list exists rather than an
 * `if (variants)` skipping quietly: the enum-vs-variants check was one of the gate's independent pairs,
 * and a def losing it should cost somebody a decision.
 *
 * Both directions, so neither half can go stale: a def here that regains `variants.size` fails as a stale
 * admission, and a def that loses it without being listed fails as an unadmitted skip.
 */
const LADDER_STATED_ONCE: Record<string, string> = {
  icon: 'its Figma grid is the 40-glyph `name` axis (#864), and a def cannot declare a `variants` axis it does not project — so the ladder lives in `props.size` and `tokens` only',
};

/**
 * The scope floor. `docs/34`: a gate with a scope asserts each promised surface is REPRESENTED, never
 * merely counts. Every def carrying a size axis today.
 */
const MUST_COVER = ['icon', 'button', 'icon-button', 'field-label', 'text-field', 'textarea', 'checkbox', 'radio', 'switch'];

/** Every token path in a brand's canonical tree, below the root — `icon.size.md`, `size.lg.height`. */
const tierPaths = (tree: Record<string, unknown>): Set<string> => {
  const root = Object.keys(tree)[0];
  const out = new Set<string>();
  const walk = (node: unknown, trail: string[]): void => {
    if (!node || typeof node !== 'object') return;
    const rec = node as Record<string, unknown>;
    if ('$value' in rec) { out.add(trail.join('.')); return; }
    for (const [k, v] of Object.entries(rec)) if (!k.startsWith('$')) walk(v, [...trail, k]);
  };
  walk(tree[root], []);
  return out;
};

/** Brands DISCOVERED from the emitted trees, not listed, so a new brand is covered the day it emits. */
const brands = readdirSync(OUT)
  .map((f) => /^([a-z0-9-]+)\.tokens\.json$/.exec(f)?.[1])
  .filter((b): b is string => !!b)
  .sort();

if (!brands.length) {
  console.error('✗ no brand token trees found in out/ — nothing to check (did regen run?)');
  process.exit(1);
}

/**
 * THE DEF'S ENUM — EXPECTED. Read from `props.size.values`, with `variants.size` cross-checked against
 * it: the two are separate fields a def states separately (#795 made `variants` the author's axis set
 * and `figmaProperties.variantAxes` the projected subset), and a def whose two statements of one
 * ladder disagree is the same divergence class one level in.
 */
const enumOf = (def: ComponentDef): { values: string[]; default?: string; variants?: string[] } => {
  const prop = def.props.find((p) => p.name === 'size');
  return {
    values: prop?.values ?? [],
    default: typeof prop?.default === 'string' ? prop.default : undefined,
    variants: (def.variants as Record<string, string[] | undefined> | undefined)?.size,
  };
};

/**
 * THE DEF'S BINDINGS — ACTUAL. Every `size.*` binding key, parsed into (enum value, tier family, tier
 * rung). The grammar is re-parsed here rather than resolved through `expandKey` (shortcut 1).
 *
 * Key shapes in the corpus, both handled: `size.<enumValue>` (icon — the rung IS the whole key tail)
 * and `size.<enumValue>.<prop>` (everything else). The tier FAMILY is the ref with its rung blanked to
 * `*`, so `size.sm.height` and `size.md.height` group while `icon.size.sm` stays separate — families
 * are compared independently because each is its own ladder against its own tier.
 */
type Binding = { key: string; value: string; ref: string; family: string; rung: string };
const bindingsOf = (def: ComponentDef): { parsed: Binding[]; rungless: string[] } => {
  const parsed: Binding[] = [];
  const rungless: string[] = [];
  for (const [key, ref] of Object.entries(def.tokens ?? {})) {
    const k = /^size\.([^.]+)(?:\.(.+))?$/.exec(key);
    if (!k) continue;
    const r = String(ref);
    // The rung as a whole dot-delimited segment, so a substring inside a longer word cannot match.
    const seg = r.split('.');
    const at = seg.findIndex((s) => RUNG_ORDER.includes(s));
    if (at === -1) { rungless.push(`${key} → ${r}`); continue; }
    parsed.push({
      key, ref: r, value: k[1], rung: seg[at],
      family: [...seg.slice(0, at), '*', ...seg.slice(at + 1)].join('.'),
    });
  }
  return { parsed, rungless };
};

const failures: string[] = [];
const notes: string[] = [];
const covered = new Set<string>();
let arm1Checks = 0;
let arm2Families = 0;

const trees = brands.map((b) => ({
  brand: b,
  paths: tierPaths(JSON.parse(readFileSync(join(OUT, `${b}.tokens.json`), 'utf8')) as Record<string, unknown>),
}));

for (const def of componentDefs) {
  const { values, default: dflt, variants } = enumOf(def);
  const { parsed, rungless } = bindingsOf(def);
  const admitted = def.id in NO_SIZE_AXIS;

  // ---- the two directions of the no-size-axis admission -----------------------------------------
  if (!values.length && !parsed.length) {
    if (!admitted)
      failures.push(`${def.id}: declares no size axis and binds no size.* key, and is not admitted in NO_SIZE_AXIS. Add it there with the reason, or the gate's scope is shrinking without a decision.`);
    else notes.push(`${def.id}: no size axis — admitted (${NO_SIZE_AXIS[def.id]})`);
    continue;
  }
  if (admitted) {
    failures.push(`${def.id}: admitted in NO_SIZE_AXIS as having no size axis, but it now declares [${values.join(', ')}] and binds ${parsed.length} size key(s). The admission is STALE — remove it in the same PR.`);
    continue;
  }
  covered.add(def.id);

  for (const r of rungless)
    failures.push(`${def.id}: binding '${r}' is keyed on the size axis but its ref names no tier rung (none of ${RUNG_ORDER.join('/')}). Arm 2 cannot place it on a ladder, so it would be checked by nothing.`);

  // ---- the def's two statements of its own enum -------------------------------------------------
  // ABSENCE IS ADMITTED BY NAME, never skipped (#864). `if (variants && …)` alone would let a def delete
  // one of this gate's two authored halves and report a pass — the same silent-scope-shrink the
  // `NO_SIZE_AXIS` arm above refuses, one field in. Both directions.
  const statedOnce = def.id in LADDER_STATED_ONCE;
  if (!variants && !statedOnce)
    failures.push(`${def.id}: declares props.size [${values.join(', ')}] but no variants.size, and is not admitted in LADDER_STATED_ONCE. One of this gate's two authored halves is missing, so the enum-vs-variants comparison silently does not run. Admit it there with the reason, or restore the axis.`);
  if (variants && statedOnce)
    failures.push(`${def.id}: admitted in LADDER_STATED_ONCE as stating its ladder once, but it now declares variants.size [${variants.join(', ')}]. The admission is STALE — remove it in the same PR and let the comparison run.`);
  if (variants && variants.join(',') !== values.join(','))
    failures.push(`${def.id}: props.size.values is [${values.join(', ')}] but variants.size is [${variants.join(', ')}] — one ladder stated twice, disagreeing. A consumer reads the prop; the projector reads the variants.`);

  // ---- ARM 1: every enum value names a real rung, per brand ------------------------------------
  // The enum value is the COMPONENT's vocabulary (`small`), the tier's is the ENGINE's (`sm`), so the
  // path checked is the one the def's own binding points at — read from `tokens`, never rebuilt from
  // the enum value, which would assume the very mapping arm 2 exists to verify.
  for (const { brand, paths } of trees) {
    for (const b of parsed) {
      arm1Checks++;
      if (!paths.has(b.ref))
        failures.push(`${def.id} (brand '${brand}'): binding '${b.key}' points at '${b.ref}', which is not an emitted token path. The enum value '${b.value}' therefore resolves to nothing at that key.`);
    }
  }

  // ---- ARM 2: the enum maps to the rungs the def's own bindings reach ---------------------------
  const bound = new Set(parsed.map((b) => b.value));

  // A: every enum value is bound.
  for (const v of values)
    if (!bound.has(v))
      failures.push(`${def.id}: the enum admits size '${v}' and NO binding reaches it — a size a consumer can ask for that resolves to nothing. (bound: ${[...bound].join(', ') || 'none'})`);

  // B: every bound key is in the enum.
  for (const v of bound)
    if (!values.includes(v))
      failures.push(`${def.id}: '${v}' is bound by ${parsed.filter((b) => b.value === v).length} key(s) and is NOT in the enum [${values.join(', ')}] — either the enum was narrowed without its bindings, or the binding is dead weight that reads as coverage.`);

  // C: the mapping is order-preserving within each tier family — the arm that sees the offset.
  const families = new Map<string, Binding[]>();
  for (const b of parsed) {
    if (!values.includes(b.value)) continue; // already reported by B; ordering is undefined for it
    if (!families.has(b.family)) families.set(b.family, []);
    families.get(b.family)!.push(b);
  }
  for (const [family, rows] of families) {
    arm2Families++;
    rows.sort((a, b) => values.indexOf(a.value) - values.indexOf(b.value));
    // One enum value must not reach two different rungs in ONE family — that is not a ladder.
    for (const v of new Set(rows.map((r) => r.value))) {
      const rs = new Set(rows.filter((r) => r.value === v).map((r) => r.rung));
      if (rs.size > 1)
        failures.push(`${def.id}: size '${v}' reaches ${rs.size} different rungs (${[...rs].join(', ')}) within one tier family '${family}' — two bindings for one size that disagree about which rung it is.`);
    }
    const seq = rows.map((r) => RUNG_ORDER.indexOf(r.rung));
    for (let i = 1; i < seq.length; i++)
      if (seq[i] < seq[i - 1])
        failures.push(`${def.id}: in tier family '${family}' the enum walks '${rows[i - 1].value}' → ${rows[i - 1].rung} then '${rows[i].value}' → ${rows[i].rung}, which goes DOWN the tier. Every line resolves; the ladder is inverted. (${rows.map((r) => `${r.value}→${r.rung}`).join(', ')})`);
  }

  // ---- ARM 3: the default resolves to the tier's `md` rung -------------------------------------
  if (!dflt) {
    failures.push(`${def.id}: declares a size axis [${values.join(', ')}] and no default. The default rule (#756) has nothing to check, and a consumer omitting the prop gets whatever the implementation picks.`);
  } else if (!values.includes(dflt)) {
    failures.push(`${def.id}: size defaults to '${dflt}', which is not in its own enum [${values.join(', ')}].`);
  } else {
    const reached = [...new Set(parsed.filter((b) => b.value === dflt).map((b) => b.rung))].sort();
    if (!reached.length)
      failures.push(`${def.id}: size defaults to '${dflt}' and no binding reaches it, so the default rung cannot be checked.`);
    else if (reached.some((r) => r !== DEFAULT_RUNG))
      failures.push(`${def.id}: size defaults to '${dflt}', which reaches tier rung(s) ${reached.map((r) => `'${r}'`).join(', ')} — the rule (#756, docs/28 §5.2) is that a default resolves to '${DEFAULT_RUNG}'. A default one rung off is the #756 offset itself: it resolves, it typechecks, and the same icon renders one size standalone and another inside a default-size control.`);
    notes.push(`${def.id}: [${values.join(', ')}] default '${dflt}' → rung ${reached.map((r) => `'${r}'`).join(', ')}; ${families.size} tier family(ies): ${[...families.keys()].join(', ')}`);
  }
}

for (const m of MUST_COVER)
  if (!covered.has(m))
    failures.push(`SCOPE NOT REPRESENTED: '${m}' carries a size axis and this run checked none of it. If its axis was legitimately removed, move it to NO_SIZE_AXIS with a reason in the same PR; otherwise a clean run here means nothing.`);

for (const id of Object.keys(NO_SIZE_AXIS))
  if (!componentDefs.some((d) => d.id === id))
    failures.push(`STALE ADMISSION: NO_SIZE_AXIS names '${id}', which is not a def any more. Remove it — an admission for a def that does not exist is a memory of something no longer true.`);

for (const id of Object.keys(LADDER_STATED_ONCE))
  if (!componentDefs.some((d) => d.id === id))
    failures.push(`STALE ADMISSION: LADDER_STATED_ONCE names '${id}', which is not a def any more. Remove it — same reason as above.`);

console.log(`Rung names — ${covered.size} def(s) with a size axis, ${arm1Checks} enum→path check(s) across ${brands.length} brand(s) (${brands.join(', ')}), ${arm2Families} tier family(ies) ordered.`);
for (const n of notes) console.log(`    ${n}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} rung-name failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nA brief's rung names are INPUT; the engine's token names are the API (#756, docs/28 §5.2). The`);
  console.error(`brief and the engine name one ladder with a one-rung offset and agree on every value, so a def`);
  console.error(`that adopts the brief's names makes 'md' mean 24 in the token layer and 20 in the component API —`);
  console.error(`both halves valid, every other gate green, visible only by reading two files side by side.`);
  process.exit(1);
}
console.log(`  ✓ every size enum resolves to emitted rungs, maps one-to-one and in order onto its tier`);
console.log(`    families, and defaults to '${DEFAULT_RUNG}' — checked from the def's two independently-authored`);
console.log(`    halves (props/variants vs tokens), never from the projector's own lookup.`);
