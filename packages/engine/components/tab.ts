/**
 * Tab — one trigger in a tab list (#2416, DRAFT for the owner's design proposal, not for merge).
 *
 * KB brief: `components/tabs.md`
 *
 * This file exists on the proposal branch only so the plan can be projected and drawn. Every design call in
 * it (the names, the line style alone, the selected ink, the hover wash, the size axis, the count badge) is
 * one of the owner calls listed on #2416, held there and not settled here.
 *
 * Shape (Option A on #2416): `selection` [unselected, selected] × `size` [small, medium, large] × five
 * states = 30 members. The selected tab carries a 2px underline in the primary border ink and the primary
 * text ink; the label keeps one weight, so selecting a tab never moves its box (the footprint rule).
 */
import { ComponentDef } from '../component-schema';

export const tab: ComponentDef = {
  id: 'tab',
  name: 'Tab',
  aliases: ['tab-trigger', 'tab-item'],
  category: 'navigation',
  status: 'draft',
  summary: 'One trigger in a tab list. Selected, it shows an underline and switches the panel below.',
  description:
    'One trigger in a tab list. Selecting a tab shows its panel in place and hides the others; the page and the address do not change. A selected tab carries a 2px underline and the primary text color, so the state never rests on color alone. The label keeps one weight in both states, so selecting a tab never moves the tabs beside it. A tab can carry a leading icon and a count.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The tab text: a short noun, one or two words. One line; a tab list that runs out of room scrolls rather than wrapping.' },
    { name: 'value', type: 'string', required: true, description: 'The key that ties this tab to its panel. The tab list selects by key, never by position.' },
    { name: 'selected', type: 'boolean', default: 'false', required: false, description: 'Whether this tab is the selected one. Set by the tab list from its value; do not set it on a tab inside a list.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An icon before the label. Decorative when a label is present.' },
    { name: 'count', type: 'number', required: false, description: 'A count after the label, drawn as a count badge and read as part of the tab name, such as "Reviews, 12".' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Tab height, padding and label type. Medium clears 44px on comfortable and spacious density.' },
    { name: 'disabled', type: 'boolean', default: 'false', required: false, description: 'Dims the tab and skips it during arrow-key movement.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    selection: ['unselected', 'selected'],
    size: ['small', 'medium', 'large'],
  },
  axisKinds: { selection: 'runtime', size: 'authoring' },

  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}'],
  densitySpacing: ['size.{size}.padding-x', 'size.{size}.gap'],

  tokens: {
    'pad-y': 'space.0',
    'indicator-height': 'border-width.thick',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    'size.small.height': 'size.sm.height',
    'size.small.padding-x': 'space.150',
    'size.small.gap': 'space.075',
    'size.small.icon': 'icon.size.sm',
    'size.small.type': 'type.label.sm.emphasis',
    'size.medium.height': 'size.md.height',
    'size.medium.padding-x': 'space.200',
    'size.medium.gap': 'space.100',
    'size.medium.icon': 'icon.size.md',
    'size.medium.type': 'type.label.md.emphasis',
    'size.large.height': 'size.lg.height',
    'size.large.padding-x': 'space.250',
    'size.large.gap': 'space.100',
    'size.large.icon': 'icon.size.lg',
    'size.large.type': 'type.label.lg.emphasis',

    // UNSELECTED — neutral ink, no underline; hover and pressed take the interactive wash.
    'unselected.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'unselected.label': 'color.interactive.neutral.text.rest',
    'unselected.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.icon': 'color.interactive.neutral.icon.rest',
    'unselected.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    // SELECTED — the primary ink and a 2px underline in the primary border role, which steps with interaction.
    'selected.overlay.hover': 'color.interactive.primary.overlay.hover',
    'selected.overlay.pressed': 'color.interactive.primary.overlay.pressed',
    'selected.label': 'color.interactive.primary.text.rest',
    'selected.label.hover': 'color.interactive.primary.text.hover',
    'selected.label.pressed': 'color.interactive.primary.text.pressed',
    'selected.icon': 'color.interactive.primary.icon.rest',
    'selected.icon.hover': 'color.interactive.primary.icon.hover',
    'selected.icon.pressed': 'color.interactive.primary.icon.pressed',
    // The underline bar paints its `fill` slot: `fill` is structural, so the disabled branch paints it only
    // where a rest key exists — a disabled selected tab keeps a disabled underline, a disabled unselected one has none.
    'selected.fill': 'color.interactive.primary.border.rest',
    'selected.fill.hover': 'color.interactive.primary.border.hover',
    'selected.fill.pressed': 'color.interactive.primary.border.pressed',

    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.fill': 'color.disabled.border',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay'],
        children: ['content', 'indicator', 'focusRing'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        note: 'The tab body: a fixed-height column holding the label row above the underline. It hugs its label. Hover and pressed take a wash over the whole tab.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        children: ['leadingVisual', 'label', 'count'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fill' } },
        grow: true,
        padding: { block: 'pad-y', inlineLabel: 'size.{size}.padding-x' },
        gap: 'size.{size}.gap',
        note: 'The label row: the optional leading icon, the label and the optional count, centered in the space above the underline.',
      },
      leadingVisual: {
        kind: 'slot',
        optional: true,
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'An optional icon before the label.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type',
        note: 'The tab text, one line, at the same weight selected and unselected.',
      },
      count: {
        kind: 'nest',
        nests: 'badge',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { type: 'count', emphasis: 'bold', tone: 'neutral' } },
        note: 'An optional count after the label, the shared count badge.',
      },
      indicator: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        height: 'indicator-height',
        crossAxisFill: true,
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        note: 'The underline along the tab\'s bottom edge, 2px. It is always there, so the label sits in the same place in both states; it takes ink only on the selected tab.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the whole tab while it has keyboard focus. It can sit on a different tab from the selected one.',
      },
    },
    codeOnly: [
      'The tab in code — a <button role="tab"> with aria-selected (true or false, on every tab) and aria-controls naming its panel. The tab list owns roving tabindex: the selected tab is tabindex="0", the rest -1.',
      'The underline slide — in code the selected underline is one element owned by the tab list that moves and resizes to the selected tab (about 150–200ms). Figma draws it per tab. Under prefers-reduced-motion it snaps.',
      'The count — read as part of the tab name ("Reviews, 12 items") through visually hidden text, never as a lone number.',
      'RTL — logical properties mirror the row: the leading icon moves to the right of the label and the count to its left.',
      'text expansion — the label never wraps or truncates in a horizontal list; the list scrolls instead.',
      'The hit-target expansion — a small tab is 36px tall on comfortable density; reaching 44px there is a code-side hit area larger than the visible box.',
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    texts: { label: { part: 'label', default: 'Tab' } },
    booleans: {
      leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false },
      count: { part: 'count', figmaName: 'count', default: false },
    },
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: 'tab (a <button role="tab">) inside a role="tablist"; aria-selected on every tab and aria-controls naming its panel',
    wcag: [
      '4.1.2 Name, Role, Value (the tab role and its selected state)',
      '1.4.1 Use of Color (selected is the underline as well as the ink)',
      '1.4.11 Non-text Contrast (targets 3:1 for the underline against the page)',
      '2.4.13 Focus Appearance (the shared focus ring)',
      '2.5.8 Target Size (targets 44px at medium on comfortable and spacious density)',
    ],
    keyboard: 'Owned by the tab list: arrow keys move between tabs, Home and End go to the first and last, and Tab moves on into the panel.',
    focus: 'The focus ring marks the focused tab, which can differ from the selected tab when activation is manual.',
    aria: 'aria-selected="true" or "false" on every tab, and aria-controls pointing at its panel. An icon-only tab needs an aria-label and a tooltip. A count is part of the accessible name.',
  },

  content: {
    labelPattern: 'A short noun, one or two words, parallel with the other tabs ("Overview", "Reviews", "Shipping"). Not a verb phrase.',
  },

  docs: {
    usage: 'Use inside Tabs only. A tab names one panel of related content; selecting it shows that panel in place.',
    do: ['Keep labels short, parallel nouns', 'Let the tab list set selected from its value'],
    dont: ['Use a tab to go to another page; that is a link in a navigation', 'Set selected on a tab inside a list by hand'],
    contentGuidelines: 'One or two words, a noun, sentence case.',
  },

  ai: {
    primaryPurpose: 'One trigger inside Tabs that shows its panel in place when selected.',
    whenToUse: 'Only as a child of Tabs.',
    avoidWhen: 'Changing the page or the address (a navigation of links), or switching a value within the current view (a segmented control, not built yet).',
    commonPartners: ['tabs', 'icon', 'badge'],
    triggerKeywords: ['tab', 'tab trigger', 'tab item'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['badge', 'focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['a styled button that shows and hides a div with no tab semantics'],
    supersededBy: [],
    planned: ['segmented-control'],
  },

  motion: {
    enter: 'None. On selection the underline slides from the previous tab to this one, about 150–200ms.',
    exit: 'None.',
    reduceMotion: 'The underline snaps to the selected tab; the panel swaps with no transition.',
  },

  notes: {
    contested: [
      'DRAFT for #2416. Style (line only, or line and contained), selected ink, hover wash, size axis, the count badge and the names Tab and Tabs are owner calls held on the issue.',
    ],
    unverified: [],
    evolution: [],
  },
};
