/**
 * Pagination and Pagination.Item (#2665).
 *
 * KB brief: `components/pagination.md`
 *
 * Owner decision (2026-10-16): the proposal and wireframe on #2665 approved, every numbered call at its recommendation
 * (A). The calls this file carries, by number:
 *   1 A  One Pagination with three types: numbered, compact ("Page 5 of 10") and simple (Previous and Next). Load more
 *        is a documented Button pattern, not a type.
 *   2 A  Previous and next are a nested IconButton.Neutral, ghost, square, with the chevrons, in numbered and compact;
 *        nested text Buttons.Neutral "Previous" and "Next" in simple only.
 *   3 A  A new page cell, Pagination.Item, as SegmentedControl mints its segment.
 *   4 A  The items are a native `items` slot of Pagination.Item, seven by default, at least one (#2646's constraints,
 *        landed in #2657).
 *   5 A  SUPERSEDED by Q381 (below): the current page is no longer filled primary. Its label stays in the emphasis
 *        weight with the width held (Tab's bold reserve, #2528).
 *   6 A  The brief's window, one sibling and one boundary: seven slots.
 *   7 A  The current page has rest and focus-visible only.
 *   8 A  small, medium and large on IconButton's height rungs, so prev, next and every page cell line up.
 *   9 A  Prev and next stay in place at an end, inactive (`aria-disabled`, still focusable).
 *  10 A  numbered switches to compact when its container is narrower than the numbered row (code only).
 *  11 A  After an in-place page change, focus moves to the results heading and a polite region says "Page 5 of 10".
 *  12 A  `getHref` present renders links, absent renders buttons.
 *  13 A  The table pager is out of this build.
 *  14 A  No inverse surface in the first build.
 *  15 A  The axis is `type: numbered | compact | simple`, a new disjoint set.
 *  16 A  The names, the wording, the default member content (page 5 of 10) and the summary.
 *  17 A  The carousel indicator is a separate component.
 *
 * Owner decision Q381 (2026-10-16, after QA on the build), 1 A and 2 A:
 *   1 A  The current page is a "you are here" marker, not a selection: no primary fill. It is drawn with a border in
 *        the border color that just meets 3:1 against the page, and its number goes semibold (the emphasis weight),
 *        so the border is not the only cue. Code sets aria-current="page". The role is `color.border.tertiary`: of
 *        the neutral border roles it is the one with the least contrast that still clears 3:1 against
 *        `background.primary` in every committed brand × mode (lowest 4.21; `border.secondary` falls to 2.00).
 *        `test.ts` measures it.
 *   2 A  A per-instance `style: border | underline`. Underline is a 2px bar under the number in the same role.
 *
 * The ellipsis has its own text part, `mark`, and its own TEXT property. A set-level TEXT property holds one default
 * that every bound member displays (#1567), so one `label` property could not read "1" on a page and "…" on the
 * ellipsis: the plugin reported the collapse on both bound parts at build, and the ellipsis read "1".
 *
 * The owner rules of 2026-10-15/16 (#2706) this file follows: Figma's first member is the code default, sizes medium
 * first (Q347, Q359); Figma property names lowercase (Q345); a part used only inside its parent takes the `_` prefix
 * (Q349), so the item is `_pagination-item`; no border binds an icon or text role (Q346: the current page's border binds
 * `color.border.tertiary`, a border role);
 * nested parts reuse IconButton, Button and the focus ring. Rest carries While hovering and While pressing, Hover
 * carries While pressing (Q344): the plugin derives that chain from the item's rest/hover/pressed states.
 *
 * ── THE ITEM ──────────────────────────────────────────────────────────────────────────────────────────
 * `type` [page, ellipsis] × `selection` [unselected, selected] × `style` [border, underline] × `size` [medium, small,
 * large] × state [rest, hover, pressed, focus-visible], cut to 27 members by `excludeCoordinates` (call 7: the current
 * page has no hover or press; the ellipsis is one inert member per size; `style` only changes the current page). A
 * cell on IconButton's height rung, at least as wide as it is tall (`minWidthKey`, Tag's floor), that hugs past two
 * digits. It paints the current page's border or underline, or the neutral hover wash.
 *
 * ── THE PAGINATION ────────────────────────────────────────────────────────────────────────────────────
 * `type` × `style` × `size` = 12 members (`style` on numbered only). numbered: prev, the `items` slot, next. compact: prev, "Page 5 of 10", next. simple:
 * the two text Buttons at opposite ends of a row built at the numbered row's medium width (428px, `center`).
 */
