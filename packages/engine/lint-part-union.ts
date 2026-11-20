/**
 * Prism3 engine — THE PART UNION BITES (#3698 F4, R5 item 3).
 *
 *   npx tsx packages/engine/lint-part-union.ts
 *
 * WHAT CHANGED. `PartDef` was one bag of optional fields under a `PartKind` string, so a def could write
 * `{ kind: 'text', layout: … }` and `tsc` said nothing: only `anatomyErrors` refused it, at run time. Since
 * #3698 R5 item 3 it is a union discriminated by `kind`, one type per kind, each admitting the fields the
 * validator lets that kind carry and typing every other field `never` (`component-schema.ts`, under
 * `PartFields`). A union that admitted everything would typecheck every def exactly as the bag did, so a green
 * `typecheck-components.ts` cannot tell the two apart. This gate is the one that can.
 *
 * WHAT IT COMPARES. The SUBJECT is the union as the real `tsc` sees it. The EXPECTATION is `ADMITS` below, authored
 * here and nowhere else (`docs/34`; the paint-placement gate's `allowed()` is the precedent): per FIELD, the kinds that
 * may carry it. It is written field-major on purpose, the transpose of the schema's kind-major key lists, so it is not a
 * copy that a paste could keep in step. Nothing here reads `BoxKey`, `TextKey` or the others: a probe derived from them
 * would agree with any list, a wrong one included (#3781: the old authored sample probed 24 of the forbidden pairs, and
 * admitting `wrap` on `nest` passed).
 *
 *   EVERY PAIR IS PROBED (#3781). For each field F of `PartFields` and each kind K, one probe file sets F alone on a
 *   K part. Where `ADMITS[F]` names K it must compile; elsewhere tsc must refuse it BY F'S NAME. So a widening of any
 *   kind's list fails here naming the kind and field, and so does a narrowing. The value is `V.F`, typed
 *   `Required<PartFields>['F']`: a value valid for the field, so a widened union cannot pass by refusing an ill-typed
 *   literal instead of the field. The field TYPES come from the bag; only WHO MAY CARRY each field is under test.
 *
 *   THE TABLE IS HELD TO THE SCHEMA BY tsc. One more probe file types `ADMITS`'s keys as exactly the fields of
 *   `PartFields` (less `kind`) and its kinds as exactly `PartKind`, both as object literals, so a field or kind added to
 *   the schema and not here fails by name ("Property 'x' is missing"), and so does a stale entry. Measured once when
 *   the table was written: for every pair it forbids, `validateComponentDef` also refuses that field on a shipped part
 *   of that kind by name (407 of 407), so the table agrees with the run-time rule as well as with the union.
 *
 *   · A legal probe with any diagnostic fails: the union refuses a part a def may write. Seven more legal probes, one
 *     per kind, set a realistic part with literal values, as before.
 *   · An illegal probe fails unless tsc refuses it BY THE FIELD'S NAME (`Types of property '<field>' are
 *     incompatible`), naming kind and field otherwise: the union admits a field the validator refuses there. The
 *     name is the point — a probe failing for some other reason (a typo in the fixture, an import that broke) is
 *     not this union biting, and any diagnostic that does not name the probe's field is reported as that.
 *   · REPRESENTATION (`docs/34`): every kind a shipped def uses — read from `componentDefs`, not from
 *     `PartKind` — has a legal probe and at least one illegal probe, and every probed kind is one a def uses.
 *     A new kind with no probe fails here by name rather than passing unprobed.
 *
 * WHAT IT DOES NOT REPLACE. `anatomyErrors` keeps every per-kind refusal: a def that reaches the engine as JSON
 * or from plain JS is never typechecked, so the run-time check is still the only one it meets. Nor does it
 * replace `lint-nesting`, `lint-paint-placement`, `lint-absolute-inset` or `lint-fill-under-hug`: those measure
 * what a projection BUILDS (nest graph, paint on built nodes, ring geometry, fill under hug), which no field
 * type can express.
 *
 * Mechanics: one `tsc --noEmit` over a throwaway directory in `$TMPDIR`, one file per probe, importing
 * `component-schema.ts` by absolute path. Reads no build; needs no `after`.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = realpathSync(resolve(here, '../..'));
const SCHEMA = join(here, 'component-schema.ts');

/** A probe's part, as source lines of the object literal's body (after `kind`). For a pair probe, the one line sets the
 *  field under test. `V` is `Required<PartFields>`, and `LAYOUT`, `SWAP`, `POSITION` and `TRUE` are typed constants every
 *  probe file declares, so a value cannot fail on its own literal type instead of on the field. */
