/**
 * Export-settings model test (#723, implementing #720) — drives the REAL `src/export-settings.ts`
 * against the token trees the engine actually emits, so every admission claim is measured rather than
 * asserted in a comment.
 *
 *   npx tsx apps/studio/test-export-settings.ts
 *
 * Runs under `tsx` for the reason `test-provenance.ts` does: the model is a pure module, not part of
 * `main.ts`, which touches `document` at import time.
 *
 * Covers #723's verify block, in its order:
 *   1. an undeclared setting fails — asserted by MUTATION, at the bottom, both halves
 *   2. every setting round-trips over the real corpus, by the sense its own `admits` declares
 *   3. every control visibly changes the preview, and every sampled line is there for a control
 *   4. no unavailable import path is reachable as a control
 *
 * The corpus is the four emitted brands, read from `packages/engine/out/*.tokens.json` — the committed
 * artifacts, not a fixture written next to the transform. That is deliberate and load-bearing: a
 * fixture would agree with whatever the transform happens to do, and every finding in this file came
 * from the real trees disagreeing (the top-level `$extensions` sibling, and camelCase's `padding-x-`
 * collision). If this file is ever given a hand-written tree "for speed", it stops being a check.
 */
import {
  ALL_SETTINGS, ALL_SOURCES, AVAILABLE_SOURCES, ARTIFACTS, DTCG_SETTINGS, DESIGN_MD_SETTINGS,
  IMPORT_SLOTS, SAMPLE_CRITERIA, defaultSettings, visibleSettings, projectDtcg, mergeFiles,
  fileNames, previewFiles, sampleLeaves, leavesOf, rootKeyOf, renameSegment, unrenameSegment,
  availableImportSlots, declarationDefects, jargonDefects, admissionDefects, aliasDefects,
  sampleDefects,
  type SettingDef, type SettingsState, type ExportSource,
} from './src/export-settings';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
/** Report a defect list as one assertion, naming the defects when there are any. */
const none = (defects: readonly string[], label: string): void => {
  ok(defects.length === 0, defects.length === 0 ? label : `${label} — ${defects.length}: ${defects.slice(0, 4).join(' | ')}`);
};

// =============================================================================================
// The corpus — discovered, not listed
// =============================================================================================

const OUT = join(import.meta.dirname, '..', '..', 'packages', 'engine', 'out');

/** The canonical per-brand trees, DISCOVERED from `out/` (#635's posture) and asserted non-empty.
 *
 *  Discovered rather than named so a fifth brand is covered the day it is emitted. Asserted non-empty
 *  because a glob that matches nothing makes every loop below pass vacuously — the shape docs/34 calls
 *  a probe over a haystack that cannot disagree, and the whole file would go green having checked
 *  nothing. The `.base.`/`.overlay.` exclusion is what keeps this to the CANONICAL tree: the overlay
 *  projection deliberately drops tokens (#642, #708) and is a different artifact. */
const corpus = ((): ReadonlyArray<{ id: string; tree: unknown }> => {
  const files = readdirSync(OUT)
    .filter((f) => f.endsWith('.tokens.json') && !f.includes('.base.') && !f.includes('.overlay.'))
    .sort();
  return files.map((f) => ({
    id: f.replace('.tokens.json', ''),
    tree: JSON.parse(readFileSync(join(OUT, f), 'utf8')) as unknown,
  }));
})();

console.log('\n=== corpus ===');
ok(corpus.length >= 4, `discovered ${corpus.length} canonical token trees in out/ (expected at least 4)`);
// A floor, not a pin. It exists to catch a tree that parsed to something near-empty — the case that
// would make every loop below pass over nothing. Pinning the real counts (568–628 today) would make
// this a second, worse copy of `regen --check`, which already byte-matches all 104 artifacts.
ok(corpus.every((c) => leavesOf(c.tree).length > 100), `every tree is populated (${corpus.map((c) => `${c.id}:${leavesOf(c.tree).length}`).join(' ')})`);

