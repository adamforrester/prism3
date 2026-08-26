/**
 * Prism3 engine — THE SURFACE AXIS: which roles have a default/inverse pair (#893, #1013).
 *
 * Extracted from `emit-figma-surface.ts` for one reason, and it is a `docs/34` reason rather than a
 * tidiness one. After the swap (#1013) the surface axis is materialised TWICE — once as the DTCG
 * `color.*` alias tier (`tree.ts`) and once as the Figma `color` collection's two modes
 * (`emit-figma-surface.ts`) — and the two formats are only reconcilable while the row set is
 * IDENTICAL. Two derivations of "which roles pair" would be two expressions of one fact, free to
 * diverge, with no gate able to tell which one was right. So there is one derivation and both
 * materialisations read it.
 *
 * `emit-figma-surface.ts` re-exports everything here, so every existing importer is unchanged.
 *
 * PURE — no `node:*`, no I/O, and deliberately NO import of `tree.ts`: `tree.ts` imports THIS, and
 * the row rule is a question about resolved roles rather than about the emitted tree.
 */
import { Theme } from './theme';
import { resolveAllModes } from './modes';
import { gapDisposition } from './inverse-coverage';

/** The two members of the surface axis. `default` is the base — see `axes.ts`. */
export const SURFACE_MODES = ['default', 'inverse'] as const;
export type SurfaceMode = typeof SURFACE_MODES[number];

/** True for a role that IS an inverse-context variant, so it is never a row of its own. */
export const isInverseRole = (k: string): boolean => /(^|\.)inverse(\.|$)|(^|\.)on-inverse(\.|$)/.test(k);

/**
 * The inverse counterpart of a page role, by the three shapes the tree actually uses:
 * family-level (`border.inverse.<r>`), palette-level (`interactive.<p>.inverse.<slot>`), and ink
 * (`text.on-inverse.<r>`). Returns undefined when none exists — the gap case.
 */
export const inverseCounterpart = (role: string, known: Set<string>): string | undefined => {
  const seg = role.split('.');
  const cands = [[seg[0], 'inverse', ...seg.slice(1)].join('.')];
  if (seg[0] === 'interactive' && seg.length > 1) cands.push([seg[0], seg[1], 'inverse', ...seg.slice(2)].join('.'));
  if (seg[0] === 'text' || seg[0] === 'icon') cands.push([seg[0], 'on-inverse', ...seg.slice(1)].join('.'));
  return cands.find((c) => known.has(c));
};

export type SurfaceRow = { role: string; default: string; inverse: string };

/**
 * The rows, from the role KEY SET alone.
 *
 * Takes the key set rather than a `Theme` so `tree.ts` can call it with the role keys it already
 * resolved, instead of resolving every mode a second time. The rule is a question about which names
 * exist, and nothing below reads a value.
 */
export const surfaceRowsFor = (known: Set<string>): SurfaceRow[] => {
  const rows: SurfaceRow[] = [];
  for (const role of [...known].sort()) {
    if (isInverseRole(role)) continue;
    const counterpart = inverseCounterpart(role, known);
    if (counterpart) { rows.push({ role, default: role, inverse: counterpart }); continue; }
    // No counterpart: the register decides, per entry. An unregistered gap is a failure `test.ts`
    // raises by name — neither materialisation may paper over it by guessing a disposition.
    const how = gapDisposition(`color.${role}`);
    if (how === 'self') rows.push({ role, default: role, inverse: role });
    // `omit` (and an unregistered role) emit no row at all.
  }
  return rows;
};

/**
 * The rows for a theme. Exported so `test.ts` can assert over them without re-deriving the mapping —
 * a re-derivation would be the gate checking the emitter against a copy of the emitter.
 */
export const surfaceRows = (theme: Theme): SurfaceRow[] => {
  const light = resolveAllModes(theme).find((m) => m.mode === 'light');
  if (!light) return [];
  return surfaceRowsFor(new Set(Object.keys(light.roles)));
};
