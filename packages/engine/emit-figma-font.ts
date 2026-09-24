/**
 * Prism3 engine — emit-figma TYPOGRAPHY core (pure, node-free).
 *
 * The typography axis of the Figma materialisation adapter — split out of the I/O-shell `emit-figma.ts`
 * so it can bundle into contexts with NO filesystem: the Figma plugin main thread (the typography write
 * lane, #237) and the browser. Mirrors the `emit-figma-color` / `-dims` / `-styles` extractions:
 * `emit-figma.ts` re-exports everything here, so every `from './emit-figma'` importer + the
 * `npx tsx packages/engine/emit-figma.ts` CLI are unchanged.
 *
 * Emits: the font third of the `core` collection (per-mode: family STRING + size/weight FLOAT +
 * weight-role FLOAT aliased — `core-font` until #1097 folded the three primitive collections into one),
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
import {
  figmaFontFamilyDescription, figmaFontSizeDescription, figmaFontWeightDescription, figmaWeightRoleDescription,
  figmaFontCutDescription, figmaFluidSizeDescription, figmaTextStyleDescription,
} from './figma-description';
import { nsName, coreName, CORE_COLLECTION } from './emit-figma-color';
import type { FigmaResolvedType, FigmaVar, FigmaCollectionFile } from './emit-figma-color';

// Named-instance derivation for fontStyle (fix #5). Numeric weight → the family's
// preferred style-name GUESS; the plugin write lane (#499/#530) resolves this against
// the family's REAL loaded styles (spelling-insensitive + weight synonyms) before use,
// so this table only needs to name the single best-guess spelling per weight — it is
// no longer where mono weight suppression lives (that hardcoded guess was removed,
// #538). Style names are Figma's canonical strings, not CSS — plugins call
// figma.loadFontAsync({ family, style }).
const WEIGHT_STYLE_NAME: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semi Bold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

/** Style name for a given FACE + numeric weight (+ italic). `mono` is still keyed on the FACE
 *  (not the category) for a real, separate reason — #415: a brand binding JetBrains Mono to
 *  `families.body` needs the face, not the category, to pick a face-appropriate table. It no longer
 *  selects a different table (the mono-specific collapse was a hardcoded guess working around a
 *  spelling-variance bug the write-time resolver, #499/#530, now handles properly — removed in
 *  #538), so both callers currently read the same `WEIGHT_STYLE_NAME` table; the parameter stays so
 *  a future face-specific table has somewhere to hook in without a signature change.
 *
 *  Italic follows Figma's naming: Regular→`Italic` (not `Regular Italic`), otherwise `<Weight> Italic`
 *  (e.g. `Bold Italic`, `Semi Bold Italic`). */
export const fontStyleName = (mono: boolean, numericWeight: number, italic = false): string => {
  const base = WEIGHT_STYLE_NAME[numericWeight] ?? 'Regular'; // `mono` reserved — see doc comment above
  if (!italic) return base;
  return base === 'Regular' ? 'Italic' : `${base} Italic`;
};


// ── #1485 — the STRING CUT (Figma style name) the Text Style's single weight/style control binds ──
// A Figma Text Style has ONE weight/style control. Before #1485 the engine bound it via the FLOAT
// weight-role variable (numeric, e.g. 300) and baked the `fontStyle` string beside it — but a numeric
// weight can never reach a WIDTH cut like "Light Condensed", so a facePin (#1368) could only bake a
// literal, unthemeable and unreachable from Figma's binding UI. #1485 binds that control to a STRING
// variable holding the Figma style name instead, so any cut — condensed included — is bindable and
// themeable. The numeric weight-role FLOAT variable stays EMITTED as parallel data (web/DTCG), just no
// longer bound on the Text Style (one authoritative style binding, no conflicting double-bind).

/** The `core` variable NAME a composite's cut binds — one STRING variable per (category, weight-role,
 *  italic) slot. link does NOT vary the cut (it only underlines), so it is excluded. Per-CATEGORY,
 *  unlike the per-role weight variable, because a facePin is keyed (category, weight-role): two
 *  categories sharing a role may pin different cuts, so a per-role-only cut variable would collapse
 *  them into one — a silent cut swap, exactly the downgrade #1485's gate guards. */
const cutSlug = (category: string, weightRole: string, italic: boolean): string =>
  `font/style/${category}/${weightRole}${italic ? '-italic' : ''}`;

