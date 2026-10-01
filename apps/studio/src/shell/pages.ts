/**
 * The new shell's pages, as data (UI redesign S1.2 and S1.3, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.6, §3.7 and §4). DOM-free, so a Node test can import it.
 *
 * THIS IS CONCEPT V6'S `HOMES` BLOCK (`concept-v6.src.html`, the `p3-homes` script), ported as a typed
 * constant: the views a page can call home, the views behind Inspect, and the domains (IA-1: Brand · Color
 * · Type · Shape · Depth & motion · Layout · Components, with Color's sub-pages Palettes · Surfaces & fills ·
 * Interactive) with their sections, rows and lever keys. The IA is locked here, as data, before any domain
 * moves (§3.7). `test-pages.ts` checks it against the engine's lever manifest and emitted color roles, the
 * way `build-v6.mjs` checks 1–3 did.
 *
 * ONE HOME PER PAGE (V1, V12). A tab without sub-pages, and each sub-page, declares exactly one `home`
 * view. A section never does: the preview changes only on a tab or sub-page change, never on scroll or
 * focus, so a section has nothing to bring. A duplicate key in an object literal here is a compile error
 * (TS1117), so `typecheck` is the duplicate-key check `build-v6.mjs` needed a second parser for.
 *
 * LEGACY PAGES. Until a domain slice moves a page, it shows one or more legacy pages in the full-width
 * legacy frame (D1). `legacy` names them, in the order the frame offers them; plan §4's table is the
 * source. A slice moves a page by emptying its list and setting its `status` to `new` (S2: Color › Palettes; S3: Brand;
 * S4a: Color › Surfaces & fills);
 * S13 deletes both fields. The store's `page` then holds the moved page's id (`NewPageKey`). `PageKey`, the legacy page
 * keys the store's `page` holds, is DERIVED from these lists (plus the Figma menu's Style guide), so a
 * slice that empties a list takes the key out of the type, and `NAV` in `main.ts` (checked against
 * `PageKey` both ways) fails `typecheck` until its row goes too.
 *
 * The prose here (`intro`, `desc`, section titles) is concept v6's, verbatim. It ships in the bundle.
 */

/** Which host a legacy page list applies to. Components maps to a different legacy page per host (§4). */
export type Host = 'web' | 'figma';

/** The views a page can call home, with their titles (the preview header shows the title). */
export const VIEWS = [
  ['guide', 'Style guide'], ['palettes', 'Palettes'], ['surfaces', 'Surfaces & fills'], ['interactive', 'Interactive'],
  ['type', 'Type'], ['shape', 'Size & shape'], ['depth', 'Depth & motion'], ['layout', 'Layout'], ['comps', 'Components'],
] as const;
/** The views behind Inspect (F1). They open over any page's preview and are never a page's home. */
export const INSPECT = [['contrast', 'Contrast'], ['tokens', 'Tokens'], ['log', 'Decisions log']] as const;

export type ViewId = (typeof VIEWS)[number][0];
export type InspectId = (typeof INSPECT)[number][0];

/** One row of the levers panel: its control, the manifest keys it edits, and the schema inputs it edits
 *  that are not manifest levers. `drive` names the preview part the row drives (Q4, deferred). */
export type Row = { readonly ctl: string; readonly keys?: readonly string[]; readonly schemaOnly?: readonly string[]; readonly drive?: string };
export type Section = { readonly title: string; readonly desc?: string; readonly advanced?: boolean; readonly rows: readonly Row[] };
type LegacyList = readonly string[] | { readonly web: readonly string[]; readonly figma: readonly string[] };
/** A page: a tab without sub-pages, or a sub-page. */
export type PageData = {
  readonly id: string; readonly label: string; readonly home: ViewId; readonly intro: string;
  readonly sections: readonly Section[];
  /** The Roles matrix's families (V2): role-path prefixes. Color's Surfaces & fills and Interactive only. */
  readonly roles?: readonly string[];
  /** `legacy` until the page's slice moves it, then `new` (S2 moved Color › Palettes first). A `new` page
   *  draws the two panes from its own modules (`NEW_PAGES` in `frame.ts`) and names no legacy page. */
  readonly status: 'legacy' | 'new';
  readonly legacy: LegacyList;
};
/** A tab. Either it is a page itself, or it holds sub-pages and has no home or sections of its own. */
export type Domain = PageData | { readonly id: string; readonly label: string; readonly subpages: readonly PageData[] };

