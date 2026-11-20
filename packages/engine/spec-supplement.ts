/**
 * Prism3 engine — THE SPEC SUPPLEMENT (#2996, owner decision Q2996.1, the hybrid A, 2026-11-19). Spectacular (formerly the
 * Specs plugin) is the base spec for every component: it reads the design file and writes `api.yaml` (anatomy, props) and
 * `variants.yaml` (each element's styles, with `$token` references by Figma variable path). Prism3 adds a SUPPLEMENT for
 * its own components, in Spectacular's file shape, carrying only what the file cannot hold:
 *
 *   · accessibility: role, keyboard, focus, ARIA, the WCAG criteria, and the hit-target floor per size;
 *   · behavior: the code-only props, states and axes, and the sync boundary (which code-only facts the file lacks);
 *   · motion, and RTL (how each element mirrors);
 *   · the shipped token code names for each bound element, keyed by the exact Figma path Spectacular prints as `$token`.
 *
 *   specSupplement(def, names)   → the supplement for one def, as plain JSON-able data
 *   toYaml(value)                → that data as block YAML, the way Spectacular writes its files
 *   SUPPLEMENT_DEFS              → the defs that get one (the first slice, Q2996.4: Button only)
 *
 * Written by `emit-spec-supplement.ts` to `out/specs/<id>.supplement.yaml`; held to Spectacular's own output for the same
 * component by `lint-spec-supplement.ts`, which reads a fixture of that output and never this module.
 *
 * ── HOW IT LINES UP WITH SPECTACULAR ──────────────────────────────────────────────────────────────────────────────────
 *
 * Keys are Spectacular's names for the same component, so a reader can lay the supplement over `api.yaml` key by key:
 *  · `title` is the component set's name in the design file, which is the def id.
 *  · `anatomy` keys: the root part is `root` (Spectacular names the component node so); every other part is its Figma
 *    layer name, which is the part name, in camelCase.
 *  · `props` keys: each Figma component property the def projects (`figmaProperties`: the variant axes, the state axis,
 *    each slot axis's `figmaName`, each swap's `figmaName`, each text property), camelCased the way Spectacular's
 *    `keys: CAMEL` setting writes them (`↳ swap leading icon` → `swapLeadingIcon`). A code prop with no Figma property
 *    is not a Spectacular prop, so it is listed under the component's own block, not under `props`.
 *  · each element's `tokens` are keyed by the Figma path Spectacular writes as `$token`: the variable's collection, then
 *    its name (`color/pds3/color/interactive/primary/fill/rest`), or a text style's name (`label/md/emphasis`).
 *
 * Everything Prism3 adds sits under `$extensions["com.prism3"]`. ONE LIMIT, measured against the published schema
 * (`@directededges/specs-schema` 0.39.0): a prop's `$extensions` is open, but an anatomy element's admits only
 * `com.figma` and the api document admits no top-level `$extensions`. So the supplement is a file BESIDE `api.yaml`, keyed
 * to it, and not a patch to merge into it: a strict Spectacular validator would reject a merged document's element and
 * component blocks. The owner decision on the PR (#2996) holds the alternatives.
 *
 * ── WHERE EACH FACT COMES FROM (nothing is re-derived) ────────────────────────────────────────────────────────────────
 *
 *  · `projectDef(def)` — the shipped def fields: accessibility, motion prose, props, states, axis kinds, sync boundary.
 *  · `componentSpec(def)` — the spec model the design file is built from: each part's bound tokens (colors, type,
 *    geometry), the focus ring's tokens, the motion bindings, the axes with their Figma names, the code-only states.
 *  · `def.figmaProperties` — which Figma property is which code prop; `def.anatomy` — the root part and each part's
 *    `mirror`; `def.tokens` — the hit-target floor per size (#4047: no other emitted file carries it).
 *  · token names — `TokenNames`, built by the emitter from the house brand's own emission: the Figma variable index
 *    (`figmaArtifacts`), the brand root, and stock Style Dictionary's `name/kebab` over that root, the name the shipped
 *    `@prism3/tokens` CSS uses (`packages/tokens/sd.ship.mjs`).
 *
 * THE DATA IS PLAIN JSON (string keys; string, number, boolean, array and object values; no YAML-only feature), so the
 * later canvas slice (Q2996.3 B, a collapsed JSON block per set) can drop the same object onto the page as-is.
 */