/** The Figma style-name cut for a slot: a verbatim facePin (#1368) OVERRIDES the numeric-weight →
 *  style-name derivation — the single source both the bound STRING cut variable (`buildFigmaFont`) and
 *  the Text Style's `fontStyle` binding (`buildFigmaTextStyles`) read, so the two cannot disagree.
 *  `numeric` is the weight-role's numeric FOR THE MODE being emitted, so a derived cut tracks a mode's
 *  re-pointed weight; a facePin is verbatim and mode-invariant. */
const cutName = (mono: boolean, numeric: number, italic: boolean, facePin?: { style: string }): string =>
  facePin ? facePin.style : fontStyleName(mono, numeric, italic);

/** Is the face this CATEGORY binds a monospace one? Walks category -> `font.family.<cat>` -> its
 *  `font.typeface.<slug>` -> the curated fallback tail, and asks whether that tail ends in `monospace`
 *  — which is how `MONO_FALLBACK` is defined, so the answer comes from the stack the brand actually
 *  ships rather than from a name that happens to contain "mono". Unknown category => not mono, which
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
const weightRoleFromAlias = (aliasStr: string): string => {
  const m = /font\.weight-role\.([^.}]+)\}?$/.exec(aliasStr);
  return m ? m[1] : 'default';
};

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

/** A distinct cut slot, keyed by `cutSlug`. The (category, weight-role, italic) descriptor is
 *  mode-invariant; the numeric (and hence a derived cut) is resolved per-mode where the variable is
 *  emitted. `facePin` rides the slot because it is keyed (category, weight-role). */
type CutSlot = { slug: string; category: string; weightRole: string; italic: boolean; facePin?: { family: string; style: string } };
const collectCutSlots = (composites: Array<{ leaf: any }>): CutSlot[] => {
  const bySlug = new Map<string, CutSlot>();
  for (const { leaf } of composites) {
    const v = leaf.$value as Record<string, string>;
    const ext = leaf.$extensions?.prism3 ?? {};
    const category = familyCategoryFromAlias(v.fontFamily);
    const weightRole = weightRoleFromAlias(v.fontWeight);
    const italic = !!ext.italic || v.fontStyle === 'italic';
    const facePin = ext.facePin as { family: string; style: string } | undefined;
    const slug = cutSlug(category, weightRole, italic);
    if (!bySlug.has(slug)) bySlug.set(slug, { slug, category, weightRole, italic, facePin });
  }
  return [...bySlug.values()];
};