type Probe = { kind: string; legal: boolean; field: string; body: string[] };

const KINDS = ['box', 'text', 'slot', 'overlay', 'absolute', 'nest', 'vector'] as const;
type Kind = (typeof KINDS)[number];
const ALL: readonly Kind[] = KINDS;

/** WHO MAY CARRY EACH FIELD — the expectation, authored here (#3781). A field is admitted on a kind unless
 *  `anatomyErrors` refuses it there, directly or through a field it requires. `role`, `optional` and `note` are
 *  refused on no kind. Edit this in the same PR as the union, from the validator's rule, never from the key lists. */
const ADMITS: Readonly<Record<string, readonly Kind[]>> = {
  role: ALL,
  innerTarget: ['box', 'text', 'slot', 'overlay', 'nest', 'vector'],
  children: ['box'],
  layout: ['box'],
  padding: ['box'],
  gap: ['box'],
  rowGap: ['box'],
  height: ['box', 'slot', 'nest'],
  radius: ['box'],
  strokeWidth: ['box'],
  strokeEdges: ['box'],
  size: ['box', 'text', 'slot', 'overlay', 'nest', 'vector'],
  width: ['box'],
  type: ['text'],
  paintSlot: ['text', 'vector'],
  verticalAlign: ['text'],
  wrap: ['text'],
  lines: ['text'],
  crossAxisFill: ['box', 'nest'],
  grow: ['box', 'nest'],
  paddingTop: ['box'],
  firstLine: ['box'],
  contentSlot: ['box'],
  slotSettings: ['box'],
  preferred: ['box'],
  preferredWhenBuilt: ['box'],
  characters: ['text'],
  paintSlots: ['box'],
  paintGroup: ['box'],
  gradient: ['box'],
  clipsContent: ['box'],
  scroll: ['box'],
  minWidth: ['box'],
  placementWidth: ['box'],
  placementHeight: ['box'],
  directionWhen: ['box'],
  sizingWhen: ['box'],
  builtSize: ['box'],
  elevation: ['box'],
  radiusEdges: ['box'],
  pin: ['slot'],
  minHeight: ['box'],
  minWidthKey: ['box'],
  minWidthRatio: ['box'],
  flush: ['box'],
  center: ['box'],
  aspectRatio: ['box'],
  aspectLock: ['slot', 'nest'],
  fixedPaint: ['slot', 'overlay', 'nest'],
  hostInk: ['nest'],
  literal: ['box', 'text', 'nest'],
  tileEdge: ['vector'],
  glyph: ['vector'],
  swapDefault: ['slot'],
  glyphScale: ['vector'],
  glyphPx: ['vector'],
  optional: ALL,
  presentWhen: ['box', 'text', 'slot', 'absolute', 'nest', 'vector'],
  positionWhen: ['box', 'text', 'slot', 'nest', 'vector'],
  replaces: ['overlay'],
  overlaysWhenAbsent: ['overlay'],
  when: ['overlay', 'absolute'],
  nests: ['overlay', 'absolute', 'nest'],
  nesting: ['slot', 'overlay', 'absolute', 'nest'],
  prefersWhenBuilt: ['nest'],
  nestItemPrefers: ['nest'],
  overrides: ['absolute', 'nest'],
  nestTexts: ['nest'],
  nestPaddingBlock: ['nest'],
  inset: ['absolute', 'vector', 'box'],
  strokeInset: ['absolute'],
  drawnInside: ['absolute'],
  corner: ['vector', 'box'],
  foot: ['box'],
  footShare: ['box'],
  hiddenWhenAbsent: ['box'],
  scaleWithParent: ['vector'],
  stackCentered: ['vector'],
  note: ALL,
  // #3986: every kind may say what it does in right-to-left text; `anatomyErrors` refuses a VALUE on a kind it cannot
  // describe (`reverses` off a box, `mirrors` on a box or a text), never the field.
  mirror: ALL,
};

