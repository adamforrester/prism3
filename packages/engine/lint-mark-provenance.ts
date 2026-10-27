/**
 * Prism3 engine — EVERY BRAND MARK HAS A PROVENANCE RECORD, AND EVERY RECORD A FILE (#2343 proposal §1.4).
 *
 *   npx tsx packages/engine/lint-mark-provenance.ts
 *
 * A provider mark is a trademark. Whether the repository may hold it, and how it may be shown, is a fact
 * about where the file came from and under what terms — so each file under `marks/` carries one record in
 * `marks/provenance.json`: `source`, `rightsHolder`, `dateRetrieved`, `terms`, `usage`, the `colors` as
 * supplied, the `allowedForms`, whether it is a `placeholder`, and for a wallet lockup its `width`.
 *
 * ── WHAT IT COMPARES (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * EXPECTED is the FOLDER LISTING, walked here from disk. ACTUAL is the records in `provenance.json`, typed
 * by a person. Both directions: a file with no record fails, and a record naming no file fails. Then each
 * record's fields, against literals in this file (the field list, the allowed forms, the date shape) —
 * never against `emit-marks.ts`, which also reads the records and would agree with itself.
 *
 * The count of marks is asserted nowhere (owner decision on #2343, Q-B7 amended: the provider list is
 * data). What holds at any size is that the folder and the records describe the same files.
 *
 * ── THE REPOSITORY-VISIBILITY NOTE (owner decision on #2343, Q-B1 B) ────────────────────────────────
 *
 * The owner's marks are committed because the repository is internal for now; if it goes public, the set is
 * refactored to placeholders plus recorded terms first. That condition is written in `provenance.json`'s
 * `_note` and in `marks/NOTICE.md`, and this gate fails if either loses it, so it is not lost to a tidy-up.
 *
 * ── A CLEAN RUN, PROVEN LIVE (docs/34 shape 9) ──────────────────────────────────────────────────────
 *
 * The checker runs first over hand-made bad records and must fail on each; then over the real tree.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const marksDir = resolve(here, 'marks');

/** The fields every record must carry as non-empty text (proposal §1.1). A literal, the second author. */
const TEXT_FIELDS = ['source', 'rightsHolder', 'dateRetrieved', 'terms', 'usage'] as const;
const FORMS = ['full-color', 'mono-black', 'mono-white'];
/** The folder whose marks take their width from the record. */
const PER_MARK_WIDTH_FOLDER = 'wallet/';

type Rec = Record<string, unknown>;

/** Every problem with one record. Pure, and driven by both the self-check and the real run. */
export const recordProblems = (file: string, r: Rec | undefined, today: string): string[] => {
  if (!r || typeof r !== 'object') return [`${file}: has no record in marks/provenance.json`];
  const out: string[] = [];
  for (const f of TEXT_FIELDS) {
    const v = r[f];
    if (typeof v !== 'string' || !v.trim()) out.push(`${file}: record lacks '${f}'`);
  }
  const d = r.dateRetrieved;
  if (typeof d === 'string' && d.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) out.push(`${file}: dateRetrieved '${d}' is not a YYYY-MM-DD date`);
    else if (d > today) out.push(`${file}: dateRetrieved ${d} is after today (${today})`);
  }
  if (typeof r.placeholder !== 'boolean') out.push(`${file}: record lacks 'placeholder' (true or false)`);
  const colors = r.colors;
  if (!Array.isArray(colors) || colors.length === 0) out.push(`${file}: record lacks 'colors' (the fills as supplied)`);
  else for (const c of colors) if (typeof c !== 'string' || !/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) out.push(`${file}: color '${String(c)}' is not a hex color`);
  const forms = r.allowedForms;
  if (!Array.isArray(forms) || forms.length === 0) out.push(`${file}: record lacks 'allowedForms'`);
  else for (const f of forms) if (!FORMS.includes(String(f))) out.push(`${file}: allowedForms names '${String(f)}', which is not one of ${FORMS.join(', ')}`);
  const perMark = file.startsWith(PER_MARK_WIDTH_FOLDER);
  if (perMark && !(typeof r.width === 'number' && r.width > 0)) out.push(`${file}: a wallet lockup's record lacks 'width' (the provider's width at 24 high)`);
  if (!perMark && r.width !== undefined) out.push(`${file}: declares a width, and only a wallet lockup takes one (its kind fixes the artboard)`);
  return out;
};

/** Both directions between the folder and the records. Pure. */
export const coverageProblems = (files: readonly string[], records: Record<string, unknown>): string[] => {
  const out: string[] = [];
  const fileSet = new Set(files);
  for (const f of files) if (!(f in records)) out.push(`${f}: is in marks/ and has no record in marks/provenance.json — no record, no build`);
  for (const k of Object.keys(records)) if (!fileSet.has(k)) out.push(`${k}: is recorded in marks/provenance.json and no such file is in marks/ — a stale record`);
  return out;
};

