/**
 * Prism3 engine — MOTION LITERALS GATE (#3413 P1).
 *
 *   npx tsx packages/engine/lint-motion-literals.ts
 *
 * The `prism3-motion` skill teaches one rule above the rest (R1): every timing is a `motion.*` token,
 * never a number, because the brand's tempo scales the duration ramp and a typed value is right for one
 * brand at most. A skill that breaks its own rule teaches the break, so this gate holds the skill to it.
 *
 * TWO HALVES, each with its own oracle:
 *
 *   1. LITERALS — the skill's text carries no duration, curve or spring constant. The oracle is the SHAPE
 *      of a literal, typed below: a number with `ms`/`s`, a spelled-out count of seconds, `cubic-bezier(`,
 *      `steps(`, `linear(`, the CSS `ease-*` keywords, a four-number curve, a number after `damping` /
 *      `stiffness` / `mass` / `bounce` / `velocity`, and a `motion.duration-ms.*` primitive step (a number
 *      spelled as a path).
 *   2. RESOLUTION — every `motion.*` path the skill names resolves, as a token or a family, in EVERY
 *      brand's committed `out/<brand>.tokens.json`.
 *   3. REDUCED ORDER (#3491 Q88 A, #3493) — R3 says an exit is never longer than its entrance. Under
 *      reduced motion the twins are not ordered (a reduced `fast` can outlast a reduced `normal`), so a
 *      recipe's `**Reduced:**` form that names a reduced role per direction ("`…normal` entering and
 *      `…fast` leaving", or "both ways") is checked against the EMITTED milliseconds in every brand, with
 *      aliases followed to the primitive. The oracle is the emission, never the skill's wording: a role
 *      name that sounds shorter is not trusted to be shorter. A floor on direction pairs read keeps the
 *      half from passing a parse that stopped reaching the recipes.
 *
 * WHY THE LITERAL ORACLE IS A SHAPE AND NOT THE EMITTED VALUES (docs/34, sub-shape 2). The tempting
 * version reads the emitted durations and flags any number that equals one. That oracle is derived from
 * the subject's neighbour, and it passes an off-ramp `180ms`, the very value an agent invents. A shape
 * regex flags every duration, on the ramp or off it. So nothing in half 1 imports from `theme.ts` or reads
 * `out/**`: the duplication between this list and the engine's units is the gate.
 *
 * ALLOWANCES. A number that is not a motion timing (WCAG 2.2.2's "five seconds" is a threshold a reader
 * checks, not a duration to bind) is admitted in `ALLOWED` by its exact text and file, with the reason.
 * A false positive is fixed by an allowance, never by narrowing a pattern (the `NOT_EN_GB` rule). An
 * allowance no finding uses fails as stale, so the list cannot outlive its text.
 *
 * SCOPE. Every file under `skills/prism3-motion/`. The defs' `motion` prose (#2773) is the next subject,
 * and joins with its own allowances when #3487 lands.
 *
 * WHAT IT CANNOT SEE, stated so it is not trusted past it: a rule that names a real token for the wrong
 * job (`motion.transition.enter` on an exit). The names are checked; the judgment is the reviewer's.
 * Half 3 reads only a reduced role tagged with its direction; an untagged one is not ordered by it.
 *
 * Mutations, each failing by name (recorded in the PR): `200ms` in the skill → DURATION LITERAL;
 * `cubic-bezier(0.2, 0, 0, 1)` in a recipe → CURVE LITERAL; `motion.easing-role.enter` renamed in the
 * skill → UNRESOLVED PATH; the accordion's reduced form back to `…normal` opening and `…fast` closing →
 * REDUCED EXIT LONGER.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const SKILL_DIR = 'skills/prism3-motion';
const OUT = resolve(here, 'out');

type Finding = { file: string; kind: string; text: string; line: number };

// ---- half 1: the literal shapes, typed here and nowhere else -------------------------------------
const NUM = String.raw`-?\d*\.?\d+`;
const SHAPES: { kind: string; re: RegExp; what: string }[] = [
  // A number with a time unit. The lookbehind keeps `R11s`-style labels and dotted versions out.
  { kind: 'DURATION LITERAL', re: /(?<![\w.])\d+(?:\.\d+)?\s?(?:ms|s)\b/g, what: 'a number with a time unit' },
  { kind: 'DURATION LITERAL', re: /\b(?:\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|half a)[\s-]+(?:milliseconds?|seconds?)\b/gi, what: 'a count of seconds or milliseconds' },
  { kind: 'CURVE LITERAL', re: /\b(?:cubic-bezier|steps|linear)\s*\(/g, what: 'a CSS timing function' },
  { kind: 'CURVE LITERAL', re: /(?<![\w-])ease(?:-in-out|-in|-out)?(?![\w-])/g, what: 'a CSS easing keyword' },
  { kind: 'CURVE LITERAL', re: new RegExp(String.raw`[\[(]\s*${NUM}\s*,\s*${NUM}\s*,\s*${NUM}\s*,\s*${NUM}\s*[\])]`, 'g'), what: 'a four-number curve' },
  { kind: 'SPRING LITERAL', re: new RegExp(String.raw`\b(?:damping|stiffness|mass|bounce|velocity)(?:\s+ratio)?(?:\s+of)?\s*[:=]?\s*${NUM}\b`, 'gi'), what: 'a spring constant' },
  { kind: 'PRIMITIVE STEP', re: /(?<![\w.-])motion\.duration-ms\.[a-z0-9*-]+/g, what: 'a duration primitive, which is a number spelled as a path' },
];

const lineOf = (text: string, at: number): number => text.slice(0, at).split('\n').length;

/** Half 1 over one file's text. The live run and the self-check both call this function. */
export const scanLiterals = (text: string, file: string): Finding[] => {
  const out: Finding[] = [];
  for (const s of SHAPES) for (const m of text.matchAll(s.re)) out.push({ file, kind: s.kind, text: m[0], line: lineOf(text, m.index!) });
  return out;
};

