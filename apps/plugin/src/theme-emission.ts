/**
 * #3422 Q44.1 A (the review's recommendation; the owner's to confirm) — WHAT THEME LAST WROTE, AS A PRINT.
 *
 * Update file opens Theme ticked only when the file differs from the brand (Q44 A). That was read from the saved brand
 * input alone (`holdsInput`), so an engine update that changes the variables under an unchanged brand (#3402 added
 * `interactive.*.indicator.*`) read "matches": Theme opened unticked, and the sets that bind the new variables could not
 * ride the run (#3421). So Apply Theme also stamps a print of the plans it wrote, beside the input, and the live recount
 * compares it with the print of the plans this plugin would write for the panel's brand. Theme is due when either moved.
 *
 * The print is the FNV of the plans' JSON: every collection, variable, value and style Apply Theme writes. It moves with
 * the engine's output, not with its version, so a plugin build that writes the same variables reads the same.
 *
 * A file whose input was saved with no print (by a plugin before this one, or by an agent's paste, `mcp-steps.ts`
 * `runPersist`) reads as differing: nothing says what was written, so Theme is due until a Theme run stamps it.
 */
import type { ThemePlans } from './apply-theme';
import type { SharedDataPort } from './persist-figma';
import { NS, holdsInput } from './persist-figma';
import type { BrandInput } from '@prism3/engine/theme';
import { fnv } from './as-built-ledger';

export const EMISSION_KEY = 'themeEmission';

/** The print of what Apply Theme writes from these plans. */
export const emissionOf = (p: Pick<ThemePlans, 'colorPlan' | 'floatPlan' | 'fontPlan' | 'motionPlan' | 'stylesPlan' | 'gridPlan' | 'textPlan'>): string =>
  fnv(JSON.stringify([p.colorPlan, p.floatPlan, p.fontPlan, p.motionPlan, p.stylesPlan, p.gridPlan, p.textPlan]));

/** Stamp the print beside the input (after a real write, as `persistInput`). */
export const stampEmission = (root: SharedDataPort, print: string): void => root.setSharedPluginData(NS, EMISSION_KEY, print);

/** Whether the file's stamp is `print`. False with no stamp, or when the root cannot be read. */
export const holdsEmission = (root: SharedDataPort, print: string): boolean => {
  try { return root.getSharedPluginData(NS, EMISSION_KEY) === print; } catch { return false; }
};

/** Whether Theme would change the file (#3081 Q810 A, Q44.1 A): it does not hold `input` as its brand, or the variables
 *  and styles in it were written by another emission than `printNow`'s. Read by the recount `main.ts` posts as
 *  `file-due`'s `theme`, the one signal the badge counts and Theme's default tick reads. */
export const themeDue = (root: SharedDataPort, input: BrandInput, printNow: () => string): boolean => {
  if (!holdsInput(root, input)) return true;
  try { return !holdsEmission(root, printNow()); } catch { return true; }
};
