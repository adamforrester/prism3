/**
 * Prism3 engine — emit-figma TYPOGRAPHY core (pure, node-free).
 *
 * The typography axis of the Figma materialisation adapter — split out of the I/O-shell `emit-figma.ts`
 * so it can bundle into contexts with NO filesystem: the Figma plugin main thread (the typography write
 * lane, #237) and the browser. Mirrors the `emit-figma-color` / `-dims` / `-styles` extractions:
 * `emit-figma.ts` re-exports everything here, so every `from './emit-figma'` importer + the
 * `npx tsx Prism3/engine/emit-figma.ts` CLI are unchanged.
 *
 * Emits: `core-font` (per-mode: family STRING + size/weight FLOAT + weight-role FLOAT aliased),
 * `type-sets` (per-composite fluid FLOAT, mobile/desktop), and Text Styles (one per composite).
 *
 * The family-role → typeface-primitive retiering (#269/#276) is a DTCG-tree change ONLY: the emitted
 * Figma variable is unchanged (value = primary face, description = full stack), so this module's output
 * — and the fixtures — are untouched by it (see `buildFigmaFont`'s inline note).
 *
 * PURE — no `node:*`, no `figma.*`, no I/O. Depends only on the pure `theme`/`tree` core + the shared
 * helpers/types in the (also pure) `emit-figma-color`.
 */
import { Theme } from './theme';
import { buildTree, subNode, deref } from './tree';
import { desc } from './emit-figma-color';
import type { FigmaResolvedType, FigmaVar, FigmaCollectionFile } from './emit-figma-color';

// Named-instance derivation for fontStyle (fix #5). Numeric weight → the family's
// real style name, plugin-resolved from loaded fonts. Mono families lack Semi Bold,
// so 600 falls back to Medium (matches the fixture note). Style names are Figma's
// canonical strings, not CSS — plugins call figma.loadFontAsync({ family, style }).
const WEIGHT_STYLE_NAME: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semi Bold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};
const WEIGHT_STYLE_NAME_MONO: Record<number, string> = {
  ...WEIGHT_STYLE_NAME,
  600: 'Medium', // JetBrains Mono / most mono families lack Semi Bold → collapse
};

/** Style name for a given FACE + numeric weight (+ italic). `mono` selects the mono-specific table,
 *  because mono families lack certain weights (JetBrains Mono has no Semi Bold).
 *
 *  KEYED ON THE FACE, not the category. #415 keyed it on `code` — the category the retired `mono`
 *  ROLE existed to serve — which is right for every default brand and wrong the moment a brand binds
 *  a mono face somewhere else: `families.body: 'JetBrains Mono'` emitted `Semi Bold`, a style that
 *  face does not have, and `figma.loadFontAsync({family, style})` fails on it rather than degrading.
 *  Before #415 the ROLE travelled with the face, so the old code got this case right by accident of
 *  its keying. Asking the face is correct under both shapes.
 *
 *  Italic follows Figma's naming: Regular→`Italic` (not `Regular Italic`), otherwise `<Weight> Italic`
 *  (e.g. `Bold Italic`, `Semi Bold Italic`). */
export const fontStyleName = (mono: boolean, numericWeight: number, italic = false): string => {
  const table = mono ? WEIGHT_STYLE_NAME_MONO : WEIGHT_STYLE_NAME;
  const base = table[numericWeight] ?? 'Regular';
  if (!italic) return base;
  return base === 'Regular' ? 'Italic' : `${base} Italic`;
};

/** Turn a DTCG font-family stack into the "stack: A, B, C" description Figma sees
 *  in the fixture (fix #4 — the full stack lives in the STRING variable's
 *  description, only the primary face is bound as the value). */
const stackDescription = (stack: string[]): string => `stack: ${stack.join(', ')}`;

