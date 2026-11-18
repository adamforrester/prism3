/**
 * Prism3 engine — THE BRAND ICON MAP (#3076, owner decision 2026-11-18: A, both; the proposal's Q1–Q8 at their
 * recommendations). Pure: no `node:*`, no I/O, so the plugin bundles it beside the rest of the materialization.
 *
 * Prism3's icons are placeholders (`icon-set.ts`: "a placeholder core, intended to be swapped for a client's branded
 * set"). A brand states which of its own icons stands in for each Prism3 icon, and carries that icon's art:
 *
 *   icons:
 *     map: { plus: add, plus-filled: add, minus: subtract, minus-filled: subtract, check: checkmark, close-filled: close }
 *     glyphs: { add: { path: "M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" }, … }
 *
 * `map` — a Prism3 icon name to the name of the icon that replaces it, everywhere a generated component uses it (Q3 A:
 * global, no per-component exceptions). `glyphs` — the brand's art, one SVG path on Prism3's 24×24 artboard (Q1 A: the
 * art travels in the brand input, so it is checked offline and code can draw the same glyph). A glyph whose name is a
 * Prism3 name replaces that icon's art for this brand (Q5 A), so the file holds one X, not two.
 *
 * WHERE IT APPLIES. `applyIconMap` rewrites a def before projection, beside `applyTagStyle` and the other brand
 * levers, so the projector stays a pure function of its def (`anatomy-figma.ts`). It rewrites the three places a def
 * names an icon (a `vector` part's `glyph`, a slot's `swapDefault`, a nested part's `overrides.swaps`), and on the
 * `icon` def it removes each mapped name from the `name` axis and adds each brand glyph, so a mapped Prism3 icon is no
 * longer built into this brand's file. The brand's art rides on the def as `brandGlyphs`, which only this rewrite
 * writes and the projector reads before the core set.
 *
 * A brand with no `icons` block is the identity: every def comes back as the same object, so its plans are
 * byte-identical to before.
 *
 * Every rule below fails BY NAME (`iconMapErrors`), and `brandTheme` refuses a brand that breaks one, the choke point
 * every entry path passes through.
 */
import { ICON_NAMES } from './icon-glyphs';
import { COMPONENT_GLYPHS } from './component-glyphs';
import type { ComponentDef, PartDef } from './component-schema';

/** One brand glyph: a single SVG path on Prism3's `0 0 24 24` artboard, filled. `fillRule` only when it cuts counters. */
export type BrandGlyph = { path: string; fillRule?: 'evenodd' };
/** The brand-input `icons` block (`theme-schema.json`). */
export type BrandIcons = { map?: Record<string, string>; glyphs?: Record<string, BrandGlyph> };

/** An icon name, as Prism3's own are written: lowercase words joined by hyphens. */
export const ICON_NAME_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** One SVG path's data: path commands, numbers and separators only, starting with a move. */
export const GLYPH_PATH_SHAPE = /^\s*[Mm][MmZzLlHhVvCcSsQqTtAa0-9eE.,\s+-]*$/;

const CORE: ReadonlySet<string> = new Set(ICON_NAMES);

