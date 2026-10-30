/**
 * SETS MOVE TO THE PAGE THE TAXONOMY NAMES NOW (#2989, owner decision Q656 A) — on a file built before a part joined its
 * consumer's page, the part's set still sits on its old page (`↳ Breadcrumb Item`, `↳ Code Cell`). Update and Set up
 * file both move it, through this one module, so the two cannot disagree on what moves.
 *
 * WHAT MOVES: a set Prism3 built (`prism3Set`), named for one of the defs a `FORMER_PAGES` entry lists, found at the top
 * level of that entry's page. A single-component def (#3148, the provider logos) has no set: its components Prism3 built,
 * each a top-level `<id>/<value>`, move together as one, under the def's current id or an earlier one the ledger
 * renames into it (the update renames them after the move). A set anywhere else is where a designer put it and stays, as does a set a designer
 * built under the same name. With the set go the nodes that are its own by tag (`ownerSet`): its labels, its backdrop
 * and its live usage panel, so the page it leaves holds nothing of it. A usage panel moved onto a page another set
 * leads is replaced there by the lead's next draw, or kept aside if a designer edited it, as any family member's
 * earlier panel is (#2927).
 *
 * WHAT IS KEPT: the nodes are moved, never rebuilt, so every id, every instance placed from the set, every override and
 * every hand edit (#2956) comes with it.
 *
 * NO PAGE IS EVER DELETED (the owner's standing rule, #2989): a page the move leaves with nothing on it is named in the
 * result, for the owner to delete by hand.
 *
 * WHERE IT LANDS: right of everything on the destination page, `SET_GAP` past it, level with the page's top set, so it
 * overlaps nothing. The Update's re-spacing (#2542) then tidies the row where every set on the page is one it reads.
 */
import { FORMER_PAGES, NEST_PREFIX, leafForDef, leafPageName, TAXONOMY, type Taxonomy } from './file-taxonomy';
import { resolveComponentPage, type PagesApi, type PageLike } from './file-setup';
import { ownerSet, prism3Set, type PNode } from './doc-panel';
import { SET_GAP, STAMP_KEY } from './write-components';
import { NS } from './persist-figma';
import { builtByPrism3, readBaseline } from './member-baseline';
import { formerDefIds } from '@prism3/engine/component-renames';

/** One set to move: by its set name (the def id), from and to full page names. */
export type PageMove = { set: string; from: string; to: string };

type MovePage = PageLike & { readonly children?: readonly PNode[] };

const topSets = (page: MovePage | undefined, defs: readonly string[]): PNode[] =>
  (page?.children ?? []).filter((n) => n.type === 'COMPONENT_SET' && defs.includes(String(n.name ?? '')) && prism3Set(n));

/** A single-component def's components Prism3 built at the top level of `page` (#3148): named `<id>/<value>` under the
 *  def's id or an earlier one, owned by the stamp, never the name, as a set's members are. */
const topSingles = (page: MovePage | undefined, def: string): PNode[] => {
  const ids = [def, ...formerDefIds(def)];
  const comps = (page?.children ?? []).filter((n) => n.type === 'COMPONENT' && ids.some((id) => String(n.name ?? '').startsWith(`${id}/`)));
  const reads = comps.map((m) => ({ id: m.id === undefined ? undefined : String(m.id), stamp: m.getSharedPluginData?.(NS, STAMP_KEY) ?? '', recordId: readBaseline(m as never)?.id }));
  const owned = builtByPrism3(reads);
  return comps.filter((_, i) => owned(reads[i]));
};

/** The nodes that move for one def: its set, or its single components. */
const topNodes = (page: MovePage | undefined, def: string): PNode[] => {
  const sets = topSets(page, [def]);
  return sets.length ? sets.slice(0, 1) : topSingles(page, def);
};

/** THE MOVES DUE, read off the page list and writing nothing, in `FORMER_PAGES` order (a part before the part that nests
 *  it). Empty on a file with no former page, or whose former pages hold no Prism3 set the taxonomy now places elsewhere. */