// `core-font` is now a PER-MODE collection (Phase D — same convention as `radius`): a customizable
// mode that overrides the font FAMILY (`font/family/*`) or WEIGHT (`font/weight-role/*`) via
// `modeLevers` gets its own mode file. A brand with no per-mode typography returns a single
// `[{$mode:'Default',…}]` entry — byte-identical to the pre-D world. Each mode file carries the FULL
// variable set (family/size/weight/weight-role); a variable with no override for a mode falls through
// to its canonical (light) value, satisfying Figma's mode-completeness requirement — exactly like
// `radius` per mode. The per-mode family/weight overrides are read from the DTCG leaf's
// `$extensions.prism3.modes.<mode>` the tree emits.
export const buildFigmaFont = (theme: Theme): FigmaCollectionFile[] => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const font = tree[root].font;
  const familiesByMode = theme.typography.familiesByMode ?? {};
  const weightRolesByMode = theme.typography.weightRolesByMode ?? {};
  const fontModes = [...new Set([...Object.keys(familiesByMode), ...Object.keys(weightRolesByMode)])];

  const varsFor = (mode: string): FigmaVar[] => {
    const variables: FigmaVar[] = [];
    // font/family/* — STRING PRIMITIVES (ref tier). Primary face is the bound value; full
    // fallback stack lives in the description (fix #4). A per-mode family override supplies its
    // own $value (primary) + fallbackStack; else the canonical (light) leaf. hiddenFromPublishing
    // hides them from library consumers.
    // A family semantic is now an ALIAS onto a typeface primitive (#269), so the face comes from
    // the role's `face` extension and the fallback tail from the typeface it points at. The
    // EMITTED Figma variable is unchanged — value = primary face, description = full stack —
    // so the Figma-side contract and the fixtures are untouched by the retiering.
    const typefaceLeaf = (aliasPath: string): any => (font as any).typeface?.[String(aliasPath).split('.').pop() ?? ''];
    const faceStack = (src: any): string[] => {
      const face = src?.face ?? src?.$extensions?.prism3?.face;
      const aliasOf = src?.aliasOf ?? src?.$extensions?.prism3?.aliasOf;
      if (face && aliasOf) return [String(face), ...(((typefaceLeaf(aliasOf)?.$extensions?.prism3?.fallbackStack as string[]) ?? []))];
      // legacy literal forms: a baked array, or a primary + fallbackStack on the leaf itself.
      if (Array.isArray(src?.$value)) return src.$value.map(String);
      return [String(src?.$value), ...(((src?.$extensions?.prism3?.fallbackStack as string[] | undefined) ?? (src?.fallbackStack as string[] | undefined) ?? []))];
    };
    for (const familyRole of Object.keys(font.family)) {
      const leaf = font.family[familyRole];
      const ov = mode === 'Default' ? undefined : (leaf.$extensions?.prism3?.modes as any)?.[mode];
      const stack: string[] = faceStack(ov ?? leaf);
      variables.push({
        name: `font/family/${familyRole}`,
        resolvedType: 'STRING',
        scopes: ['FONT_FAMILY'],
        description: [stackDescription(stack), desc(leaf)].filter(Boolean).join(' \u2014 '),
        value: stack[0],
        alias: null,
        hiddenFromPublishing: true,
      });
    }

    // font/size/N — FLOAT PRIMITIVES (curated ladder; static, never per-mode).
    for (const key of Object.keys(font.size)) {
      const leaf = font.size[key];
      variables.push({
        name: `font/size/${key}`,
        resolvedType: 'FLOAT',
        scopes: ['FONT_SIZE'],
        description: desc(leaf),
        value: Number(key),
        alias: null,
        hiddenFromPublishing: true,
      });
    }

    // font/weight/N — FLOAT numeric reference tier (union of the global tier + every per-mode
    // weight value, so a per-mode weight-role alias always lands). PRIMITIVES; brand-facing
    // consumers pick `font/weight-role/*`. hiddenFromPublishing hides from library consumers.
    for (const key of Object.keys(font.weight)) {
      const leaf = font.weight[key];
      variables.push({
        name: `font/weight/${key}`,
        resolvedType: 'FLOAT',
        scopes: ['FONT_WEIGHT'],
        description: desc(leaf),
        value: Number(key),
        alias: null,
        hiddenFromPublishing: true,
      });
    }

    // font/weight-role/{role} — SEMANTIC. FLOAT aliased to the numeric weight. This IS the
    // brand-facing lever; a per-mode weight override re-anchors it at `font/weight/<value>` for
    // that mode (e.g. dark's `strong` → 600). Else the canonical (light) numeric.
    for (const roleKey of Object.keys(font['weight-role'])) {
      const leaf = font['weight-role'][roleKey];
      const ov = mode === 'Default' ? undefined : (leaf.$extensions?.prism3?.modes as any)?.[mode];
      const numeric = ov ? (ov.weight as number) : (leaf.$extensions?.prism3?.numeric as number);
      variables.push({
        name: `font/weight-role/${roleKey}`,
        resolvedType: 'FLOAT',
        scopes: ['FONT_WEIGHT'],
        description: desc(leaf),
        value: numeric,
        alias: { type: 'VARIABLE_ALIAS', name: `font/weight/${numeric}` },
      });
    }
    return variables;
  };

  return [
    { $collection: 'core-font', $mode: 'Default', variables: varsFor('Default') },
    ...fontModes.map((mode) => ({ $collection: 'core-font' as const, $mode: mode, variables: varsFor(mode) })),
  ];
};