import type { ComponentDef } from './component-schema';
import { componentSpec } from './component-specs';
import type { ComponentSpec } from './component-specs';
import { projectDef } from './project-def';
import { localeFreeCompare } from './locale-free-order';

/** The supplement's own shape (`<name>/<major>.<minor>`). DRAFT, like every field name under `com.prism3` (#2996). */
export const SPEC_SUPPLEMENT_FORMAT = 'prism3-spec-supplement/0.1';
/** The defs that get a supplement. The first slice is Button only (Q2996.4). */
export const SUPPLEMENT_DEFS = ['button'] as const;
/** The `$extensions` key everything Prism3 adds sits under: reverse-domain, as Spectacular asks, and the key the Specs
 *  projection (`component-defs-export.ts`) already uses. */
export const EXT = 'com.prism3';

/** A token's names: the DTCG path (`pds3.space.200`), the shipped CSS custom property (`--pds3-space-200`), and its path in
 *  the design file as Spectacular prints it, when the file holds one. */
export type TokenName = { dtcg: string; css: string; figma?: string };
/** Resolves a contract token ref (`space.200`, `type.label.md.emphasis`) to its names in the house brand. */
export type TokenNames = (ref: string) => TokenName;

type Json = Record<string, unknown>;

/** Spectacular's `keys: CAMEL`: words split on anything that is not a letter or digit, the first kept as written with its
 *  first letter lowered, each later one capitalized. A name that is already camelCase (`leadingVisual`) is one word. */
export const camelKey = (figmaName: string): string => {
  const words = figmaName.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1))).join('');
};

const leaf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const sortKeys = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => localeFreeCompare(a, b)));

/** Every token the spec binds on each part, by part path: colors, the text style, and geometry (corner, stroke, spacing,
 *  size). The focus ring's tokens and the motion bindings are separate blocks, as the spec model keeps them. */
const partTokens = (spec: ComponentSpec): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();
  const add = (part: string, ref: string | undefined) => {
    if (!ref) return;
    if (!out.has(part)) out.set(part, new Set());
    out.get(part)!.add(ref);
  };
  for (const r of spec.colors) for (const p of r.parts) { add(p.part, p.fill); add(p.part, p.stroke); add(p.part, p.ink); add(p.part, p.icon); }
  for (const r of spec.type) for (const p of r.parts) add(p.part, p.textStyle);
  for (const r of spec.redlines) for (const p of r.parts) for (const v of Object.values(p.values)) if (v && 'token' in v) add(p.part, v.token);
  return out;
};

const named = (names: TokenNames, ref: string): Json => {
  const n = names(ref);
  return { dtcg: n.dtcg, css: n.css, ...(n.figma ? { figma: n.figma } : {}) };
};

/** The supplement for one def. Throws when a part or property the def projects cannot be keyed, rather than writing a
 *  supplement that silently misses it. */
