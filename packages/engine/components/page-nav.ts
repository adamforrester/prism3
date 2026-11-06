/**
 * PageNav — a row of links between sibling pages, the current one marked (#3345).
 *
 * No KB brief: `schema/kb-briefs.json` lists no brief for a row of links between sibling pages. `components/tabs.md`
 * is a tablist (panels of one page, the pattern this component exists NOT to be), `components/side-navigation.md` a
 * site's main navigation, and `components/link.md` one anchor. Category `navigation`, Tabs' and Breadcrumbs'. The
 * research is the validation comment on #3345: a page-to-page switch is a <nav> of links with aria-current="page"
 * (WAI-ARIA APG tabs, MDN aria-current, GOV.UK service navigation, Primer UnderlineNav, Carbon, Material 3); a tablist
 * is for panels of one page.
 *
 * Owner decisions on #3345 (2026-11-03), binding:
 *   - Q1 A — page-to-page switches use a <nav> of links, the current one aria-current="page". Tabs stays for panels.
 *   - Q2 — a LINK look, not the tab look: built from link items (PageNav.Item, which nests Link), no baseline. The
 *     current page carries a 2px bar, distinct from a link's 1px underline; its width is a brand setting
 *     (`currentIndicator`): Partial, the engine default (Q10 B), half the title's width, centered, or Full, the title's width.
 *   - Q7 B — the other pages are Link's standalone look: plain at rest, underlined at hover, pressed and focus.
 *   - Q3 A (amended) — the name is Page navigation, id `page-nav`. The engine's name rule makes the code name `PageNav`
 *     (the id in PascalCase); the Figma page is titled "Page navigation".
 *   - Q4 A — the Log in and Create account pages, and the account Overview / Orders / Profile / Wishlist row, use it.
 *     The log-in drawer keeps Tabs.
 *
 * THE ITEMS SLOT (owner decision Q307 A, Breadcrumbs' pattern): a native Figma slot holding PageNav.Item instances,
 * three by default with the first current, at least two and at most six (Q8 A: the proposal's "two to about six").
 * A slot child does not follow the container's variant after it is placed: the defaults are inserted at its size.
 *
 * Values (owner decision Q8 A, as drafted): the sizes (medium and small, Breadcrumbs' pair), the gap
 * between items (24px medium, 16px small at comfortable density, density-following), and the slot's limits.
 */
import { ComponentDef } from '../component-schema';

const item = (selection: 'selected' | 'unselected', note: string) => ({
  kind: 'nest' as const,
  nests: 'page-nav-item',
  nesting: { kind: 'nest-fixed' as const, variant: { selection, size: 'medium' }, follow: ['size'] },
  note,
});