const legal = (kind: string, body: string[]): Probe => ({ kind, legal: true, field: '', body });

const PROBES: readonly Probe[] = [
  // One realistic part per kind, with literal values (the pair probes below use typed values).
  legal('box', ["role: 'target',", "children: ['label'],", "layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },", "gap: 'size.{size}.gap',", "strokeWidth: 'border-width',", "paintSlots: ['fill', 'border'],", 'clipsContent: true,', "foot: true,", 'footShare: 0.5,']),
  legal('text', ["type: 'size.{size}.type',", "wrap: 'hug',", "characters: 'Title',", "paintSlot: 'label',", "verticalAlign: 'top',", "literal: 'label',"]),
  legal('slot', ["size: 'size.{size}.icon',", 'optional: true,', "nesting: { kind: 'swap' },", "swapDefault: 'check',", "pin: { edge: 'end', inset: { md: 12 }, reserve: { md: 32 } },"]),
  legal('overlay', ["replaces: ['leadingVisual', 'label'],", "when: 'loading',", "nests: 'spinner',", "nesting: { kind: 'swap' },", "size: 'size.{size}.icon',", 'fixedPaint: true,']),
  legal('absolute', ["when: ['focus-visible'],", "nests: 'focus-ring',", "inset: 'ring-offset',", "strokeInset: 'ring-width',", 'drawnInside: true,', "nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },"]),
  legal('nest', ["nests: 'checkbox-control',", "nesting: { kind: 'nest-fixed', variant: { size: 'md' } },", 'grow: true,', 'crossAxisFill: true,', "nestTexts: { label: 'label' },", "overrides: { texts: { label: 'Cancel' } },"]),
  legal('vector', ["glyph: 'check',", "size: 'size.{size}.icon',", "corner: 'bottom-right',", "inset: 'grip-inset',", "paintSlot: 'icon',", 'glyphScale: 0.75,']),
  // EVERY (field, kind) PAIR (#3781): legal where ADMITS names the kind, illegal everywhere else.
  ...Object.entries(ADMITS).flatMap(([field, kinds]) =>
    KINDS.map((k): Probe => ({ kind: k, legal: kinds.includes(k), field, body: [`${field}: V.${field},`] }))),
];

const failures: string[] = [];

// REPRESENTATION, from the defs — independent of the type under test.
const usedKinds = new Set<string>();
for (const d of componentDefs) for (const p of Object.values(d.anatomy?.parts ?? {})) usedKinds.add(p.kind);
if (usedKinds.size < 5) failures.push(`the shipped defs use only ${usedKinds.size} part kinds — a registry that stopped loading reads as fewer kinds, and a probe set checked against nothing proves nothing`);
for (const k of usedKinds) {
  if (!PROBES.some((p) => p.kind === k && p.legal)) failures.push(`kind '${k}' is used by a shipped def but has no LEGAL probe — the union could refuse every '${k}' part and this gate would not say so`);
  if (!PROBES.some((p) => p.kind === k && !p.legal)) failures.push(`kind '${k}' is used by a shipped def but has no ILLEGAL probe — '${k}' could admit every field and this gate would not say so`);
}
for (const k of new Set(PROBES.map((p) => p.kind))) if (!usedKinds.has(k)) failures.push(`kind '${k}' is probed but no shipped def uses it — a probe of a kind nothing writes guards no def`);

