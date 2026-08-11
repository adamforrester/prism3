/**
 * Prism3 Figma plugin — LOAD THE FONTS A VARIABLE WRITE WILL FORCE FIGMA TO RE-RESOLVE (#680).
 *
 * Applying the aurora brand to a file that had been themed failed outright, from the writer that
 * touches no text at all:
 *
 *   write failed: in setValueForMode: unloaded font "Clash Display Semi Bold".
 *
 * A text style in the file binds its `fontFamily` to a `font/family/<category>` variable. Writing that
 * variable makes Figma re-resolve the style, and re-resolution needs the resulting face LOADED — per
 * plugin run, so nothing a previous session loaded counts. `write-text-styles.ts` and
 * `write-components.ts` both load fonts before touching text; the variable writer loaded none, which is
 * the whole defect.
 *
 * WHY THE FACE TO LOAD IS A CROSS PRODUCT, NOT A SET EITHER BRAND DECLARES. #680 offered two ways to
 * choose the font set — derive it from the theme, or read what is already in the file — and the reported
 * face is evidence that NEITHER alone is enough. Measured on the two brands from the live run:
 *
 *     aurora's plan names   Clash Display|Bold, Clash Display|Medium, Inter|{Regular,Bold,Medium}, JetBrains Mono|Regular
 *     harbor's plan names   Inter|{Regular,Bold,Semi Bold}, JetBrains Mono|Regular
 *     the live failure was  Clash Display | Semi Bold
 *
 * `Clash Display` is the family aurora is writing. `Semi Bold` is a style only HARBOR names — the file
 * had been themed harbor, and that style is still sitting there. The pair appears in no plan: Figma
 * re-resolves the existing style against the INCOMING family value while keeping its OWN style name. So
 * a theme-derived set misses it (aurora never says `Semi Bold`), and a file-derived set misses it too
 * (the file never said `Clash Display`). It is only visible as the product of the two.
 *
 * That also settles the direction the issue left open: the file read is not optional. A theme-only load
 * additionally misses `Inter|Semi Bold` — a face the file needs and the incoming brand does not mention.
 *
 * DEGRADES, NEVER THROWS. Every load is attempted independently and a failure is recorded, mirroring
 * `write-text-styles`' skip-with-warning posture. Candidates carry their ORIGIN, because the two kinds
 * of failure mean opposite things: a face the theme or the file actually names failing to load is worth
 * a designer's attention, while a crossed pair failing is the expected case (most family × style
 * combinations do not exist) and reporting those would bury the real ones in noise.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. Declared as a port so the Node
 * harness drives it with a shim; the real `figma` structurally satisfies it.
 */
import type { TextStylePlan } from '@prism3/engine/write-plan';
import type { FontName } from './write-text-styles';

/** The minimal `figma` font + text-style surface the preload needs. */
export interface FontPreloadApi {
  /** The file's EXISTING text styles — their current faces, and the styles that will be re-resolved. */
  getLocalTextStylesAsync(): Promise<{ name: string; fontName: FontName }[]>;
  loadFontAsync(fontName: FontName): Promise<void>;
  /** What this Figma can actually load (#499's list). OPTIONAL: without it every candidate is attempted
   *  and the unavailable ones are recorded, which is correct but chattier. */
  listAvailableFontsAsync?(): Promise<ReadonlyArray<{ fontName: FontName }>>;
}

/** Where a candidate face came from — decides whether a failed load is reportable. */
export type FaceOrigin = 'theme' | 'file' | 'crossed';

export type FontPreloadResult = {
  /** faces successfully loaded, so the write that follows cannot fail on them. */
  loaded: number;
  /** faces attempted (loaded + failed) — `loaded + unavailable.length + crossedMisses`. */
  attempted: number;
  /** NAMED faces that would not load: the theme asks for a typeface this Figma does not have, or the
   *  file already uses one. Reportable — a brand is about to lose type it asked for. */
  unavailable: { face: string; origin: FaceOrigin; reason: string }[];
  /** crossed pairs that did not exist. Expected, counted rather than listed (see the header). */
  crossedMisses: number;
  /** the candidate set by origin, so a caller can assert the cross product was actually built. */
  byOrigin: Record<FaceOrigin, number>;
};

const key = (f: FontName): string => `${f.family}|${f.style}`;