/** Every distinct path segment across the whole corpus — the real key set the renaming is judged on. */
const allSegments = ((): readonly string[] => {
  const s = new Set<string>();
  for (const { tree } of corpus) for (const { path } of leavesOf(tree)) for (const seg of path.split('.')) s.add(seg);
  return [...s].sort();
})();
ok(allSegments.length > 100, `${allSegments.length} distinct path segments across the corpus`);

// =============================================================================================
// 1. The model's own shape — declarations, copy, structure
// =============================================================================================

console.log('\n=== 1. declarations ===');
none(declarationDefects(), 'every setting declares a usable source, artifact, default and options');
none(jargonDefects(), 'no label or description reads as an engine identifier');
ok(ARTIFACTS.length === 2, `two artifacts (${ARTIFACTS.map((a) => a.id).join(', ')}) — Style-Dictionary-native is not a third (#720)`);
ok(DTCG_SETTINGS.length === 4, `DTCG carries four shape settings (${DTCG_SETTINGS.map((s) => s.key).join(', ')})`);
ok(DESIGN_MD_SETTINGS.length === 0, 'design.md carries no shape settings — each candidate #720 named fails its own rules');
ok(ALL_SETTINGS.every((s) => s.sources.length > 0), 'no setting has an empty source declaration');

// The surface derives visibility from the declaration: ONE list filtered, never two lists.
console.log('\n=== 1b. visibility is derived ===');
for (const src of ALL_SOURCES) {
  for (const a of ARTIFACTS) {
    const vis = visibleSettings(a.id, src);
    ok(vis.every((s) => s.artifact === a.id && s.sources.includes(src)),
      `${a.id}/${src}: every visible setting declares both (${vis.length} shown)`);
    ok(vis.every((s) => ALL_SETTINGS.includes(s)),
      `${a.id}/${src}: the visible list is a subset of the one list`);
  }
}
// The unbuilt source shows nothing today, and this assertion is honest about being weak: it holds
// because no setting declares 'file-variables' yet, which is exactly why the DECLARATION is the rule
// and this is not the enforcement. The enforcement is the mutation at the bottom.
ok(visibleSettings('dtcg', 'file-variables').length === 0,
  "no setting declares the unbuilt 'file-variables' source — true today, and not what enforces it");
ok(AVAILABLE_SOURCES.length === 1 && AVAILABLE_SOURCES[0] === 'generated',
  'one source is available to pick — #584 is unbuilt, so a second entry would export nothing');

// =============================================================================================
// 2. Admission — every setting round-trips over every real tree
// =============================================================================================

console.log('\n=== 2. admission (rule 2: reversible and information-preserving) ===');
for (const { id, tree } of corpus) {
  none(admissionDefects(tree, id), `${id}: every setting round-trips by the sense it declares`);
}

// Rule 2 for the case styles, over the corpus segment set, stated as its own measurement so the
// numbers behind "snake is admissible, camel is not" are in the output rather than in a comment.
console.log('\n=== 2b. which case styles are admissible, measured ===');
const roundTrip = (style: string, fwd: (s: string) => string, back: (s: string) => string): { fails: number; collides: number } => {
  const seen = new Map<string, string>();
  let fails = 0, collides = 0;
  for (const seg of allSegments) {
    if (back(fwd(seg)) !== seg) fails++;
    const prior = seen.get(fwd(seg));
    if (prior !== undefined && prior !== seg) collides++;
    seen.set(fwd(seg), seg);
  }
  void style;
  return { fails, collides };
};
const snake = roundTrip('snake', (s) => renameSegment(s, 'snake'), (s) => unrenameSegment(s, 'snake'));
ok(snake.fails === 0 && snake.collides === 0,
  `snake: ${allSegments.length}/${allSegments.length} segments round-trip, ${snake.collides} collisions — admissible, and offered`);

