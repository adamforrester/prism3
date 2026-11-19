/**
 * Prism3 engine — DESIGN.MD IS LOSSLESS FOR EVERY BRAND SETTING (#3984, owner decision Q-DM2 A, 2026-11-18).
 *
 *   npx tsx packages/engine/lint-design-md-round-trip.ts
 *
 * design.md is the one import and export format for a brand's settings (Q-WS2 C: no token-file import). Its YAML
 * front matter maps 1:1 onto `theme-schema.json`. Until this gate that was proven one feature at a time in `test.ts`
 * (overrides, customModes, modeLevers and so on), so a property the schema gained later was proven by nothing.
 *
 * WHAT IT DOES. It walks `schema/theme-schema.json` and builds brand inputs from it, the WITNESSES:
 *   · the MAIN witness sets every property the schema allows, nested ones included, following `$ref` into `$defs`.
 *     A map (`additionalProperties` with a schema) gets every key its `propertyNames` enum allows, or two sample keys,
 *     one of them a key that needs quoting; a map that states no value shape (`additionalProperties: true`) gets the
 *     same keys, each holding OPAQUE_VALUE, typed below. An array gets `minItems + 2` items (at least 3, capped at `maxItems`), each
 *     one distinct where its schema allows, so a loss, merge or reorder past the first item is witnessed (#4087 review,
 *     docs/34 shape 15). A `oneOf`/`anyOf`/type list takes its first branch. An `enum` takes its first value.
 *   · one VARIANT per other choice: each other `oneOf`/`anyOf` branch, each other enum value and `false` for each
 *     boolean, written into a copy of the main witness at that one path. A choice nested inside a non-first branch is
 *     reached from that branch's variant, so every property under every branch is set somewhere.
 * Each witness goes through `toDesignMd`, then `parseDesignMd`, and must come back deep-equal. A string with no
 * pattern gets a value that needs quoting (a quote, a colon, a `#`, a backslash); a string with a pattern gets the
 * first candidate below that matches it; a number gets a fraction inside its bounds; an integer a whole one.
 *
 * WHAT FAILS, each prefixed by the name a mutation must produce:
 *   LOST           a witness came back different. One line per path that differs, with the schema path it came
 *                  from, what was sent and what came back: the property that does not survive, BY NAME.
 *   UNPARSEABLE    the serialized witness did not parse at all; the line names each top-level property that fails
 *                  alone, and the witness.
 *   REPRESENTED    a schema node uses a keyword outside the closed list this walker reads or may ignore (READ and
 *                  IGNORED below), or a `oneOf`/`anyOf` branch it drops carries more than a `required` list: a shape
 *                  the walker does not reach is a shape it would otherwise pass unchecked (#4087 review, docs/34 shapes
 *                  12 and 20). Also: a map property no witness sets, a top-level property missing from the main
 *                  witness, or witness and path counts under their floors.
 *   SELF-CHECK     the generator, the diff and the round trip, run on a planted schema typed below, do not do what is
 *                  planted there.
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the pair `toDesignMd` / `parseDesignMd`. The REFERENCE is the schema, read as
 * JSON and walked by code typed here: nothing below reads `design-md.ts`'s internals, `theme.ts`'s types, the
 * validator, or an example brand. A property added to the schema is in the next run's witnesses with no edit here,
 * so a serializer that does not carry it fails by name the day it lands (the issue's ask). The diff is typed here too,
 * not borrowed from a test helper. The witness's values are not checked against the schema's semantic rules (one mode
 * named twice, a hue out of gamut): design.md carries settings, and the validator is a separate step.
 *
 * WHAT IT DOES NOT ASSERT. That the prose after the front matter survives (that is text, and `test.ts` holds it). That
 * a hand-written design.md in block style parses as its flow-style export does: the export is flow style, and the
 * parser's block arms have their own cases in `test.ts`. That every VALUE of an unconstrained string survives: it
 * sends one hard string and one plain one per property, not every string. That an array longer than its witness
 * survives: each array is sent with `minItems + 2` items, not every length.
 *
 * Mutation (recorded in the PR): drop `motionPersonality` from `toDesignMd`'s entries → `LOST: motionPersonality`;
 * drop a nested key in `serValue` → `LOST` naming that key's path. Review mutations (#4087): a schema property under
 * `patternProperties` or `if`/`then` → `REPRESENTED: … uses patternProperties`; arrays cut to two items on export →
 * `LOST: modes`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDesignMd, toDesignMd } from './design-md';
import type { BrandInput } from './theme';

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = resolve(here, 'schema/theme-schema.json');

type Schema = Record<string, any>;
type Json = unknown;
type Path = (string | number)[];
/** A variant: `value` at `path`, written over the main witness after each `ctx` write (the branch it sits inside). */
type Write = { path: Path; value: Json };
type Choice = Write & { schemaPath: string; label: string; ctx: Write[] };