const VISIBILITY = /goes public/i;

// ---- SELF-CHECK -----------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const good: Rec = { placeholder: false, source: 's', rightsHolder: 'r', dateRetrieved: '2026-10-26', terms: 't', usage: 'u', colors: ['#000000'], allowedForms: ['full-color'] };
const self: string[] = [];
const expectFail = (what: string, file: string, r: Rec | undefined, needle: string): void => {
  const p = recordProblems(file, r, today);
  if (!p.some((x) => x.includes(needle))) self.push(`${what}: expected a problem naming '${needle}', got ${JSON.stringify(p)}`);
};
if (recordProblems('card/x.svg', good, today).length) self.push(`a complete record reads as faulty: ${recordProblems('card/x.svg', good, today).join('; ')}`);
for (const f of TEXT_FIELDS) { const r = { ...good }; delete r[f]; expectFail(`missing ${f}`, 'card/x.svg', r, `lacks '${f}'`); }
expectFail('no record', 'card/x.svg', undefined, 'has no record');
expectFail('bad date', 'card/x.svg', { ...good, dateRetrieved: '26/10/2026' }, 'not a YYYY-MM-DD');
expectFail('future date', 'card/x.svg', { ...good, dateRetrieved: '2999-01-01' }, 'after today');
expectFail('no colors', 'card/x.svg', { ...good, colors: [] }, "lacks 'colors'");
expectFail('bad color', 'card/x.svg', { ...good, colors: ['red'] }, 'not a hex color');
expectFail('bad form', 'card/x.svg', { ...good, allowedForms: ['recolored'] }, 'allowedForms names');
expectFail('no placeholder flag', 'card/x.svg', { ...good, placeholder: undefined }, "lacks 'placeholder'");
expectFail('wallet without width', 'wallet/x.svg', good, "lacks 'width'");
expectFail('card with width', 'card/x.svg', { ...good, width: 40 }, 'declares a width');
if (!coverageProblems(['a.svg'], {}).some((p) => p.includes('has no record'))) self.push('coverage: a file with no record is not reported');
if (!coverageProblems([], { 'a.svg': good }).some((p) => p.includes('stale record'))) self.push('coverage: a record with no file is not reported');
if (VISIBILITY.test('the repository is internal')) self.push('the visibility probe matches text that does not state the condition');
if (self.length) {
  console.error("\n❌ lint-mark-provenance's own detection is broken — it cannot see what it claims to:\n");
  for (const s of self) console.error(`    ${s}`);
  process.exit(1);
}

// ---- THE REAL RUN ---------------------------------------------------------------------------------
const walk = (dir: string, rel = ''): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return walk(p, `${rel}${f}/`);
    return f.endsWith('.svg') ? [`${rel}${f}`] : [];
  });
const files = walk(marksDir).sort();
const failures: string[] = [];
let doc: { _note?: unknown; marks?: Record<string, Rec> } = {};
try { doc = JSON.parse(readFileSync(join(marksDir, 'provenance.json'), 'utf8')); }
catch (err) { failures.push(`marks/provenance.json does not parse: ${(err as Error).message}`); }
const records = doc.marks ?? {};

// The floor: an empty folder would pass every arm below while checking nothing.
if (files.length === 0) failures.push('marks/ holds no .svg file — the gate would pass over nothing');
failures.push(...coverageProblems(files, records));
for (const f of files) if (f in records) failures.push(...recordProblems(f, records[f], today));
const note = Array.isArray(doc._note) ? doc._note.join(' ') : String(doc._note ?? '');
if (!VISIBILITY.test(note)) failures.push('marks/provenance.json: its _note no longer states what happens if the repository goes public (owner decision on #2343, Q-B1 B)');
let notice = '';
try { notice = readFileSync(join(marksDir, 'NOTICE.md'), 'utf8'); } catch { notice = ''; }
if (!VISIBILITY.test(notice)) failures.push('marks/NOTICE.md: no longer states what happens if the repository goes public (owner decision on #2343, Q-B1 B)');

const placeholders = files.filter((f) => records[f]?.placeholder === true).length;
console.log(`Mark provenance — ${files.length} file(s) under marks/, ${Object.keys(records).length} record(s); ${placeholders} placeholder(s).`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} provenance problem(s):\n`);
  for (const f of failures) console.error(`    ${f}`);
  console.error('\n  Every mark under marks/ needs one record in marks/provenance.json, with source, rightsHolder,');
  console.error('  dateRetrieved, terms, usage, colors, allowedForms and placeholder (and width for a wallet lockup).');
  process.exit(1);
}
console.log('  ✓ clean — every file has a complete record, and every record a file.');
