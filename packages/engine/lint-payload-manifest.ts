/**
 * PAYLOAD MEMBERSHIP GATE (#674) — every committed generated artifact is classified, by hand.
 *
 *   npx tsx packages/engine/lint-payload-manifest.ts
 *
 * THE DEFECT THIS REMOVES. `out/` mixes three unrelated kinds of file — the brand's token trees
 * (payload), a regression report and a preview page (ours) — with NO mechanism saying which is
 * which. The only thing distinguishing them was that a human knew. When #668's emitter lands and
 * #625 eventually moves a payload somewhere, both need an answer to "which of these travels?", and
 * with no mechanism the answer becomes *whatever the first implementation happened to copy*. That
 * is the shape of the `Prism3/` debt #650 spent three PRs unwinding: a decision nothing forces is a
 * decision made by accident.
 *
 * THE FIELD IS UNANIMOUS and it is worth knowing none of them landed where we were. npm declares
 * `files[]`; shadcn declares a typed `files[]` per registry item; Style Dictionary declares
 * per-platform `files[]`; CRA declares `folders`. Not one uses "everything in the output
 * directory". Primer's two agent-facing markdown files ship because they are LISTED in `files[]` —
 * shipping them was a declaration, not a consequence of where they were written.
 *
 * ── WHY THE MANIFEST IS AUTHORED AND NOT EMITTED ────────────────────────────────────────────────
 *
 * `schema/payload-manifest.json` is hand-maintained and deliberately NOT a `regen.ts` artifact.
 * This is the single most important property of this gate and the one most likely to be "tidied"
 * away, so it is stated here rather than left to be inferred.
 *
 * If the manifest were regenerated from a scan of `out/`, a newly emitted artifact would classify
 * ITSELF and this gate would go green. The manifest would then be a second copy of the directory
 * listing — which is membership-by-location wearing a manifest's clothes, the exact defect the
 * manifest exists to remove. Identical reasoning keeps `token-contract.json` out of regen
 * (`token-contract.ts` header, CLAUDE.md principle 5): **a gate allowed to rewrite what it reads
 * has no memory.**
 *
 * So adding an emitted artifact FAILS this gate until a human classifies it. That friction is the
 * feature — it is the moment the payload question gets asked, which is the only moment it can be
 * answered deliberately.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * The two sides of every comparison here come from different places and neither is derived from the
 * other:
 *
 *   CLAIMED  — parsed from the authored manifest.
 *   ACTUAL   — read off disk: `out/**` walked, plus the engine-root and schema artifact lists
 *              imported from `regen.ts` so this gate's universe cannot drift from what regen emits.
 *
 * Importing the artifact LISTS from regen is importing the SUBJECT, not the expected value — the
 * same posture `lint-us-english.ts` takes. The expected value is the manifest, and it is authored.
 *
 * THE TRAP THIS GATE SIDESTEPS, stated because it is the one a rewrite would fall into. Patterns
 * are expanded over the manifest's AUTHORED `brands` list, never over brands discovered from
 * `out/`. Expanding over discovered brands would make a new brand's six files match automatically —
 * the manifest would have no memory of which brands are expected, and arm A could not fail for the
 * case it most needs to catch.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  every generated artifact matches EXACTLY ONE rule.  Unclassified → fail (the #674 defect).
 *                                                          Ambiguous (2+ rules) → fail.
 *   B  every rule matches AT LEAST ONE real file.          A rule for a deleted artifact → fail.
 *   C  authored brands == brands discovered in `out/`.     Both directions.
 *
 * A and C both fire when a brand is added; that is deliberate rather than redundant. C names the
 * cause ("brand X is emitted but not in the manifest") where A alone would report six confusing
 * unclassified files.
 *
 * ── WHAT THIS GATE CANNOT DO, measured rather than assumed ──────────────────────────────────────
 *
 * It checks that every artifact HAS a declared class and that the declaration stays maintained. It
 * cannot check the class is CORRECT. Moving `canonical-tree` from `payload` to `ours` in the
 * manifest is a serious error — it would silently drop the brand's token system from every future
 * eject — and this gate reports it as clean. Confirmed by mutation, not reasoned: swapping that one
 * rule between the two lists exits 0 with no output.
 *
 * That is not a hole to plug by inventing a second opinion about each file, because any such
 * opinion would have to be derived from the manifest or from the filename, and both are the thing
 * under test. The class is a HUMAN judgment, and the honest guard is review: the `why` field on
 * every rule exists so a reviewer can check the reasoning rather than the shape.
 *
 * Stated here because a gate whose limits are undocumented gets trusted past them — and the seven
 * mutations it DOES catch (below) make it look more complete than it is.
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): a new unclassified artifact · a deleted payload
 * rule · a rule matching nothing · a new brand emitted but undeclared · a declared brand removed ·
 * a declared brand emitting nothing · two rules claiming one file.
 *
 * SCOPE — every COMMITTED GENERATED artifact: `out/**`, `ENGINE_ARTIFACTS`, `SCHEMA_ARTIFACTS`.
 * Hand-authored files under `schema/` (`theme-schema.json`, `token-contract.json`) are out of
 * scope: the question this file answers is "which of the things the engine EMITS travel?". Covering
 * only `out/` would leave the other two regions undeclared and recreate the gap one level over.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_ARTIFACTS, SCHEMA_ARTIFACTS } from './regen';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const MANIFEST_PATH = resolve(here, 'schema', 'payload-manifest.json');

type Rule = { kind: string; pattern: string; why: string };
type Manifest = { brands: string[]; payload: Rule[]; ours: Rule[] };

const fail: string[] = [];
const note = (m: string): void => { fail.push(m); };

// ---- ACTUAL: what is on disk -------------------------------------------------------------------

/** Every file under `out/`, engine-relative, sorted. Walks so `figma/<brand>/*` is covered without
 *  naming a brand — the same shape `regen.ts` uses to build its comparison universe. */
