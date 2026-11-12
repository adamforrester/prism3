/**
 * PageNav.Item — one link in a Page navigation row (#3345).
 *
 * No KB brief: `schema/kb-briefs.json` lists no brief for a row of links between sibling pages. The nearest are
 * `components/tabs.md` (a tablist: panels of one page, the pattern this component exists NOT to be),
 * `components/link.md` (one anchor) and `components/side-navigation.md` (a site's main navigation, vertical), and
 * none of them is this component. Category `navigation`, PageNav's and Link's: each item is a link to its own page.
 * The research the build leans on is the validation comment on #3345 (WAI-ARIA APG tabs, MDN aria-current, GOV.UK
 * service navigation, Primer UnderlineNav, Carbon, Material).
 *
 * Shape (owner decisions on #3345, 2026-11-03; the item axis is Q1 A, its values Q8 A):
 *   - Q2: a LINK look, not the tab look. The item nests Link, so its ink, type, underline, hover, focus ring and
 *     current-page bar are Link's by construction, and a brand's Link changes reach the row with no extra work.
 *   - Q7 B (owner decision 2026-11-03, revising the first build's inline look): a page that is not the current one is Link's
 *     STANDALONE look at `selection=unselected`: plain at rest, its 1px underline at hover, pressed and focus. The
 *     current page is the same standalone Link at `selection=selected`: plain text and the 2px bar, which hover never
 *     joins (Link's Q507.4). At rest only the bar marks the current page.
 *   - The bar's width is the brand's `currentIndicator` setting (Q2 A): Partial (the engine default, Q10 B) is
 *     round(0.5 × the title's width), centered; Full is the title's width. `applyCurrentIndicator` writes it onto Link's bar, so every
 *     current link in a brand draws the same bar (Q-scope on the PR).
 *   - One axis the designer sets, `selection`, passed to Link's own `selection` by `variantWhen`, rather than two Link
 *     axes (style and selection) set by hand. Link's `state` is exposed, as BreadcrumbItem exposes it.
 *   - Weight `default` on both values (Q8 A): a constant weight, so making a page current never moves its neighbors.
 *   - Sizes medium and small (Q8 A), Breadcrumbs' pair: the 16px and 14px body type.
 */
import { ComponentDef } from '../component-schema';

