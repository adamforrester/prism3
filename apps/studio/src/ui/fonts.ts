/**
 * Font availability, for the Type controls and previews (UI redesign S6.1: moved out of `main.ts` unchanged,
 * so the new Type page can ask the same questions without importing `main.ts`).
 *
 * Two questions, kept apart (the reasoning lived on `faceStatus` in `main.ts` and moved with it):
 *   · `fontAvailable`: can THIS frame paint a specimen in the face? A canvas probe, offline, identical in the
 *     plugin iframe (`networkAccess: none`).
 *   · `faceStatus`: will the face load where the text styles are written? On the web that is the probe; in
 *     Figma the host's font list is authoritative and the probe only says whether the specimen beside it is
 *     the real face or a fallback.
 * Plus the advisory weight map (#103 Phase B): which numeric weights a known family ships. Advisory only: an
 * unknown family is never warned about.
 *
 * DOM-LIGHT. Nothing runs at import: the probe's canvas is made on the first question (#896).
 */

/** A curated, best-effort map of common families to the numeric weights they actually ship. Used only to
 *  WARN; keys are matched case-insensitively against the family's primary name. Mirrors the engine's
 *  per-family emit fallbacks (#112). */
export const KNOWN_WEIGHTS: Record<string, number[]> = {
  'Inter': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Roboto': [100, 300, 400, 500, 700, 900], 'Roboto Mono': [100, 200, 300, 400, 500, 600, 700],
  'Clash Display': [200, 300, 400, 500, 600, 700], 'JetBrains Mono': [100, 200, 300, 400, 500, 600, 700, 800],
  'Helvetica': [400, 700], 'Helvetica Neue': [400, 700], 'Arial': [400, 700],
  'Georgia': [400, 700], 'Times New Roman': [400, 700],
  'Space Grotesk': [300, 400, 500, 600, 700], 'DM Sans': [400, 500, 700], 'DM Mono': [300, 400, 500],
  'IBM Plex Sans': [100, 200, 300, 400, 500, 600, 700], 'IBM Plex Mono': [100, 200, 300, 400, 500, 600, 700],
  'Work Sans': [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Manrope': [200, 300, 400, 500, 600, 700, 800],
  'Poppins': [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Montserrat': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Lato': [100, 300, 400, 700, 900], 'Open Sans': [300, 400, 500, 600, 700, 800], 'Nunito': [200, 300, 400, 500, 600, 700, 800, 900],
  'Source Sans 3': [200, 300, 400, 500, 600, 700, 800, 900], 'Source Serif 4': [200, 300, 400, 500, 600, 700, 800, 900],
  // #1727 part 2: the Prism3 default theme's display face. It ships 400 to 900, each with an italic.
  'Playfair Display': [400, 500, 600, 700, 800, 900],
};
const KNOWN_WEIGHTS_LC: Record<string, number[]> = Object.fromEntries(Object.entries(KNOWN_WEIGHTS).map(([k, v]) => [k.toLowerCase(), v]));
/** The known weight list for a family primary name, or null when the family is unknown (no warning). */
export const knownWeightsOf = (fontName: string | undefined): number[] | null => (fontName ? KNOWN_WEIGHTS_LC[fontName.trim().toLowerCase()] ?? null : null);

/** The CSS weight names, for a weight's tooltip and read-out. */
export const WEIGHT_NAME: Record<number, string> = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};

/** Offline font-availability detection. A family that fails to resolve falls through to the fallback stack,
 *  so its measured width matches the bare fallback's. Three baselines guard against a false negative when the
 *  face happens to match one of them. The probe's canvas is made on the first question rather than at import:
 *  `undefined` = not made yet; `null` = made, but this browser gave no 2D context, which reads as "not
 *  available". */
let fontProbe: CanvasRenderingContext2D | null | undefined;
export const fontAvailable = (name: string | undefined): boolean => {
  if (!name) return false;
  if (fontProbe === undefined) fontProbe = document.createElement('canvas').getContext('2d');
  const ctx = fontProbe;
  if (!ctx) return false;
  const probe = 'mmmmmmmmmmlliWWWWWWjgq';
  return ['monospace', 'sans-serif', 'serif'].some((base) => {
    ctx.font = `72px ${base}`;
    const w0 = ctx.measureText(probe).width;
    ctx.font = `72px "${name}", ${base}`;
    return Math.abs(ctx.measureText(probe).width - w0) > 0.5;
  });
};

/** What the host has said about its fonts: the family list (empty on the web) and each family's style count
 *  (0 = count unknown). The two `HostSession` fields of the same names. */
export type HostFonts = { readonly hostFonts: readonly string[]; readonly hostFontStyles: ReadonlyMap<string, number> };
export type FaceStatus = { ok: boolean; label: string; title: string; fallbackPreview: boolean };
/** What the library table's status column reports for one face. With no host list (web) the probe is the
 *  only source; once the host has answered, its list decides and the probe only says whether the specimen is
 *  the real face. `styles` is a count, not a guarantee: a text style still needs its specific weight (#499). */
export const faceStatus = (name: string, fonts: HostFonts): FaceStatus => {
  const rendersHere = fontAvailable(name);
  if (!fonts.hostFonts.length) {
    // Web: the probe is the only source, and "installed on this device" is exactly what it measures.
    return {
      ok: rendersHere,
      label: rendersHere ? '✓ Installed' : '⚠ Not installed',
      title: rendersHere ? `${name} resolves on this device` : `${name} is not installed here — the preview falls back`,
      fallbackPreview: !rendersHere,
    };
  }
  const styles = fonts.hostFontStyles.get(name);
  if (styles === undefined) {
    return {
      ok: false,
      label: '⚠ Figma lacks it',
      title: `This Figma cannot load "${name}", so every text style asking for it will be skipped. `
        + 'Spelling is exact — case and spaces included.',
      fallbackPreview: true,
    };
  }
  // Count 0 means an older host sent names without counts: say less rather than invent a number.
  const label = styles > 0 ? `✓ ${styles.toLocaleString('en-US')} ${styles === 1 ? 'style' : 'styles'}` : '✓ Figma has it';
  return {
    ok: true,
    label,
    title: styles > 0
      ? `Figma can load ${name} (${styles.toLocaleString('en-US')} styles). That settles the family — `
        + 'a text style still skips if the family lacks the specific weight it asks for.'
      : `Figma can load ${name}.`,
    fallbackPreview: !rendersHere,
  };
};