// ── values, typed here ─────────────────────────────────────────────────────────────────────────────────────────
/** Strings tried, in order, against a property's `pattern`, `minLength` and `enum`. The first is the hard one: it
 *  needs quoting, both escapes and a line break (a two-line brand name typed into Studio), and a design.md that
 *  carries it carries any plain name. The rest are plain shapes
 *  the schema's patterns ask for (an id, a palette step, a role path). */
const STRING_CANDIDATES = [
  'A "quoted" name: #1, \\ and,\nmore',
  'brand-a',
  'brand-a.500',
  'color.surface-a',
  'white',
  'Inter',
];
/** Keys tried for a map with no `propertyNames` enum: one that needs quoting, with a space at each end, and one plain. */
const KEY_CANDIDATES = [' A key: "x" #1 ', 'mobile'];

/** THE CLOSED KEYWORD LIST (#4087 review). READ: every keyword the walker below acts on. IGNORED: annotations and
 *  constraints that add no property and no value shape, so a witness need not reach them. Any other keyword on a node
 *  the walk visits (`patternProperties`, `if`/`then`/`else`, `dependentSchemas`, `prefixItems`, `not`,
 *  `unevaluatedProperties`, …) fails REPRESENTED by name: the walker would pass the shape it adds unchecked. Typed
 *  here, never read from the schema. */
