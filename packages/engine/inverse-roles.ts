/**
 * Prism3 engine — WHAT MAKES A ROLE AN INVERSE ROLE (#893, #1013, #1133, #1140, #1148).
 *
 * One predicate. This file was `surface-rows.ts` and derived the row set of the POINTER tier — which
 * roles got a short `color.*` name — because that tier was materialised TWICE, as the DTCG alias tier
 * and as the Figma `color.surface` collection, and the two formats were only reconcilable while the row
 * set was IDENTICAL. One derivation, both materialisations read it (`docs/34`).
 *
 * #1148 deleted the pointer tier and renamed the value tier to `color`, so every role has the short
 * name and there is no membership question left to derive: `surfaceRowsFor`, `surfaceRows` and the
 * `SurfaceRow` type went with the tier they described. They were DELETED rather than left returning
 * everything, which would have been an empty vocabulary reading as a pass (`docs/34` shape 9).
 *
 * What remains is the one thing the row rule USED, not the rule itself, and it has an independent job:
 * `apps/studio` asks "is this swatch on a flipped ground?" to decide what to render behind it, and
 * `test.ts` needs the question answered without owning a second copy of the answer.
 *
 * PURE — no `node:*`, no I/O, no imports at all.
 */

/**
 * True for a role that IS an inverse-context variant — a re-statement of a page role for a flipped
 * ground rather than a role of its own.
 *
 * ONE SEGMENT, IN ONE POSITION (#1140). This was
 * `/(^|\.)inverse(\.|$)|(^|\.)on-inverse(\.|$)/` — two spellings, any depth — because the marker sat at
 * depth 2, 3 or 4 depending on the family and was `on-inverse` for `text`/`icon`. Under Rule 1 an
 * inverse role is exactly `inverse.` + a page role name, so the test is a prefix test.
 *
 * It stays a STRING test rather than reading a list of inverse roles from `modes.ts`, which is the
 * `docs/34` point: the predicate and the thing it classifies must not be one expression. A role that
 * gains the prefix is classified automatically; a role that loses it stops being classified
 * automatically; and `test.ts` (a3) holds the coverage register against its OWN local derivation
 * rather than against this line.
 */
export const isInverseRole = (k: string): boolean => k === 'inverse' || k.startsWith('inverse.');