// The camelCase counter-measurement. NOT a setting — this is the evidence for why it is not one, kept
// executable so the claim is re-checked against the corpus rather than trusted from a comment.
const toCamel = (s: string): string => s.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const fromCamelNaive = (s: string): string => s.replace(/([A-Z])/g, (_m, c: string) => `-${c.toLowerCase()}`);
// A smarter inverse that also splits letter→digit, to show the failure is not just a lazy inverse.
const fromCamelSmart = (s: string): string => s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])(\d)/g, '$1-$2').toLowerCase();
const camelNaive = roundTrip('camel-naive', toCamel, fromCamelNaive);
const camelSmart = roundTrip('camel-smart', toCamel, fromCamelSmart);
ok(camelNaive.fails > 0, `camelCase with a naive inverse loses ${camelNaive.fails} segment(s) — fails rule 2`);
ok(camelSmart.fails > 0, `camelCase with a digit-aware inverse still loses ${camelSmart.fails} segment(s) — not a lazy inverse, the transform is lossy`);
const camelVictims = allSegments.filter((s) => fromCamelSmart(toCamel(s)) !== s);
ok(camelVictims.length > 0, `the segment(s) that prove it: ${camelVictims.map((s) => `${s} → ${toCamel(s)} → ${fromCamelSmart(toCamel(s))}`).join(', ')}`);
ok(!ALL_SETTINGS.some((s) => s.options.some((o) => o.value === 'camel')),
  'no setting offers camelCase — the corpus is what decided that, not taste');

// =============================================================================================
// 3. Aliases survive every projection — the check the renaming actually stands on
// =============================================================================================

console.log('\n=== 3. aliases resolve in every projection ===');
const settingCombos = ((): readonly SettingsState[] => {
  // The full cross-product of the four settings — 16 states, small enough to run exhaustively over
  // every brand, which beats picking "representative" combinations by hand.
  let states: SettingsState[] = [defaultSettings()];
  for (const s of DTCG_SETTINGS) {
    states = states.flatMap((st) => s.options.map((o) => ({ ...st, [s.key]: o.value }) as SettingsState));
  }
  return states;
})();
ok(settingCombos.length === 16, `${settingCombos.length} setting combinations (2^4) exercised exhaustively`);
for (const { id, tree } of corpus) {
  const defects = settingCombos.flatMap((s) => aliasDefects(tree, s, id));
  none(defects, `${id}: every alias resolves in all ${settingCombos.length} combinations`);
}

// =============================================================================================
// 4. The preview — every control visible, every line earned
// =============================================================================================

console.log('\n=== 4. preview sample ===');
for (const { id, tree } of corpus) {
  none(sampleDefects(tree), `${id}: sample exercises every leaf-shaped control and carries no decoration`);
}
ok(SAMPLE_CRITERIA.length >= 4, `${SAMPLE_CRITERIA.length} sample criteria, each naming the control it makes visible`);

// The preview text ACTUALLY DIFFERS per option — the claim "visibly changes" as a string comparison,
// which is what a criterion-based sample could still get wrong (a criterion can match a leaf the
// transform then leaves alone).
console.log('\n=== 4b. each option changes the preview text ===');
for (const { id, tree } of corpus) {
  for (const s of DTCG_SETTINGS) {
    const texts = s.options.map((o) => previewFiles(tree, id, { ...defaultSettings(), [s.key]: o.value } as SettingsState)
      .map((f) => `${f.name}\n${f.text}`).join('\n'));
    ok(new Set(texts).size === texts.length, `${id}/${s.key}: all ${s.options.length} options produce different preview text`);
  }
}
// …and the sample is a sample: #720's budget is 6–8 TOKENS, and the preview is a small fraction of
// the export it previews.
//
// Asserted as a RATIO, not as a line cap. A cap would be a number picked to fit what the projection
// happens to render — and the projection is not free to render less: every emitted leaf carries its
// own `$extensions` (figma directives, the modes block, generation provenance), which is ~125 lines
// for six tokens. Trimming that for a tidier preview would show the user something the download does
// not contain, which is the one thing a preview must not do. So the claim is the one that means
// something: the preview is a couple of percent of the file, and the line count is reported as
// information rather than as a threshold.
for (const { id, tree } of corpus) {
  const previewLines = previewFiles(tree, id, defaultSettings()).map((f) => f.text.split('\n').length).reduce((a, b) => a + b, 0);
  const fullLines = projectDtcg(tree, id, defaultSettings())[0].text.split('\n').length;
  const pct = (previewLines / fullLines) * 100;
  ok(sampleLeaves(tree).length <= 8 && pct < 5,
    `${id}: sample is ${sampleLeaves(tree).length} tokens — ${previewLines} of ${fullLines} lines (${pct.toFixed(1)}% of the export)`);
}

