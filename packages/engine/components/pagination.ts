/**
 * Pagination and Pagination.Item (#2665).
 *
 * KB brief: `components/pagination.md`
 *
 * Owner decision (2026-10-16): the proposal and wireframe on #2665 approved, every numbered call at its recommendation
 * (A). The calls this file carries, by number:
 *   1 A  One Pagination with three types: numbered, compact ("Page 5 of 10") and simple (Previous and Next). Load more
 *        is a documented Button pattern, not a type.
 *   2 A  SUPERSEDED by Q414 A (below): previous and next were a nested IconButton.Neutral and, in simple, text
 *        Button.Neutral.
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
 *        `test.ts` measures it. Q427 A (2026-10-19) moves the border style's border to `border.secondary`; the
 *        underline keeps `border.tertiary`.
 *   2 A  A per-instance `style: border | underline`. Underline is a 2px bar under the number in the same role.
 *
 * Owner decision Q394 A (2026-10-17, on #2783): a slot item is not a part "used only inside its parent" in Q349's sense,
 * so the item is unprefixed, `pagination-item`, and it is the `items` slot's preferred item with preferred-only, the
 * Breadcrumbs shape. Q395 A: the current page keeps `border.tertiary` at 1px, as built.
 *
 * Owner decision Q404 A (2026-10-17, superseding Q396): the gap marker is the existing `more-horizontal` icon
 * (`more-horizontal-filled`, the one form the set has), the glyph Breadcrumbs' overflow uses. It is decorative,
 * aria-hidden and not interactive: pages are reached through the numbers and Previous and Next. So the ellipsis has
 * no text and no TEXT property, and the item has no `mark` prop. That also ends the build-time caption collapse: the
 * one `label` property is bound on page members only, behind the one caption "1" (#1567).
 *
 * Owner QA of 2026-10-19 (decided fixes) and owner decisions Q426 A, Q427 A and Q428 A:
 *   QA 1     In the underline style the underline is as wide as the number, not the cell.
 *   QA 2     The gap marker is in the page numbers' ink (`color.icon.primary`, the same value as their
 *            `interactive.neutral.text.rest` in every brand and mode).
 *   Q426 A   The labeled previous and next (simple's) draw no fill. Their word and chevron change ink at hover and
 *            pressed, so they read as text links beside the page cells. The cell and its 44px target are unchanged.
 *   Q427 A   In the border style the current page's border is `color.border.secondary`, one rung lighter than
 *            `border.tertiary`: a subtle edge that need not clear 3:1, because the number's emphasis weight is the
 *            second cue (WCAG 1.4.11, the reasoning in `notes.evolution`). The underline style's underline is its only
 *            cue, so it keeps `border.tertiary` and 3:1.
 *   Q428 A   The chevrons and the gap marker are one icon-size rung smaller at every size. Cell sizes and the 44px
 *            targets are unchanged.
 *
 * Owner decision Q414 A (2026-10-18, answering Q-2796-1 under Q386): Pagination draws its own previous and next, so it
 * requires no Neutral button family. Pagination.Item gains `type: previous | next`: the same square cell with a chevron
 * (chevron-left, chevron-right), in the page cells' neutral ink and wash, with their states; simple's two text controls
 * are the same cells with a word beside the chevron (`labeled`). Inactive at an end is the `disabled` state in Figma
 * and aria-disabled in code (calls 9 A, 12 A); the accessible names are "Previous page" and "Next page".
 *
 * The owner rules of 2026-10-15/16 (#2706) this file follows: Figma's first member is the code default, sizes medium
 * first (Q347, Q359); Figma property names lowercase (Q345); a part used only inside its parent takes the `_` prefix
 * (Q349), which Q394 A rules does not reach a slot item, so the item is `pagination-item`; no border binds an icon or text role (Q346: the current page's border binds
 * `color.border.tertiary`, a border role);
 * nested parts reuse the focus ring. Rest carries While hovering and While pressing, Hover
 * carries While pressing (Q344): the plugin derives that chain from the item's rest/hover/pressed states.
 *
 * ── THE ITEM ──────────────────────────────────────────────────────────────────────────────────────────
 * `type` [page, ellipsis, previous, next] × `selection` [unselected, selected] × `style` [border, underline] × `labeled`
 * [false, true] × `size` [medium, small, large] × state [rest, hover, pressed, focus-visible, disabled], cut to 87
 * members by `excludeCoordinates` (call 7: the current page has no hover or press; the ellipsis is one inert member per
 * size; `style` only changes the current page; previous and next are never current, alone take a word and alone take
 * disabled, Q414 A: 2 × 2 × 5 × 3 = 60 of them). A
 * cell on IconButton's height rung, at least as wide as it is tall (`minWidthKey`, Tag's floor), that hugs past two
 * digits. It paints the current page's border or underline, or the neutral hover wash.
 *
 * ── THE PAGINATION ────────────────────────────────────────────────────────────────────────────────────
 * `type` × `style` × `size` = 12 members (`style` on numbered only). numbered: prev, the `items` slot, next. compact: prev, "Page 5 of 10", next. simple:
 * the two labeled cells at opposite ends of a row built at the numbered row's medium width (428px, `center`). Previous
 * and next are Pagination.Item cells in every type (Q414 A).
 */
