/**
 * Prism3 engine — CONTEXT NODES ARE GROUPS unless a stated reason says otherwise (#892).
 *
 * A CONTEXT NODE is the segment that says "this subtree is the variant used on a different ground":
 * `inverse` as a path segment, and `on-inverse` where `on-` carries its ink-on sense (#891). This
 * gate asserts every one of them is a GROUP, not a leaf — unless it is named in `LEAF_OK` below with
 * a reason.
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
 *   - A GROUP with one child is **verbosity**. `scrim.inverse.default` is a mouthful and nothing else.
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
 * is not a cleanup — it is the rule for what gets authored NEXT, and `scrim.inverse` (one role) is its
 * first real test.
 *
 * Run: `npx tsx packages/engine/lint-context-nodes.ts`
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'out');

/** The segments that mark a subtree as "the variant for a different ground" (#891's vocabulary). */
const CONTEXT_KEYS = new Set(['inverse', 'on-inverse']);

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

/** Every context node in one tree, as `path -> isLeaf`, keyed BELOW the configurable root. */
const contextNodes = (tree: Node): Map<string, boolean> => {
  const found = new Map<string, boolean>();
  const rootKey = Object.keys(tree)[0];
  const walk = (n: unknown, path: string): void => {
    if (!n || typeof n !== 'object') return;
    for (const [k, v] of Object.entries(n as Node)) {
      if (k.startsWith('$')) continue;
      const p = path ? `${path}.${k}` : k;
      if (CONTEXT_KEYS.has(k)) found.set(p, isLeaf(v));
      walk(v, p);
    }
  };
  walk(tree[rootKey], '');
  return found;
};

const failures: string[] = [];
const perBrand: string[] = [];
// The union across brands, so an entry justified against one brand is still checked against the rest.
const seen = new Map<string, boolean>();

for (const brand of brands) {
  const tree = JSON.parse(readFileSync(join(OUT, `${brand}.tokens.json`), 'utf8')) as Node;
  const nodes = contextNodes(tree);
  perBrand.push(`${brand} ${nodes.size}`);
  for (const [path, leaf] of nodes) {
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
// from a clean tree. The corpus emits context nodes in every brand; if this scan stops finding them
// the vocabulary moved (another #891) and the gate is checking an empty set, not a healthy one.
const total = seen.size;
if (total < 9) {
  failures.push(`only ${total} context node(s) found across ${brands.length} brand(s) — the scan is looking for the wrong thing. #892 left 9 (background, foreground, border, field, text, icon, and three interactive columns); fewer means the vocabulary moved and this gate is asserting over an empty set.`);
}

const groups = [...seen.values()].filter((l) => !l).length;
console.log(`Prism3 context-node shape — ${brands.length} brands, ${total} distinct context nodes (${groups} groups, ${total - groups} leaves), ${Object.keys(LEAF_OK).length} admitted`);
console.log(`  per brand: ${perBrand.join(' · ')}`);

if (failures.length) {
  console.error(`\n❌ ${failures.length} context-node failure(s):\n`);
  for (const f of failures) console.error(`    ${f}`);
  process.exit(1);
}
console.log('✓ clean — every context node is a group, and every admitted leaf carries its reason.');
