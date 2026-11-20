/**
 * HEX ANCHORS (#4133, owner decision A, 2026-11-19). Pure: `brandTheme` imports it, so it reaches the plugin and
 * studio bundles, and carries no `node:` import. The command-line form is `oklch.ts`.
 *
 * The brand input takes an anchor (`primary`, `neutral.anchor`, `brandColors[].oklch`) in OKLCH or as a hex color.
 * A hex is converted at the top of `brandTheme` by `resolveHexAnchors` below, through the same conversion the
 * standard-dialect classifier uses (`classify-colors.ts`), so a brief that writes the hex and a brief that writes the
 * printed OKLCH build the same anchor to the printed precision. The CLI is for an author who wants the numbers in the
 * brief itself, which is what `prism3-theme` step 1 asks for.
 *
 * Precision: the engine converts at full precision. The CLI and the note print lightness and chroma to four places
 * and hue to two (`n4`, `n2`, the precision the notes already print); the printed numbers convert back to the same
 * hex, which `test.ts`'s #4176 arm checks over a sweep of colors.
 */
import { hexToRgb, rgbToOklch, storedOklch, type OKLCH } from './color';
import { n2, n4 } from './theme-types';

/** A hex color as the input schema takes it (`$defs.hexColor`): `#rrggbb`, `#rgb`, `#rrggbbaa` or `#rgba`. An alpha
 *  is dropped (owner decision B on #4312, 2026-11-20), as the standard dialect's `hexToRgb` drops it: an anchor is
 *  opaque, and real extractions often carry an 8-digit hex like `#c8102eff`. Kept in step with the schema's pattern by
 *  `test.ts`'s #4312 arm. */
export const HEX_ANCHOR = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})$/;

/** The stored OKLCH for a hex color: a hue-less gray stores hue 0 (#2280), as the classifier does. `hexToRgb` drops
 *  the alpha of an 8- or 4-digit hex. */
export const hexToAnchor = (hex: string): OKLCH => storedOklch(rgbToOklch(hexToRgb(hex)));

/** How an anchor prints in a note or on the command line. */
export const formatAnchor = (o: OKLCH): string => `{ l: ${n4(o.l)}, c: ${n4(o.c)}, h: ${n2(o.h)} }`;

/** Convert every hex anchor in an authored brand input to OKLCH, with one note per conversion. Anything that isn't a
 *  hex string at an anchor site is left as it is for the schema and the engine to judge. Returns a copy; the input is
 *  not changed. DRAFT note wording. */
export const resolveHexAnchors = (raw: unknown): { input: unknown; notes: string[] } => {
  const notes: string[] = [];
  if (!raw || typeof raw !== 'object') return { input: raw, notes };
  const input: any = { ...(raw as object) };
  const convert = (at: string, v: unknown): unknown => {
    if (typeof v !== 'string' || !HEX_ANCHOR.test(v)) return v;
    const o = hexToAnchor(v);
    notes.push(`${at}: the hex ${v}, converted to OKLCH ${formatAnchor(o)}.`);
    return o;
  };
  input.primary = convert('primary', input.primary);
  if (input.primary === undefined) delete input.primary;
  if (input.neutral && typeof input.neutral === 'object' && input.neutral.anchor !== undefined)
    input.neutral = { ...input.neutral, anchor: convert('neutral.anchor', input.neutral.anchor) };
  if (Array.isArray(input.brandColors))
    input.brandColors = input.brandColors.map((bc: any) => bc && typeof bc === 'object' && 'oklch' in bc
      ? { ...bc, oklch: convert(`brandColors '${bc.name}'`, bc.oklch) } : bc);
  return { input, notes };
};

