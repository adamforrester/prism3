/**
 * THE CANVAS-FURNITURE TEMPLATES (#2406 Q171, #2188 Q172) — `_Label` and `_inverse-backdrop`.
 *
 * Two more PLUGIN-ONLY TEMPLATE ASSETS beside `_Section-header` and `_Headings` (`file-components.ts`): never
 * engine defs, built by file setup onto `↳ File Components` so a client restyles each one in one place and every
 * instance the build places follows. `canvas-furniture.ts` places the instances; this file only builds the two
 * mains.
 *
 * `_Label` IS THE OWNER'S PRISM 2 COMPONENT, transcribed from the spec in #2406's Q171 comment:
 *   - properties: `Text` = Top | Left | Right | Bottom (the placement; Top is the default), `surface` = default |
 *     inverse, and a `Show bracket` boolean, default on;
 *   - a `root` auto-layout (VERTICAL, center-aligned, hug, gap 8, clips) holding `text` (Inter Medium 12, hug,
 *     "Label") and `bracket` (fill width, 14 high, top corners 5, a 1px stroke on top/start/end only, clips);
 *   - Left: the root HORIZONTAL; the bracket 14 wide, filling the height, corners topStart/bottomStart 5, the
 *     stroke on top, bottom and start. Right: the bracket before the text, rotated 180°, the root HORIZONTAL and
 *     end-aligned. Bottom: the bracket before the text, end-aligned, sample text "Enabled";
 *   - #9747FF, and #E0C7FF on inverse, for the text and the stroke. LITERAL COLORS, not tokens (the owner's
 *     recommendation, confirmed in the build PR): a label annotates the brand's components, it is not one of them,
 *     so it must not move when the brand's palette does.
 *
 * ONE CALL THE SPEC LEAVES OPEN, made here and held for the owner: Bottom's bracket is rotated 180° like Right's,
 * so it opens toward the set above it. The spec says only that it comes before the text.
 *
 * `_inverse-backdrop` IS A SINGLE COMPONENT, not a set: a frame whose fill is bound to the brand's
 * `color/inverse/background/primary`, the ground every inverse contrast check measures against (Q172.2), so what
 * the file shows behind the inverse rows is what the contrast contract verified. A file set up before its theme
 * was applied has no such variable yet; the fill then holds `BACKDROP_PLACEHOLDER` and the build binds it the
 * first time the variable exists (`bindBackdrop`), but only while the fill is still that placeholder — a fill a
 * client restyled is theirs.
 *
 * IDEMPOTENT PER TEMPLATE. File setup's existing check (`ensureFileComponents`) skips when EITHER of its two sets
 * is present, which is right for those two and wrong here: every file set up before this change already has
 * `_Section-header` and would never get the new pair. So each template is looked for on its own, by name in any
 * case (`isTemplateSet`), and only a missing one is built.
 *
 * WHAT IS AND IS NOT VERIFIED OFFLINE: `test-canvas-furniture.ts` checks the names, the variant axes, the
 * boolean, the colors, the bracket's corners and strokes and the binding through a node recorder. The rendered
 * result (whether a rotated bracket lays out as drawn inside an auto-layout row) is host-verified, the same
 * posture as `file-components.ts`.
 */
import { autoLayout, fontKey, isTemplateSet, solid, stackVariants, REGULAR } from './file-components';
import type { FileComponentsApi, FNode } from './file-components';

export const LABEL_SET = '_Label';
export const BACKDROP_COMPONENT = '_inverse-backdrop';
/** The four placements, in the order the set lists them. Top first: it is the default. */
export const LABEL_PLACEMENTS = ['Top', 'Left', 'Right', 'Bottom'] as const;
export type LabelPlacement = (typeof LABEL_PLACEMENTS)[number];
export const LABEL_SURFACES = ['default', 'inverse'] as const;
/** The variant name a placement and surface select, as Figma writes it. */
export const labelVariant = (placement: LabelPlacement, surface: (typeof LABEL_SURFACES)[number] = 'default'): string =>
  `Text=${placement}, surface=${surface}`;
export const LABEL_INK = '#9747FF';
export const LABEL_INK_INVERSE = '#E0C7FF';
/** The backdrop's fill until the brand's inverse ground can be bound. */
export const BACKDROP_PLACEHOLDER = '#181717';
/** The variable the backdrop binds, by the tail every brand's name ends in (`<root>/color/inverse/…`). */
export const BACKDROP_VARIABLE = 'color/inverse/background/primary';
/** HELD FOR THE OWNER: the template's corner radius and its size as built. A placed instance takes the size of
 *  the block it covers; the radius is the template's and a client changes it there. */
export const BACKDROP_RADIUS = 8;
const BACKDROP_SIZE: [number, number] = [320, 160];
const MEDIUM = { family: 'Inter', style: 'Medium' };

