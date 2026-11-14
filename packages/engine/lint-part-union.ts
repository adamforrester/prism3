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
 * WHAT IT COMPARES. The SUBJECT is the union as the real `tsc` sees it. The EXPECTATION is the probe table
 * below, authored here and nowhere else (`docs/34`: the paint-placement gate's `allowed()` is the precedent):
 * per kind, one LEGAL part that must compile, and ILLEGAL parts, each setting one field the validator refuses on
 * that kind, that must fail. Nothing here reads the per-kind key lists — a probe derived from them would agree
 * with any list, a wrong one included.
 *
 *   · A legal probe with any diagnostic fails: the union refuses a part a def may write.
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

/** A probe's part, as source lines of the object literal's body (after `kind`). For an illegal probe, the LAST
 *  line sets the field the validator refuses on that kind. `LAYOUT`, `SWAP`, `POSITION` and `TRUE` are typed constants every probe file
 *  declares, so a structured value cannot fail on its own literal types instead of on the field. */
type Probe = { kind: string; legal: boolean; field: string; body: string[] };

const legal = (kind: string, body: string[]): Probe => ({ kind, legal: true, field: '', body });
const illegal = (kind: string, field: string, line: string, base: string[] = []): Probe => ({ kind, legal: false, field, body: [...base, line] });

const PROBES: readonly Probe[] = [
  // box — the one kind that lays out, paints a surface and becomes a frame.
  legal('box', ["role: 'target',", "children: ['label'],", "layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },", "gap: 'size.{size}.gap',", "strokeWidth: 'border-width',", "paintSlots: ['fill', 'border'],", 'clipsContent: true,', "foot: true,", 'footShare: 0.5,']),
  illegal('box', 'wrap', 'wrap: true,'),
  illegal('box', 'glyph', "glyph: 'check',"),
  illegal('box', 'nests', "nests: 'focus-ring',"),
  illegal('box', 'paintSlot', "paintSlot: 'label',"),
  // text — copy, a type binding and an ink.
  legal('text', ["type: 'size.{size}.type',", "wrap: 'hug',", "characters: 'Title',", "paintSlot: 'label',", "verticalAlign: 'top',", "literal: 'label',"]),
  illegal('text', 'layout', 'layout: LAYOUT,', ["type: 't',"]),
  illegal('text', 'paintSlots', "paintSlots: ['fill'],", ["type: 't',"]),
  illegal('text', 'glyph', "glyph: 'check',", ["type: 't',"]),
  illegal('text', 'height', "height: 'size.{size}.height',", ["type: 't',"]),
  // slot — a swap cell.
  legal('slot', ["size: 'size.{size}.icon',", 'optional: true,', "nesting: { kind: 'swap' },", "swapDefault: 'check',", "pin: { edge: 'end', inset: { md: 12 }, reserve: { md: 32 } },"]),
  illegal('slot', 'layout', 'layout: LAYOUT,'),
  illegal('slot', 'inset', "inset: 'ring-offset',"),
  illegal('slot', 'nests', "nests: 'spinner',"),
  // overlay — takes another part's cell at one state.
  legal('overlay', ["replaces: ['leadingVisual', 'label'],", "when: 'loading',", "nests: 'spinner',", "nesting: { kind: 'swap' },", "size: 'size.{size}.icon',", 'fixedPaint: true,']),
  illegal('overlay', 'presentWhen', "presentWhen: { size: ['md'] },"),
  illegal('overlay', 'glyph', "glyph: 'check',"),
  illegal('overlay', 'positionWhen', 'positionWhen: POSITION,'),
  // absolute — an instance outside the flow (a focus ring).
  legal('absolute', ["when: ['focus-visible'],", "nests: 'focus-ring',", "inset: 'ring-offset',", "strokeInset: 'ring-width',", 'drawnInside: true,', "nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },"]),
  illegal('absolute', 'size', "size: 'size.{size}.icon',"),
  illegal('absolute', 'innerTarget', 'innerTarget: TRUE,'),
  illegal('absolute', 'children', "children: ['label'],"),
  // nest — an in-flow instance of another component.
  legal('nest', ["nests: 'checkbox-control',", "nesting: { kind: 'nest-fixed', variant: { size: 'md' } },", 'grow: true,', 'crossAxisFill: true,', "nestTexts: { label: 'label' },", "overrides: { texts: { label: 'Cancel' } },"]),
  illegal('nest', 'children', "children: ['label'],"),
  illegal('nest', 'layout', 'layout: LAYOUT,'),
  illegal('nest', 'swapDefault', "swapDefault: 'check',"),
  // vector — a glyph.
  legal('vector', ["glyph: 'check',", "size: 'size.{size}.icon',", "corner: 'bottom-right',", "inset: 'grip-inset',", "paintSlot: 'icon',", 'glyphScale: 0.75,']),
  illegal('vector', 'children', "children: ['label'],", ["glyph: 'check',"]),
  illegal('vector', 'height', "height: 'size.{size}.height',", ["glyph: 'check',"]),
  illegal('vector', 'paintSlots', "paintSlots: ['fill'],", ["glyph: 'check',"]),
  illegal('vector', 'nesting', 'nesting: SWAP,', ["glyph: 'check',"]),
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
  const file = `probe-${String(i).padStart(2, '0')}-${probe.kind}-${probe.legal ? 'legal' : probe.field}.ts`;
  const lines = [
    `import type { LayoutDef, NestingRelation, PartDef } from ${JSON.stringify(SCHEMA)};`,
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
writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', strict: true, skipLibCheck: true, noEmit: true, types: [], lib: ['ES2022'], allowImportingTsExtensions: true },
  files: files.map((f) => f.file),
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
for (const d of diags) if (!known.has(d.file)) failures.push(`tsc reported an error outside the probes — ${d.file}:${d.line} ${d.text.slice(0, 200)}`);

let bit = 0;
for (const { probe, file } of files) {
  const mine = diags.filter((d) => d.file === file);
  if (probe.legal) {
    if (mine.length) failures.push(`LEGAL ${probe.kind} part refused — ${mine.map((d) => `line ${d.line}: ${d.text.slice(0, 240)}`).join('; ')}`);
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
console.log(`✅ lint-part-union: ${usedKinds.size} part kinds used by the shipped defs, each probed — ${PROBES.length - illegalCount} legal parts compile, ${bit}/${illegalCount} illegal fields refused by tsc by name.`);
