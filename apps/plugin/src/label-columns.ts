/**
 * THE LABEL COLUMN (#2705) — how wide a set's grid columns are kept so the column labels above them read in full.
 *
 * A column label names a state ("Focus visible") over a column of members. On a narrow set (radio-control's controls
 * are 32px wide at most) the label was fixed to the column's width and clipped to "Hove", "esse", "is vis". Of the
 * two shapes the issue allows, the COLUMNS GROW: a label hugging its text and centered on a 32px column would cover
 * its neighbours on a 56px pitch, so only wider columns keep every label whole AND clear of the next one.
 *
 * ONE WIDTH PER SET, the widest column label's own width as `drawFurniture` measures it off the file's `_Label`, so a
 * restyled `_Label` (a larger face) widens the columns to match. Every column narrower than it is widened to it, and
 * its members sit centered in the extra room, so the label, centered on its column, is centered over them too. A
 * column already as wide keeps its members where they were.
 *
 * RECORDED ON THE SET (shared plugin data `prism3`/`labelColumn`) because three readers must agree and only one can
 * measure: `drawFurniture` measures and writes it; the executor's LAY OUT pass (`write-components.ts`) and the
 * dry run's `gridMoves` (`update-plan.ts`) read it, so an update re-lays the widened grid and the next dry run reads
 * it as up to date, never as members to move. A set with no record lays out as before.
 */
import { NS } from './persist-figma';

export const LABEL_COLUMN_KEY = 'labelColumn';

/** The set's recorded label column width, or 0 when it has none (or an unreadable one). */
export const readLabelColumn = (set: unknown): number => {
  try {
    const raw = (set as { getSharedPluginData?: (ns: string, k: string) => string }).getSharedPluginData?.(NS, LABEL_COLUMN_KEY) ?? '';
    const n = Number(raw);
    return raw && Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
};

/**
 * The grid's columns with the label width applied: each column's width, at least `min`, and how far its members sit
 * in from its left edge. Sparse in, sparse out: a column with no member stays empty and adds nothing, as the grid
 * reduces it.
 */
export const labelColumns = (colW: readonly number[], min: number): { width: number[]; inset: number[] } => ({
  width: colW.map((w) => Math.max(w, min)),
  inset: colW.map((w) => Math.max(0, Math.round((min - w) / 2))),
});
