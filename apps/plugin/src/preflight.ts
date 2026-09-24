/**
 * Prism3 Figma plugin — the apply PRE-FLIGHT: the foreign-file safety floor (#506 case c).
 *
 * Every write executor is find-by-name → reuse, so before this a file holding a collection, variable or
 * style that merely SHARED a name with Prism3's was adopted as if Prism3 had made it. Two failures
 * followed from that, and this module is the floor under both:
 *
 *   1. **A partial write.** A same-named variable of another type (a designer's FLOAT `…/primary` where
 *      Prism3 writes COLOR) throws at `setValueForMode`, partway through the passes. The passes mutate as
 *      they go and there is no undo, so the file was left half-themed.
 *   2. **A silent overwrite.** A same-named collection or style someone else made was taken over — its
 *      values replaced, its modes reconciled into Prism3's — with nothing said.
 *
 * THE RULE: read everything an apply will touch, BEFORE the first write, and if anything is incompatible
 * write NOTHING and report every conflict. `guardApply` is the one place that ordering lives; `main.ts`
 * hands it the whole write sequence (the rename pre-pass included — it renames collections, so it is a
 * write) as a callback it only calls on a clean pre-flight.
 *
 * ── PROVENANCE: WHAT "PRISM3 MADE THIS" MEANS HERE ─────────────────────────────────────────────────────
 *
 * No new marker. Each item is judged by the record Prism3 already writes on it:
 *
 *   · COLLECTION — the `modes:owned` shared-plugin-data stamp every apply writes since #1581
 *     (`ownedModeIds`). Present → Prism3's, reused exactly as before. Absent → someone else's.
 *   · STYLE — the engine's own description signature (#1577, `isEngineDescription`), the provenance the
 *     prune already reads. Engine-shaped → Prism3's. Anything else, including empty → someone else's.
 *   · VARIABLE — no marker of its own: it is judged by its collection, plus a `resolvedType` check against
 *     the type the plan writes, which is the conflict that throws.
 *
 * **THE LEGACY PRESUMPTION, and it is a deliberate deviation worth reviewing** — the same one
 * `stampOwnedModes` makes, for the same reason. A file Prism3 themed BEFORE #1581 carries no stamp on any
 * collection, and before the text-style description fix its text styles carried no description. Judged
 * strictly, every such file would read as foreign and refuse its own re-apply — the floor would break case
 * (a) to fix case (c). So when the file carries Prism3's persisted brand (`prism3/brandInput` on the root,
 * written only by a Prism3 apply since #131) AND no collection in it carries a #1581 stamp yet, same-named
 * items are presumed Prism3's: exactly today's behavior, frozen for files that predate the record. The
 * first apply that passes stamps every collection it writes, and from then on the presumption is off and
 * the strict rule holds. A file with neither record — the foreign case this exists for — is never presumed.
 * `resolvedType` is checked in every era; a type mismatch is a conflict whoever made the variable.
 * Reversing the presumption is one line — see `legacy` in `preflightApply`.
 *
 * Read-only by construction: the port has no create/set members, so a pre-flight that tried to write
 * would not compile.
 *
 * NOT covered, stated: a variable the rename pass would MIGRATE is checked under its current name only,
 * not the planned one it moves to (the rename map moves the engine's own names inside a collection this
 * check has already cleared, and a rename does not change a type); and a host limit on mode COUNT (a plan
 * tier's mode cap) is not knowable from the API before `addMode` hits it.
 */
import type { WritePlan, FloatCollectionPlan, VarCollectionPlan, StylesPlan, GridStylePlan, TextStylePlan } from '@prism3/engine/write-plan';
import { renameMap, validateRenameMap, planCollectionRenames, isRefusal, type RenameMap } from '@prism3/engine/rename-map';
import { CORE_COLLECTION } from '@prism3/engine/emit-figma-color';
import { ownedModeIds, type VarCollection } from './write-figma';
import { isEngineDescription, type StyleKind } from './prune-figma';

export type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

/** Everything an apply will touch, by name — the pre-flight's half of the plan. */
export type PreflightPlan = {
  variables: { collection: string; rows: { name: string; type: VarType }[] }[];
  styles: Record<StyleKind, string[]>;
};

/** The read-only slice of `figma` the pre-flight needs. The real `figma` satisfies each piece. */
export interface PreflightApi {
  getLocalVariableCollectionsAsync(): Promise<VarCollection[]>;
  getLocalVariablesAsync(): Promise<{ name: string; variableCollectionId: string; resolvedType: VarType }[]>;
  getLocalEffectStylesAsync(): Promise<{ name: string; description: string }[]>;
  getLocalPaintStylesAsync(): Promise<{ name: string; description: string }[]>;
  getLocalGridStylesAsync(): Promise<{ name: string; description: string }[]>;
  getLocalTextStylesAsync(): Promise<{ name: string; description: string }[]>;
  /** `figma.root` — read for the persisted brand only (the legacy presumption above). */
  root: { getSharedPluginData(namespace: string, key: string): string };
}

/** One incompatibility. `detail` says what differs, in plain words. */
export type Conflict = {
  kind: 'collection' | 'variable' | `${StyleKind} style`;
  name: string;
  detail: string;
};

/**
 * Assemble the pre-flight plan from the SAME plan objects the executors are handed, so the names checked
 * are the names written. Collection names mirror the executors': the palette slice lands in `core`, the
 * color create rows in `color` (hardcoded in `applyWritePlan`, since `plan.color` carries no name).
 */