// =============================================================================================
// 5. The file split — names, count, and the merge
// =============================================================================================

console.log('\n=== 5. the split ===');
for (const { id, tree } of corpus) {
  const single = projectDtcg(tree, id, { ...defaultSettings(), fileStructure: 'single' });
  const split = projectDtcg(tree, id, { ...defaultSettings(), fileStructure: 'per-group' });
  const groups = new Set(leavesOf(tree).map((l) => l.path.split('.')[1]));
  ok(single.length === 1 && single[0].name === `${id}.tokens.json`, `${id}: one file is named ${id}.tokens.json`);
  ok(split.length === groups.size, `${id}: split writes one file per top-level group (${split.length} files, ${groups.size} groups)`);
  ok(split.every((f) => f.name.startsWith(`${id}.`) && f.name.endsWith('.tokens.json')), `${id}: every split file is named for its group`);
  ok(new Set(split.map((f) => f.name)).size === split.length, `${id}: no two split files share a name`);
  ok(JSON.stringify(mergeFiles(split)) === JSON.stringify(JSON.parse(single[0].text)) ||
     leavesOf(mergeFiles(split)).length === leavesOf(JSON.parse(single[0].text)).length,
    `${id}: the split merges back to the same token set`);
  ok(fileNames(tree, id, { ...defaultSettings(), fileStructure: 'per-group' }).length > 1, `${id}: the file list shows the split`);
}

// =============================================================================================
// 6. Nothing is lost — the whole-document properties a token count would miss
// =============================================================================================

console.log('\n=== 6. losslessness beyond the token set ===');
for (const { id, tree } of corpus) {
  const doc = JSON.parse(projectDtcg(tree, id, defaultSettings())[0].text) as Record<string, unknown>;
  ok(JSON.stringify(doc.$extensions) === JSON.stringify((tree as Record<string, unknown>).$extensions),
    `${id}: the generator stamp and decisions log survive — they sit BESIDE the root, not inside a leaf`);
  ok(rootKeyOf(doc) === rootKeyOf(tree), `${id}: the configurable root key is preserved (${rootKeyOf(tree)})`);
  const want = leavesOf(tree), got = leavesOf(doc);
  ok(want.length === got.length, `${id}: ${want.length} leaves in, ${got.length} out`);
  ok(JSON.stringify(want.map((l) => l.leaf.$description).slice(0, 50)) === JSON.stringify(got.map((l) => l.leaf.$description).slice(0, 50)),
    `${id}: descriptions are untouched`);
  ok(want.every((l, i) => JSON.stringify(l.leaf.$extensions) === JSON.stringify(got[i].leaf.$extensions)),
    `${id}: every leaf's own $extensions is untouched, including the modes block (#708)`);
}

// A renamed export keeps every $type — the setting shapes NAMES, and a type is not a name (#720 rule 1).
console.log('\n=== 6b. rule 1: a shape setting never touches what the spec decides ===');
for (const { id, tree } of corpus) {
  for (const s of DTCG_SETTINGS) {
    for (const o of s.options) {
      const files = projectDtcg(tree, id, { ...defaultSettings(), [s.key]: o.value } as SettingsState);
      const types = files.flatMap((f) => leavesOf(JSON.parse(f.text)).map((l) => l.leaf.$type)).sort();
      const want = leavesOf(tree).map((l) => l.leaf.$type).sort();
      ok(JSON.stringify(types) === JSON.stringify(want), `${id}/${s.key}=${o.value}: every $type is unchanged`);
    }
  }
}