// The font primitives are a PER-MODE collection (Phase D — same convention as `radius`): a customizable
// mode that overrides the font FAMILY (`core/font/family/*`) or WEIGHT (`core/font/weight-role/*`) via
// `modeLevers` gets its own mode file. A brand with no per-mode typography returns a single
// `[{$mode:'Default',…}]` entry — byte-identical to the pre-D world. Each mode file carries the FULL
// variable set (family/size/weight/weight-role); a variable with no override for a mode falls through
// to its canonical (light) value, satisfying Figma's mode-completeness requirement — exactly like
// `radius` per mode. The per-mode family/weight overrides are read from the DTCG leaf's
// `$extensions.prism3.modes.<mode>` the tree emits.
export const buildFigmaFont = (theme: Theme): FigmaCollectionFile[] => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const font = tree[root].core.font;
  const familiesByMode = theme.typography.familiesByMode ?? {};
  const weightRolesByMode = theme.typography.weightRolesByMode ?? {};
  const fontModes = [...new Set([...Object.keys(familiesByMode), ...Object.keys(weightRolesByMode)])];
  // #1485 — the distinct STRING cut slots the Text Styles bind. Descriptor is mode-invariant; the
  // per-mode value (a derived cut follows a mode's re-pointed weight) is resolved inside varsFor.
  const cutSlots = collectCutSlots(collectComposites(tree[root].type, ''));

  /** Every name in this collection is assembled from keys rather than walked, so the namespace and the
   *  primitive tier go on explicitly (#1097 + #1102) — `<root>/core/font/size/16` for the DTCG path
   *  `<root>.core.font.size.16`. Bound once here because `varsFor` builds five of them. */
  const ns = (name: string): string => coreName(root, name);

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
        name: ns(`font/family/${familyRole}`),
        resolvedType: 'STRING',
        scopes: ['FONT_FAMILY'],
        description: figmaFontFamilyDescription(familyRole, stack),
        value: stack[0],
        alias: null,
        hiddenFromPublishing: true,
      });
    }

    // font/size/N — FLOAT PRIMITIVES (curated ladder; static, never per-mode).
    for (const key of Object.keys(font.size)) {
      const leaf = font.size[key];
      variables.push({
        name: ns(`font/size/${key}`),
        resolvedType: 'FLOAT',
        scopes: ['FONT_SIZE'],
        description: figmaFontSizeDescription(Number(key), Number(leaf.$extensions?.prism3?.rem ?? Number(key) / 16)),
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
        name: ns(`font/weight/${key}`),
        resolvedType: 'FLOAT',
        scopes: ['FONT_WEIGHT'],
        description: figmaFontWeightDescription(Number(key)),
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
        name: ns(`font/weight-role/${roleKey}`),
        resolvedType: 'FLOAT',
        scopes: ['FONT_WEIGHT'],
        description: figmaWeightRoleDescription(roleKey, numeric),
        value: numeric,
        alias: { type: 'VARIABLE_ALIAS', name: ns(`font/weight/${numeric}`) },
      });
    }

    // font/style/<category>/<role>[-italic] — SEMANTIC STRING cut (#1485). This is what the Text
    // Style's single weight/style control binds, so a WIDTH cut (a facePin's "Light Condensed") is a
    // bindable, themeable variable rather than a baked literal the numeric weight axis can never reach.
    // The derived value follows the SAME weight-role numeric the FLOAT `weight-role` var carries for
    // this mode (a per-mode weight re-point moves both together); a facePin is verbatim + mode-invariant.
    for (const slot of cutSlots) {
      const roleLeaf = font['weight-role'][slot.weightRole];
      const ov = mode === 'Default' ? undefined : (roleLeaf?.$extensions?.prism3?.modes as any)?.[mode];
      const numeric = ov ? (ov.weight as number) : (roleLeaf?.$extensions?.prism3?.numeric as number);
      variables.push({
        name: ns(slot.slug),
        resolvedType: 'STRING',
        scopes: ['FONT_STYLE'],
        description: figmaFontCutDescription(slot.category, slot.weightRole, slot.italic),
        value: cutName(isMonoCategory(font, slot.category), numeric, slot.italic, slot.facePin),
        alias: null,
      });
    }
    return variables;
  };

  return [
    { $collection: CORE_COLLECTION, $mode: 'Default', variables: varsFor('Default') },
    ...fontModes.map((mode) => ({ $collection: CORE_COLLECTION, $mode: mode, variables: varsFor(mode) })),
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
          description: figmaFluidSizeDescription(`${prefix}${k}`.replace(/\//g, ' '), [['desktop', r.figma.modes.desktop], ['mobile', r.figma.modes.mobile]]),
        });
      }
    } else if (child && typeof child === 'object') {
      collectFluidRows(child, `${prefix}${k}/`, out);
    }
  }
  return out;
};

// DESKTOP FIRST — Figma treats a collection's first mode as its DEFAULT, and the owner's call is that
// text should resolve to its DESKTOP value by default with the viewer switching to mobile (#1520). The
// per-mode value below is keyed by mode NAME, not array index, so the order flips the default without
// touching any value. The mirror copy in `materialise-to-figma.ts` (the paste path's file reader) must
// match — the suite asserts the two agree.
export const FONT_FLUID_MODES = ['desktop', 'mobile'] as const;

