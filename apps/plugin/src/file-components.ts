/**
 * THE TWO FILE COMPONENTS (#1554) — `_Section-header` and `_Headings`.
 *
 * PLUGIN-ONLY TEMPLATE ASSETS, not engine defs (owner-confirmed): they never go through
 * `packages/engine/components/*.ts`, `index.ts`, `typecheck-components`, or `lint-component-surface`.
 * They are static labeling components a designer drops onto pages by hand, built here by a TARGETED
 * constructor — direct Plugin-API node building — rather than a general Specs-2 interpreter, because
 * there are only two of them (the "simplest thing that works" call in the brief). They are placed on the
 * Sandbox `↳ File Components` page by `file-setup`.
 *
 * WHAT IS AND IS NOT VERIFIED OFFLINE, stated rather than implied — the same posture as
 * `createNodeFromSvg` in `write-components.ts`. The set NAMES, the VARIANT axes, the boolean property and
 * the font-miss reporting are shim-tested (`test-file-setup.ts`). The STRUCTURAL construction — root fills,
 * the cleared Text-container fills, axis-explicit fixed-width/HUG-height sizing, and the per-variant title
 * and description font sizes — is shim-tested by `test-file-components.ts` (#1563), which asserts against
 * numbers transcribed INDEPENDENTLY from the owner's Specs-2 JSON, not read back off this file's tables.
 * What a shim STILL cannot verify is the rendered result: whether Figma actually hugs the height, resolves
 * the requested faces, and lays the children out without overlap — so the owner re-eyeballs in the live
 * host after the fix. The construction spec is the owner's Specs-2 export (issue #1554); the numbers below
 * transcribe it.
 *
 * FONTS ARE LOADED UP FRONT and a miss is REPORTED, never substituted silently (the #237 skip-with-warning
 * posture): a face this Figma lacks (e.g. "Inter Semi Bold") leaves the text in Figma's default face and
 * the run says which face was missing, rather than throwing mid-build.
 */

/** The minimal node surface the constructor writes to — every field OPTIONAL and `unknown`, spanning the
 *  frame/text/component types this file builds, so `ComponentNode`/`TextNode`/`FrameNode` all satisfy it
 *  and the real `figma` factories return it with no cast. The property writes are host-verified, not
 *  type-verified (see the header): this is direct Plugin-API construction, not a typed model. The two
 *  methods use method syntax deliberately (bivariant parameters), so a `SceneNode`-typed `appendChild`
 *  still satisfies the `unknown`-typed one here. */
export interface FNode {
  name?: unknown;
  visible?: unknown;
  characters?: unknown;
  fontName?: unknown;
  fontSize?: unknown;
  lineHeight?: unknown;
  letterSpacing?: unknown;
  textAlignVertical?: unknown;
  paragraphSpacing?: unknown;
  fills?: unknown;
  strokes?: unknown;
  strokeAlign?: unknown;
  strokeWeight?: unknown;
  strokeTopWeight?: unknown;
  strokeRightWeight?: unknown;
  strokeBottomWeight?: unknown;
  strokeLeftWeight?: unknown;
  cornerRadius?: unknown;
  clipsContent?: unknown;
  layoutMode?: unknown;
  primaryAxisSizingMode?: unknown;
  counterAxisSizingMode?: unknown;
  /** In-flow vs. absolute inside an auto-layout parent (#1600). `combineAsVariants` can leave some variant
   *  children at `'ABSOLUTE'`, which piles them on top of each other; `stackVariants` sets `'AUTO'` on every
   *  member so they lay out down the set. Host-verified, not type-verified, like the rest of this surface. */
  layoutPositioning?: unknown;
  /** Axis-EXPLICIT sizing (#1563). Unlike primary/counter (which are relative to `layoutMode`), these name
   *  the real-world axis, so `FIXED` width + `HUG` height reads the same for a VERTICAL or HORIZONTAL root.
   *  Figma resolves them only once the node is an auto-layout frame — set them after `layoutMode`. */
  layoutSizingHorizontal?: unknown;
  layoutSizingVertical?: unknown;
  counterAxisAlignItems?: unknown;
  itemSpacing?: unknown;
  paddingTop?: unknown;
  paddingRight?: unknown;
  paddingBottom?: unknown;
  paddingLeft?: unknown;
  layoutAlign?: unknown;
  layoutGrow?: unknown;
  componentPropertyReferences?: unknown;
  resize?(w: number, h: number): void;
  appendChild?(child: unknown): void;
}