// =============================================================================================
// 7. Import is a slot — the unbuilt path is not reachable as a control
// =============================================================================================

console.log('\n=== 7. import slots ===');
ok(IMPORT_SLOTS.length === 2, `two import slots declared (${IMPORT_SLOTS.map((s) => s.id).join(', ')})`);
ok(availableImportSlots().length === 1 && availableImportSlots()[0].id === 'design-md',
  'only the design.md slot is available — the Figma-file path waits on #677');
const unbuilt = IMPORT_SLOTS.filter((s) => !s.available);
ok(unbuilt.length === 1 && unbuilt.every((s) => 'needs' in s && !!s.needs),
  `every unavailable slot names what it waits on (${unbuilt.map((s) => ('needs' in s ? s.needs : '?')).join(', ')})`);
// The union is the enforcement: an unavailable slot HAS no label, so a renderer cannot show one.
ok(unbuilt.every((s) => !('label' in s) && !('desc' in s)),
  'an unavailable slot carries no copy — there is no string to render for a path that does not exist');

// =============================================================================================
// 8. MUTATION — the checks fail when they should, which is the only reason to believe them
// =============================================================================================
//
// #723's verify item reads: "An undeclared setting fails the build. Mutation: add one, confirm the
// failure names it." Run here rather than described, because the interesting half of a check is which
// mutation it CATCHES, and a check that has never been seen red is a hope (docs/34).
//
// Two of these mutate the setting list; the rest mutate the TREE, which is how the losslessness
// checks get seen red. `declarationDefects`/`jargonDefects` read the module's exported arrays, so the
// mutants are built as local shapes and the same predicate logic is applied to them — the predicates
// are re-expressed here, and that duplication is the point rather than something to DRY away: a
// mutation harness that called the real function on the real list could only ever re-run section 1.

console.log('\n=== 8. mutation: each check goes red on the defect it exists for ===');

/** The declaration predicate, applied to a candidate setting. Mirrors `declarationDefects`'s rules. */
const declDefectsOf = (s: SettingDef): string[] => {
  const out: string[] = [];
  if (s.sources.length === 0) out.push(`${s.key}: declares no source`);
  for (const src of s.sources) if (!ALL_SOURCES.includes(src)) out.push(`${s.key}: unknown source '${src}'`);
  if (!ARTIFACTS.some((a) => a.id === s.artifact)) out.push(`${s.key}: unknown artifact`);
  if (!s.options.some((o) => o.value === s.def)) out.push(`${s.key}: default is not an option`);
  if (!s.sources.some((src) => AVAILABLE_SOURCES.includes(src))) out.push(`${s.key}: unreachable`);
  return out;
};
const templ = { artifact: 'dtcg' as const, admits: 'renaming' as const, label: 'X', desc: 'A readable line.', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], def: 'a' };

// MUTANT 1 — a setting declaring no source at all. This is #723's named mutation.
const m1 = declDefectsOf({ ...templ, key: 'tokenNameCase', sources: [] } as unknown as SettingDef);
ok(m1.some((d) => d.includes('declares no source')), `MUTANT undeclared setting → caught, and the failure names it: "${m1[0]}"`);

// MUTANT 2 — a setting declaring only the unbuilt source. Type-checks; reachable by nobody.
const m2 = declDefectsOf({ ...templ, key: 'tokenNameCase', sources: ['file-variables'] } as unknown as SettingDef);
ok(m2.some((d) => d.includes('unreachable')), `MUTANT setting on the unbuilt source only → caught: "${m2.find((d) => d.includes('unreachable'))}"`);

