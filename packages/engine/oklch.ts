/**
 * Prints a hex color as the OKLCH anchor a design.md takes (#4176, owner decision b, 2026-11-19).
 *
 *   npx tsx packages/engine/oklch.ts '#2F6B4F' ['#…']
 *
 * Prints each hex color as the OKLCH object a design.md anchor takes (`primary`, `neutral.anchor`,
 * `brandColors[].oklch`), through `hex-anchors.ts`, the conversion `brandTheme` applies to a hex anchor and the
 * standard-dialect classifier applies to a flat `colors:` map. So the numbers it prints and the hex they came from
 * build the same anchor, to the printed precision (lightness and chroma to four places, hue to two). An 8- or 4-digit
 * hex is taken too, and its alpha dropped, as the engine drops it (#4312, owner decision B).
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEX_ANCHOR, hexToAnchor, formatAnchor } from './hex-anchors';

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.some((a) => !HEX_ANCHOR.test(a))) {
    const bad = args.find((a) => !HEX_ANCHOR.test(a));
    console.error(bad !== undefined
      ? `✖ ${JSON.stringify(bad)} is not a hex color; pass #rrggbb, #rgb, #rrggbbaa or #rgba, such as '#2f6b4f'. An alpha is dropped.`
      : `usage: npx tsx packages/engine/oklch.ts '#rrggbb' [...]  prints each color as an OKLCH anchor for a design.md`);
    process.exit(1);
  }
  for (const a of args) console.log(`${a}  →  ${formatAnchor(hexToAnchor(a))}`);
}
