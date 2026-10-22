/**
 * BreadcrumbItem — one step in a Breadcrumbs trail: a link to an ancestor page, the current page, or the collapsed
 * steps, held in the Breadcrumbs `items` slot and never placed on its own (#2666).
 *
 * KB brief: `components/breadcrumbs.md`
 *
 * Shape (owner decision on #2666, 2026-10-16: every numbered call at its recommendation, A):
 *   - Call 1 A — two defs: Breadcrumbs, holding a native `items` slot, and this item, nesting Link.
 *   - Call 2 A — the current page is text with aria-current="page", not a link.
 *   - Call 3 A — an ancestor nests Link `inline`, underlined at every state. Link ink against the current page's
 *     `text.primary` is under 3:1 in 12 of 20 brand × mode cells (measured for the proposal), so color alone cannot
 *     tell a link from the current page; the underline does.
 *   - Call 4 A — the default weight throughout: Link's `default` weight, and the current page in the default body
 *     style.
 *   - Call 5 A — the current page in `color.text.primary`.
 *   - Call 6 A — a `chevron-right` separator at 16px (`icon.size.xs`) in `color.icon.secondary`, mirrored in
 *     right-to-left, at the end of every item but the current one. Since Q382 A (below) it is a nested part with a
 *     slash beside the chevron.
 *
 * Owner decision Q382 A (2026-10-16, after QA): the separator is its own part, `_breadcrumb-separator`, in two looks,
 * `type: chevron | slash`, and Breadcrumbs has one `separator` setting for every step, chevron by default, both in the
 * secondary icon color. The item carries the same `separator` axis (Breadcrumbs passes it down, `follow`) and nests the
 * separator twice, the chevron look at `separator=chevron` and the slash at `separator=slash`: `follow` passes an axis
 * by its own name, and the separator's axis is `type`. The current page has no separator, so no slash member.
 *   - Call 7 A — sizes small and medium (14 / 16px body).
 *   - Call 8 A, 14 A — the overflow item nests FlushIconButton.Neutral, flush, small, showing `more-horizontal-filled`.
 *
 * NO `_` PREFIX, HELD FOR THE OWNER. Owner rule Q349 (2026-10-15) gives a part used only inside its parent the `_`
 * prefix, which makes Figma leave the set out of a published library. But a designer adds steps by inserting this
 * set into the Breadcrumbs `items` slot, which offers it as its preferred item, and a file using the library cannot
 * insert a set the library does not publish: the projection refuses a `_` id in a slot's `preferred` for that reason
 * (`slotPreferredOf` in `anatomy-figma.ts`). So the item keeps a plain id until the owner rules between the prefix
 * and the slot's preferred item (#2783).
 *
 * SIZE ORDER (owner decisions Q347 A and Q359 B on #2752, 2026-10-16): Figma's first member equals the code default
 * on every axis, and every size axis leads with `medium`. The proposal listed small first; the later rule wins, so
 * the set reads medium, small and the code default is medium.
 *
 * NO STATE AXIS. The nested Link carries rest, hover, pressed and focus-visible, and the nested flush icon button
 * its own states, each nested `nest-exposed` with `state` exposed; the current page has no interactive state. The
 * Dialog precedent: a container whose interactive parts are nested carries no state of its own.
 *
 * THE SEPARATOR BELONGS TO THE ITEM, at its end. Code draws it as CSS `::after` on every `<li>` but the last, so it
 * is never in the accessibility tree; Figma has no `::after`, so each ancestor and overflow member nests the
 * separator and the current member does not.
 */
import { ComponentDef } from '../component-schema';