/** The fields this file writes beyond `FNode`'s. */
interface LNode extends FNode {
  topLeftRadius?: unknown;
  topRightRadius?: unknown;
  bottomLeftRadius?: unknown;
  bottomRightRadius?: unknown;
  rotation?: unknown;
  primaryAxisAlignItems?: unknown;
}

/** The variables port the backdrop binds through — the global `figma.variables` satisfies it. Optional on the
 *  api: a host without it builds the backdrop on its placeholder, unbound. */
export interface BackdropVariables {
  getLocalVariablesAsync(): Promise<readonly { id: string; name: string }[]>;
  setBoundVariableForPaint(paint: never, field: 'color', variable: never): unknown;
}
export interface TemplatesApi extends FileComponentsApi {
  variables?: BackdropVariables;
}

/** The page the templates go on. `children` lets a new template sit clear of what the page already holds. */
export interface TemplatesPage {
  readonly children?: readonly unknown[];
  appendChild(child: unknown): void;
  findOne?(predicate: (node: unknown) => boolean): unknown;
}

const bracketFor = (api: FileComponentsApi, placement: LabelPlacement, ink: string): LNode => {
  const b = api.createFrame() as LNode;
  b.name = 'bracket';
  b.fills = [];
  b.clipsContent = true;
  b.strokes = solid(ink);
  b.strokeAlign = 'INSIDE';
  const across = placement === 'Top' || placement === 'Bottom';
  if (across) {
    // Fill width, 14 high; corners and stroke on the top and both sides — the opening faces down.
    b.resize?.(40, 14);
    b.layoutAlign = 'STRETCH';
    b.topLeftRadius = 5; b.topRightRadius = 5; b.bottomLeftRadius = 0; b.bottomRightRadius = 0;
    b.strokeTopWeight = 1; b.strokeLeftWeight = 1; b.strokeRightWeight = 1; b.strokeBottomWeight = 0;
  } else {
    // 14 wide, fill height; corners and stroke on the start side — the opening faces the end.
    b.resize?.(14, 16);
    b.layoutAlign = 'STRETCH';
    b.topLeftRadius = 5; b.bottomLeftRadius = 5; b.topRightRadius = 0; b.bottomRightRadius = 0;
    b.strokeTopWeight = 1; b.strokeBottomWeight = 1; b.strokeLeftWeight = 1; b.strokeRightWeight = 0;
  }
  // Right's bracket is Left's turned round (the spec); Bottom's is Top's turned round (held for the owner).
  if (placement === 'Right' || placement === 'Bottom') b.rotation = 180;
  return b;
};

const labelText = (api: FileComponentsApi, text: string, ink: string, loaded: Set<string>, fontMisses: string[]): FNode => {
  const t = api.createText();
  t.name = 'text';
  const face = loaded.has(fontKey(MEDIUM)) ? MEDIUM : loaded.has(fontKey(REGULAR)) ? REGULAR : null;
  if (face !== MEDIUM) fontMisses.push(`${fontKey(MEDIUM)} unavailable for ${LABEL_SET}`);
  if (face) {
    t.fontName = { ...face };
    t.characters = text;
  }
  t.fontSize = 12;
  t.fills = solid(ink);
  return t;
};

const buildLabel = (api: FileComponentsApi, page: TemplatesPage, loaded: Set<string>, fontMisses: string[]): FNode => {
  const members: { root: LNode; bracket: LNode }[] = [];
  for (const placement of LABEL_PLACEMENTS) {
    for (const surface of LABEL_SURFACES) {
      const ink = surface === 'inverse' ? LABEL_INK_INVERSE : LABEL_INK;
      const root = api.createComponent() as LNode;
      root.name = labelVariant(placement, surface);
      const across = placement === 'Top' || placement === 'Bottom';
      autoLayout(root, { dir: across ? 'VERTICAL' : 'HORIZONTAL', itemSpacing: 8, counterAlign: 'CENTER' });
      root.fills = [];
      root.clipsContent = true;
      if (placement === 'Right' || placement === 'Bottom') root.primaryAxisAlignItems = 'MAX';
      const text = labelText(api, placement === 'Bottom' ? 'Enabled' : 'Label', ink, loaded, fontMisses);
      const bracket = bracketFor(api, placement, ink);
      const order = placement === 'Right' || placement === 'Bottom' ? [bracket, text] : [text, bracket];
      for (const n of order) root.appendChild?.(n);
      page.appendChild(root);
      members.push({ root, bracket });
    }
  }
  const set = api.combineAsVariants(members.map((m) => m.root), page);
  set.name = LABEL_SET;
  const propId = set.addComponentProperty?.('Show bracket', 'BOOLEAN', true);
  if (propId) for (const m of members) m.bracket.componentPropertyReferences = { visible: propId };
  stackVariants(set, members.map((m) => m.root));
  return set;
};

