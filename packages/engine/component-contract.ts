/**
 * Prism3 engine — COMPONENT CONTRACT (the component-API surface, the component schema's shape, and the gate on both).
 *
 *   npx tsx packages/engine/component-contract.ts --check    # fail (exit 1) if either surface moved
 *   npx tsx packages/engine/component-contract.ts --accept   # rewrite the baseline (requires the bump)
 *   PRISM3_COMPONENT_CONTRACT_BASELINE=/tmp/x.json npx tsx …  --check   # injected baseline, for tests
 *
 * #1325 Option 3, #1326 decision 3, owner decision Q-CC1 A (2026-11-18). The words follow Nathan Curtis, *Component
 * Contracts and Schemas*: a COMPONENT CONTRACT is one component's spec as data, and the COMPONENT SCHEMA is the model a
 * contract is written in. Each has its own number in `version.ts`, apart from the token `CONTRACT_VERSION`:
 *
 *   COMPONENT_CONTRACT_VERSION — the guaranteed component-API surface, read from `componentDefs`
 *   COMPONENT_SCHEMA_VERSION   — the shape of one published entry, read from `schema/component-defs.schema.json`
 *
 * ── WHAT THE CONTRACT RECORDS ───────────────────────────────────────────────────────────────────────────────────
 *
 * Per registered def: `name` and `status`; each prop's `type`, `required`, `default`, `values`, `deprecated`, and a
 * slot prop's `anyOf`/`minItems`/`maxItems`; `states`; each variant axis and its values; and the def's slot parts
 * (anatomy parts of kind `slot`). These are the names a designer's file and a developer's code hold: a component
 * that stops existing, a prop that is renamed, a value that leaves an axis, each makes a reference resolve to nothing.
 *
 * Deliberately NOT recorded, and not by oversight:
 *   · descriptions, summaries, docs, tokens, anatomy geometry: prose and VALUES, the engine working (docs/30);
 *   · the projected Figma surface (member count, property names, layer names): `lint-component-surface.ts` holds it
 *     under `ENGINE_VERSION`, and `component-renames.ts` holds its renames. Whether Figma property and layer names
 *     join the contract is #1325's open scope question, flagged to the owner rather than decided here.
 *
 * EVERY def is recorded, `draft` included. #1325 floated "the contract begins at stable"; every def is `draft` today,
 * so that reading would make this a gate over nothing. The status is recorded instead, so a consumer can see what is
 * still draft, and the owner can narrow the promise later as a policy change in `docs/30`.
 *
 * ── THE BUMP CLASSES (docs/30's reasoning: a reference that stops resolving is MAJOR) ───────────────────────────
 *
 *   MAJOR — a def removed or renamed (`name`); a prop removed, retyped, or newly required (a new required prop
 *           included); a prop value, state, variant axis, axis value, slot, or slot `anyOf` id removed; a slot's
 *           `minItems` raised or `maxItems` lowered or added; a status moved BACK to `draft`.
 *   MINOR — any of those added; a prop made optional; `deprecated` set or cleared; a status moved forward
 *           (`draft` → `stable`, anything → `deprecated`); a slot's bounds loosened.
 *   PATCH — a prop's `default` added, changed or removed. Docs/30's release-notes table already classes "a prop's
 *           default moves" as a fix: the name holds, the value under it moves. It is still recorded, so the gate
 *           fails by name and the bump is not forgotten.
 *
 * The schema is classed on its SHAPE, a set of facts read off the JSON schema (`type`, `const`, `enum` members,
 * `required` members, property and `$defs` names, `$ref`, `additionalProperties`, patterns and bounds), never its
 * prose. A fact removed is MAJOR (a reader loses something it relied on: a field, a guarantee, an allowed value
 * narrowing the other way is a new fact). Facts only added is MINOR. A description edit is no change. The schema's own
 * `$id`, and a `const` equal to it, are the version itself and are read as `<$id>`, so a bump does not classify
 * itself. An `anyOf` branch inserted mid-list renumbers its siblings and reads as MAJOR: over-safe, accepted.
 *
 * ── WHY THIS IS NOT PART OF `regen.ts` (the token contract's rule, restated for this baseline) ──────────────────
 *
 * A gate allowed to rewrite what it reads has no memory. `regen` rewrites every generated artifact; run that way, a
 * removed prop would rewrite the baseline to agree with the removal and both gates would pass. So
 * `schema/component-contract.json` is written by `--accept` alone, and `--accept` refuses until each version in
 * `version.ts` has moved by at least the increment its diff needs. Both modes also compare the NUMBERS (the #1768
 * arm `token-contract.ts` carries): a constant BEHIND the baseline, or AHEAD of it with nothing to record, fails.
 *
 * The two sides are independent the way the token contract's are: the live side is derived from the defs and the
 * authored JSON schema in this process; the other is a committed file that only a deliberate `--accept` wrote. The
 * classifier below is shared by both modes, which is what lets `--accept` and `--check` agree.
 *
 * STATED LIMIT: both sides of the number comparison are in the tree, so writing an old number back into BOTH
 * `version.ts` and the baseline after an `--accept` passes this gate. `lint-contract-version.ts` closes that hole for
 * the token contract by reading the merge base; the component twin is filed as a follow-up, not built here.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef } from './component-schema';
import { componentDefs } from './components';
import { COMPONENT_DEFS_FORMAT } from './component-defs-export';
import { COMPONENT_CONTRACT_VERSION, COMPONENT_SCHEMA_VERSION, contractVersionDrift, LEVELS, satisfiesBump } from './version';
import type { Level } from './version';

const here = dirname(fileURLToPath(import.meta.url));
export const COMPONENT_CONTRACT_PATH = resolve(here, 'schema', 'component-contract.json');
export const COMPONENT_SCHEMA_PATH = resolve(here, 'schema', 'component-defs.schema.json');

// ---- the contract surface ------------------------------------------------------------------------------------

export type ContractProp = {
  type: string;
  required?: true;
  default?: string | number | boolean;
  values?: string[];
  deprecated?: true;
  anyOf?: string[];
  minItems?: number;
  maxItems?: number;
};

export type ContractEntry = {
  name: string;
  status: string;
  props: Record<string, ContractProp>;
  states: string[];
  variants: Record<string, string[]>;
  slots: string[];
};

const sorted = (xs: readonly string[]): string[] => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const byKey = <T>(rec: Record<string, T>): Record<string, T> =>
  Object.fromEntries(sorted(Object.keys(rec)).map((k) => [k, rec[k]]));

/** One def's component contract, as the baseline records it. Sets are sorted: order is not part of the API. */
export const contractEntry = (def: ComponentDef): ContractEntry => {
  const props: Record<string, ContractProp> = {};
  for (const p of def.props) {
    // An enum's `type` restates its `values` as prose (`enum: 'small' | 'medium'`), so it is recorded as `enum` and the
    // values carry the API: otherwise adding a value would also retype the prop, and read MAJOR instead of MINOR.
    const e: ContractProp = { type: p.values && /^enum\b/.test(p.type) ? 'enum' : p.type };
    if (p.required) e.required = true;
    if (p.default !== undefined) e.default = p.default;
    if (p.values) e.values = sorted(p.values);
    if (p.deprecated) e.deprecated = true;
    if (p.anyOf) e.anyOf = sorted(p.anyOf);
    if (p.minItems !== undefined) e.minItems = p.minItems;
    if (p.maxItems !== undefined) e.maxItems = p.maxItems;
    props[p.name] = e;
  }
  const variants: Record<string, string[]> = {};
  for (const [axis, values] of Object.entries(def.variants ?? {})) if (values) variants[axis] = sorted(values);
  const slots = Object.entries(def.anatomy?.parts ?? {}).filter(([, p]) => p.kind === 'slot').map(([k]) => k);
  return { name: def.name, status: def.status, props: byKey(props), states: sorted(def.states ?? []), variants: byKey(variants), slots: sorted(slots) };
};