import { ComponentDef } from '../component-schema';

export const paginationItem: ComponentDef = {
  id: 'pagination-item',
  name: 'Pagination.Item',
  aliases: ['page-item', 'pagination-page'],
  category: 'navigation',
  status: 'draft',
  summary: 'A pagination cell: a page, the gap marker, previous or next. The current page is outlined.',
  description:
    'One cell in a pagination row: a page number, the gap marker, three dots, that stands for two or more hidden pages, or the previous or next cell, a chevron that opens the page before or after. A cell is as tall as an icon button and at least as wide as it is tall, so a row of pages between previous and next lines up as equal squares; a page number past two digits, or the word "Previous" or "Next" beside a chevron, widens it. The current page is marked, not filled: its number in the emphasis weight, with a light gray border around the cell, or a 2px underline under the number in a gray that stands out from the page at 3:1. It keeps its width, so the row does not move. At hover and press, another page and an unlabeled previous or next show a light neutral wash; a labeled previous or next shows no fill and its word and chevron darken, as a text link does. At the first or last page, previous or next stays in place and does nothing, drawn in the disabled ink. The gap marker is decorative: it does not respond to the pointer, takes no focus and is hidden from assistive technology. Pagination places the cells and decides which page is current.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The page number as shown, such as "4". Pagination sets it, through the locale\'s number format.' },
    { name: 'page', type: 'number', required: false, description: 'The page this cell opens. Absent on an ellipsis.' },
    { name: 'href', type: 'string', required: false, description: 'The address of the page. Present, the cell is a link; absent, it is a button that changes the page in place.' },
    { name: 'selected', type: 'boolean', default: false, required: false, description: 'Whether this is the current page. Set by Pagination; do not set it on a cell inside a pagination row.' },
    { name: 'type', type: "enum: 'page' | 'ellipsis' | 'previous' | 'next'", values: ['page', 'ellipsis', 'previous', 'next'], default: 'page', required: false, description: 'page: a page number the user can open. ellipsis: the three-dot icon that stands for two or more pages not shown. previous and next: the cell with a left or right chevron that opens the page before or after the current one.' },
    { name: 'labeled', type: 'boolean', default: false, required: false, description: 'On previous and next only: true shows the word beside the chevron, as Pagination\'s simple type does. Passed down by Pagination.' },
    { name: 'previousLabel', type: 'string', default: 'Previous', required: false, description: 'The word a labeled previous cell shows, "Previous" by default. Pass the translated word.' },
    { name: 'nextLabel', type: 'string', default: 'Next', required: false, description: 'The word a labeled next cell shows, "Next" by default. Pass the translated word.' },
    { name: 'isInactive', type: 'boolean', default: false, required: false, description: 'On previous and next only: true at the first or last page. The cell stays in place and in the Tab order with aria-disabled="true", and does nothing when activated. Set by Pagination.' },
    { name: 'style', type: "enum: 'border' | 'underline'", values: ['border', 'underline'], default: 'border', required: false, description: 'How the current page is marked: a border around the cell, or a 2px line under the number. Passed down by Pagination.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The cell height and label type, matching the icon buttons beside it. Passed down by Pagination.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    // Q414 A: Pagination draws its own previous and next, as cells of this set.
    type: ['page', 'ellipsis', 'previous', 'next'],
    selection: ['unselected', 'selected'],
    // Q381 2 A: how the current page is marked. Only the current page differs (excludeCoordinates below).
    style: ['border', 'underline'],
    // Q414 A: simple's previous and next show a word beside the chevron; numbered's and compact's do not.
    labeled: ['false', 'true'],
    // Medium first (Q347, Q359): Figma's first member is the code default.
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { type: 'authoring', selection: 'runtime', style: 'authoring', labeled: 'authoring', size: 'authoring' },

  // Selection leads, as Tab's and the segment's keys do: the current page is the paint's main split. The cell kind
  // follows; it is not a color family, so it may not lead (lint-paint arm 1). The style-led template comes first and
  // binds only the current page's border (border style) and bar (underline style), at its two states. It is five
  // segments so that no four-segment key reads as it (the paint-key vocabulary check).
  // Q426 A: the second template binds previous's and next's wash on the unlabeled cells only, so a labeled cell finds
  // no overlay key and draws no fill. It is six segments, so no five-segment key reads as it.
  paintKeys: ['{selection}.{style}.{type}.{slot}.{state}', '{selection}.{style}.{labeled}.{type}.{slot}.{state}', '{selection}.{type}.{slot}.{state}', '{selection}.{type}.{slot}'],

  tokens: {
    // Corner: IconButton square's rung, so the cells match the icon buttons a page places beside them.
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
    // Q414 A: between a labeled previous or next cell's chevron and its word (Link's medium icon gap).
    'gap': 'space.050',
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
    // Q404 A: the gap marker's glyph is the size of the chevrons beside it. Q428 A: both sit one icon-size rung under
    // IconButton's glyph rung at every size (sm under md, xs under sm, md under lg); the cell and its 44px target do not
    // change.
    'size.small.icon': 'icon.size.xs',
    'size.medium.icon': 'icon.size.sm',
    'size.large.icon': 'icon.size.md',

    // A PAGE — no fill at rest; the neutral wash at hover and pressed, as IconButton.Neutral ghost.
    'unselected.page.label': 'color.interactive.neutral.text.rest',
    'unselected.page.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.page.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.page.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.page.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    // THE CURRENT PAGE (Q381 1 A): no fill; the number in the neutral ink, in the emphasis weight. Rest and
    // focus-visible only (call 7 A). Q427 A: the border style's border is border.secondary, one rung lighter than
    // border.tertiary, a subtle edge that need not clear 3:1, because the emphasis weight is the second cue (WCAG 1.4.11,
    // in `notes`). The underline is that style's only cue, so it keeps border.tertiary and 3:1.
    'selected.border.page.border.rest': 'color.border.secondary',
    'selected.border.page.border.focus-visible': 'color.border.secondary',
    'selected.underline.page.fill.rest': 'color.border.tertiary',
    'selected.underline.page.fill.focus-visible': 'color.border.tertiary',
    'selected.page.label': 'color.interactive.neutral.text.rest',
    // THE ELLIPSIS — the more-horizontal icon (Q404 A), no fill, no state. Owner QA (2026-10-19): in the page numbers'
    // ink, so two inks do not sit side by side. icon.primary is the icon role with the same value as the numbers'
    // interactive.neutral.text.rest in every brand and mode (test.ts measures it); the glyph is not a control, so it
    // takes the plain icon role, not an interactive one.
    'unselected.ellipsis.icon': 'color.icon.primary',
    // PREVIOUS AND NEXT (Q414 A) — a page cell's neutral ink and wash: the chevron in the neutral icon ink (IconButton.Neutral
    // ghost's glyph roles), the word in the neutral text ink, the wash at hover and pressed. Inactive at an end (call 9 A):
    // the cross-cutting disabled inks, no wash. Q426 A: the labeled cells (simple's) take no wash; their word and chevron
    // change ink at hover and pressed, as a text link does. So the wash is keyed on `labeled: false` only.
    'unselected.previous.icon': 'color.interactive.neutral.icon.rest',
    'unselected.previous.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.previous.icon.pressed': 'color.interactive.neutral.icon.pressed',
    'unselected.previous.label': 'color.interactive.neutral.text.rest',
    'unselected.previous.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.previous.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.border.false.previous.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.border.false.previous.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'unselected.next.icon': 'color.interactive.neutral.icon.rest',
    'unselected.next.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.next.icon.pressed': 'color.interactive.neutral.icon.pressed',
    'unselected.next.label': 'color.interactive.neutral.text.rest',
    'unselected.next.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.next.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.border.false.next.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.border.false.next.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'disabled.icon': 'color.disabled.icon',
    'disabled.label': 'color.disabled.text',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay', 'border'],
        children: ['previousIcon', 'previousText', 'labelBox', 'gapIcon', 'nextText', 'nextIcon', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        gap: 'gap',
        height: 'size.{size}.height',
        minWidthKey: 'size.{size}.height',
        padding: { block: 'pad-y', inlineLabel: 'padding-x' },
        radius: 'radius',
        strokeWidth: 'border-width',
        note: 'The cell: as tall as an icon button and at least as wide as it is tall, and the whole pointer target. The current page has a light gray border in the border style; another page and an unlabeled previous or next take a light neutral wash at hover and press. A labeled previous or next has no fill.',
      },
      previousIcon: {
        kind: 'vector',
        glyph: 'chevron-left',
        size: 'size.{size}.icon',
        presentWhen: { type: ['previous'] },
        note: 'The previous cell\'s left chevron (Q414 A), at the gap icon\'s size, one rung under the icon button\'s glyph (Q428 A).',
      },
      previousText: {
        kind: 'text',
        type: 'size.{size}.type.unselected',
        presentWhen: { type: ['previous'], labeled: ['true'] },
        note: 'The word "Previous" after the chevron, on a labeled cell only (Pagination\'s simple type).',
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
        // Owner QA (2026-10-19): the underline spanned the cell. This frame is childless, so a hug width has nothing to
        // hug and the host keeps a new frame's default width; the box held it, and the underline stretched to it. It
        // stretches to the number instead, like the underline, so the number alone sets both widths.
        crossAxisFill: true,
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        note: 'An empty 2px frame above the number, as tall as the underline below it and as wide as the number, so the underlined number sits on the same line as its neighbors.',
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
        note: 'The 2px line under the current page\'s number, in the underline style: as wide as the number, not the cell, in a gray that stands out from the page at 3:1.',
      },
      gapIcon: {
        kind: 'vector',
        glyph: 'more-horizontal-filled',
        size: 'size.{size}.icon',
        presentWhen: { type: ['ellipsis'] },
        note: 'The gap marker: the more-horizontal icon, three dots, decorative and hidden from assistive technology (Q404 A). It is not a control.',
      },
      nextText: {
        kind: 'text',
        type: 'size.{size}.type.unselected',
        presentWhen: { type: ['next'], labeled: ['true'] },
        note: 'The word "Next" before the chevron, on a labeled cell only (Pagination\'s simple type).',
      },
      nextIcon: {
        kind: 'vector',
        glyph: 'chevron-right',
        size: 'size.{size}.icon',
        presentWhen: { type: ['next'] },
        note: 'The next cell\'s right chevron (Q414 A).',
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
      'The ellipsis in code — an <li aria-hidden="true"> holding the more-horizontal icon, with no control and no text in it. It is never focusable and never announced: the list already implies the gap.',
      'previous and next in code — an <a href> or a <button type="button">, as a page is, named "Previous page" and "Next page" (aria-label; a labeled cell\'s visible word starts the name, 2.5.3). The chevron is aria-hidden="true". At an end the cell keeps its place and its Tab stop with aria-disabled="true" and does nothing when activated (isInactive; call 9 A). Native disabled is not used. Figma draws that as the disabled state.',
      'The chevrons in RTL — previous and next swap ends with the row, and each chevron mirrors, so it points the way the row reads.',
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
    variantAxes: ['type', 'selection', 'style', 'labeled', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    // Call 7 A: the current page has rest and focus-visible only. The ellipsis is one inert member per size.
    excludeCoordinates: [
      { selection: ['selected'], state: ['hover', 'pressed'] },
      { type: ['ellipsis'], selection: ['selected'] },
      { type: ['ellipsis'], state: ['hover', 'pressed', 'focus-visible'] },
      // Q381 2 A: the style marks the current page only.
      { selection: ['unselected'], style: ['underline'] },
      // Q414 A: previous and next are never the current page; only they take a word and the inactive (disabled) state.
      { type: ['previous', 'next'], selection: ['selected'] },
      { type: ['page', 'ellipsis'], labeled: ['true'] },
      { type: ['page', 'ellipsis'], state: ['disabled'] },
    ],
    // "1" (call 16 A) on a page. The ellipsis is an icon (Q404 A), so this is the set's one TEXT property and its one
    // caption: a set-level TEXT property holds one default that every bound member shows (#1567).
    // Q414 A: a labeled previous and next each have their own part and property, one caption each (#1567).
    texts: {
      label: { part: 'label', default: '1', also: ['labelReserve'] },
      previousLabel: { part: 'previousText', default: 'Previous', figmaName: 'previous label' },
      nextLabel: { part: 'nextText', default: 'Next', figmaName: 'next label' },
    },
    booleans: {},
  },

  accessibility: {
    role: 'a link (<a href>) when the page has an address, or a button for a page changed in place, for a page, previous and next; the ellipsis is a decorative icon hidden from assistive technology',
    wcag: [
      '1.3.1 Info and Relationships (each cell is a list item; the current page carries aria-current="page")',
      '1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)',
      '1.4.3 Contrast (Minimum) (every number on the page at 4.5:1)',
      '1.4.11 Non-text Contrast (the underline at 3:1 against the page; the border style\'s lighter border is not the only cue, the number\'s emphasis weight marks the current page too; the decorative gap icon is exempt)',
      '2.4.4 Link Purpose (In Context) (each page is named "Page N"; previous and next "Previous page" and "Next page")',
      '2.5.3 Label in Name (a labeled cell\'s visible "Previous" or "Next" starts its accessible name)',
      '2.4.7 Focus Visible (the shared focus ring)',
      '2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)',
    ],
    keyboard: 'Each page, previous and next is its own Tab stop; Enter opens it, and Space also does when it is a button. An inactive previous or next keeps its Tab stop and does nothing. Arrow keys do not move between pages. The ellipsis is skipped.',
    focus: 'A focus ring around the cell on :focus-visible, the current page included.',
    aria: 'aria-current="page" on the current page. A visually hidden "Page " before each number, so it reads "Page 4". aria-hidden="true" on the ellipsis icon and on the chevrons. Previous and next named "Previous page" and "Next page", and aria-disabled="true" at an end.',
  },

  content: {
    labelPattern: 'The page number, in the locale\'s numerals. Nothing else is shown in a page cell; the ellipsis shows the three-dot icon and no text. A labeled previous or next shows "Previous" or "Next", never "Prev", "Back" or "Forward".',
  },

  docs: {
    usage: 'Use inside Pagination only. Pagination works out which pages to show, marks the current one, places the ellipses, and sets previous and next inactive at an end.',
    do: ['Let Pagination set the current page and the ellipses', 'Keep every page cell the same size as the previous and next cells beside it'],
    dont: ['Place a page cell outside a pagination row', 'Make the ellipsis a control'],
    contentGuidelines: 'Numbers only on a page. The accessible name adds "Page". Previous and next read "Previous" and "Next", sentence case.',
  },

  ai: {
    primaryPurpose: 'One page number, the ellipsis, or previous or next, inside a pagination row.',
    whenToUse: 'Only as an item in Pagination: a page or the ellipsis in the numbered row, previous and next in every type.',
    avoidWhen: 'Anywhere outside Pagination: a single action is a Button, and a choice between a few views is a segmented control or tabs.',
    commonPartners: ['pagination'],
    triggerKeywords: ['page number', 'pagination item', 'page cell', 'current page', 'previous page', 'next page'],
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
      'HELD FOR THE OWNER (#2665): the name Pagination.Item (the proposal said PaginationItem; the skill names a family part Family.Part; the id is `pagination-item` by Q394 A), the aliases page-item and pagination-page, the label inset past two digits (space.100), and the forced-colors system color on the current page.',
      'HELD FOR THE OWNER (Q414 A built): the `labeled` axis name and its false/true values (the word beside the chevron in simple), the two TEXT properties "previous label" and "next label" with their props previousLabel and nextLabel (one caption per property, #1567), the 4px (space.050) gap between chevron and word, the chevrons at the gap icon\'s glyph rung in the neutral icon ink, and the disabled inks at an end.',
      'HELD FOR THE OWNER: the gap icon\'s ink role, color.icon.primary: the owner asked for the page numbers\' ink (QA, 2026-10-19), and this is the plain icon role with that value in every brand and mode, rather than the numbers\' interactive.neutral.text.rest itself, since the icon is not a control.',
    ],
    unverified: [
      'The underline against color.background.secondary is measured only against color.background.primary in test.ts.',
    ],
    evolution: [
      '2026-10-16 (#2665): owner decision, every numbered call A: a new page cell (3), filled primary current page in the emphasis weight with the width held (5), rest and focus-visible only on the current page (7), small, medium and large on IconButton\'s rungs (8).',
      '2026-10-16 (Q381, after QA): the current page loses the primary fill for a border in color.border.tertiary (3:1 against the page) with its number semibold, and a `style: border | underline` axis adds the 2px underline. The ellipsis gets its own text part and property, since one TEXT property read "1" on every member.',
      '2026-10-18 (Q414 A): `type` gains previous and next, the square cell with a chevron in the neutral ink and wash, with a disabled state for an end; `labeled` adds the word for simple.',
      '2026-10-19 (owner QA, Q426 A, Q427 A, Q428 A): the underline is as wide as the number (its childless balance frame stretches to the number instead of keeping a new frame\'s default width); the gap icon is in the page numbers\' ink; the labeled previous and next lose the wash and change ink only; the chevrons and the gap icon are one icon-size rung smaller (xs, sm, md), the cells unchanged.',
      '2026-10-19 (Q427 A), WCAG 1.4.11 and the second cue: in the border style the current page\'s border is color.border.secondary, one rung lighter than border.tertiary (lowest 2.00 against color.background.primary in light and dark; 9.8 and up in high contrast). 1.4.11 asks 3:1 of the visual information needed to identify a state. Here the border is not needed: the current page\'s number is in the emphasis weight, and each page keeps the width of that weight, so the weight alone identifies it, with aria-current in code. The border is a second, decorative cue, so it may be subtle. The underline style has no other visual cue in its box, so its underline keeps border.tertiary at 3:1. The exception is this part only: test.ts holds the border to the emphasis weight and the underline to 3:1.',
      '2026-10-17 (Q394 A, Q395 A, Q404 A): the id loses the `_` prefix and the item becomes the items slot\'s preferred item, preferred-only; border.tertiary at 1px kept; the ellipsis becomes the decorative more-horizontal icon, so its text part, its TEXT property and the `mark` prop go.',
    ],
  },
};

// One item in the numbered row's slot (call 4 A). Page 5 of 10 (call 16 A): 1 … 4 [5] 6 … 10.
// The current page also follows the row's `style` (Q381 2 A); the other cells have only the border style.
const item = (type: 'page' | 'ellipsis', selection: 'unselected' | 'selected', label: string | null, note: string) => ({
  kind: 'nest' as const,
  nests: 'pagination-item',
  nesting: { kind: 'nest-fixed' as const, variant: { type, selection, style: 'border', labeled: 'false', size: 'medium', state: 'rest' }, follow: selection === 'selected' ? ['style', 'size'] : ['size'] },
  ...(label ? { overrides: { texts: { label } } } : {}),
  note,
});

// Previous and next (Q414 A): the item's own cell with a chevron, unlabeled in numbered and compact, labeled in simple.
// Its size follows the row's; its state is exposed, so a designer sets it to disabled at an end (call 9 A).
const step = (type: 'previous' | 'next', labeled: 'false' | 'true', note: string) => ({
  kind: 'nest' as const,
  nests: 'pagination-item',
  nesting: { kind: 'nest-exposed' as const, variant: { type, selection: 'unselected', style: 'border', labeled, size: 'medium', state: 'rest' }, follow: ['size'], expose: ['state'] },
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
    'Moves between the pages of a long, ordered list or set of results, and shows which page is open. numbered shows the first and last page, the current page and one page on each side of it, with an ellipsis for each gap, between a previous and a next cell; the row always holds seven slots, so it keeps its width as the user pages. compact replaces the numbers with "Page 5 of 10", for a narrow container. simple is a Previous and a Next cell at opposite ends, for an article or a short sequence where the count adds nothing. At the first and last page, the previous or next cell stays in place and does nothing. Not tabs (a few fixed views), not a carousel indicator, and not a load more button.',

  props: [
    { name: 'count', type: 'number', required: true, description: 'The total number of pages. Pagination is not shown when it is 1.' },
    { name: 'page', type: 'number', required: false, description: 'The current page, counted from 1. Controlled; pair it with onPageChange.' },
    { name: 'defaultPage', type: 'number', default: 1, required: false, description: 'The page shown first, when Pagination manages its own state.' },
    { name: 'onPageChange', type: 'function', required: false, description: 'Called with the new page number when the user opens a page.' },
    { name: 'getHref', type: 'function', required: false, description: 'Returns the address of a page. Present, every page is a link the user can bookmark, share or open in a new tab; absent, every page is a button that changes the content in place. Pass it whenever the page has an address.' },
    { name: 'renderItem', type: 'slot', required: false, description: 'Renders a page as your router\'s link, keeping its address and aria-current.' },
    { name: 'type', type: "enum: 'numbered' | 'compact' | 'simple'", values: ['numbered', 'compact', 'simple'], default: 'numbered', required: false, description: 'numbered: page numbers between previous and next. compact: "Page 5 of 10" between previous and next. simple: Previous and Next only. A numbered row switches to compact when its container is narrower than the row.' },
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
        // THE SIMPLE MEMBER'S WIDTH: built at the numbered row's medium width, so its two cells sit at opposite ends
        // the way they do under a list (held for the owner on #2665).
        center: { axis: 'type', value: 'simple', placementWidth: 428 },
        note: 'The navigation landmark: one row of controls. It hugs its row; a simple pagination is built wider so its two cells sit at opposite ends.',
      },
      row: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { type: ['numbered', 'compact'] },
        children: ['previous', 'items', 'status', 'next'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        note: 'The previous cell, the pages or the "Page 5 of 10" text, and the next cell, 4px apart.',
      },
      previous: step('previous', 'false', 'The previous cell: a Pagination.Item with a left chevron, the same square as the page cells (Q414 A). On the first page it stays in place and does nothing.'),
      items: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { type: ['numbered'] },
        // Call 4 A: a native slot of Pagination.Item, seven by default, at least one (#2646's constraints). Q394 A: the
        // item is unprefixed and is the slot's preferred item, preferred-only, the Breadcrumbs shape.
        contentSlot: true,
        slotSettings: { minChildren: 1, allowPreferredValuesOnly: true },
        preferred: ['pagination-item'],
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
      next: step('next', 'false', 'The next cell: a Pagination.Item with a right chevron (Q414 A). On the last page it stays in place and does nothing.'),
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
      previousButton: step('previous', 'true', 'Previous: a Pagination.Item, a left chevron and the word "Previous" (Q414 A).'),
      nextButton: step('next', 'true', 'Next: a Pagination.Item, the word "Next" and a right chevron (Q414 A).'),
    },
    codeOnly: [
      'The landmark — <nav aria-label="Pagination"> around a <ul>, each control in its own <li>. The label is required: without it the landmark collides with the main navigation in a screen reader\'s landmark list. label sets it.',
      'The window — with siblingCount 1 and boundaryCount 1, every page shows up to 7 pages. Above 7 the row always holds 7 slots: the first page, the last page, the current page and one page each side, with an ellipsis for each gap. An ellipsis stands for two or more pages, never one: a one-page gap shows the number. Near an end the window slides so the slot count stays 7. In general: show all pages when count <= boundaryCount * 2 + siblingCount * 2 + 3.',
      'links or buttons — with getHref every page, previous and next is an <a href> (bookmarkable, crawlable, opens in a new tab); without it each is a <button type="button"> for content swapped in place. Never <a href="#"> with a click handler. renderItem lets a page be a router link and keeps its address and aria-current.',
      'At an end — previous on the first page and next on the last page keep their place with aria-disabled="true", stay focusable and do nothing when activated (the item\'s isInactive; Figma\'s disabled state). Native disabled is not used: it drops focus to the page body when a keyboard user reaches the end.',
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
      '1.4.11 Non-text Contrast (the current page\'s underline at 3:1 against the page; its border, in the border style, is a second cue beside the emphasis weight, so it may be lighter)',
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
    focus: 'Stays in the normal Tab order. After a page changes in place, focus moves to the top of the results. At an end, the inactive previous or next cell keeps focus.',
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
    commonPartners: ['pagination-item', 'list'],
    triggerKeywords: ['pagination', 'pager', 'page numbers', 'previous and next', 'page 1 of 10', 'next page'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['pagination-item'],
    alternativeTo: ['tabs'],
    replacesPatterns: ['page links built from <a href="#"> and click handlers', 'a disabled next button that drops focus at the last page', 'infinite scroll on a page with a footer'],
    supersededBy: [],
    planned: ['table', 'carousel'],
  },

  motion: {
    enter: 'None. The page changes at once.',
    exit: 'None.',
    reduceMotion: 'Nothing moves.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2665): the simple member built at 428px; the `getStatusText` prop and its Figma name "status text", which the compact text needs to be editable; the items slot with no ceiling; no gap between the previous or next button and the compact text beyond the 4px row gap.',
    ],
    unverified: [
      'That a designer can add and reorder Pagination.Item instances in the items slot on a real Figma host, with each instance\'s own label override kept, as the accordion\'s slot keeps its content.',
    ],
    evolution: [
      '2026-10-16 (#2665): owner decision, every numbered call A: one component with three types (1), IconButton.Neutral prev and next and text Buttons in simple (2), a native items slot (4), the seven-slot window (6), inactive controls at an end (9), the container-width switch to compact (10), focus to the results after an in-place change (11), links or buttons from getHref (12), no table pager (13), no inverse surface (14), the axis name `type` (15), the names and wording (16), the carousel indicator separate (17).',
      '2026-10-16 (Q381, after QA): `style: border | underline` per instance, passed to the current page.',
      '2026-10-17 (Q394 A): the items slot names Pagination.Item as its preferred item, preferred-only.',
      '2026-10-18 (Q414 A): previous and next are Pagination.Item cells (type previous and next), labeled in simple, so Pagination requires no Neutral button family (Q386).',
    ],
  },
};