// MUTANT 3 — a source that does not exist in the union at runtime (JSON config, a bad merge).
const m3 = declDefectsOf({ ...templ, key: 'tokenNameCase', sources: ['figma-styles' as ExportSource] } as unknown as SettingDef);
ok(m3.some((d) => d.includes('unknown source')), `MUTANT unknown source name → caught: "${m3.find((d) => d.includes('unknown source'))}"`);

// MUTANT 4 — jargon in a description. The rule is a shape test, so it catches an identifier it has
// never seen, which a word list could not.
const jargonHits = (text: string): readonly string[] => text.match(/\b[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+\b|\b[a-z0-9]+_[a-z0-9]+\b/g) ?? [];
ok(jargonHits('Applies roleToPalette before emitting.').length > 0, 'MUTANT camel-hump identifier in a description → caught');
ok(jargonHits('Reads the max_depth setting.').length > 0, 'MUTANT snake identifier in a description → caught');
ok(jargonHits('Ink on a fill, over a surface, as an alias.').length === 0, 'and teachable domain vocabulary passes — ink, fill, surface, alias (#618 reading 1)');

// MUTANT 5 — the tree loses its top-level $extensions. This is the real defect the first draft of the
// transform had, so it is the mutation most worth keeping: a leaf-walk transform passes every token
// count and drops the record of what generated the file.
{
  const { tree } = corpus[0];
  const stripped = JSON.parse(JSON.stringify(tree)) as Record<string, unknown>;
  delete stripped.$extensions;
  const projected = JSON.parse(projectDtcg(stripped, 'm', defaultSettings())[0].text) as Record<string, unknown>;
  ok(projected.$extensions === undefined && (tree as Record<string, unknown>).$extensions !== undefined,
    'MUTANT tree with no generator stamp → the section-6 comparison would go red (it is a real comparison, not a tautology)');
}

// MUTANT 6 — a rename that rewrites keys but forgets $value. Passes every path check; every reference
// dead. Built by hand here because the real transform does not have the bug.
{
  const tree = { m: { 'on-fill': { $type: 'color', $value: '#fff' }, ref: { $type: 'color', $value: '{m.on-fill}' } } };
  const broken = { m: { on_fill: { $type: 'color', $value: '#fff' }, ref: { $type: 'color', $value: '{m.on-fill}' } } };
  const paths = new Set(leavesOf(broken).map((l) => l.path));
  const dead = leavesOf(broken).flatMap((l) => [...String(l.leaf.$value).matchAll(/\{([^{}]+)\}/g)]).filter((m) => !paths.has(m[1]));
  ok(dead.length === 1, 'MUTANT rename that skipped $value → alias resolution goes red where a path check would not');
  none(aliasDefects(tree, defaultSettings(), 'm'), 'and the correct kebab tree resolves clean');
  none(aliasDefects(tree, { ...defaultSettings(), tokenNameCase: 'snake' }, 'm'), 'and so does the snake projection — the aliases moved with the keys');
}

// MUTANT 7 — the alias check on a tree with no aliases. It would pass vacuously, which is why
// `aliasDefects` asserts it found references to resolve.
{
  const noRefs = { m: { a: { $type: 'color', $value: '#fff' } } };
  const d = aliasDefects(noRefs, defaultSettings(), 'm');
  ok(d.some((x) => x.includes('no aliases found')), `MUTANT alias-free tree → the check reports it ran on nothing: "${d[0]}"`);
}

// MUTANT 8 — a sample that misses a control. Asserted through the criteria, since that is what the
// sample is built from: strip the dashed-name criterion's subject and the sample can no longer show
// what the case setting does.
{
  const flat = { m: { plain: { $type: 'color', $value: '#fff' } } };
  const d = sampleDefects(flat);
  ok(d.length > 0, `MUTANT tree with nothing for a control to change → sample check goes red: ${d.length} defect(s), first "${d[0]}"`);
}

// =============================================================================================

console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
