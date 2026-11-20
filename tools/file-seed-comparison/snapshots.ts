/**
 * The repo-derived half of the #2075 part 2 test set: plain-data `FactsSnapshot`s built from what the repo already
 * holds, so the comparison runs with no Figma at all.
 *
 *   · `reference-brand` — the reference brand's legacy Figma variable export, `reference/New Balance/tokens/raw-figma/`.
 *   · `prism2`          — Prism 2's Figma variable export, `reference/Prism2/tokens/raw-figma/`.
 *   · `emission-prism3` — the engine's own Figma emission for the default theme, `packages/engine/out/figma/prism3/`.
 *   · `emission-aurora` — the same for the maximal example brand, `packages/engine/out/figma/aurora/`.
 *
 * All four are VARIABLES (and, for the emissions, TEXT STYLES) with no pages: a variable export carries no layers, so
 * their reports have empty `usage` and the interpreter reads names and alias structure only. The rows that exercise
 * the usage path are the external files (`rows.ts`, pending), which only a real Figma file can give.
 *
 * THE CONVERSION, one rule per field, nothing inferred:
 *   · Each JSON file is one collection in one mode (`$collection`, `$mode`); files sharing a `$collection` are its
 *     modes. The DEFAULT mode is the first of `light`, `Default`, `desktop`, `Mode 1` the collection has, else the
 *     first by name: Figma's default is the mode a file's author put first, which an export does not record, so this
 *     is the stated stand-in.
 *   · A variable's id is its export id when it has one (`VariableID:…`), else `name:<variable name>`; an alias names
 *     its target by id (the reference exports) or by name (the emission), and both resolve to that id.
 *   · A text style's family and style are read through its bound variables in their default modes, else its raw
 *     value. Paint, effect and grid styles are not carried: the interpreter reads none of them from an export.
 */
import { localeFreeCompare } from '../../packages/engine/locale-free-order';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FactsCollection, FactsSnapshot, FactsStyle, FactsVariable } from '../../packages/engine/file-facts';

type ExportVar = {
  id?: string; name: string; resolvedType: string; scopes?: string[]; description?: string; hiddenFromPublishing?: boolean;
  value: unknown; alias: { id?: string; name?: string } | null;
};
type ExportFile = { $collection: string; $mode?: string; variables?: ExportVar[]; styles?: ExportStyle[] };
type ExportStyle = { name: string; description?: string; properties?: Record<string, { bound?: boolean; variable?: string; value?: unknown }> };

const DEFAULT_MODE_ORDER = ['light', 'Default', 'desktop', 'Mode 1'];

export const snapshotFromExport = (dir: string): FactsSnapshot => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as ExportFile);
  const varFiles = files.filter((f) => Array.isArray(f.variables));
  const idOf = (v: { id?: string; name: string }): string => v.id ?? `name:${v.name}`;
  const byName = new Map<string, string>();
  for (const f of varFiles) for (const v of f.variables!) byName.set(v.name, idOf(v));

  const collections = new Map<string, FactsCollection & { modes: { modeId: string; name: string }[] }>();
  const variables = new Map<string, FactsVariable & { valuesByMode: Record<string, unknown> }>();
  for (const f of varFiles) {
    const cid = `collection:${f.$collection}`;
    const mode = f.$mode ?? 'Default';
    const modeId = `${cid}:${mode}`;
    const c = collections.get(cid) ?? { id: cid, name: f.$collection, modes: [] };
    if (!c.modes.some((m) => m.modeId === modeId)) c.modes.push({ modeId, name: mode });
    collections.set(cid, c);
    for (const v of f.variables!) {
      const id = idOf(v);
      const target = v.alias ? (v.alias.id ?? (v.alias.name ? byName.get(v.alias.name) : undefined)) : undefined;
      const value = v.alias && target ? { type: 'VARIABLE_ALIAS', id: target } : v.value;
      const row = variables.get(id) ?? {
        id, name: v.name, variableCollectionId: cid, resolvedType: v.resolvedType, valuesByMode: {},
        scopes: v.scopes ?? [], description: v.description ?? '', hiddenFromPublishing: !!v.hiddenFromPublishing,
      };
      row.valuesByMode[modeId] = value;
      variables.set(id, row);
    }
  }
  for (const c of collections.values()) {
    c.modes.sort((a, b) => localeFreeCompare(a.name, b.name));
    const pick = DEFAULT_MODE_ORDER.map((n) => c.modes.find((m) => m.name === n)).find(Boolean) ?? c.modes[0];
    c.modes = [pick, ...c.modes.filter((m) => m !== pick)];
    c.defaultModeId = pick.modeId;
  }

  // A variable's value in its collection's default mode, following aliases (a text style's family is bound).
  const resolve = (id: string | undefined, seen = new Set<string>()): unknown => {
    if (!id || seen.has(id)) return null;
    seen.add(id);
    const v = variables.get(id);
    if (!v) return null;
    const val = v.valuesByMode[collections.get(v.variableCollectionId)!.defaultModeId!];
    return val && typeof val === 'object' && (val as { type?: string }).type === 'VARIABLE_ALIAS' ? resolve((val as { id: string }).id, seen) : val;
  };
  const text: FactsStyle[] = files.filter((f) => f.$collection === 'text-styles').flatMap((f) => f.styles ?? []).map((s) => {
    const prop = (k: string): unknown => {
      const p = s.properties?.[k];
      return p?.bound ? resolve(p.variable ? byName.get(p.variable) : undefined) : p?.value ?? null;
    };
    const family = prop('fontFamily');
    const style = prop('fontStyle');
    const size = prop('fontSize');
    return {
      id: `style:${s.name}`, name: s.name, description: s.description ?? '',
      ...(typeof family === 'string' ? { fontName: { family, style: typeof style === 'string' ? style : 'Regular' } } : {}),
      ...(typeof size === 'number' ? { fontSize: size } : {}),
    };
  });
  return {
    collections: [...collections.values()], variables: [...variables.values()], pages: [],
    styles: { paint: [], text, effect: [], grid: [] },
  };
};
