/**
 * Prism3 engine — BRANDINPUT PERSISTENCE (serialise + version guard), docs/22 / #131 / #480.
 *
 * #110 seeds the shared UI from an existing themed file only INFORMATIONALLY: a `ReadbackSnapshot`
 * is resolved colour values, and the `BrandInput` knobs (primary OKLCH, neutral cast, levers) can't
 * be reverse-engineered from them. To truly round-trip, the plugin persists the exact `BrandInput`
 * alongside the variables it writes (in Figma shared-data) and rehydrates the UI from it on boot.
 *
 * This module is the pure half of that: the on-the-wire shape (`{ v, input }`) + the version guard.
 * Bump `PERSIST_VERSION` when the `BrandInput` shape changes incompatibly.
 *
 * #480: the guard existed but was never bumped across #341 (`displayCeiling` number → rung name) or
 * #415 (`families.display`/`text`/`mono` role tier collapsed into `families.<category>`) — so a blob
 * written before either PR still carries `v: 1` and was passing the OLD check unnoticed, decoding
 * into today's `BrandInput` shape with a stale `families` tree and a numeric `displayCeiling` where a
 * rung name is now expected. That is the dangerous case named in #480: a bare number silently
 * *parses* as something in the new shape rather than failing to parse at all. `PERSIST_VERSION` is
 * bumped to 2 here to close that specific drift, and — more importantly — the guard now REFUSES
 * LOUDLY (throws `UnrecognizedPersistedInputError`) on anything present-but-untrusted instead of
 * quietly collapsing to `null`. Absence (nothing ever stored — a genuinely fresh file) is the only
 * case that still resolves to `null`; a stored-but-unrecognized blob is a fact the caller must
 * surface, not a fact it may treat like absence. This is the version-stamp FLOOR only (#480 option
 * 1) — no migration for the pre-#341/#415 shape is implemented here; that is a deliberately separate
 * decision (#480 option 2), to be made once it is known whether a file worth restoring actually
 * carries it.
 *
 * PURE — no `node:*`, no `figma.*`, no I/O (throwing an `Error` is still pure; it is data about the
 * input, not an effect). The plugin's `persist-figma.ts` port binds it to `figma.root`; the engine
 * suite tests it directly. `BrandInput` is plain JSON (OKLCH objects, strings, numbers, arrays,
 * booleans), so `JSON.stringify`/`parse` round-trips it losslessly and it stays far under Figma's
 * 100 kB shared-data entry cap.
 */
import type { BrandInput } from './theme';

/** Schema version of the persisted blob. Bump on an incompatible `BrandInput` change — a stored
 *  blob whose `v` differs is REJECTED (throws `UnrecognizedPersistedInputError`), never mis-read.
 *  #480: bumped 1 → 2 because #341/#415 changed the `BrandInput` shape without a bump; every blob
 *  written before this change (2026-08) is `v: 1` under the OLD shape and must now be refused. */
export const PERSIST_VERSION = 2;

/** The wire shape written to shared-data: the version tag + the verbatim `BrandInput`. */
type Persisted = { v: number; input: BrandInput };

/**
 * Thrown by `deserializeBrandInput` when a NON-EMPTY stored blob can't be trusted: unparseable JSON,
 * no recognizable version stamp, a version this build doesn't understand, or a missing `input`. This
 * is deliberately NOT the same signal as "nothing was ever stored" (absence stays `null`) — a caller
 * that collapsed both to one signal would silently theme-restore garbage (or silently do nothing)
 * instead of telling the designer their file needs re-import. See #480.
 */
export class UnrecognizedPersistedInputError extends Error {
  constructor(detail: string) {
    super(
      `This file's saved Prism3 brand data ${detail}. It was likely themed with an older or ` +
        `incompatible version of the plugin and can't be safely restored — re-theme this file (or ` +
        `re-import the brand) to bring it up to the current schema.`,
    );
    this.name = 'UnrecognizedPersistedInputError';
  }
}

/** Serialise a `BrandInput` for storage — the version-tagged JSON blob. */
export const serializeBrandInput = (input: BrandInput): string =>
  JSON.stringify({ v: PERSIST_VERSION, input } satisfies Persisted);

/**
 * Parse a stored blob back into a `BrandInput`. Returns `null` only when `raw` is empty — nothing
 * was ever stored, i.e. a genuinely fresh file/session, which is not a drift signal. Any NON-EMPTY
 * blob that can't be trusted (unparseable JSON, not an object, missing/mismatched version stamp, or
 * a missing `input`) THROWS `UnrecognizedPersistedInputError` rather than returning `null` — #480:
 * an old/foreign/corrupt blob must be refused loudly, not silently treated as absence (which a caller
 * would render identically to "no theme yet", hiding a round-trip failure) or silently parsed as the
 * current shape (which is how a numeric `displayCeiling` could pass as a valid-looking rung).
 */
export const deserializeBrandInput = (raw: string): BrandInput | null => {
  if (!raw) return null; // nothing stored — genuinely fresh, not drift
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UnrecognizedPersistedInputError('is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new UnrecognizedPersistedInputError('is not a recognizable Prism3 payload');
  }
  const { v, input } = parsed as Partial<Persisted>;
  if (v !== PERSIST_VERSION) {
    throw new UnrecognizedPersistedInputError(
      typeof v === 'number'
        ? `is schema v${v}, but this build understands v${PERSIST_VERSION}`
        : 'has no recognizable schema version stamp',
    );
  }
  if (typeof input !== 'object' || input === null) {
    throw new UnrecognizedPersistedInputError('is missing its brand payload');
  }
  return input as BrandInput;
};
