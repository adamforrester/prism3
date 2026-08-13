/**
 * Prism3 engine — THE COMPONENT REGISTRY (#742, `docs/38` Arc 3).
 *
 * The set of component defs, in one place, so a consumer can ITERATE the catalogue instead of
 * naming its members. `docs/38` §2 recorded the absence: `test.ts` imported five defs by name, one
 * line each, `components/` held no index, and **nothing anywhere held the set**. Arc 3 calls that a
 * hard prerequisite for step 3 of §1's loop, because every code projection `19` §5 names — the
 * `.ai.json` registry, generated stories, Code Connect — is an iteration over a set that did not
 * exist.
 *
 * ORDER is composition order, and it is checkable rather than decorative: the substrate first
 * (`button`), then what `inherits` it (`icon-button`), then the field parts, then the def whose
 * `composition.composesWith` names those parts (`text-field`). Nothing reads the order today; it is
 * stated so that a consumer that ever does has a documented reason rather than an accident.
 *
 * ── WHAT ADDING A DEF HERE DOES, AND WHAT IT DOES NOT ───────────────────────────────────────────
 *
 * It puts the def in `componentDefs`, which is the set `test.ts` iterates.
 *
 * It does **not** make the def typechecked. `tsconfig.json`'s `include` is a glob over this whole
 * directory, so tsc reads every def file whether or not this file mentions it — deliberately, and
 * the gate's header says why the two are kept apart: coupling "is it registered" to "is it
 * typechecked" would make a bookkeeping slip cause a silent loss of coverage as well.
 *
 * What CONNECTS the two is the third assertion in `typecheck-components.ts`: every def file git
 * tracks must contribute an export to `componentDefs`, and every member of `componentDefs` must
 * come from a tracked def file. So a def added beside this file and forgotten here fails that gate
 * **by name** — while still being typechecked, which is the point of keeping them separate.
 *
 * **This file is that gate's SUBJECT, never its oracle.** Git's index is the oracle. A gate that
 * derived its expectation by reading this list could only confirm the list agrees with itself,
 * which it always does (`docs/34` shape 1) — and `docs/38` Arc 3 names that outcome exactly: *"a
 * second list maintained beside it would restore the defect that gate was written for."*
 */
import type { ComponentDef } from '../component-schema';
import { button } from './button';
import { iconButton } from './icon-button';
import { fieldLabel } from './field-label';
import { fieldMessage } from './field-message';
import { textField } from './text-field';

/** Named access, kept ALONGSIDE the set rather than replaced by it. Most of `test.ts`'s component
 *  assertions are about one def's specific fields (`button.variants.appearance`,
 *  `textField.tokens['border.error']`), and routing those through a find-by-id over the set would
 *  be a worse call site, not a better one — a lookup that can return `undefined` standing in for a
 *  binding that cannot. The set is for iteration; these are for the assertions that are ABOUT one
 *  component. */
export { button, iconButton, fieldLabel, fieldMessage, textField };

/** Every component def the engine defines. The one thing a projection should iterate. */
export const componentDefs: readonly ComponentDef[] = [
  button,
  iconButton,
  fieldLabel,
  fieldMessage,
  textField,
];
