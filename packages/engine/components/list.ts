/**
 * List — a read list of short items, unordered, ordered or with an icon marker (#2319).
 *
 * KB brief: `components/list.md`
 *
 * A column of nested `list-item` instances, each following the list's `type` and `size`, held in a native `items` slot
 * (#2649, owner decision Q307 A): three by default, which a designer adds to, removes and reorders on an instance. Until
 * #2649 items 4 to 8 sat behind Figma-only booleans (#2344). The set is `type` × `size`: 9 members (owner decisions
 * Q273.2, Q273.3, Q273.4).
 *
 * NATIVE TEXT LISTS VERSUS THIS COMPONENT (Q273.9): both are supported. A native Figma text list is for running text,
 * content that renders as rich text (an article body, terms, long help text); this component is for UI lists (password
 * rules, feature lists, icon checklists, steps). The test, in the decision's words: "if a writer could edit it as
 * normal copy, use the native list; if a designer controls its spacing, markers or icons, use the component." It is
 * carried in `summary` (the Figma description), `ai.avoidWhen` and the docs page.
 *
 * THE ITEM GAP (owner decision Q280.2 A): 8/12/16 (`space.100` / `150` / `200`), and it follows density.
 */
import { ComponentDef } from '../component-schema';

// THE ITEM'S NUMBER (#2645): the nth item overrides List.Item's `value` text to "n.", so an ordered List reads 1. to 3.
// in Figma without a designer typing them. The first item keeps List.Item's own default, "1.". The text is set on every
// member; the number shows only where the item's type is ordered.
const item = (n: number, note: string) => ({
  kind: 'nest' as const,
  nests: 'list-item',
  nesting: { kind: 'nest-fixed' as const, variant: { type: 'unordered', size: 'medium' }, follow: ['type', 'size'] },
  crossAxisFill: true,
  ...(n > 1 ? { overrides: { texts: { value: `${n}.` } } } : {}),
  note,
});