export const specSupplement = (def: ComponentDef, names: TokenNames): Json => {
  const fp = def.figmaProperties;
  const anatomyDef = def.anatomy;
  if (!fp || !anatomyDef) throw new Error(`spec supplement: ${def.id} has no figmaProperties or anatomy, so the design file does not build it`);
  const shipped = projectDef(def);
  const spec = componentSpec(def);

  // ---- anatomy: every part the plans build, keyed by Spectacular's element name --------------------------------------
  const elementKey = (path: string) => (leaf(path) === anatomyDef.root ? 'root' : camelKey(leaf(path)));
  const tokensOf = partTokens(spec);
  const ringOf = new Map((spec.focusRing ?? []).map((f) => [f.part, f]));
  const anatomy: Json = {};
  for (const a of spec.anatomy) {
    const key = elementKey(a.part);
    if (anatomy[key]) throw new Error(`spec supplement: ${def.id} has two parts named "${key}"`);
    const part = anatomyDef.parts[leaf(a.part)];
    const tokens: Json = {};
    const codeOnlyTokens: Json[] = [];
    for (const ref of [...(tokensOf.get(a.part) ?? [])].sort(localeFreeCompare)) {
      const n = names(ref);
      if (n.figma) tokens[n.figma] = { dtcg: n.dtcg, css: n.css };
      else codeOnlyTokens.push({ dtcg: n.dtcg, css: n.css });
    }
    const ring = ringOf.get(a.part);
    anatomy[key] = {
      $extensions: {
        [EXT]: {
          part: leaf(a.part),
          ...(part?.mirror ? { rtl: part.mirror } : {}),
          ...(Object.keys(tokens).length ? { tokens: sortKeys(tokens) } : {}),
          ...(codeOnlyTokens.length ? { codeOnlyTokens } : {}),
          ...(ring ? { focusRing: { offset: named(names, ring.offset), width: named(names, ring.width), style: named(names, ring.style) } } : {}),
        },
      },
    };
  }

  // ---- props: every Figma component property the def projects, keyed by Spectacular's prop name ---------------------
  const codeProps = new Set(def.props.map((p) => p.name));
  const kindOf = (axis: string) => (shipped.variants as Record<string, { kind: string }>)[axis]?.kind;
  const props: Json = {};
  const mapped = new Set<string>();
  const put = (figmaName: string, entry: Json) => {
    const key = camelKey(figmaName);
    if (props[key]) throw new Error(`spec supplement: ${def.id} has two Figma properties keyed "${key}"`);
    props[key] = { $extensions: { [EXT]: { ...(figmaName === key ? {} : { figmaName }), ...entry } } };
  };
  for (const a of spec.axes) {
    if (a.kind === 'state') {
      // Q2996.6 A: which code prop drives which state is not authored, so none is claimed here.
      // The state values themselves are Spectacular's (`enum`); the full list, code-only ones included, is `behavior.states`.
      put(a.figmaName, spec.codeOnlyStates.length ? { codeOnlyStates: [...spec.codeOnlyStates] } : {});
    } else if (a.kind === 'slot') {
      const slot = (fp.slotAxes ?? []).find((s) => s.name === a.name);
      if (!slot) throw new Error(`spec supplement: ${def.id} axis "${a.name}" is a slot axis with no figmaProperties.slotAxes entry`);
      if (codeProps.has(slot.part)) mapped.add(slot.part);
      put(a.figmaName, { ...(codeProps.has(slot.part) ? { codeProp: slot.part } : {}), part: slot.part, controls: 'presence' });
    } else {
      if (codeProps.has(a.name)) mapped.add(a.name);
      put(a.figmaName, { ...(codeProps.has(a.name) ? { codeProp: a.name } : {}), ...(kindOf(a.name) ? { axisKind: kindOf(a.name) } : {}) });
    }
  }
  for (const p of spec.properties) {
    if (p.type === 'TEXT') {
      const [name, t] = Object.entries(fp.texts ?? {}).find(([n]) => n === p.name) ?? [];
      if (!name || !t) throw new Error(`spec supplement: ${def.id} text property "${p.name}" has no figmaProperties.texts entry`);
      if (codeProps.has(name)) mapped.add(name);
      put(p.name, { ...(codeProps.has(name) ? { codeProp: name } : {}), part: t.part });
    } else if (p.type === 'INSTANCE_SWAP') {
      const [name, s] = Object.entries(fp.swaps ?? {}).find(([, v]) => v.figmaName === p.name) ?? [];
      if (!name || !s) throw new Error(`spec supplement: ${def.id} swap property "${p.name}" has no figmaProperties.swaps entry`);
      if (codeProps.has(name)) mapped.add(name);
      put(p.name, { ...(codeProps.has(name) ? { codeProp: name } : {}), part: s.part, controls: 'content' });
    } else {
      throw new Error(`spec supplement: ${def.id} property "${p.name}" is a ${p.type}, which this slice does not key yet`);
    }
  }

  // ---- the component's own block: what no element or Figma property can carry ---------------------------------------
  const a11y = shipped.accessibility as Record<string, unknown>;
  const projected = new Set(spec.axes.map((a) => a.name));
  const hitTarget: Json = {};
  for (const [key, ref] of Object.entries(def.tokens ?? {})) {
    const m = /^size\.([^.]+)\.hit-target$/.exec(key);
    if (m) hitTarget[m[1]] = named(names, ref);
  }
  const codeOnlyProps = shipped.props.filter((p) => !mapped.has(p.name)).map((p) => ({
    name: p.name, type: p.type, ...(p.default === undefined ? {} : { default: p.default }), required: p.required, description: p.description,
  }));
  const codeOnlyAxes = Object.entries(shipped.variants as Record<string, { values: string[]; kind: string }>)
    .filter(([axis]) => !projected.has(axis))
    .map(([axis, v]) => ({ name: axis, values: [...v.values], axisKind: v.kind }));
  const motionProse = shipped.motion as Record<string, string> | undefined;
  const motionTokens: Json = {};
  for (const [binding, ref] of Object.entries(spec.motion ?? {})) motionTokens[binding] = named(names, ref);

  return {
    title: def.id,
    anatomy,
    props,
    $extensions: {
      [EXT]: {
        format: SPEC_SUPPLEMENT_FORMAT,
        component: def.id,
        name: def.name,
        accessibility: {
          ...(a11y.role ? { role: a11y.role } : {}),
          ...(a11y.keyboard ? { keyboard: a11y.keyboard } : {}),
          ...(a11y.focus ? { focus: a11y.focus } : {}),
          ...(a11y.aria ? { aria: a11y.aria } : {}),
          ...(Array.isArray(a11y.wcag) && a11y.wcag.length ? { wcag: [...a11y.wcag] } : {}),
          ...(Object.keys(hitTarget).length ? { hitTarget } : {}),
        },
        behavior: {
          states: [...def.states],
          ...(spec.codeOnlyStates.length ? { codeOnlyStates: [...spec.codeOnlyStates] } : {}),
          codeOnlyProps,
          ...(codeOnlyAxes.length ? { codeOnlyAxes } : {}),
          syncBoundary: shipped.syncBoundary,
        },
        ...(motionProse || Object.keys(motionTokens).length ? {
          motion: { ...(motionProse ?? {}), ...(Object.keys(motionTokens).length ? { tokens: motionTokens } : {}) },
        } : {}),
      },
    },
  };
};

