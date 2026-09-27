/**
 * Prism3 Figma plugin — the boot read-back's DECLARED-MODES input and the seed pill's text (#1662 follow-up).
 *
 * `verifyReadback` is pure and does not read the file, so the brand's declared mode set is resolved here, from
 * the `BrandInput` the last apply persisted (#131), and passed in. The declared set is `brandTheme(input).modes`
 * — the same list `emit-figma-color.ts` iterates to name the `color` collection's modes — rather than a second
 * reading of `input.modes`/`input.customModes`, which would have to restate the default set and the custom-mode
 * append and could drift from what Apply actually writes.
 *
 * The three ways there is NO set to compare each carry their own reason, because the verdict states it and a
 * designer acts differently on each: nothing stored, a stored blob this build refuses (#480), a stored brand
 * that no longer resolves.
 *
 * The pill also reports `plannedModes` (#1704): the file's own per-collection record of what the last apply
 * planned, against what each collection holds. That one needs no input from here — it is file data, read by
 * `read-figma` and checked inside `verifyReadback` — and it is the one that catches an apply a mode cap aborted,
 * which the brand comparison cannot (the brand persists only after a successful apply, #131).
 *
 * Compiled under `tsconfig.main.json` (reached through `main.ts`) — no `document`.
 */
import type { DeclaredModesInput, ReadbackVerdict } from '@prism3/engine/read-back';
import { brandTheme } from '@prism3/engine/theme';
import { restoreInput } from './persist-figma';
import type { SharedDataPort } from './persist-figma';

/** The skip reasons, as they read in the seed pill. Exported so the test spells the same outcome by name. */
export const SKIP_NO_BRAND = 'no saved brand in this file';
export const SKIP_UNREADABLE = 'the saved brand could not be read';
export const SKIP_UNRESOLVED = 'the saved brand does not resolve';

/** Resolve the declared mode set from the file's persisted brand, or the reason there is none. */
export const declaredModesOf = (root: SharedDataPort): DeclaredModesInput => {
  let input;
  try { input = restoreInput(root); } catch { return { skipped: SKIP_UNREADABLE }; }
  if (!input) return { skipped: SKIP_NO_BRAND };
  try { return { modes: brandTheme(input).modes }; } catch { return { skipped: SKIP_UNRESOLVED }; }
};

/** The names of every failed check, `declaredModes` included when it failed. */
export const failedChecks = (v: ReadbackVerdict): string[] => [
  ...Object.entries(v.checks).filter(([, ok]) => !ok).map(([k]) => k),
  ...(v.declaredModes.status === 'fail' ? ['declaredModes'] : []),
  ...(v.plannedModes.status === 'fail' ? ['plannedModes'] : []),
];

/** The seed pill's detail line. The mode comparison's outcome is appended after the contract verdict. */
export const seedSummary = (v: ReadbackVerdict): string => {
  const failed = failedChecks(v);
  const dm = v.declaredModes;
  const notes: string[] = [];
  const pm = v.plannedModes;
  if (pm.status === 'fail') {
    notes.push(pm.missing.map((m) => `${m.collection} is missing ${m.modes.join('/')}, planned by the last apply`).join('; '));
  }
  if (dm.status === 'skipped') notes.push(`mode check skipped — ${dm.reason}`);
  else {
    if (dm.status === 'fail') notes.push(`saved brand declares ${dm.missing.join('/')}, not in this file`);
    if (dm.extra.length) notes.push(`${dm.extra.join('/')} in this file, not declared by the saved brand`);
  }
  return (
    `Existing theme: ${v.details.colorVars} color vars, modes ${v.details.modes.join('/') || '—'}` +
    (v.ok ? ' — contract holds ✓' : ` — FAILED: ${failed.join(', ')}`) +
    notes.map((n) => ` · ${n}`).join('')
  );
};