export const DOMAINS = [
  {
    id: 'brand', label: 'Brand', home: 'guide', intro: 'Who the brand is: its name, its namespace, its character and the modes it ships in.',
    sections: [
      { title: 'Identity', rows: [{ ctl: 'identity', schemaOnly: ['id', 'root'] }] },
      { title: 'Personality', desc: 'Each word fills settings you have not set yet. Settings you set win.', rows: [{ ctl: 'personality', schemaOnly: ['personality'] }] },
      { title: 'Modes', rows: [{ ctl: 'modes', schemaOnly: ['modes', 'customModes'] }] },
    ],
    // S3: moved. Its levers are `domains/brand.ts`, its preview `preview/brand.ts` (the Style guide, lent).
    status: 'new',
    legacy: [],
  },
  {
    id: 'color', label: 'Color', subpages: [
      {
        id: 'palettes', label: 'Palettes', home: 'palettes', intro: 'The ramps every color role draws from. Your colors are pinned as anchors, never shifted.',
        sections: [
          { title: 'Primary', rows: [{ ctl: 'primary', keys: ['primary'] }] },
          { title: 'Brand colors', desc: 'Each color grows into its own 20-step ramp.', rows: [{ ctl: 'brandColors', keys: ['brandColors'] }] },
          { title: 'Neutrals', rows: [{ ctl: 'neutral', keys: ['neutral.hue', 'neutral.chroma'] }] },
          { title: 'Pinned neutral', advanced: true, rows: [{ ctl: 'neutralAnchor', keys: ['neutral.anchor'] }] },
          {
            title: 'Status colors', advanced: true, rows: [
              { ctl: 'status', keys: ['status.success'] }, { ctl: 'status', keys: ['status.warning'] },
              { ctl: 'status', keys: ['status.danger'] }, { ctl: 'status', keys: ['status.info'] },
            ],
          },
        ],
        // S2: moved. Its levers are `domains/color-palettes.ts`, its preview `preview/palettes.ts`.
        status: 'new',
        legacy: [],
      },
      {
        id: 'fills', label: 'Surfaces & fills', home: 'surfaces', intro: 'The page and its tiers, the inverse band, the bold fills and the gradients.',
        roles: ['text', 'icon', 'background', 'foreground', 'border', 'scrim', 'veil', 'inverse'],
        sections: [
          { title: 'Surfaces', desc: 'Set for light; dark and the derived modes follow unless set per mode.', rows: [{ ctl: 'surfaces', keys: ['surfaces'], drive: 'surface' }] },
          { title: 'Foreground fills', desc: 'Auto follows the contrast-gated default. A pick below its floor is marked, not blocked.', rows: [{ ctl: 'fills', schemaOnly: ['overrides'] }] },
          // NOT CONCEPT V6'S (S4a): the legacy page's text inks, as rows like the fills. These rows are the
          // permanent, primary text editor; the Roles matrix (S4b) is a secondary view and never the only
          // editor of a token (owner decision Q20, `decisions-2026-10-01-qa.md`, replacing v6's R3).
          { title: 'Text', desc: 'Auto follows the contrast-placed default. A pick below its floor is marked, not blocked.', rows: [{ ctl: 'text', schemaOnly: ['overrides'] }] },
          { title: 'Gradients', rows: [{ ctl: 'gradients', keys: ['gradients'] }] },
        ],
        // S4a: moved. Its levers are `domains/color-fills.ts`, its preview `preview/surfaces.ts`.
        status: 'new',
        legacy: [],
      },
      {
        id: 'interactive', label: 'Interactive', home: 'interactive', intro: 'How actions, links and disabled states draw from the palettes, and the floors they meet.',
        roles: ['interactive', 'inverse.interactive', 'text.link', 'icon.link', 'inverse.text.link', 'inverse.icon.link', 'disabled', 'inverse.disabled', 'field', 'inverse.field'],
        sections: [
          {
            title: 'Actions', rows: [
              { ctl: 'palette', keys: ['actionPalette'], drive: 'action' },
              { ctl: 'enum', keys: ['outlineInteraction'], drive: 'action' },
              { ctl: 'enum', keys: ['neutralEmphasis'], drive: 'neutral' },
            ],
          },
          {
            title: 'Interactive palettes', desc: 'Each column is a full set of fill, text, border and state roles.', rows: [
              { ctl: 'interactivePalettes', keys: ['interactivePalettes'], schemaOnly: ['modeAnchors'], drive: 'action' },
              { ctl: 'toggle', keys: ['strictInteractiveContrast'], drive: 'inverse' },
            ],
          },
          {
            title: 'Links', rows: [
              { ctl: 'palette', keys: ['linkPalette'], drive: 'link' },
              { ctl: 'linkStateRungs', keys: ['linkStateRungs'], drive: 'link' },
            ],
          },
          {
            title: 'Legibility', rows: [
              { ctl: 'enum', keys: ['iconContrast'], drive: 'icon' },
              { ctl: 'enum', keys: ['disabledStrategy'], drive: 'disabled' },
              { ctl: 'disabledMin', keys: ['disabledMin'], drive: 'disabled' },
            ],
          },
        ],
        status: 'legacy',
        legacy: ['interactive'],
      },
    ],
  },
  {
    id: 'type', label: 'Type', home: 'type', intro: 'Faces per text category, then the heading scale they sit on.',
    sections: [
      { title: 'Faces', rows: [{ ctl: 'library', schemaOnly: ['typography.typefaceLibrary'] }, { ctl: 'families', keys: ['typography.families'] }] },
      { title: 'Scale', rows: [{ ctl: 'typeScale', keys: ['typography.typeScale'] }] },
      {
        title: 'Scale limits', advanced: true, rows: [
          { ctl: 'responsive', keys: ['typography.responsive'] },
          { ctl: 'displayCeiling', keys: ['typography.displayCeiling'] },
          { ctl: 'titleFloor', keys: ['typography.titleFloor'] },
          { ctl: 'floorChips', keys: ['typography.captionFloor'] },
          { ctl: 'floorChips', keys: ['typography.sizeFloor'] },
        ],
      },
      {
        title: 'Weights and styles', advanced: true, rows: [
          { ctl: 'weightRoles', keys: ['typography.weightRoles'] },
          { ctl: 'weights', keys: ['typography.weights', 'typography.links'] },
          { ctl: 'italics', keys: ['typography.italics', 'typography.italicDefault'] },
        ],
      },
    ],
    status: 'legacy',
    legacy: ['typography'],
  },
  {
    id: 'shape', label: 'Shape', home: 'shape', intro: 'Control heights and corners. Padding is set per component.',
    sections: [
      { title: 'Density', rows: [{ ctl: 'enum', keys: ['density'], drive: 'size' }] },
      { title: 'Corners', rows: [{ ctl: 'slider', keys: ['radiusScale'], drive: 'radius' }, { ctl: 'enum', keys: ['controlShape'], drive: 'shape' }] },
      { title: 'Corner base', advanced: true, rows: [{ ctl: 'slider', keys: ['baseMd'], drive: 'radius' }, { ctl: 'toggle', keys: ['radiusHairline'], drive: 'radius' }] },
    ],
    status: 'legacy',
    legacy: ['sizeRadius'],
  },
  {
    // D8: two legacy pages under one tab, behind a local switch labeled with their names, until S9. A
    // switch rather than both pages stacked, because each legacy page owns the one live painter (§4).
    id: 'depth', label: 'Depth & motion', home: 'depth', intro: 'Shadow character, then motion tempo. One preview holds both.',
    sections: [
      { title: 'Elevation', rows: [{ ctl: 'slider', keys: ['shadow.softness'], drive: 'elev' }] },
      { title: 'Motion', rows: [{ ctl: 'enum', keys: ['motionPersonality.tempo'], drive: 'motion' }, { ctl: 'easing', schemaOnly: ['motionPersonality.easingRoles'] }] },
      { title: 'Shadow tint', advanced: true, rows: [{ ctl: 'tint', keys: ['shadow.tint'], drive: 'elev' }] },
    ],
    status: 'legacy',
    legacy: ['elevation', 'motion'],
  },
  {
    id: 'layout', label: 'Layout', home: 'layout', intro: 'Breakpoints, the column grid and content widths.',
    sections: [
      { title: 'Breakpoints', rows: [{ ctl: 'breakpoints', keys: ['layout.breakpoints'] }] },
      { title: 'Grid', rows: [{ ctl: 'columns', keys: ['layout.columns'] }, { ctl: 'gridOverrides', schemaOnly: ['layout.columnOverrides'] }] },
      { title: 'Containers', rows: [{ ctl: 'slider', keys: ['layout.containerMax'] }, { ctl: 'slider', keys: ['layout.containerNarrow'] }] },
    ],
    status: 'legacy',
    legacy: ['layout'],
  },
  {
    // The web has no Components page (it is Figma-only), so the web tab shows the Buttons block on the
    // legacy Size & radius page until S8 (§4).
    id: 'components', label: 'Components', home: 'comps', intro: 'Button options, and the 26 component sets the engine defines.',
    sections: [
      {
        title: 'Button', rows: [
          { ctl: 'densityLink' },
          { ctl: 'enum', keys: ['buttonIcons'], drive: 'button' },
          { ctl: 'enum', keys: ['buttonContentSize'], drive: 'button' },
          { ctl: 'enum', keys: ['buttonLabelWeight'], drive: 'button' },
          { ctl: 'slider', keys: ['buttonMinWidthMultiplier'], drive: 'button' },
        ],
      },
      { title: 'Sets', rows: [{ ctl: 'sets' }] },
    ],
    status: 'legacy',
    legacy: { web: ['sizeRadius'], figma: ['components'] },
  },
] as const satisfies readonly Domain[];