// ---- half 2: resolution against the committed emission -------------------------------------------
const PATH = /(?<![\w.-])motion\.[a-z0-9-]+(?:\.(?:[a-z0-9-]+|\*))*/g;

/** Every path under the brand root, leaves AND families, so `motion.duration-reduced.*` and a family named
 *  whole both resolve. Read from the committed DTCG, not from a live engine run. */
export const pathsOf = (doc: Record<string, unknown>): Set<string> => {
  const root = Object.keys(doc).find((k) => !k.startsWith('$'));
  const out = new Set<string>();
  const walk = (node: unknown, prefix: string): void => {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith('$')) continue;
      const p = prefix ? `${prefix}.${k}` : k;
      out.add(p);
      if (v && typeof v === 'object' && !('$value' in (v as object))) walk(v, p);
    }
  };
  if (root) walk(doc[root], '');
  return out;
};

/** Half 2 over one file's text, against each brand's path set. Returns findings and how many names it read. */
export const scanPaths = (text: string, file: string, brands: Map<string, Set<string>>): { findings: Finding[]; read: number } => {
  const findings: Finding[] = [];
  let read = 0;
  for (const m of text.matchAll(PATH)) {
    read++;
    const raw = m[0];
    const want = raw.endsWith('.*') ? raw.slice(0, -2) : raw;
    const missing = [...brands].filter(([, set]) => !set.has(want)).map(([b]) => b);
    if (missing.length) findings.push({ file, kind: 'UNRESOLVED PATH', text: `${raw} (missing in ${missing.length} of ${brands.size} brands)`, line: lineOf(text, m.index!) });
  }
  return { findings, read };
};

// ---- half 3: reduced order, against the emitted milliseconds -----------------------------------
/** Milliseconds per brand for every `motion.duration-reduced.<role>`, following `{…}` aliases to the
 *  primitive's `$value` ("50ms", "0.05s" or `{ value, unit }`). Read from the committed DTCG. */
export const reducedMs = (doc: Record<string, unknown>): Map<string, number> => {
  const root = Object.keys(doc).find((k) => !k.startsWith('$'))!;
  const at = (path: string): unknown => path.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], doc);
  const ms = (v: unknown, depth = 0): number => {
    if (depth > 8) throw new Error('alias loop');
    if (typeof v === 'string') {
      const a = /^\{(.+)\}$/.exec(v);
      if (a) return ms((at(a[1]) as { $value: unknown }).$value, depth + 1);
      const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(v);
      if (m) return Number(m[1]) * (m[2] === 's' ? 1000 : 1);
    }
    if (v && typeof v === 'object' && 'value' in v && 'unit' in v) {
      const o = v as { value: number; unit: string };
      return o.value * (o.unit === 's' ? 1000 : 1);
    }
    throw new Error(`unreadable duration ${JSON.stringify(v)}`);
  };
  const fam = ((doc[root] as Record<string, Record<string, unknown>>).motion?.['duration-reduced'] ?? {}) as Record<string, { $value?: unknown }>;
  return new Map(Object.entries(fam).filter(([k, v]) => !k.startsWith('$') && v && '$value' in v).map(([k, v]) => [k, ms(v.$value)]));
};