// Fluid composites — walk the type tree and pick composites whose responsive
// entry says fluid, then read `responsive.figma.modes.{mobile,desktop}` for the
// per-mode FLOAT values. Composite path (dot-joined below `type.`) is the Figma
// variable name suffix under `font-fluid/`.
type FluidRow = { name: string; mobile: number; desktop: number; description: string };
const collectFluidRows = (typeNode: any, prefix: string, out: FluidRow[] = []): FluidRow[] => {
  for (const k in typeNode) {
    if (k[0] === '$') continue;
    const child = typeNode[k];
    if (child && child.$type === 'typography') {
      const r = child.$extensions?.prism3?.responsive;
      if (r?.fluid && r?.figma?.modes) {
        out.push({
          name: `${prefix}${k}`,
          mobile: r.figma.modes.mobile,
          desktop: r.figma.modes.desktop,
          description: desc(child),
        });
      }
    } else if (child && typeof child === 'object') {
      collectFluidRows(child, `${prefix}${k}/`, out);
    }
  }
  return out;
};

export const FONT_FLUID_MODES = ['mobile', 'desktop'] as const;

export const buildFigmaFontFluid = (theme: Theme): FigmaCollectionFile[] => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const rows = collectFluidRows(tree[root].type, '');

  return FONT_FLUID_MODES.map((mode) => ({
    $collection: 'type-sets',
    $mode: mode,
    variables: rows.map((r) => ({
      name: `font-fluid/${r.name}`,
      resolvedType: 'FLOAT' as const,
      scopes: ['FONT_SIZE'],
      description: r.description,
      value: mode === 'mobile' ? r.mobile : r.desktop,
      alias: null,
    })),
  }));
};

// ---- text styles (six §4 fixes) --------------------------------------------

export type FigmaTextStyleProp =
  | { bound: true; variable: string; collection: string; resolvedType: FigmaResolvedType }
  | { bound: false; value: string | number | { unit: 'PERCENT' | 'PIXELS'; value: number } };
export type FigmaTextStyle = {
  name: string;
  description: string;
  properties: {
    fontFamily: FigmaTextStyleProp;
    fontStyle: FigmaTextStyleProp;      // baked — derived from weight-role numeric
    fontSize: FigmaTextStyleProp;       // bound (font or font-fluid)
    fontWeight: FigmaTextStyleProp;     // bound (font/weight-role/*)
    lineHeight: FigmaTextStyleProp;     // baked PERCENT (fix 3a)
    letterSpacing: FigmaTextStyleProp;  // baked PERCENT (fix 3b partial)
    textCase: { bindable: false; value: 'ORIGINAL' | 'UPPER' | 'LOWER' };
    textDecoration: { bindable: false; value: 'NONE' | 'UNDERLINE' };
  };
};
export type FigmaTextStylesFile = { $collection: 'text-styles'; styles: FigmaTextStyle[] };

/** Is the face this CATEGORY binds a monospace one? Walks category → `font.family.<cat>` → its
 *  `font.typeface.<slug>` → the curated fallback tail, and asks whether that tail ends in `monospace`
 *  — which is how `MONO_FALLBACK` is defined, so the answer comes from the stack the brand actually
 *  ships rather than from a name that happens to contain "mono". Unknown category ⇒ not mono, which
 *  is the same default the sans table already was. */
const isMonoCategory = (font: any, category: string): boolean => {
  const famLeaf = font?.family?.[category];
  const slug = typeof famLeaf?.$value === 'string' ? /font\.typeface\.([^.}]+)\}?$/.exec(famLeaf.$value)?.[1] : undefined;
  const stack: string[] = (slug && font?.typeface?.[slug]?.$extensions?.prism3?.fallbackStack) || [];
  return stack[stack.length - 1] === 'monospace';
};
// Resolve a composite's family CATEGORY by dereferencing its fontFamily alias
// (`{root.font.family.<role>}`) — the role, not the face, is what determines
// fontStyle-name resolution and the bound STRING variable name.
const familyCategoryFromAlias = (aliasStr: string): string => {
  const m = /font\.family\.([^.}]+)\}?$/.exec(aliasStr);
  return m ? m[1] : 'body';
};
// Resolve a composite's size — bound to `font/<size>` (static) or
// `font-fluid/<path>` (fluid). Returns { variable, collection } for the bind.
const sizeBinding = (compositePath: string, sizeAlias: string, fluid: boolean): { variable: string; collection: 'core-font' | 'type-sets' } => {
  if (fluid) return { variable: `font-fluid/${compositePath}`, collection: 'type-sets' };
  const m = /font\.size\.([^.}]+)\}?$/.exec(sizeAlias);
  return { variable: `font/size/${m ? m[1] : ''}`, collection: 'core-font' };
};
const weightRoleFromAlias = (aliasStr: string): string => {
  const m = /font\.weight-role\.([^.}]+)\}?$/.exec(aliasStr);
  return m ? m[1] : 'default';
};