export interface FileComponentsApi {
  createComponent(): FNode;
  createText(): FNode;
  createFrame(): FNode;
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  combineAsVariants(nodes: readonly FNode[], parent: unknown): FNode & {
    addComponentProperty?(name: string, type: string, defaultValue: string | boolean): string;
  };
}

export interface FileComponentsResult {
  built: string[];
  /** Faces the host could not load — reported, not fatal. */
  fontMisses: string[];
}

const INTER = 'Inter';
const REGULAR = { family: INTER, style: 'Regular' };
const BOLD = { family: INTER, style: 'Bold' };
const SEMIBOLD = { family: INTER, style: 'Semi Bold' };

const rgb = (hex: string): { r: number; g: number; b: number } => {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
};
const solid = (hex: string): unknown[] => [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: rgb(hex) }];
const px = (value: number): { value: number; unit: 'PIXELS' } => ({ value, unit: 'PIXELS' });
const fontKey = (f: { family: string; style: string }): string => `${f.family} ${f.style}`;

/** A typography spec for one text node. */
interface TypeSpec {
  font: { family: string; style: string };
  size: number;
  /** Line height in px. */
  lineHeight: number;
  /** Letter spacing in px. */
  letterSpacing: number;
  color: string;
  text: string;
  alignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  paragraphSpacing?: number;
}

/**
 * Build a text node to a spec, choosing the loaded face (or the loaded fallback, with a miss recorded).
 * Never throws on a missing face — Figma requires the node's current font loaded before `characters` is
 * set, so an unloadable requested face falls back to whatever loaded, and the miss says which.
 */
const makeText = (
  api: FileComponentsApi,
  spec: TypeSpec,
  loaded: Set<string>,
  fontMisses: string[],
): FNode => {
  const t = api.createText();
  const wanted = fontKey(spec.font);
  let face = spec.font;
  if (!loaded.has(wanted)) {
    fontMisses.push(`${wanted} unavailable — used ${fontKey(REGULAR)} for "${spec.text}"`);
    face = REGULAR;
  }
  // If even the fallback did not load, leave the node's default font and skip characters rather than throw.
  if (loaded.has(fontKey(face))) {
    t.fontName = { family: face.family, style: face.style };
    t.characters = spec.text;
  }
  t.fontSize = spec.size;
  t.lineHeight = px(spec.lineHeight);
  t.letterSpacing = px(spec.letterSpacing);
  t.fills = solid(spec.color);
  if (spec.alignVertical) t.textAlignVertical = spec.alignVertical;
  if (spec.paragraphSpacing !== undefined) t.paragraphSpacing = spec.paragraphSpacing;
  return t;
};

const autoLayout = (
  node: FNode,
  o: {
    dir: 'HORIZONTAL' | 'VERTICAL';
    itemSpacing?: number;
    padding?: number | { t: number; r: number; b: number; l: number };
    counterAlign?: 'MIN' | 'CENTER' | 'MAX';
  },
): void => {
  node.layoutMode = o.dir;
  node.primaryAxisSizingMode = 'AUTO'; // HUG on the main axis
  node.counterAxisSizingMode = 'AUTO'; // HUG on the counter axis; roots override to fixed width below
  if (o.itemSpacing !== undefined) node.itemSpacing = o.itemSpacing;
  if (o.counterAlign) node.counterAxisAlignItems = o.counterAlign;
  const p = o.padding;
  if (typeof p === 'number') { node.paddingTop = p; node.paddingRight = p; node.paddingBottom = p; node.paddingLeft = p; }
  else if (p) { node.paddingTop = p.t; node.paddingRight = p.r; node.paddingBottom = p.b; node.paddingLeft = p.l; }
};