// One file per probe, named relative to the directory tsc runs in, which is how it prints them.
const dir = mkdtempSync(join(tmpdir(), 'p3-part-union-'));
const files: { probe: Probe; file: string }[] = [];
PROBES.forEach((probe, i) => {
  const file = `probe-${String(i).padStart(3, '0')}-${probe.kind}-${probe.field || 'part'}-${probe.legal ? 'legal' : 'illegal'}.ts`;
  const lines = [
    `import type { LayoutDef, NestingRelation, PartDef, PartFields } from ${JSON.stringify(SCHEMA)};`,
    'declare const V: Required<PartFields>;',
    "const LAYOUT: LayoutDef = { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } };",
    "const SWAP: NestingRelation = { kind: 'swap' };",
    "const POSITION: Record<string, Record<string, 'start' | 'center' | 'end'>> = { selection: { off: 'start', on: 'end' } };",
    'const TRUE = true as const;',
    'export const part: PartDef = {',
    `  kind: '${probe.kind}',`,
    ...probe.body.map((l) => `  ${l}`),
    '};',
    '',
  ];
  writeFileSync(join(dir, file), lines.join('\n'));
  files.push({ probe, file });
});
// THE TABLE AGAINST THE SCHEMA: ADMITS's fields are exactly `PartFields`'s (less `kind`), and its kinds exactly `PartKind`.
const TABLE_FILE = 'table-covers-schema.ts';
writeFileSync(join(dir, TABLE_FILE), [
  `import type { PartFields, PartKind } from ${JSON.stringify(SCHEMA)};`,
  `export const fields: Record<Exclude<keyof PartFields, 'kind'>, true> = { ${Object.keys(ADMITS).map((f) => `${f}: true`).join(', ')} };`,
  `export const kinds: Record<PartKind, true> = { ${KINDS.map((k) => `${k}: true`).join(', ')} };`,
  '',
].join('\n'));
writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', strict: true, skipLibCheck: true, noEmit: true, types: [], lib: ['ES2022'], allowImportingTsExtensions: true },
  files: [...files.map((f) => f.file), TABLE_FILE],
}));

let tscBin: string;
try {
  tscBin = createRequire(resolve(repo, 'package.json')).resolve('typescript/bin/tsc');
} catch {
  console.error('❌ typescript is not installed (run `npm ci`) — without tsc there is no union to probe, and an absence is not a pass.');
  process.exit(1);
}
const tsc = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.json', '--pretty', 'false'], { cwd: dir, encoding: 'utf8' });
const out = `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`;
rmSync(dir, { recursive: true, force: true });

// `<file>(<line>,<col>): error TS<code>: <message>` — continuation lines (indented) belong to the one above.
const diags: { file: string; line: number; text: string }[] = [];
for (const raw of out.split('\n')) {
  const m = /^(.*)\((\d+),(\d+)\): error (TS\d+: .*)$/.exec(raw);
  if (m) diags.push({ file: m[1], line: Number(m[2]), text: m[4] });
  else if (raw.startsWith(' ') && diags.length) diags[diags.length - 1].text += ` ${raw.trim()}`;
}
const known = new Set(files.map((f) => f.file));
for (const d of diags.filter((x) => x.file === TABLE_FILE)) failures.push(`ADMITS and the schema disagree — ${d.text.slice(0, 300)} (add or remove the field or kind in ADMITS, from the validator's rule)`);
for (const d of diags) if (d.file !== TABLE_FILE && !known.has(d.file)) failures.push(`tsc reported an error outside the probes — ${d.file}:${d.line} ${d.text.slice(0, 200)}`);

let bit = 0;
for (const { probe, file } of files) {
  const mine = diags.filter((d) => d.file === file);
  if (probe.legal) {
    if (mine.length) failures.push(`LEGAL ${probe.kind} part${probe.field ? ` carrying '${probe.field}'` : ''} refused — ${mine.map((d) => `line ${d.line}: ${d.text.slice(0, 240)}`).join('; ')}`);
    continue;
  }
  const named = (d: { text: string }) => d.text.includes(`property '${probe.field}'`);
  const onField = mine.filter(named);
  const elsewhere = mine.filter((d) => !named(d));
  if (elsewhere.length) failures.push(`ILLEGAL probe ${probe.kind}.${probe.field} fails for another reason — ${elsewhere.map((d) => `line ${d.line}: ${d.text.slice(0, 200)}`).join('; ')}`);
  if (!onField.length) failures.push(`the union ADMITS '${probe.field}' on a '${probe.kind}' part — the validator refuses it there, so the type must too`);
  else bit++;
}
if (tsc.status !== 0 && !diags.length) failures.push(`tsc exited ${tsc.status} with no diagnostic this gate could read:\n${out.slice(0, 800)}`);

const illegalCount = PROBES.filter((p) => !p.legal).length;
if (failures.length) {
  console.error(`\n❌ lint-part-union: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✅ lint-part-union: ${usedKinds.size} part kinds used by the shipped defs, each probed; ADMITS covers all ${Object.keys(ADMITS).length} fields and ${KINDS.length} kinds of the schema — ${PROBES.length - illegalCount} legal parts compile, ${bit}/${illegalCount} forbidden (kind, field) pairs refused by tsc by name.`);
