/**
 * Steps — a person's place in a fixed sequence of steps: the complete steps, the current one and the steps not
 * started yet, each numbered and joined by a line (#3055).
 *
 * No KB brief: the catalog has no steps or stepper brief (the orchestrator checked the KB on 2026-11-19; it holds a
 * Progress brief only), so this is built from the approved proposal on #3055 (owner decision 9). Category
 * `navigation`, Breadcrumbs' own: it marks a place in a sequence of pages, and its linked complete steps move a
 * person back along it. Progress already names `stepper` as planned and sends "a user's place in a multi-step flow"
 * here.
 *
 * Shape (owner decisions on #3055, 2026-11-19, every numbered item as recommended):
 *   - 1 — `Steps` / `steps`, aliases `stepper`, `step-indicator` and `progress-steps` (not `progress-indicator`,
 *     which Progress's brief entry uses). The item is `step-item`.
 *   - 5 — in a horizontal row each label sits beside its marker.
 *   - 6 — narrow widths collapse in code only: a container query turns the row into one line, "Step 2 of 3:
 *     Payment" (DRAFT copy). No viewport axis (#3383 Q3 A).
 *   - 7 — the connector is a line.
 *   - 8 — the hidden status words are DRAFT (on StepItem).
 *
 * THE ITEMS SLOT (owner decision Q307 A): a native Figma slot holding StepItem instances, three by default (one
 * complete, one current, one not started), at least two, preferred StepItem only. Its direction follows the member
 * (`directionWhen`, Button group's field), so a designer's steps survive an orientation switch. A slot child does not
 * follow the container's variant after it is placed: the defaults are inserted at the container's orientation and
 * size, and a designer who changes either changes each step too.
 *
 * SIZE ORDER (owner decisions Q347 A and Q359 B): medium first, the code default.
 */
import { ComponentDef } from '../component-schema';

// `number` is the step's position, not copy: StepItem's `number` text defaults to "1", so the second and third items set
// theirs (`nestTexts`, #2317) and an inserted Steps reads 1, 2, 3 (#3055 review). The complete step shows a check.
const step = (status: 'complete' | 'current' | 'upcoming', note: string, number?: string) => ({
  kind: 'nest' as const,
  nests: 'step-item',
  nesting: { kind: 'nest-fixed' as const, variant: { status, orientation: 'horizontal', size: 'medium' }, follow: ['orientation', 'size'] },
  ...(number ? { nestTexts: { number } } : {}),
  note,
});

