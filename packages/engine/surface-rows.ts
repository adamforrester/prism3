/**
 * Prism3 engine — WHICH ROLES THE POINTER TIER CARRIES (#893, #1013, #1133).
 *
 * Extracted from `emit-figma-surface.ts` for one reason, and it is a `docs/34` reason rather than a
 * tidiness one. The pointer tier is materialised TWICE — once as the DTCG `color.*` alias tier
 * (`tree.ts`) and once as the Figma `color.surface` collection (`emit-figma-surface.ts`) — and the two
 * formats are only reconcilable while the row set is IDENTICAL. Two derivations of "which roles get a
 * pointer" would be two expressions of one fact, free to diverge, with no gate able to tell which one
 * was right. So there is one derivation and both materialisations read it.
 *
 * ── #1133 REVERTED THE SURFACE AXIS, AND THE MEMBERSHIP RULE GOT SIMPLER FOR IT ──────────────────
 *
 * This file used to derive a `default`/`inverse` PAIR per row, because the Figma collection carried a
 * second mode and the pair was what that mode selected between. Inverse is name-encoded again (#1133),
 * the collection is single-mode, and there is no pair to derive: a row is a POINTER at one target, and
 * the rule is uniform — **every non-inverse role gets one.**
 *
 * Two things that used to live here are gone with the mode, and both are worth naming so nobody
 * reintroduces them looking for the old shape:
 *
 *   · `inverseCounterpart` — the three-shape counterpart lookup (`border.inverse.<r>`,
 *     `interactive.<p>.inverse.<slot>`, `text.on-inverse.<r>`). It answered "what does the inverse
 *     mode point at", which is not a question any more. `test.ts` still re-derives the same lookup
 *     LOCALLY for the coverage register's both-directions arms — deliberately its own copy, so the
 *     register is checked against an independent derivation rather than against this file (`docs/34`).
 *   · `gapDisposition` — the per-entry `self`/`omit` instruction read out of `inverse-coverage.ts`.
 *     A gap could steer emission because a row for an unpaired role had to answer "and in the inverse
 *     mode?". With one mode it does not, so **nothing here reads the register any more.** The register
 *     survives (it records which appearance roles have no inverse counterpart, which is what bounds the
 *     set of components that can have an inverse variant) but it no longer decides a row.
 *
 * That second point moves an enforcement, so it is stated rather than assumed: an UNREGISTERED gap
 * used to emit no row and `test.ts` failed it by name. Now it emits a row like anything else, and
 * `test.ts`'s (a3) arms are the only thing that fails it. They still do, by name, in both directions.
 *
 * `isInverseRole` stays, and does the same job it always did: an inverse role is never a row of its
 * own. It is bound at the appearance tier, by name, which is #1133's whole model.
 *
 * `emit-figma-surface.ts` re-exports everything here, so every existing importer is unchanged.
 *
 * PURE — no `node:*`, no I/O, and deliberately NO import of `tree.ts`: `tree.ts` imports THIS, and
 * the row rule is a question about resolved roles rather than about the emitted tree.
 */
import { Theme } from './theme';
import { resolveAllModes } from './modes';

/** True for a role that IS an inverse-context variant, so it is never a row of its own — it is bound
 *  at the appearance tier by name (#1133). */
export const isInverseRole = (k: string): boolean => /(^|\.)inverse(\.|$)|(^|\.)on-inverse(\.|$)/.test(k);

/**
 * One pointer row. A single field, and kept as an OBJECT rather than collapsed to a bare `string`
 * deliberately: `tree.ts`, `emit-figma-surface.ts` and `apps/studio` all read `r.role`, so the shape
 * is what keeps #1133 out of three files it has no business touching. It also leaves the row somewhere
 * to grow if a second axis is ever earned back — which #1133 decided against as a MODE, not forever.
 */
export type SurfaceRow = { role: string };

/**
 * The rows, from the role KEY SET alone.
 *
 * Takes the key set rather than a `Theme` so `tree.ts` can call it with the role keys it already
 * resolved, instead of resolving every mode a second time. The rule is a question about which names
 * exist, and nothing below reads a value.
 */
export const surfaceRowsFor = (known: Set<string>): SurfaceRow[] =>
  [...known].sort().filter((role) => !isInverseRole(role)).map((role) => ({ role }));

/**
 * The rows for a theme. Exported so `test.ts` can assert over them without re-deriving the mapping —
 * a re-derivation would be the gate checking the emitter against a copy of the emitter.
 */
export const surfaceRows = (theme: Theme): SurfaceRow[] => {
  const light = resolveAllModes(theme).find((m) => m.mode === 'light');
  if (!light) return [];
  return surfaceRowsFor(new Set(Object.keys(light.roles)));
};
