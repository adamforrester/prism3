/**
 * ADAPTER — `out/figma/<brand>/*.json`  ->  the Figma objects TokenPress's scanner returns.
 *
 * This is half of the comparison harness (#697's "Verify" bullet: theme a file, export both ways,
 * diff the trees). It exists so TokenPress's REAL exporter can run over a REAL prism3 brand with
 * neither side modified.
 *
 * ── WHY AN ADAPTER IS NEEDED AT ALL, AND WHY THAT IS THE FINDING ─────────────────────────────────
 *
 * `TokenExporter` has no seam to pass tokens in at: `exportToZip` constructs a `TokenScanner` and
 * calls `scanAll()` as step one. So the only way to feed it anything is to BE the Figma API. That is
 * #703's measurement restated as executable code — the exporter's input type is Figma's object model,
 * not a token tree, and this file is the price of that.
 *
 * The SPEC for the shapes below is TokenPress's own test fixtures, not the Figma docs: what matters is
 * the subset the exporter actually reads. `tests/unit/namespace-exporter-integration.test.ts` fixes
 * the `Variable` shape (`id`, `name`, `resolvedType`, `valuesByMode`, `scopes`, `description`,
 * `variableCollectionId`) and the `VariableCollection` shape (`id`, `name`, `defaultModeId`,
 * `modes[{modeId,name}]`); `tests/unit/typography-float-noise.test.ts` fixes `TextStyle`;
 * `tests/unit/shadow-converter.test.ts` fixes `EffectStyle`.
 *
 * ── THE FOUR WORKAROUNDS, EACH A MEASUREMENT ─────────────────────────────────────────────────────
 *
 * Per the task's rule that a needed workaround is a finding rather than something to bury: these are
 * the four places prism3's Figma emission and TokenPress's input model genuinely disagree. None is
 * fixed on either side. Each is reported by `report()` below so the harness cannot quietly rely on
 * one without saying so.
 *
 *   W1. ALIASES ARE BY NAME, IDS ARE INVENTED HERE.
 *       prism3 emits `alias: {type:'VARIABLE_ALIAS', name:'palette/white'}` — a NAME, because the
 *       emission is a spec for a file that does not exist yet, so no Figma id exists to reference.
 *       TokenPress resolves aliases through `variableMap: Map<string, Variable>` keyed by `v.id`.
 *       So this adapter mints a synthetic id per variable and rewrites every alias name to that id.
 *       Measured safe, not assumed: variable names are globally unique across all collections in
 *       both brands (0 collisions), and all 727 nb / 731 aurora alias targets resolve to a known
 *       name. If either were false the mapping would be ambiguous and this adapter could not exist.
 *
 *   W2. THE MODE AXIS HAS TO BE REASSEMBLED FROM FILENAMES.
 *       prism3 writes ONE FILE PER (collection, mode) — `color.light.json`, `color.dark.json`, … —
 *       each a standalone `{$collection,$mode,variables[]}` with the mode's own value inlined.
 *       Figma's model is the transpose: ONE variable carrying `valuesByMode[modeId]` for every mode.
 *       So per-mode files must be joined per variable name. This is exactly #697's three-axis
 *       problem in executable form, and the join is only well-defined because every mode file of a
 *       collection carries the IDENTICAL variable name-set (asserted below, not hoped for).
 *
 *   W3. THREE "COLLECTIONS" ARE NOT VARIABLE COLLECTIONS AT ALL.
 *       `text-styles.json`, `shadow-styles.json` and `gradient-styles.json` have no `variables[]` —
 *       they carry `styles[]`, and they are prism3's spec for Figma STYLES, which reach TokenPress
 *       through `getLocalTextStylesAsync` / `getLocalEffectStylesAsync` instead. text-styles and
 *       shadow-styles are adapted into those two channels. GRADIENTS HAVE NO CHANNEL — Figma paint
 *       styles are not variables and not effect styles, and TokenPress's scanner never asks for
 *       them. aurora's 2 gradients are therefore unreachable by this exporter, which is reported
 *       rather than worked around.
 *
 *   W4. TEXT STYLES REFERENCE BOUND VARIABLES BY NAME, VIA A DIFFERENT SHAPE.
 *       prism3 writes `properties.fontSize = {bound:true, variable:'font-fluid/…', collection:…}`.
 *       Figma's `TextStyle` carries flat resolved properties (`fontSize`, `fontName`, `lineHeight`,
 *       `letterSpacing`) PLUS a separate `boundVariables` map of `{type:'VARIABLE_ALIAS', id}`.
 *       So a bound property must be split in two: the resolved value is looked up from the variable
 *       it points at, and the binding is re-expressed as an id alias.
 *
 * NOTHING HERE CHANGES EITHER EXPORTER. This file only translates, and every translation it performs
 * is counted and printed.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ---- the Figma-shaped output types, as narrow as the exporter's actual reads -------------------

export type FigmaRGBA = { r: number; g: number; b: number; a?: number };
export type FigmaAlias = { type: 'VARIABLE_ALIAS'; id: string };

export type AdaptedVariable = {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, unknown>;
  scopes: string[];
  description: string;
  variableCollectionId: string;
  hiddenFromPublishing: boolean;
  codeSyntax?: Record<string, string>;
};

export type AdaptedCollection = {
  id: string;
  name: string;
  defaultModeId: string;
  modes: { modeId: string; name: string }[];
  hiddenFromPublishing: boolean;
};

export type AdaptedTextStyle = {
  id: string;
  name: string;
  description: string;
  fontName: { family: string; style: string };
  fontSize: number;
  letterSpacing: { value: number; unit: 'PIXELS' | 'PERCENT' };
  lineHeight: { value: number; unit: 'PIXELS' | 'PERCENT' } | { unit: 'AUTO' };
  textCase: string;
  textDecoration: string;
  boundVariables: Record<string, FigmaAlias>;
};

export type AdaptedEffectStyle = {
  id: string;
  name: string;
  description: string;
  effects: unknown[];
};

/** Everything `scanAll()` returns, plus the measurements the adaptation forced. */
export type Adapted = {
  collections: AdaptedCollection[];
  variables: AdaptedVariable[];
  textStyles: AdaptedTextStyle[];
  effectStyles: AdaptedEffectStyle[];
  notes: AdaptationNotes;
};