/** Legacy pages no tab shows: the Figma menu's Style guide (plugin), reached from the Pages menu until S11
 *  moves it into the Figma menu (§4's last row). */
export const MENU_LEGACY = ['styleGuide'] as const;

// ── types derived from the data ────────────────────────────────────────────────────────────────────
type DomainT = (typeof DOMAINS)[number];
type SubOf<D> = D extends { readonly subpages: readonly (infer S)[] } ? S : never;
type PageT = Exclude<DomainT, { readonly subpages: unknown }> | SubOf<DomainT>;
type KeysOf<L> = L extends readonly (infer K)[] ? K : L extends { readonly web: readonly (infer A)[]; readonly figma: readonly (infer B)[] } ? A | B : never;

/** The tabs (IA-1). */
export type TabId = DomainT['id'];
/** Color's sub-pages. */
export type ColorSubId = SubOf<DomainT>['id'];
/** The legacy page keys: every key a page's `legacy` list names, plus the Figma menu's. Derived, so it
 *  shrinks as each slice empties a list (§3.7, #1846). `NAV` in `main.ts` is checked against this. */
export type LegacyPageKey = KeysOf<PageT['legacy']> | (typeof MENU_LEGACY)[number];
/** The pages a slice has moved (`status: 'new'`), by id. Derived, so it grows as each slice moves one. */
export type NewPageKey = Extract<PageT, { readonly status: 'new' }>['id'];
/** What the store's `page` holds: a legacy page, or a moved page by its id. The two sets never share a
 *  key: a slice that moves a page takes its legacy key out of the first set in the same change. */
