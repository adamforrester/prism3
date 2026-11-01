/**
 * WHICH SETS IN THE FILE HAVE NO USAGE PANEL (#3137, owner decisions Q3137.1–8, all A), and the panels Clean up removes.
 *
 * Update file offers the missing panels as a group of their own (Q3137.1 A). Reading "missing" must stay cheap: the
 * read runs inside the file read that already loads every page (`fileSets`), and the badge reuses its answer with no page
 * load (Q3137.3 A). So the census is ONE indexed document search for panel tags, the search `allPanels` in `doc-panel.ts`
 * runs, and it builds no plan and reads no member.
 *
 * THE RULE. A family has its panel when a live tag names its lead def and a set id that is still a component set in the
 * file. Missing = the panel leads that are present, minus those with a panel. Panels are per family (#2927), so only a
 * lead counts (`leadsPanel`); a def with no furniture (the icons, the provider logos, the spinner) draws none.
 *
 * NOT CAUGHT HERE, by design: a panel drawn from an older plan, or one no longer where its set puts it. Those are stale,
 * not missing, and stay with Due and the scoped check (`docPanelDue`), as before. Nor a spot blocked by something that is
 * not a Prism3 set: the scoped check says that, never this read.
 *
 * CLEAN UP (Q3137.7 A). With panels off, the live panels can be removed, but only the ones that still hold what was drawn
 * (`panelUnedited`): a panel a designer edited stays. The removal re-reads the file; it never trusts the preview's list.
 */
import { DOC_PANEL_KEY, DOC_PANEL_NS, leadsPanel, panelUnedited, readPanelTag, type PanelApi, type PanelTag, type PNode } from './doc-panel';

/** The root as the census reads it: the document search `allPanels` runs. */
export type CensusRoot = Pick<PanelApi, 'root'>['root'];

/** Every live usage panel in the file, with its tag: one indexed search, by the panel's own plugin-data key. */
export const livePanels = (root: CensusRoot): { node: PNode; tag: PanelTag }[] =>
  (root.findAllWithCriteria({ types: ['FRAME'], sharedPluginData: { namespace: DOC_PANEL_NS, keys: [DOC_PANEL_KEY] } }) as readonly PNode[])
    .flatMap((node) => { const tag = readPanelTag(node); return tag && tag.state === 'live' && !node.removed ? [{ node, tag }] : []; });

/** The leads whose panel is drawn: a live tag names the lead and a set id that is still a component set in the file. */
export const panelledOf = (tags: readonly PanelTag[], setIds: ReadonlySet<string>): string[] =>
  [...new Set(tags.filter((t) => t.state === 'live' && setIds.has(t.set)).map((t) => t.def))];

/** The present sets that lead a panel family and have no live panel, in `present`'s order. */
export const unpanelledOf = (present: readonly string[], panelled: readonly string[]): string[] =>
  present.filter((id) => leadsPanel(id) && !panelled.includes(id));

/** What Clean up's panels item reads (Q3137.7 A): how many live panels the file holds, and how many of them still hold
 *  what was drawn, so a removal would take them. */
export type PanelsCleanCount = { drawn: number; removable: number };
export const panelsCleanCount = async (api: Pick<PanelApi, 'root'>): Promise<PanelsCleanCount> => {
  const live = livePanels(api.root);
  let removable = 0;
  for (const { node } of live) if (await panelUnedited(api, node)) removable++;
  return { drawn: live.length, removable };
};

/** Remove the live panels that still hold what was drawn, re-read now. A panel edited by hand is never removed. Answers
 *  how many were removed, how many edited ones stayed, and the misses (a node the host refused to remove). */
export const removeUneditedPanels = async (api: Pick<PanelApi, 'root'>): Promise<{ removed: number; kept: number; misses: string[] }> => {
  let removed = 0, kept = 0;
  const misses: string[] = [];
  for (const { node, tag } of livePanels(api.root)) {
    if (!(await panelUnedited(api, node))) { kept++; continue; }
    try { node.remove?.(); removed++; } catch (e) { misses.push(`${tag.def}: ${(e as Error)?.message ?? String(e)}`); }
  }
  return { removed, kept, misses };
};
