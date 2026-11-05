/**
 * Prism3 engine — THE SYNC BOUNDARY'S VOCABULARY (#3441, owner decision #3437 Q1 A).
 *
 * A def's `anatomy.codeOnly` lists what will not survive the design-file leg. Each entry used to be one
 * line of prose, so nothing could count or diff them. Each entry is now data: a CLASS from the register
 * below, a DISPOSITION from the four-way vocabulary below, and the prose kept whole as its `description`.
 * Nothing is lost silently: every fact a def cannot fully carry is named, classed, and given a disposition.
 *
 * TWO DECLARED LISTS, AND NEITHER IS DERIVED FROM THE DEFS. `lint-code-only-classes.ts` reads every def's
 * entries against them. Were the register gathered from the classes the defs happen to use, an entry
 * with a misspelled class would register itself and the gate could never fail (docs/34 shape 1). So a
 * new class is a line added here, by hand, with what it means. The gate fails the other way too: a
 * register line no entry uses is a dead class, and is removed or used.
 *
 * THE DISPOSITION NAMES ARE THE OWNER'S, AND ARE PLACEHOLDERS (Q3441.1). The keys are the stable ids the
 * defs write; `DISPOSITION_NAMES` holds the names every artifact prints. The four names below are the
 * outside reference's (the sync boundary of `southleft/ds-contracts-poc`, `spec/normative.md` §2, MIT).
 * A rename is an edit to the values of that one constant; no def changes.
 */

/** The four dispositions. Keys are what a def writes; values are the names artifacts print. */
export const DISPOSITION_NAMES = {
  carried: 'CARRIED',
  lowered: 'LOWERED',
  refused: 'REFUSED',
  unsupported: 'UNSUPPORTED',
} as const;

export type Disposition = keyof typeof DISPOSITION_NAMES;

/** What each disposition claims about the design-file leg. Written once, read by the doc and the gate's
 *  report, so a reader of either sees the same definitions. */
export const DISPOSITION_MEANINGS: Record<Disposition, string> = {
  carried: 'The design file carries the fact in full; the entry records how code meets it.',
  lowered: 'The design file carries a lossy form, and the entry names the loss: a frozen number, a static placeholder, one fixed member.',
  refused: 'Kept out of the design file on purpose: it belongs to code (behavior, semantics, keyboard, motion), or an owner decision holds it back.',
  unsupported: 'The design file has no mechanism for it: no property, binding or mode exists to carry it.',
};

/**
 * THE CLASS REGISTER. Each id is stable: an entry's class is how it is counted, diffed and exported, so
 * renaming an id is a rename across every def and every consumer of the export. Ordered by theme.
 */
export const CODE_ONLY_CLASSES = [
  { id: 'not-projected', means: 'A variant axis, state or prop the code has and the design file does not draw as a member or property. An entry leading with the axis or state name is the admission `figmaPropertyErrors` requires.' },
  { id: 'brand-setting', means: 'A choice the brand makes once (a style setting), resolved when the design file is built rather than offered per instance.' },
  { id: 'static-placeholder', means: 'Live or variable content the design file shows as a fixed stand-in: placeholder text, a default item count, a static counter.' },
  { id: 'live-geometry', means: 'A measurement code derives live from other values, which the design file holds as a literal or a lock.' },
  { id: 'responsive-layout', means: 'Layout that depends on a container, viewport or input: filling, wrapping, overflow, breakpoints, placement, stacking.' },
  { id: 'visual-treatment', means: 'Paint, stroke, weight or type treatment the design file cannot bind or does not draw, or draws differently from code.' },
  { id: 'focus-ring', means: 'The focus ring: when it shows, and the geometry the design file freezes at paste.' },
  { id: 'hit-target', means: 'The pointer target code extends beyond the drawn box.' },
  { id: 'forced-colors', means: 'Behavior under a forced-colors or high-contrast mode, where the system replaces authored colors.' },
  { id: 'right-to-left', means: 'What mirrors, and what does not, under a right-to-left direction.' },
  { id: 'localization', means: 'Translation and locale: text expansion, wrapping instead of truncating, number and digit formatting.' },
  { id: 'content-rule', means: 'A rule about the words themselves that no projection enforces.' },
  { id: 'motion', means: 'Animation and transition, and their reduced-motion forms.' },
  { id: 'semantics', means: 'The element, role, accessible name and ARIA wiring code renders.' },
  { id: 'announcement', means: 'What assistive technology announces, and the live region that carries it.' },
  { id: 'keyboard-and-focus', means: 'The keyboard model, and where focus goes and stays.' },
  { id: 'runtime-behavior', means: 'Behavior at run time: values and callbacks, validation, timers, form and router integration.' },
  { id: 'platform-owned', means: 'Drawn or owned by the browser, the operating system or a third party, not by the component.' },
  { id: 'composition', means: 'Owned by a parent, host or group the component sits in, not by the component itself.' },
  { id: 'implementation', means: 'How code builds it, where the choice has no design consequence of its own.' },
  { id: 'deferred', means: 'Held back on every surface: not built yet, held by an owner decision, or out of scope.' },
] as const;

export type CodeOnlyClass = (typeof CODE_ONLY_CLASSES)[number]['id'];

/** One fact a def cannot fully carry into the design file. `description` is the prose the entry always
 *  held, kept whole: it still LEADS with the name an admission needs (`figmaPropertyErrors`' `admits()`). */
export type CodeOnlyEntry = {
  class: CodeOnlyClass;
  disposition: Disposition;
  description: string;
};

/** The prose of each entry, in order: what every prose reader (the admissions check, the hit-target and
 *  prose gates, the plan) reads. */
export const codeOnlyText = (entries: readonly CodeOnlyEntry[] | undefined): string[] =>
  (entries ?? []).map((e) => e.description);
