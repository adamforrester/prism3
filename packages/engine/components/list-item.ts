/**
 * List.Item — one item in a read list (#2319).
 *
 * KB brief: `components/list.md`
 *
 * The atomic end of the brief's list family: a short run of text after a marker, for content the reader reads (the
 * brief's "read" genre, `<ul>` / `<ol>`). Not a listbox, a menu or a navigation, and not the brief's rich data row
 * (avatar, two lines, trailing actions), which joins the family later under the same name (owner decision Q273.1).
 *
 * Shape (Q273.2, Q273.3, Q273.4): `type` [unordered, ordered, icon] × `size` [medium, small, large] = 9 members. No
 * state axis and no reactions: a read list is not interactive.
 *
 * THE MARKER COLUMN. `markerBox` is a FIXED width per type (`size.{size}.{type}.marker-column`): 20/24/32 for a bullet or
 * a number (owner decision Q340 A, one step tighter than Q280.1 A's 24/32/40) and 24/32/40 for an icon (Q280.1 A, kept),
 * so a wrapped line and every item of one type keep one text edge: the text wraps under itself, not under the marker
 * (a hanging indent). An icon item's text edge sits further in than a bullet or number item's (Q340 A: accepted). It is ONE BODY LINE TALL (`control.size.{size}.line-box`, checkbox-row's #1201 construction) and the row is
 * top-aligned, so the marker centers on the first line of a wrapping item instead of the middle of the paragraph.
 *
 * THE MARKERS. Bullet: a round box, `control.size.{size}.dot`, `radius.round`, inked `color.icon.primary` — a drawn
 * mark, so an icon role (#1471; Q273.8). Number: a text node in the item's own type, `color.text.primary`. Icon: a
 * swap slot starting at `check` (`swapDefault`, added here), `color.icon.primary`. One gated part per type.
 *
 * NO NEW TOKENS. Every binding is an existing role; the marker column and the List's item gap are space steps.
 */
import { ComponentDef } from '../component-schema';

