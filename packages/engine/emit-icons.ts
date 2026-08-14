/**
 * emit-icons.ts — generates `icon-glyphs.ts` from the SVGs in `icons/` through `icon-set.ts`.
 *
 *   npx tsx packages/engine/emit-icons.ts
 *
 * ── WHY A GENERATED MODULE RATHER THAN READING THE FILES ────────────────────────────────────────
 *
 * This is a hard constraint, not a preference. The engine is dependency-free and buildless **and it
 * bundles into the Figma plugin sandbox, where there is no filesystem.** An emitter that read
 * `.svg` files at runtime would work perfectly under `tsx` and fail in the plugin — which is the
 * one environment that most needs the glyphs, since that is where components get built. A generated
 * module bundles.
 *
 * The module's keys are also what makes `icon.name`'s promise true. `components/icon.ts` types the
 * prop as *"typed to the set vocabulary … an unknown name must fail at compile time, because a
 * missing glyph otherwise fails silently as an invisible gap in production"* — a claim that had no
 * mechanism behind it until this file existed (#833).
 *
 * ── THE TWO-DIRECTION CHECK IS THE POINT ────────────────────────────────────────────────────────
 *
 * EXPECTED is `ICON_SOURCES` — authored by a human. ACTUAL is the directory listing — read from
 * disk. Two independent statements of what the set contains, and this compares them **both ways**:
 *
 *   - a mapping entry naming a file that does not exist → fail
 *   - an `.svg` on disk that no entry maps → fail
 *
 * Neither is a warning. The second is the one that matters and the one a "helpful" version would
 * drop: a glyph sitting in the directory that nothing can reference is invisible in precisely the
 * way `icon.name`'s own description says a missing glyph must never be. Deriving the vocabulary
 * from the directory instead would delete this check entirely while looking like a simplification
 * — the mapping's separateness IS the gate (`docs/34` shape 1, and the DRY warning in CLAUDE.md
 * principle 4).
 *
 * ── WHAT IS EXTRACTED, AND THE ONE TRAP ─────────────────────────────────────────────────────────
 *
 * Each source file is a 24×24 SVG carrying exactly one `<path>` with `fill="currentColor"`, and the
 * `<svg>` wrapper carries `fill="none"`. **Both attributes are called `fill` and they mean opposite
 * things**: the wrapper's disables a default, the path's is the ink binding that lets `icon`'s
 * `tone` prop work through the cascade. Reading the first `fill=` in the file yields `"none"` and
 * produces a set of invisible glyphs that pass every structural check — so the extraction is
 * anchored to the `<path>` element specifically, and the shape of every file is asserted rather
 * than assumed.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_SOURCES } from './icon-set';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, 'icons');
const outFile = resolve(here, 'icon-glyphs.ts');

/** The artboard every glyph is drawn on. `icon.size`'s `md` rung, and the only ratio the set uses. */
const VIEWBOX = '0 0 24 24';

type Glyph = { name: string; source: string; path: string };

const fail = (lines: string[]): never => {
  console.error('\n✗ emit-icons\n');
  for (const l of lines) console.error(`  ${l}`);
  console.error('');
  process.exit(1);
};

// ── BOTH DIRECTIONS ─────────────────────────────────────────────────────────────────────────────
const onDisk = new Set(
  readdirSync(iconsDir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4)),
);
const mapped = new Set(Object.values(ICON_SOURCES));

const errors: string[] = [];
for (const [name, source] of Object.entries(ICON_SOURCES)) {
  if (!onDisk.has(source)) errors.push(`'${name}' maps to '${source}.svg', which is not in icons/ — a stale mapping entry`);
}
for (const source of [...onDisk].sort()) {
  if (!mapped.has(source)) errors.push(`'${source}.svg' is in icons/ and no entry in icon-set.ts maps it — an unreachable glyph, which is the failure icon.name's own description exists to prevent`);
}
// A source file claimed by two of our names would silently make them aliases rather than distinct
// glyphs. That may one day be wanted; it is not wanted by accident.
const seen = new Map<string, string>();
for (const [name, source] of Object.entries(ICON_SOURCES)) {
  const prior = seen.get(source);
  if (prior) errors.push(`'${name}' and '${prior}' both map to '${source}.svg' — two names for one glyph, which is an alias and needs to be a decision rather than a duplicate line`);
  seen.set(source, name);
}
if (errors.length) fail(errors);