const walk = (dir: string, prefix: string): string[] => {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) found.push(...walk(p, `${prefix}${name}/`));
    else found.push(`${prefix}${name}`);
  }
  return found;
};

const actual = [
  ...walk(outDir, 'out/'),
  ...ENGINE_ARTIFACTS,
  ...SCHEMA_ARTIFACTS.map((f) => `schema/${f}`),
].sort();

// ---- CLAIMED: what the authored manifest says --------------------------------------------------

const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const rules: Array<Rule & { class: 'payload' | 'ours' }> = [
  ...manifest.payload.map((r) => ({ ...r, class: 'payload' as const })),
  ...manifest.ours.map((r) => ({ ...r, class: 'ours' as const })),
];

/** A pattern matches a path when every literal segment is equal and every placeholder is filled.
 *  `{brand}` resolves ONLY against the authored brand list (see the trap above); `{mode}` and
 *  `{file}` accept any single non-empty segment-safe token. */
const matches = (pattern: string, path: string, brands: string[]): boolean => {
  const src = pattern
    .split(/(\{brand\}|\{mode\}|\{file\})/)
    .map((part) => {
      if (part === '{brand}') return `(?:${brands.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
      if (part === '{mode}') return '[a-z0-9-]+';
      if (part === '{file}') return '[^/]+';
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${src}$`).test(path);
};

// ---- ARM A: every artifact classified exactly once ---------------------------------------------

const classOf = new Map<string, string>();
for (const path of actual) {
  const hits = rules.filter((r) => matches(r.pattern, path, manifest.brands));
  if (hits.length === 0) {
    note(`UNCLASSIFIED: \`${path}\` matches no rule in payload-manifest.json — classify it as payload or ours (#674)`);
  } else if (hits.length > 1) {
    note(`AMBIGUOUS: \`${path}\` matches ${hits.length} rules (${hits.map((h) => h.kind).join(', ')}) — a file cannot be both`);
  } else {
    classOf.set(path, hits[0].class);
  }
}

// ---- ARM B: every rule earns its place ---------------------------------------------------------

for (const rule of rules) {
  if (!actual.some((p) => matches(rule.pattern, p, manifest.brands))) {
    note(`STALE RULE: \`${rule.kind}\` (\`${rule.pattern}\`) matches no emitted artifact — the artifact is gone, or the pattern is wrong`);
  }
}

// ---- ARM C: brand representation, both directions ----------------------------------------------

/** Brands as the FILESYSTEM reports them — the leading segment of every `out/<brand>.tokens.json`.
 *  Derived from the canonical tree specifically, because that is the one artifact every brand has.
 *  Independent of the manifest on purpose: this is the half that can disagree with it. */
const discovered = [...new Set(
  walk(outDir, '').filter((f) => /^[^/]+\.tokens\.json$/.test(f) && !f.includes('.base.') && !f.includes('.overlay.'))
    .map((f) => f.replace(/\.tokens\.json$/, '')),
)].sort();

for (const b of discovered) {
  if (!manifest.brands.includes(b)) note(`BRAND NOT DECLARED: \`${b}\` is emitted to \`out/\` but missing from the manifest's \`brands\` — add it deliberately`);
}
for (const b of manifest.brands) {
  if (!discovered.includes(b)) note(`BRAND NOT EMITTED: the manifest declares \`${b}\` but no \`out/${b}.tokens.json\` exists`);
}

// ---- report ------------------------------------------------------------------------------------

if (fail.length) {
  console.error('\n✗ payload manifest:\n');
  for (const f of fail) console.error(`  • ${f}`);
  console.error(`\n  ${fail.length} problem(s). The manifest is AUTHORED — fix it by classifying, never by widening a pattern to make this quiet.\n`);
  process.exit(1);
}

const payload = [...classOf.values()].filter((c) => c === 'payload').length;
console.log(`  ✓ clean — ${actual.length} generated artifacts, all classified: ${payload} payload, ${actual.length - payload} ours.`);
console.log(`    ${manifest.brands.length} brands declared and emitted (${manifest.brands.join(' · ')}); ${rules.length} rules, none stale.`);
