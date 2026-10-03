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
 * S4a: Color › Surfaces & fills; S5.2: Color › Interactive; S6.2: Type);
 * S13 deletes both fields. The store's `page` then holds the moved page's id (`NewPageKey`). `PageKey`, the legacy page
 * keys the store's `page` holds, is DERIVED from these lists (plus the Figma menu's Style guide), so a
 * slice that empties a list takes the key out of the type, and `NAV` in `main.ts` (checked against
 * `PageKey` both ways) fails `typecheck` until its row goes too.
 *
 * The prose here (`intro`, `desc`, section titles) is concept v6's, verbatim, except where an owner decision
 * replaced it (marked where it does). It ships in the bundle.
 */

/** The Links copy (S5.2), shared by the levers' Links section and the preview's (owner decision Q23). APPROVED. */
export const LINKS_DESC = 'The link color in each state, on the page and on the inverse fill.';
/** The Icons copy (S5.2), APPROVED. Interactive no longer draws an Icons section, levers or preview (the owner's
 *  QA-I10, 2026-10-02); the owner's answer gives this description to Surfaces & fills' Icon section, which a
 *  separate change restyles, so it stays here for that change to read. */
export const ICONS_DESC = 'The icon color set by the icon contrast floor: matches text at 4.5:1, or held to the 3:1 non-text floor.';
/** The Disabled copy, the Style guide's own, shared by the shared Disabled section and the levers' (Q23, Q51). */
export const DISABLED_DESC = 'One shared, stateless inert set — reused by every control. No per-palette or inverse variant.';
/** The Interactive levers section's intro (owner decision Q53, APPROVED). */
export const BUTTON_SETS_DESC = 'Each button set is a full set of fill, text, border and state colors.';
/** Surfaces & fills' Background copy (S4f), shared by the levers' Background fills section and the preview's
 *  Background section there (Q23): the owner's Q26 intro, APPROVED, now that the scrim has its own section
 *  (QA-B10). The Style guide's own Background section keeps its longer sentence, scrim included. */
export const BACKGROUND_FILLS_DESC = 'The base page planes and their inverse counterparts.';
/** The Scrim copy (S4f, QA-B10, APPROVED), shared by the levers' Scrim section and the preview's (Q23). */
export const SCRIM_DESC = "The overlay that dims the page behind a modal. It isn't editable.";
/** The Fields copy (Q29, APPROVED), shared by the levers' Fields section and, since S4f (#2016, Q80), the preview's. */
export const FIELDS_DESC = 'Form field fills, borders and text, in every state.';
/** The Faces copy (S6.2), shared by the Type levers' Faces section and the preview's Faces section (Q23). DRAFT:
 *  pending the owner's approval. */