export const contractSurface = (defs: readonly ComponentDef[] = componentDefs): Record<string, ContractEntry> =>
  byKey(Object.fromEntries(defs.map((d) => [d.id, contractEntry(d)])));

// ---- the schema shape ----------------------------------------------------------------------------------------

const SHAPE_SCALARS = ['type', '$ref', 'additionalProperties', 'pattern', 'format', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties'];
const SHAPE_MAPS = ['properties', 'patternProperties', '$defs', 'definitions'];
const SHAPE_NODES = ['items', 'not', 'contains', 'propertyNames', 'if', 'then', 'else'];
const SHAPE_LISTS = ['anyOf', 'oneOf', 'allOf', 'prefixItems'];

/**
 * The SHAPE of a JSON schema as a sorted list of facts, one per line, prose left out. `$id` is the version itself: the
 * root's `$id` is not a fact, and any `const` equal to it reads `<$id>`.
 */
export const schemaShape = (schema: any): string[] => {
  const id = typeof schema?.$id === 'string' ? schema.$id : undefined;
  const facts: string[] = [];
  const val = (v: unknown): string => (id !== undefined && v === id ? '"<$id>"' : JSON.stringify(v));
  const walk = (node: any, ptr: string): void => {
    if (typeof node === 'boolean') { facts.push(`${ptr} is ${node}`); return; }
    if (!node || typeof node !== 'object') return;
    for (const k of SHAPE_SCALARS) {
      if (!(k in node)) continue;
      if (k === 'additionalProperties' && node[k] && typeof node[k] === 'object') walk(node[k], `${ptr}/additionalProperties`);
      else if (k === 'type' && Array.isArray(node[k])) for (const t of node[k]) facts.push(`${ptr} type∋${t}`);
      else facts.push(`${ptr} ${k}=${val(node[k])}`);
    }
    if ('const' in node) facts.push(`${ptr} const=${val(node.const)}`);
    if (Array.isArray(node.enum)) for (const v of node.enum) facts.push(`${ptr} enum∋${val(v)}`);
    if (Array.isArray(node.required)) for (const r of node.required) facts.push(`${ptr} required∋${r}`);
    for (const k of SHAPE_MAPS) {
      if (!node[k] || typeof node[k] !== 'object') continue;
      for (const [name, sub] of Object.entries(node[k])) {
        facts.push(`${ptr}/${k}/${name}`);
        walk(sub, `${ptr}/${k}/${name}`);
      }
    }
    for (const k of SHAPE_NODES) if (k in node) walk(node[k], `${ptr}/${k}`);
    for (const k of SHAPE_LISTS) {
      if (!Array.isArray(node[k])) continue;
      facts.push(`${ptr} ${k}#=${node[k].length}`);
      node[k].forEach((sub: unknown, i: number) => walk(sub, `${ptr}/${k}/${i}`));
    }
  };
  walk(schema, '#');
  return sorted([...new Set(facts)]);
};

// ---- the baseline --------------------------------------------------------------------------------------------

export type ComponentContractBaseline = {
  componentContractVersion: string;
  componentSchemaVersion: string;
  note: string;
  schema: { source: string; shape: string[] };
  components: Record<string, ContractEntry>;
};

export const buildComponentContract = (
  defs: readonly ComponentDef[] = componentDefs,
  schema: any = JSON.parse(readFileSync(COMPONENT_SCHEMA_PATH, 'utf8')),
): ComponentContractBaseline => ({
  componentContractVersion: COMPONENT_CONTRACT_VERSION,
  componentSchemaVersion: COMPONENT_SCHEMA_VERSION,
  note:
    'Written by packages/engine/component-contract.ts --accept alone; do not hand-edit, and never regenerate it. ' +
    '`components` is the component-contract surface: per component, its name and status, its props (type, required, ' +
    'default, values), states, variant axes and values, and slots. `schema.shape` is the component schema: the shape ' +
    'of one published entry, read from the JSON schema named in `schema.source`, with its prose left out. Removing or ' +
    'renaming a name is a MAJOR change, adding one is MINOR, and moving a default is a PATCH; docs/30 has the full table.',
  schema: { source: 'packages/engine/schema/component-defs.schema.json', shape: schemaShape(schema) },
  components: contractSurface(defs),
});

export const readComponentContract = (path = COMPONENT_CONTRACT_PATH): ComponentContractBaseline =>
  JSON.parse(readFileSync(path, 'utf8')) as ComponentContractBaseline;

// ---- the classifiers (shared by --check and --accept) --------------------------------------------------------

export type Change = { level: Exclude<Level, 'none'>; what: string };

const maxLevel = (changes: readonly Change[]): Level =>
  changes.reduce<Level>((acc, c) => (LEVELS.indexOf(c.level) > LEVELS.indexOf(acc) ? c.level : acc), 'none');

const setDiff = (was: readonly string[] = [], now: readonly string[] = []): { removed: string[]; added: string[] } => ({
  removed: was.filter((x) => !now.includes(x)),
  added: now.filter((x) => !was.includes(x)),
});

const STATUS_ORDER = ['draft', 'stable', 'deprecated'];

/** Every change between two component-contract surfaces, each named and classed. */
export const classifyContract = (
  was: Record<string, ContractEntry>,
  now: Record<string, ContractEntry>,
): { changes: Change[]; level: Level } => {
  const changes: Change[] = [];
  const push = (level: Change['level'], what: string): void => { changes.push({ level, what }); };
  const ids = setDiff(Object.keys(was), Object.keys(now));
  for (const id of ids.removed) push('major', `${id}: component removed`);
  for (const id of ids.added) push('minor', `${id}: component added`);
  for (const id of Object.keys(was).filter((k) => k in now)) {
    const a = was[id], b = now[id];
    if (a.name !== b.name) push('major', `${id}: name ${JSON.stringify(a.name)} → ${JSON.stringify(b.name)}`);
    if (a.status !== b.status) {
      const back = b.status === 'draft' || STATUS_ORDER.indexOf(b.status) < STATUS_ORDER.indexOf(a.status);
      push(back ? 'major' : 'minor', `${id}: status ${a.status} → ${b.status}`);
    }
    const props = setDiff(Object.keys(a.props), Object.keys(b.props));
    for (const p of props.removed) push('major', `${id}: prop ${p} removed`);
    for (const p of props.added) push(b.props[p].required ? 'major' : 'minor', `${id}: prop ${p} added${b.props[p].required ? ' as required' : ''}`);
    for (const p of Object.keys(a.props).filter((k) => k in b.props)) {
      const x = a.props[p], y = b.props[p];
      if (x.type !== y.type) push('major', `${id}: prop ${p} type ${JSON.stringify(x.type)} → ${JSON.stringify(y.type)}`);
      if (!x.required && y.required) push('major', `${id}: prop ${p} became required`);
      if (x.required && !y.required) push('minor', `${id}: prop ${p} became optional`);
      if (JSON.stringify(x.default) !== JSON.stringify(y.default))
        push('patch', `${id}: prop ${p} default ${JSON.stringify(x.default) ?? '(none)'} → ${JSON.stringify(y.default) ?? '(none)'}`);
      const vals = setDiff(x.values, y.values);
      for (const v of vals.removed) push('major', `${id}: prop ${p} value ${JSON.stringify(v)} removed`);
      for (const v of vals.added) push('minor', `${id}: prop ${p} value ${JSON.stringify(v)} added`);
      if (!!x.deprecated !== !!y.deprecated) push('minor', `${id}: prop ${p} ${y.deprecated ? 'deprecated' : 'no longer deprecated'}`);
      const any = setDiff(x.anyOf, y.anyOf);
      for (const v of any.removed) push('major', `${id}: prop ${p} anyOf ${v} removed`);
      for (const v of any.added) push('minor', `${id}: prop ${p} anyOf ${v} added`);
      if (x.minItems !== y.minItems) push((y.minItems ?? 0) > (x.minItems ?? 0) ? 'major' : 'minor', `${id}: prop ${p} minItems ${x.minItems ?? '(none)'} → ${y.minItems ?? '(none)'}`);
      if (x.maxItems !== y.maxItems) {
        const tighter = y.maxItems !== undefined && (x.maxItems === undefined || y.maxItems < x.maxItems);
        push(tighter ? 'major' : 'minor', `${id}: prop ${p} maxItems ${x.maxItems ?? '(none)'} → ${y.maxItems ?? '(none)'}`);
      }
    }
    const states = setDiff(a.states, b.states);
    for (const s of states.removed) push('major', `${id}: state ${s} removed`);
    for (const s of states.added) push('minor', `${id}: state ${s} added`);
    const axes = setDiff(Object.keys(a.variants), Object.keys(b.variants));
    for (const ax of axes.removed) push('major', `${id}: variant axis ${ax} removed`);
    for (const ax of axes.added) push('minor', `${id}: variant axis ${ax} added`);
    for (const ax of Object.keys(a.variants).filter((k) => k in b.variants)) {
      const vs = setDiff(a.variants[ax], b.variants[ax]);
      for (const v of vs.removed) push('major', `${id}: variant ${ax} value ${JSON.stringify(v)} removed`);
      for (const v of vs.added) push('minor', `${id}: variant ${ax} value ${JSON.stringify(v)} added`);
    }
    const slots = setDiff(a.slots, b.slots);
    for (const s of slots.removed) push('major', `${id}: slot ${s} removed`);
    for (const s of slots.added) push('minor', `${id}: slot ${s} added`);
  }
  return { changes, level: maxLevel(changes) };
};

/** Every change between two schema shapes: a fact removed is MAJOR, facts only added is MINOR. */
export const classifySchema = (was: readonly string[], now: readonly string[]): { changes: Change[]; level: Level } => {
  const d = setDiff(was, now);
  const changes: Change[] = [
    ...d.removed.map((f) => ({ level: 'major' as const, what: `schema fact removed: ${f}` })),
    ...d.added.map((f) => ({ level: 'minor' as const, what: `schema fact added: ${f}` })),
  ];
  return { changes, level: maxLevel(changes) };
};

/** `prism3-component-defs/<major>.<minor>` for a schema version: what the export's `format` and the schema's `$id` must say. */
export const formatFor = (schemaVersion: string): string => `prism3-component-defs/${schemaVersion.split('.').slice(0, 2).join('.')}`;

// ---- the CLI -------------------------------------------------------------------------------------------------

const serialize = (c: ComponentContractBaseline): string => JSON.stringify(c, null, 2) + '\n';

const main = (): void => {
  const accept = process.argv.includes('--accept');
  const check = process.argv.includes('--check');
  if (!accept && !check) {
    console.log('Usage: tsx packages/engine/component-contract.ts --check | --accept');
    process.exit(2);
  }
  const injected = process.env.PRISM3_COMPONENT_CONTRACT_BASELINE;
  const baselinePath = injected || COMPONENT_CONTRACT_PATH;
  const schemaJson = JSON.parse(readFileSync(COMPONENT_SCHEMA_PATH, 'utf8'));
  const live = buildComponentContract(componentDefs, schemaJson);
  const baseline = readComponentContract(baselinePath);

  console.log(`Prism3 component contract — component contract ${COMPONENT_CONTRACT_VERSION}, component schema ${COMPONENT_SCHEMA_VERSION}`);
  console.log(`  live: ${Object.keys(live.components).length} components · ${live.schema.shape.length} schema facts`);
  console.log(`  baseline: component contract ${baseline.componentContractVersion} · component schema ${baseline.componentSchemaVersion} · ${Object.keys(baseline.components ?? {}).length} components`);
  if (injected) console.log(`  ⚠ baseline INJECTED via PRISM3_COMPONENT_CONTRACT_BASELINE, reading ${baselinePath}`);

  // The schema version's MAJOR.MINOR is the published `format` and the schema's `$id`. Three spellings of one number,
  // held together here, so a schema bump cannot leave the file a consumer reads naming the old shape.
  const wantFormat = formatFor(COMPONENT_SCHEMA_VERSION);
  const formatErrors: string[] = [];
  if (schemaJson.$id !== wantFormat) formatErrors.push(`schema/component-defs.schema.json \`$id\` is "${schemaJson.$id}"`);
  if (COMPONENT_DEFS_FORMAT !== wantFormat) formatErrors.push(`COMPONENT_DEFS_FORMAT in component-defs-export.ts is "${COMPONENT_DEFS_FORMAT}"`);
  if (formatErrors.length) {
    console.error(`\n✗ COMPONENT_SCHEMA_VERSION ${COMPONENT_SCHEMA_VERSION} names the shape "${wantFormat}", but:`);
    for (const e of formatErrors) console.error(`    ${e}`);
    console.error('  Move all three together: the constant in version.ts, the schema\'s `$id` (and its `format` const), and COMPONENT_DEFS_FORMAT.');
    process.exit(1);
  }

  const contract = classifyContract(baseline.components ?? {}, live.components);
  const schema = classifySchema(baseline.schema?.shape ?? [], live.schema.shape);
  const arms = [
    { label: 'component contract', constant: 'COMPONENT_CONTRACT_VERSION', now: COMPONENT_CONTRACT_VERSION, was: baseline.componentContractVersion, diff: contract },
    { label: 'component schema', constant: 'COMPONENT_SCHEMA_VERSION', now: COMPONENT_SCHEMA_VERSION, was: baseline.componentSchemaVersion, diff: schema },
  ];

  const report = (c: Change[]): void => {
    for (const x of c.slice(0, 40)) console.error(`    ${x.level.toUpperCase().padEnd(5)}  ${x.what}`);
    if (c.length > 40) console.error(`    … and ${c.length - 40} more`);
  };

  // The numbers first, in both modes (the #1768 arm): a constant behind the baseline, or ahead with nothing to record.
  let failed = false;
  for (const a of arms) {
    let drift: ReturnType<typeof contractVersionDrift>;
    try {
      drift = contractVersionDrift(a.was, a.now, a.diff.level);
    } catch (e) {
      console.error(`\n✗ ${a.constant} cannot be compared: ${(e as Error).message}. The baseline records "${a.was}" and version.ts has "${a.now}"; both must be plain MAJOR.MINOR.PATCH.`);
      failed = true;
      continue;
    }
    if (drift === 'behind') {
      console.error(`\n✗ ${a.constant} moved BACKWARDS: ${a.now} in packages/engine/version.ts is below the baseline's ${a.was}.`);
      console.error(`  The baseline only records a number an --accept saw. Restore ${a.constant} to ${a.was}.`);
      failed = true;
    } else if (drift === 'ahead') {
      console.error(`\n✗ ${a.constant} is AHEAD of the baseline with nothing to record: ${a.now} vs ${a.was}, and the ${a.label} did not move.`);
      console.error(`  Restore ${a.constant} to ${a.was}, or make the change it was raised for.`);
      failed = true;
    }
  }
  if (failed) process.exit(1);

  if (accept) {
    const short = arms.filter((a) => !satisfiesBump(a.was, a.now, a.diff.level));
    if (short.length) {
      for (const a of short) {
        console.error(`\n✗ the ${a.label} change is ${a.diff.level.toUpperCase()} but ${a.constant} is still ${a.now} (baseline ${a.was}):`);
        report(a.diff.changes);
        console.error(`  Raise ${a.constant} in packages/engine/version.ts by a ${a.diff.level} increment, then re-run --accept.`);
      }
      process.exit(1);
    }
    writeFileSync(baselinePath, serialize(live));
    console.log(`\n✓ baseline accepted: component contract ${COMPONENT_CONTRACT_VERSION} (${contract.level}), component schema ${COMPONENT_SCHEMA_VERSION} (${schema.level})`);
    return;
  }

  const noteMoved = baseline.note !== live.note || baseline.schema?.source !== live.schema.source;
  const moved = arms.filter((a) => a.diff.level !== 'none');
  if (!moved.length && !noteMoved) {
    console.log('\n✓ component contract and component schema unchanged');
    return;
  }
  for (const a of moved) {
    console.error(`\n✗ the ${a.label} moved — a ${a.diff.level.toUpperCase()} change, and the committed baseline does not record it:`);
    report(a.diff.changes);
    console.error(satisfiesBump(a.was, a.now, a.diff.level)
      ? `  ${a.constant} is already ${a.now}, enough for this change: run --accept to record it.`
      : `  Raise ${a.constant} in packages/engine/version.ts by at least a ${a.diff.level} increment over ${a.was}, then run --accept.`);
  }
  if (!moved.length) console.error('\n✗ the baseline\'s informational fields (note, schema source) no longer match. No version bump is needed: run --accept.');
  console.error('\n  Then: npx tsx packages/engine/component-contract.ts --accept');
  process.exit(1);
};

if (process.argv[1] && /component-contract\.ts$/.test(process.argv[1])) main();