// ── EXTRACT ─────────────────────────────────────────────────────────────────────────────────────
const glyphs: Glyph[] = [];
const shapeErrors: string[] = [];
for (const [name, source] of Object.entries(ICON_SOURCES).sort(([a], [b]) => a.localeCompare(b))) {
  const svg = readFileSync(resolve(iconsDir, `${source}.svg`), 'utf8');

  const vb = /viewBox="([^"]*)"/.exec(svg)?.[1];
  if (vb !== VIEWBOX) { shapeErrors.push(`${source}.svg: viewBox is ${vb ?? 'absent'}, expected "${VIEWBOX}" — the set's artboard is icon.size's md rung and a stray ratio scales wrong at every other rung`); continue; }

  // Anchored to <path>, deliberately — see the header. The first `fill=` in the file belongs to the
  // <svg> wrapper and is "none".
  const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
  if (paths.length !== 1) { shapeErrors.push(`${source}.svg: ${paths.length} <path> elements, expected exactly 1 — a multi-path glyph needs a decision about how it composes, not a silent join`); continue; }

  const d = /\bd="([^"]*)"/.exec(paths[0])?.[1];
  if (!d) { shapeErrors.push(`${source}.svg: <path> carries no d attribute`); continue; }

  const pathFill = /\bfill="([^"]*)"/.exec(paths[0])?.[1];
  if (pathFill !== 'currentColor') { shapeErrors.push(`${source}.svg: <path fill="${pathFill ?? 'absent'}">, expected "currentColor" — a baked fill defeats icon's tone prop, which defaults to inherit precisely so a glyph tracks its host's hover/disabled/error cascade`); continue; }

  if (/\bstroke=/.test(svg)) { shapeErrors.push(`${source}.svg: carries a stroke — a Figma stroke's weight is absolute and does not scale with the artboard, and the icon paint slot binds a FILL (docs/40 §5.3)`); continue; }
  if (/<g\b|\btransform=/.test(svg)) { shapeErrors.push(`${source}.svg: carries a group or transform — both complicate the Figma import and the code projection for no gain (docs/40 §5.3)`); continue; }

  glyphs.push({ name, source, path: d });
}
if (shapeErrors.length) fail(shapeErrors);

// ── EMIT ────────────────────────────────────────────────────────────────────────────────────────
const body = glyphs.map((g) => `  '${g.name}': ${JSON.stringify(g.path)},`).join('\n');
const names = glyphs.map((g) => `'${g.name}'`).join(' | ');

const out = `// GENERATED by \`npx tsx packages/engine/emit-icons.ts\` — do not edit.
//
// Source of truth is the pair \`icons/*.svg\` (the geometry) and \`icon-set.ts\` (the names). Editing
// this file is editing the output of a comparison between those two, which the next regen discards.
//
// Every glyph is a single path on a ${VIEWBOX} artboard, drawn with \`fill="currentColor"\` so
// \`icon\`'s \`tone\` prop resolves through the cascade rather than being baked in.
//
// Provenance and licence: \`icons/NOTICE.md\` and \`icons/LICENSE\`. The set is a PLACEHOLDER core,
// intended to be swapped for a client's branded set — which is why consumers reference the names
// below and never the source filenames.

/** The literal glyph vocabulary. \`icon.name\` is typed against this, so an unknown name fails at
 *  compile time rather than rendering an invisible gap (#833). */
export type IconName = ${names};

/** Glyph name → SVG path data, on a ${VIEWBOX} artboard. */
export const ICON_PATHS: Record<IconName, string> = {
${body}
};

/** The artboard every glyph is drawn on. */
export const ICON_VIEWBOX = '${VIEWBOX}';

/** Every glyph name, sorted — the one thing a projection should iterate. */
export const ICON_NAMES: readonly IconName[] = Object.keys(ICON_PATHS) as IconName[];
`;

writeFileSync(outFile, out);
console.log(`  ✓ icon-glyphs.ts — ${glyphs.length} glyphs from ${onDisk.size} source files, ${VIEWBOX}`);