const READ = new Set(['type', 'properties', 'additionalProperties', 'propertyNames', 'items', 'oneOf', 'anyOf', 'allOf', '$ref', 'enum', 'const', 'pattern', 'minLength', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minItems', 'maxItems']);
const IGNORED = new Set(['description', 'default', 'examples', 'required', 'title', '$comment', '$schema', '$id', '$defs', 'deprecated', 'readOnly', 'writeOnly', 'maxLength', 'uniqueItems', 'multipleOf', 'format']);
/** A `oneOf`/`anyOf` branch the walker drops may carry only these: it then constrains which keys are present, and
 *  shapes nothing a witness must carry. */
const DROPPABLE_BRANCH = new Set(['required', 'description', 'title', '$comment']);
/** A map whose schema states no value shape (`additionalProperties: true`: `overrides`, `modeAnchors` today) gets every
 *  sample key, each holding this value: one of each JSON kind, nested, typed here, so a serializer that loses a kind
 *  inside an open map is named. It shapes nothing from the schema, which states none. */
const OPAQUE_VALUE: Json = { [KEY_CANDIDATES[0]]: { s: STRING_CANDIDATES[0], n: 0.37, i: 12, b: false, z: null, a: ['x', 'y', 'z'] }, plain: 'brand-a' };

const pathName = (p: Path): string =>
  p.map((k, i) => (typeof k === 'number' ? `[${k}]` : !/^[A-Za-z_$][\w$-]*$/.test(k) ? `[${JSON.stringify(k)}]` : i === 0 ? k : `.${k}`)).join('') || '(root)';

// ── the walker ─────────────────────────────────────────────────────────────────────────────────────────────────
export const buildWitnesses = (root: Schema): { main: Json; choices: Choice[]; declared: Set<string>; set: Set<string>; unread: string[] } => {
  const choices: Choice[] = [];
  const unread = new Set<string>(); // each schema node, by schema path, that uses a keyword the walker does not read
  const declared = new Set<string>(); // every property path the schema declares, by schema path
  const set = new Set<string>();      // every one a witness sets
  const deref = (s: Schema, seen: string[]): [Schema, string[]] => {
    let cur = s, trail = seen;
    while (cur && typeof cur.$ref === 'string') {
      const ref = cur.$ref as string;
      if (trail.includes(ref)) return [{}, trail];
      if (!ref.startsWith('#/')) throw new Error(`unsupported $ref ${ref}`);
      trail = [...trail, ref];
      const target = ref.slice(2).split('/').reduce<any>((n, k) => n?.[k], root);
      if (!target) throw new Error(`$ref ${ref} resolves to nothing`);
      cur = { ...target, ...Object.fromEntries(Object.entries(cur).filter(([k]) => k !== '$ref')) };
    }
    return [cur, trail];
  };
  /** A branch that only constrains (a `required` list) is not a shape. */
  const isShape = (b: Schema): boolean => ['type', 'properties', '$ref', 'enum', 'const', 'items', 'oneOf', 'anyOf', 'additionalProperties'].some((k) => k in b);
  const branchesOf = (s: Schema, sp: string): Schema[] | null => {
    const alt = (s.oneOf ?? s.anyOf) as Schema[] | undefined;
    for (const b of alt ?? []) {
      const extra = Object.keys(b).filter((k) => !DROPPABLE_BRANCH.has(k));
      if (!isShape(b) && extra.length) unread.add(`${sp || '(root)'} has a ${s.oneOf ? 'oneOf' : 'anyOf'} branch that only constrains (${extra.join(', ')}), which this walker drops`);
    }
    if (alt && alt.some(isShape)) return alt.filter(isShape).map((b) => ({ ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'oneOf' && k !== 'anyOf')), ...b }));
    if (Array.isArray(s.type)) return (s.type as string[]).map((t) => ({ ...s, type: t }));
    return null;
  };
  /** `ord` is the item's place in an array: item 0 takes the first fit, each later item the next, so items differ
   *  wherever the schema leaves more than one fit. */
  const stringFor = (s: Schema, ord: number): string => {
    const re = typeof s.pattern === 'string' ? new RegExp(s.pattern, 'u') : null;
    const fits = STRING_CANDIDATES.filter((c) => (!re || re.test(c)) && c.length >= (s.minLength ?? 0));
    if (!fits.length) throw new Error(`no candidate string matches pattern ${s.pattern}`);
    return fits[ord % fits.length];
  };
  const numberFor = (s: Schema, integer: boolean, ord: number): number => {
    const lo = typeof s.minimum === 'number' ? s.minimum : typeof s.exclusiveMinimum === 'number' ? s.exclusiveMinimum : 0;
    const hi = typeof s.maximum === 'number' ? s.maximum : typeof s.exclusiveMaximum === 'number' ? s.exclusiveMaximum : lo + 10;
    if (integer) { const mid = Math.ceil(lo + (hi - lo) / 2); return mid + ord <= hi ? mid + ord : Math.max(lo, mid - ord); }
    const mid = lo + (hi - lo) * [0.37, 0.61, 0.83][ord % 3]; // a fraction, not a round number
    return Number(mid.toPrecision(6));
  };
  /** One value for `s` at `path`, recording each other choice as a variant. `sp` is the schema path, for names. A
   *  QUIET walk (an array's later items) records no variant: item 0's variants already set every choice there. */
  const gen = (s0: Schema, path: Path, sp: string, trail: string[], depth: number, ctx: Write[], ord = 0, quiet = false): Json => {
    if (depth > 24) throw new Error(`schema recursion too deep at ${sp}`);
    let [s, tr] = deref(s0, trail);
    // `allOf` adds its members' shapes to this node's: merge them in, each `$ref` followed.
    while (Array.isArray(s.allOf)) {
      const { allOf, ...rest } = s;
      s = (allOf as Schema[]).reduce<Schema>((acc, m) => { const [d, t] = deref(m, tr); tr = t; return { ...d, ...acc }; }, rest);
    }
    const foreign = Object.keys(s).filter((k) => !READ.has(k) && !IGNORED.has(k));
    for (const k of foreign) unread.add(`${sp || '(root)'} uses ${k}, which this walker does not read`);
    if (Array.isArray(s.items)) unread.add(`${sp || '(root)'} uses a tuple items list, which this walker does not read`);
    const branches = branchesOf(s, sp);
    if (branches) {
      const first = gen(branches[0], path, `${sp}<0>`, tr, depth + 1, ctx, ord, quiet);
      for (let i = 1; i < branches.length && !quiet; i++) {
        // A choice nested inside this branch is written over the branch's own value, so the holder is in its ctx.
        const holder: Write = { path, value: undefined };
        holder.value = gen(branches[i], path, `${sp}<${i}>`, tr, depth + 1, [...ctx, holder]);
        choices.push({ ...holder, schemaPath: `${sp}<${i}>`, label: `branch ${i}`, ctx });
      }
      return first;
    }
    if ('const' in s) return s.const;
    if (Array.isArray(s.enum)) {
      if (!quiet) for (const v of (s.enum as Json[]).slice(1)) choices.push({ path, schemaPath: sp, value: v, label: `enum ${JSON.stringify(v)}`, ctx });
      return (s.enum as Json[])[ord % s.enum.length];
    }
    const type = s.type ?? (s.properties || s.additionalProperties ? 'object' : s.items ? 'array' : undefined);
    switch (type) {
      case 'string': return stringFor(s, ord);
      case 'number': return numberFor(s, false, ord);
      case 'integer': return numberFor(s, true, ord);
      case 'boolean':
        if (!quiet) choices.push({ path, schemaPath: sp, value: false, label: 'false', ctx });
        return ord % 2 === 0;
      case 'null': return null;
      case 'array': {
        // minItems + 2 (#4087 review): a loss, merge or reorder past the first item or two is then witnessed.
        const n = Math.min(Math.max(1, s.minItems ?? 1) + 2, typeof s.maxItems === 'number' ? s.maxItems : Infinity);
        return Array.from({ length: n }, (_, i) => gen(s.items ?? {}, [...path, i], `${sp}[]`, tr, depth + 1, ctx, i, quiet || i > 0));
      }
      case 'object': {
        const o: Record<string, Json> = {};
        for (const [k, ps] of Object.entries((s.properties ?? {}) as Record<string, Schema>)) {
          const psp = sp ? `${sp}.${k}` : k;
          declared.add(psp);
          set.add(psp);
          o[k] = gen(ps, [...path, k], psp, tr, depth + 1, ctx, ord, quiet);
        }
        const ap = s.additionalProperties;
        if (ap === true) {
          const msp = `${sp}.*`;
          declared.add(msp); set.add(msp);
          for (const k of KEY_CANDIDATES) o[k] = JSON.parse(JSON.stringify(OPAQUE_VALUE));
        }
        if (ap && typeof ap === 'object') {
          const names = s.propertyNames?.enum as string[] | undefined;
          const keys = names ?? KEY_CANDIDATES.filter((k) => !s.propertyNames?.pattern || new RegExp(s.propertyNames.pattern, 'u').test(k));
          const msp = `${sp}.*`;
          declared.add(msp);
          if (keys.length) set.add(msp);
          for (const k of keys) o[k] = gen(ap, [...path, k], msp, tr, depth + 1, ctx, ord, quiet);
        }
        return o;
      }
      default:
        throw new Error(`a schema node at ${sp || '(root)'} has no type this walker reads: ${JSON.stringify(s).slice(0, 120)}`);
    }
  };
  const main = gen(root, [], '', [], 0, []);
  return { main, choices, declared, set, unread: [...unread] };
};

