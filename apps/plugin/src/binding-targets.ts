/**
 * THE BINDING-TARGET INDEX (#1904): the variables a style or a wash may bind to, by name, drawn ONLY from the
 * collections this apply writes.
 *
 * Three binding lookups (`applyTextStylePlan`'s font bindings, `applyStylesPlan`'s gradient stops and glass blur,
 * `applyWritePlan`'s wash opacity) used to index every local variable in the file by name, the last one listed
 * winning. A same-named variable in a collection Prism3 does not write (a foreign one, or one stranded by an earlier
 * version, #1152) could then take the binding: a stale target when its type matches, a host refusal partway through
 * the pass when it does not. The pre-flight (`preflight.ts`) never looked there, because it type-checks each planned
 * variable inside the collection the writer resolves it to. This index looks where the pre-flight looks.
 *
 * Each collection name resolves the way `upsertCollection` resolves it: the FIRST collection carrying that name. A
 * variable outside those collections is not a target, so a binding with no target in them is the executor's ordinary
 * miss, reported by name and never thrown.
 *
 * `bindIn` absent keeps the file-wide index. Only the executors' unit tests call without it; both production callers,
 * `runApplyTheme` and the paste steps, pass the list (`bindingCollectionsOf` in `preflight.ts`), and
 * `test-write-preflight.ts` holds each to it.
 *
 * Compiled under `tsconfig.main.json`. No import, so every executor port can use it without depending on another.
 */
export const bindingTargets = async <V extends { name: string; variableCollectionId?: string }>(
  vars: {
    getLocalVariablesAsync(): Promise<readonly V[]>;
    getLocalVariableCollectionsAsync?(): Promise<readonly { id: string; name: string }[]>;
  },
  bindIn?: readonly string[],
): Promise<Map<string, V>> => {
  const all = await vars.getLocalVariablesAsync();
  if (!bindIn) return new Map(all.map((v) => [v.name, v] as const));
  const collections = (await vars.getLocalVariableCollectionsAsync?.()) ?? [];
  const ids = new Set<string>();
  for (const name of bindIn) {
    const c = collections.find((x) => x.name === name);
    if (c) ids.add(c.id);
  }
  return new Map(all.filter((v) => v.variableCollectionId !== undefined && ids.has(v.variableCollectionId)).map((v) => [v.name, v] as const));
};
