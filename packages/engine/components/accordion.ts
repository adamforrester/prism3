/**
 * Accordion — one section that opens and closes in place: a header row (the button) and the panel it shows
 * (#2417; owner decisions Q182 and Q183, 2026-10-10).
 *
 * KB brief: `components/accordion.md`.
 *
 * ── ONE DEF, NO GROUP (Q182.1) ──────────────────────────────────────────────────────────────────────────
 *
 * The proposal drafted an item + group pair (the checkbox and radio families' shape). The owner chose a single
 * def: a designer stacks Accordions, and an FAQ block is a stack. The group's code contract (single or multiple
 * open, the heading level, key arrays) is code-only and lives in `codeOnly` below, with no Figma def and no
 * `Item 2`…`Item 8` toggles.
 *
 * ── THE VARIANT SET: 2 × 2 × 3 × 2 = 24 (Q183) ─────────────────────────────────────────────────────────
 *
 * `expansion` [collapsed, expanded] × `indicator` [start, end] × `size` [small, medium, large] × `state`
 * [rest, focus-visible]. No hover (Q182.3: the code shows the pointer cursor only), no pressed (only
 * focus-visible is added) and no disabled (Q183: accordions are not really disabled). So the header paints no
 * wash at any member, and the label and the nested indicator keep their rest ink at both states.
 *
 * EXPANSION IS AN AXIS, NOT A BOOLEAN: opening a section shows the panel AND swaps the glyph, and a boolean
 * shows a node without changing another. The name is new to `VARIANT_AXES` (owner Q182.6); the case for it is
 * at the list.
 *
 * ── THE POSITION AXIS IS NAMED `indicator` (a technical call, owner Q183) ───────────────────────────────
 *
 * The owner decided the axis and its values (`start` the default, Q182.2: a start glyph stays beside the title
 * under zoom and magnification) and left the name to fit the closed vocabulary. `indicator` is in it, is used
 * by no other def, and names the part the axis moves, so the panel reads `indicator: start`. The nearest
 * others are defeated: `direction` is a veil wash's spatial origin and would read as a reading or motion
 * direction; `offset` is a nested part's displacement in px; `inset` is whether padding is kept. The glyph
 * style the proposal called `indicator` is now `style`, on the nested `_accordion-indicator`.
 *
 * Two gated wrapper boxes carry the two positions, because node order inside a Figma frame is fixed per
 * member and `positionWhen` moves a part only when it is its row's sole flow child. Consequence, stated
 * rather than discovered: the two wrappers are different layers, so a designer's `style` override is
 * expected to survive switching `expansion` (same layer, same set) but NOT switching `indicator`.
 *
 * ── THE INDICATOR IS A NESTED BUILDING BLOCK (Q183) ─────────────────────────────────────────────────────
 *
 * `_accordion-indicator` is nested `nest-exposed`: it EXPOSES `style` (chevron or plus-minus, picked once on
 * the instance) and FOLLOWS this def's `expansion` and `size`. See its file for the premise that Figma keeps
 * the override on a variant switch, which is checked live.
 *
 * ── THE CONTENT SLOT: AN INSTANCE SWAP, NOT A FIGMA NATIVE SLOT (Q182.4) ────────────────────────────────
 *
 * The plugin typings do expose native slots (`createSlot()`, a `SLOT` component property). Using them needs
 * the component executor to create a slot node and its property, and the executor's revision is sequenced
 * (#2398 takes 7, #2435 takes 8), so this def uses the existing instance-swap placeholder: a `slot` part the
 * file's placeholder fills and the designer swaps for their content. A native slot would let the default
 * content be a real paragraph; it is a follow-up once the executor can write one.
 *
 * ── THE PROPOSAL'S TWO ENGINE FIXES ─────────────────────────────────────────────────────────────────────
 *
 * 1. PANEL INK INDEPENDENT OF THE HEADER. The draft's panel paragraph painted the header's `label` ink because
 *    a text part could ask for no other. With the content now a swap slot there is no panel text node: the
 *    accordion binds no `icon` key (the glyph's ink is the nested indicator's), so the slot pushes NO ink into
 *    whatever fills it, and the content keeps its own page ink at every member. `test.ts` holds that, by name.
 * 2. SEPARATE START AND END BLOCK PADDING. `PaddingDef.blockEnd` (new): the panel's start inset is 0 (the
 *    header's own bottom padding spaces the first line) and its end inset closes the item above the divider.
 */
import { ComponentDef } from '../component-schema';

