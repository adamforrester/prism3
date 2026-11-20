/**
 * StepItem — one step in a Steps indicator: a numbered disc, the step's label and a line to the next step, held in
 * the Steps `items` slot and never placed on its own (#3055).
 *
 * No KB brief: the catalog has no steps or stepper brief (the orchestrator checked the KB on 2026-11-19; it holds a
 * Progress brief only), so this is built from the approved proposal on #3055 (owner decision 9). Category
 * `navigation`, Breadcrumbs' own: the component shows a person's place in a sequence of pages and, through linked
 * complete steps, moves them back along it.
 *
 * Shape (owner decisions on #3055, 2026-11-19, every numbered item as recommended):
 *   - 1 — `Steps` / `steps` with this item, `step-item`; aliases on Steps.
 *   - 2 — the marker is a numbered disc that shows a check when complete.
 *   - 3 — a complete step can be a link, through `href`; current and upcoming steps never are.
 *   - 4 — an `error` status is in v1: the error-circle glyph in the danger icon role, the label still shown.
 *   - 5 — in a horizontal row the label sits beside the marker, not under it.
 *   - 6 — narrow widths collapse in code only (on Steps).
 *   - 7 — the connector is a line, not a chevron.
 *   - 8 — the hidden status words are DRAFT: "Completed", "Current step", "Not started", "Error".
 *
 * NO `_` PREFIX, BY OWNER DECISION Q394 A: a slot's preferred item keeps a plain id, so a file using the library can
 * insert it into the Steps `items` slot.
 *
 * NO STATE AXIS. The nested Link carries rest, hover, pressed and focus-visible, nested `nest-exposed` with `state`
 * exposed, as BreadcrumbItem's ancestor does; no other step is interactive.
 *
 * ONE TREE, TWO LAYOUTS. Horizontal is a row: the marker, the label, then the line to the next step in a cell one
 * marker tall, so the line sits on the marker's middle. Vertical is a row too: a rail (the marker above a vertical
 * line) beside the label. The rail and the label are top-aligned in both, so the horizontal line needs its cell.
 *
 * PAINT. The disc paints `fill` (complete, current) and `border` (upcoming); the number paints `body`; the glyphs
 * paint `icon`; the label paints `label`. The line paints the box `indicator` slot, a fill: the border roles are
 * scoped to strokes only, and the #933 rule lets no second box claim the disc's `border` slot. So the line takes a
 * fill-scoped role: `color.icon.secondary` at every status, a complete step's line too (owner decision 2026-11-20 on
 * #4341, option 3, chosen from a render beside Progress, Tabs and Breadcrumbs).
 */
import { ComponentDef } from '../component-schema';

