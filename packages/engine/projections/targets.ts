/**
 * Prism3 — THE PROJECTION TARGETS, ONE ENTRY PER TARGET (#2997 Q2997.6 B).
 *
 * Owner decision Q2997.6 B: one map file per target, and the gates parameterized by target. Each entry names a
 * target's role map (its `projections/<id>.ts`), the pin that holds its external variable set, and the reader for that
 * target's upstream item format. Gate 3 (`shadcn-vars.ts`) and gate 4 (`lint-shadcn-contract.ts`) iterate this list, so
 * a second target is a new map file and a new entry here, not a copy of either gate. Gate 4's anchors stay typed in the
 * gate, per target, never read from here (docs/34): a target with no anchors there fails by name.
 *
 * One entry today: shadcn/ui.
 */
import { SHADCN_EXTRAS, SHADCN_MAP_VERSION, SHADCN_THEME_VARS, SHADCN_UNANCHORED, SHADCN_VARS } from './shadcn.ts';

export type ProjectionTarget = {
  /** The target's id, also its map file's name under `projections/`. */
  id: string;
  /** The pin, repo-relative, so a gate can read it at a git revision as well as in the tree. */
  pinPath: string;
  /** The map version the pin was accepted at. MAJOR for a dropped name, MINOR for an added one. */
  mapVersion: string;
  /** Every mode variable the map emits, name → role. */
  vars: Readonly<Record<string, string>>;
  /** Map keys outside the pinned set, each with the decision that keeps it. */
  extras: Readonly<Record<string, string>>;
  /** Further rows the map emits outside the per-mode set (shadcn's `cssVars.theme`), name → role. */
  themeVars: Readonly<Record<string, string>>;
  /** Map keys no component contract binds yet, so gate 4 has nothing to hold them to. */
  unanchored: readonly string[];
};

export const PROJECTION_TARGETS: readonly ProjectionTarget[] = [
  {
    id: 'shadcn',
    pinPath: 'packages/engine/schema/shadcn-vars.json',
    mapVersion: SHADCN_MAP_VERSION,
    vars: SHADCN_VARS,
    extras: SHADCN_EXTRAS,
    themeVars: SHADCN_THEME_VARS,
    unanchored: SHADCN_UNANCHORED,
  },
];
