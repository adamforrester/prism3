/**
 * Prism3 engine — the `surface` Figma collection (#893, #871's decision).
 *
 * A collection with two modes — `default` and `inverse` — and **no colours of its own**. Every row
 * is an alias into the `color` collection: `default` points at the page token, `inverse` at its
 * inverse counterpart. Binding `surface/text/primary` to a layer and switching the mode on an
 * ancestor frame swaps the whole subtree to its inverse-context values.
 *
 * ── WHY IT IS AN ALIAS LAYER AND NOT A FOURTH COLOUR SET ────────────────────────────────────────
 *
 * It stores POINTERS, not values, and that is the whole economic argument. The same row resolves to
 * `rgb(207,11,44)` in nb and `#007cbb` in aurora because the values live in the `color` collection
 * where they already are. So the collection is authored ONCE and shared by every brand: it does not
 * grow with brands, and it does not grow with appearance modes.
 *
 * **That property is sound only while every brand ships the identical inverse NAME set.** Measured
 * 113/113/113/113 with zero divergence across the four corpus brands, and held by
 * `token-contract.json`. What it does NOT test is a brand needing `inverse` to point at a
 * structurally DIFFERENT semantic role rather than a different value — see the header of `gate.ts`
 * and #893's acceptance check. Four generated brands agreeing cannot test that.
 *
 * ── DTCG IS UNCHANGED, DELIBERATELY ─────────────────────────────────────────────────────────────
 *
 * This collection is Figma-only. Per `tools/exporter-comparison/axes.ts` the conforming projection
 * carries appearance overlays only; surface context reaches code through the CSS cascade instead,
 * which is a separate build (#882) and explicitly out of scope here. A consumer reading DTCG sees
 * exactly what #891 + #892 finalised and nothing new — so this issue is invisible to them.
 *
 * ── THE GAPS, AND WHY THIS FILE DOES NOT DECIDE THEM ────────────────────────────────────────────
 *
 * Eleven roles have no inverse counterpart. A row for one of them has to either point `inverse` at
 * the same token as `default` (SELF-ALIAS) or not exist (OMIT), and the two are not interchangeable:
 * self-aliasing makes every name resolve at the cost of making a deliberate gap look like a filled
 * one, while omitting keeps the gap legible at the cost of a name that does not resolve.
 *
 * The answer depends on WHY each gap exists, so it is read from `inverse-coverage.ts` per entry
 * rather than decided here or collapsed to one global rule. That register is checked both directions
 * by `test.ts`, so a disposition cannot rot into a claim about a gap that has since closed.
 *
 * PURE — no `node:*`, no I/O. The shell in `emit-figma.ts` writes the files.
 */
import { Theme } from './theme';
import { resolveAllModes } from './modes';
import { INVERSE_GAP_PATHS, gapDisposition } from './inverse-coverage';
import type { FigmaCollectionFile, FigmaVar } from './emit-figma-color';
import { figName, parseColor } from './emit-figma-color';

/** The two members of the surface axis. `default` is the base — see `axes.ts`. */
export const SURFACE_MODES = ['default', 'inverse'] as const;
export type SurfaceMode = typeof SURFACE_MODES[number];

/** True for a role that IS an inverse-context variant, so it is never a row of its own. */
const isInverseRole = (k: string): boolean => /(^|\.)inverse(\.|$)|(^|\.)on-inverse(\.|$)/.test(k);

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
 * The rows, resolved. Exported so `test.ts` can assert over them without re-deriving the mapping —
 * a re-derivation would be the gate checking the emitter against a copy of the emitter.
 */
export const surfaceRows = (theme: Theme): SurfaceRow[] => {
  const light = resolveAllModes(theme).find((m) => m.mode === 'light');
  if (!light) return [];
  const known = new Set(Object.keys(light.roles));
  const rows: SurfaceRow[] = [];
  for (const role of [...known].sort()) {
    if (isInverseRole(role)) continue;
    const counterpart = inverseCounterpart(role, known);
    if (counterpart) { rows.push({ role, default: role, inverse: counterpart }); continue; }
    // No counterpart: the register decides, per entry. An unregistered gap is a failure `test.ts`
    // raises by name — this emitter must not paper over it by guessing a disposition.
    const how = gapDisposition(`color.${role}`);
    if (how === 'self') rows.push({ role, default: role, inverse: role });
    // `omit` (and an unregistered role) emit no row at all.
  }
  return rows;
};

/**
 * Build the two mode files. Every variable carries `alias` — the mode's target — and a `value` that
 * is the target's RESOLVED colour, so a consumer that cannot follow aliases still renders correctly
 * (the same fallback contract every other emitted collection holds).
 */
export const buildFigmaSurface = (theme: Theme): FigmaCollectionFile[] => {
  const modes = resolveAllModes(theme);
  const light = modes.find((m) => m.mode === 'light');
  if (!light) return [];
  const rows = surfaceRows(theme);

  return SURFACE_MODES.map((mode): FigmaCollectionFile => ({
    $collection: 'surface',
    $mode: mode,
    variables: rows.map((r): FigmaVar => {
      const target = mode === 'default' ? r.default : r.inverse;
      const resolved = light.roles[target];
      return {
        // `figName` strips the leading namespace segment, so a bare role key would lose its FAMILY
        // (`background.primary` → `primary`). The role is prefixed with the tier the `color`
        // collection carries, which is also what makes the alias target line up exactly.
        name: `surface/${figName(`color.${r.role}`)}`,
        resolvedType: 'COLOR',
        // ALL_SCOPES: the row stands in for whatever its target is scoped to, and a surface-context
        // binding is applied at the layer rather than picked per slot. Narrowing here would be a
        // second, weaker copy of the `color` collection's scoping, free to drift from it.
        scopes: [],
        description: `${r.role} for the ${mode} surface context — an alias into the color collection${r.default === r.inverse ? ' (no inverse counterpart: the same token is correct in both modes, see inverse-coverage.ts)' : ''}`,
        value: parseColor(resolved?.hex ?? '#000000'),
        alias: { type: 'VARIABLE_ALIAS', name: `color/${figName(`color.${target}`)}` },
      };
    }),
  }));
};

/** Roles deliberately absent from the collection, for the emitter's summary line. */
export const surfaceOmitted = (): string[] =>
  [...INVERSE_GAP_PATHS].filter((p) => gapDisposition(p) === 'omit').sort();