/**
 * Fixed width, HUG height — the JSON shape for BOTH roots (`_Section-header` and `_Headings` each set a
 * `width` and `layoutSizingVertical: HUG`). Set AXIS-EXPLICITLY so it is correct regardless of layout
 * direction: the old code used `primaryAxisSizingMode:'AUTO'` + `counterAxisSizingMode:'FIXED'`, which is
 * right for the VERTICAL `_Section-header` but BACKWARDS for the HORIZONTAL `_Headings` (it fixed the height
 * and hugged the width — the overlap/absolute-positioning symptom in #1563), and a hardcoded
 * `resize(_, 100)` pinned every member to 100px. Order matters: fix the width axis first so the resized
 * width sticks, set the width, then HUG the height LAST so it wins over the resize's throwaway height.
 */
const setFixedWidthHugHeight = (node: FNode, width: number): void => {
  node.layoutSizingHorizontal = 'FIXED';
  node.resize?.(width, 1); // 1 is a throwaway height — the HUG below governs it
  node.layoutSizingVertical = 'HUG';
};

/**
 * Stack a freshly-combined variant set instead of letting its members overlap (#1600). `combineAsVariants`
 * leaves some variant children at `layoutPositioning: 'ABSOLUTE'` (the owner's screenshot: XL/Medium/Small
 * piled on Large in `_Section-header`), so the set needs BOTH halves to be correct whichever state the
 * combine produced:
 *   1. give the SET a VERTICAL stacking auto-layout, so in-flow children lay out down the set with visible
 *      separation (item spacing + padding); and
 *   2. put every VARIANT child in-flow (`layoutPositioning: 'AUTO'`), clearing any ABSOLUTE the combine left.
 * One without the other is not enough: (1) alone still overlaps the children the combine left absolute, and
 * (2) alone leaves the set with no layout to arrange the now-in-flow children. Figma does not re-layout an
 * already-built set on idempotent reuse, so this corrects FRESH builds only — an existing file must be
 * rebuilt to pick it up.
 */
const SET_ITEM_SPACING = 80;
const SET_PADDING = 40;
const stackVariants = (set: FNode, members: readonly FNode[]): void => {
  autoLayout(set, { dir: 'VERTICAL', itemSpacing: SET_ITEM_SPACING, padding: SET_PADDING });
  for (const m of members) m.layoutPositioning = 'AUTO';
};

// ── _Section-header ────────────────────────────────────────────────────────────────────────────────
// Size variants scale the two text nodes and the root's bottom stroke / spacing. XL is the default.
interface SectionSize {
  size: string;
  title: { s: number; lh: number; ls: number };
  desc: { s: number; lh: number; ls: number };
  strokeBottom: number;
  rootItemSpacing: number;
  padBottom: number;
  textItemSpacing: number;
}
const SECTION_SIZES: SectionSize[] = [
  { size: 'XL', title: { s: 144, lh: 144, ls: -7.2 }, desc: { s: 44, lh: 44, ls: -2.2 }, strokeBottom: 16, rootItemSpacing: 16, padBottom: 56, textItemSpacing: 12 },
  { size: 'Large', title: { s: 96, lh: 96, ls: -4.8 }, desc: { s: 24, lh: 28, ls: -0.96 }, strokeBottom: 12, rootItemSpacing: 8, padBottom: 32, textItemSpacing: 10 },
  { size: 'Medium', title: { s: 72, lh: 72, ls: -3.6 }, desc: { s: 24, lh: 28, ls: -0.96 }, strokeBottom: 12, rootItemSpacing: 8, padBottom: 32, textItemSpacing: 8 },
  { size: 'Small', title: { s: 48, lh: 48, ls: -1.92 }, desc: { s: 19, lh: 24, ls: -0.76 }, strokeBottom: 12, rootItemSpacing: 8, padBottom: 32, textItemSpacing: 6 },
];
const SECTION_WIDTH = 2517;
const SECTION_STROKE = '#DCDBDB';
const TITLE_INK = '#0E0D0D';
const DESC_INK = '#6A6868';