export const stepItem: ComponentDef = {
  id: 'step-item',
  name: 'StepItem',
  aliases: ['step', 'stepper-step'],
  category: 'navigation',
  status: 'draft',
  summary: 'One step of a step indicator: a numbered disc, the step name and a line to the next step.',
  description:
    'One step in a Steps indicator. Its disc shows the step number, filled for the current step and outlined for a step not started yet. A complete step shows a check in a filled disc, and its name can be a link back to that step. A step with an error shows an error glyph in the danger color and keeps its name. A line runs to the next step. Items live inside Steps and are never placed on their own.',

  props: [
    { name: 'status', type: "enum: 'upcoming' | 'current' | 'complete' | 'error'", values: ['upcoming', 'current', 'complete', 'error'], default: 'upcoming', required: false, description: 'Where the step stands. upcoming: not started and not reachable yet. current: the step the person is on. complete: done, and a link back when href is set. error: needs attention before the flow can finish.' },
    { name: 'label', type: 'string', required: true, description: 'The step name, short and in sentence case, such as Payment.' },
    { name: 'href', type: 'string', required: false, description: 'The address of a complete step, which makes its name a link back to it. Ignored on every other status, so a step not reached yet never reads as reachable.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The disc and the body type size: a 24px disc beside 16px text, or a 20px disc beside 14px text. Set by the Steps it sits in.' },
    { name: 'orientation', type: "enum: 'horizontal' | 'vertical'", values: ['horizontal', 'vertical'], default: 'horizontal', required: false, description: 'horizontal: the line runs to the right of the name. vertical: the line runs down from the disc, with the name beside the disc. Set by the Steps it sits in.' },
    { name: 'connector', type: 'boolean', default: true, required: false, description: 'Whether the line to the next step shows. Steps turns it off on the last step.' },
  ],

  // `[]` — the step is not interactive itself; a linked complete step's nested Link carries its own states.
  states: [],
  variants: {
    // The code default first, so the inserted member is a step not started yet.
    status: ['upcoming', 'current', 'complete', 'error'],
    orientation: ['horizontal', 'vertical'],
    size: ['medium', 'small'],
  },
  // A step's status is set when the page renders it, and the orientation and size once for the whole indicator.
  axisKinds: { status: 'authoring', orientation: 'authoring', size: 'authoring' },

  paintKeys: ['{status}.{slot}', '{slot}'],
  densitySpacing: ['size.{size}.gap'],

  tokens: {
    // THE DISC (DRAFT): one control's icon rung, 24px at medium and 20px at small, round by `radius.round`.
    'size.medium.marker': 'icon.size.md',
    'size.small.marker': 'icon.size.sm',
    radius: 'radius.round',
    'marker-stroke': 'border-width.hairline',
    // The check inside a filled disc, and the error glyph at the disc's own size (its ring is drawn inside the art).
    'check-size': 'icon.size.xs',
    // The number in the disc, and the step name in the body style beside it.
    'number-type': 'type.label.sm.emphasis',
    'size.medium.type': 'type.body.md.default',
    'size.small.type': 'type.body.sm.default',
    // THE GAPS (DRAFT): between the disc, the name and the line, and between the disc and the line below it.
    'size.medium.gap': 'space.100',
    'size.small.gap': 'space.075',
    'rail-gap': 'space.050',
    // THE LINE (DRAFT): a hairline, at a nominal length a host stretches in code.
    'connector-thickness': 'border-width.hairline',
    'size.medium.connector': 'space.600',
    'size.small.connector': 'space.400',

    // PAINT, per status. The current and complete discs fill with the brand's primary fill, the number and the check in
    // its on-fill ink; a step not started yet is an outline in the 3:1 border role with the number in secondary text.
    'current.fill': 'color.interactive.primary.fill.rest',
    'complete.fill': 'color.interactive.primary.fill.rest',
    'upcoming.border': 'color.border.tertiary',
    'current.body': 'color.interactive.primary.on-fill',
    'upcoming.body': 'color.text.secondary',
    'complete.icon': 'color.interactive.primary.on-fill',
    'error.icon': 'color.icon.danger',
    // The name: the current step in primary text, a step not started yet in secondary text, an errored step in primary
    // text. A complete step's name is the nested Link, which paints itself.
    'current.label': 'color.text.primary',
    'upcoming.label': 'color.text.secondary',
    'error.label': 'color.text.primary',
    // The line: the neutral secondary icon role at every status, the Breadcrumbs chevron's gray (owner decision
    // 2026-11-20 on #4341, option 3). One status-free key, answered by the `{slot}` template.
    'indicator': 'color.icon.secondary',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box', mirror: 'reverses',
        // `target` because the schema requires exactly one — NOT an interaction claim: the target is the nested Link.
        role: 'target',
        children: ['rail', 'label', 'link', 'connectorCell'],
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        note: 'The step: a row that hugs its disc, its name and, across a horizontal row, the line to the next step. No padding and no fill.',
      },
      rail: {
        kind: 'box',
        role: 'presentation',
        children: ['marker', 'connectorV'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'rail-gap',
        note: 'The disc and, down a vertical list, the line below it to the next step.',
      },
      marker: {
        kind: 'box', mirror: 'never',
        role: 'presentation',
        paintSlots: ['fill', 'border'],
        size: 'size.{size}.marker',
        radius: 'radius',
        strokeWidth: 'marker-stroke',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['number', 'checkGlyph', 'errorGlyph'],
        note: 'The disc: filled with the brand color for the current and complete steps, outlined for a step not started yet, and bare behind the error glyph.',
      },
      number: {
        kind: 'text',
        presentWhen: { status: ['upcoming', 'current'] },
        type: 'number-type',
        paintSlot: 'body',
        note: 'The step number, centered in the disc.',
      },
      checkGlyph: {
        kind: 'vector', mirror: 'never',
        glyph: 'check',
        size: 'check-size',
        presentWhen: { status: ['complete'] },
        note: 'A check in place of the number once the step is complete.',
      },
      errorGlyph: {
        kind: 'vector', mirror: 'never',
        glyph: 'error-circle',
        size: 'size.{size}.marker',
        presentWhen: { status: ['error'] },
        note: 'An exclamation in a circle, in the danger color, in place of the disc.',
      },
      label: {
        kind: 'text',
        presentWhen: { status: ['upcoming', 'current', 'error'] },
        type: 'size.{size}.type',
        paintSlot: 'label',
        note: 'The step name: primary text for the current step and a step with an error, secondary text for a step not started yet. Never a link.',
      },
      link: {
        kind: 'nest',
        nests: 'link',
        presentWhen: { status: ['complete'] },
        nesting: { kind: 'nest-exposed', variant: { style: 'inline', weight: 'default', size: 'medium', surface: 'default', selection: 'unselected', state: 'rest' }, expose: ['state'], follow: ['size'] },
        note: 'A complete step\'s name: a Link, inline and default weight, underlined at every state, back to that step. Its state is set on the step.',
      },
      connectorCell: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { orientation: ['horizontal'] },
        optional: true,
        children: ['connectorH'],
        height: 'size.{size}.marker',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        note: 'A cell one disc tall, so the line to the next step sits on the middle of the disc.',
      },
      connectorH: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['indicator'],
        paintGroup: 'connector',
        width: 'size.{size}.connector',
        height: 'connector-thickness',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        note: 'The line to the next step, across, neutral at every status.',
      },
      connectorV: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['indicator'],
        paintGroup: 'connector',
        presentWhen: { orientation: ['vertical'] },
        optional: true,
        width: 'connector-thickness',
        height: 'size.{size}.connector',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        note: 'The line to the next step, down from the disc, neutral at every status.',
      },
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
          'The element — each step is an <li> in the Steps <ol>, so its position is announced. The current step carries aria-current="step"; no other step carries aria-current.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The hidden status word — each step ends its accessible text with a visually hidden word, so its status never rests on color or the glyph alone: "Completed", "Current step", "Not started" or "Error" (DRAFT, owner decision 8 on #3055). The number and the glyphs are aria-hidden; the list position carries the number.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The linked step — a complete step with href renders its name as an <a>, through Link, and is the one step in the Tab order. Without href it is text. href is ignored on every other status. In Figma a complete step always draws its name as the Link.',
      },
      {
        class: 'hit-target',
        disposition: 'unsupported',
        description:
          'The link\'s hit area — the nested Link\'s code-side expansion to 24px applies: a step is not a link inside a sentence, so the inline exemption does not.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'The line\'s length — in code the line grows (flex: 1) to fill the space to the next step across a row, and down to the next step in a column. In Figma it is a fixed nominal length a designer stretches.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL — the row mirrors, so the first step sits at the right edge and the line runs left. The check and the error glyph do not mirror.',
      },
      {
        class: 'localization',
        disposition: 'unsupported',
        description:
          'text expansion — a step name wraps onto a second line rather than truncating; the disc stays at the top of the step.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['status', 'orientation', 'size'],
    // The step name of a non-link step. A complete step's name is the nested Link's `label`, set on the exposed Link.
    texts: {
      label: { part: 'label', default: 'Step name' },
      number: { part: 'number', default: '1', figmaOnly: true, figmaName: 'number' },
    },
    // One toggle over the two lines, which never build in the same member (the cell across, the line down).
    booleans: { connector: { part: ['connectorCell', 'connectorV'], default: true, figmaName: 'connector' } },
  },

  accessibility: {
    role: 'listitem, holding the step name as text or, for a complete step, a link',
    wcag: [
      '1.3.1 Info and Relationships (each step is a list item in an ordered list)',
      '1.4.1 Use of Color (each status also shows a glyph or the number, and a hidden status word)',
      '1.4.3 Contrast (targets 4.5:1 for the step name and the number against their ground)',
      '1.4.11 Non-text Contrast (targets 3:1 for the disc against the page)',
      '2.4.4 Link Purpose (the link text is the step name)',
      '2.4.7 Focus Visible (the nested link\'s own focus ring)',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'Tab reaches a linked complete step; Enter follows the link. No other step takes focus.',
    focus: 'The nested link\'s own focus ring. A step that is not a link is not focusable.',
    aria: 'aria-current="step" on the current step only. Each step ends with a visually hidden status word, translated: "Completed", "Current step", "Not started" or "Error". The number and the glyphs are aria-hidden. In right-to-left text the row mirrors.',
  },

  content: {
    labelPattern: 'Each step is a short noun phrase in sentence case, such as Shipping or Payment. No numbers in the name, which the disc shows, and no trailing punctuation.',
  },

  docs: {
    usage: 'Steps make up a Steps indicator and are set inside it: complete steps first, then the current step, then the steps not started yet. Change a step\'s status in the indicator; never place a step on its own. Turn the line off on the last step.',
    do: [
      'Mark exactly one step as current',
      'Link a complete step only when going back to it keeps the person\'s work',
      'Keep the name visible on a step with an error',
    ],
    dont: [
      'Place a step outside Steps',
      'Link a current step or a step not started yet',
      'Show status with color alone',
    ],
    contentGuidelines: 'Short noun phrases, sentence case, the same words the step\'s page heading uses.',
  },

  ai: {
    primaryPurpose: 'Show one step of a Steps indicator: its number or a check, its name, and the line to the next step.',
    whenToUse: 'Only as a child of Steps. Generate Steps, which places each step and sets the orientation and size for all of them.',
    avoidWhen: 'You need the whole sequence (use Steps, which holds the items), the progress of a task over time (use Progress) or a path up a site hierarchy (use Breadcrumbs).',
    commonPartners: ['steps'],
    triggerKeywords: ['step item', 'stepper step', 'checkout step', 'completed step', 'current step marker'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['link'],
    alternativeTo: [],
    replacesPatterns: ['a step number typed into the label', 'a step not reached yet rendered as a link'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'None. A step changes status at once.',
    exit: 'None.',
    reduceMotion: 'No motion to reduce.',
  },

  notes: {
    contested: [
      'A complete step without href: Figma always draws a complete step\'s name as the nested Link (the proposal\'s set shape, 16 members), so a complete step that is not a link has no member of its own; code renders it as text.',
      'The step name\'s Figma default reads "Step name" on a text step and the nested Link\'s own "Link text" on a complete step: a host cannot yet override a text two nesting levels down (#2781, BreadcrumbItem\'s case).',
    ],
    unverified: [
      'The disc, the number and the step name\'s contrast are stated as intent; `test.ts` holds the pairs over every committed brand and mode.',
    ],
    evolution: [
      '2026-11-19 (#3055): built from the approved proposal, all nine owner decisions as recommended, on Breadcrumbs\' items-slot shape. No KB brief exists (decision 9).',
      '2026-11-20 (#4341): every line takes `color.icon.secondary`, a complete step\'s line too, by owner decision (option 3). The proposal named the border role, but every `color.border.*` is scoped to strokes only and the disc already claims the `border` slot, so the line paints the box `indicator` slot, a fill. An icon role is not the ideal type for a line; a dedicated line role is a possible follow-up.',
    ],
  },
};