// One text style per composite. Walks tree[root].type; each typography leaf
// becomes a style whose path is `group/variant/weight-role[-link]`.
const compositeToStyleName = (compositePath: string): string => compositePath;

const collectComposites = (typeNode: any, prefix: string, out: Array<{ path: string; leaf: any }> = []): Array<{ path: string; leaf: any }> => {
  for (const k in typeNode) {
    if (k[0] === '$') continue;
    const child = typeNode[k];
    if (child && child.$type === 'typography') {
      out.push({ path: `${prefix}${k}`, leaf: child });
    } else if (child && typeof child === 'object') {
      collectComposites(child, `${prefix}${k}/`, out);
    }
  }
  return out;
};

/** Numeric weight (100..900) for a weight-role by reading the weight-role leaf. */
const numericWeightForRole = (fontNode: any, role: string): number => {
  const leaf = fontNode['weight-role']?.[role];
  return (leaf?.$extensions?.prism3?.numeric as number) ?? 400;
};
export const buildFigmaTextStyles = (theme: Theme): FigmaTextStylesFile => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const font = tree[root].font;
  const composites = collectComposites(tree[root].type, '');

  const styles: FigmaTextStyle[] = composites.map(({ path, leaf }) => {
    const v = leaf.$value as Record<string, string>;
    const ext = leaf.$extensions?.prism3 ?? {};
    const familyCategory = familyCategoryFromAlias(v.fontFamily);
    const weightRole = weightRoleFromAlias(v.fontWeight);
    const numeric = numericWeightForRole(font, weightRole);
    const italic = !!ext.italic || v.fontStyle === 'italic';
    const styleName = fontStyleName(isMonoCategory(font, familyCategory), numeric, italic);
    const fluid: boolean = !!ext.responsive?.fluid;
    const sb = sizeBinding(path, v.fontSize, fluid);
    // Line-height: PERCENT = unitless × 100 (fix 3a). Unbound — Figma has no
    // unitless line-height primitive, but PERCENT is mode/size-independent so
    // this bake is invariant across desktop/mobile fluid modes.
    // DEREF, not subNode (#377). The composite now aliases a semantic ROLE, which aliases the ladder
    // step — two hops. `subNode` resolves exactly one, so it would land on the role node whose $value is
    // the string "{…font.line-height.150}", fail the `typeof === 'number'` test below, and take the
    // `: 1` fallback — baking EVERY text style at 100% line height. Silently: `?? 1` and `?? 0` are both
    // plausible values, so nothing downstream looks wrong. An audit of all 23 `subNode` call sites found
    // these two to be the only ones that read a resolved leaf's SHAPE rather than handing it to a helper
    // that already derefs (pxOf / numOf / remPxOf / familyOf all do).
    const lhLeaf = deref(tree, subNode(tree, v.lineHeight));
    const lhMult: number = typeof lhLeaf?.$value === 'number' ? lhLeaf.$value : 1;
    // Letter-spacing: PERCENT = em × 100 (fix 3b — partial: baked, not yet
    // bindable via a tracking var collection).
    const lsLeaf = deref(tree, subNode(tree, v.letterSpacing));   // same two-hop reason as lineHeight above
    const lsEm: number = lsLeaf?.$extensions?.prism3?.em ?? 0;
    const textCase = v.textCase === 'uppercase' ? 'UPPER' : v.textCase === 'lowercase' ? 'LOWER' : 'ORIGINAL';
    const textDecoration = v.textDecoration === 'underline' ? 'UNDERLINE' : 'NONE';
    const description = `${ext.group}${ext.variant ? ' ' + ext.variant : ''} ${weightRole}${italic ? ' italic' : ''}${ext.link ? ' link' : ''}`;

    return {
      name: compositeToStyleName(path),
      description,
      properties: {
        fontFamily: { bound: true, variable: `font/family/${familyCategory}`, collection: 'core-font', resolvedType: 'STRING' },
        // fontStyle baked — derived from weight-role (+ italic modifier) via the
        // named-instance table (e.g. Bold, Bold Italic). Mono families collapse
        // Semi Bold → Medium (see fontStyleName).
        fontStyle: { bound: false, value: styleName },
        fontSize: { bound: true, variable: sb.variable, collection: sb.collection, resolvedType: 'FLOAT' },
        fontWeight: { bound: true, variable: `font/weight-role/${weightRole}`, collection: 'core-font', resolvedType: 'FLOAT' },
        lineHeight: { bound: false, value: { unit: 'PERCENT', value: Math.round(lhMult * 100) } },
        letterSpacing: { bound: false, value: { unit: 'PERCENT', value: Math.round(lsEm * 10000) / 100 } },
        textCase: { bindable: false, value: textCase },
        textDecoration: { bindable: false, value: textDecoration },
      },
    };
  });

  return { $collection: 'text-styles', styles };
};