import { ComponentDef } from '../component-schema';

export const paginationItem: ComponentDef = {
  id: '_pagination-item',
  name: 'Pagination.Item',
  aliases: ['page-item', 'pagination-page'],
  category: 'navigation',
  status: 'draft',
  summary: 'One page number in a pagination row, or the ellipsis between them. The current page is outlined.',
  description:
    'One cell in a pagination row: a page number, or the ellipsis that stands for two or more hidden pages. A page cell is as tall as an icon button and at least as wide as it is tall, so a row of pages and the previous and next buttons beside them line up as equal squares; a page number past two digits widens it. The current page is marked, not filled: a border, or a 2px underline under its number, in a gray that stands out from the page at 3:1, with its number in the emphasis weight. It keeps its width, so the row does not move. At hover and press, another page shows a light neutral wash. The ellipsis does not respond to the pointer and takes no focus. Pagination places the cells and decides which page is current.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The page number as shown, such as "4". Pagination sets it, through the locale\'s number format.' },
    { name: 'page', type: 'number', required: false, description: 'The page this cell opens. Absent on an ellipsis.' },
    { name: 'href', type: 'string', required: false, description: 'The address of the page. Present, the cell is a link; absent, it is a button that changes the page in place.' },
    { name: 'selected', type: 'boolean', default: false, required: false, description: 'Whether this is the current page. Set by Pagination; do not set it on a cell inside a pagination row.' },
    { name: 'type', type: "enum: 'page' | 'ellipsis'", values: ['page', 'ellipsis'], default: 'page', required: false, description: 'page: a page number the user can open. ellipsis: the mark that stands for two or more pages not shown.' },
    { name: 'mark', type: 'string', default: '…', required: false, description: 'The character an ellipsis shows, "…". Unused on a page.' },
    { name: 'style', type: "enum: 'border' | 'underline'", values: ['border', 'underline'], default: 'border', required: false, description: 'How the current page is marked: a border around the cell, or a 2px line under the number. Passed down by Pagination.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The cell height and label type, matching the icon buttons beside it. Passed down by Pagination.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible'],
  variants: {
    type: ['page', 'ellipsis'],
    selection: ['unselected', 'selected'],
    // Q381 2 A: how the current page is marked. Only the current page differs (excludeCoordinates below).
    style: ['border', 'underline'],
    // Medium first (Q347, Q359): Figma's first member is the code default.
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { type: 'authoring', selection: 'runtime', style: 'authoring', size: 'authoring' },

  // Selection leads, as Tab's and the segment's keys do: the current page is the paint's main split. The cell kind
  // follows; it is not a color family, so it may not lead (lint-paint arm 1). The style-led template comes first and
  // binds only the current page's border (border style) and bar (underline style), at its two states. It is five
  // segments so that no four-segment key reads as it (the paint-key vocabulary check).
  paintKeys: ['{selection}.{style}.{type}.{slot}.{state}', '{selection}.{type}.{slot}.{state}', '{selection}.{type}.{slot}'],

  tokens: {
    // Corner: IconButton square's rung, so a brand's shape lever moves the cells and the buttons together.
    'radius': 'radius.md',
    'pad-y': 'space.0',
    // Past two digits the cell hugs its label with this inset (DRAFT in the proposal). Not on the density list: a one
    // or two digit label never reaches it, and the cell's floor is its height.
    'padding-x': 'space.100',
    // THE BOLD RESERVE (call 5, Tab's Q226 A construction): a zero-height, clipping frame holding the label in the
    // current page's weight, so the label box is as wide in both selections.
    'reserve-height': 'space.0',
    // Q381: the current page's border, drawn inside the cell so it does not grow, and the underline's 2px.
    'border-width': 'border-width.hairline',
    'underline-height': 'border-width.thick',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // IconButton's height rungs (call 8), and the cell's floor is the same number.
    'size.small.height': 'size.sm.height',
    'size.medium.height': 'size.md.height',
    'size.large.height': 'size.lg.height',
    'size.small.type.unselected': 'type.label.sm.default',
    'size.small.type.selected': 'type.label.sm.emphasis',
    'size.medium.type.unselected': 'type.label.md.default',
    'size.medium.type.selected': 'type.label.md.emphasis',
    'size.large.type.unselected': 'type.label.lg.default',
    'size.large.type.selected': 'type.label.lg.emphasis',

    // A PAGE — no fill at rest; the neutral wash at hover and pressed, as IconButton.Neutral ghost.
    'unselected.page.label': 'color.interactive.neutral.text.rest',
    'unselected.page.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.page.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.page.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.page.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    // THE CURRENT PAGE (Q381 1 A): no fill. A border, or a 2px underline, in the neutral border role that clears 3:1
    // against the page with the least contrast above it; the number in the neutral ink, in the emphasis weight. Rest
    // and focus-visible only (call 7 A).
    'selected.border.page.border.rest': 'color.border.tertiary',
    'selected.border.page.border.focus-visible': 'color.border.tertiary',
    'selected.underline.page.fill.rest': 'color.border.tertiary',
    'selected.underline.page.fill.focus-visible': 'color.border.tertiary',
    'selected.page.label': 'color.interactive.neutral.text.rest',
    // THE ELLIPSIS — secondary text, no fill, no state.
    'unselected.ellipsis.label': 'color.text.secondary',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay', 'border'],
        children: ['labelBox', 'mark', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        minWidthKey: 'size.{size}.height',
        padding: { block: 'pad-y', inlineLabel: 'padding-x' },
        radius: 'radius',
        strokeWidth: 'border-width',
        note: 'The cell: as tall as an icon button and at least as wide as it is tall, and the whole pointer target. The current page has a gray border in the border style; another page takes a light neutral wash at hover and press.',
      },
      labelBox: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { type: ['page'] },
        children: ['balance', 'reserve', 'label', 'underline'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        note: 'Holds the number at the width of its emphasis weight, so the current page is as wide as any other, and the underline under it.',
      },
      balance: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { selection: ['selected'], style: ['underline'] },
        height: 'underline-height',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        note: 'An empty 2px frame above the number, as tall as the underline below it, so the underlined number sits on the same line as its neighbors.',
      },
      reserve: {
        kind: 'box',
        role: 'presentation',
        children: ['labelReserve'],
        height: 'reserve-height',
        clipsContent: true,
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        note: 'A zero-height frame that clips a copy of the number in the emphasis weight: it takes that width and shows nothing.',
      },
      labelReserve: {
        kind: 'text',
        type: 'size.{size}.type.selected',
        note: 'The number again, in the emphasis weight, never seen: it holds the cell at that width.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type.{selection}',
        note: 'The page number. Regular, and in the emphasis weight on the current page.',
      },
      underline: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { selection: ['selected'], style: ['underline'] },
        paintSlots: ['fill'],
        height: 'underline-height',
        crossAxisFill: true,
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        note: 'The 2px line under the current page\'s number, in the underline style, in the same gray as the border.',
      },
      mark: {
        kind: 'text',
        presentWhen: { type: ['ellipsis'] },
        type: 'size.{size}.type.unselected',
        note: 'The ellipsis, "…", its own text so it never reads as a page number.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the cell while it has keyboard focus.',
      },
    },
    codeOnly: [
      'The element — an <a href> when Pagination has getHref, otherwise a <button type="button">. Never an <a href="#"> with a click handler. The current page carries aria-current="page" and stays in the Tab order.',
      'The ellipsis in code — an <li aria-hidden="true"> holding the mark, with no control in it. It is never focusable and never announced: the list already implies the gap.',
      'The accessible name — the number, with a visually hidden "Page " before it, so each cell reads "Page 4"; aria-current adds "current page".',
      'tabular numerals — font-variant-numeric: tabular-nums on the label, so 9, 10 and 100 do not shift the row as the user pages. Figma uses the type style as it is.',
      'The label weight in code — the current page sets its number in the emphasis weight and every cell reserves that width (a hidden bold copy of the label in a column with it, as Tab does), so the row never moves.',
      'The hit-target expansion — a small cell is 36px on comfortable density; code extends its hit area to 44×44 without changing the visible box.',
      'forced-colors — the current page\'s border or underline takes a system color (CanvasText), so it still reads as current, beside aria-current and the weight.',
      'RTL — the row mirrors through logical properties; a cell has nothing of its own to mirror.',
      'Locale digits — the number is formatted with Intl.NumberFormat, so a locale sees its own numerals.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'selection', 'style', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible'] },
    gridAxis: 'state',
    // Call 7 A: the current page has rest and focus-visible only. The ellipsis is one inert member per size.
    excludeCoordinates: [
      { selection: ['selected'], state: ['hover', 'pressed'] },
      { type: ['ellipsis'], selection: ['selected'] },
      { type: ['ellipsis'], state: ['hover', 'pressed', 'focus-visible'] },
      // Q381 2 A: the style marks the current page only.
      { selection: ['unselected'], style: ['underline'] },
    ],
    // "1" (call 16 A) on a page; the ellipsis reads "…" through its own part and property. One property cannot do
    // both: a set-level TEXT property holds one default that every bound member shows (#1567).
    texts: {
      label: { part: 'label', default: '1', also: ['labelReserve'] },
      mark: { part: 'mark', default: '…', figmaName: 'ellipsis' },
    },
    booleans: {},
  },

  accessibility: {
    role: 'a link (<a href>) when the page has an address, or a button for a page changed in place; the ellipsis is hidden from assistive technology',
    wcag: [
      '1.3.1 Info and Relationships (each cell is a list item; the current page carries aria-current="page")',
      '1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)',
      '1.4.3 Contrast (Minimum) (every number on the page at 4.5:1)',
      '1.4.11 Non-text Contrast (the current page\'s border or underline at 3:1 against the page)',
      '2.4.4 Link Purpose (In Context) (each cell is named "Page N")',
      '2.4.7 Focus Visible (the shared focus ring)',
      '2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)',
    ],
    keyboard: 'Each page is its own Tab stop; Enter opens it, and Space also does when it is a button. Arrow keys do not move between pages. The ellipsis is skipped.',
    focus: 'A focus ring around the cell on :focus-visible, the current page included.',
    aria: 'aria-current="page" on the current page. A visually hidden "Page " before each number, so it reads "Page 4". aria-hidden="true" on the ellipsis.',
  },

  content: {
    labelPattern: 'The page number, in the locale\'s numerals. Nothing else is shown in the cell.',
  },

  docs: {
    usage: 'Use inside Pagination only. Pagination works out which pages to show, marks the current one and places the ellipses.',
    do: ['Let Pagination set the current page and the ellipses', 'Keep every page cell the same size as the previous and next buttons beside it'],
    dont: ['Place a page cell outside a pagination row', 'Make the ellipsis a control'],
    contentGuidelines: 'Numbers only. The accessible name adds "Page".',
  },

  ai: {
    primaryPurpose: 'One page number, or the ellipsis, inside a pagination row.',
    whenToUse: 'Only as an item in Pagination\'s numbered row.',
    avoidWhen: 'Anywhere outside Pagination: a single action is a Button, and a choice between a few views is a segmented control or tabs.',
    commonPartners: ['pagination'],
    triggerKeywords: ['page number', 'pagination item', 'page cell', 'current page'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['a page number link with href="#" and a click handler', 'an ellipsis read aloud as "dot dot dot"'],
    supersededBy: [],
  },

  motion: {
    enter: 'None. The hover wash and the current page\'s border change at once or over a short color fade.',
    exit: 'None.',
    reduceMotion: 'The color change happens at once.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2665): the name Pagination.Item and the id `_pagination-item` (the proposal said PaginationItem / pagination-item; Q349 adds the prefix and the skill names a family part Family.Part), the aliases page-item and pagination-page, the label inset past two digits (space.100), and the forced-colors system color on the current page.',
      'HELD FOR THE OWNER (Q381): the border is 1px (`border-width.hairline`, Button\'s outline); the underline is the decided 2px. No neutral border role sits near 3:1: `border.secondary` is 2.00 to 2.40 in light and dark, so `border.tertiary` (4.21 to 5.54 there) is the lightest that clears it. A role nearer 3:1 would be a new token. The ellipsis\'s own TEXT property needs a prop, `mark` (Figma name "ellipsis").',
    ],
    unverified: [
      'The current page\'s border against color.background.secondary (lowest 3.88 by the same measure) is measured only against color.background.primary in test.ts.',
    ],
    evolution: [
      '2026-10-16 (#2665): owner decision, every numbered call A: a new page cell (3), filled primary current page in the emphasis weight with the width held (5), rest and focus-visible only on the current page (7), small, medium and large on IconButton\'s rungs (8).',
      '2026-10-16 (Q381, after QA): the current page loses the primary fill for a border in color.border.tertiary (3:1 against the page) with its number semibold, and a `style: border | underline` axis adds the 2px underline. The ellipsis gets its own text part and property, since one TEXT property read "1" on every member.',
    ],
  },
};