export const list: ComponentDef = {
  id: 'list',
  name: 'List',
  aliases: ['unordered-list', 'ordered-list', 'bullet-list'],
  // `data` (#1700) — the brief's own category (Q273.7).
  category: 'data',
  status: 'draft',
  summary: 'Short UI items after a bullet, number or icon. For running text, use a native text list.',
  description:
    'A vertical run of short items, each after a bullet, a number or an icon, with the marker, its size and color, the indent and the space between items all bound to tokens. Unordered when the order carries no meaning, ordered when it does (steps, a ranking), and icon for a set of points such as requirements or features. Every item\'s text starts at one edge and wraps under itself. Use it for lists a designer lays out: password rules, feature lists, icon checklists, steps. For lists inside running text that a writer edits as normal copy, such as an article body, terms or long help text, use a native text list instead.',

  props: [
    { name: 'type', type: "enum: 'unordered' | 'ordered' | 'icon'", values: ['unordered', 'ordered', 'icon'], default: 'unordered', required: false, description: 'unordered (a <ul> with bullets) when the order carries no meaning; ordered (an <ol>, numbered) when it does; icon (a <ul> with an icon before each item) for points such as requirements or features. Passed to every item.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The text size, body small, medium or large, with the marker, the marker column and the space between items sized to it. Passed to every item.' },
    { name: 'start', type: 'number', default: 1, required: false, description: 'Ordered only: the number the first item shows.' },
    { name: 'reversed', type: 'boolean', default: false, required: false, description: 'Ordered only: count down instead of up.' },
    { name: 'items', type: 'slot', anyOf: ['list-item'], minItems: 1, required: true, description: 'The items, each a List.Item, in order. Three by default; a designer adds, removes and reorders them in place.' },
  ],

  // `[]` — a read list is not interactive (no state axis, no reactions).
  states: [],

  variants: {
    type: ['unordered', 'ordered', 'icon'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { type: 'authoring', size: 'authoring' },

  densitySpacing: ['size.{size}.gap'],

  tokens: {
    // THE ITEM GAP (owner decision Q280.2 A): 8/12/16 at comfortable density, moved one step by density.
    'size.small.gap': 'space.100',
    'size.medium.gap': 'space.150',
    'size.large.gap': 'space.200',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — not an interaction claim.
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'size.{size}.gap',
        // BUILT AT 320, filling its column in use, with the fields' 120 floor: each item stretches across it and wraps.
        placementWidth: 320,
        minWidth: 120,
        children: ['items'],
        note: 'The list: a column holding the items slot. It fills its column.',
      },
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        // Owner decision Q307 A: at least one item, and only a list-item (#2646's slot constraints).
        slotSettings: { minChildren: 1, allowPreferredValuesOnly: true },
        preferred: ['list-item'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'size.{size}.gap',
        crossAxisFill: true,
        children: ['item1', 'item2', 'item3'],
        note: 'The items: a native slot holding List.Item instances, three by default, with the item gap between them.',
      },
      item1: item(1, 'The first item.'),
      item2: item(2, 'The second item.'),
      item3: item(3, 'The third item.'),
    },
    codeOnly: [
      'The element — <ul role="list"> for unordered and icon, <ol role="list"> for ordered, chosen from type. The explicit role is required: a list whose markers are styled off (list-style: none) loses its list role in WebKit, and VoiceOver stops announcing "list, 6 items". The component draws its own markers, so it always sets the role.',
      'Numbering — the <ol> counts its items through CSS (list-style-type: decimal, or a counter); numbers are never typed into the item text. start and reversed pass through to the <ol>. A locale with its own digits takes them through @counter-style.',
      'The item gap — row-gap on the list (or margin-block-start on every item after the first), from the size\'s gap token. Never a margin on the last item.',
      'Nested lists — a <ul> or <ol> inside an <li> sits in that item\'s text column, so it indents by the item\'s marker column and starts at the item\'s text edge, and it uses the same size. Not drawn in Figma.',
      'Figma numbering — a Figma list cannot count, so each item of an ordered List holds its own number as text: the built items read "1." to "3.". A designer who adds or reorders items retypes the numbers.',
      'item count — Figma holds the items in the native `items` slot, three by default; code takes `items` of any length from one up.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'size'],
    booleans: {},
  },

  accessibility: {
    role: 'list (a native <ul> or <ol> with role="list" set explicitly), its items listitem',
    wcag: [
      '1.3.1 Info and Relationships (the list and its items are marked up as a list, so the count and each position are announced)',
      '1.4.1 Use of Color (an icon marker never carries meaning alone)',
      '1.4.12 Text Spacing (items wrap and grow; nothing has a fixed height)',
    ],
    focus: 'None. A list is not focusable; a link inside an item takes focus on its own.',
    aria: 'role="list" on the <ul> or <ol>, always, because the markers are drawn by the component (see the element note). Markers are not text: a bullet or number drawn by CSS is not read twice, and an icon marker is aria-hidden="true". When icons stand for states (met, not met), each item says its state in text or in visually hidden text.',
  },

  content: {
    labelPattern: 'Items short and parallel, sentence case. Phrases take no closing period; full sentences take one each. Three to seven items read at a glance; past that, group them or use a table.',
  },

  docs: {
    usage: 'Use a List for a short set of points that a designer lays out: password rules, feature lists, icon checklists, steps. Ordered when the order carries meaning, unordered when it does not, icon for points such as requirements. Native text lists versus this component: if a writer could edit it as normal copy, use the native list; if a designer controls its spacing, markers or icons, use the component. So a list inside an article body, terms or long help text is a native text list.',
    do: [
      'Use ordered only when the order carries meaning',
      'Keep items short and parallel',
      'Put each item\'s state in its text when an icon shows it',
      'Use a native text list inside running text a writer edits',
    ],
    dont: [
      'Type numbers or bullet characters into the item text',
      'Use a List for choices the user picks from; that is a listbox',
      'Use a List for commands or navigation links',
      'Use a List for values compared across columns; that is a table',
    ],
    contentGuidelines: 'One phrase or sentence per item, sentence case, every item the same grammatical shape.',
  },

  ai: {
    primaryPurpose: 'A short run of text items, each after a bullet, a number or an icon, laid out with bound spacing and markers.',
    whenToUse: 'A short set of points a designer lays out in UI: password rules, feature lists, icon checklists, steps. Ordered when the order means something.',
    avoidWhen: 'Running text, such as an article body, terms or long help text. The test: if a writer could edit it as normal copy, use the native list; if a designer controls its spacing, markers or icons, use the component. Also avoid it for a choice the user makes (Select, or a listbox), a command menu, navigation links, or values compared across columns (a table).',
    commonPartners: ['list-item', 'icon', 'text-field'],
    triggerKeywords: ['list', 'bulleted list', 'numbered list', 'ordered list', 'unordered list', 'checklist', 'feature list', 'password rules'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['list-item'],
    alternativeTo: [],
    replacesPatterns: ['a <ul> with list-style: none and no role="list"', 'a column of text boxes with typed bullet characters'],
    supersededBy: [],
    planned: ['data-list', 'checklist', 'table', 'menu', 'navigation'],
  },

  motion: {
    enter: 'None.',
    exit: 'None.',
    reduceMotion: 'Nothing moves.',
  },

  notes: {
    contested: [
      'DRAFT (#2646), for the owner: the proposed slot constraint (only List item, at least one) has no slot to sit on. The items are eight fixed nested `list-item` instances behind toggles, not a native slot, so making the column a slot that prefers `list-item` with a minimum of 1 would change how a designer adds items. That is a composition change, held for the owner rather than made here.',
    ],
    unverified: [
      'What Dev Mode shows for a native Figma text list (list spacing, the marker, bound paragraph variables) — not checked; the build lane has no Dev Mode (#2319, Q273.10).',
    ],
    evolution: [
      '2026-10-15 (#2645): the nested items carry their own numbers, "2." to "8." after the first item\'s "1.", through a per-instance text override; they no longer all read "1." until a designer types them.',
      '2026-10-13 (#2319): owner decisions Q273 — the read list now (Q273.1), two components with every marker bound (Q273.2), the icon marker as a third type (Q273.3), body sm / md / lg (Q273.4), no nested list in Figma (Q273.5), no tone (Q273.6), names, category data and its own page (Q273.7), markers at the text\'s strength (Q273.8), and native text lists for running text, the component for UI lists (Q273.9). Native list fields verified against the plugin typings (Q273.10): paragraph spacing and indent bind, list spacing and the marker do not.',
    ],
  },
};