/** A copy of `base` with `value` written at `path`. */
const withAt = (base: Json, path: Path, value: Json): Json => {
  if (!path.length) return value;
  const copy: any = Array.isArray(base) ? [...base] : { ...(base as object) };
  copy[path[0]] = withAt((base as any)[path[0]], path.slice(1), value);
  return copy;
};

// ── the diff, typed here ───────────────────────────────────────────────────────────────────────────────────────
export const diff = (a: Json, b: Json, path: Path = []): { path: Path; sent: Json; got: Json }[] => {
  const kind = (v: Json) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  if (kind(a) !== kind(b)) return [{ path, sent: a, got: b }];
  if (Array.isArray(a)) {
    const bb = b as Json[];
    if (a.length !== bb.length) return [{ path, sent: a, got: b }];
    return a.flatMap((x, i) => diff(x, bb[i], [...path, i]));
  }
  if (a && typeof a === 'object') {
    const ao = a as Record<string, Json>, bo = b as Record<string, Json>;
    const keys = [...new Set([...Object.keys(ao), ...Object.keys(bo)])];
    return keys.flatMap((k) => (!(k in bo) || !(k in ao) ? [{ path: [...path, k], sent: ao[k], got: bo[k] }] : diff(ao[k], bo[k], [...path, k])));
  }
  return Object.is(a, b) ? [] : [{ path, sent: a, got: b }];
};

export const roundTrip = (w: Json): Json => parseDesignMd(toDesignMd(w as BrandInput)).input;

