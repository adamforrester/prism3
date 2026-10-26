/**
 * The engine's two notes that nothing else on screen says (#2909 Q2909.7 A). The Decisions log, Inspect's third view, is
 * cut: most of its notes restate a lever's value, which the lever already shows. Two kinds appeared nowhere else, so each
 * moves onto the lever it comes from, in the engine's own words:
 *   · an anchor outside the sRGB gamut, which ships clamped (`gamutNote` in `packages/engine/theme.ts`): on Primary, on
 *     the brand color it names, or on the pinned neutral;
 *   · the danger hue the engine chose when the brand gave none (the `danger:` notes there: "the primary is not red, so
 *     danger gets its own red"): on Status colors' Danger.
 * Every note still ships in `$extensions.prism3.decisions`. Pure, no DOM, so `test-engine-warnings.ts` drives it over
 * the engine's real notes.
 */

/** The gamut note's lead, the engine's `anchor '<name>' (oklch …) is outside the sRGB gamut`. */
const GAMUT = /^anchor '(.+?)' \(oklch [^)]*\) is outside the sRGB gamut/;

/** The engine's sentence, its first letter raised, as a line under a lever reads. */
const asLine = (note: string): string => note.charAt(0).toUpperCase() + note.slice(1);

/** The gamut warning for the anchor named `name` (`primary`, a brand color's name, or `neutral`), or null. */
export const gamutWarning = (notes: readonly string[], name: string): string | null => {
  const n = notes.find((x) => GAMUT.exec(x)?.[1] === name);
  return n ? asLine(n) : null;
};

/** The danger hue the engine substituted, as its notes say it: every `danger:` note but the one that names the brand's
 *  own hue, which says what the brand set. Empty when the brand set danger itself. */
export const dangerSubstitution = (notes: readonly string[]): string[] =>
  notes.filter((n) => n.startsWith('danger: ') && !n.startsWith("danger: the brand's hue")).map((n) => asLine(n.slice('danger: '.length)));