/**
 * Every face the imminent variable write could force Figma to re-resolve, with its origin.
 *
 * Exported separately from the loading so the set is assertable without a font registry: the interesting
 * claim is WHICH faces this computes, and a test that has to load them all to find out is testing the
 * host's font list as much as this. Ordered named-before-crossed so the reportable loads happen first.
 */
export const facesToPreload = (
  plan: TextStylePlan,
  existing: readonly { fontName: FontName }[],
): { face: FontName; origin: FaceOrigin }[] => {
  const out: { face: FontName; origin: FaceOrigin }[] = [];
  const seen = new Set<string>();
  const add = (face: FontName, origin: FaceOrigin): void => {
    if (!face.family || !face.style || seen.has(key(face))) return;
    seen.add(key(face));
    out.push({ face, origin });
  };
  // The two named sets first — a real face that will not load must be reported before the speculative
  // pairs get a chance to fill the attempt budget.
  for (const row of plan) add({ family: row.fontFamilyPrimary, style: row.fontStyle }, 'theme');
  for (const s of existing) add(s.fontName, 'file');
  // ...then the product that produced the reported failure: an existing style keeps its own style name
  // and picks up the incoming family (and the mirror case, for a file whose family survives while the
  // brand changes a weight). `seen` means anything already named is not re-added as crossed.
  const themeFamilies = [...new Set(plan.map((r) => r.fontFamilyPrimary))].filter(Boolean);
  const themeStyles = [...new Set(plan.map((r) => r.fontStyle))].filter(Boolean);
  const fileFamilies = [...new Set(existing.map((s) => s.fontName.family))].filter(Boolean);
  const fileStyles = [...new Set(existing.map((s) => s.fontName.style))].filter(Boolean);
  for (const family of themeFamilies) for (const style of fileStyles) add({ family, style }, 'crossed');
  for (const family of fileFamilies) for (const style of themeStyles) add({ family, style }, 'crossed');
  return out;
};

/**
 * Load them. Call this BEFORE the first variable write of an apply — the point is that no
 * `setValueForMode` afterwards can throw `unloaded font`.
 *
 * A face the host's font list does not contain is not attempted (the list, when offered, is the cheaper
 * and quieter answer); a host that offers no list has every candidate attempted instead, so a missing
 * capability degrades to more work rather than to less coverage.
 */
export const preloadFonts = async (
  plan: TextStylePlan,
  api: FontPreloadApi,
): Promise<FontPreloadResult> => {
  let existing: readonly { fontName: FontName }[] = [];
  try {
    existing = await api.getLocalTextStylesAsync();
  } catch {
    /* the file's styles are unreadable — the theme's own faces still load, which is strictly better
     * than loading nothing. Deliberately not fatal: this runs before a write that must still happen. */
  }
  const candidates = facesToPreload(plan, existing);

  // The host's real (family, style) pairs, when it offers them.
  let available: Set<string> | undefined;
  try {
    const list = await api.listAvailableFontsAsync?.();
    if (list) available = new Set(list.map((f) => key(f.fontName)));
  } catch {
    /* no list — fall through to attempting every candidate */
  }

  let loaded = 0;
  let attempted = 0;
  let crossedMisses = 0;
  const unavailable: FontPreloadResult['unavailable'] = [];
  const byOrigin: Record<FaceOrigin, number> = { theme: 0, file: 0, crossed: 0 };

  for (const { face, origin } of candidates) {
    byOrigin[origin]++;
    if (available && !available.has(key(face))) {
      // Known absent from this Figma. A crossed pair missing is the ordinary case; a named one missing
      // is the same fact `write-text-styles` reports as skip-with-warning, recorded here too so the
      // warning does not depend on the text-style pass reaching that row.
      if (origin === 'crossed') crossedMisses++;
      else unavailable.push({ face: key(face), origin, reason: 'not available in this Figma' });
      continue;
    }
    attempted++;
    try {
      await api.loadFontAsync(face);
      loaded++;
    } catch (e) {
      if (origin === 'crossed') crossedMisses++;
      else unavailable.push({ face: key(face), origin, reason: (e as Error)?.message ?? 'load failed' });
    }
  }

  return { loaded, attempted, unavailable, crossedMisses, byOrigin };
};
