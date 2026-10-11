/**
 * Tab — one trigger in a tab list (#2416).
 *
 * KB brief: `components/tabs.md`
 *
 * Shape (owner Q177.2, the nested shape): `selection` [unselected, selected] × `size` [small, medium, large]
 * × five states = 30 members. Line tabs only (Q177.4); a contained style waits for the segmented control.
 *
 * THE SELECTED CUE (Q178.1 A, revised by Q226 A on 2026-10-10): the primary text ink, the label in the EMPHASIS
 * weight (regular when unselected), and a 2px bar in the primary border role (`border-width.thick`), sitting on the
 * list's 1px `color.border.primary` baseline. The weight moves, the width does not: a zero-height, clipping
 * `reserve` holds a bold copy of the label (`labelReserve`, driven by the same Label property), so the label box is
 * always as wide as the bold label and selecting a tab never moves its box or its neighbors (the footprint rule
 * for a runtime axis, kept by reserving the bold width rather than by one weight).
 *
 * HOVER (Q178.2 B): NO overlay wash. An unselected tab at hover and pressed shows a 2px NEUTRAL bar where the
 * selected bar would go. The role is `color.border.secondary`, a technical pick the owner delegated: it is
 * the one neutral edge role the engine CONTRACTS at 3:1 against `background.primary` in every brand and mode
 * (#1745, `modes.ts` `put('border.secondary', …, cfg.nonTextMin)`), so the floor holds for a brand that does
 * not exist yet, not only for the four with a committed export. Measured on those four × four modes: 3.26–10.14:1.
 * `interactive.neutral.border.hover` is also contracted, but it is label ink (14.0–16.1:1), darker than the
 * selected bar it previews in every non-HC mode; `border.tertiary` is unfloored (`min 0`).
 * A selected tab's hover and pressed step its primary bar and label, also with no wash.
 *
 * The bar is ONE always-present box painting its `fill` slot, keyed per selection. `fill` is structural, so
 * at `disabled` it paints only where a REST key exists (`anatomy-figma.ts` `paintKeyOf`): a disabled selected
 * tab keeps a disabled bar, and a disabled unselected tab has none — its hover bar is keyed at hover and
 * pressed only, never at rest.
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
    'One trigger in a tab list. Selecting a tab shows its panel in place and hides the others; the page and the address do not change. A selected tab carries a 2px underline and the primary text color, so the state never rests on color alone. A selected tab\'s label is set in the emphasis weight, and every tab keeps the width of its bold label, so selecting a tab never moves the tabs beside it. At hover, an unselected tab shows a neutral bar where the selected underline would be. A tab can carry a leading icon and a count.',

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
    // THE BOLD RESERVE (Q226 A): a zero-height, clipping frame holding the label in the selected weight, so the
    // label box is always as wide as the bold label and selecting a tab never moves its neighbors.
    'reserve-height': 'space.0',
    'indicator-height': 'border-width.thick',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    'size.small.height': 'size.sm.height',
    'size.small.padding-x': 'space.150',
    'size.small.gap': 'space.075',
    'size.small.icon': 'icon.size.sm',
    'size.small.type.selected': 'type.label.sm.emphasis',
    'size.small.type.unselected': 'type.label.sm.default',
    'size.medium.height': 'size.md.height',
    'size.medium.padding-x': 'space.200',
    'size.medium.gap': 'space.100',
    'size.medium.icon': 'icon.size.md',
    'size.medium.type.selected': 'type.label.md.emphasis',
    'size.medium.type.unselected': 'type.label.md.default',
    'size.large.height': 'size.lg.height',
    'size.large.padding-x': 'space.250',
    'size.large.gap': 'space.100',
    'size.large.icon': 'icon.size.lg',
    'size.large.type.selected': 'type.label.lg.emphasis',
    'size.large.type.unselected': 'type.label.lg.default',

    // UNSELECTED — neutral ink. No wash (Q178.2 B): hover and pressed show the neutral bar instead. No rest
    // key for the bar, on purpose — that is what keeps it off at rest, at focus-visible and at disabled.
    'unselected.fill.hover': 'color.border.secondary',
    'unselected.fill.pressed': 'color.border.secondary',
    'unselected.label': 'color.interactive.neutral.text.rest',
    'unselected.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.icon': 'color.interactive.neutral.icon.rest',
    'unselected.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    // SELECTED — the primary ink and a 2px bar in the primary border role, which step with interaction. No wash.
    'selected.label': 'color.interactive.primary.text.rest',
    'selected.label.hover': 'color.interactive.primary.text.hover',
    'selected.label.pressed': 'color.interactive.primary.text.pressed',
    'selected.icon': 'color.interactive.primary.icon.rest',
    'selected.icon.hover': 'color.interactive.primary.icon.hover',
    'selected.icon.pressed': 'color.interactive.primary.icon.pressed',
    // The bar paints its `fill` slot: `fill` is structural, so the disabled branch paints it only where a rest
    // key exists — a disabled selected tab keeps a disabled bar, a disabled unselected one has none.
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
        children: ['content', 'indicator', 'focusRing'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        note: 'The tab body: a fixed-height column holding the label row above the underline. It hugs its label and paints nothing itself: no wash at hover or pressed.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        children: ['leadingVisual', 'labelBox', 'count'],
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
      labelBox: {
        kind: 'box',
        role: 'presentation',
        children: ['reserve', 'label'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        note: 'Holds the label at the width of its selected weight: as wide as the widest of the bold reserve and the label, with the label centered.',
      },
      reserve: {
        kind: 'box',
        role: 'presentation',
        children: ['labelReserve'],
        height: 'reserve-height',
        clipsContent: true,
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        note: 'A zero-height frame that clips the bold copy of the label: it takes the bold width and shows nothing.',
      },
      labelReserve: {
        kind: 'text',
        type: 'size.{size}.type.selected',
        note: 'The label again, in the selected weight, never seen: it holds every tab at its bold width (Q226 A).',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type.{selection}',
        note: 'The tab text, one line: regular when unselected, in the emphasis weight when selected.',
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
        note: 'The 2px bar along the tab\'s bottom edge. It is always there, so the label sits in the same place in both states. A selected tab paints it in the primary border color; an unselected tab paints it in a neutral border color at hover and pressed only, a preview of where the selected bar would go.',
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
      'code delivery pending: behavior layer (#2454). The owner built the Figma components first (Q178.3); the entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      'The tab in code — a <button role="tab"> with aria-selected (true or false, on every tab) and aria-controls naming its panel. The tab list owns roving tabindex: the selected tab is tabindex="0", the rest -1.',
      'The label weight in code — the selected tab sets its label in the emphasis weight, the others in the default weight, and every tab reserves its bold width so selecting never shifts the list: a hidden bold copy of the label (for example ::after { content: attr(data-label); font-weight: <emphasis>; height: 0; visibility: hidden; overflow: hidden }) in a column with the label.',
      'The hover bar — an unselected tab under the pointer or pressed shows a 2px bar in color.border.secondary where the selected bar sits; no background wash. A pointer-only cue: keyboard focus shows the focus ring instead.',
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
    texts: { label: { part: 'label', default: 'Tab', also: ['labelReserve'] } },
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
      'Pressed on an unselected tab shows the same neutral bar as hover; only the label ink steps (interactive.neutral.text.pressed). Whether pressed needs a cue of its own is held for the owner (#2416), not invented here.',
    ],
    unverified: [],
    evolution: [
      '2026-10-10 (Q225 A, Q226 A): the selected label in the emphasis weight and the unselected in the default weight, with every tab held at its bold width by a hidden bold copy of the label, so selecting still never moves the neighbors. Revises Q178.1 A\'s one weight; its goal stands.',
      '2026-10-09 (#2416): owner decisions Q177 (the nested Tab + Tabs shape, line tabs only, its own page), Q178.1 A (primary label plus a 2px primary bar on a 1px border.primary baseline, one weight), Q178.2 B (no hover wash; a 2px neutral bar previews the selected bar), Q179 A (names Tab and Tabs, S/M/L, the count as a nested Badge, automatic activation). The hover bar\'s role, border.secondary, was the build PR\'s technical pick: contracted at 3:1 against the page (#1745).',
    ],
  },
};