export const steps: ComponentDef = {
  id: 'steps',
  name: 'Steps',
  aliases: ['stepper', 'step-indicator', 'progress-steps'],
  category: 'navigation',
  status: 'draft',
  summary: 'A person\'s place in a fixed sequence of steps. Size and orientation apply to the items you haven\'t edited. After editing an item, select the items and set their size and orientation.',
  description:
    'Shows where a person is in a fixed sequence of steps, such as a checkout. Each step has a numbered disc and a name, joined to the next by a line. Complete steps show a check and can link back; the current step is filled; steps not started yet are outlined and never links, so they do not read as reachable. A step can also show an error. The row runs across or down, and on a narrow screen collapses to one line naming the current step.',

  props: [
    { name: 'items', type: 'slot', anyOf: ['step-item'], minItems: 2, required: true, description: 'The steps, in order, each with a name and a status. Exactly one is current. At least two.' },
    { name: 'orientation', type: "enum: 'horizontal' | 'vertical'", values: ['horizontal', 'vertical'], default: 'horizontal', required: false, description: 'horizontal: the steps in a row, sharing its width. vertical: the steps in a column, each line running down to the next. Passed to every step.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The disc and the body type size, 24px beside 16px text or 20px beside 14px text, passed to every step.' },
    { name: 'label', type: 'string', required: true, description: 'The accessible name of the navigation landmark, translated, such as Checkout steps. Assistive technology adds "navigation" itself.' },
    { name: 'responsive', type: 'boolean', default: true, required: false, description: 'When the row does not fit, show one line naming the current step and the count in place of the row. Turn it off where the full row always fits.' },
  ],

  // `[]` — the indicator is not interactive itself; a linked complete step's Link carries its own states.
  states: [],
  variants: {
    orientation: ['horizontal', 'vertical'],
    size: ['medium', 'small'],
  },
  // A product picks the orientation and size once; nothing switches either on screen.
  axisKinds: { orientation: 'authoring', size: 'authoring' },

  densitySpacing: ['size.{size}.gap'],

  tokens: {
    // The space between steps (DRAFT). Across a row the line already separates the steps; down a column it is the
    // space between one step's line and the next step's disc.
    'size.medium.gap': 'space.100',
    'size.small.gap': 'space.075',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim: the targets are nested.
        role: 'target',
        children: ['items'],
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        note: 'The navigation: a box that hugs its steps, with no padding and no fill.',
      },
      // THE ITEMS SLOT (Q307 A): StepItem instances, one complete, one current and one not started by default.
      items: {
        kind: 'box', mirror: 'reverses',
        role: 'presentation',
        contentSlot: true,
        slotSettings: { minChildren: 2, allowPreferredValuesOnly: true },
        preferred: ['step-item'],
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        directionWhen: { axis: 'orientation', values: { horizontal: 'row', vertical: 'column' } },
        gap: 'size.{size}.gap',
        children: ['step1', 'step2', 'step3'],
        note: 'The steps: a native slot holding StepItem instances in a row or a column, one complete, one current and one not started by default.',
      },
      step1: step('complete', 'A complete step, with a check and a link back.'),
      step2: step('current', 'The current step, its disc filled.', '2'),
      step3: step('upcoming', 'A step not started yet, its disc outlined.', '3'),
    },
    codeOnly: [
      {
        class: 'deferred',
        disposition: 'refused',
        description:
          'Plain HTML/CSS: wire this behavior contract up in your framework. The web component includes it.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The landmark — <nav aria-label={label}> around an <ol>, one <li> per step, so "list, 3 items" and each position are announced. No tablist and no progressbar role: nothing here is a composite widget.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The last step\'s line — Steps draws no line after the last step: it sets connector={false} on it. In Figma the designer turns the line off on the last step.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'Sharing the width — across a row each step grows to share the width and its line fills the space to the next step. Down a column each line runs to the next step\'s disc. In Figma the lines have a fixed nominal length.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'The narrow collapse — when the row does not fit, a container query swaps it for one line naming the current step and the count, "Step 2 of 3: Payment" (DRAFT copy, owner decision 6 on #3055), still inside the <nav>. responsive={false} turns it off. Figma has no member for it.',
      },
      {
        class: 'static-placeholder',
        disposition: 'lowered',
        description:
          'Figma step count — the native items slot holds three steps by default and at least two; a designer adds, removes and reorders them and sets each one\'s status. Steps keep the orientation and size they were placed at when Steps changes either.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL — the row mirrors: the first step sits at the right edge and the lines run left.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['orientation', 'size'],
    booleans: {},
  },

  accessibility: {
    role: 'navigation landmark, named by its label, holding an ordered list of steps',
    wcag: [
      '1.3.1 Info and Relationships (an ordered list inside a named navigation landmark)',
      '2.4.8 Location (shows where the person is in the sequence)',
      '1.4.1 Use of Color (each status shows a glyph or a number and a hidden status word, not color alone)',
      '1.4.10 Reflow (targets one line naming the current step when the row does not fit)',
      '2.4.7 Focus Visible',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'Tab moves through the linked complete steps in order; Enter follows a link. No other step takes focus, and there is no arrow-key navigation.',
    focus: 'Each linked complete step shows its link\'s focus ring.',
    aria: 'A <nav> with aria-label set to the label prop, translated. aria-current="step" on the current step only. Each step ends with a visually hidden status word: "Completed", "Current step", "Not started" or "Error". The narrow one-line form reads "Step 2 of 3: Payment", translated. In right-to-left text the row mirrors.',
  },

  content: {
    labelPattern: 'Each step is a short noun phrase in sentence case, such as Shipping, Payment, Review. The landmark label names the flow, such as Checkout steps.',
  },

  docs: {
    usage: 'Use Steps for a fixed sequence a person moves through in order, such as a checkout or a sign-up, to show where they are and how much is left. Keep it to a few steps. For the progress of one task over time, use Progress. For a path up a site hierarchy, use Breadcrumbs. To switch between peers in any order, use Tabs.',
    do: [
      'Mark exactly one step as current',
      'Keep step names short, so the row fits',
      'Link complete steps only when going back keeps the person\'s work',
      'Turn the line off on the last step',
    ],
    dont: [
      'Link steps the person has not reached',
      'Use Steps for steps a person can take in any order',
      'Show status with color alone',
    ],
    contentGuidelines: 'Step names are short noun phrases in sentence case, matching each step\'s page heading.',
  },

  ai: {
    primaryPurpose: 'Show a person\'s place in a fixed, ordered sequence of steps: which are complete, which is current and which are still to come.',
    whenToUse: 'A flow of a few steps taken in order, such as a checkout, a sign-up or a setup wizard, where people need to see where they are and how much is left.',
    avoidWhen: 'The progress is of one task over time (use Progress), the path is up a site hierarchy (use Breadcrumbs), the sections can be visited in any order (use Tabs), or the flow is one page.',
    commonPartners: ['step-item', 'link', 'progress', 'breadcrumbs'],
    triggerKeywords: ['steps', 'stepper', 'step indicator', 'checkout steps', 'progress steps', 'wizard steps', 'multi-step form progress'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['step-item'],
    alternativeTo: ['progress', 'breadcrumbs'],
    replacesPatterns: ['a breadcrumb trail used for checkout steps', 'step names separated by typed ">" characters', 'steps not reached yet rendered as links'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'None. A step changes status at once.',
    exit: 'None.',
    reduceMotion: 'No motion to reduce.',
  },

  notes: {
    contested: [],
    unverified: [],
    evolution: [
      '2026-11-19 (#3055): built from the approved proposal, all nine owner decisions as recommended, on Breadcrumbs\' items-slot shape. No KB brief exists (decision 9).',
    ],
  },
};
