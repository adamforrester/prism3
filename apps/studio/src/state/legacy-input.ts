/**
 * #4206 (owner decision A, 2026-11-19): a brand stored in a Figma file before a validation tightened still loads.
 *
 * WHY. Two validations refuse inputs the engine used to accept: an empty `typography.links` (#3707, written by the
 * Studio itself when every link box was unticked) and an interactive anchor the engine never read (#3873: a `modeAnchors`
 * column that is no interactive column, which was ignored, and an anchor step off its ramp, which fell back to 500). A
 * file holding one opened with its brand refused and its writes off, with no way out in the UI. So the restore migrates
 * the stored brand to the shape the engine takes now, and says what it changed. New edits stay strictly validated:
 * this runs on a stored brand only, at load, in `main.ts`'s `handleHostMessage`, before `reduce` checks it.
 *
 * WHAT IT CHANGES, and only that:
 *   - `typography.links: []` is dropped, so the default link list applies.
 *   - a `modeAnchors` column the brand has no interactive column for is dropped (the engine ignored it before #3873).
 *   - an anchor step off its column's ramp moves to the nearest step on it, the step the engine's own refusal names.
 * Anything else the engine refuses is left exactly as stored, so it is still refused, by the engine's own words.
 *
 * Pure, no DOM: `test-legacy-input.ts` runs it in Node against the real engine.
 */
import { brandTheme, type BrandInput } from '@prism3/engine';

export type Migrated = { readonly input: unknown; readonly notes: readonly string[] };

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The interactive columns the engine builds for `b`, by name: the built-in two, then `interactivePalettes` (an entry
 *  is named after its palette unless it names itself), or else the legacy `accentPalette`'s one column, `accent`. */
const columnsOf = (b: Loose): Set<string> => {
  const own = Array.isArray(b.interactivePalettes)
    ? b.interactivePalettes.filter(isObj).map((e) => String(e.name ?? e.palette))
    : b.accentPalette !== undefined ? ['accent'] : [];
  return new Set(['primary', 'destructive', ...own]);
};

/** An off-ramp anchor, as the engine refuses it (`theme-brand.ts`, #3873): where it is, and the nearest step it names. */
const OFF_RAMP = /^(modeAnchors\.([^.\s:]+)\.([^.\s:]+)|actionAnchorStep|destructiveAnchorStep|interactivePalettes\[(\d+)\]\.anchorStep): .* is not on the \S+ ramp; the nearest step is (\d+)\./;

/** The stored brand `raw` in the shape the engine takes now, and one DRAFT line per change (none for a current brand). */
export const migrateStoredInput = (raw: unknown): Migrated => {
  if (!isObj(raw)) return { input: raw, notes: [] };
  const b = structuredClone(raw) as Loose;
  const notes: string[] = [];

  const t = b.typography;
  if (isObj(t) && Array.isArray(t.links) && t.links.length === 0) {
    delete t.links;
    notes.push('Link styles use the default text types again.');
  }

  if (isObj(b.modeAnchors)) {
    const cols = columnsOf(b);
    for (const [mode, anchors] of Object.entries(b.modeAnchors)) {
      if (!isObj(anchors)) continue;
      for (const col of Object.keys(anchors)) {
        if (cols.has(col)) continue;
        delete anchors[col];
        notes.push(`The ${mode} anchor for '${col}' is gone: no button set has that name.`);
      }
      if (!Object.keys(anchors).length) delete (b.modeAnchors as Loose)[mode];
    }
    if (!Object.keys(b.modeAnchors).length) delete b.modeAnchors;
  }

  // Each refusal names one anchor, so this asks the engine again after each move; a brand has a handful of anchors.
  for (let i = 0; i < 32; i++) {
    let m: RegExpExecArray | null = null;
    try { brandTheme(b as unknown as BrandInput); break; } catch (e) { m = OFF_RAMP.exec((e as Error).message); }
    if (!m) break;
    const [, where, mode, col, idx, near] = m;
    const step = Number(near);
    let from: unknown;
    if (mode !== undefined) { const a = (b.modeAnchors as Loose)[mode] as Loose; from = a[col]; a[col] = step; }
    else if (idx !== undefined) { const e = (b.interactivePalettes as Loose[])[Number(idx)]; from = e.anchorStep; e.anchorStep = step; }
    else { from = b[where]; b[where] = step; }
    if (from === step) break;   // the engine named the step it already holds: nothing more to move
    const label = mode !== undefined ? `The ${mode} anchor for '${col}'`
      : idx !== undefined ? `The anchor for '${String(((b.interactivePalettes as Loose[])[Number(idx)]).name ?? ((b.interactivePalettes as Loose[])[Number(idx)]).palette)}'`
      : where === 'actionAnchorStep' ? 'The primary anchor' : 'The destructive anchor';
    notes.push(`${label} moved from ${String(from)} to ${step}, the nearest step on its ramp.`);
  }

  return { input: notes.length ? b : raw, notes };
};

/** The strip's line for a migrated restore. DRAFT for the owner (#4206), to `docs/voice-standard.md`. */
export const migratedLine = (notes: readonly string[]): string =>
  `This file's saved brand was updated to load in this version: ${notes.join(' ')} Update file saves the change to the file.`;
