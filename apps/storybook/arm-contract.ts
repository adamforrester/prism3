/**
 * THE ARM INPUT CONTRACT (#3408): what an arm supplies so the KPI 2 and KPI 3 checks run on its Storybook unchanged.
 *
 * An arm's contract is one JSON file (`arm-1.contract.json` is arm 1's; `ARM-CONTRACT.md` says how to fill one in).
 * It names, for each component the arm covers:
 *   - `root`: the component's root, a selector inside Storybook's `#storybook-root`;
 *   - `parts`: each anatomy part path (`container/control/content`) mapped to a selector relative to the root (`''` is
 *     the root itself), or to `{ "unboxed": "<why>" }` when the part has no box of its own in code;
 *   - `focusRing`: how the focus ring is drawn: an `outline` on the root, a `part` with a selector, or `none`;
 *   - `forms`: each delivery form, and for each case the story id that shows it.
 * And once for the arm, `tokens`: how a CSS custom property names its token. `stock` is stock Style Dictionary's name
 * (`--` and the full path, each `.` a `-`); `map` names each property's token path.
 *
 * THE ORACLES (`docs/34`): the anatomy is the engine's emitted `specs.json`, the token paths are the emitted tree
 * (`packages/engine/out/prism3.tokens.json`), the required cases are the brief's KPI 2 states (written here by hand,
 * from #3408), and the story ids are the arm's own built `index.json`. None is read from an arm's code. The contract is
 * the subject.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type PartTarget = string | { unboxed: string };
export type FocusRing = { drawn: 'outline' } | { drawn: 'part'; selector: string } | { drawn: 'none'; why: string };
export type ComponentContract = {
  root: string;
  parts: Record<string, PartTarget>;
  focusRing: FocusRing;
};
export type Stories = { template: string } | { cases: Record<string, Record<string, string>> };
export type TokenNames = { scheme: 'stock' } | { scheme: 'map'; map: Record<string, string> };
export type ArmContract = {
  format: '1.0';
  arm: string;
  components: Record<string, ComponentContract>;
  forms: Record<string, Stories>;
  tokens: TokenNames;
};

/** The components the brief names for both arms (#3408): button and text-field. Any other is the arm's own. */
export const REQUIRED_COMPONENTS = ['button', 'text-field'];
/** The brief's KPI 2 states (#3408 "States covered", Q32 A), by hand, with the case name each arm's stories use. */
export const KPI_CASES: Record<string, string[]> = {
  button: ['rest', 'hover', 'focus-visible', 'disabled', 'pending'],
  'text-field': ['rest', 'hover', 'focus-visible', 'error', 'disabled', 'pending'],
  'password-field': ['rest', 'hover', 'focus-visible', 'error', 'disabled', 'pending'],
};

const HERE = import.meta.dirname ?? '';
export const ARM_1 = resolve(HERE, 'arm-1.contract.json');
export const load = (path: string): ArmContract => JSON.parse(readFileSync(path, 'utf8'));

/** The story id a form shows a case with, or undefined when the contract names none. */
export const storyId = (s: Stories, component: string, form: string, kase: string): string | undefined =>
  'template' in s ? s.template.replace('{component}', component).replace('{form}', form).replace('{case}', kase) : s.cases[component]?.[kase];

/** Every leaf token path in a DTCG tree, dot-joined, root first. */
export const leafPaths = (tree: Record<string, unknown>, at: string[] = [], out = new Set<string>()): Set<string> => {
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith('$') || !v || typeof v !== 'object') continue;
    if ('$value' in (v as object)) out.add([...at, k].join('.'));
    else leafPaths(v as Record<string, unknown>, [...at, k], out);
  }
  return out;
};

export type Oracles = {
  /** `specs.json`'s `components[id].anatomy[].part`, per component. */
  anatomy: Record<string, string[]>;
  /** Every leaf path in the emitted token tree. */
  tokens: Set<string>;
  /** The arm's built `index.json` story ids, when the build is at hand. */
  stories?: Set<string>;
};

