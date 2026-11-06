/**
 * Prism3 engine — EVERY `codeOnly` ENTRY IS CLASSED AND DISPOSED (#3441, owner decision #3437 Q1 A).
 *
 *   npx tsx packages/engine/lint-code-only-classes.ts
 *
 * A def's `anatomy.codeOnly` lists what will not survive the design-file leg. Each entry is data: a class
 * from the declared register, a disposition from the four-way vocabulary, and its prose as `description`
 * (`code-only-register.ts`). This gate holds every entry of every registered def to those lists, and
 * holds the shipped `syncBoundary` in `out/components/components.ai.json` to the defs.
 *
 * WHAT IT ASSERTS, each failure prefixed by the name a mutation must produce:
 *   UNREGISTERED CLASS  an entry's class is not a register id.
 *   NO DISPOSITION      an entry's disposition is absent, or not one of the four.
 *   NO DESCRIPTION      an entry's prose is absent or empty.
 *   DEAD CLASS          a register id no entry uses: remove it, or use it.
 *   ADMISSION CLASS     an entry that ADMITS an unprojected axis or state (it leads with that name, as
 *                       `figmaPropertyErrors` requires) is not classed `not-projected`.
 *   PAYLOAD             a def's `syncBoundary` in the committed components.ai.json is not its entries'
 *                       classes and disposition names, one for one, in order.
 *   REGISTER            a register id repeats, is not kebab-case, or has no meaning; a disposition name
 *                       is empty or repeats.
 *   REPRESENTED         the walk reached too few defs or entries to mean anything (floors below).
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the defs' entries and the projector's payload. The REFERENCE is
 * the register and the vocabulary, two declared lists in `code-only-register.ts` that are never gathered
 * from the defs: a register derived from the classes in use would admit any misspelling and could never
 * fail (shape 1). The two lists and the defs move by separate edits. The admission test is RESTATED here
 * from the schema's `admits()` rather than imported, so the class is checked against what the schema
 * reads as an admission, and a change to one is a diff against the other. Each detector is first run on
 * literal fixtures below, so a detector that stopped firing fails by name before the defs are read.
 *
 * WHAT IT DOES NOT ASSERT. Whether a class or a disposition is the RIGHT one for its prose is a reading
 * judgment, made in review. The gate prints the counts per class and per disposition so the set can be
 * read and diffed; it does not grade the prose.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef } from './component-schema';
import { componentDefs } from './components/index';
import { CODE_ONLY_CLASSES, DISPOSITION_NAMES } from './code-only-register';

const here = dirname(fileURLToPath(import.meta.url));
const failures: string[] = [];

const CLASS_IDS = new Set<string>(CODE_ONLY_CLASSES.map((c) => c.id));
const DISPOSITION_KEYS = new Set<string>(Object.keys(DISPOSITION_NAMES));

// Floors, typed here: the corpus at #3441 had 60 defs and 530 entries. A walk that reached a fraction of
// that is broken, not clean.
const MIN_DEFS = 50;
const MIN_ENTRIES = 450;

/** The schema's admission rule, restated (see the header): an entry admits `term` when it LEADS with it
 *  as a whole word, followed by nothing, a space, a dash, a colon or a parenthesis. */