// One item in the numbered row's slot (call 4 A). Page 5 of 10 (call 16 A): 1 … 4 [5] 6 … 10.
// The current page also follows the row's `style` (Q381 2 A); the other cells have only the border style.
const item = (type: 'page' | 'ellipsis', selection: 'unselected' | 'selected', label: string | null, note: string) => ({
  kind: 'nest' as const,
  nests: '_pagination-item',
  nesting: { kind: 'nest-fixed' as const, variant: { type, selection, style: 'border', size: 'medium', state: 'rest' }, follow: selection === 'selected' ? ['style', 'size'] : ['size'] },
  ...(label ? { overrides: { texts: { label } } } : {}),
  note,
});

export const pagination: ComponentDef = {
  id: 'pagination',
  name: 'Pagination',
  aliases: ['pager', 'pagination-nav', 'page-controls'],
  category: 'navigation',
  status: 'draft',
  // Call 16 A.
  summary: 'Moves between pages of a long list or set of results, and shows which page is open.',
  description:
    'Moves between the pages of a long, ordered list or set of results, and shows which page is open. numbered shows the first and last page, the current page and one page on each side of it, with an ellipsis for each gap, between a previous and a next button; the row always holds seven slots, so it keeps its width as the user pages. compact replaces the numbers with "Page 5 of 10", for a narrow container. simple is a Previous and a Next button at opposite ends, for an article or a short sequence where the count adds nothing. At the first and last page, the previous or next button stays in place and does nothing. Not tabs (a few fixed views), not a carousel indicator, and not a load more button.',

  props: [
    { name: 'count', type: 'number', required: true, description: 'The total number of pages. Pagination is not shown when it is 1.' },
    { name: 'page', type: 'number', required: false, description: 'The current page, counted from 1. Controlled; pair it with onPageChange.' },
    { name: 'defaultPage', type: 'number', default: 1, required: false, description: 'The page shown first, when Pagination manages its own state.' },
    { name: 'onPageChange', type: 'function', required: false, description: 'Called with the new page number when the user opens a page.' },
    { name: 'getHref', type: 'function', required: false, description: 'Returns the address of a page. Present, every page is a link the user can bookmark, share or open in a new tab; absent, every page is a button that changes the content in place. Pass it whenever the page has an address.' },
    { name: 'renderItem', type: 'slot', required: false, description: 'Renders a page as your router\'s link, keeping its address and aria-current.' },
    { name: 'type', type: "enum: 'numbered' | 'compact' | 'simple'", values: ['numbered', 'compact', 'simple'], default: 'numbered', required: false, description: 'numbered: page numbers between previous and next. compact: "Page 5 of 10" between previous and next. simple: Previous and Next buttons only. A numbered row switches to compact when its container is narrower than the row.' },
    { name: 'style', type: "enum: 'border' | 'underline'", values: ['border', 'underline'], default: 'border', required: false, description: 'How the current page is marked in a numbered row: a border around it, or a 2px line under its number.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The size of every cell and button, matching the icon button sizes. Medium is 44px on comfortable and spacious density.' },
    { name: 'siblingCount', type: 'number', default: 1, required: false, description: 'How many pages show on each side of the current page.' },
    { name: 'boundaryCount', type: 'number', default: 1, required: false, description: 'How many pages show at each end.' },
    { name: 'label', type: 'string', default: 'Pagination', required: false, description: 'The accessible name of the navigation landmark. Give two pagination rows on one page the same name, or a name each ("Pagination, top").' },
    { name: 'getStatusText', type: 'function', required: false, description: 'Returns the compact text and the page-change announcement, "Page 5 of 10" by default. Pass a translated string with the page and the count in the order the language needs.' },
  ],

  states: [],
  variants: {
    type: ['numbered', 'compact', 'simple'],
    // Q381 2 A: how the current page is marked, per instance. Only numbered shows pages (excludeCoordinates below).
    style: ['border', 'underline'],
    // Medium first (Q347, Q359): Figma's first member is the code default.
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { type: 'authoring', style: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // Between every cell and button, at every size (DRAFT in the proposal, approved by call 16).
    'gap': 'space.050',
    'label': 'color.text.primary',
    'size.small.type': 'type.label.sm.default',
    'size.medium.type': 'type.label.md.default',
    'size.large.type': 'type.label.lg.default',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — not an interaction claim.
        role: 'target',
        children: ['row', 'simpleRow'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        // THE SIMPLE MEMBER'S WIDTH: built at the numbered row's medium width, so its two buttons sit at opposite ends
        // the way they do under a list (held for the owner on #2665).
        center: { axis: 'type', value: 'simple', placementWidth: 428 },
        note: 'The navigation landmark: one row of controls. It hugs its row; a simple pagination is built wider so its two buttons sit at opposite ends.',
      },
      row: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { type: ['numbered', 'compact'] },
        children: ['previous', 'items', 'status', 'next'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        note: 'The previous button, the pages or the "Page 5 of 10" text, and the next button, 4px apart.',
      },
      previous: {
        kind: 'nest',
        nests: 'icon-button-neutral',
        nesting: { kind: 'nest-exposed', variant: { appearance: 'ghost', size: 'medium', shape: 'square', surface: 'default', state: 'rest' }, follow: ['size'], expose: ['state'] },
        overrides: { swaps: { icon: 'chevron-left' } },
        note: 'The previous button: an IconButton.Neutral, ghost, square, with a left chevron, the same size as the page cells. On the first page it stays in place and does nothing.',
      },
      items: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { type: ['numbered'] },
        // Call 4 A: a native slot of Pagination.Item, seven by default, at least one (#2646's constraints). It names no
        // `preferred` component: the item is a `_` building block (Q349), which Figma leaves out of a published
        // library, so the projection refuses it as a preferred value. Held for the owner on #2665.
        contentSlot: true,
        slotSettings: { minChildren: 1 },
        children: ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        note: 'The pages: a slot of page cells, 4px apart, showing page 5 of 10 by default: 1, an ellipsis, 4, 5 (current), 6, an ellipsis, 10.',
      },
      item1: item('page', 'unselected', null, 'The first page, 1.'),
      item2: item('ellipsis', 'unselected', null, 'An ellipsis for pages 2 and 3.'),
      item3: item('page', 'unselected', '4', 'Page 4, before the current page.'),
      item4: item('page', 'selected', '5', 'Page 5, the current page.'),
      item5: item('page', 'unselected', '6', 'Page 6, after the current page.'),
      item6: item('ellipsis', 'unselected', null, 'An ellipsis for pages 7 to 9.'),
      item7: item('page', 'unselected', '10', 'The last page, 10.'),
      status: {
        kind: 'text',
        presentWhen: { type: ['compact'] },
        type: 'size.{size}.type',
        note: 'The position, "Page 5 of 10", between the previous and next buttons.',
      },
      next: {
        kind: 'nest',
        nests: 'icon-button-neutral',
        nesting: { kind: 'nest-exposed', variant: { appearance: 'ghost', size: 'medium', shape: 'square', surface: 'default', state: 'rest' }, follow: ['size'], expose: ['state'] },
        overrides: { swaps: { icon: 'chevron-right' } },
        note: 'The next button: an IconButton.Neutral, ghost, square, with a right chevron. On the last page it stays in place and does nothing.',
      },
      simpleRow: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { type: ['simple'] },
        children: ['previousButton', 'nextButton'],
        layout: { direction: 'row', align: 'center', justify: 'space-between', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        gap: 'gap',
        note: 'The simple row: Previous at the start and Next at the end.',
      },
      previousButton: {
        kind: 'nest',
        nests: 'button-neutral',
        nesting: { kind: 'nest-exposed', variant: { appearance: 'text', size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'true', 'trailing icon': 'false' }, follow: ['size'], expose: ['state'] },
        overrides: { texts: { label: 'Previous' }, swaps: { leadingVisual: 'chevron-left' } },
        note: 'Previous: a Button.Neutral, text, with a left chevron before the label.',
      },
      nextButton: {
        kind: 'nest',
        nests: 'button-neutral',
        nesting: { kind: 'nest-exposed', variant: { appearance: 'text', size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'true' }, follow: ['size'], expose: ['state'] },
        overrides: { texts: { label: 'Next' }, swaps: { trailingVisual: 'chevron-right' } },
        note: 'Next: a Button.Neutral, text, with a right chevron after the label.',
      },
    },
    codeOnly: [
      'The landmark — <nav aria-label="Pagination"> around a <ul>, each control in its own <li>. The label is required: without it the landmark collides with the main navigation in a screen reader\'s landmark list. label sets it.',
      'The window — with siblingCount 1 and boundaryCount 1, every page shows up to 7 pages. Above 7 the row always holds 7 slots: the first page, the last page, the current page and one page each side, with an ellipsis for each gap. An ellipsis stands for two or more pages, never one: a one-page gap shows the number. Near an end the window slides so the slot count stays 7. In general: show all pages when count <= boundaryCount * 2 + siblingCount * 2 + 3.',
      'links or buttons — with getHref every page, previous and next is an <a href> (bookmarkable, crawlable, opens in a new tab); without it each is a <button type="button"> for content swapped in place. Never <a href="#"> with a click handler. renderItem lets a page be a router link and keeps its address and aria-current.',
      'At an end — previous on the first page and next on the last page keep their place with aria-disabled="true", stay focusable and do nothing when activated (IconButton\'s isInactive). Native disabled is not used: it drops focus to the page body when a keyboard user reaches the end.',
      'focus after a page change — with links the browser loads the new page. With buttons, focus moves to the top of the results region, normally its heading, and a polite live region says the getStatusText string, "Page 5 of 10". Focus is never left on the pager under content that changed above it.',
      'The narrow switch — numbered renders as compact when its container is narrower than the numbered row, measured on the container (a container query or a resize observer), not the viewport. Figma shows both; the designer places the one that fits the frame.',
      'Not rendered — when count is 1. A row where every control does nothing helps no one.',
      'Load more — a feed with no useful end uses a Button, not Pagination: focus moves to the first new item and a polite live region says how many loaded. Infinite scroll is not offered.',
      'The accessible names — previous and next are "Previous page" and "Next page"; simple\'s buttons show "Previous" and "Next". Each page reads "Page 4", and aria-current adds "current page".',
      'tabular numerals — font-variant-numeric: tabular-nums on the compact text and every page number, so the row does not shift as the digits change.',
      'RTL — the row mirrors through logical properties (page 1 at the right) and the chevrons flip.',
      'text expansion — "Page 5 of 10", "Previous" and "Next" grow in translation; nothing has a fixed text width. getStatusText takes a translated string with its own word order.',
      'Locale digits — every number goes through Intl.NumberFormat.',
      'A headless usePagination — returning the item list (page, ellipsis, previous, next, with selected and disabled) — is the brief\'s shape for the window. code delivery pending: behavior layer (#2454) decides whether it ships beside the component.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'style', 'size'],
    // compact and simple show no pages, so they have no underline member.
    excludeCoordinates: [{ type: ['compact', 'simple'], style: ['underline'] }],
    // Call 16 A: the compact text reads "Page 5 of 10", the same page as the numbered member's default.
    texts: { getStatusText: { part: 'status', default: 'Page 5 of 10', figmaName: 'status text' } },
    booleans: {},
  },

  accessibility: {
    role: 'navigation: a <nav> landmark named "Pagination", holding a list of links or buttons',
    wcag: [
      '1.3.1 Info and Relationships (a labeled navigation landmark around a list; the current page carries aria-current="page")',
      '1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)',
      '1.4.3 Contrast (Minimum) (every number and the compact text at 4.5:1)',
      '1.4.10 Reflow (a numbered row switches to compact in a narrow container)',
      '1.4.11 Non-text Contrast (the current page\'s border or underline at 3:1 against the page)',
      '2.1.1 Keyboard (every control is reachable with Tab)',
      '2.4.3 Focus Order (after an in-place page change focus moves to the results, and inactive controls at an end keep focus in place)',
      '2.4.4 Link Purpose (In Context) (previous, next and every page have a full name)',
      '2.4.7 Focus Visible (the shared focus ring on every control)',
      '2.5.3 Label in Name (the visible "Previous" and "Next" start each accessible name)',
      '2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)',
      '4.1.2 Name, Role, Value (the landmark, the list and aria-current)',
      '4.1.3 Status Messages (a polite "Page 5 of 10" after an in-place change)',
    ],
    keyboard: 'Tab moves through previous, each page and next; every control is its own Tab stop. Enter opens a page, and Space also does when it is a button. Arrow keys do not move between pages.',
    focus: 'Stays in the normal Tab order. After a page changes in place, focus moves to the top of the results. At an end, the inactive previous or next button keeps focus.',
    aria: 'aria-label="Pagination" on the <nav>; give two on one page the same name or a name each. aria-current="page" on the current page. aria-hidden="true" on each ellipsis. aria-disabled="true" on previous at the first page and next at the last. Accessible names "Previous page", "Next page" and "Page 4". A polite live region says "Page 5 of 10" after an in-place change. Names are translated.',
  },

  content: {
    labelPattern: 'Previous and next are named "Previous page" and "Next page"; simple shows "Previous" and "Next", never "Prev", "Back" or "Forward". The compact text is "Page 5 of 10". Pages are numbers only.',
  },

  docs: {
    usage: 'Use Pagination below a long list, a grid of results or a table, to move between pages and show which one is open. numbered when the user benefits from seeing the count and jumping to a page; compact in a narrow container, and numbered switches to it there on its own; simple for previous and next through an article or a short sequence. Center it under a list or a grid; end-align it under a table. Give every page an address whenever the page has one.',
    do: [
      'Place it below the content it pages',
      'Give pages an address, so they can be bookmarked and shared',
      'Leave previous and next in place at an end',
      'Move focus to the top of the results after an in-place change',
      'Leave it out when there is only one page',
    ],
    dont: [
      'Use it for a feed with no useful end. Use a load more Button.',
      'Use it to switch between a few views. Use tabs or a segmented control.',
      'Use it for the slides of a carousel',
      'Hide previous or next at an end; the row would change width',
      'Make an ellipsis a control',
    ],
    contentGuidelines: '"Previous" and "Next", sentence case. "Page 5 of 10" for the compact text and the announcement. Numbers in the locale\'s numerals.',
  },

  ai: {
    primaryPurpose: 'Move between the pages of a long, ordered set of results and show which page is open.',
    whenToUse: 'Search results, a catalog or a table split into pages, where the user benefits from the count and from jumping to a page; or previous and next through an article.',
    avoidWhen: 'A feed with no useful end (a load more Button), a few fixed views (tabs or a segmented control), the slides of a carousel, or rows per page and a "Go to page" field (the table pager, not yet built).',
    commonPartners: ['_pagination-item', 'icon-button-neutral', 'button-neutral', 'list'],
    triggerKeywords: ['pagination', 'pager', 'page numbers', 'previous and next', 'page 1 of 10', 'next page'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['icon-button-neutral', '_pagination-item', 'button-neutral'],
    alternativeTo: ['tabs'],
    replacesPatterns: ['page links built from <a href="#"> and click handlers', 'a disabled next button that drops focus at the last page', 'infinite scroll on a page with a footer'],
    supersededBy: [],
    planned: ['table', 'carousel', 'breadcrumbs'],
  },

  motion: {
    enter: 'None. The page changes at once.',
    exit: 'None.',
    reduceMotion: 'Nothing moves.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2665): the simple member built at 428px; the `getStatusText` prop and its Figma name "status text", which the compact text needs to be editable; the items slot with no preferred component and no ceiling (a `_` building block cannot be a slot\'s preferred value, so the slot does not offer Pagination.Item first); no gap between the previous or next button and the compact text beyond the 4px row gap.',
    ],
    unverified: [
      'That a designer can add and reorder Pagination.Item instances in the items slot on a real Figma host, with each instance\'s own label override kept, as the accordion\'s slot keeps its content.',
    ],
    evolution: [
      '2026-10-16 (#2665): owner decision, every numbered call A: one component with three types (1), IconButton.Neutral prev and next and text Buttons in simple (2), a native items slot (4), the seven-slot window (6), inactive controls at an end (9), the container-width switch to compact (10), focus to the results after an in-place change (11), links or buttons from getHref (12), no table pager (13), no inverse surface (14), the axis name `type` (15), the names and wording (16), the carousel indicator separate (17).',
      '2026-10-16 (Q381, after QA): `style: border | underline` per instance, passed to the current page.',
    ],
  },
};