export const breadcrumbItem: ComponentDef = {
  id: 'breadcrumb-item',
  name: 'BreadcrumbItem',
  aliases: ['crumb', 'breadcrumb-step'],
  category: 'navigation',
  status: 'draft',
  summary: 'One step in a breadcrumb trail: a link, the current page, or the collapsed steps.',
  description:
    'One step in a Breadcrumbs trail. An ancestor is an underlined link to a page above the current one, followed by a chevron or a slash. The current page is plain text in the primary text color, last in the trail and not a link. The overflow step stands for the steps a long trail hides: a small icon-only button that shows them in place when pressed. Items live inside Breadcrumbs and are never placed on their own.',

  props: [
    { name: 'kind', type: "enum: 'ancestor' | 'current' | 'overflow'", values: ['ancestor', 'current', 'overflow'], default: 'ancestor', required: false, description: 'ancestor: a link to a page above this one. current: the page you are on, as text. overflow: the button that stands for the hidden steps of a long trail. Breadcrumbs sets it from the item\'s place in the trail.' },
    { name: 'label', type: 'string', required: true, description: 'The page name, as the page titles itself. On an ancestor it is the link text; on the current page, the text.' },
    { name: 'href', type: 'string', required: false, description: 'The ancestor page\'s address. Ignored on the current page, which is not a link.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The body type size, 14 or 16px, with the gap to the separator sized to it. Set by the Breadcrumbs it sits in.' },
    { name: 'separator', type: "enum: 'chevron' | 'slash'", values: ['chevron', 'slash'], default: 'chevron', required: false, description: 'The mark after the step: a chevron or a slash. Set by the Breadcrumbs it sits in, the same for every step. Unused on the current page.' },
  ],

  // `[]` — the item is not interactive itself; the nested Link and flush icon button carry their own states.
  states: [],
  variants: {
    kind: ['ancestor', 'current', 'overflow'],
    // Q382 A: the mark after the step, passed down by Breadcrumbs. The current page has none (excludeCoordinates).
    separator: ['chevron', 'slash'],
    size: ['medium', 'small'],
  },
  axisKinds: { kind: 'authoring', separator: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}'],
  densitySpacing: ['size.{size}.gap'],

  tokens: {
    // The space after the label, before the separator; Breadcrumbs repeats it between items (DRAFT on #2666).
    'size.medium.gap': 'space.100',
    'size.small.gap': 'space.050',
    // The current page's text: the body style, default weight (call 4 A).
    'size.medium.type': 'type.body.md.default',
    'size.small.type': 'type.body.sm.default',

    // The current page in primary text (call 5 A). The separator's size and ink are its own (`_breadcrumb-separator`).
    'label': 'color.text.primary',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim: the targets are the nested
        // Link and flush icon button.
        role: 'target',
        children: ['crumb', 'current', 'overflow', 'separator', 'separatorSlash'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        note: 'The item: a row that hugs its link, text or button and the separator after it, with no padding and no fill.',
      },
      crumb: {
        kind: 'nest',
        nests: 'link',
        presentWhen: { kind: ['ancestor'] },
        nesting: { kind: 'nest-exposed', variant: { style: 'inline', weight: 'default', size: 'medium', surface: 'default', selection: 'unselected', state: 'rest' }, expose: ['state'], follow: ['size'] },
        note: 'An ancestor: a Link, inline and default weight, underlined at every state, at the item\'s size. Its state is set on the item.',
      },
      current: {
        kind: 'text',
        presentWhen: { kind: ['current'] },
        type: 'size.{size}.type',
        paintSlot: 'label',
        note: 'The current page: plain text in the primary text color, not a link.',
      },
      overflow: {
        kind: 'nest',
        nests: 'flush-icon-button-neutral',
        presentWhen: { kind: ['overflow'] },
        nesting: { kind: 'nest-exposed', variant: { shape: 'flush', size: 'small', surface: 'default', state: 'rest' }, expose: ['state'] },
        overrides: { swaps: { icon: 'more-horizontal-filled' } },
        note: 'The collapsed steps: a FlushIconButton.Neutral, flush and small, showing three dots. Its state is set on the item.',
      },
      separator: {
        kind: 'nest',
        nests: '_breadcrumb-separator',
        presentWhen: { kind: ['ancestor', 'overflow'], separator: ['chevron'] },
        nesting: { kind: 'nest-fixed', variant: { type: 'chevron' } },
        note: 'The separator, chevron look: a 16px chevron pointing toward the current page, in the secondary icon color. Absent after the current page.',
      },
      separatorSlash: {
        kind: 'nest',
        nests: '_breadcrumb-separator',
        presentWhen: { kind: ['ancestor', 'overflow'], separator: ['slash'] },
        nesting: { kind: 'nest-fixed', variant: { type: 'slash' } },
        note: 'The separator, slash look: a 16px slash in the secondary icon color. Absent after the current page.',
      },
    },
    codeOnly: [
      'code delivery pending: behavior layer. The entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      'The element — each item is an <li> in the trail\'s <ol>. Breadcrumbs renders it from its items: the last one as the current page, the others as ancestors.',
      'The separator in code — CSS ::after on every <li> but the last, with pointer-events: none: never text content, never a list item, never in the accessibility tree. Figma draws it as a glyph inside each ancestor and overflow item.',
      'The current page in code — a <span aria-current="page">, never an <a>, and out of the Tab order. Its label stops at a max width with an ellipsis when the trail cannot fit (DRAFT 240px); ancestor labels never truncate.',
      'The overflow button — a <button type="button"> named "Show full path" (DRAFT), its glyph aria-hidden. Pressed, the hidden steps appear in its place as ancestor links, the button is removed, and focus moves to the first revealed link. Its 44×44px hit area is extended in code.',
      'The ancestor\'s hit area — the nested link\'s code-side expansion to 24px applies: a breadcrumb is not a link inside a sentence, so the inline exemption does not.',
      'RTL — the row mirrors and the chevron separator flips to point left, toward the current page. The slash does not mirror.',
      'text expansion — ancestor labels never wrap or truncate; a long trail collapses whole steps instead.',
    ],
  },

  figmaProperties: {
    variantAxes: ['kind', 'separator', 'size'],
    // The current page has no separator, so it has no slash member.
    excludeCoordinates: [{ kind: ['current'], separator: ['slash'] }],
    // The current page's own text. An ancestor's text is the nested Link's `label`, set on the exposed Link.
    texts: { label: { part: 'current', default: 'Current page' } },
    booleans: {},
  },

  accessibility: {
    role: 'listitem, holding a link, the current page\'s text, or a button',
    wcag: [
      '1.3.1 Info and Relationships (each step is a list item)',
      '1.4.1 Use of Color (an ancestor link is underlined at every state)',
      '1.4.3 Contrast (targets 4.5:1 for the link and the current page against the page)',
      '2.4.4 Link Purpose (the link text is the ancestor page\'s name)',
      '2.4.7 Focus Visible (the nested link\'s and button\'s own focus rings)',
      '2.5.8 Target Size (targets 24px for a link and 44px for the overflow button, through code-side hit areas)',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'Tab reaches an ancestor link or the overflow button; Enter follows the link; Enter or Space presses the button. The current page takes no focus.',
    focus: 'The nested link\'s and button\'s own focus rings. The current page is not focusable.',
    aria: 'aria-current="page" on the current page\'s text. The overflow button is named "Show full path", translated, and its glyph is aria-hidden. The separator is never exposed. In right-to-left text the separator mirrors.',
  },

  content: {
    labelPattern: 'Each page\'s own title, short and in sentence case, matching the page heading. No "Back to" and no trailing punctuation.',
  },

  docs: {
    usage: 'Items make up a Breadcrumbs trail and are set inside it: ancestors first, the current page last, and an overflow item where a long trail collapses. Change an item\'s kind in the trail; never place an item on its own.',
    do: [
      'Make the last item the current page',
      'Use the page\'s own title as each label',
      'Use one overflow item in place of the hidden steps',
    ],
    dont: [
      'Place an item outside Breadcrumbs',
      'Make the current page a link',
      'Truncate an ancestor\'s label; collapse whole steps instead',
    ],
    contentGuidelines: 'Page titles, sentence case, as each page titles itself.',
  },

  ai: {
    primaryPurpose: 'One step of a Breadcrumbs trail: an ancestor link, the current page, or the overflow button for collapsed steps.',
    whenToUse: 'Only as a child of Breadcrumbs. Generate Breadcrumbs, which places each step and sets the separator and size for all of them.',
    avoidWhen: 'You need a trail of links (use Breadcrumbs, which holds the items), a link on its own (use Link) or a back link in history (use Link).',
    commonPartners: ['breadcrumbs'],
    triggerKeywords: ['breadcrumb item', 'crumb', 'breadcrumb step', 'current page crumb', 'collapsed breadcrumb'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['_breadcrumb-separator', 'link', 'flush-icon-button-neutral'],
    alternativeTo: [],
    replacesPatterns: ['a separator typed as text between links', 'the current page rendered as a link to itself'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'None. Steps revealed from the overflow appear at once in its place.',
    exit: 'None.',
    reduceMotion: 'No motion to reduce.',
  },

  notes: {
    contested: [
      'The ancestor\'s label in Figma: the item\'s own `label` text property drives the current page\'s text only. An ancestor\'s text is the nested Link\'s `label`, set on the exposed Link, so the slot\'s default ancestors read "Link text" rather than "Home" and "Category": a host cannot yet override a text two nesting levels down (#2781).',
    ],
    unverified: [],
    evolution: [
      '2026-10-16 (#2666): built from the approved wireframe, every numbered call A. Sizes medium-first by the later owner rule Q359 B, which supersedes the proposal\'s small-first order.',
      '2026-10-16 (Q382 A, after QA): the separator is its own part, `_breadcrumb-separator`, chevron or slash, chosen once on Breadcrumbs through a `separator` axis the item carries.',
    ],
  },
};
