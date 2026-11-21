/**
 * THE STORIES THE BUILD MUST HOLD, written by hand (#3408 S5): for each component, each delivery form, each case.
 * Never read from the stories or the build, so a story dropped from one form, or added to only one, fails by its id
 * (`docs/34`). Two subjects read it: `check-build.ts` holds the built `index.json` to it, and the three accessibility
 * checks (`a11y-harness.ts` `represented`) hold what each of them ITERATED to it. The subject there is the iteration,
 * not this list, so sharing it keeps both comparisons independent.
 */
export const EXPECTED: Record<string, { forms: string[]; cases: string[] }> = {
  button: {
    forms: ['element', 'html'],
    cases: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'inactive', 'pending', 'filled', 'outline', 'text',
      'text-flush', 'small', 'medium', 'large', 'inverse', 'inverse-outline', 'with-visuals', 'full-width'],
  },
};
// The fields' cases (`stories/fields.js`), written again here by hand.
export const FIELD_CASES = ['rest', 'filled', 'hover', 'focus-visible', 'error', 'warning', 'success', 'disabled', 'read-only',
  'pending', 'required', 'small', 'medium', 'large', 'with-icons',
  // each KPI 2 state with the message off, as Figma's members are built (#4432 decision 3 A)
  'rest-no-message', 'hover-no-message', 'focus-visible-no-message', 'disabled-no-message', 'error-no-message'];
EXPECTED['text-field'] = { forms: ['element', 'html'], cases: FIELD_CASES };
EXPECTED['password-field'] = { forms: ['element', 'html'], cases: [...FIELD_CASES, 'shown', 'shown-error'] };