export type Witness = { name: string; value: Json };
export const witnessesOf = (schema: Schema): { witnesses: Witness[]; declared: Set<string>; set: Set<string>; unread: string[] } => {
  const { main, choices, declared, set, unread } = buildWitnesses(schema);
  return {
    witnesses: [{ name: 'main', value: main }, ...choices.map((c) => ({ name: `${c.schemaPath} = ${c.label}`, value: [...c.ctx, c].reduce<Json>((w, x) => withAt(w, x.path, x.value), main) }))],
    declared,
    set,
    unread,
  };
};

/** Every failure over a set of witnesses, each line naming the path that did not survive. */
const short = (v: Json): string => { const t = JSON.stringify(v) ?? 'nothing'; return t.length > 100 ? `${t.slice(0, 100)}…` : t; };
export const check = (witnesses: Witness[], trip: (w: Json) => Json = roundTrip): string[] => {
  const out: string[] = [];
  for (const w of witnesses) {
    let back: Json;
    try { back = trip(w.value); }
    catch (e) {
      // Name the top-level properties that fail alone, so a whole witness that does not parse still names its cause.
      const culprits = w.value && typeof w.value === 'object' && !Array.isArray(w.value)
        ? Object.entries(w.value as Record<string, Json>).filter(([k, v]) => { try { trip({ [k]: v }); return false; } catch { return true; } }).map(([k]) => k)
        : [];
      out.push(`UNPARSEABLE: ${culprits.join(', ') || '(no single property)'}: ${(e as Error).message.split('\n')[0]} [witness: ${w.name}]`);
      continue;
    }
    for (const d of diff(w.value, back)) out.push(`LOST: ${pathName(d.path)} — sent ${short(d.sent)}, read back ${short(d.got)} [witness: ${w.name}]`);
  }
  return out;
};

// ── self-check: the walker, the diff and the check on a planted schema ───────────────────────────────────────────
const selfCheck = (): string[] => {
  const bad: string[] = [];
  const planted: Schema = {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
      tempo: { type: 'string', enum: ['snappy', 'calm'] },
      ratio: { type: 'number', minimum: 0, maximum: 1 },
      gradients: { oneOf: [{ type: 'boolean' }, { type: 'array', items: { $ref: '#/$defs/stop' } }] },
      levers: { type: 'object', additionalProperties: { type: 'integer', minimum: 4 } },
      modes: { type: 'array', items: { type: 'string' } },
    },
    $defs: { stop: { type: 'object', properties: { at: { type: 'number' } } } },
  };
  const { witnesses, declared, set } = witnessesOf(planted);
  const main = witnesses[0].value as any;
  if (main.id !== 'brand-a') bad.push(`a pattern-bound string is not the first candidate that matches (got ${JSON.stringify(main.id)})`);
  if (main.tempo !== 'snappy' || !witnesses.some((w) => (w.value as any).tempo === 'calm')) bad.push('an enum does not take its first value in main and each other value in a variant');
  if (main.gradients !== true || !witnesses.some((w) => Array.isArray((w.value as any).gradients) && typeof (w.value as any).gradients[0]?.at === 'number')) bad.push('a oneOf does not take its first branch in main and its second, $ref followed, in a variant');
  if (!witnesses.some((w) => (w.value as any).gradients === false)) bad.push('a boolean branch has no false variant');
  if (Object.keys(main.levers ?? {}).length !== KEY_CANDIDATES.length) bad.push('a map does not get every sample key');
  if (!declared.has('gradients<1>[].at') || !set.has('gradients<1>[].at')) bad.push(`a property inside a non-first branch is not declared and set (${[...declared].join(', ')})`);
  if (check(witnesses).length) bad.push(`the planted witnesses do not survive the real round trip: ${check(witnesses).join('; ')}`);
  // A trip that drops a key, and one that throws, each fail by name.
  const drop = (w: Json) => { const c: any = JSON.parse(JSON.stringify(w)); delete c.tempo; return c; };
  if (!check(witnesses, drop).some((l) => l.startsWith('LOST: tempo —') && l.endsWith('[witness: main]'))) bad.push('a round trip that drops a top-level key is not named LOST');
  const dropNested = (w: Json) => { const c: any = JSON.parse(JSON.stringify(w)); if (Array.isArray(c.gradients)) delete c.gradients[0].at; return c; };
  if (!check(witnesses, dropNested).some((l) => l.startsWith('LOST: gradients[0].at —'))) bad.push('a round trip that drops a nested key is not named LOST with its path');
  if (!check(witnesses, () => { throw new Error('boom'); }).every((l) => l.startsWith('UNPARSEABLE'))) bad.push('a round trip that throws is not named UNPARSEABLE');
  // Arrays (#4087 review): minItems + 2 distinct items, and a trip that cuts an array to two items is named LOST.
  if (!Array.isArray(main.modes) || main.modes.length !== 3 || new Set(main.modes).size !== 3) bad.push(`an array does not get three distinct items (got ${JSON.stringify(main.modes)})`);
  const cut = (w: Json) => { const c: any = JSON.parse(JSON.stringify(w)); if (Array.isArray(c.modes)) c.modes = c.modes.slice(0, 2); return c; };
  if (!check(witnesses, cut).some((l) => l.startsWith('LOST: modes —'))) bad.push('a round trip that cuts an array to two items is not named LOST');
  const capped = witnessesOf({ type: 'object', properties: { a: { type: 'array', maxItems: 2, items: { type: 'string' } } } }).witnesses[0].value as any;
  if (capped.a?.length !== 2) bad.push(`an array does not stop at its maxItems (got ${JSON.stringify(capped.a)})`);
  // The closed keyword list (#4087 review): a planted keyword the walker does not read, and a branch it drops that
  // carries a constraint, are each reported by name; the planted schema above, which uses none, reports nothing.
  if (witnessesOf(planted).unread.length) bad.push(`the planted schema reports a keyword it does not use (${witnessesOf(planted).unread.join('; ')})`);
  const foreign: Schema = { type: 'object', properties: { m: { type: 'object', patternProperties: { '^w': { type: 'number' } } }, c: { type: 'object', if: { properties: { a: { const: 1 } } }, then: { properties: { extra: { type: 'string' } } } }, b: { type: 'number', oneOf: [{ type: 'number' }, { minimum: 5 }] } } };
  const fu = witnessesOf(foreign).unread;
  for (const want of ['m uses patternProperties', 'c uses if', 'c uses then', 'b has a oneOf branch that only constrains (minimum)']) if (!fu.some((l) => l.startsWith(want))) bad.push(`a schema node that ${want.replace(/^\S+ /, '')} is not reported (${fu.join('; ')})`);
  if (diff({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }).length) bad.push('the diff reads key order as a difference');
  if (diff({ a: '1' }, { a: 1 }).length !== 1) bad.push('the diff does not tell a string from a number');
  return bad;
};

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────
const failures: string[] = [];
for (const b of selfCheck()) failures.push(`SELF-CHECK: ${b}`);