export const buildFigmaFontFluid = (theme: Theme): FigmaCollectionFile[] => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const rows = collectFluidRows(tree[root].type, '');

  return FONT_FLUID_MODES.map((mode) => ({
    $collection: 'type-sets',
    $mode: mode,
    variables: rows.map((r) => ({
      name: nsName(root, `font-fluid/${r.name}`),
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
    fontStyle: FigmaTextStyleProp;      // bound (font/style/<cat>/<role>[-italic]) — the STRING cut (#1485)
    fontSize: FigmaTextStyleProp;       // bound (font or font-fluid)
    fontWeight: FigmaTextStyleProp;     // baked numeric — parallel data, NOT bound (#1485; one style binding)
    lineHeight: FigmaTextStyleProp;     // baked PERCENT (fix 3a)
    letterSpacing: FigmaTextStyleProp;  // baked PERCENT (fix 3b partial)
    textCase: { bindable: false; value: 'ORIGINAL' | 'UPPER' | 'LOWER' };
    textDecoration: { bindable: false; value: 'NONE' | 'UNDERLINE' };
  };
};
export type FigmaTextStylesFile = { $collection: 'text-styles'; styles: FigmaTextStyle[] };

// Resolve a composite's size — bound to `<root>/font/size/<n>` (static) or `<root>/font-fluid/<path>`
// (fluid). Returns { variable, collection } for the bind. The VARIABLE name carries the brand
// namespace (#1097) even though the enclosing style's name does not: a bind names a variable.
// (isMonoCategory / familyCategoryFromAlias / weightRoleFromAlias / collectComposites moved above
//  buildFigmaFont at #1485 — the cut-variable emission needs them too.)
const sizeBinding = (root: string, compositePath: string, sizeAlias: string, fluid: boolean): { variable: string; collection: typeof CORE_COLLECTION | 'type-sets' } => {
  if (fluid) return { variable: nsName(root, `font-fluid/${compositePath}`), collection: 'type-sets' };
  const m = /font\.size\.([^.}]+)\}?$/.exec(sizeAlias);
  return { variable: coreName(root, `font/size/${m ? m[1] : ''}`), collection: CORE_COLLECTION };
};

// One text style per composite. Walks tree[root].type; each typography leaf
// becomes a style whose path is `group/variant/weight-role[-link]`.
const compositeToStyleName = (compositePath: string): string => compositePath;

// #1476 — order the emitted text styles LARGEST → SMALLEST within each type group, so the Figma styles
// list reads top-to-bottom the way a designer reads a type ramp (display at the top, small labels at the
// bottom; within a role, lg before md before sm). The owner confirmed BOTH the right-panel local styles
// list AND the Assets panel follow CREATION order — the Assets panel is not an independent alphabetical
// sort — so sorting the plan fixes both panels at once and style names stay CLEAN (no numeric/zero-padded
// name prefix). Sorting HERE (the composite walk) is the single deterministic driver of creation order:
// the emitted `text-styles.json` artifact and every plan consumer (`buildTextStylePlan` → the plugin's
// `applyTextStylePlan`, the paste path `materialise-to-figma`) all inherit this one ordering.
//
// SIZE_RANK: larger rank = larger size = emitted earlier. Covers 3xl…2xs so it generalizes past the
// three-rung families. Only the SIZE axis flips — the tier (group) order is PRESERVED exactly as the
// type-tree walk produced it (#1476: "if the tier order is ambiguous, keep it and only flip the size
// axis — do not invent a new tier ordering"). A second path segment that is not a known size (e.g.
// `code/inline`) shares one fallback rank, which — with the stable sort — leaves such rows in their
// original relative order rather than inventing a place for them.
const SIZE_RANK: Record<string, number> = { '3xl': 7, '2xl': 6, xl: 5, lg: 4, md: 3, sm: 2, xs: 1, '2xs': 0 };
const sizeRankOf = (compositePath: string): number => SIZE_RANK[compositePath.split('/')[1] ?? ''] ?? -1;
const orderComposites = (composites: Array<{ path: string; leaf: any }>): Array<{ path: string; leaf: any }> => {
  // First-appearance index per group, so the existing tier order is preserved without hardcoding it.
  const groupOrder = new Map<string, number>();
  for (const { path } of composites) {
    const g = path.split('/')[0] ?? '';
    if (!groupOrder.has(g)) groupOrder.set(g, groupOrder.size);
  }
  // Decorate-sort-undecorate: the `i` tiebreak makes the sort explicitly stable, so weight-role variants
  // within one (group, size) — default / …-link / strong / …-link — keep their walk order untouched.
  return composites
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ga = groupOrder.get(a.c.path.split('/')[0] ?? '') ?? 0;
      const gb = groupOrder.get(b.c.path.split('/')[0] ?? '') ?? 0;
      if (ga !== gb) return ga - gb;                       // preserve tier order
      const ra = sizeRankOf(a.c.path), rb = sizeRankOf(b.c.path);
      if (ra !== rb) return rb - ra;                        // largest size first
      return a.i - b.i;                                     // stable within (group, size)
    })
    .map(({ c }) => c);
};