export const pageNav: ComponentDef = {
  id: 'page-nav',
  name: 'PageNav',
  aliases: ['page-navigation', 'sibling-page-links', 'local-navigation'],
  category: 'navigation',
  status: 'draft',
  summary: 'A row of links between sibling pages, with the current page marked. Size applies to the items you haven\'t edited. After editing an item, select the items and set their size.',
  description:
    'A navigation between two to six related pages, such as Log in and Create account, or the pages of an account. Each item is a link to its own address; the link to the page the user is on carries a 2px bar and is marked as the current page for assistive technology. The bar\'s width is the brand\'s Current page indicator: the title\'s width, or half of it centered. The other links are plain and show their underline at hover and keyboard focus. Tab moves from link to link, and the browser\'s back button and bookmarks work as they do for any link. Use Tabs instead when the content switches in place on one page.',

  props: [
    { name: 'items', type: 'slot', anyOf: ['page-nav-item'], minItems: 2, maxItems: 6, required: true, description: 'The pages, each a PageNav.Item with a label and an href, in order. One is current. At least two, six at most.' },
    { name: 'label', type: 'string', required: true, description: 'The accessible name of the navigation landmark, such as "Account", translated. Assistive technology adds "navigation" itself.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The body type size, 14 or 16px, passed to every item, with the gap between items sized to it.' },
    { name: 'renderLink', type: 'function', required: false, description: 'Renders each item through a router\'s link, so one anchor renders and the component depends on no router. The plain anchor by default.' },
  ],

  // `[]` — the row is not interactive itself; its links carry their own states.
  states: [],
  variants: {
    size: ['medium', 'small'],
  },
  axisKinds: { size: 'authoring' },

  densitySpacing: ['size.{size}.gap'],

  tokens: {
    // The space between items (Q8 A on #3345), moved one step by density.
    'size.medium.gap': 'space.300',
    'size.small.gap': 'space.200',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim: the targets are the nested links.
        role: 'target',
        children: ['items'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        note: 'The navigation: a row that hugs its items, with no padding, no fill and no baseline.',
      },
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        // At least two pages and at most six (Q8 A), and only a PageNav.Item.
        slotSettings: { minChildren: 2, maxChildren: 6, allowPreferredValuesOnly: true },
        preferred: ['page-nav-item'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        children: ['item1', 'item2', 'item3'],
        note: 'The pages: a native slot holding PageNav.Item instances in a row, three by default, the first the current page.',
      },
      item1: item('selected', 'The current page: plain, with the 2px bar under it.'),
      item2: item('unselected', 'A sibling page: a link, plain until hover.'),
      item3: item('unselected', 'A sibling page: a link, plain until hover.'),
    },
    codeOnly: [
      'code delivery pending: behavior layer. The entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      'The landmark — <nav aria-label="…">, named by label (such as "Account"), translated and without the word "navigation", which assistive technology adds. The name tells this landmark apart from the main and footer navigations.',
      'The list — a <ul> with each page in an <li> holding one <a href>, so "list, 3 items" is announced. The current page\'s <a href> carries aria-current="page" and keeps its href.',
      'The links\' look — each is Link\'s standalone look: the other pages are plain at rest and show the underline at :hover, :active and :focus-visible; the current page is plain with Link\'s 2px bar, and the bar\'s width is the brand\'s Current page indicator: the title\'s width, or half of it centered.',
      'Keyboard — every link is an ordinary tab stop: Tab moves link to link and Enter follows. No arrow keys, no roving tabindex, no activation modes and no panels: each item goes to its own page, which has its own URL, title and h1.',
      'Router integration — renderLink renders each item through the router\'s own link (Link\'s asChild), so one <a href> renders per page.',
      'Separate pages, separate forms — on account pages such as Log in and Create account, each page carries its own form with its own name and id, and the password field its own autocomplete: current-password on Log in, new-password on Create account.',
      'The row in code — display: flex with column-gap from the size\'s gap token and flex-wrap: wrap, so a narrow screen wraps whole items onto a second line; items never truncate.',
      'Figma item count — the native items slot holds three items by default, two at least and six at most; a designer adds, removes and reorders them, and sets which one is current. Items keep the size they were placed at when PageNav changes size.',
      'RTL — the row mirrors with the document.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    booleans: {},
  },

  accessibility: {
    role: 'navigation landmark named by its label, holding a list of links',
    wcag: [
      '1.3.1 Info and Relationships (a list of links inside a named navigation landmark)',
      '1.4.1 Use of Color (the current page carries a bar, not only a color)',
      '1.4.3 Contrast (targets 4.5:1 for the links against the page)',
      '1.4.11 Non-text Contrast (targets 3:1 for the current-page bar against the page)',
      '2.4.4 Link Purpose (each link is its page\'s name)',
      '2.4.7 Focus Visible (each link\'s own focus ring)',
      '2.4.8 Location (the current page is marked)',
      '2.5.8 Target Size (targets 24px for each link through a code-side hit area)',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'Tab moves from link to link; Enter follows a link. There are no arrow-key moves: each item is a link, not a tab.',
    focus: 'Each link shows its own focus ring.',
    aria: 'A <nav> with an aria-label, translated. aria-current="page" on the current page\'s link. No tab roles and no selected state: a screen reader announces each item as a link, and the current one as the current page.',
  },

  content: {
    labelPattern: 'Each item is its page\'s own title, short and in sentence case: "Log in", "Create account", "Orders". The landmark\'s label names the area, such as "Account".',
  },

  docs: {
    usage: 'Use page navigation to move between two to six sibling pages that share a heading area, such as Log in and Create account, or an account\'s Overview, Orders and Profile pages. Each item is a link to its own page, so the browser\'s back button and bookmarks work. Use Tabs when the content switches in place on one page, and Breadcrumbs to show where a page sits in a hierarchy.',
    do: [
      'Mark the page the user is on as the current item',
      'Use each page\'s own title as its label',
      'Name the landmark for the area, such as Account',
      'Keep the row the same on every page it links',
    ],
    dont: [
      'Use page navigation to switch panels in place; use Tabs',
      'Use page navigation as the site\'s main navigation',
      'Make more than one item current',
      'Put more than six pages in one row',
    ],
    contentGuidelines: 'Page titles in sentence case, matching each page heading.',
  },

  ai: {
    primaryPurpose: 'Move between sibling pages: a navigation of links, each to its own address, with the current page marked by a bar and aria-current="page".',
    whenToUse: 'Two to about six sibling pages of one area, such as Log in and Create account, or an account\'s Overview, Orders and Profile, where each page has its own address and the current one is marked.',
    avoidWhen: 'The content switches in place without changing the address (use Tabs), the links are the site\'s main navigation, the path is a hierarchy (use Breadcrumbs), or the pages are a required sequence (a stepper, not built yet).',
    commonPartners: ['page-nav-item', 'link', 'breadcrumbs'],
    triggerKeywords: ['page navigation', 'page nav', 'account navigation', 'log in and create account links', 'sibling page links', 'link row with current page', 'underline nav'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['page-nav-item'],
    alternativeTo: ['tabs', 'breadcrumbs'],
    replacesPatterns: ['a tab list whose tabs change the page or the address', 'links styled as tabs with a selected state', 'a row of links with the current page told apart by color alone'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'None. Following a link loads its page.',
    exit: 'None.',
    reduceMotion: 'No motion to reduce.',
  },

  notes: {
    contested: [],
    unverified: [
      'The owner\'s screens set the reference brand\'s current-page bar at about 50% of the title; Partial is round(0.5 × the title\'s width). Partial is the engine default (Q10 B), and the reference fixture sets it in a follow-up (Q6 A).',
    ],
    evolution: [
      '2026-11-03 (#3345, owner decisions Q1 A, Q2 A, Q3 A amended, Q4 A): built as a navigation of links (PageNav.Item, nesting Link) in a native items slot, with the current page\'s bar width a brand setting, Full by default.',
      '2026-11-03 (#3345, owner decisions Q7 B, Q10 B): the other pages are plain at rest and underlined at hover, and the bar is Partial by default.',
      '2026-11-03 (#3345, owner decision Q8 A): the sizes (medium and small), the item gap (24px medium, 16px small at comfortable density) and the slot limits (two to six) as drafted.',
    ],
  },
};
