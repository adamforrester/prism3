/**
 * Accordion — the coordinated set of Accordion.Items (KB brief: `components/accordion.md`). DRAFT for the
 * owner's design proposal (#2417); every visible name and default is a draft.
 *
 * Composed the way `checkbox-group` is since #2344 (owner Q156): up to EIGHT nested items, item 1 always
 * shown, items 2-8 behind Figma-only booleans, three shown by default. Booleans do not multiply the set.
 * The items are `nest-exposed` — unlike the checkbox rows, an item has its own `expansion` and `state` to
 * expose, so a designer opens or closes each item from the group's instance panel. `size` and `indicator`
 * FOLLOW the group, so every item in a set matches.
 */
import { ComponentDef } from '../component-schema';

export const accordion: ComponentDef = {
  id: 'accordion',
  name: 'Accordion',
  aliases: ['accordion-group', 'disclosure-group', 'expansion-panels', 'collapse-group', 'faq'],
  category: 'navigation',
  status: 'draft',
  summary: 'A stack of sections that open in place. Any number can be open, and all can be closed.',
  description:
    'A vertical stack of Accordion.Items for long, scannable content a user opens on demand: FAQs, settings groups, filter panels, product details. Any number of sections can be open at once by default, and every section can be closed. Not one-at-a-time peer views (tabs, not built yet), not a multi-level hierarchy (a tree, not built yet), and not navigation.',

  props: [
    { name: 'children', type: 'node', required: true, description: 'The Accordion.Items, in order.' },
    { name: 'type', type: "enum: 'multiple' | 'single'", values: ['multiple', 'single'], default: 'multiple', required: false, description: 'Whether several sections can be open at once (multiple) or opening one closes the others (single). Keep multiple unless space is very tight or the sections are steps in order: single stops a user comparing two sections.' },
    { name: 'value', type: 'string[]', required: false, description: 'The open items, by their value. Pair with onValueChange; use defaultValue for the uncontrolled form. In single mode it holds at most one key.' },
    { name: 'defaultValue', type: 'string[]', required: false, description: 'The items open on first render. Empty by default.' },
    { name: 'onValueChange', type: '(value: string[]) => void', required: false, description: 'Called with the open keys whenever an item opens or closes.' },
    { name: 'headingLevel', type: "enum: 2 | 3 | 4 | 5 | 6", values: ['2', '3', '4', '5', '6'], default: '3', required: false, description: 'The heading level of every item\'s header. Set it one below the heading the accordion sits under.' },
    { name: 'indicator', type: "enum: 'chevron' | 'plus-minus'", values: ['chevron', 'plus-minus'], default: 'chevron', required: false, description: 'The open/closed glyph for every item.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The size of every item.' },
  ],

  states: ['rest'],
  variants: {
    indicator: ['chevron', 'plus-minus'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { indicator: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    'fill': 'color.border.secondary',
    'divider-width': 'border-width.hairline',
    'gap': 'space.0',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        placementWidth: 320,
        minWidth: 120,
        children: ['topDivider', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'],
      },
      topDivider: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        height: 'divider-width',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        crossAxisFill: true,
        note: 'A hairline above the first item, so the set is closed top and bottom. Each item draws the one below it.',
      },
      item1: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        note: 'Item 1 of up to eight: an Accordion.Item, always present. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item2: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 2 of up to eight: an Accordion.Item, shown by default, behind the Figma-only "Item 2" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item3: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 3 of up to eight: an Accordion.Item, shown by default, behind the Figma-only "Item 3" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item4: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 4 of up to eight: an Accordion.Item, hidden by default, behind the Figma-only "Item 4" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item5: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 5 of up to eight: an Accordion.Item, hidden by default, behind the Figma-only "Item 5" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item6: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 6 of up to eight: an Accordion.Item, hidden by default, behind the Figma-only "Item 6" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item7: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 7 of up to eight: an Accordion.Item, hidden by default, behind the Figma-only "Item 7" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
      item8: {
        kind: 'nest',
        nests: 'accordion-item',
        nesting: { kind: 'nest-exposed', variant: { expansion: 'collapsed', indicator: 'chevron', size: 'medium', state: 'rest' }, expose: ['expansion', 'state'], follow: ['size', 'indicator'] },
        crossAxisFill: true,
        optional: true,
        note: 'Item 8 of up to eight: an Accordion.Item, hidden by default, behind the Figma-only "Item 8" toggle. It follows the group\'s size and indicator; open, close and state are set on the item itself.',
      },
    },
    codeOnly: [
      'the item count — in code the count is `children`; the Figma set carries eight items behind toggles.',
      'the list wrapper — the items may sit in a <ul>/<li> so a screen reader announces "item X of N". A standalone item is never in a list.',
      'the open-state model — `type`, `value`, `defaultValue` and `onValueChange` coordinate the items; single mode closes the others when one opens. Native <details name="..."> gives single mode with no script.',
      'expand all / collapse all — an optional control above a long set. Not drafted.',
      'scroll into view — after opening, scroll the header into view if a tall panel pushed it off screen.',
      'deep links — a URL fragment can seed defaultValue so a linked section opens on load.',
    ],
  },

  figmaProperties: {
    variantAxes: ['indicator', 'size'],
    booleans: {
      item2: { part: 'item2', default: true, figmaName: 'Item 2', figmaOnly: true },
      item3: { part: 'item3', default: true, figmaName: 'Item 3', figmaOnly: true },
      item4: { part: 'item4', default: false, figmaName: 'Item 4', figmaOnly: true },
      item5: { part: 'item5', default: false, figmaName: 'Item 5', figmaOnly: true },
      item6: { part: 'item6', default: false, figmaName: 'Item 6', figmaOnly: true },
      item7: { part: 'item7', default: false, figmaName: 'Item 7', figmaOnly: true },
      item8: { part: 'item8', default: false, figmaName: 'Item 8', figmaOnly: true },
    },
  },

  accessibility: {
    role: 'A group of Accordion.Items, each a heading-wrapped button controlling a region. Not a tablist.',
    wcag: [
      '1.3.1 Info and Relationships (every header is a heading at one level, and the optional list gives the set size)',
      '2.1.1 Keyboard / 2.4.3 Focus Order (each header is its own tab stop, in document order)',
    ],
    keyboard: 'Tab moves through the headers in order and into any open panel. Enter or Space opens and closes. Optional: Up and Down move between headers, Home and End jump to the first and last.',
    focus: 'Each item rings its own header. Opening or closing an item never moves focus.',
    aria: 'Set the heading level once on the group so every item matches the page outline.',
  },

  docs: {
    usage: 'Use an Accordion to compress a set of independent sections into scannable headers: FAQs, settings groups, filter panels, product details. Leave several open at once unless space is very tight.',
    do: [
      'Allow several sections open at once by default',
      'Let every section be closed',
      'Keep titles short and parallel so the set scans',
    ],
    dont: [
      'Force one section to stay open. If one view must always show, use tabs.',
      'Nest an accordion inside another',
      'Use an accordion for content most users need',
    ],
  },

  ai: {
    primaryPurpose: 'Stack independent sections under headers a user opens and closes in place.',
    whenToUse: 'An FAQ, a settings or filter panel, product details, or any set of sections a user scans and opens on demand.',
    avoidWhen: 'One optional block (a single Accordion.Item), one-at-a-time peer views (tabs, not built yet), multi-level content (a tree, not built yet), or content most users need (show it).',
    commonPartners: ['accordion-item', 'button', 'checkbox-group'],
    triggerKeywords: ['accordion', 'faq', 'expandable sections', 'collapsible sections', 'expand all', 'filter panel', 'disclosure group'],
    generationPriority: 1,
  },

  composition: {
    composesWith: ['accordion-item'],
    alternativeTo: [],
    planned: ['tabs', 'tree', 'divider'],
    replacesPatterns: ['a tablist used for vertical sections', 'stacked show/hide divs with no heading or aria-expanded'],
  },

  motion: {
    enter: 'None of its own; each item animates its panel.',
    exit: 'None of its own.',
    reduceMotion: 'None of its own; each item snaps under reduced motion.',
  },

  notes: {
    contested: [
      'The default number of items shown (3, matching the checkbox and radio groups) and the toggle names ("Item 2" ... "Item 8"). Held for the owner.',
      'The top divider. Held for the owner.',
    ],
    unverified: [],
    evolution: [],
  },
};
