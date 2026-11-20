/**
 * Prism3 engine — writes THE SPEC SUPPLEMENT (#2996, Q2996.1 hybrid A; first slice Q2996.4, Button only):
 * `out/specs/<id>.supplement.yaml` for each def in `SUPPLEMENT_DEFS`. What the supplement is and how it lines up with
 * Spectacular's own output is in `spec-supplement.ts`; this file only resolves token names and writes.
 *
 *   npx tsx packages/engine/emit-spec-supplement.ts      (a `regen.ts` step; `regen --check` byte-checks the output)
 *
 * TOKEN NAMES ARE THE HOUSE BRAND'S (`examples/prism3.design.md`, the theme the studio and plugin open with and the one
 * `@prism3/tokens` ships), resolved from that brand's own emission, in memory:
 *  · `figma` — the Figma variable named `<root>/<path>` in the emitted collections (`figmaArtifacts`), written as
 *    `<collection>/<variable name>`, which is how Spectacular prints a `$token`; a text style by its style name. A token
 *    with no variable and no style (the ring's dash style, `focus.ring.style`) has no `figma` name.
 *  · `dtcg` — the path in the brand's DTCG tree, `<root>.<ref>`.
 *  · `css` — stock Style Dictionary's `name/kebab` over that path, `--<root>-<ref with "-" for ".">`, the custom property
 *    `packages/tokens/sd.ship.mjs` ships. Written out, not computed by Style Dictionary: the engine takes no dependency.
 *    `lint-spec-supplement.ts` holds every name to the authored token contract.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index';
import { parseDesignMd } from './design-md';
import { figmaArtifacts } from './emit-figma';
import { brandTheme } from './theme';
import { specSupplement, SUPPLEMENT_DEFS, toYaml } from './spec-supplement';
import type { TokenNames } from './spec-supplement';

const here = dirname(fileURLToPath(import.meta.url));
export const SUPPLEMENT_DIR = resolve(here, 'out', 'specs');
const HOUSE_THEME_SRC = join(here, 'examples', 'prism3.design.md');

/** The house brand's token names, from its own emission. */
export const houseTokenNames = (): TokenNames => {
  const theme = brandTheme(parseDesignMd(readFileSync(HOUSE_THEME_SRC, 'utf8')).input);
  const root = theme.root;
  const collectionOf = new Map<string, string>();
  const styles = new Set<string>();
  for (const a of figmaArtifacts(theme).artifacts) {
    const c = JSON.parse(a.content) as { $collection?: string; variables?: { name: string }[]; styles?: unknown };
    if (Array.isArray(c.variables)) for (const v of c.variables) collectionOf.set(v.name, c.$collection!);
    else if (Array.isArray(c.styles)) for (const s of c.styles as { name: string }[]) styles.add(s.name);
  }
  return (ref) => {
    const variable = `${root}/${ref.replace(/\./g, '/')}`;
    const style = ref.startsWith('type.') ? ref.slice('type.'.length).replace(/\./g, '/') : null;
    const figma = collectionOf.has(variable) ? `${collectionOf.get(variable)}/${variable}` : style && styles.has(style) ? style : undefined;
    return { dtcg: `${root}.${ref}`, css: `--${root}-${ref.replace(/\./g, '-')}`, ...(figma ? { figma } : {}) };
  };
};

/** Each supplement's file name and text. */
export const supplementFiles = (): { file: string; text: string }[] => {
  const names = houseTokenNames();
  return SUPPLEMENT_DEFS.map((id) => {
    const def = componentDefs.find((d) => d.id === id);
    if (!def) throw new Error(`emit-spec-supplement: no def "${id}"`);
    return { file: `${id}.supplement.yaml`, text: toYaml(specSupplement(def, names)) };
  });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(SUPPLEMENT_DIR, { recursive: true });
  for (const { file, text } of supplementFiles()) writeFileSync(join(SUPPLEMENT_DIR, file), text);
  console.log(`  ✓ ${SUPPLEMENT_DEFS.length} spec supplement(s) → out/specs/`);
}
