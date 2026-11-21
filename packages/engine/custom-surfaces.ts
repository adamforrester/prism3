/**
 * Prism3 engine — A CUSTOM MODE'S OWN SURFACES ACROSS SAVE AND LOAD (#1946, owner decisions O2 A and 5b C).
 *
 * Before #1946 a custom mode followed its base mode's surfaces live (`surfaces[base]`); since then it reads only its
 * own `surfaces[name]`. A brand written before the change carries no `surfaces[name]` (the schema refused the key), so
 * read as it is it would restyle its custom modes. Each reader tells an old brand apart its own way, then copies:
 *   · a saved brand (`persist-input.ts`) by its version stamp: only a v2 blob is migrated (O2 A);
 *   · a design.md (`design-md.ts`) by the key itself (5b C, 2026-11-21): the export always writes `surfaces.<name>`
 *     for every custom mode (`withOwnSurfaces`), so a custom mode with no such key is from a file that predates
 *     #1946, and only that mode is given a copy of its base's surfaces (`copyBaseSurfaces`). A key that is present,
 *     `{}` included, is taken as it is.
 *
 * PURE: neither function mutates its argument, and both return the argument itself when nothing changes. Both read
 * the input defensively, because a parsed design.md is not yet schema-validated. Names and bases are read only as own
 * keys, so a base that names an `Object.prototype` key (`constructor`, `__proto__`) copies nothing. The copy is deep, by
 * JSON (the Figma main thread is not guaranteed `structuredClone`).
 */
import type { BrandInput } from './theme';

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const customModesOf = (input: BrandInput): { name: string; base: string }[] =>
  (Array.isArray(input.customModes) ? input.customModes : [])
    .filter((c): c is { name: string; base: 'light' | 'dark' } => !!c && typeof c === 'object' && typeof c.name === 'string');

/** For each custom mode with no own `surfaces[name]`, a deep copy of `surfaces[base]` (where that is an own, defined
 *  key). Read side: a brand written before #1946. */
export const copyBaseSurfaces = (input: BrandInput): BrandInput => {
  const surfaces = input.surfaces as Record<string, unknown> | undefined;
  if (!surfaces || typeof surfaces !== 'object') return input;
  const next: Record<string, unknown> = { ...surfaces };
  let moved = false;
  for (const c of customModesOf(input)) {
    if (own(next, c.name) || typeof c.base !== 'string' || !own(surfaces, c.base) || surfaces[c.base] === undefined) continue;
    next[c.name] = JSON.parse(JSON.stringify(surfaces[c.base]));
    moved = true;
  }
  return moved ? { ...input, surfaces: next as BrandInput['surfaces'] } : input;
};

/** Every custom mode carries an own `surfaces[name]`, as `{}` where it has none (`{}` resolves exactly as no entry
 *  does: the family's defaults). Write side: what makes an absent key mean "written before #1946". */
export const withOwnSurfaces = (input: BrandInput): BrandInput => {
  const modes = customModesOf(input);
  if (!modes.length) return input;
  const surfaces = (input.surfaces && typeof input.surfaces === 'object' ? input.surfaces : {}) as Record<string, unknown>;
  const missing = modes.filter((c) => !own(surfaces, c.name) || surfaces[c.name] === undefined);
  if (!missing.length) return input;
  const next: Record<string, unknown> = { ...surfaces };
  for (const c of missing) next[c.name] = {};
  return { ...input, surfaces: next as BrandInput['surfaces'] };
};