const buildSectionHeader = (
  api: FileComponentsApi,
  page: { appendChild(child: unknown): void },
  loaded: Set<string>,
  fontMisses: string[],
): FNode => {
  const members = SECTION_SIZES.map((v) => {
    const root = api.createComponent();
    root.name = `Size=${v.size}`;
    autoLayout(root, { dir: 'VERTICAL', itemSpacing: v.rootItemSpacing, padding: { t: 0, r: 0, b: v.padBottom, l: 0 } });
    setFixedWidthHugHeight(root, SECTION_WIDTH); // fixed 2517 width, HUG height (no hardcoded 100)
    // Bottom-only stroke.
    root.strokes = solid(SECTION_STROKE);
    root.strokeAlign = 'INSIDE';
    root.strokeTopWeight = 0; root.strokeRightWeight = 0; root.strokeLeftWeight = 0;
    root.strokeBottomWeight = v.strokeBottom;
    root.fills = [];

    const textBox = api.createFrame();
    autoLayout(textBox, { dir: 'VERTICAL', itemSpacing: v.textItemSpacing });
    textBox.fills = []; // #1563 — Figma frames default to a white fill; the JSON Text container has none
    textBox.layoutAlign = 'STRETCH'; // FILL width inside the vertical root

    const title = makeText(api, { font: BOLD, size: v.title.s, lineHeight: v.title.lh, letterSpacing: v.title.ls, color: TITLE_INK, text: 'Section header', alignVertical: 'BOTTOM' }, loaded, fontMisses);
    title.name = 'Title';
    title.layoutAlign = 'STRETCH';
    const desc = makeText(api, { font: REGULAR, size: v.desc.s, lineHeight: v.desc.lh, letterSpacing: v.desc.ls, color: DESC_INK, text: 'Descriptive Text' }, loaded, fontMisses);
    desc.name = 'Description';
    desc.layoutAlign = 'STRETCH';

    textBox.name = 'Text';
    textBox.appendChild?.(title);
    textBox.appendChild?.(desc);
    root.appendChild?.(textBox);
    page.appendChild(root);
    return { root, desc };
  });

  const set = api.combineAsVariants(members.map((m) => m.root), page);
  set.name = '_Section-header';
  // `Description` boolean property (default true) toggles the Description node's visibility.
  const propId = set.addComponentProperty?.('Description', 'BOOLEAN', true);
  if (propId) for (const m of members) m.desc.componentPropertyReferences = { visible: propId };
  stackVariants(set, members.map((m) => m.root)); // #1600 — stack, don't overlap
  return set;
};

// ── _Headings ──────────────────────────────────────────────────────────────────────────────────────
// Two variant axes — Type [Large(default), Small] × Light [false(default), true] — and a Description
// boolean property. Small swaps the layout to the Note; Light inverts the surface + ink.
interface HeadingVariant {
  type: 'Large' | 'Small';
  light: boolean;
  bg: string;
  stroke?: string;
  width: number;
  itemSpacing: number;
  padding: number;
  showText: boolean; // Large shows the Title/Description text box; Small shows the Note
  ink: string;       // Title/Description ink (Large) or Note ink (Small)
}
const HEADINGS: HeadingVariant[] = [
  { type: 'Large', light: false, bg: '#181717', width: 663, itemSpacing: 16, padding: 24, showText: true, ink: '#F7F7F7' },
  { type: 'Large', light: true, bg: '#F7F7F7', stroke: '#DCDBDB', width: 663, itemSpacing: 16, padding: 24, showText: true, ink: '#0E0D0D' },
  { type: 'Small', light: false, bg: '#000000', width: 320, itemSpacing: 8, padding: 16, showText: false, ink: '#FFFFFF' },
  { type: 'Small', light: true, bg: '#F7F7F7', stroke: '#DCDBDB', width: 320, itemSpacing: 8, padding: 16, showText: false, ink: '#0E0D0D' },
];