export type PageKey = LegacyPageKey | NewPageKey;

/** A place the tab row can select: a tab, or a Color sub-page. */
export type Place = { readonly tab: TabId; readonly sub?: ColorSubId };

/** The legacy page labels the Depth & motion switch shows (D8: the two legacy page names). */
export const LEGACY_LABEL: Partial<Record<LegacyPageKey, string>> = { elevation: 'Elevation', motion: 'Motion' };

const domainOf = (id: TabId): Domain => DOMAINS.find((d) => d.id === id)!;
const subsOf = (d: Domain): readonly PageData[] | null => ('subpages' in d ? d.subpages : null);

/** The page a place is: the tab itself, or its sub-page. Null for a tab with sub-pages and no sub given. */
export const pageOf = (p: Place): PageData | null => {
  const d = domainOf(p.tab);
  const subs = subsOf(d);
  if (subs) return subs.find((s) => s.id === p.sub) ?? null;
  return d as PageData;
};

const listFor = (l: LegacyList | undefined, host: Host): readonly LegacyPageKey[] =>
  (!l ? [] : Array.isArray(l) ? l : (l as { readonly [H in Host]: readonly string[] })[host]) as readonly LegacyPageKey[];

/** The legacy pages a place shows on this host. Empty for a page a slice has moved. */
export const legacyOf = (p: Place, host: Host): readonly LegacyPageKey[] => listFor(pageOf(p)?.legacy, host);