const ENTER_WORDS = 'entering|opening|arriving';
const EXIT_WORDS = 'leaving|closing|exiting';
const TAGGED = new RegExp(String.raw`\x60motion\.duration-reduced\.([a-z0-9-]+)\x60\s+(${ENTER_WORDS}|${EXIT_WORDS}|both ways|both directions)\b`, 'gi');

/** Half 3 over one file's text. Each `**Reduced:**` paragraph's direction-tagged reduced roles are paired,
 *  and the exit's milliseconds compared with the entrance's in every brand. Shared by the run and the self-check. */
export const scanReducedOrder = (text: string, file: string, brands: Map<string, Map<string, number>>): { findings: Finding[]; paragraphs: number; pairs: number } => {
  const findings: Finding[] = [];
  let paragraphs = 0, pairs = 0;
  for (const m of text.matchAll(/\*\*Reduced:\*\*[\s\S]*?(?=\n\s*\n|$)/g)) {
    paragraphs++;
    const para = m[0];
    const enter: string[] = [], exit: string[] = [];
    for (const t of para.matchAll(TAGGED)) {
      const dir = t[2].toLowerCase();
      if (dir.startsWith('both')) { enter.push(t[1]); exit.push(t[1]); }
      else if (new RegExp(`^(?:${ENTER_WORDS})$`).test(dir)) enter.push(t[1]);
      else exit.push(t[1]);
    }
    const line = lineOf(text, m.index!);
    if (enter.length && !exit.length) findings.push({ file, kind: 'REDUCED ORDER UNREAD', text: `a reduced entrance on ${enter.join(', ')} with no tagged exit`, line });
    if (exit.length && !enter.length) findings.push({ file, kind: 'REDUCED ORDER UNREAD', text: `a reduced exit on ${exit.join(', ')} with no tagged entrance`, line });
    for (const en of enter) for (const ex of exit) {
      pairs++;
      const longer: string[] = [];
      for (const [b, roles] of brands) {
        const a = roles.get(en), z = roles.get(ex);
        if (a === undefined || z === undefined) { findings.push({ file, kind: 'REDUCED ORDER UNREAD', text: `${b} emits no motion.duration-reduced.${a === undefined ? en : ex}`, line }); continue; }
        if (z > a) longer.push(`${b} ${z} > ${a}ms`);
      }
      if (longer.length) findings.push({ file, kind: 'REDUCED EXIT LONGER', text: `exits on motion.duration-reduced.${ex}, enters on motion.duration-reduced.${en}: ${longer.join('; ')}`, line });
    }
  }
  return { findings, paragraphs, pairs };
};

// ---- allowances ------------------------------------------------------------------------------------
type Allowance = { file: string; text: string; reason: string };
const ALLOWED: Allowance[] = [
  {
    file: `${SKILL_DIR}/SKILL.md`,
    text: 'five seconds',
    reason: 'WCAG 2.2.2 (Pause, Stop, Hide): the threshold past which moving content needs a pause control. R8 cites the criterion; it is a limit a reader checks, not a timing to bind.',
  },
];

/** Splits findings into kept and admitted, counting each allowance's uses. Shared by the run and the self-check. */
export const admit = (findings: Finding[], allowed: Allowance[], used: Map<Allowance, number>): Finding[] =>
  findings.filter((f) => {
    const a = allowed.find((x) => x.file === f.file && x.text.toLowerCase() === f.text.toLowerCase());
    if (!a) return true;
    used.set(a, (used.get(a) ?? 0) + 1);
    return false;
  });

