/**
 * "SHOW THE SET IN FIGMA" (#3119, owner decision 2026-11-18 A): a bad Build set result offers it, only while the file holds
 * the set. This module finds the node that holds a def's set among a file search's results, by the rule `readPresent`
 * (`main.ts`) uses to call a set present, and shows it: its page made current, the viewport fitted to it. `main.ts` runs
 * the search (`searchPagesYielding`) and hands over the host calls, so this reads no `figma` global and is tested on its own.
 */

/** A file search's results, one entry per node in the order searched: its node, its type and its name. */
export type SetSearch = { readonly nodes: readonly unknown[]; readonly kinds: readonly string[]; readonly names: readonly string[] };

/** The node that holds `id`'s set: a component set or component named `id` or one of its former ids (`formerIds`, #3770),
 *  or, for a def drawn as separate components (`emitAsComponents`, the icons), the first component named `<id>/…`. The
 *  rule is `readPresent`'s, so the button is offered for exactly the sets Update file counts as present. `null`: none. */
export const setNodeOf = (found: SetSearch, id: string, emitAsComponents: boolean, formerIds: readonly string[] = []): unknown | null => {
  for (const name of [id, ...formerIds]) {
    const at = found.names.findIndex((n, i) => (found.kinds[i] === 'COMPONENT_SET' || found.kinds[i] === 'COMPONENT') && (n === name || (emitAsComponents && n.startsWith(`${name}/`))));
    if (at >= 0) return found.nodes[at];
  }
  return null;
};

/** The page a node sits on, read up its parents; `null` when it is on none (removed, or not in the document). */
export const pageOf = (node: unknown): unknown | null => {
  let n = node as { type?: string; parent?: unknown } | null;
  while (n) {
    if (n.type === 'PAGE') return n;
    n = (n.parent ?? null) as { type?: string; parent?: unknown } | null;
  }
  return null;
};

/** What showing needs from the host: `figma.setCurrentPageAsync` and `figma.viewport.scrollAndZoomIntoView`. */
export type ShowHost = { setCurrentPageAsync(page: unknown): Promise<void>; scrollAndZoomIntoView(nodes: readonly unknown[]): void };

/** Show `node`: its page first, then the viewport on it. False, and nothing done, when it is on no page. */
export const showSetNode = async (host: ShowHost, node: unknown): Promise<boolean> => {
  const page = pageOf(node);
  if (!page) return false;
  await host.setCurrentPageAsync(page);
  host.scrollAndZoomIntoView([node]);
  return true;
};
