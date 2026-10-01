/**
 * The new shell's tabs, as data (UI redesign S1.2, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.6 and §4). DOM-free, so a Node test can import it.
 *
 * IA-1 decides the tabs: Brand · Color · Type · Shape · Depth & motion · Layout · Components, and Color's
 * sub-pages Palettes · Surfaces & fills · Interactive. Until a domain slice moves a page, each tab shows
 * one or more LEGACY pages in the full-width legacy frame (D1). `legacy` names them, in the order the
 * frame offers them; plan §4's table is the source. Every page here is legacy in S1.2. A domain slice
 * moves a page by emptying its `legacy` list, and S13 deletes the field.
 *
 * S1.3 grows this file into the plan's §3.7 `pages.ts` (v6's homes, sections and lever keys). Nothing
 * here decides a home view.
 */
import type { PageKey } from '../state/store';

/** Which host a legacy page list applies to. Components maps to a different legacy page per host (§4). */
export type Host = 'web' | 'figma';

export type ColorSubId = 'palettes' | 'fills' | 'interactive';
export type TabId = 'brand' | 'color' | 'type' | 'shape' | 'depth' | 'layout' | 'components';

/** A place the tab row can select: a tab, or a Color sub-page. */
export type Place = { readonly tab: TabId; readonly sub?: ColorSubId };

type Legacy = readonly PageKey[] | { readonly [H in Host]: readonly PageKey[] };

export type SubPage = { readonly id: ColorSubId; readonly label: string; readonly legacy: Legacy };
export type Tab = {
  readonly id: TabId;
  readonly label: string;
  /** The tab's own legacy pages. Absent on a tab with sub-pages, whose sub-pages carry them. */
  readonly legacy?: Legacy;
  readonly subs?: readonly SubPage[];
};

export const TABS: readonly Tab[] = [
  { id: 'brand', label: 'Brand', legacy: ['preview'] },
  {
    id: 'color', label: 'Color', subs: [
      { id: 'palettes', label: 'Palettes', legacy: ['palettes'] },
      { id: 'fills', label: 'Surfaces & fills', legacy: ['surfaces'] },
      { id: 'interactive', label: 'Interactive', legacy: ['interactive'] },
    ],
  },
  { id: 'type', label: 'Type', legacy: ['typography'] },
  { id: 'shape', label: 'Shape', legacy: ['sizeRadius'] },
  // D8: two legacy pages under one tab, behind a local switch labeled with their names, until S9. A
  // switch rather than both pages stacked, because each legacy page owns the one live painter (§4).
  { id: 'depth', label: 'Depth & motion', legacy: ['elevation', 'motion'] },
  { id: 'layout', label: 'Layout', legacy: ['layout'] },
  // The web has no Components page (it is Figma-only), so the web tab shows the Buttons block on the
  // legacy Size & radius page until S8 (§4).
  { id: 'components', label: 'Components', legacy: { web: ['sizeRadius'], figma: ['components'] } },
];

/** The legacy page labels the Depth & motion switch shows (D8: the two legacy page names). */
export const LEGACY_LABEL: Partial<Record<PageKey, string>> = { elevation: 'Elevation', motion: 'Motion' };

const tabOf = (id: TabId): Tab => TABS.find((t) => t.id === id)!;
const listFor = (l: Legacy | undefined, host: Host): readonly PageKey[] =>
  !l ? [] : Array.isArray(l) ? (l as readonly PageKey[]) : (l as { readonly [H in Host]: readonly PageKey[] })[host];

/** The legacy pages a place shows on this host. A tab with sub-pages shows none of its own. */
export const legacyOf = (p: Place, host: Host): readonly PageKey[] => {
  const t = tabOf(p.tab);
  if (t.subs) return listFor(t.subs.find((s) => s.id === p.sub)?.legacy, host);
  return listFor(t.legacy, host);
};

/** The place a tab click lands on: the tab, or its first sub-page. */
export const placeOfTab = (id: TabId): Place => {
  const t = tabOf(id);
  return t.subs ? { tab: id, sub: t.subs[0].id } : { tab: id };
};

/** Every place, in tab order: a tab without sub-pages, or each sub-page of a tab with them. */
export const PLACES: readonly Place[] = TABS.flatMap((t) => (t.subs ? t.subs.map((s) => ({ tab: t.id, sub: s.id })) : [{ tab: t.id }]));

/** The place that shows `page`, for a page change that did not come from the tab row (the Pages menu, a
 *  brand load). `keep` wins when it already shows the page, so moving between two tabs that share a
 *  legacy page (Shape and Components on the web) never jumps the selection. Null when no place shows the
 *  page (the plugin's Style guide, a Figma menu item from S1.4 on). */
export const placeOfPage = (page: PageKey, host: Host, keep: Place | null): Place | null => {
  if (keep && legacyOf(keep, host).includes(page)) return keep;
  return PLACES.find((p) => legacyOf(p, host).includes(page)) ?? null;
};

/** Stable id for a place, used in element ids and hooks: `brand`, `color-palettes`. */
export const placeId = (p: Place): string => (p.sub ? `${p.tab}-${p.sub}` : p.tab);