export const preflightPlanOf = (p: {
  color: WritePlan;
  float: FloatCollectionPlan[];
  font: VarCollectionPlan[];
  styles: StylesPlan;
  grid: GridStylePlan;
  text: TextStylePlan;
}): PreflightPlan => ({
  variables: [
    { collection: CORE_COLLECTION, rows: p.color.palette.map((r) => ({ name: r.name, type: 'COLOR' as const })) },
    { collection: 'color', rows: p.color.color.create.map((r) => ({ name: r.name, type: 'COLOR' as const })) },
    ...p.float.map((c) => ({ collection: c.name, rows: c.create.map((r) => ({ name: r.name, type: 'FLOAT' as const })) })),
    ...p.font.map((c) => ({ collection: c.name, rows: c.rows.map((r) => ({ name: r.name, type: r.resolvedType })) })),
  ],
  styles: {
    effect: p.styles.effects.map((r) => r.name),
    paint: p.styles.paints.map((r) => r.name),
    grid: p.grid.map((r) => r.name),
    text: p.text.map((r) => r.name),
  },
});

/**
 * Which existing collection will carry each name once the rename pre-pass has run — `to → from`. Mirrors
 * `beginMigration`'s all-or-nothing rule: a statically-invalid map, or any refused outcome, renames
 * nothing. Pure: `planCollectionRenames` simulates against a name set and writes nothing.
 */
const collectionMoves = (names: string[], map: RenameMap): Map<string, string> => {
  if (validateRenameMap(map).length) return new Map();
  const planned = planCollectionRenames(names, map.collections);
  if (planned.some((o) => isRefusal(o.status))) return new Map();
  return new Map(planned.filter((o) => o.status === 'migrated').map((o) => [o.to, o.from] as const));
};

const STYLE_GETTERS: Record<StyleKind, (api: PreflightApi) => Promise<{ name: string; description: string }[]>> = {
  effect: (api) => api.getLocalEffectStylesAsync(),
  paint: (api) => api.getLocalPaintStylesAsync(),
  grid: (api) => api.getLocalGridStylesAsync(),
  text: (api) => api.getLocalTextStylesAsync(),
};

/**
 * Every conflict between the file and what an apply would write — `[]` means safe to write. READ-ONLY.
 * Reports ALL conflicts rather than the first, so a designer sees the whole list in one pass.
 */
export const preflightApply = async (
  plan: PreflightPlan,
  api: PreflightApi,
  map: RenameMap = renameMap(),
): Promise<Conflict[]> => {
  const conflicts: Conflict[] = [];
  const collections = await api.getLocalVariableCollectionsAsync();
  const stamped = (c: VarCollection): boolean => ownedModeIds(c).length > 0;
  // The legacy presumption — see the header. `prism3`/`brandInput` is `persist-figma.ts`'s NS/KEY, spelled
  // here rather than imported so this module does not pull the persist core into the read path.
  let rootBrand = '';
  try { rootBrand = api.root.getSharedPluginData('prism3', 'brandInput'); } catch { /* unreadable → absent */ }
  const legacy = rootBrand !== '' && !collections.some(stamped);

  // COLLECTIONS + VARIABLES. Each planned collection is resolved exactly as the writer will resolve it:
  // through the rename pre-pass, then first-by-name (`upsertCollection`'s `find`).
  const moves = collectionMoves(collections.map((c) => c.name), map);
  const vars = await api.getLocalVariablesAsync();
  const seen = new Set<string>();
  for (const group of plan.variables) {
    const current = moves.get(group.collection) ?? group.collection;
    const col = collections.find((c) => c.name === current);
    if (!col) continue;                                   // will be created fresh — nothing to collide with
    if (!seen.has(col.id)) {
      seen.add(col.id);
      if (!stamped(col) && !legacy) {
        conflicts.push({ kind: 'collection', name: group.collection, detail: 'already in this file, not created by Prism3' });
      }
    }
    const byName = new Map(vars.filter((v) => v.variableCollectionId === col.id).map((v) => [v.name, v] as const));
    for (const row of group.rows) {
      const v = byName.get(row.name);
      if (v && v.resolvedType !== row.type) {
        conflicts.push({ kind: 'variable', name: row.name, detail: `is ${v.resolvedType} in "${current}"; Prism3 writes ${row.type}` });
      }
    }
  }

  // STYLES, per kind — a style name is unique only within its kind, and each writer looks up its own.
  for (const kind of Object.keys(STYLE_GETTERS) as StyleKind[]) {
    const planned = plan.styles[kind];
    if (!planned.length) continue;
    const existing = new Map((await STYLE_GETTERS[kind](api)).map((s) => [s.name, s] as const));
    for (const name of planned) {
      const s = existing.get(name);
      if (!s || legacy || isEngineDescription(kind, s.description ?? '', planned)) continue;
      conflicts.push({ kind: `${kind} style`, name, detail: 'already in this file, not created by Prism3' });
    }
  }
  return conflicts;
};

/**
 * THE ORDERING, in one place: pre-flight first, and the write only on a clean result. `write` is the whole
 * apply sequence — never called when there is a conflict, so a refused apply writes nothing at all.
 */
export const guardApply = async <T>(
  plan: PreflightPlan,
  api: PreflightApi,
  write: () => Promise<T>,
): Promise<{ ok: true; result: T } | { ok: false; conflicts: Conflict[] }> => {
  const conflicts = await preflightApply(plan, api);
  if (conflicts.length) return { ok: false, conflicts };
  return { ok: true, result: await write() };
};

/** The designer-facing list — plain and factual: kind, name, what differs. Capped so the verdict row
 *  stays readable; the count is always the full one. */
export const conflictSummary = (conflicts: readonly Conflict[], cap = 8): string => {
  const head = conflicts.slice(0, cap).map((c) => `${c.kind} "${c.name}" ${c.detail}`).join('; ');
  const more = conflicts.length > cap ? `; and ${conflicts.length - cap} more` : '';
  return `Nothing was written. ${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} with existing content: ${head}${more}`;
};
