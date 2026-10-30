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
import { requestWebFace, webFace } from './web-fonts';

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

/** What the host has said about its fonts: the family list (empty on the web), each family's style count
 *  (0 = count unknown) and, from #3138, each family's style names (absent from an older host). The `HostSession`
 *  fields of the same names. */
export type HostFonts = {
  readonly hostFonts: readonly string[];
  readonly hostFontStyles: ReadonlyMap<string, number>;
  readonly hostFontStyleNames?: ReadonlyMap<string, readonly string[]>;
};
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

// ── THE BRAND FACE AS DRAWN (#3138, owner decisions Q1, Q3, Q4 A) ─────────────────────────────────────
//
// A preview line set in a brand face draws one of three things, and says which:
//   · the face, at the weight asked: no note;
//   · the face, but the family has no cut at that weight: the NEAREST REAL CUT with `font-synthesis: none` (Q3 A),
//     because a browser otherwise fakes the weight by thickening a lighter cut, a face the brand doesn't own;
//   · a fallback face, because the face can't load here: labeled (Q1 A). On the web and in the network plugin the
//     face is first asked of Google Fonts (`web-fonts.ts`); in the offline plugin that request is not built.
// The cuts come from the best source this host has: Figma's style names (the plugin), the Google Fonts reply (a
// loaded web face), the advisory `KNOWN_WEIGHTS`, or nothing (an unknown family is never warned about).

/** One cut of a family: a numeric weight, upright or italic. */
export type FaceCut = { readonly weight: number; readonly italic: boolean };

/** A Figma style name's weight words, longest first so `Semi Bold` is not read as `Bold`. */
const STYLE_WEIGHTS: ReadonlyArray<readonly [string, number]> = [
  ['extralight', 200], ['ultralight', 200], ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['ultrabold', 800],
  ['hairline', 100], ['thin', 100], ['light', 300], ['regular', 400], ['normal', 400], ['book', 400], ['roman', 400],
  ['medium', 500], ['bold', 700], ['black', 900], ['heavy', 900],
];
/** A style name as a cut: `Semi Bold Italic` → 600 italic, `Italic` → 400 italic. A name with no weight word is 400. */
export const cutOfStyle = (style: string): FaceCut => {
  const k = style.toLowerCase().replace(/[\s_-]+/g, '');
  return { weight: STYLE_WEIGHTS.find(([w]) => k.includes(w))?.[1] ?? 400, italic: /italic|oblique/.test(k) };
};

/** The cuts a family has, from the best source this host has, or null when no source knows the family. */
export const cutsOf = (family: string, fonts: HostFonts): FaceCut[] | null => {
  const names = fonts.hostFontStyleNames?.get(family);
  if (names?.length) return names.map(cutOfStyle);
  const web = webFace(family);
  if (web?.status === 'loaded') return [...web.cuts];
  const known = knownWeightsOf(family);
  return known ? known.flatMap((weight) => [{ weight, italic: false }, { weight, italic: true }]) : null;
};

/** The real cut CSS should draw for `weight`: the nearest in the asked style (upright or italic) when the family has
 *  one, else the nearest of any. A tie takes the lighter cut. */
export const nearestCut = (cuts: readonly FaceCut[], weight: number, italic: boolean): FaceCut => {
  const pool = cuts.some((c) => c.italic === italic) ? cuts.filter((c) => c.italic === italic) : cuts;
  return pool.reduce((a, c) => {
    const d = Math.abs(c.weight - weight) - Math.abs(a.weight - weight);
    return d < 0 || (d === 0 && c.weight < a.weight) ? c : a;
  });
};