export type AdaptationNotes = {
  brand: string;
  /** collection name -> the mode names joined into it (W2). */
  modeAxes: Record<string, string[]>;
  /** How many aliases were rewritten from a name to a synthetic id (W1). */
  aliasesRebound: number;
  /** Alias names with no matching variable — must be 0 or the mapping is ambiguous (W1). */
  unresolvedAliasNames: string[];
  /** Variable names appearing in >1 collection — must be 0 for W1 to be sound. */
  duplicateVariableNames: string[];
  /** Style collections routed to a non-variable channel, or dropped entirely (W3). */
  styleChannels: { collection: string; channel: string; count: number }[];
  /** Text-style properties split into resolved-value + boundVariables (W4). */
  textStyleBindingsSplit: number;
  /** Text-style bindings whose target variable was not found (should be 0). */
  textStyleBindingsUnresolved: string[];
};

// ---- reading the emission ----------------------------------------------------------------------

type EmissionVariable = {
  name: string;
  resolvedType: AdaptedVariable['resolvedType'];
  scopes?: string[];
  description?: string;
  value: unknown;
  alias?: { type: 'VARIABLE_ALIAS'; name: string };
  hiddenFromPublishing?: boolean;
  codeSyntax?: Record<string, string>;
};

type EmissionFile = {
  $collection: string;
  $mode?: string;
  variables?: EmissionVariable[];
  styles?: Record<string, unknown>[];
};

const readEmission = (dir: string): EmissionFile[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as EmissionFile);

/** Figma's own default mode is named "Mode 1"; prism3 writes "Default" for single-mode collections.
 *  Kept verbatim — renaming it would be adapting the SOURCE to flatter the comparison. */
