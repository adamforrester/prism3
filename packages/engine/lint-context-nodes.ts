/**
 * Prism3 engine — CONTEXT NODES ARE GROUPS unless a stated reason says otherwise (#892), and `on-`
 * TAKES A GROUND (#1140).
 *
 * A CONTEXT NODE is the segment that says "this subtree is the variant used on a different ground".
 * Since #1140 there is exactly ONE spelling of it — a top-level `inverse` group — where #891/#892 had
 * `inverse` at three depths plus `on-inverse` for the text and icon families. Arm A asserts every
 * context node is a GROUP, not a leaf, unless it is named in `LEAF_OK` below with a reason. Arm C
 * asserts the other half of #1140's naming rule: an `on-<x>` segment names a GROUND, never a role or a
 * rank.
 *
 * ── WHY THE DEFAULT IS "GROUP" AND NOT "WHATEVER FITS TODAY" ────────────────────────────────────
 *
 * The two ways of getting this wrong do NOT cost the same, and that asymmetry is the whole argument:
 *
 *   - A LEAF that later needs siblings is a **MAJOR contract break**. The leaf must become a group,
 *     which removes a path consumers reference and adds new ones. We paid exactly this for
 *     `border.inverse` in #891 — a `CONTRACT_VERSION` major, two `DEPRECATIONS` entries, and a whole
 *     new `NB_KNOWN_RENAMES` mechanism in the Figma fixture gate so a var NB really exports stayed
 *     value-checked under its new name.
 *   - A GROUP with one child is **verbosity**. `inverse.scrim.default` is a mouthful and nothing else.
 *
 * When the two error directions cost that differently, the default belongs to the cheap one and the
 * expensive one has to be argued for. That is what "leaf must justify" encodes.
 *
 * ── THE REASON IS THE POINT, NOT THE NAME ───────────────────────────────────────────────────────
 *
 * `LEAF_OK` maps path → REASON, never a bare name list, and the reason has to answer a specific
 * question: **is this node single-valued because the CONCEPT has one value, or because nobody has
 * needed a second yet?** Those age in completely opposite directions. The first is a rule and stays
 * true; the second is a snapshot that quietly stops being true the day someone needs the second value
 * — and by then the leaf is in the contract and the fix is a MAJOR.
 *
 * A bare name list would record that somebody once decided; it could not record whether the decision
 * was ever good. Arm B below catches an entry that has gone stale; nothing but the written reason can
 * tell a reviewer whether it should have been written at all.
 *
 * Same standard `ZERO_OK` (`lint-absolute-inset.ts`) and `PROVENANCE_EXCEPTIONS` (`lint-paint.ts`)
 * already hold: an exemption carries its reason or it is not weighable.
 *
 * ── SCOPE, STATED PLAINLY ───────────────────────────────────────────────────────────────────────
 *
 * This proves a context node has the right SHAPE, and that a human wrote an answer where it does not.
 * It does NOT prove the answer is right — the same limit `lint-schema-classification.ts` states about
 * itself. `MIN_REASON` below is a floor against `'one role'`, not a judge of content.
 *
 * ── WHY IT SHIPS WITH AN EMPTY ALLOWLIST ────────────────────────────────────────────────────────
 *
 * There are **zero** context-node leaves in the tree today. #892 step 4 promoted the last two
 * (`text.on-inverse`, `icon.on-inverse`); seven of the nine were already groups, which is what showed
 * the one-at-a-time migration had run to completion rather than needing a fifth round. So this gate
 * is not a cleanup — it is the rule for what gets authored NEXT, and `inverse.scrim` (one role — the
 * open question `inverse-coverage.ts` holds) is its first real test.
 *
 * ── WHAT #1140 CHANGED HERE, AND WHY THE FLOOR MOVED RATHER THAN DROPPED ────────────────────────
 *
 * #1140 relocated every inverse role to one top-level `inverse` group, so the nine context nodes this
 * gate was built to sweep are now ONE. A floor of `total < 9` would fail on a healthy tree, and the
 * wrong repair would be to lower the number until it passes: shape 9 is that a detector finding nothing
 * reports a clean zero, and `total >= 1` is barely stronger than no floor at all. So the floor now
 * asserts what #1140 actually promises — **exactly one context node, and it is a POPULATED GROUP with
 * at least eight children** (the eight families that moved: background, border, disabled, field,
 * foreground, icon, text, interactive). That is checkable, it is what a passing tree looks like, and it
 * fails if the group flattens, splits, or empties.
 *
 * The child count is written as a LITERAL floor, not read from `modes.ts`. Deriving it from the emitter
 * would make the assertion `emitter === emitter` (`docs/34` shape 1) — the same reason `LEAF_OK` is a
 * hand-written table.
 *
 * Run: `npx tsx packages/engine/lint-context-nodes.ts`
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'out');

/**
 * The segments that mark a subtree as "the variant for a different ground".
 *
 * ONE ENTRY SINCE #1140 — `on-inverse` is gone from the vocabulary, not merely absent from the tree.
 * Rule 1 makes `inverse.` the sole inverse marker, and Rule 2 (arm C) refuses `on-inverse` outright, so
 * leaving it here would be a second, weaker statement of a name arm C now rejects.
 */