export const FACES_DESC = 'The font families in the brand, and the family each text type uses.';

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
  /** The page's color-role families (V2): role-path prefixes, so every emitted color role has one page.
   *  Color's Surfaces & fills and Interactive only. The Roles matrix that was to draw them is not built (owner
   *  decision Q31, folded into #1969); `test-pages.ts` still holds the coverage. */
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
        // The intro and the Background fills, Scrim and Fields copy are the owner's (Q26, Q27, Q29, QA-B10). Background
        // fills' description and "Text color" are the preview sections' own (Q23: a lever heading and description match
        // the preview section); since S4f the scrim has its own section, levers and preview, so Background fills is
        // back to the Q26 intro.
        // Foreground and Text color take the preview's heading and description verbatim too (Q23, the owner's
        // approval of 2026-10-02): `preview/sections/foreground.ts` and `text-color.ts`. `test:chrome` reads
        // each against the rendered preview section, so an edit to one side alone fails.
        id: 'fills', label: 'Surfaces & fills', home: 'surfaces', intro: 'Background and foreground fills, text, fields and gradients: the colors every page is built on.',
        // `field` and `inverse.field` moved here from Interactive with the Fields section (owner decision Q29).
        roles: ['text', 'icon', 'background', 'foreground', 'border', 'scrim', 'veil', 'inverse', 'field', 'inverse.field'],
        sections: [
          // S4f (QA-B10): the scrim left Background fills for its own read-only section, so Background fills' description
          // dropped its scrim clause (the owner's Q26 intro again), as the preview's Background section's did (Q23).
          { title: 'Background fills', desc: BACKGROUND_FILLS_DESC, rows: [{ ctl: 'surfaces', keys: ['surfaces'], drive: 'surface' }] },
          { title: 'Scrim', desc: SCRIM_DESC, rows: [{ ctl: 'scrim' }] },
          // S4d (owner decision Q44): the neutral ladder in its own section, the approved heading with the preview's
          // Foreground description (Q23). The fills keep Foreground fills.
          { title: 'Foreground', desc: 'Content surfaces placed ON the page — the neutral and inverse ladders, plus semantic fills in bold and subtle weights, each paired with its on-surface text.', rows: [{ ctl: 'foreground', schemaOnly: ['overrides'] }] },
          { title: 'Foreground fills', desc: 'Auto follows the contrast-gated default. A pick below its floor is marked, not blocked.', rows: [{ ctl: 'fills', schemaOnly: ['overrides'] }] },
          // NOT CONCEPT V6'S (S4a): the legacy page's text inks, as rows like the fills. These rows are the
          // permanent, primary text editor (owner decision Q20, `decisions-2026-10-01-qa.md`, replacing v6's
          // R3). The Roles matrix that was to sit beside them is not built (Q31).
          { title: 'Text color', desc: 'Every text color at one size, shown on the current surface and its inverse counterpart. On-color text lives with the fills above.', rows: [{ ctl: 'text', schemaOnly: ['overrides'] }] },
          // S4d (Q49, Q50): the borders and the icons, page and inverse, as rows, headed and described as the preview's
          // Border and Icon sections are (Q23). The Icon section's rows are locked while icons match text.
          { title: 'Border', desc: 'Neutral separators, the focus ring, and semantic borders — their own category, not a surface.', rows: [{ ctl: 'border', schemaOnly: ['overrides'] }] },
          // `iconContrast` is homed here since S5.3 (the owner's QA-I10): Interactive dropped its icon contrast control,
          // and this section's Unpair and Pair buttons are the control that writes it now.
          { title: 'Icon', desc: 'Icon color at the neutral tiers, the semantic set, and the on-color icons that sit on bold fills.', rows: [{ ctl: 'icon', keys: ['iconContrast'], schemaOnly: ['overrides'] }] },
          // NOT CONCEPT V6'S (S4c): every field role, page and inverse, as rows (owner decision Q29, #1962).
          { title: 'Fields', desc: FIELDS_DESC, rows: [{ ctl: 'fields', schemaOnly: ['overrides'] }] },
          { title: 'Gradients', rows: [{ ctl: 'gradients', keys: ['gradients'] }] },
        ],
        // S4a: moved. Its levers are `domains/color-fills.ts`, its preview `preview/surfaces.ts`.
        status: 'new',
        legacy: [],
      },
      {
        id: 'interactive', label: 'Interactive', home: 'interactive', intro: 'How actions, links and disabled states draw from the palettes, and the floors they meet.',
        roles: ['interactive', 'inverse.interactive', 'text.link', 'icon.link', 'inverse.text.link', 'inverse.icon.link', 'disabled', 'inverse.disabled'],
        // NOT CONCEPT V6'S (S5.2, owner decision Q51): the sections are the preview's, Interactive, Disabled and
        // Links. v6's Actions and Interactive palettes are Interactive; its Legibility splits into Disabled and
        // Icons, and S5.3 removed Icons (the owner's QA-I10): `iconContrast` is homed on Surfaces & fills' Icon.
        sections: [
          {
            title: 'Interactive', desc: BUTTON_SETS_DESC, rows: [
              // The page-wide settings first, the strict switch with them (S5.3, the owner's QA-I5).
              { ctl: 'palette', keys: ['actionPalette'], drive: 'action' },
              { ctl: 'enum', keys: ['outlineInteraction'], drive: 'action' },
              { ctl: 'toggle', keys: ['strictInteractiveContrast'], drive: 'inverse' },
              // S5.2: every per-column color is a row here (owner decision Q33), so the row also edits overrides.
              // S5.3: the row also draws `neutralEmphasis`, at the top of the Neutral button set (the owner's QA-I6).
              { ctl: 'interactivePalettes', keys: ['interactivePalettes', 'neutralEmphasis'], schemaOnly: ['modeAnchors', 'overrides'], drive: 'action' },
            ],
          },
          {
            // S5.3 (the owner's QA-I8): the disabled contrast is the "Full contrast" switch, and the floor chips show
            // only while it is off.
            title: 'Disabled', desc: DISABLED_DESC, rows: [
              { ctl: 'disabledSwitch', keys: ['disabledStrategy'], drive: 'disabled' },
              { ctl: 'disabledMin', keys: ['disabledMin'], drive: 'disabled' },
            ],
          },
          {
            // NOT CONCEPT V6'S (S5.2): a description, the preview's Links section's own (owner decision Q23:
            // the levers and the preview section they drive say the same thing).
            title: 'Links', desc: LINKS_DESC, rows: [
              { ctl: 'palette', keys: ['linkPalette'], drive: 'link' },
              { ctl: 'linkStateRungs', keys: ['linkStateRungs'], drive: 'link' },
              // S5.2: the four link families' resting link, pinned per mode (#1510). Links are edited only here
              // (owner decision Q28, #1961).
              { ctl: 'linkFamilies', schemaOnly: ['overrides'], drive: 'link' },
            ],
          },
        ],
        // S5.2: moved. Its levers are `domains/color-interactive.ts`, its preview `preview/interactive.ts`.
        status: 'new',
        legacy: [],
      },
    ],
  },
  {
    // The intro is v6's with "category" swapped for "text type" (owner decision Q70's plain words); the Faces
    // description is the preview's Faces section's (Q23). Both DRAFT, pending the owner.
    id: 'type', label: 'Type', home: 'type', intro: 'Font families per text type, then the heading scale they sit on.',
    sections: [
      { title: 'Font families', desc: FACES_DESC, rows: [{ ctl: 'library', schemaOnly: ['typography.typefaceLibrary'] }, { ctl: 'families', keys: ['typography.families'] }] },
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
    // S6.2: moved. Its levers are `domains/type.ts` (Faces, then the legacy Text styles controls lent until S6.3),
    // its preview `preview/type.ts`.
    status: 'new',
    legacy: [],
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