// ---- self-check: every shape still fires, through the live functions -----------------------------
const selfCheck = (): string[] => {
  const bad: string[] = [];
  const kinds = (s: string): string[] => scanLiterals(s, 'fixture').map((f) => f.kind);
  const fires: [string, string][] = [
    ['fades over 200ms', 'DURATION LITERAL'],
    ['a 0.3s fade', 'DURATION LITERAL'],
    ['waits 1.5 s', 'DURATION LITERAL'],
    ['after two seconds', 'DURATION LITERAL'],
    ['for 300 milliseconds', 'DURATION LITERAL'],
    ['transition: opacity cubic-bezier(0.2, 0, 0, 1)', 'CURVE LITERAL'],
    ['steps(4, end)', 'CURVE LITERAL'],
    ['use ease-out here', 'CURVE LITERAL'],
    ['the curve [0.4, 0, 1, 1]', 'CURVE LITERAL'],
    ['stiffness: 700', 'SPRING LITERAL'],
    ['a damping ratio of 0.9', 'SPRING LITERAL'],
    ['bind `motion.duration-ms.200`', 'PRIMITIVE STEP'],
  ];
  for (const [sample, kind] of fires) if (!kinds(sample).includes(kind)) bad.push(`${kind} no longer fires on "${sample}"`);
  const clean = 'R11 starts `motion.stagger` apart on `motion.transition.enter`; WCAG 2.2.2; a 44px target; the easing role decelerates; #3484.';
  const noise = scanLiterals(clean, 'fixture');
  if (noise.length) bad.push(`the clean sample fires: ${noise.map((f) => `${f.kind} "${f.text}"`).join(', ')}`);

  const brands = new Map([['a', new Set(['motion', 'motion.easing-role', 'motion.easing-role.enter'])], ['b', new Set(['motion', 'motion.easing-role', 'motion.easing-role.enter'])]]);
  if (scanPaths('`motion.easing-role.enter` and `motion.easing-role.*`', 'fixture', brands).findings.length) bad.push('a resolving path or family is reported as unresolved');
  if (!scanPaths('`motion.easing-role.arrive`', 'fixture', brands).findings.some((f) => f.kind === 'UNRESOLVED PATH')) bad.push('UNRESOLVED PATH no longer fires on a renamed role');
  const oneBrand = new Map([...brands, ['c', new Set(['motion'])]]);
  if (!scanPaths('`motion.easing-role.enter`', 'fixture', oneBrand).findings.some((f) => f.text.includes('missing in 1 of 3 brands'))) bad.push('a path missing in one brand of several resolves');
  if (scanPaths('`prism3-motion`, `lint-motion-literals.ts`, `motionPersonality.tempo`', 'fixture', brands).read) bad.push('a name that only contains "motion" is read as a token path');

  const rb = new Map([['a', new Map([['fast', 100], ['normal', 50]])], ['b', new Map([['fast', 50], ['normal', 50]])]]);
  const inverted = scanReducedOrder('**Reduced:** fades on `motion.duration-reduced.normal` opening and\n`motion.duration-reduced.fast` closing.', 'fixture', rb);
  if (!inverted.findings.some((f) => f.kind === 'REDUCED EXIT LONGER' && f.text.includes('a 100 > 50ms') && !f.text.includes('b '))) bad.push('REDUCED EXIT LONGER no longer fires on an exit that outlasts its entrance in one brand');
  const shared = scanReducedOrder('**Reduced:** fades on `motion.duration-reduced.normal` both ways.', 'fixture', rb);
  if (shared.findings.length || shared.pairs !== 1) bad.push('one reduced role both ways is not read as an ordered pair');
  if (scanReducedOrder('**Reduced:** fades on `motion.duration-reduced.fast` entering and `motion.duration-reduced.normal` leaving.', 'fixture', rb).findings.length) bad.push('an exit no longer than its entrance is reported');
  if (!scanReducedOrder('**Reduced:** fades on `motion.duration-reduced.normal` leaving.', 'fixture', rb).findings.some((f) => f.kind === 'REDUCED ORDER UNREAD')) bad.push('a reduced exit with no tagged entrance passes unread');
  const doc = { $schema: 'x', z: { motion: { 'duration-ms': { 50: { $value: '50ms' }, 100: { $value: { value: 0.1, unit: 's' } } }, 'duration-reduced': { normal: { $value: '{z.motion.duration-ms.50}' }, fast: { $value: '{z.motion.duration-ms.100}' } } } } };
  const ms = reducedMs(doc);
  if (ms.get('normal') !== 50 || ms.get('fast') !== 100) bad.push(`reducedMs does not follow aliases to the primitive (read ${JSON.stringify([...ms])})`);

  const allow: Allowance[] = [{ file: 'fixture', text: 'five seconds', reason: 'fixture' }];
  const used = new Map<Allowance, number>();
  if (admit(scanLiterals('for more than five seconds', 'fixture'), allow, used).length || used.get(allow[0]) !== 1) bad.push('an exact allowance does not admit its text');
  if (!admit(scanLiterals('for more than six seconds', 'fixture'), allow, new Map()).length) bad.push('an allowance admits text it does not name');
  if (!admit(scanLiterals('for more than five seconds', 'other'), allow, new Map()).length) bad.push('an allowance admits its text in a file it does not name');
  return bad;
};