const CONTEXT_KEYS = new Set(['inverse']);

/**
 * ── ARM C: THE GROUNDS `on-` MAY NAME (#1140 Rule 2) ────────────────────────────────────────────
 *
 * `on-<x>` means "ink drawn ON x", so `x` has to be something a pixel can sit on: the enclosing role's
 * own fill, or a status colour that gets painted. It is NOT a role and NOT a rank — `on-primary` reads
 * as "the primary variant of on", which is not a thing, and it is the drift this arm exists to stop.
 *
 * A CLOSED WHITELIST on purpose. The alternative was a blacklist of known-bad suffixes (`primary`,
 * `secondary`, `disabled`, `inverse`), which passes anything nobody thought of — and the failure mode
 * here is precisely a name nobody thought about. A new ground is a decision, so it should cost a line in
 * this table; a new rank must cost a red gate.
 *
 * Authored from the RULE, never from `modes.ts` (`docs/34` shape 1): the emitter must not be able to
 * legalise a name by emitting it.
 */
const ON_GROUNDS = new Set(['fill', 'brand', 'danger', 'success', 'warning', 'info']);

/** Suffixes worth naming in the failure message, because each is a different mistake. */
const ON_REFUSED: Record<string, string> = {
  primary: 'a RANK, not a ground — ink on a ranked surface is `on-fill` if it sits on the enclosing role\'s fill, or `text.primary` if it sits on the page',
  secondary: 'a RANK, not a ground — see `on-primary`',
  tertiary: 'a RANK, not a ground — see `on-primary`',
  disabled: 'a STATE, not a ground — the ground is the disabled FILL, so it is `disabled.on-fill`',
  inverse: 'a CONTEXT, not a ground — #1140 Rule 1 makes it a leading `inverse.` group, so the ink is `inverse.text.primary`',
};

/**
 * Context nodes admitted as LEAVES, each with the reason it is single-valued.
 *
 * EMPTY BY CONSTRUCTION TODAY. An entry here is a claim that the node's concept holds exactly one
 * value — not that it happens to hold one now. Write which, in the reason; see the header.
 */
const LEAF_OK: Record<string, string> = {};

/** A reason shorter than this is a label, not a justification. Crude on purpose — see SCOPE above. */
const MIN_REASON = 40;

type Node = Record<string, unknown>;
const isLeaf = (n: unknown): boolean => !!n && typeof n === 'object' && '$value' in (n as Node);

const brands = readdirSync(OUT)
  .map((f) => /^([a-z0-9-]+)\.tokens\.json$/.exec(f)?.[1])
  .filter((b): b is string => !!b && !b.includes('.'))
  .sort();

if (!brands.length) {
  console.error('✗ no brand token trees found in out/ — nothing to check (did regen run?)');
  process.exit(1);
}

/**
 * One walk, two harvests, both keyed BELOW the configurable root:
 *   · `context` — every context node, as `path -> isLeaf` (arms A/B and the floor).
 *   · `on` — every `on-<x>` segment, as `path -> x` (arm C). A path, not just the suffix, so the
 *     failure names the token a designer would actually go looking for.
 * `childCount` carries the group's arity for the floor, which needs the shape and not just the name.
 */
const harvest = (tree: Node): { context: Map<string, boolean>; on: Map<string, string>; childCount: Map<string, number> } => {
  const context = new Map<string, boolean>();
  const on = new Map<string, string>();
  const childCount = new Map<string, number>();
  const rootKey = Object.keys(tree)[0];
  const walk = (n: unknown, path: string): void => {
    if (!n || typeof n !== 'object') return;
    for (const [k, v] of Object.entries(n as Node)) {
      if (k.startsWith('$')) continue;
      const p = path ? `${path}.${k}` : k;
      if (CONTEXT_KEYS.has(k)) {
        context.set(p, isLeaf(v));
        childCount.set(p, Object.keys(v as Node).filter((c) => !c.startsWith('$')).length);
      }
      if (k.startsWith('on-')) on.set(p, k.slice(3));
      walk(v, p);
    }
  };
  walk(tree[rootKey], '');
  return { context, on, childCount };
};

const failures: string[] = [];
const perBrand: string[] = [];
// The union across brands, so an entry justified against one brand is still checked against the rest.
const seen = new Map<string, boolean>();
const arity = new Map<string, number>();
let onChecked = 0;