/** Every rule an `icons` block breaks, each naming the entry. Empty for a valid block or none. */
export const iconMapErrors = (icons: BrandIcons | undefined): string[] => {
  if (!icons) return [];
  const out: string[] = [];
  const map = icons.map ?? {};
  const glyphs = icons.glyphs ?? {};
  for (const [name, g] of Object.entries(glyphs)) {
    if (!ICON_NAME_SHAPE.test(name)) out.push(`icons.glyphs.${name}: '${name}' is not an icon name (lowercase words joined by hyphens)`);
    if (COMPONENT_GLYPHS[name]) out.push(`icons.glyphs.${name}: '${name}' is a glyph a component draws itself, not an icon`);
    if (name in map) out.push(`icons.glyphs.${name}: '${name}' is mapped to '${map[name]}', so this art would never be drawn`);
    if (typeof g?.path !== 'string' || !GLYPH_PATH_SHAPE.test(g.path)) out.push(`icons.glyphs.${name}.path: not one SVG path's data (commands and numbers, starting with M)`);
    if (g?.fillRule !== undefined && g.fillRule !== 'evenodd') out.push(`icons.glyphs.${name}.fillRule: '${String(g.fillRule)}' — only 'evenodd' is written; leave it out for the default`);
  }
  for (const [from, to] of Object.entries(map)) {
    if (!CORE.has(from)) out.push(`icons.map.${from}: '${from}' is not a Prism3 icon, so nothing uses it to map`);
    if (typeof to !== 'string' || (!ICON_NAME_SHAPE.test(to) && !CORE.has(to))) { out.push(`icons.map.${from}: '${String(to)}' is not an icon name (lowercase words joined by hyphens)`); continue; }
    if (to === from) out.push(`icons.map.${from}: maps to itself`);
    else if (to in map) out.push(`icons.map.${from}: maps to '${to}', which is itself mapped to '${map[to]}' — map '${from}' to '${map[to]}' directly`);
    else if (!CORE.has(to) && !(to in glyphs)) out.push(`icons.map.${from}: maps to '${to}', which is neither a Prism3 icon nor in icons.glyphs, so it has no art`);
  }
  return out;
};

/** The icon `name` stands for in this brand: its map target, or itself. */
export const mappedIcon = (icons: BrandIcons | undefined, name: string): string => icons?.map?.[name] ?? name;

/** The icon set this brand's file holds: Prism3's names less the mapped ones, then each brand glyph not already there. */
export const brandIconNames = (icons: BrandIcons | undefined): string[] => {
  const map = icons?.map ?? {};
  const kept = ICON_NAMES.filter((n) => !(n in map));
  return [...kept, ...Object.keys(icons?.glyphs ?? {}).filter((n) => !CORE.has(n))];
};

const hasIcons = (icons: BrandIcons | undefined): icons is BrandIcons =>
  !!icons && (Object.keys(icons.map ?? {}).length > 0 || Object.keys(icons.glyphs ?? {}).length > 0);

/**
 * `def` with the brand's icon map applied (see the header). The IDENTITY, the same object, for a brand with no map and
 * no glyphs. A template glyph (`'{name}'`, the `icon` def's own) is left for the projector to fill per member; the
 * `icon` def's `name` axis is what the map reaches there.
 */
export const applyIconMap = (def: ComponentDef, icons: BrandIcons | undefined): ComponentDef => {
  if (!hasIcons(icons)) return def;
  const m = (n: string): string => mappedIcon(icons, n);
  const a = def.anatomy;
  let parts: Record<string, PartDef> | undefined;
  if (a) {
    parts = {};
    for (const [name, p] of Object.entries(a.parts)) {
      // A part names an icon in one of three fields; each is rewritten through the map, everything else kept.
      const glyph = p.kind === 'vector' && p.glyph !== undefined && !p.glyph.includes('{') ? { glyph: m(p.glyph) } : {};
      const swapDefault = p.kind === 'slot' && p.swapDefault !== undefined && !p.fixedPaint ? { swapDefault: m(p.swapDefault) } : {};
      const overrides = p.overrides?.swaps ? { overrides: { ...p.overrides, swaps: Object.fromEntries(Object.entries(p.overrides.swaps).map(([k, v]) => [k, m(v)])) } } : {};
      parts[name] = { ...p, ...glyph, ...swapDefault, ...overrides } as PartDef;
    }
  }
  const out: ComponentDef = { ...def, ...(a && parts ? { anatomy: { ...a, parts } } : {}) };
  if (Object.keys(icons.glyphs ?? {}).length) out.brandGlyphs = { ...icons.glyphs };
  if (def.id === 'icon' && def.variants?.name) {
    const names = brandIconNames(icons);
    out.variants = { ...def.variants, name: names };
    out.props = def.props.map((p) => (p.name === 'name' && p.values ? { ...p, values: names } : p));
  }
  return out;
};