export const accordion: ComponentDef = {
  id: 'accordion',
  name: 'Accordion',
  aliases: ['disclosure', 'collapse', 'expander', 'details', 'expansion-panel', 'collapsible'],
  category: 'navigation',
  status: 'draft',
  summary: 'One section that opens and closes in place. The whole header row is the button.',
  description:
    'One section that opens and closes in place: a header that names the content, and a panel that opens below it. The whole header row is the button, and a glyph at its start or end shows whether the section is open. Stack several for a set of sections a user scans and opens on demand. Not one-at-a-time peer panels (tabs, not built yet), not a multi-level hierarchy (a tree, not built yet), and not navigation.',

  props: [
    { name: 'title', type: 'node', required: true, description: 'The header text: a short noun phrase or a question that says what the panel holds. It wraps rather than truncating.' },
    { name: 'children', type: 'node', required: true, description: 'The panel content. Hidden from the page, the tab order and assistive technology while the section is closed.' },
    { name: 'value', type: 'string', required: false, description: 'The key a stack of accordions uses to track which sections are open. A stable key is safer than a position when sections are added or reordered.' },
    { name: 'defaultExpanded', type: 'boolean', default: false, required: false, description: 'Opens the section on first render when nothing controls it.' },
    { name: 'headingLevel', type: 'enum: 2 | 3 | 4 | 5 | 6', values: ['2', '3', '4', '5', '6'], default: '3', required: false, description: 'The level of the heading that wraps the header button. Set it one below the heading the accordion sits under, so the page outline stays intact.' },
    { name: 'indicator', type: "enum: 'start' | 'end'", values: ['start', 'end'], default: 'start', required: false, description: 'Where the open and closed glyph sits in the header. At the start, it stays beside the title when the page is zoomed or magnified.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The header\'s type, padding and glyph size. Every size keeps the header at least 44px tall.' },
  ],

  states: ['rest', 'focus-visible'],
  variants: {
    expansion: ['collapsed', 'expanded'],
    indicator: ['start', 'end'],
    size: ['small', 'medium', 'large'],
  },
  axisKinds: { expansion: 'runtime', indicator: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}'],
  densitySpacing: ['size.{size}.pad-x', 'size.{size}.pad-y', 'size.{size}.gap'],

  tokens: {
    // THE HEADER'S INK. One key: no hover, pressed or disabled member exists to restyle it (Q182/Q183). No
    // `icon` key either, on purpose: the glyph's ink is the nested indicator's, and an `icon` key here would be
    // pushed into the content slot (see the header, fix 1).
    'label': 'color.interactive.neutral.text.rest',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    // The panel's start inset: 0, held off the density list so it never moves.
    'panel.pad-start': 'space.0',

    // PER SIZE. The header floor is 44px at every size (Q182.6): `size.md.min-height` is max(md height, 44) at
    // small and medium, and the large rung's own height is above it. Size moves the type, the padding and the
    // glyph. The glyph sits in a box one header line tall, so on a wrapping title it holds the first line.
    'size.small.min-height': 'size.md.min-height',
    'size.small.pad-x': 'space.150',
    'size.small.pad-y': 'space.100',
    'size.small.gap': 'space.100',
    'size.small.type': 'type.body.sm.strong',
    'size.small.line-box': 'control.size.sm.line-box',
    'size.small.icon': 'icon.size.sm',
    'size.medium.min-height': 'size.md.min-height',
    'size.medium.pad-x': 'space.200',
    'size.medium.pad-y': 'space.150',
    'size.medium.gap': 'space.150',
    'size.medium.type': 'type.body.md.strong',
    'size.medium.line-box': 'control.size.md.line-box',
    'size.medium.icon': 'icon.size.sm',
    'size.large.min-height': 'size.lg.height',
    'size.large.pad-x': 'space.300',
    'size.large.pad-y': 'space.200',
    'size.large.gap': 'space.200',
    'size.large.type': 'type.body.lg.strong',
    'size.large.line-box': 'control.size.lg.line-box',
    'size.large.icon': 'icon.size.md',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        placementWidth: 320,
        minWidth: 120,
        children: ['header', 'panel'], // DIVIDER-PENDING
      },
      header: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        minHeight: 'size.{size}.min-height',
        padding: { block: 'size.{size}.pad-y', inlineLabel: 'size.{size}.pad-x' },
        gap: 'size.{size}.gap',
        children: ['startIndicatorBox', 'label', 'endIndicatorBox', 'focusRing'],
        note: 'The header row and the hit target: the whole row is the button, so a click anywhere on it opens or closes the section.',
      },
      startIndicatorBox: {
        kind: 'box',
        role: 'presentation',
        height: 'size.{size}.line-box',
        presentWhen: { indicator: ['start'] },
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        children: ['startIndicator'],
        note: 'One title line tall, so the glyph holds the first line when the title wraps.',
      },
      startIndicator: {
        kind: 'nest',
        nests: '_accordion-indicator',
        size: 'size.{size}.icon',
        nesting: { kind: 'nest-exposed', variant: { style: 'chevron' }, expose: ['style'], follow: ['expansion', 'size'] },
        note: 'The open and closed glyph. Pick its style, chevron or plus and minus, on this nested instance; the Accordion sets whether it shows open or closed.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type',
        wrap: true,
        note: 'The section title. It fills the row and wraps onto more lines rather than truncating.',
      },
      endIndicatorBox: {
        kind: 'box',
        role: 'presentation',
        height: 'size.{size}.line-box',
        presentWhen: { indicator: ['end'] },
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        children: ['endIndicator'],
        note: 'One title line tall, so the glyph holds the first line when the title wraps.',
      },
      endIndicator: {
        kind: 'nest',
        nests: '_accordion-indicator',
        size: 'size.{size}.icon',
        nesting: { kind: 'nest-exposed', variant: { style: 'chevron' }, expose: ['style'], follow: ['expansion', 'size'] },
        note: 'The open and closed glyph at the end of the row. Pick its style on this nested instance.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the header row while it has keyboard focus.',
      },
      panel: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { expansion: ['expanded'] },
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'panel.pad-start', blockEnd: 'size.{size}.pad-y', inlineLabel: 'size.{size}.pad-x' },
        children: ['content'],
        note: 'The open section\'s content, present only while it is open. No inset above, since the header\'s own padding already spaces it, and the header\'s inset below and at the sides.',
      },
      content: {
        kind: 'slot',
        nesting: { kind: 'swap' },
        note: 'Swap this placeholder for the section\'s content: text or any components.',
      },
      // DIVIDER-PENDING-PART
    },
    codeOnly: [
      'code delivery pending: behavior layer (#2454). The notes below are the contract that layer implements; they name no framework.',
      'single or multiple open — a stack of accordions is a code-only grouping with no Figma component. It takes `type: "multiple" | "single"` (default multiple, so a user can compare two sections), with `value` / `defaultValue` / `onValueChange` as arrays of item keys, never indexes, so one shape serves both modes. All sections may be closed at once. Native `<details name="…">` gives single mode with no script.',
      'heading level — each header button is the only child of an `<hN>`, and `headingLevel` (default 3) picks N; a stack sets it for every section. Figma has no heading level.',
      'the panel region — the button carries aria-expanded and aria-controls; the panel is role="region" with aria-labelledby pointing at the button. Omit the region role when more than about six panels can be open at once. A closed panel is `hidden`: out of the page, the tab order and assistive technology.',
      'the panel content — `children` takes any node; Figma draws a swappable placeholder. The panel sets page ink (color.text.primary) for its content, never the header\'s interactive ink.',
      'the height animation — the panel eases open with motion.transition.enter and closed with motion.transition.exit. Under prefers-reduced-motion the duration tokens\' reduced twins (motion.duration-reduced.*) apply: the motion is shortened, not removed, and no component-level media query is added. Figma variants carry no motion.',
      'the pointer cursor — the header shows the pointer cursor on hover; there is no hover color change.',
      'keyboard — each header is its own tab stop (no roving tab index). Enter and Space open and close it. Up, Down, Home and End between headers are optional and must not trap focus.',
      'RTL — logical properties carry the layout: a start glyph moves to the right edge and the title aligns right. The chevron and the plus and minus are symmetric about the vertical axis, so no glyph mirrors.',
      'text expansion — the title wraps and never truncates; the header uses a minimum height, never a fixed one, and the glyph holds the first line.',
    ],
  },

  figmaProperties: {
    variantAxes: ['expansion', 'indicator', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'focus-visible'] },
    gridAxis: 'state',
    footprintVaries: ['expansion'],
    texts: {
      title: { part: 'label', default: 'Section title' },
    },
    swaps: { children: { part: 'content', figmaName: 'swap content' } },
    booleans: {},
  },

  accessibility: {
    role: 'A native <button> with aria-expanded and aria-controls, inside a heading; the panel is role="region" with aria-labelledby pointing at the button. Native <details> and <summary> are the alternative where their styling and animation support are enough.',
    wcag: [
      '4.1.2 Name, Role, Value (a button that exposes aria-expanded)',
      '1.3.1 Info and Relationships (each header is a heading at the level the page outline needs)',
      '2.1.1 Keyboard (Enter and Space open and close; Tab reaches every header)',
      '2.4.3 Focus Order (each header is its own tab stop; when open, the next Tab moves into the panel)',
      '2.4.7 Focus Visible and 2.4.13 Focus Appearance (the shared focus ring around the header)',
      '1.4.1 Use of Color (open and closed differ by glyph, not by color)',
      '1.4.10 Reflow (at the start, the glyph stays beside the title under zoom and magnification)',
      '2.5.5 Target Size (Enhanced), as intent (the whole header is the target, at least 44px tall on comfortable and spacious density)',
    ],
    keyboard: 'Tab moves from header to header, and into an open panel\'s content. Enter or Space opens and closes the focused header. There is no roving tab index. Up and Down between headers, and Home and End, are optional extras and must not trap focus.',
    focus: 'A focus ring around the header row on :focus-visible. Opening a section does not move focus.',
    aria: 'Hide the glyph from assistive technology (aria-hidden="true"); the button\'s aria-expanded carries the state. Do not put role="tab" or a tablist on an accordion. The title is translatable text, and the glyph does not mirror in right-to-left layouts.',
  },

  content: {
    labelPattern: 'Short, parallel noun phrases, or questions in an FAQ. The title says what the panel holds. Sentence case, no trailing colon.',
  },

  docs: {
    usage: 'Use an Accordion to compress a set of independent sections into scannable headers: FAQs, settings groups, filter panels, product details. Use one on its own for a single optional block of detail, such as a promo code field or shipping details. Leave several open at once unless space is very tight.',
    do: [
      'Allow several sections open at once by default',
      'Let every section be closed',
      'Make the whole header row the button',
      'Write titles that say what the section holds',
      'Let a long title wrap',
    ],
    dont: [
      'Hide content most users need. Show it instead.',
      'Force one section to stay open. If one view must always show, use tabs.',
      'Put an accordion inside an accordion. For more than one level, use a tree.',
      'Truncate a title with an ellipsis',
    ],
    contentGuidelines: 'Titles are short, parallel noun phrases or questions, in sentence case, with no trailing colon.',
  },

  ai: {
    primaryPurpose: 'Show a section of content on demand, under a header the user opens and closes in place.',
    whenToUse: 'A set of independent sections a user scans and opens on demand (FAQs, settings groups, filters, product details), or one optional block of detail on its own.',
    avoidWhen: 'The user needs the content most of the time (show it), the sections are one-at-a-time peer views (tabs, not built yet), the content nests more than one level (a tree, not built yet), or the header navigates somewhere (a link).',
    commonPartners: ['icon', 'button', 'text-field'],
    triggerKeywords: ['accordion', 'disclosure', 'collapsible section', 'expandable section', 'faq', 'show more', 'details', 'expander'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['_accordion-indicator', 'focus-ring'], // DIVIDER-PENDING
    alternativeTo: [],
    planned: ['tabs', 'tree', 'link'],
    replacesPatterns: ['a show and hide block with no aria-expanded or heading', 'a tablist used for vertical sections that open together'],
  },

  motion: {
    enter: 'The panel eases open to its content height (motion.transition.enter) and the glyph changes to its open form.',
    exit: 'The panel eases closed (motion.transition.exit) and the glyph changes back.',
    reduceMotion: 'Under prefers-reduced-motion the panel opens and closes at the reduced duration (motion.duration-reduced.*): shortened, not removed, since the change is the information and the movement is not.',
  },

  notes: {
    contested: [
      'The panel\'s inline inset matches the header\'s, so with the glyph at the start the content lines up under the glyph rather than under the title. Held for the owner.',
      'The panel\'s end inset reuses the header\'s block padding (8, 12 and 16px at comfortable density). Held for the owner.',
      'The content slot is an instance swap holding the file\'s placeholder; a Figma native slot, whose default could be a real paragraph, waits on an executor revision.',
      'The contained (boxed card) style from the brief is not built; flush only.',
    ],
    unverified: [
      'That Figma keeps the nested indicator\'s style override when an instance switches expansion (owner Q183: verify live). Switching the indicator position is expected to reset it, since the two positions are different layers.',
    ],
    evolution: [
      'Proposal (#2417): an item + group pair, 60 + 6 members. Owner Q182: a single def, a start or end position axis, no hover. Owner Q183: the indicator style moved into the nested `_accordion-indicator`, no disabled state, 24 members.',
      'The expansion axis name: `expansion` was added to the closed vocabulary rather than reusing `selection` (owner Q182.6).',
      'The divider was a drawn hairline box in the proposal; it nests the Divider component (Q182.5).',
    ],
  },
};