// ---- YAML ---------------------------------------------------------------------------------------------------------

const RESERVED = /^(?:true|false|null|yes|no|on|off|y|n|~)$/i;
/** A string written bare when YAML reads it back as the same string, quoted (JSON's double-quoted form, which YAML
 *  reads) otherwise. Keys and values follow the same rule. */
const scalar = (s: string): string =>
  /^[A-Za-z_$][A-Za-z0-9_$./-]*$/.test(s) && !RESERVED.test(s) ? s : JSON.stringify(s);
const value = (v: unknown): string =>
  v === null ? 'null' : typeof v === 'string' ? scalar(v) : typeof v === 'number' || typeof v === 'boolean' ? String(v) : (() => { throw new Error(`toYaml: ${typeof v}`); })();
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const empty = (v: unknown) => (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length);

/** Block YAML, two-space indent, the shape Spectacular writes: a map's entries in insertion order, a list's items as
 *  `- `, an empty list or map inline (`[]`, `{}`). */
export const toYaml = (root: unknown): string => {
  const lines: string[] = [];
  const emit = (v: unknown, indent: string): void => {
    if (isObj(v)) {
      for (const [k, x] of Object.entries(v)) {
        if (empty(x)) lines.push(`${indent}${scalar(k)}: ${Array.isArray(x) ? '[]' : '{}'}`);
        else if (isObj(x) || Array.isArray(x)) { lines.push(`${indent}${scalar(k)}:`); emit(x, indent + '  '); }
        else lines.push(`${indent}${scalar(k)}: ${value(x)}`);
      }
    } else if (Array.isArray(v)) {
      for (const x of v) {
        if (isObj(x) && !empty(x)) {
          const start = lines.length;
          emit(x, indent + '  ');
          lines[start] = `${indent}- ${lines[start].slice(indent.length + 2)}`;
        } else if (Array.isArray(x) && !empty(x)) throw new Error('toYaml: a list inside a list');
        else lines.push(`${indent}- ${empty(x) ? (Array.isArray(x) ? '[]' : '{}') : value(x)}`);
      }
    } else throw new Error('toYaml: the root must be a map or a list');
  };
  emit(root, '');
  return lines.join('\n') + '\n';
};
