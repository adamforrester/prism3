/** Prism3 engine — brand art that duplicates an icon (#3076, owner decision 2026-11-20 A: reported, never blocked).
 *
 *  Split out of `icon-map.ts` so the map's rules and rewrite, which `brandTheme` imports and so the component typecheck
 *  graph reaches, do not pull `glyph-shape.ts` into that graph. Only Update file's dry run and the tests read this.
 */
import { ICON_NAMES, ICON_PATHS } from './icon-glyphs';
import type { AnatomyPlan, FigmaNodePlan } from './anatomy-figma';
import { canonicalShape } from './glyph-shape';
import { glyphInkBox } from './icon-map';

const CORE: ReadonlySet<string> = new Set(ICON_NAMES);

/**
 * A path's data rewritten in absolute `M`/`L`/`C`/`Z`, the commands `canonicalShape` reads, or `undefined` when it holds
 * an arc (an arc has no exact cubic, so it is not rewritten) or is not path data. A brand's art arrives in any spelling,
 * relative commands and quadratics included; Prism3's own is absolute already and comes back unchanged in shape.
 */
export const absoluteGlyphPath = (d: string): string | undefined => {
  const out: string[] = [];
  let arc = false;
  const box = glyphInkBox(d, (cmd, pts) => { if (cmd === 'A') arc = true; else out.push(`${cmd}${pts.join(' ')}`); });
  return typeof box === 'string' || arc ? undefined : out.join('');
};

/**
 * BRAND ART THAT DUPLICATES AN ICON (#3076, owner decision 2026-11-20 A: reported, never blocked). The groups of icons in
 * a planned icon set that draw ONE picture, where at least one member is the brand's art: a name Prism3 does not have,
 * or a Prism3 name drawn with a path other than Prism3's (Q5 A). Prism3's own duplicates (`lint-glyph-geometry.ts`'s
 * DUPLICATE_SHAPES) are not the brand's doing and are left out.
 *
 * Read off the PLANS, the outlines the update would build, never off the brand input, so the report names what lands in
 * the file. Two members are one picture when their fill rules agree and `canonicalShape` agrees: a proof, never a
 * guess, so a pair it cannot prove (an arc, a transform `glyph-shape.ts` does not cover) is not reported. Each group's
 * names sorted, the groups in the order of their first name.
 */
export const iconArtDuplicates = (plans: readonly AnatomyPlan[]): string[][] => {
  const byShape = new Map<string, { names: string[]; brand: boolean }>();
  for (const plan of plans) {
    const name = (plan.coord as Record<string, string | undefined>).name;
    if (!name) continue;
    let svg: string | undefined;
    const walk = (n: FigmaNodePlan): void => { if (svg === undefined && n.type === 'GLYPH' && typeof n.glyphSvg === 'string') svg = n.glyphSvg; for (const c of n.children ?? []) walk(c); };
    walk(plan.root);
    const paths = svg ? [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]) : [];
    const p0 = paths[0];
    if (paths.length !== 1 || p0 === undefined) continue;
    const d = /\bd="([^"]*)"/.exec(p0)?.[1];
    if (!d) continue;
    const rule = /\bfill-rule="([^"]*)"/.exec(p0)?.[1] ?? 'nonzero';
    const abs = absoluteGlyphPath(d);
    if (abs === undefined) continue;
    let shape: string;
    try { shape = canonicalShape(abs); } catch { continue; }
    const key = `${rule}|${shape}`;
    const brand = !CORE.has(name) || d !== (ICON_PATHS as Record<string, string>)[name];
    const g = byShape.get(key) ?? { names: [], brand: false };
    g.names.push(name); g.brand ||= brand;
    byShape.set(key, g);
  }
  return [...byShape.values()].filter((g) => g.names.length > 1 && g.brand).map((g) => [...g.names].sort()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
};