const modeIdFor = (collection: string, mode: string) => `mode:${collection}:${mode}`;
const collectionIdFor = (collection: string) => `coll:${collection}`;
const variableIdFor = (name: string) => `var:${name}`;

// ---- W2: join the per-mode files -----------------------------------------------------------------

/** Groups emission files by collection, preserving the mode order the directory listing gives (which
 *  is alphabetical — deliberately NOT reordered to match prism3's own axis order, because Figma has
 *  no notion of a canonical mode order beyond `defaultModeId`, and inventing one here would hide
 *  the very ambiguity #697 is about). */
const groupByCollection = (files: EmissionFile[]): Map<string, EmissionFile[]> => {
  const out = new Map<string, EmissionFile[]>();
  for (const f of files) {
    const list = out.get(f.$collection) ?? [];
    list.push(f);
    out.set(f.$collection, list);
  }
  return out;
};

export const adaptBrand = (brand: string, figmaDir: string): Adapted => {
  const files = readEmission(figmaDir);
  const grouped = groupByCollection(files);

  const collections: AdaptedCollection[] = [];
  const variables: AdaptedVariable[] = [];
  const notes: AdaptationNotes = {
    brand,
    modeAxes: {},
    aliasesRebound: 0,
    unresolvedAliasNames: [],
    duplicateVariableNames: [],
    styleChannels: [],
    textStyleBindingsSplit: 0,
    textStyleBindingsUnresolved: [],
  };

  // W3 — separate the style "collections" from the variable collections.
  const styleFiles: EmissionFile[] = [];
  const varGroups = new Map<string, EmissionFile[]>();
  for (const [name, group] of grouped) {
    if (group.every((f) => !f.variables)) {
      styleFiles.push(...group);
    } else {
      varGroups.set(name, group);
    }
  }

  // Which collection each variable name belongs to — and W1's soundness check.
  const nameToCollection = new Map<string, Set<string>>();
  for (const [collName, group] of varGroups) {
    for (const f of group) {
      for (const v of f.variables ?? []) {
        const set = nameToCollection.get(v.name) ?? new Set<string>();
        set.add(collName);
        nameToCollection.set(v.name, set);
      }
    }
  }
  notes.duplicateVariableNames = [...nameToCollection.entries()]
    .filter(([, s]) => s.size > 1)
    .map(([n]) => n)
    .sort();

  const knownNames = new Set(nameToCollection.keys());

  for (const [collName, group] of [...varGroups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const modeNames = group.map((f) => f.$mode ?? 'Default');
    notes.modeAxes[collName] = modeNames;

    const collectionId = collectionIdFor(collName);
    collections.push({
      id: collectionId,
      name: collName,
      defaultModeId: modeIdFor(collName, modeNames[0]),
      modes: modeNames.map((m) => ({ modeId: modeIdFor(collName, m), name: m })),
      hiddenFromPublishing: false,
    });

    // W2 — transpose: one Variable per NAME, carrying every mode's value.
    const byName = new Map<string, AdaptedVariable>();
    for (const f of group) {
      const modeId = modeIdFor(collName, f.$mode ?? 'Default');
      for (const v of f.variables ?? []) {
        let adapted = byName.get(v.name);
        if (!adapted) {
          adapted = {
            id: variableIdFor(v.name),
            name: v.name,
            resolvedType: v.resolvedType,
            valuesByMode: {},
            scopes: v.scopes ?? [],
            description: v.description ?? '',
            variableCollectionId: collectionId,
            hiddenFromPublishing: v.hiddenFromPublishing ?? false,
          };
          if (v.codeSyntax) adapted.codeSyntax = v.codeSyntax;
          byName.set(v.name, adapted);
        }

        // W1 — an alias by NAME becomes an alias by synthetic ID.
        if (v.alias) {
          if (!knownNames.has(v.alias.name)) {
            notes.unresolvedAliasNames.push(`${v.name} -> ${v.alias.name}`);
            // Emit the raw name as the id: the exporter's own broken-alias path then reports it,
            // which is the honest outcome. Silently dropping it would hide a real disagreement.
            adapted.valuesByMode[modeId] = { type: 'VARIABLE_ALIAS', id: v.alias.name };
          } else {
            adapted.valuesByMode[modeId] = {
              type: 'VARIABLE_ALIAS',
              id: variableIdFor(v.alias.name),
            };
            notes.aliasesRebound++;
          }
        } else {
          adapted.valuesByMode[modeId] = v.value;
        }
      }
    }
    variables.push(...byName.values());
  }

  // W3 + W4 — the style channels.
  const { textStyles, effectStyles } = adaptStyles(styleFiles, variables, notes);

  return { collections, variables, textStyles, effectStyles, notes };
};

// ---- W3/W4: styles -------------------------------------------------------------------------------

type EmissionTextStyle = {
  name: string;
  description?: string;
  properties: Record<string, { bound?: boolean; variable?: string; value?: unknown; bindable?: boolean }>;
};

type EmissionEffectStyle = { name: string; description?: string; effects: unknown[] };

/** Reads the first mode's value off an adapted variable — the resolved number/string a Figma text
 *  style would show for a bound property. Figma resolves a binding against the mode of the node the
 *  style is applied to; a STYLE has no node, so there is no single right answer. Taking the first
 *  mode is a decision, and it is reported (see `textStyleBindingsSplit`) rather than hidden: for
 *  `type-sets` that means DESKTOP wins and mobile's values never reach the typography file at all. */
const firstModeValue = (v: AdaptedVariable, byId: Map<string, AdaptedVariable>): unknown => {
  let cur: AdaptedVariable | undefined = v;
  for (let hop = 0; hop < 10 && cur; hop++) {
    const keys = Object.keys(cur.valuesByMode);
    if (!keys.length) return undefined;
    const val = cur.valuesByMode[keys[0]];
    if (val && typeof val === 'object' && (val as FigmaAlias).type === 'VARIABLE_ALIAS') {
      cur = byId.get((val as FigmaAlias).id);
      continue;
    }
    return val;
  }
  return undefined;
};

const adaptStyles = (
  styleFiles: EmissionFile[],
  variables: AdaptedVariable[],
  notes: AdaptationNotes
): { textStyles: AdaptedTextStyle[]; effectStyles: AdaptedEffectStyle[] } => {
  const byName = new Map(variables.map((v) => [v.name, v]));
  const byId = new Map(variables.map((v) => [v.id, v]));
  const textStyles: AdaptedTextStyle[] = [];
  const effectStyles: AdaptedEffectStyle[] = [];

  for (const f of styleFiles) {
    const styles = f.styles ?? [];

    if (f.$collection === 'text-styles') {
      notes.styleChannels.push({
        collection: f.$collection,
        channel: 'getLocalTextStylesAsync',
        count: styles.length,
      });
      for (const s of styles as unknown as EmissionTextStyle[]) {
        textStyles.push(adaptTextStyle(s, byName, byId, notes));
      }
      continue;
    }

    if (f.$collection === 'shadow-styles') {
      notes.styleChannels.push({
        collection: f.$collection,
        channel: 'getLocalEffectStylesAsync',
        count: styles.length,
      });
      for (const s of styles as unknown as EmissionEffectStyle[]) {
        effectStyles.push({
          id: `style:${s.name}`,
          name: s.name,
          description: s.description ?? '',
          effects: s.effects,
        });
      }
      continue;
    }

    // W3 — gradients. Figma paint styles are neither variables nor effect styles, and TokenPress's
    // scanner has no call that would return them. Not adapted, and not silently omitted either.
    notes.styleChannels.push({
      collection: f.$collection,
      channel: 'NONE — no scanner channel exists for paint styles',
      count: styles.length,
    });
  }

  return { textStyles, effectStyles };
};

/** Figma line-height / letter-spacing property shapes, as the converters read them. */
const asLineHeight = (raw: unknown): AdaptedTextStyle['lineHeight'] => {
  if (raw && typeof raw === 'object' && 'unit' in (raw as Record<string, unknown>)) {
    const o = raw as { unit: string; value?: number };
    if (o.unit === 'AUTO') return { unit: 'AUTO' };
    return { value: o.value ?? 0, unit: o.unit === 'PERCENT' ? 'PERCENT' : 'PIXELS' };
  }
  if (typeof raw === 'number') return { value: raw, unit: 'PIXELS' };
  return { unit: 'AUTO' };
};

const asLetterSpacing = (raw: unknown): AdaptedTextStyle['letterSpacing'] => {
  if (raw && typeof raw === 'object' && 'unit' in (raw as Record<string, unknown>)) {
    const o = raw as { unit: string; value?: number };
    return { value: o.value ?? 0, unit: o.unit === 'PERCENT' ? 'PERCENT' : 'PIXELS' };
  }
  if (typeof raw === 'number') return { value: raw, unit: 'PIXELS' };
  return { value: 0, unit: 'PIXELS' };
};

const adaptTextStyle = (
  s: EmissionTextStyle,
  byName: Map<string, AdaptedVariable>,
  byId: Map<string, AdaptedVariable>,
  notes: AdaptationNotes
): AdaptedTextStyle => {
  const boundVariables: Record<string, FigmaAlias> = {};
  const resolved: Record<string, unknown> = {};

  for (const [prop, spec] of Object.entries(s.properties ?? {})) {
    if (spec.bound && spec.variable) {
      // W4 — one prism3 property becomes a binding AND a resolved value.
      const target = byName.get(spec.variable);
      if (!target) {
        notes.textStyleBindingsUnresolved.push(`${s.name}.${prop} -> ${spec.variable}`);
        continue;
      }
      boundVariables[prop] = { type: 'VARIABLE_ALIAS', id: target.id };
      resolved[prop] = firstModeValue(target, byId);
      notes.textStyleBindingsSplit++;
    } else {
      resolved[prop] = spec.value;
    }
  }

  const family = typeof resolved.fontFamily === 'string' ? resolved.fontFamily : 'Inter';
  const style = typeof resolved.fontStyle === 'string' ? resolved.fontStyle : 'Regular';

  return {
    id: `style:${s.name}`,
    name: s.name,
    description: s.description ?? '',
    fontName: { family, style },
    fontSize: typeof resolved.fontSize === 'number' ? resolved.fontSize : 16,
    letterSpacing: asLetterSpacing(resolved.letterSpacing),
    lineHeight: asLineHeight(resolved.lineHeight),
    textCase: typeof resolved.textCase === 'string' ? resolved.textCase : 'ORIGINAL',
    textDecoration: typeof resolved.textDecoration === 'string' ? resolved.textDecoration : 'NONE',
    boundVariables,
  };
};

/** Asserts the properties W1 and W2 need in order to be sound. Throws rather than warning: if a name
 *  collides or a mode file disagrees, the adaptation is AMBIGUOUS and any diff computed from it would
 *  be measuring the adapter, not the exporters. */
export const assertAdaptable = (a: Adapted): void => {
  if (a.notes.duplicateVariableNames.length) {
    throw new Error(
      `W1 unsound: ${a.notes.duplicateVariableNames.length} variable name(s) appear in more than one ` +
        `collection, so a name cannot be mapped to one id: ${a.notes.duplicateVariableNames.slice(0, 5).join(', ')}`
    );
  }
  for (const c of a.collections) {
    const vars = a.variables.filter((v) => v.variableCollectionId === c.id);
    const missing = vars.filter((v) => Object.keys(v.valuesByMode).length !== c.modes.length);
    if (missing.length) {
      throw new Error(
        `W2 unsound: in collection "${c.name}" (${c.modes.length} modes), ${missing.length} variable(s) ` +
          `lack a value in every mode — e.g. ${missing[0].name} has ${Object.keys(missing[0].valuesByMode).length}. ` +
          `The per-mode join is only well-defined when every mode file carries the same name-set.`
      );
    }
  }
};