/** Numeric weight (100..900) for a weight-role by reading the weight-role leaf. */
const numericWeightForRole = (fontNode: any, role: string): number => {
  const leaf = fontNode['weight-role']?.[role];
  return (leaf?.$extensions?.prism3?.numeric as number) ?? 400;
};
export const buildFigmaTextStyles = (theme: Theme): FigmaTextStylesFile => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const font = tree[root].core.font;
  const composites = orderComposites(collectComposites(tree[root].type, ''));

  const styles: FigmaTextStyle[] = composites.map(({ path, leaf }) => {
    const v = leaf.$value as Record<string, string>;
    const ext = leaf.$extensions?.prism3 ?? {};
    const familyCategory = familyCategoryFromAlias(v.fontFamily);
    const weightRole = weightRoleFromAlias(v.fontWeight);
    const numeric = numericWeightForRole(font, weightRole);
    const italic = !!ext.italic || v.fontStyle === 'italic';
    // #1368 — a verbatim face pin bakes its Figma STYLE directly, OVERRIDING the numeric-weight →
    // style-name derivation (which can only reach weights, never a WIDTH cut like "Light Condensed").
    // fontFamily still binds the category's `font/family/*` variable, whose value equals the pin's
    // family (enforced in buildComposites), so the host loads {family: <that>, style: <pinned>}.
    const facePin = (ext.facePin as { family: string; style: string } | undefined);
    // #1485 — the cut is now BOUND to a STRING variable (not baked). Same source as the emitted cut
    // variable's value (`cutName`), so the Text Style's binding and the variable it names cannot
    // disagree. The variable's slug is per (category, weight-role, italic) — `cutSlug`.
    const cutVar = coreName(root, cutSlug(familyCategory, weightRole, italic));
    const fluid: boolean = !!ext.responsive?.fluid;
    const sb = sizeBinding(root, path, v.fontSize, fluid);
    // Line-height: PERCENT = unitless × 100 (fix 3a). Unbound — Figma has no
    // unitless line-height primitive, but PERCENT is mode/size-independent so
    // this bake is invariant across desktop/mobile fluid modes.
    //
    // #1356 (part of the #1329 host-truth audit) asked whether this omission was
    // deliberate. It is, and correct — binding is not merely unimplemented but
    // WRONG, for three independent reasons:
    //   1. The role is a UNITLESS multiplier (theme.ts `lineHeights: {key,value}[]`;
    //      `core.font.line-height.*` is typed `number`). A FLOAT variable holding
    //      1.5 bound to line height renders as 1.5 PIXELS, not 150%.
    //   2. Figma binds line height as PIXELS ONLY. A percentage/unitless line
    //      height cannot be variable-bound at all — a long-standing, intentional
    //      platform limitation (measured against Figma's API, 2026-09).
    //   3. `buildFigmaFont` emits NO `font/line-height/*` variable — there is
    //      nothing to bind to.
    // A faithful bind would need a per-size PIXEL variable (fontSize × multiplier),
    // which is size-dependent and would lose the invariance above — a new
    // guaranteed name and a dropped invariant, i.e. an owner contract decision, not
    // an engine fix. `lint-lineheight-bake.ts` gates this shape and fails by name
    // if a later edit flips `bound` or breaks the PERCENT bake. Same for
    // letterSpacing below (em-relative, the identical platform case).
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
    // The style's own words lead (the plugin's prune recognizes an engine text style by them), then the
    // size, face, leading and use — all read off the composite's structured fields (#1623 FG/F-13).
    const description = figmaTextStyleDescription({
      words: `${ext.group}${ext.variant ? ' ' + ext.variant : ''} ${weightRole}${italic ? ' italic' : ''}${ext.link ? ' link' : ''}`,
      group: ext.group,
      minPx: ext.responsive?.fluid ? ext.responsive.min?.px : undefined,
      px: ext.responsive?.fluid ? ext.responsive.max?.px : ext.sizePx,
      face: String(font.family[familyCategory]?.$extensions?.prism3?.face ?? familyCategory),
      lineHeight: String(v.lineHeight).replace(/^\{|\}$/g, '').split('.').pop()!,
    });

    return {
      name: compositeToStyleName(path),
      description,
      properties: {
        fontFamily: { bound: true, variable: coreName(root, `font/family/${familyCategory}`), collection: CORE_COLLECTION, resolvedType: 'STRING' },
        // fontStyle BOUND to the STRING cut variable (#1485) — the single authoritative style binding.
        // A facePin's WIDTH cut ("Light Condensed") is themeable/bindable here, where the numeric weight
        // axis could never reach it. The plugin still resolves this cut against the family's real styles
        // for the loaded/baked fallback (see write-text-styles.ts).
        fontStyle: { bound: true, variable: cutVar, collection: CORE_COLLECTION, resolvedType: 'STRING' },
        fontSize: { bound: true, variable: sb.variable, collection: sb.collection, resolvedType: 'FLOAT' },
        // fontWeight is PARALLEL DATA, not bound (#1485): the numeric weight-role FLOAT variable is
        // still emitted in `core` and the DTCG $value still aliases it, but binding it here as well
        // would double-bind Figma's single weight/style control against the STRING cut above.
        fontWeight: { bound: false, value: numeric },
        lineHeight: { bound: false, value: { unit: 'PERCENT', value: Math.round(lhMult * 100) } },
        letterSpacing: { bound: false, value: { unit: 'PERCENT', value: Math.round(lsEm * 10000) / 100 } },
        textCase: { bindable: false, value: textCase },
        textDecoration: { bindable: false, value: textDecoration },
      },
    };
  });

  return { $collection: 'text-styles', styles };
};
