/**
 * A value the caller has established is present: a constant list's first entry, a key of a table built over the same
 * list, a regex group that always captures. A miss is a named throw, never the silent `undefined` an unchecked index
 * reads as (#1182, `noUncheckedIndexedAccess`). Every caller would otherwise have thrown a bare TypeError a line later,
 * or carried the `undefined` on. The engine's modules each hold the same helper (`modes.ts`, `ramp.ts`, …).
 */
export const must = <T>(x: T | undefined, what: string): T => {
  if (x === undefined) throw new Error(`studio: ${what} is missing`);
  return x;
};
