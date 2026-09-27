/**
 * Prism3 Figma plugin — the boot read-back's DECLARED-MODES input and the seed pill's text (#1662 follow-up).
 *
 * `verifyReadback` is pure, so the declared mode set is resolved here and passed in. It comes from the `color`
 * collection's record of what its last apply PLANNED (#1704) when the file has one, and otherwise from the
 * `BrandInput` the last successful apply persisted (#131), as `brandTheme(input).modes` — the same list
 * `emit-figma-color.ts` iterates to name the `color` collection's modes — rather than a second reading of
 * `input.modes`/`input.customModes`, which would have to restate the default set and the custom-mode append
 * and could drift from what Apply actually writes. See `declaredModesOf` for why the record comes first.
 *
 * The three ways there is NO set to compare each carry their own reason, because the verdict states it and a
 * designer acts differently on each: nothing stored, a stored blob this build refuses (#480), a stored brand
 * that no longer resolves.
 *
 * Compiled under `tsconfig.main.json` (reached through `main.ts`) — no `document`.
 */
import type { DeclaredModesInput, ReadbackSnapshot, ReadbackVerdict } from '@prism3/engine/read-back';
import { brandTheme } from '@prism3/engine/theme';
import { restoreInput } from './persist-figma';
import type { SharedDataPort } from './persist-figma';

/** The skip reasons, as they read in the seed pill. Exported so the test spells the same outcome by name. */
export const SKIP_NO_BRAND = 'no saved brand in this file';
export const SKIP_UNREADABLE = 'the saved brand could not be read';
export const SKIP_UNRESOLVED = 'the saved brand does not resolve';

/**
 * Resolve the declared mode set, or the reason there is none. Two sources, in order:
 *
 *   1. The `color` collection's own record of what its last apply PLANNED (#1704, `snap.colorModesPlanned`),
 *      written before the first `addMode`. This is the one that catches the capped apply: a refused `addMode`
 *      throws, the apply aborts, and the brand blob below is never rewritten — so it still holds the PREVIOUS
 *      brand, and comparing against it reads a match.
 *   2. The persisted `BrandInput` (#131), for a file whose last apply predates the record. It is written only
 *      after a successful apply, so it can say nothing about an apply that failed.
 *
 * `snap` is REQUIRED for the same reason `verifyReadback`'s `declared` is: an omitted argument would drop
 * source 1 with no caller ever having decided to, and the capped case would read "contract holds" again.
 */
export const declaredModesOf = (root: SharedDataPort, snap: Pick<ReadbackSnapshot, 'colorModesPlanned'>): DeclaredModesInput => {
  if (snap.colorModesPlanned?.length) return { modes: snap.colorModesPlanned };
  let input;
  try { input = restoreInput(root); } catch { return { skipped: SKIP_UNREADABLE }; }
  if (!input) return { skipped: SKIP_NO_BRAND };
  try { return { modes: brandTheme(input).modes }; } catch { return { skipped: SKIP_UNRESOLVED }; }
};

/** The names of every failed check, `declaredModes` included when it failed. */
export const failedChecks = (v: ReadbackVerdict): string[] => [
  ...Object.entries(v.checks).filter(([, ok]) => !ok).map(([k]) => k),
  ...(v.declaredModes.status === 'fail' ? ['declaredModes'] : []),
];

/** The seed pill's detail line. The mode comparison's outcome is appended after the contract verdict. */
export const seedSummary = (v: ReadbackVerdict): string => {
  const failed = failedChecks(v);
  const dm = v.declaredModes;
  const notes: string[] = [];
  if (dm.status === 'skipped') notes.push(`mode check skipped — ${dm.reason}`);
  else {
    if (dm.status === 'fail') notes.push(`the last apply declared ${dm.missing.join('/')}, not in this file`);
    if (dm.extra.length) notes.push(`${dm.extra.join('/')} in this file, not declared by the last apply`);
  }
  return (
    `Existing theme: ${v.details.colorVars} color vars, modes ${v.details.modes.join('/') || '—'}` +
    (v.ok ? ' — contract holds ✓' : ` — FAILED: ${failed.join(', ')}`) +
    notes.map((n) => ` · ${n}`).join('')
  );
};
