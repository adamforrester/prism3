/**
 * The one string comparator for anything the engine emits, or compares, by order (#3698 finding 2).
 *
 * `String.prototype.localeCompare` with no locale argument sorts by the HOST's locale: under `cs_CZ`, `ch` sorts after
 * `h`, so the same code emitted a different order on a Czech machine and `regen --check` reported drift on 8 artifacts
 * with nothing changed. This compares UTF-16 code units, which no locale, ICU build or Node version moves.
 *
 * It folds ASCII case first (`toLowerCase`, which unlike `toLocaleLowerCase` reads no locale) and breaks a tie by raw
 * code unit, so the order is total. The fold is deliberate: it is the order the artifacts were committed in under an
 * English host, so this fix moved no emitted byte there. Pure code-unit order would have put `FPO-default-icon` ahead
 * of `arrow-down` and made it Icon's default member in Figma, which is a design change and not this fix's to make.
 *
 * `lint-locale-order.ts` refuses a locale-dependent comparison anywhere under `packages/engine/`. Pure, no imports:
 * the surfaces bundle the emitters that read it.
 */
export const localeFreeCompare = (a: string, b: string): number => {
  const x = a;
  const y = b;
  if (x !== y) return x < y ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};