export const pageMovesDue = (children: readonly PageLike[], t: Taxonomy = TAXONOMY): PageMove[] => {
  const out: PageMove[] = [];
  for (const former of FORMER_PAGES) {
    const from = NEST_PREFIX + former.page;
    const page = children.find((p) => !p.isPageDivider && p.name === from) as MovePage | undefined;
    for (const def of former.defs) {
      if (!topNodes(page, def).length) continue;
      const leaf = leafForDef(def, t)?.leaf;
      if (leaf && leafPageName(leaf) !== from) out.push({ set: def, from, to: leafPageName(leaf) });
    }
  }
  return out;
};

/** What `relocateSets` did: the moves made, and the pages they left with nothing on them, by full page name. */
export type RelocateOutcome = { moved: PageMove[]; emptied: string[] };

const right = (n: PNode): number => (n.x ?? 0) + (n.width ?? 0);

/**
 * MAKE THE MOVES `pageMovesDue` reads now. The destination page is found or created where the build would create it
 * (`resolveComponentPage`). Each node is appended to it (Figma's own move between pages, which keeps the node's id) and
 * shifted by the one offset that puts the set clear of the page's existing nodes, so the set's own nodes keep their
 * places around it.
 */
export const relocateSets = async (api: PagesApi, t: Taxonomy = TAXONOMY): Promise<RelocateOutcome> => {
  await api.loadAllPagesAsync();
  const moved: PageMove[] = [];
  const left = new Set<MovePage>();
  for (const m of pageMovesDue(api.root.children, t)) {
    const from = api.root.children.find((p) => !p.isPageDivider && p.name === m.from) as MovePage | undefined;
    const nodes = topNodes(from, m.set);
    const to = (await resolveComponentPage(api, m.set, t)) as MovePage | null;
    if (!from || !nodes.length || !to || to === from) continue;
    const kids = [...(from.children ?? [])];
    const own = [...nodes, ...kids.filter((k) => !nodes.includes(k) && nodes.includes(ownerSet(k, kids) as PNode))];
    const there = [...(to.children ?? [])];
    // Level with the page's top set; single components level with its top component too (the icons, on Icons & assets).
    const single = nodes[0].type === 'COMPONENT';
    const sets = there.filter((n) => n.type === 'COMPONENT_SET' || (single && n.type === 'COMPONENT'));
    // The nodes move as one block: its left and top edges are the leftmost and topmost of them (a set alone is itself).
    const x0 = Math.min(...nodes.map((n) => n.x ?? 0));
    const y0 = Math.min(...nodes.map((n) => n.y ?? 0));
    const dx = there.length ? Math.max(...there.map(right)) + SET_GAP - x0 : 0;
    const dy = sets.length ? Math.min(...sets.map((n) => n.y ?? 0)) - y0 : 0;
    for (const n of own) {
      to.appendChild(n);
      n.x = (n.x ?? 0) + dx;
      n.y = (n.y ?? 0) + dy;
    }
    moved.push(m);
    left.add(from);
  }
  return { moved, emptied: [...left].filter((p) => !(p.children ?? []).length).map((p) => p.name) };
};

/** Owner-approved wording (#2989, Q3 A, 2026-10-24): the moves, as the dry run lists them and as the apply reports them done. */
export const pageMovesLine = (moves: readonly PageMove[] | undefined, done: boolean): string =>
  moves?.length ? `${done ? 'Moved' : 'To move'} to ${moves.length === 1 ? 'its page' : 'their pages'}: ${moves.map((m) => `${m.set} (${m.from.slice(NEST_PREFIX.length)} to ${m.to.slice(NEST_PREFIX.length)})`).join(', ')}.` : '';

/** Owner-approved wording (#2989, Q3 A, 2026-10-24): a page the move left empty. The plugin never deletes a page. */
export const emptiedLine = (pages: readonly string[] | undefined): string =>
  pages?.length ? `${pages.map((p) => p.slice(NEST_PREFIX.length)).join(', ')} ${pages.length === 1 ? 'is' : 'are'} now empty, safe to delete.` : '';