const schema = JSON.parse(readFileSync(SCHEMA_FILE, 'utf8')) as Schema;
const { witnesses, declared, set, unread } = witnessesOf(schema);
for (const u of unread) failures.push(`REPRESENTED: ${u}`);
// The same loss usually shows in every witness that carries the property: report it once, with its first witness and
// how many others it showed in.
{
  const groups = new Map<string, { first: string; n: number }>();
  for (const line of check(witnesses)) {
    const key = line.replace(/ \[witness: [^\]]*\]$/, '');
    const g = groups.get(key);
    if (g) g.n++; else groups.set(key, { first: line, n: 0 });
  }
  for (const { first, n } of groups.values()) failures.push(n ? `${first} — and in ${n} other witness(es)` : first);
}

const main = witnesses[0].value as Record<string, Json>;
for (const k of Object.keys(schema.properties ?? {})) if (!(k in main)) failures.push(`REPRESENTED: the main witness does not set the top-level property ${k}`);
for (const p of declared) if (!set.has(p)) failures.push(`REPRESENTED: no witness sets ${p}`);
// Floors (docs/34 shape 9): the schema declared 55 top-level properties and the walk 400-odd property paths when this
// was written. A walk that stopped descending would pass over a fraction of them.
const MIN_PATHS = 300, MIN_WITNESSES = 100;
if (declared.size < MIN_PATHS) failures.push(`REPRESENTED: the walk declared ${declared.size} property path(s), under the floor of ${MIN_PATHS}`);
if (witnesses.length < MIN_WITNESSES) failures.push(`REPRESENTED: ${witnesses.length} witness(es), under the floor of ${MIN_WITNESSES}`);

console.log(`design.md round trip (#3984) — ${Object.keys(schema.properties ?? {}).length} top-level properties, ${declared.size} property paths over every branch, ${witnesses.length} witnesses (main + one per other branch, enum value or boolean)`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('✓ clean — every property theme-schema.json allows survives toDesignMd → parseDesignMd');