export const pageNavItem: ComponentDef = {
  id: 'page-nav-item',
  name: 'PageNav.Item',
  aliases: ['page-nav-link'],
  category: 'navigation',
  status: 'draft',
  summary: 'One link in a page navigation: another page, plain until hover, or the current page, with its bar.',
  description:
    'One link in a PageNav row. A link to another page is plain at rest and shows its underline at hover and keyboard focus. The link to the page the user is on is the current page: plain text with a 2px bar under it, and at hover only its color changes, so it never reads as one more link. The bar\'s width is the brand\'s Current page indicator: the title\'s width, or half of it centered. Both are real links with their own address. Items live inside PageNav and are never placed on their own.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The page\'s name, as the page titles itself. It is the link text.' },
    { name: 'href', type: 'string', required: true, description: 'The page\'s address. The current page keeps its href, so it stays a link.' },
    { name: 'current', type: 'boolean', default: false, required: false, description: 'Marks the page the user is on: the 2px bar in place of the underline, and aria-current="page". One item in a row is current.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The body type size, 14 or 16px. Set by the PageNav it sits in.' },
  ],

  // `[]` — the item is not interactive itself; the nested Link carries the states.
  states: [],
  variants: {
    // `unselected` first, as Link's: the inserted item is a link to another page.
    selection: ['unselected', 'selected'],
    size: ['medium', 'small'],
  },
  axisKinds: { selection: 'runtime', size: 'authoring' },

  tokens: {
    // The row holds one link and nothing beside it; the binding is the schema's one required slot, as Tabs' gap is.
    'gap': 'space.0',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim: the target is the nested Link.
        role: 'target',
        children: ['link'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        note: 'The item: a row that hugs its link, with no padding and no fill.',
      },
      link: {
        kind: 'nest',
        nests: 'link',
        // Another page: Link standalone at `selection=unselected` (plain at rest, underlined at hover, Q7 B), default
        // weight. The current page: Link standalone at `selection=selected` (plain, with the bar). Link's `state` is the
        // designer's, set on the item.
        nesting: {
          kind: 'nest-exposed',
          variant: { style: 'standalone', weight: 'default', size: 'medium', surface: 'default', selection: 'unselected', state: 'rest' },
          expose: ['state'],
          follow: ['size'],
          variantWhen: { selection: { selected: { selection: 'selected' } } },
        },
        note: 'The link at the item\'s size. Another page is plain until hover, pressed or focus shows its underline; the current page is plain, with the 2px bar under it. Its state is set on the item.',
      },
    },
    codeOnly: [
      {
        class: 'deferred',
        disposition: 'refused',
        description:
          'code delivery pending: behavior layer. The entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The element — each item is an <li> in the row\'s <ul>, holding one <a href>. PageNav renders it from its items.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The current page in code — current renders aria-current="page" on the <a>. It stays a real link with its href, in the Tab order, with hover, focus and the focus ring: a person can follow it to reload the page. The bar is Link\'s current-page bar, drawn inside the line box (a positioned pseudo-element or an inset shadow), never a border that adds height.',
      },
      {
        class: 'brand-setting',
        disposition: 'lowered',
        description:
          'The bar\'s width — 2px tall, and the bar\'s width is the brand\'s Current page indicator: the title\'s width, or half of it centered. Partial, the default, is half the title\'s width, centered (inset-inline: 25%); Full width spans the title (inset-inline: 0). 2px either way.',
      },
      {
        class: 'visual-treatment',
        disposition: 'unsupported',
        description:
          'The underline on the other pages — Link\'s standalone underline: none at rest, shown at :hover, :active and :focus-visible. The current page is told apart by its bar and aria-current, never by color alone.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL — the row mirrors with the document; a centered partial bar stays centered.',
      },
      {
        class: 'localization',
        disposition: 'unsupported',
        description:
          'text expansion — labels never truncate and never wrap inside an item; the row wraps whole items instead (see PageNav).',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'size'],
    // The link's text is the nested Link's `label`, set on the exposed Link.
    booleans: {},
  },

  accessibility: {
    role: 'listitem, holding a link',
    wcag: [
      '1.3.1 Info and Relationships (each page is a list item)',
      '1.4.1 Use of Color (the current page carries a bar, not only a color)',
      '1.4.3 Contrast (targets 4.5:1 for the link text against the page)',
      '1.4.11 Non-text Contrast (targets 3:1 for the current-page bar against the page)',
      '2.4.4 Link Purpose (the link text is the page\'s name)',
      '2.4.7 Focus Visible (the link\'s own focus ring)',
      '2.5.8 Target Size (targets 24px through the link\'s code-side hit area)',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'Tab reaches the link; Enter follows it. The current page is a link too.',
    focus: 'The nested link\'s own focus ring.',
    aria: 'aria-current="page" on the current page\'s link. The link text is translated with the page title.',
  },

  content: {
    labelPattern: 'The page\'s own title, short and in sentence case, matching the page heading: "Log in", "Orders". No trailing punctuation.',
  },

  docs: {
    usage: 'Items make up a PageNav row and are set inside it: one current page and links to its sibling pages. Change which item is current in the row; never place an item on its own.',
    do: [
      'Make the page the user is on the current item',
      'Use the page\'s own title as each label',
    ],
    dont: [
      'Place an item outside PageNav',
      'Make more than one item in a row current',
      'Remove the current page\'s link; it stays a link',
    ],
    contentGuidelines: 'Page titles, sentence case, as each page titles itself.',
  },

  ai: {
    primaryPurpose: 'Show one link in a row of sibling pages: another page, plain until hover, or the current page, marked with a bar and aria-current="page".',
    whenToUse: 'Only as a child of PageNav. Generate PageNav, which places one item per sibling page and marks the current one.',
    avoidWhen: 'Anywhere outside PageNav: a link on its own is Link, and a tab that shows a panel in place is Tab.Item inside Tabs.',
    commonPartners: ['page-nav', 'link'],
    triggerKeywords: ['page navigation item', 'page nav link', 'current page link in a row'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['link'],
    alternativeTo: [],
    replacesPatterns: ['a tab with role="tab" that changes the page'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'None. The link\'s color changes over about 150ms at hover and focus.',
    exit: 'None.',
    reduceMotion: 'The color changes at once, with no transition.',
  },

  notes: {
    contested: [],
    unverified: [
      'Contrast is Link\'s: the link roles\' own contracts. No arm here re-measures it.',
    ],
    evolution: [
      '2026-11-03 (#3345, owner decisions Q1 A, Q2 A, Q3 A, Q4 A): built as PageNav\'s item, nesting Link, with the current page\'s bar width a brand setting.',
      '2026-11-03 (#3345, owner decisions Q7 B, Q10 B): the other pages are plain at rest and underlined at hover (Link standalone, not inline), and the bar is Partial by default.',
      '2026-11-03 (#3345, owner decision Q1 A): the item axis is one `selection` switch mapped onto Link, rather than a slot that takes Link instances directly (a designer would set Link\'s style and selection by hand).',
      '2026-11-03 (#3345, owner decision Q8 A): the weight is `default` on both values, read from the owner\'s description of the account rows, not measured off a file.',
    ],
  },
};