/** The brand's inverse ground, by name tail — or null before a theme is applied. */
const backdropVariable = async (vars: BackdropVariables | undefined): Promise<{ id: string; name: string } | null> => {
  if (!vars) return null;
  const all = await vars.getLocalVariablesAsync();
  return all.find((v) => v.name === BACKDROP_VARIABLE || v.name.endsWith(`/${BACKDROP_VARIABLE}`)) ?? null;
};

/** Is `fills` exactly the placeholder this file writes, with no binding? Only then may the build bind it. */
const isPlaceholderFill = (fills: unknown): boolean => {
  if (!Array.isArray(fills) || fills.length !== 1) return false;
  const f = fills[0] as { type?: unknown; color?: { r: number; g: number; b: number }; boundVariables?: { color?: unknown } };
  const want = (solid(BACKDROP_PLACEHOLDER)[0] as { color: { r: number; g: number; b: number } }).color;
  return f.type === 'SOLID' && !f.boundVariables?.color && !!f.color
    && Math.abs(f.color.r - want.r) < 1e-6 && Math.abs(f.color.g - want.g) < 1e-6 && Math.abs(f.color.b - want.b) < 1e-6;
};

/**
 * Bind the backdrop's fill to the brand's inverse ground while it is still the placeholder. `'bound'` when it
 * bound now, `'kept'` when the fill is already bound or was restyled, `'no-variable'` before a theme is applied.
 */
export const bindBackdrop = async (
  vars: BackdropVariables | undefined,
  backdrop: { fills?: unknown },
): Promise<'bound' | 'kept' | 'no-variable'> => {
  if (!isPlaceholderFill(backdrop.fills)) return 'kept';
  const v = await backdropVariable(vars);
  if (!v || !vars) return 'no-variable';
  const paint = (backdrop.fills as unknown[])[0];
  backdrop.fills = [vars.setBoundVariableForPaint(paint as never, 'color', v as never)];
  return 'bound';
};

const buildBackdrop = async (api: TemplatesApi, page: TemplatesPage): Promise<{ component: FNode; binding: 'bound' | 'kept' | 'no-variable' }> => {
  const c = api.createComponent() as LNode;
  c.name = BACKDROP_COMPONENT;
  c.resize?.(...BACKDROP_SIZE);
  c.cornerRadius = BACKDROP_RADIUS;
  c.strokes = [];
  c.fills = solid(BACKDROP_PLACEHOLDER);
  const binding = await bindBackdrop(api.variables, c);
  page.appendChild(c);
  return { component: c, binding };
};

export interface TemplatesResult {
  built: string[];
  present: string[];
  /** The backdrop's binding when this run built it; absent when it was already present. */
  backdropBinding?: 'bound' | 'kept' | 'no-variable';
  fontMisses: string[];
}

/** Where a new template goes: right of everything already on the page, 160 clear — the gap `SET_GAP` uses. */
const placeRight = (page: TemplatesPage, node: FNode): void => {
  const boxes = ((page.children ?? []) as { x?: number; width?: number }[]).filter((n) => n !== (node as unknown));
  if (!boxes.length) return;
  const n = node as { x?: unknown; y?: unknown };
  n.x = Math.max(...boxes.map((b) => (b.x ?? 0) + (b.width ?? 0))) + 160;
  n.y = 0;
};

/**
 * Build whichever of `_Label` and `_inverse-backdrop` the page does not hold yet, each found on its own and in
 * any case. Never throws for a missing face (reported) or a missing variable (the placeholder fill, reported).
 */
export const ensureFurnitureTemplates = async (api: TemplatesApi, page: TemplatesPage): Promise<TemplatesResult> => {
  const has = (type: string, name: string): boolean => !!page.findOne?.((node) => {
    const n = node as { type?: unknown; name?: unknown };
    return n.type === type && isTemplateSet(n.name, name);
  });
  const out: TemplatesResult = { built: [], present: [], fontMisses: [] };
  if (has('COMPONENT_SET', LABEL_SET)) out.present.push(LABEL_SET);
  else {
    const loaded = new Set<string>();
    for (const f of [MEDIUM, REGULAR]) {
      try { await api.loadFontAsync(f); loaded.add(fontKey(f)); } catch { /* reported per text node */ }
    }
    const misses: string[] = [];
    const set = buildLabel(api, page, loaded, misses);
    placeRight(page, set);
    out.built.push(LABEL_SET);
    out.fontMisses.push(...new Set(misses));
  }
  if (has('COMPONENT', BACKDROP_COMPONENT)) out.present.push(BACKDROP_COMPONENT);
  else {
    const { component, binding } = await buildBackdrop(api, page);
    placeRight(page, component);
    out.built.push(BACKDROP_COMPONENT);
    out.backdropBinding = binding;
  }
  return out;
};