for (const brand of brands) {
  const tree = JSON.parse(readFileSync(join(OUT, `${brand}.tokens.json`), 'utf8')) as Node;
  const { context: nodes, on, childCount } = harvest(tree);
  perBrand.push(`${brand} ${nodes.size}`);

  // ARM C — every `on-<x>` segment names a GROUND (#1140 Rule 2). Runs per brand rather than over the
  // union: a name only one brand emits is still a name in the contract.
  for (const [path, suffix] of on) {
    onChecked++;
    if (ON_GROUNDS.has(suffix)) continue;
    const why = ON_REFUSED[suffix] ?? `not a ground this system recognizes. \`on-\` means "ink drawn ON x", so x must be something painted — the enclosing role's fill (\`on-fill\`) or a status colour`;
    failures.push(`${brand}: '${path}' — \`on-${suffix}\` is refused by #1140 Rule 2: ${why}. If \`${suffix}\` really is a new ground, add it to ON_GROUNDS with that decision recorded; do not widen the scan.`);
  }

  for (const [path, leaf] of nodes) {
    // The floor needs the shape, so the arity travels with the name. Max across brands: a group is
    // populated if ANY brand populates it, and a brand that opts out of a family is not a flatten.
    arity.set(path, Math.max(arity.get(path) ?? 0, childCount.get(path) ?? 0));
    // A node that is a leaf in ANY brand is a leaf for this gate's purposes: the shape is a promise
    // about the name, and a consumer resolving it does not know which brand they are on.
    seen.set(path, (seen.get(path) ?? false) || leaf);
  }

  // ARM A — every context-node LEAF is admitted, with a reason.
  for (const [path, leaf] of nodes) {
    if (!leaf) continue;
    const reason = LEAF_OK[path];
    if (reason === undefined) {
      failures.push(`${brand}: '${path}' is a context node emitted as a LEAF and is not in LEAF_OK. Either make it a group (the default — a leaf that later needs siblings is a MAJOR break) or admit it with the reason its concept holds exactly one value.`);
    } else if (reason.trim().length < MIN_REASON) {
      failures.push(`${brand}: LEAF_OK['${path}'] reason is ${reason.trim().length} chars, under the ${MIN_REASON} floor — "${reason}". State whether the node is single-valued BY CONCEPT or merely so far; those age differently and only the first is a rule.`);
    }
  }
}

// ARM B — the converse, which is what stops the list rotting. An entry for a node that has since
// GAINED SIBLINGS is a waiver that no longer applies, and it would silently keep admitting a shape
// nobody re-argued. An entry for a node that no longer exists is the same failure one step further on.
// Checked against the union, so a node that is a group in every brand fails even though no single
// brand's ARM A loop would ever look at it.
for (const [path, reason] of Object.entries(LEAF_OK)) {
  if (!seen.has(path)) {
    failures.push(`LEAF_OK['${path}'] names a context node no brand emits — stale. Remove it. (reason on file: "${reason}")`);
  } else if (!seen.get(path)) {
    failures.push(`LEAF_OK['${path}'] is stale: that node is a GROUP now, so the exemption has outlived its justification and must be removed rather than left admitting a shape nobody re-argued. (reason on file: "${reason}")`);
  }
}

// FLOOR — `docs/34` shape 9: a detector that finds nothing reports a clean zero indistinguishable
// from a clean tree. It read `total < 9` until #1140, which collapsed the nine context nodes into one
// top-level `inverse` group; the number moved because the SHAPE moved, and lowering it to `< 1` would
// have left a floor that a scan matching nothing still clears. So it asserts #1140's actual promise —
// exactly one context node, a populated GROUP — and fails a flatten, a split, or an empty group.
const EXPECTED_CONTEXT_NODES = 1;
const MIN_INVERSE_CHILDREN = 8;
const total = seen.size;
if (total !== EXPECTED_CONTEXT_NODES) {
  failures.push(`found ${total} context node(s) across ${brands.length} brand(s), expected exactly ${EXPECTED_CONTEXT_NODES} — \`color.appearance.inverse\`. #1140 relocated every inverse role under ONE top-level group; more than one means the marker is back at a per-family depth, and fewer means this scan is asserting over an empty set. Found: ${[...seen.keys()].join(', ') || '(none)'}`);
}
for (const [path, n] of arity) {
  if (n < MIN_INVERSE_CHILDREN) {
    failures.push(`context node '${path}' has ${n} child group(s), under the floor of ${MIN_INVERSE_CHILDREN}. #1140 moved eight families under it (background, border, disabled, field, foreground, icon, text, interactive), so a group this thin means families have left it — the shape the floor exists to notice, not a smaller brand.`);
  }
}
if (!onChecked) {
  failures.push(`no \`on-<x>\` segments found in any brand — arm C is asserting over an empty set. The corpus emits at least \`on-fill\` and the status inks (\`on-brand\`, \`on-danger\`, \`on-success\`, \`on-warning\`, \`on-info\`), so zero means the \`on-\` prefix moved and the scan no longer finds what Rule 2 governs.`);
}

const groups = [...seen.values()].filter((l) => !l).length;
console.log(`Prism3 context-node shape — ${brands.length} brands, ${total} distinct context nodes (${groups} groups, ${total - groups} leaves), ${Object.keys(LEAF_OK).length} admitted`);
console.log(`  per brand: ${perBrand.join(' · ')}`);
console.log(`  \`on-\` grounds: ${onChecked} segment(s) checked against ${ON_GROUNDS.size} admitted ground(s) (Rule 2)`);

if (failures.length) {
  console.error(`\n❌ ${failures.length} context-node failure(s):\n`);
  for (const f of failures) console.error(`    ${f}`);
  process.exit(1);
}
console.log('✓ clean — every context node is a group, every admitted leaf carries its reason, and every `on-` names a ground.');