const leadsWith = (prose: string, term: string): boolean => {
  const t = prose.trim();
  if (!t.startsWith(term)) return false;
  const rest = t.slice(term.length);
  return rest === '' || /^[\s—:(]/.test(rest);
};

/** The axes and states a def declares and leaves out of the design file. */
const unprojectedNames = (def: ComponentDef): string[] => {
  const fp = def.figmaProperties;
  if (!fp) return [];
  const axes = Object.keys(def.variants ?? {}).filter((a) => !(fp.variantAxes ?? []).includes(a));
  const states = fp.stateAxis ? (def.states ?? []).filter((s) => !fp.stateAxis!.values.includes(s)) : [];
  return [...axes, ...states];
};

type Entry = { class?: unknown; disposition?: unknown; description?: unknown };

/** Every finding for one def's entries, by name. Run on the fixtures first, then on the real defs. */
const entryFindings = (id: string, entries: readonly Entry[], unprojected: readonly string[]): string[] => {
  const out: string[] = [];
  entries.forEach((e, i) => {
    const at = `${id}.anatomy.codeOnly[${i}]`;
    if (typeof e.class !== 'string' || !CLASS_IDS.has(e.class)) out.push(`UNREGISTERED CLASS: ${at} has class ${JSON.stringify(e.class)}, which is not in CODE_ONLY_CLASSES — register it with its meaning, or use a registered class`);
    if (typeof e.disposition !== 'string' || !DISPOSITION_KEYS.has(e.disposition)) out.push(`NO DISPOSITION: ${at} has disposition ${JSON.stringify(e.disposition)} — every entry is one of ${[...DISPOSITION_KEYS].join(', ')}`);
    if (typeof e.description !== 'string' || !e.description.trim()) { out.push(`NO DESCRIPTION: ${at} has no prose`); return; }
    const admitted = unprojected.filter((n) => leadsWith(e.description as string, n));
    if (admitted.length && e.class !== 'not-projected') out.push(`ADMISSION CLASS: ${at} admits ${admitted.map((n) => `'${n}'`).join(', ')}, which the design file leaves out, and is classed ${JSON.stringify(e.class)} — an admission is 'not-projected'`);
  });
  return out;
};

/** DEAD CLASS findings for a usage count. */
const deadClasses = (used: ReadonlyMap<string, number>): string[] =>
  CODE_ONLY_CLASSES.filter((c) => !used.get(c.id)).map((c) => `DEAD CLASS: '${c.id}' is registered and no entry uses it — remove it from CODE_ONLY_CLASSES, or class an entry with it`);

// ---- the detectors, on literal fixtures ------------------------------------------------------------
{
  const ok: Entry = { class: 'semantics', disposition: 'refused', description: 'role — a dialog role.' };
  const cases: [string, Entry[], string[], string][] = [
    ['a clean entry', [ok], [], ''],
    ['an unregistered class', [{ ...ok, class: 'semantic' }], [], 'UNREGISTERED CLASS'],
    ['no disposition', [{ class: 'semantics', description: 'x — y' }], [], 'NO DISPOSITION'],
    ['a disposition outside the four', [{ ...ok, disposition: 'dropped' }], [], 'NO DISPOSITION'],
    ['no description', [{ class: 'semantics', disposition: 'refused' }], [], 'NO DESCRIPTION'],
    ['an admission classed otherwise', [{ ...ok, description: 'width — not projected: a drag does it.' }], ['width'], 'ADMISSION CLASS'],
    ['a longer word is not an admission', [{ ...ok, description: 'widthwise — not about the axis.' }], ['width'], ''],
  ];
  for (const [why, entries, unprojected, want] of cases) {
    const got = entryFindings('fixture', entries, unprojected);
    const fired = got.map((f) => f.split(':')[0]);
    if (want ? !fired.includes(want) : got.length) failures.push(`DETECTOR: on ${why}, expected ${want || 'no finding'} and got ${got.length ? fired.join(', ') : 'none'}`);
  }
  if (!deadClasses(new Map()).length) failures.push('DETECTOR: an empty usage count reports no DEAD CLASS');
  if (deadClasses(new Map(CODE_ONLY_CLASSES.map((c) => [c.id, 1]))).length) failures.push('DETECTOR: a full usage count reports a DEAD CLASS');
}

// ---- the register and the vocabulary ----------------------------------------------------------------
{
  const seen = new Set<string>();
  for (const c of CODE_ONLY_CLASSES) {
    if (seen.has(c.id)) failures.push(`REGISTER: class '${c.id}' is registered twice`);
    seen.add(c.id);
    if (!/^[a-z][a-z]*(-[a-z]+)*$/.test(c.id)) failures.push(`REGISTER: class '${c.id}' is not a kebab-case id`);
    if (!c.means.trim()) failures.push(`REGISTER: class '${c.id}' has no meaning`);
  }
  const names = Object.values(DISPOSITION_NAMES) as string[];
  if (names.length !== 4) failures.push(`REGISTER: the vocabulary has ${names.length} dispositions; the owner's decision is four-way`);
  if (names.some((n) => !n.trim()) || new Set(names).size !== names.length) failures.push(`REGISTER: a disposition name is empty or repeats (${names.join(', ')})`);
}

// ---- the defs ---------------------------------------------------------------------------------------
const used = new Map<string, number>();
const byDisposition = new Map<string, number>();
let entries = 0;
let defsWithEntries = 0;
for (const def of componentDefs) {
  const list = (def.anatomy?.codeOnly ?? []) as readonly Entry[];
  if (!def.anatomy) continue;
  if (!list.length) failures.push(`REPRESENTED: ${def.id} has an anatomy and no codeOnly entry`);
  else defsWithEntries++;
  entries += list.length;
  failures.push(...entryFindings(def.id, list, unprojectedNames(def)));
  for (const e of list) {
    if (typeof e.class === 'string') used.set(e.class, (used.get(e.class) ?? 0) + 1);
    if (typeof e.disposition === 'string') byDisposition.set(e.disposition, (byDisposition.get(e.disposition) ?? 0) + 1);
  }
}
failures.push(...deadClasses(used));
if (defsWithEntries < MIN_DEFS || entries < MIN_ENTRIES) failures.push(`REPRESENTED: the walk read ${entries} entries on ${defsWithEntries} defs, under the floor of ${MIN_ENTRIES} on ${MIN_DEFS} — it is not reaching the defs`);

// ---- the shipped payload ----------------------------------------------------------------------------
{
  const path = resolve(here, 'out/components/components.ai.json');
  const doc = JSON.parse(readFileSync(path, 'utf8')) as { components?: Record<string, { syncBoundary?: unknown }> };
  let checked = 0;
  for (const def of componentDefs) {
    if (!def.anatomy) continue;
    const want = (def.anatomy.codeOnly as readonly Entry[]).map((e) => `${String(e.class)}/${DISPOSITION_NAMES[e.disposition as keyof typeof DISPOSITION_NAMES] ?? String(e.disposition)}`);
    const raw = doc.components?.[def.id]?.syncBoundary;
    const got = Array.isArray(raw) ? raw.map((b: { class?: unknown; disposition?: unknown }) => `${String(b?.class)}/${String(b?.disposition)}`) : undefined;
    if (!got) { failures.push(`PAYLOAD: ${def.id} has no syncBoundary list in out/components/components.ai.json`); continue; }
    if (got.length !== want.length) failures.push(`PAYLOAD: ${def.id} has ${want.length} codeOnly entries and ${got.length} syncBoundary items in components.ai.json — regenerate`);
    want.forEach((w, i) => { checked++; if (got[i] !== w) failures.push(`PAYLOAD: ${def.id}.syncBoundary[${i}] is ${got[i] ?? 'absent'} and the def says ${w} — regenerate`); });
  }
  if (checked < MIN_ENTRIES) failures.push(`REPRESENTED: only ${checked} syncBoundary items were compared, under the floor of ${MIN_ENTRIES}`);
}

if (failures.length) {
  console.error(`❌ codeOnly classes: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
const counts = CODE_ONLY_CLASSES.map((c) => `${c.id} ${used.get(c.id)}`).join(', ');
const dispositions = Object.entries(DISPOSITION_NAMES).map(([k, n]) => `${n} ${byDisposition.get(k) ?? 0}`).join(', ');
console.log(`· by class: ${counts}`);
console.log(`· by disposition: ${dispositions}`);
console.log(`✅ codeOnly classes: ${entries} entries on ${defsWithEntries} defs, each a registered class (${CODE_ONLY_CLASSES.length} registered, every one in use) with a disposition; every admission is 'not-projected'; components.ai.json's syncBoundary matches, item for item`);