export const listItem: ComponentDef = {
  id: 'list-item',
  name: 'List.Item',
  aliases: ['list-row', 'bullet-item'],
  // `data` (#1700) — the brief's own category.
  category: 'data',
  status: 'draft',
  summary: 'One list item: a bullet, number or icon at a fixed indent, then text that wraps under itself.',
  description:
    'One item in a List: a marker in a fixed-width column, then short text that wraps under itself rather than under the marker. The marker is a bullet, a number or an icon, and it sits on the first line of the text however many lines the item runs to. The marker column has one width for each type, so the text of every item in a list starts at one edge. Used inside a List; the List sets the type and size of every item it holds.',

  props: [
    { name: 'children', type: 'node', required: true, description: 'The item text: a short phrase or sentence. It wraps under itself. Inline content such as a link is allowed; a block such as a second list is a nested list, indented by this item\'s marker column, so it starts at this item\'s text edge.' },
    { name: 'type', type: "enum: 'unordered' | 'ordered' | 'icon'", values: ['unordered', 'ordered', 'icon'], default: 'unordered', required: false, description: 'Which marker the item shows. Set by the List from its own type; do not set it on an item inside a List.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The text size (body small, medium or large) and the marker sized to it. Set by the List.' },
    { name: 'value', type: 'number', required: false, description: 'In an ordered list, the number this item shows; the items after it count on from it. Leave it unset to let the list count.' },
    { name: 'icon', type: 'slot', required: false, description: 'The marker glyph when type is icon. A check by default. Decorative: the item text carries the meaning.' },
  ],

  // `[]` — a read list is not interactive (Q273's shape: no state axis, no reactions). A link inside an item is its
  // own component with its own states.
  states: [],

  // `unordered` LEADS: the code default (`<ul>`) and Figma's default member. Sizes lead with medium, the code default,
  // then run smallest to largest (#2752, owner decision Q1 B), as every sized def's do. The `type` value set is declared in `lint-axis-values.ts`.
  variants: {
    type: ['unordered', 'ordered', 'icon'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { type: 'authoring', size: 'authoring' },

  // One ink per slot, the same at every coordinate: the text and the number on the text role, the bullet and the
  // icon on the icon role (Q273.8: the markers at the same strength as the text).
  paintKeys: ['{slot}'],

  tokens: {
    'label': 'color.text.primary',
    'indicator': 'color.icon.primary',
    'icon': 'color.icon.primary',

    // The marker sits inside its column; the column carries the distance to the text, so the row has no gap.
    'gap': 'space.0',
    'radius': 'radius.round',

    // THE MARKER COLUMN, fixed per type. Bullet and number (owner decision Q340 A, #2727): 20/24/32, one step tighter
    // than Q280.1 A's 24/32/40, which owner QA found too wide between the marker and the text. Icon (Q280.1 A, kept by
    // Q340 A): 24/32/40. FIXED: not in `densitySpacing`, because the column is a width the text edge is aligned to, not
    // a space between two things.
    'size.small.unordered.marker-column': 'space.250',
    'size.medium.unordered.marker-column': 'space.300',
    'size.large.unordered.marker-column': 'space.400',
    'size.small.ordered.marker-column': 'space.250',
    'size.medium.ordered.marker-column': 'space.300',
    'size.large.ordered.marker-column': 'space.400',
    'size.small.icon.marker-column': 'space.300',
    'size.medium.icon.marker-column': 'space.400',
    'size.large.icon.marker-column': 'space.500',

    // ONE BODY LINE TALL, per rung: the baked `body.{rung}` line box (checkbox-row's #1201 construction).
    'size.small.line-box': 'control.size.sm.line-box',
    'size.medium.line-box': 'control.size.md.line-box',
    'size.large.line-box': 'control.size.lg.line-box',

    // THE BULLET: the radio dot's diameter at the same rung.
    'size.small.dot': 'control.size.sm.dot',
    'size.medium.dot': 'control.size.md.dot',
    'size.large.dot': 'control.size.lg.dot',

    // THE ICON MARKER (owner decision Q280.5 A, noted): the icon ladder at the item's rung, 16/20/24, inside the 21/24/27 line box.
    // The proposal's one-rung-smaller 16/16/20 would be an `ICON_OFFSET_DEFS` exception, which is the owner's to grant.
    'size.small.icon': 'icon.size.sm',
    'size.medium.icon': 'icon.size.md',
    'size.large.icon': 'icon.size.lg',

    // THE TEXT, and the number in the same style, so the numeral matches the text.
    'size.small.text': 'type.body.sm.default',
    'size.medium.text': 'type.body.md.default',
    'size.large.text': 'type.body.lg.default',
  },

  anatomy: {
    root: 'row',
    parts: {
      // TOP-ALIGNED, never centered: on a wrapping item `align: center` floats the marker to the middle of the
      // paragraph. The marker centers within `markerBox`, which is one line tall, so it lands on line one.
      // BUILT AT 320 (`placementWidth`) and filling its column in use, with the fields' 120 floor, as checkbox-row is:
      // the text fills the row and wraps, which needs a bounded row.
      row: {
        kind: 'box',
        // `target` because the schema requires exactly one — not an interaction claim (divider's and veil's use).
        role: 'target',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        placementWidth: 320,
        minWidth: 120,
        children: ['markerBox', 'label'],
        note: 'The item: the marker column, then the text. Top-aligned, so a wrapping item keeps its marker on the first line.',
      },
      markerBox: {
        kind: 'box',
        role: 'presentation',
        // FIXED on both axes: the column's width for this type, and one body line tall. The marker sits at the column's start,
        // centered on the line.
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        width: 'size.{size}.{type}.marker-column',
        height: 'size.{size}.line-box',
        children: ['bullet', 'number', 'icon'],
        note: 'The marker column: one width per type and one text line tall, so the marker sits on the first line and the text of every item in the list starts at one edge.',
      },
      bullet: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['indicator'],
        size: 'size.{size}.dot',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { type: ['unordered'] },
        note: 'The bullet: a round dot, in the icon color.',
      },
      number: {
        kind: 'text',
        type: 'size.{size}.text',
        presentWhen: { type: ['ordered'] },
        note: 'The number, in the item\'s own type and the text color. Typed per item in Figma; counted by the list in code.',
      },
      icon: {
        kind: 'slot',
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        swapDefault: 'check',
        presentWhen: { type: ['icon'] },
        note: 'The icon marker, a check by default and swappable, in the icon color. Decorative: the text carries the meaning.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.text',
        // Fills the row and wraps under itself (the hanging indent): the row's floor bounds it.
        wrap: true,
        note: 'The item text. It fills the rest of the row and wraps under itself, never under the marker.',
      },
    },
    codeOnly: [
      'The element — an <li> inside the List\'s <ul> or <ol>. The marker is drawn by CSS (::marker, or a ::before pseudo-element in a fixed-width box), so it is not text and is not read twice; an icon marker is an aria-hidden <svg>.',
      'The hanging indent — the item is a two-column grid (or flex row) with the marker column at a fixed inline size; the text column wraps under itself. Never padding-left plus a negative text-indent on the text: that breaks when the marker is wider than the indent.',
      'The marker on line one — the marker box is one line-height tall (block-size: 1lh, or the line box of the text style) and centers its content; the item aligns to the start. Centering the whole item floats the marker to the middle of a wrapped paragraph.',
      'The number in code — counted, never typed: list-style-type: decimal (or a CSS counter, or @counter-style for a locale\'s own digits) on the <ol>. value on an <li> restarts the count from that item. Figma has no counter, so each item there holds its own typed number.',
      'RTL — logical properties throughout: the marker column moves to the inline end, the text to its start. Numerals stay in the locale\'s digit form. A check icon does not mirror.',
      'text expansion — the item grows down, never across: the text wraps, the marker column keeps its width, and nothing has a fixed block size (WCAG 1.4.12).',
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'size'],
    // The text first, at the top of the panel; the number only on ordered members, the icon swap only on icon members.
    texts: {
      children: { part: 'label', default: 'List item', figmaName: 'text' },
      value: { part: 'number', default: '1.', figmaName: 'number' },
    },
    // A required single icon, with no presence toggle: `swap icon`, with no ↳ (the icon-property canon).
    swaps: { icon: { part: 'icon', figmaName: 'swap icon' } },
    booleans: {},
  },

  accessibility: {
    role: 'listitem (a native <li>), inside the List\'s list',
    wcag: [
      '1.3.1 Info and Relationships (each item is a list item, so its position and the count are announced)',
      '1.4.1 Use of Color (an icon marker never carries meaning alone; the text does)',
      '1.4.12 Text Spacing (the item wraps and grows; nothing has a fixed height)',
    ],
    focus: 'None. An item is not focusable; a link inside it takes focus on its own.',
    aria: 'None on the item: a native <li> is a list item. An icon marker is aria-hidden="true". When an icon stands for a state (met, not met), the state is also in the item text or in visually hidden text, never in the icon alone.',
  },

  content: {
    labelPattern: 'Short and parallel: every item the same grammatical shape, sentence case. A phrase needs no closing period; full sentences take one each. Lead with the word that differs from the item before.',
  },

  docs: {
    usage: 'Use inside a List only. Each item is one short phrase or sentence after its marker. For several sentences, write a paragraph instead.',
    do: ['Keep items short and parallel', 'Put the words a reader scans for at the start of each item', 'Let the List set every item\'s type and size'],
    dont: ['Mix types within one list', 'Put the meaning of an item in its icon alone', 'Make an item a link or a button; a list of links is a navigation, and a list of commands is a menu'],
    contentGuidelines: 'One phrase or sentence per item, sentence case, parallel with the items around it.',
  },

  ai: {
    primaryPurpose: 'One item inside a List: a marker in a fixed column, then text that wraps under itself.',
    whenToUse: 'Only as a child of a List. Generate a List, which places its items and sets their marker type and size.',
    avoidWhen: 'Content a writer edits as normal copy (use a native text list in the text itself), a choice the user makes (a listbox), a command (a menu), or a navigation link (a navigation, not built yet).',
    commonPartners: ['list', 'icon'],
    triggerKeywords: ['list item', 'bullet point', 'list entry'],
    generationPriority: 9,
  },

  composition: {
    composesWith: [],
    alternativeTo: [],
    replacesPatterns: ['a paragraph with a typed bullet character and spaces before it', 'an icon and a text box laid side by side by hand'],
    supersededBy: [],
    planned: ['data-list', 'checklist'],
  },

  motion: {
    enter: 'None.',
    exit: 'None.',
    reduceMotion: 'Nothing moves.',
  },

  notes: {
    contested: [],
    unverified: [
      'Whether the number glyph and the text\'s first line share one baseline on a real host: both bind the same type style and the number sits in a box one line tall, so they should; not measured on a built file.',
    ],
    evolution: [
      '2026-10-13 (#2319): owner decisions Q273 — the read list now as List and List.Item (Q273.1), two components with every marker bound (Q273.2), the icon marker as a third type starting at check (Q273.3), body sm / md / lg (Q273.4), no nested list in Figma (Q273.5), no tone (Q273.6), category data (Q273.7), markers at the text\'s strength (Q273.8), native text lists for running text (Q273.9).',
      '2026-10-15 (#2727): owner decision Q340 A — the bullet and number marker column one step tighter, 20/24/32 (`space.250` / `300` / `400`), revising Q280.1 A\'s 24/32/40 for those two types; the icon column keeps 24/32/40, so the column is fixed per type rather than in every type, and an icon item\'s text edge sits further in.',
    ],
  },
};