/** The moved pages' ids, from the data. */
export const NEW_PAGE_KEYS: readonly NewPageKey[] = (DOMAINS as readonly Domain[])
  .flatMap((d) => ('subpages' in d ? d.subpages : [d as PageData]))
  .filter((p) => p.status === 'new').map((p) => p.id as NewPageKey);
/** Is `k` a moved page (drawn in the two panes), rather than a legacy page? */
export const isNewPage = (k: PageKey): k is NewPageKey => (NEW_PAGE_KEYS as readonly string[]).includes(k);
/** The moved page a place is, or null when the place is legacy. */
export const newPageOf = (p: Place): NewPageKey | null => {
  const d = pageOf(p);
  return d && d.status === 'new' ? (d.id as NewPageKey) : null;
};

/** The tab row's data, in tab order, with each tab's sub-pages. */
export const TABS: readonly { readonly id: TabId; readonly label: string; readonly subs?: readonly { readonly id: ColorSubId; readonly label: string }[] }[] =
  DOMAINS.map((d) => ({ id: d.id, label: d.label, ...('subpages' in d ? { subs: d.subpages.map((s) => ({ id: s.id, label: s.label })) } : {}) }));

/** The place a tab click lands on: the tab, or its first sub-page. */
export const placeOfTab = (id: TabId): Place => {
  const t = TABS.find((x) => x.id === id)!;
  return t.subs ? { tab: id, sub: t.subs[0].id } : { tab: id };
};

/** Every place, in tab order: a tab without sub-pages, or each sub-page of a tab with them. */
export const PLACES: readonly Place[] = TABS.flatMap((t) => (t.subs ? t.subs.map((s) => ({ tab: t.id, sub: s.id })) : [{ tab: t.id }]));

/** The place that shows `page`, for a page change that did not come from the tab row (the Pages menu, a
 *  brand load). `keep` wins when it already shows the page, so moving between two tabs that share a
 *  legacy page (Shape and Components on the web) never jumps the selection. Null when no place shows the
 *  page (the plugin's Style guide, a Figma menu item from S1.4 on). */
export const placeOfPage = (page: PageKey, host: Host, keep: Place | null): Place | null => {
  if (isNewPage(page)) return PLACES.find((p) => newPageOf(p) === page) ?? null;
  if (keep && legacyOf(keep, host).includes(page)) return keep;
  return PLACES.find((p) => legacyOf(p, host).includes(page)) ?? null;
};

/** Stable id for a place, used in element ids and hooks: `brand`, `color-palettes`. */
export const placeId = (p: Place): string => (p.sub ? `${p.tab}-${p.sub}` : p.tab);

/** A place's one home view (V1). */
export const homeOf = (p: Place): ViewId => pageOf(p)!.home;

/** A view's or an Inspect view's title. */
export const viewLabel = (v: ViewId | InspectId): string =>
  ([...VIEWS, ...INSPECT] as readonly (readonly [string, string])[]).find(([id]) => id === v)![1];