/** The notes a brand-face line can carry. DRAFT under `docs/voice-standard.md` (owner decision Q5 A: as drafted). */
export const FACE_NOTE = {
  fallbackFigma: (family: string): string => `${family} can't load in this preview — shown in a fallback face. Figma uses ${family}.`,
  /** The family is missing from this Figma too, so "Figma uses it" would be false; the Faces table says it lacks it. */
  fallbackPreview: (family: string): string => `${family} can't load in this preview — shown in a fallback face.`,
  fallbackFigmaCut: (family: string, w: number): string =>
    `${family} can't load in this preview — shown in a fallback face. It has no ${w} cut, so Apply skips this style in Figma.`,
  fallbackWeb: (family: string): string => `${family} isn't installed on this device — shown in a fallback face.`,
  cutFigma: (family: string, w: number, near: number): string =>
    `${family} has no ${w} cut — shown at ${near}, its nearest. Apply skips this style in Figma.`,
  cutWeb: (family: string, w: number, near: number): string =>
    `${family} has no ${w} cut — shown at ${near}, its nearest. Browsers fake ${w} by thickening ${near}.`,
} as const;

/** How one line draws a brand face: the weight CSS is given, whether synthesis is off, and the note, if any. */
export type FaceDraw = { readonly weight: number; readonly noSynthesis: boolean; readonly fallback: boolean; readonly note: string | null };

/** Decide how a line asking for `family` at `weight` (italic or not) draws on this host. Asks the web-font loader for
 *  a family this frame can't paint, as a side effect; a load that lands repaints on `fonts`. */
export const faceDraw = (family: string | undefined, weight: number, italic: boolean, fonts: HostFonts): FaceDraw => {
  const plainDraw: FaceDraw = { weight, noSynthesis: false, fallback: false, note: null };
  if (!family || /^[a-z-]+$/.test(family)) return plainDraw;   // a generic family is always there
  const shown = fontAvailable(family);
  // Only a face this frame can't paint is asked for, so a face already here sends Google nothing.
  if (!shown) requestWebFace(family);
  const figma = PRISM3_HOST === 'figma';
  const cuts = cutsOf(family, fonts);
  const has = !cuts || cuts.some((c) => c.weight === weight && (c.italic === italic || !cuts.some((x) => x.italic === italic)));
  if (!shown) {
    const inFigma = fonts.hostFontStyles.has(family);
    const note = !figma ? FACE_NOTE.fallbackWeb(family)
      : !inFigma ? FACE_NOTE.fallbackPreview(family)
      : !has ? FACE_NOTE.fallbackFigmaCut(family, weight) : FACE_NOTE.fallbackFigma(family);
    return { weight, noSynthesis: false, fallback: true, note };
  }
  if (has) return plainDraw;
  const near = nearestCut(cuts!, weight, italic).weight;
  return { weight: near, noSynthesis: true, fallback: false, note: figma ? FACE_NOTE.cutFigma(family, weight, near) : FACE_NOTE.cutWeb(family, weight, near) };
};

/** Set a specimen's weight and synthesis from `faceDraw`, and mark it for tests. Returns the note. */
export const drawFace = (e: HTMLElement, d: FaceDraw): string | null => {
  e.style.fontWeight = String(d.weight);
  if (d.noSynthesis) e.style.setProperty('font-synthesis', 'none');
  if (d.fallback) e.dataset.faceFallback = 'true';
  return d.note;
};

/** The Type settings weight control's note for a family missing weights its text types use (Q4 A): its styles, by
 *  name when there are few, then the weights with no cut. Null when nothing is missing or the cuts are unknown. */
export const missingCutsNote = (family: string, weights: readonly number[], fonts: HostFonts): string | null => {
  const cuts = cutsOf(family, fonts);
  if (!cuts) return null;
  const missing = [...new Set(weights)].filter((w) => !cuts.some((c) => c.weight === w)).sort((a, b) => a - b);
  if (!missing.length) return null;
  const names = fonts.hostFontStyleNames?.get(family)
    ?? cuts.map((c) => (c.italic ? (c.weight === 400 ? 'Italic' : `${WEIGHT_NAME[c.weight] ?? c.weight} Italic`) : WEIGHT_NAME[c.weight] ?? String(c.weight)));
  const n = names.length;
  const list = n <= 4 ? `: ${n === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[n - 1]}`}` : '';
  const ws = missing.length === 1 ? `${missing[0]} has` : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]} have`;
  return `${family} has ${n} ${n === 1 ? 'style' : 'styles'}${list}. ${ws} no cut.`;
};