/** Every way the contract falls short of what the checks need, by name. Empty is a pass. */
export const validate = (c: ArmContract, o: Oracles): string[] => {
  const out: string[] = [];
  if (c.format !== '1.0') out.push(`contract: format is ${JSON.stringify(c.format)}, expected "1.0"`);
  for (const id of REQUIRED_COMPONENTS) if (!c.components?.[id]) out.push(`${id}: not in the contract (the brief names it for both arms)`);
  for (const [id, comp] of Object.entries(c.components ?? {})) {
    const anatomy = o.anatomy[id];
    if (!anatomy) { out.push(`${id}: no component of that id in the emitted specs.json`); continue; }
    if (typeof comp.root !== 'string' || !comp.root.trim()) out.push(`${id}: root names no selector`);
    for (const part of anatomy) {
      const t = comp.parts?.[part];
      if (part === 'container/focusRing') {
        if (t !== undefined) out.push(`${id}: container/focusRing is in parts; it belongs in focusRing`);
        continue;
      }
      if (t === undefined) out.push(`${id}: ${part} is in the anatomy and neither mapped nor declared unboxed`);
      else if (typeof t === 'object' && !(typeof t.unboxed === 'string' && t.unboxed.trim())) out.push(`${id}: ${part} is declared unboxed with no reason`);
      else if (typeof t === 'string' && part !== 'container' && !t.trim()) out.push(`${id}: ${part} maps to the root's own selector; only container may`);
    }
    for (const part of Object.keys(comp.parts ?? {})) if (!anatomy.includes(part)) out.push(`${id}: ${part} is not a part path in the def's anatomy`);
    if (comp.parts?.container !== '') out.push(`${id}: container must map to '' (the root itself)`);
    const fr = comp.focusRing;
    if (!fr || !['outline', 'part', 'none'].includes(fr.drawn)) out.push(`${id}: focusRing.drawn must be outline, part or none`);
    else if (fr.drawn === 'part' && !fr.selector?.trim()) out.push(`${id}: focusRing is a part with no selector`);
    else if (fr.drawn === 'none' && anatomy.includes('container/focusRing')) out.push(`${id}: focusRing is none, but the anatomy draws container/focusRing`);
  }
  const forms = Object.entries(c.forms ?? {});
  if (!forms.length) out.push('forms: the contract names no delivery form');
  for (const [form, s] of forms) {
    if ('template' in s && !/\{case\}/.test(s.template)) out.push(`${form}: the story id template has no {case}`);
    for (const id of Object.keys(c.components ?? {})) for (const kase of KPI_CASES[id] ?? []) {
      const sid = storyId(s, id, form, kase);
      if (!sid) out.push(`${form}: ${id} ${kase} has no story id`);
      else if (o.stories && !o.stories.has(sid)) out.push(`${form}: ${id} ${kase} maps to ${sid}, which is not in the built index.json`);
    }
  }
  const t = c.tokens;
  if (!t || !['stock', 'map'].includes(t.scheme)) out.push('tokens: scheme must be stock or map');
  else if (t.scheme === 'map') {
    if (!Object.keys(t.map ?? {}).length) out.push('tokens: the map names no property');
    for (const [name, path] of Object.entries(t.map ?? {})) {
      if (!name.startsWith('--')) out.push(`tokens: ${name} is not a CSS custom property name`);
      if (!o.tokens.has(path)) out.push(`tokens: ${name} maps to ${path}, which is not a token in the emitted tree`);
    }
  }
  return out;
};

/** The selectors a check measures: each boxed part's selector, keyed by part path, per component. */
export const boxedParts = (c: ArmContract): Record<string, Record<string, string>> =>
  Object.fromEntries(Object.entries(c.components).map(([id, comp]) =>
    [id, Object.fromEntries(Object.entries(comp.parts).filter((e): e is [string, string] => typeof e[1] === 'string'))]));

export const readIndex = (dir: string): Set<string> | undefined => {
  const f = resolve(dir, 'index.json');
  return existsSync(f) ? new Set(Object.keys(JSON.parse(readFileSync(f, 'utf8')).entries)) : undefined;
};
