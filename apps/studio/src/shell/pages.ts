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
 * NO LEGACY PAGES. Each tab once showed legacy pages in a full-width legacy frame (D1) until its slice moved it
 * (S2: Color › Palettes; S3: Brand; S4a: Color › Surfaces & fills; S5.2: Color › Interactive; S6.2: Type; S7: Shape;
 * S9.2: Depth & motion; S10: Layout; S8.2: Components, the last tab). The last legacy page, the plugin's old Style
 * guide behind the Pages menu, went in H12 (#2289, owner PG1 A), and the `legacy` lists, the legacy frame and the
 * Pages menu went with it. The store's `page` holds a moved page's id (`NewPageKey`) or a menu page's (`MenuPageKey`).
 * `status` is `new` on every page; it is kept as the field `NewPageKey` is derived from.
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
/** Surfaces & fills' Foreground copy (#1971; APPROVED, owner 2026-10-05, superseding GR3), shared by the levers' Foreground section
 *  and the preview's Foreground section there (Q23). That preview section sits on the contrast floor, not the page, so
 *  its sentence says so. The Style guide's own Foreground section keeps its sentence ("placed ON the page"). */
export const FOREGROUND_FILLS_DESC = "Content surfaces, shown on the contrast floor they're measured against.";
/** The Scrim copy (S4f, QA-B10, APPROVED), shared by the levers' Scrim section and the preview's (Q23). */
export const SCRIM_DESC = "The overlay that dims the page behind a modal. It isn't editable.";
/** The Fields copy (Q29, APPROVED), shared by the levers' Fields section and, since S4f (#2016, Q80), the preview's. */
export const FIELDS_DESC = 'Form field fills, borders and text, in every state.';
/** The Faces copy (S6.2), the preview's Font families section's. The Type levers drew it too until TY1 A split their
 *  section in two (HP2, 2026-10-06). DRAFT: pending the owner's approval. */
export const FACES_DESC = 'The font families in the brand, and the family each text type uses.';
/** The Type sections' copy (S6.3), each shared by the levers section and the preview section that pairs with it
 *  (owner decision Q23; Scale limits pairs with the preview's Scale, `PREVIEW_HEADING` in `preview/follow-edit.ts`).
 *  APPROVED (owner, 2026-10-03, #2036). */
export const SCALE_DESC = 'The size of each heading style on desktop and mobile, and the scale they step along.';
export const SCALE_LIMITS_DESC = 'Where the heading scale starts and stops, and whether headings scale between mobile and desktop.';
export const WEIGHTS_DESC = 'The weight behind each name, the weights each text type ships, and its italic and link styles.';
export const SPACING_DESC = 'The step each line height and letter spacing name uses, and how far each text type moves from it.';
/** The Depth & motion sections' copy (S9.2), each shared by the levers section and the preview section that pairs with
 *  it (owner decision Q23; Shadow tint pairs with the preview's Elevation). APPROVED (owner, 2026-10-04). */
export const ELEVATION_DESC = 'How soft the shadows are. Dark modes get lighter shadows automatically.';
export const MOTION_DESC = 'How fast things move, and the curve each kind of motion follows.';
export const SHADOW_TINT_DESC = 'Shifts the shadow color off pure black, toward a hue.';
/** The Shape sections' copy (S7), each shared by the levers section and the preview section that pairs with it
 *  (Q23; Base radius pairs with the preview's Radius, `PREVIEW_HEADING`). Density's and Radius' are APPROVED (owner,
 *  2026-10-04); Base radius' is DRAFT, pending the owner (the approved draft named "an optional 1px corner", which
 *  #2053 retired). */
export const DENSITY_DESC = 'How tall controls are. Each component sets its own padding.';
export const RADIUS_DESC = 'How round corners are, and the shape of buttons and other pill-able controls.';
export const BASE_RADIUS_DESC = 'The medium radius at standard softness. Every other radius size is a multiple of it.';

/** The Layout sections' copy (S10), each shared by the levers section and the preview section it pairs with (owner
 *  decision Q23). APPROVED (owner, S10 scope). */
export const BREAKPOINTS_DESC = 'Where each layout starts. Names follow the count.';
export const GRID_DESC = 'Columns, gutter and margin for each breakpoint. Auto follows the default steps.';
export const CONTAINERS_DESC = 'Content stretches up to the maximum width. The content container is narrower, for long text.';
/** Layout's labels the levers and the preview both draw (S10; D16, D17: "Maximum width" for containerMax, and
 *  containerNarrow keeps "Content container"). APPROVED (owner, S10 scope). */
export const LAYOUT_LABELS = { columns: 'Columns', gutter: 'Gutter', margin: 'Margin', max: 'Maximum width', narrow: 'Content container' } as const;

/** The Components sections' copy (S8.2), each shared by the levers section and the preview section it pairs with
 *  (owner decision Q23). DRAFT, pending the owner's approval (the S8.2 PR's "Copy for owner approval" block). */
// #2905 Q10 A: wireframe v2's words, now that the Buttons section lists which buttons the options change.
export const BUTTON_DESC = 'How buttons place their icons, size and weight their label, and set their minimum width. Icon buttons are not affected.';
// #2952: the second sentence is wireframe v2's Q5 A words, approved as drafted (owner decision Q601 A).
export const FIELD_DESC = 'How Text field, Password field, Select and Textarea draw their edge. Search field has its own setting below.';
// #2905 Q10 A: wireframe v2's words for Search options (#2952).
export const SEARCH_DESC = 'How Search field draws its edge, apart from the other fields.';
// #2905 Q10 A: wireframe v2's words, as Field options' and Button options' are.
export const TAG_DESC = 'How tags draw their shape.';
// #2958: DRAFT for the owner (Q1 on #2958), in Tag's pattern.
export const DIALOG_DESC = 'How dialogs size their title.';
// #2924: DRAFT for the owner (Q2 on #2924), the wireframe's section line.
export const BANNER_DESC = 'How banners draw their surface and edge.';
// #2909 Q2909.4 A: DRAFT for the owner (Q2909.10 A), after the round-4 wireframe's block.
export const SHARED_DESC = 'Settings every component family follows. Density is set in Theme.';
export const SETS_DESC = 'Every component set the engine defines, with what each contains and its spacing at your density.';

/** Which host a legacy page list applies to. Components mapped to a different legacy page per host until S8.2 (§4). */
export type Host = 'web' | 'figma';

/** The views a page can call home, with their titles (the preview header shows the title). */
export const VIEWS = [
  ['guide', 'Style guide'], ['palettes', 'Palettes'], ['surfaces', 'Surfaces & fills'], ['interactive', 'Interactive'],
  ['type', 'Type'], ['shape', 'Size & shape'], ['depth', 'Depth & motion'], ['layout', 'Layout'], ['comps', 'Components'],
] as const;
/** The views behind Inspect (F1). They open over any page's preview and are never a page's home. The Decisions log, the
 *  third, was cut (#2909 Q2909.7 A). */
export const INSPECT = [['contrast', 'Contrast'], ['tokens', 'Tokens']] as const;
/** Where the web bar's Docs link points: the docs landing page (#2637, owner decision Q384 A), which replaced Inspect's
 *  Docs item and its target, the guides' index (#2662). The site serves the repo's `docs/public/` at `/docs`, so this is
 *  `docs/public/index.html`; the site build requires it. The trailing slash keeps the page's relative links inside
 *  `/docs/`. */
export const DOCS_HREF = '/docs/';

export type ViewId = (typeof VIEWS)[number][0];
export type InspectId = (typeof INSPECT)[number][0];

/** One row of the levers panel: its control, the manifest keys it edits, and the schema inputs it edits
 *  that are not manifest levers. `drive` names the preview part the row drives (Q4, deferred). */
export type Row = { readonly ctl: string; readonly keys?: readonly string[]; readonly schemaOnly?: readonly string[]; readonly drive?: string };
export type Section = { readonly title: string; readonly desc?: string; readonly advanced?: boolean; readonly rows: readonly Row[] };
/** A page: a tab without sub-pages, or a sub-page. */
export type PageData = {
  readonly id: string; readonly label: string; readonly home: ViewId; readonly intro: string;
  readonly sections: readonly Section[];
  /** The page's color-role families (V2): role-path prefixes, so every emitted color role has one page.
   *  Color's Surfaces & fills and Interactive only. The Roles matrix that was to draw them is not built (owner
   *  decision Q31, folded into #1969); `test-pages.ts` still holds the coverage. */
  readonly roles?: readonly string[];
  /** `new` on every page since the last slice moved its tab: the page draws the two panes from its own modules
   *  (`NEW_PAGES` in `frame.ts`). */
  readonly status: 'new';
};
/** A tab. Either it is a page itself, or it holds sub-pages and has no home or sections of its own. */
export type Domain = PageData | { readonly id: string; readonly label: string; readonly subpages: readonly PageData[] };

export const DOMAINS = [
  {
    id: 'brand', label: 'Brand', home: 'guide', intro: 'Who the brand is: its name, its namespace, its character and the modes it ships in.',
    sections: [
      { title: 'Identity', rows: [{ ctl: 'identity', schemaOnly: ['name', 'root'] }] },
      { title: 'Personality', desc: 'Each word fills settings you have not set yet. Settings you set win.', rows: [{ ctl: 'personality', schemaOnly: ['personality'] }] },
      { title: 'Modes', rows: [{ ctl: 'modes', schemaOnly: ['modes', 'customModes'] }] },
    ],
    // S3: moved. Its levers are `domains/brand.ts`, its preview `preview/brand.ts` (the Style guide, lent).
    status: 'new',
  },
  {
    id: 'color', label: 'Color', subpages: [
      {
        id: 'palettes', label: 'Palettes', home: 'palettes', intro: 'The ramps every color role draws from. Your colors are pinned as anchors, never shifted.',
        sections: [
          { title: 'Primary', rows: [{ ctl: 'primary', keys: ['primary'] }] },
          { title: 'Brand colors', desc: 'Each color grows into its own 20-step ramp.', rows: [{ ctl: 'brandColors', keys: ['brandColors'] }] },
          // #2175 (owner, PN1 B): pinning is the third neutral source, so the pinned neutral lives here, not behind Show advanced.
          { title: 'Neutrals', rows: [{ ctl: 'neutral', keys: ['neutral.hue', 'neutral.chroma', 'neutral.anchor'] }] },
          {
            title: 'Status colors', advanced: true, rows: [
              { ctl: 'status', keys: ['status.success'] }, { ctl: 'status', keys: ['status.warning'] },
              { ctl: 'status', keys: ['status.danger'] }, { ctl: 'status', keys: ['status.info'] },
            ],
          },
        ],
        // S2: moved. Its levers are `domains/color-palettes.ts`, its preview `preview/palettes.ts`.
        status: 'new',
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
        roles: ['text', 'icon', 'background', 'foreground', 'border', 'scrim', 'glass', 'veil', 'inverse', 'field', 'inverse.field'],
        sections: [
          // S4f (QA-B10): the scrim left Background fills for its own read-only section, so Background fills' description
          // dropped its scrim clause (the owner's Q26 intro again), as the preview's Background section's did (Q23).
          { title: 'Background fills', desc: BACKGROUND_FILLS_DESC, rows: [{ ctl: 'surfaces', keys: ['surfaces'], drive: 'surface' }] },
          { title: 'Scrim', desc: SCRIM_DESC, rows: [{ ctl: 'scrim' }] },
          // S4d (owner decision Q44): the neutral ladder in its own section, the approved heading with the preview's
          // Foreground description (Q23; since #1971 the floor's sentence, FOREGROUND_FILLS_DESC). The fills keep Foreground fills.
          { title: 'Foreground', desc: FOREGROUND_FILLS_DESC, rows: [{ ctl: 'foreground', schemaOnly: ['overrides'] }] },
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
      },
    ],
  },
  {
    // The intro is v6's with "category" swapped for "text type" (owner decision Q70's plain words); the Faces
    // description is the preview's Faces section's (Q23). Both DRAFT, pending the owner.
    id: 'type', label: 'Type', home: 'type', intro: 'Font families per text type, then the heading scale they sit on.',
    sections: [
      // TY1 A (#2190) and HP2 (owner approval 2026-10-06): the library and the family for each text type are two sections,
      // each titled by its lever's own name (`TYPE_COPY` in `domains/type.ts`), so nothing is renamed. The old "Font
      // families" title and its description are dropped from the levers; the preview's Font families section keeps both.
      { title: 'Typeface library', rows: [{ ctl: 'library', schemaOnly: ['typography.typefaceLibrary'] }] },
      { title: 'Font family for each text type', rows: [{ ctl: 'families', keys: ['typography.families'] }] },
      // S6.3: Individual sizes sits in Scale behind its Show advanced (Q63, Q64); the brand-wide sizes, the mobile
      // pins and each mode's sizes are schema inputs, not manifest levers.
      { title: 'Scale', desc: SCALE_DESC, rows: [{ ctl: 'typeScale', keys: ['typography.typeScale'] }, { ctl: 'sizes', schemaOnly: ['typography.sizes', 'typography.sizeOverrides'] }] },
      {
        title: 'Scale limits', desc: SCALE_LIMITS_DESC, advanced: true, rows: [
          { ctl: 'responsive', keys: ['typography.responsive'] },
          { ctl: 'displayCeiling', keys: ['typography.displayCeiling'] },
          { ctl: 'titleFloor', keys: ['typography.titleFloor'] },
          { ctl: 'floorChips', keys: ['typography.captionFloor'] },
          { ctl: 'floorChips', keys: ['typography.sizeFloor'] },
        ],
      },
      {
        title: 'Weights and styles', desc: WEIGHTS_DESC, advanced: true, rows: [
          { ctl: 'weightRoles', keys: ['typography.weightRoles'] },
          { ctl: 'weights', keys: ['typography.weights', 'typography.links'] },
          { ctl: 'italics', keys: ['typography.italics', 'typography.italicDefault'] },
          // S6.3: Pin a font cut (Q64), a schema input.
          { ctl: 'facePins', schemaOnly: ['typography.faces'] },
        ],
      },
      // S6.3, NOT CONCEPT V6'S (owner decision Q64, C3: keep every legacy control): the line height and letter
      // spacing bindings, each mode's swaps, and each text type's nudges. Schema inputs, not manifest levers.
      {
        title: 'Line height and letter spacing', desc: SPACING_DESC, advanced: true, rows: [
          { ctl: 'lineHeights', schemaOnly: ['typography.lineHeights'] },
          { ctl: 'letterSpacings', schemaOnly: ['typography.letterSpacings'] },
          { ctl: 'nudges', schemaOnly: ['typography.leadingShift', 'typography.trackingShift'] },
        ],
      },
    ],
    // S6.2: moved; S6.3 retired the lent legacy region. Its levers are `domains/type.ts`, its preview `preview/type.ts`.
    status: 'new',
  },
  {
    // S7: the owner's names (E2, 2026-10-04: "Radius" in names and headings, overriding D16's swap to "corner"); the
    // intro, Density's and Radius' descriptions are APPROVED, Base radius' is DRAFT. `radiusHairline` has no row: the
    // engine retired it (#2053, `Lever.deprecated` in the manifest), and `test-pages.ts` holds that a deprecated
    // lever has no home rather than reading a hand list. Field style (#2695) is not here: it is a component setting, and
    // its home is Components › Field (owner decision Q578, #2905), with no line pointing to it. Tag style (#2887) left
    // the same way, for Components › Tag (Q578 part 2, A on #2931's wireframe), and Search field style (#2888) for
    // Components › Search, its Search options block (#2905 Q5 A, #2952).
    id: 'shape', label: 'Shape', home: 'shape', intro: 'Control heights and corners. Padding is set per component.',
    sections: [
      { title: 'Density', desc: DENSITY_DESC, rows: [{ ctl: 'chips', keys: ['density'], drive: 'size' }] },
      // #2909 Q2909.4 A: Control shape writes no token, only component geometry, so its one home is Components' shared
      // block; here it is a read-only line under Radius whose link opens it.
      { title: 'Radius', desc: RADIUS_DESC, rows: [{ ctl: 'slider', keys: ['radiusScale'], drive: 'radius' }, { ctl: 'controlShapeLink' }] },
      { title: 'Base radius', desc: BASE_RADIUS_DESC, advanced: true, rows: [{ ctl: 'valuePicker', keys: ['baseMd'], drive: 'radius' }] },
    ],
    // S7: moved. Its levers are `domains/shape.ts`, its preview `preview/shape.ts`.
    status: 'new',
  },
  {
    // S9.2: moved. One page and one preview for both topics (V4, owner decision v5 Q3): Elevation then Motion. The
    // intro and the two section descriptions are APPROVED (owner, 2026-10-04); each lever section and the preview
    // section it pairs with share their heading and description (Q23). Shadow tint stays its own advanced section
    // here, the manifest's tier, but the levers draw it INSIDE Elevation behind its own Show advanced (owner decision
    // D8 A), so its edits reveal the preview's Elevation, the lever section they are made in (QA-B9).
    id: 'depth', label: 'Depth & motion', home: 'depth', intro: 'Shadow character, then motion tempo. One preview holds both.',
    sections: [
      { title: 'Elevation', desc: ELEVATION_DESC, rows: [{ ctl: 'slider', keys: ['shadow.softness'], drive: 'elev' }] },
      { title: 'Motion', desc: MOTION_DESC, rows: [{ ctl: 'enum', keys: ['motionPersonality.tempo'], drive: 'motion' }, { ctl: 'easing', schemaOnly: ['motionPersonality.easingRoles'] }] },
      { title: 'Shadow tint', desc: SHADOW_TINT_DESC, advanced: true, rows: [{ ctl: 'tint', keys: ['shadow.tint'], drive: 'elev' }] },
    ],
    // Its levers are `domains/depth.ts`, its preview `preview/depth.ts`.
    status: 'new',
  },
  {
    // S10: the intro is v6's with "column" taken out (owner decision D11: "columns" is for the grid only); the section
    // descriptions are the owner's, and each is also its preview section's (Q23). APPROVED (owner, S10 scope, D11–D17).
    id: 'layout', label: 'Layout', home: 'layout', intro: 'Breakpoints, the grid and content widths.',
    sections: [
      { title: 'Breakpoints', desc: BREAKPOINTS_DESC, rows: [{ ctl: 'breakpoints', keys: ['layout.breakpoints'] }] },
      // D12: each breakpoint's gutter and margin sit beside its columns, as Auto or a spacing step. Schema inputs.
      { title: 'Grid', desc: GRID_DESC, rows: [{ ctl: 'columns', keys: ['layout.columns'] }, { ctl: 'gridOverrides', schemaOnly: ['layout.columnOverrides', 'layout.gutterOverrides', 'layout.marginOverrides'] }] },
      { title: 'Containers', desc: CONTAINERS_DESC, rows: [{ ctl: 'slider', keys: ['layout.containerMax'] }, { ctl: 'slider', keys: ['layout.containerNarrow'] }] },
    ],
    // S10: moved. Its levers are `domains/layout.ts`, its preview `preview/layout.ts`.
    status: 'new',
  },
  {
    // S8.2: moved, one page on both hosts (owner decisions G2, G5, G6 A). Redrawn by #2700 (the owner's approved
    // wireframe, every call A): the levers pane draws the list of sets, grouped by Figma page, and the action bar
    // (`domains/components.ts`, its intro `GROUPS_COPY.intro`); the preview pane draws the focused family, where the
    // Button options now sit with the Buttons family (`preview/components.ts`, `domains/button-options.ts`). The
    // sections stay in this data so every lever keeps one home (`test-pages.ts`): Button's keys are drawn in the preview
    // pane's Buttons block, Field's and Search's in the Fields section's two blocks and
    // Tag's in the Tag section's (#2905, #2952), the sets by the list.
    id: 'components', label: 'Components', home: 'comps', intro: 'The component sets the engine defines, in families. A build places each on its page in this file.',
    sections: [
      // #2909 Q2909.4 A (v2's lever-home table): the shared block, first. Control shape's one home; Density shows as its
      // read-only line, its home Theme › Shape (`domains/shared-options.ts`).
      { title: 'Shared by every component', desc: SHARED_DESC, rows: [{ ctl: 'densityLink' }, { ctl: 'chips', keys: ['controlShape'], drive: 'shape' }] },
      {
        title: 'Button', desc: BUTTON_DESC, rows: [
          { ctl: 'densityLink' },
          { ctl: 'enum', keys: ['buttonIcons'], drive: 'button' },
          { ctl: 'enum', keys: ['buttonContentSize'], drive: 'button' },
          { ctl: 'enum', keys: ['buttonLabelWeight'], drive: 'button' },
          // #2909 Q2909.4 A: the weights' read-only line (their home Theme › Type), under Control label weight.
          { ctl: 'weightsLink' },
          { ctl: 'enum', keys: ['buttonTextHover'], drive: 'button' },
          // #2909 Q2909.4 A: Outline hover's read-only line (its home Theme › Color › Interactive).
          { ctl: 'outlineLink' },
          { ctl: 'slider', keys: ['buttonMinWidthMultiplier'], drive: 'button' },
        ],
      },
      // #2905 Q578 B: Field style's one home. It is drawn in the Fields section's Field options block
      // (`domains/field-options.ts`), and nowhere else.
      { title: 'Field', desc: FIELD_DESC, rows: [{ ctl: 'chips', keys: ['fieldStyle'], drive: 'field' }] },
      // #2905 Q5 A (#2952): Search field style's one home, drawn in the Fields section's Search options block, below
      // Field options (`domains/search-options.ts`).
      { title: 'Search', desc: SEARCH_DESC, rows: [{ ctl: 'chips', keys: ['searchFieldStyle'], drive: 'search' }] },
      // Q578 part 2 (A): Tag style's one home, drawn in the Tag section's Tag options block (`domains/tag-options.ts`).
      { title: 'Tag', desc: TAG_DESC, rows: [{ ctl: 'chips', keys: ['tagStyle'], drive: 'tag' }] },
      // #2958: Dialog title size's one home, drawn in the Dialog section's Dialog options block (`domains/dialog-options.ts`).
      { title: 'Dialog', desc: DIALOG_DESC, rows: [{ ctl: 'chips', keys: ['dialogTitleSize'], drive: 'dialog' }] },
      // #2924: Banner style's one home, drawn in the Banner section's Banner options block (`domains/banner-options.ts`).
      { title: 'Banner', desc: BANNER_DESC, rows: [{ ctl: 'chips', keys: ['bannerStyle'], drive: 'banner' }] },
      { title: 'Component sets', desc: SETS_DESC, rows: [{ ctl: 'sets' }] },
    ],
    status: 'new',
  },
] as const satisfies readonly Domain[];

/** Pages no tab shows, each drawn by the shell in its own full-width layout with no tab selected. Since IA v2 phase 1
 *  (#2909, owner decisions of 2026-10-24) these are the plugin rail's two areas of their own: Documentation (Q667 A;
 *  `shell/documentation.ts`, which took in the Figma menu's old Build style guides page) and Export. */
export const MENU_PAGES = ['documentation', 'export'] as const;
export type MenuPageKey = (typeof MENU_PAGES)[number];
export const isMenuPage = (k: string): k is MenuPageKey => (MENU_PAGES as readonly string[]).includes(k);

// ── types derived from the data ────────────────────────────────────────────────────────────────────
type DomainT = (typeof DOMAINS)[number];
type SubOf<D> = D extends { readonly subpages: readonly (infer S)[] } ? S : never;
type PageT = Exclude<DomainT, { readonly subpages: unknown }> | SubOf<DomainT>;

/** The tabs (IA-1). */
export type TabId = DomainT['id'];
/** Color's sub-pages. */
export type ColorSubId = SubOf<DomainT>['id'];
/** The pages a slice has moved (`status: 'new'`), by id. Derived, so it grows as each slice moves one. */
export type NewPageKey = Extract<PageT, { readonly status: 'new' }>['id'];
/** What the store's `page` holds: a moved page by its id, or a page a menu opens. */
export type PageKey = NewPageKey | MenuPageKey;

/** A place the tab row can select: a tab, or a Color sub-page. */
export type Place = { readonly tab: TabId; readonly sub?: ColorSubId };

const domainOf = (id: TabId): Domain => DOMAINS.find((d) => d.id === id)!;
const subsOf = (d: Domain): readonly PageData[] | null => ('subpages' in d ? d.subpages : null);

/** The page a place is: the tab itself, or its sub-page. Null for a tab with sub-pages and no sub given. */
export const pageOf = (p: Place): PageData | null => {
  const d = domainOf(p.tab);
  const subs = subsOf(d);
  if (subs) return subs.find((s) => s.id === p.sub) ?? null;
  return d as PageData;
};

/** The moved pages' ids, from the data. */
export const NEW_PAGE_KEYS: readonly NewPageKey[] = (DOMAINS as readonly Domain[])
  .flatMap((d) => ('subpages' in d ? d.subpages : [d as PageData]))
  .filter((p) => p.status === 'new').map((p) => p.id as NewPageKey);
/** Is `k` a moved page (drawn in the two panes), rather than a legacy page? */
export const isNewPage = (k: PageKey): k is NewPageKey => (NEW_PAGE_KEYS as readonly string[]).includes(k);
/** The moved page a place is (every place is one since H12), or null for a place that names no page. */
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

/** The place that shows `page`, for a page change that did not come from the tab row (a Continue button, a brand
 *  load). Null for a page a menu opens (the Figma menu's Build style guides), which no place shows. */
export const placeOfPage = (page: PageKey): Place | null => {
  if (isMenuPage(page)) return null;
  return PLACES.find((p) => newPageOf(p) === page) ?? null;
};

/** The page a tab opens (S7: "Continue to Depth & motion" and Shape's "See Components" route by tab). */
export const pageOfTab = (id: TabId): PageKey => newPageOf(placeOfTab(id))!;

/** Stable id for a place, used in element ids and hooks: `brand`, `color-palettes`. */
export const placeId = (p: Place): string => (p.sub ? `${p.tab}-${p.sub}` : p.tab);

/** A place's one home view (V1). */
export const homeOf = (p: Place): ViewId => pageOf(p)!.home;

/** A view's or an Inspect view's title. */
export const viewLabel = (v: ViewId | InspectId): string =>
  ([...VIEWS, ...INSPECT] as readonly (readonly [string, string])[]).find(([id]) => id === v)![1];

// ── the rail (#2909 IA v2; both hosts since phase 2, Q2909.9 A) ─────────────────────────────────────────────────────────────────────────────
/** The rail's areas, in order (owner decision of 2026-10-24): Theme · Components · Documentation · Export. Labels are the
 *  owner's (Q2909.20 A, Chunk 2, 2026-10-24): one word under each icon, so
 *  Documentation is "Docs" on the rail and "Documentation" in its own header. */
export const RAIL_AREAS = [
  { id: 'theme', label: 'Theme', name: 'Theme', glyph: 'swatches' },
  // A hyphen, so the word breaks as "Compo-nents" in the 60px column (the wireframe's own break): the face has no soft hyphen, and the word never fits one line there. The tile's name stays whole.
  { id: 'components', label: 'Compo-nents', name: 'Components', glyph: 'diamonds' },
  { id: 'documentation', label: 'Docs', name: 'Documentation', glyph: 'page' },
  { id: 'export', label: 'Export', name: 'Export', glyph: 'send' },
] as const;
export type AreaId = (typeof RAIL_AREAS)[number]['id'];
export type RailArea = (typeof RAIL_AREAS)[number];
/** The areas a host's rail shows (Q2909.9 A): every one in the plugin; Theme, Components and Export on the web, which has
 *  no Figma file to document. */
export const railAreas = (host: Host): readonly RailArea[] => (host === 'figma' ? RAIL_AREAS : RAIL_AREAS.filter((a) => a.id !== 'documentation'));
/** The area a page belongs to: Components' own page, a menu page by its name, and every other page Theme's. */
export const areaOfPage = (page: PageKey): AreaId => (page === 'components' ? 'components' : isMenuPage(page) ? page : 'theme');
/** Theme's pages as a tab row on the rail (Q2909.1 A, Q2909.21 A): every tab but Components, which is a rail area. */
export const THEME_TABS = TABS.filter((t) => t.id !== 'components');

/** Documentation's tabs (Q2909.21 A), in order; a select at the narrow tier, as Theme's are. Specs is a placeholder for
 *  #2830. Labels are the round-4 drafts (Q2909.10 A). */
export const DOC_TABS = [
  { id: 'guides', label: 'Style guides' },
  { id: 'panels', label: 'Usage panels' },
  { id: 'cover', label: 'Cover' },
  { id: 'specs', label: 'Specs' },
] as const;
export type DocTabId = (typeof DOC_TABS)[number]['id'];
