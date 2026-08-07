/**
 * Read the fonts this Figma can actually load (docs/22; the #113 Figma arm).
 *
 * The typeface library authors a font family as a free string, and a name Figma cannot load costs a
 * silent subset of the Text Styles at write time (`applyTextStylePlan` skips-with-warning by design).
 * The main thread knows the real list; this is the reader that hands it up to the shared UI.
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, `lib` WITHOUT `dom`), so this file cannot
 * touch the DOM. Behind a narrow structural port for the same reason as `StylesApi`: it makes the
 * dedupe/sort shim-testable without a live Figma.
 */

/** The one Figma call this needs. Structural, so the global `figma` satisfies it — no cast. */
export interface FontsApi {
  listAvailableFontsAsync(): Promise<ReadonlyArray<{ fontName: { family: string; style: string } }>>;
}

/**
 * The available font FAMILIES, deduped and sorted.
 *
 * Figma returns one entry per (family, style) pair, so a few hundred families arrive as several
 * thousand entries. The input this feeds authors a family, so styles are collapsed here rather than
 * in the UI — it keeps the message payload honest about what it can drive. Per-style/weight
 * validation is a separate concern (see the spec's out-of-scope list).
 *
 * Errors are NOT caught here: the caller decides the failure mode (the main thread posts nothing, so
 * the UI keeps its free-text behavior). Swallowing a rejection into `[]` would report "no fonts" for
 * what is actually a broken call.
 */
export const listFamilies = async (api: FontsApi): Promise<string[]> => {
  const fonts = await api.listAvailableFontsAsync();
  const families = new Set<string>();
  for (const f of fonts) families.add(f.fontName.family);
  return [...families].sort((a, b) => a.localeCompare(b));
};

/**
 * The same families, each with HOW MANY styles Figma has for it.
 *
 * Why a count and not just the name: the UI's "on this device" column was answering the wrong
 * question. It probed canvas metrics — *can this iframe paint a specimen?* — and reported
 * "Not installed" for Roboto, which this Figma carries with 36 styles. The probe was not broken; it
 * measured the only thing an iframe with `networkAccess: none` can measure, which is not the fact
 * the user needs. Figma's list is authoritative about what a write will load, so the column now
 * reads from here, and the count is what makes the answer specific rather than a bare tick.
 *
 * A count is also the cheapest true signal about weights. A family in the list guarantees the
 * FAMILY resolves, not that it carries the specific style a text style asks for; "36 styles" invites
 * the right amount of doubt where "✓" implies a guarantee this cannot make.
 *
 * Ordering and dedupe match `listFamilies` exactly — same `Set`-then-sort, same comparator — because
 * the UI uses this for both the combobox and the table and a divergence would show as two different
 * orders in one panel.
 */
export const listFamilyStyleCounts = async (api: FontsApi): Promise<Array<{ family: string; styles: number }>> => {
  const fonts = await api.listAvailableFontsAsync();
  const counts = new Map<string, number>();
  for (const f of fonts) counts.set(f.fontName.family, (counts.get(f.fontName.family) ?? 0) + 1);
  return [...counts.entries()]
    .map(([family, styles]) => ({ family, styles }))
    .sort((a, b) => a.family.localeCompare(b.family));
};