const buildHeadings = (
  api: FileComponentsApi,
  page: { appendChild(child: unknown): void },
  loaded: Set<string>,
  fontMisses: string[],
): FNode => {
  const members = HEADINGS.map((v) => {
    const root = api.createComponent();
    root.name = `Type=${v.type}, Light=${v.light}`;
    autoLayout(root, { dir: 'HORIZONTAL', itemSpacing: v.itemSpacing, padding: v.padding, counterAlign: 'CENTER' });
    setFixedWidthHugHeight(root, v.width); // fixed 663/320 width, HUG height (was backwards: fixed height, hugged width)
    root.cornerRadius = 12;
    root.clipsContent = true;
    root.fills = solid(v.bg);
    if (v.stroke) { root.strokes = solid(v.stroke); root.strokeWeight = 1; root.strokeAlign = 'INSIDE'; }
    else root.strokes = [];

    // The Title/Description text box (shown in Large).
    const textBox = api.createFrame();
    textBox.name = 'Text';
    autoLayout(textBox, { dir: 'VERTICAL' });
    textBox.fills = []; // #1563 — clear the default white fill behind the Title/Description
    textBox.layoutGrow = 1; // FILL the horizontal main axis
    const titleInk = v.showText ? v.ink : '#F7F7F7';
    const title = makeText(api, { font: SEMIBOLD, size: 44, lineHeight: 44, letterSpacing: -2.2, color: titleInk, text: 'Heading title' }, loaded, fontMisses);
    title.name = 'Title';
    title.layoutAlign = 'STRETCH';
    const desc = makeText(api, { font: REGULAR, size: 16, lineHeight: 22, letterSpacing: -0.32, color: titleInk, text: 'Descriptive text.', paragraphSpacing: 11 }, loaded, fontMisses);
    desc.name = 'Description';
    desc.layoutAlign = 'STRETCH';
    textBox.appendChild?.(title);
    textBox.appendChild?.(desc);
    textBox.visible = v.showText;

    // The Note (shown in Small).
    const note = makeText(api, { font: BOLD, size: 14, lineHeight: 20, letterSpacing: -0.28, color: v.showText ? '#FFFFFF' : v.ink, text: 'Heading title' }, loaded, fontMisses);
    note.name = 'Note';
    note.visible = !v.showText;

    root.appendChild?.(textBox);
    root.appendChild?.(note);
    page.appendChild(root);
    return { root, desc };
  });

  const set = api.combineAsVariants(members.map((m) => m.root), page);
  set.name = '_Headings';
  const propId = set.addComponentProperty?.('Description', 'BOOLEAN', true);
  if (propId) for (const m of members) m.desc.componentPropertyReferences = { visible: propId };
  stackVariants(set, members.map((m) => m.root)); // #1600 — stack, don't overlap
  return set;
};

/**
 * Build the two file components onto the given page. Loads the three Inter faces up front, records any
 * that will not load, and reports which sets were built. Placement (the page) is `file-setup`'s.
 */
export const buildFileComponents = async (
  api: FileComponentsApi,
  page: { appendChild(child: unknown): void },
): Promise<FileComponentsResult> => {
  const fontMisses: string[] = [];
  const loaded = new Set<string>();
  for (const f of [REGULAR, BOLD, SEMIBOLD]) {
    try { await api.loadFontAsync(f); loaded.add(fontKey(f)); }
    catch { /* recorded per-node in makeText, since a face may be needed by only one node */ }
  }
  const built: string[] = [];
  const sh = buildSectionHeader(api, page, loaded, fontMisses);
  built.push(String(sh.name ?? '_Section-header'));
  const hd = buildHeadings(api, page, loaded, fontMisses);
  built.push(String(hd.name ?? '_Headings'));
  // De-dupe the per-node font misses into one line per missing face.
  const uniqueMisses = [...new Set(fontMisses.map((m) => m.split(' unavailable')[0]))].filter((face) => !loaded.has(face)).map((face) => `${face} unavailable — used ${fontKey(REGULAR)}`);
  return { built, fontMisses: uniqueMisses };
};