// ---- the run ---------------------------------------------------------------------------------------
const failures: string[] = [];
for (const b of selfCheck()) failures.push(`SELF-CHECK: ${b}`);

const files: string[] = [];
const walk = (dir: string): void => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(repo, p));
  }
};
if (existsSync(join(repo, SKILL_DIR))) walk(join(repo, SKILL_DIR));
if (!files.includes(`${SKILL_DIR}/SKILL.md`)) failures.push(`REPRESENTED: ${SKILL_DIR}/SKILL.md is missing, so the skill the gate exists for is not scanned`);

const brandFiles = existsSync(OUT) ? readdirSync(OUT).filter((f) => /^[a-z0-9-]+\.tokens\.json$/.test(f) && !f.includes('.base.') && !f.includes('.overlay.')) : [];
const brands = new Map(brandFiles.map((f) => [f.replace('.tokens.json', ''), pathsOf(JSON.parse(readFileSync(join(OUT, f), 'utf8')))]));
if (!brands.size) failures.push('REPRESENTED: no out/<brand>.tokens.json was found, so no path can resolve');
for (const [b, set] of brands) if (!set.has('motion.easing-role')) failures.push(`REPRESENTED: ${b}.tokens.json has no motion.easing-role family; the tree's shape moved and this gate reads the wrong level`);

const reducedBrands = new Map(brandFiles.map((f) => [f.replace('.tokens.json', ''), reducedMs(JSON.parse(readFileSync(join(OUT, f), 'utf8')))]));
for (const [b, roles] of reducedBrands) if (roles.size < 6) failures.push(`REPRESENTED: ${b}.tokens.json yields ${roles.size} motion.duration-reduced roles, under 6; half 3 reads the wrong level`);

const used = new Map<Allowance, number>();
let literalsAdmitted = 0, pathsRead = 0, reducedParas = 0, reducedPairs = 0;
for (const f of files) {
  const text = readFileSync(join(repo, f), 'utf8');
  const lit = scanLiterals(text, f);
  const kept = admit(lit, ALLOWED, used);
  literalsAdmitted += lit.length - kept.length;
  const res = scanPaths(text, f, brands);
  pathsRead += res.read;
  const ord = scanReducedOrder(text, f, reducedBrands);
  reducedParas += ord.paragraphs;
  reducedPairs += ord.pairs;
  for (const x of [...kept, ...res.findings, ...ord.findings]) failures.push(`${x.kind}: ${x.file}:${x.line} "${x.text}"`);
}
for (const a of ALLOWED) if (!used.get(a)) failures.push(`STALE ALLOWANCE: "${a.text}" in ${a.file} matches nothing. Remove it from ALLOWED`);
// A floor on names read: the skill binds every rule and recipe to tokens, so a scan that reads a handful
// has stopped reaching the text (a PATH regex that rotted reads zero and finds nothing to fail).
const MIN_PATHS = 40;
if (files.length && pathsRead < MIN_PATHS) failures.push(`REPRESENTED: read ${pathsRead} motion.* names, under the floor of ${MIN_PATHS}; the path scan is not reaching the skill`);
// Floors for half 3: five recipes carry a `**Reduced:**` form, and the accordion and the toast and banner
// each name a reduced role per direction. A parse that reads fewer has stopped reaching them.
const MIN_REDUCED_PARAS = 5, MIN_REDUCED_PAIRS = 2;
if (files.length && reducedParas < MIN_REDUCED_PARAS) failures.push(`REPRESENTED: read ${reducedParas} **Reduced:** forms, under the floor of ${MIN_REDUCED_PARAS}`);
if (files.length && reducedPairs < MIN_REDUCED_PAIRS) failures.push(`REPRESENTED: read ${reducedPairs} reduced enter/exit pairs, under the floor of ${MIN_REDUCED_PAIRS}; the reduced-order check is not reaching the recipes`);

if (failures.length) {
  console.error(`❌ motion literals: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✅ motion literals: ${files.length} file(s) under ${SKILL_DIR}; 0 duration, curve or spring literals (${literalsAdmitted} admitted by ${ALLOWED.length} allowance(s)); ${pathsRead} motion.* names, each resolving in all ${brands.size} brands; ${reducedPairs} reduced enter/exit pair(s) in ${reducedParas} reduced form(s), no exit longer than its entrance`);
