/**
 * Breadcrumbs — the path to the current page as links, with the current page last and not a link (#2666).
 *
 * KB brief: `components/breadcrumbs.md`
 *
 * Shape (owner decision on #2666, 2026-10-16: every numbered call at its recommendation, A):
 *   - Call 1 A — two defs: this container, holding a native `items` slot of `breadcrumb-item`, and the item.
 *   - Call 7 A — sizes small and medium, passed to the slot's default items (`follow`).
 *   - Calls 8 A, 9 A — a long trail collapses by count: above 5 items, the first 1 and the last 2 stay and the middle
 *     goes behind one overflow item, which expands the hidden steps in place. Code only; in Figma a designer sets a
 *     middle item's kind to overflow and removes the items it stands for.
 *   - Call 10 A — only the current page's label truncates (code only).
 *   - Call 11 A — below 480px the trail becomes one link up to the parent: the `path=parent` member, a
 *     `chevron-left` glyph beside a Link reading "Parent page". In code a container query switches it.
 *   - Calls 12 A, 13 A — the root crumb is the word "Home"; the default surface only.
 *   - Call 15 A — `Breadcrumbs` / `breadcrumbs`, category navigation, aliases `breadcrumb`, `breadcrumb-trail`,
 *     `breadcrumb-list`; its own page under Components, the item on its own page under Subcomponents.
 *   - Call 16 A — the wording, all DRAFT: "Breadcrumb", "Show full path", "Parent page", "Current page".
 *
 * THE ITEMS SLOT (owner decision Q307 A, the pattern of #2649 / PR #2660, not yet merged when this was built): a native
 * Figma slot holding BreadcrumbItem instances, three by default (two ancestors and the current page), at least two,
 * preferred BreadcrumbItem only. A slot child does not follow the container's variant after it is placed: the
 * defaults are inserted at the container's size, and a designer who changes the size changes each item too. Since
 * #2660 landed, the `items` prop carries its `anyOf` / `minItems` fields: BreadcrumbItem, at least two.
 *
 * SIZE ORDER (owner decisions Q347 A and Q359 B on #2752): medium first, the code default.
 *
 * THE SEPARATOR (owner decision Q382 A, 2026-10-16, after QA): one `separator` setting, chevron or slash, chevron by
 * default, applied to every step. It is a variant axis here, passed to each default ancestor (`follow`), which shows
 * the matching look of `_breadcrumb-separator`. The current page has no separator, so it does not follow. The parent
 * path has no separator either, so it has no slash member. The overflow item and the parent path stay as built.
 */
import { ComponentDef } from '../component-schema';

// An ancestor follows the trail's separator (Q382 A); the current page has no separator member to follow to.
const item = (kind: 'ancestor' | 'current', note: string) => ({
  kind: 'nest' as const,
  nests: 'breadcrumb-item',
  nesting: { kind: 'nest-fixed' as const, variant: { kind, separator: 'chevron', size: 'medium' }, follow: kind === 'ancestor' ? ['separator', 'size'] : ['size'] },
  note,
});

export const breadcrumbs: ComponentDef = {
  id: 'breadcrumbs',
  name: 'Breadcrumbs',
  aliases: ['breadcrumb', 'breadcrumb-trail', 'breadcrumb-list'],
  category: 'navigation',
  status: 'draft',
  summary: 'The path to the current page as links, with the current page last and not a link.',
  description:
    'Shows where the current page sits in the site\'s hierarchy: a row of links to the pages above it, root first, ending in the current page as plain text. Each link is underlined and followed by a chevron or a slash, one mark for the whole trail. A long trail keeps its first step and its last two and collapses the middle behind one button that shows them in place. On a small screen the trail becomes one link up to the parent page. Breadcrumbs follow the site\'s structure, not the pages a person visited, and supplement the main navigation rather than replace it.',

  props: [
    { name: 'items', type: 'slot', anyOf: ['breadcrumb-item'], minItems: 2, required: true, description: 'The steps, root first, each with a label and an href. The last is rendered as the current page: text with aria-current="page", its href ignored. At least two.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The body type size, 14 or 16px, passed to every item. Medium suits a trail beside 16px body copy; small, a quieter line above a page title.' },
    { name: 'separator', type: "enum: 'chevron' | 'slash'", values: ['chevron', 'slash'], default: 'chevron', required: false, description: 'The mark between steps, the same for every step: a chevron pointing toward the current page, or a slash.' },
    { name: 'maxItems', type: 'number', default: 5, required: false, description: 'Above this many items, the middle collapses behind one overflow button.' },
    { name: 'itemsBeforeCollapse', type: 'number', default: 1, required: false, description: 'How many items stay before the overflow button when the trail collapses.' },
    { name: 'itemsAfterCollapse', type: 'number', default: 2, required: false, description: 'How many items stay after the overflow button: the parent and the current page by default.' },
    { name: 'collapse', type: "enum: 'expand'", values: ['expand'], default: 'expand', required: false, description: 'What the overflow button does: expand shows the hidden steps in place and moves focus to the first of them.' },
    { name: 'responsive', type: 'boolean', default: true, required: false, description: 'Below 480px, show one link up to the parent page in place of the trail. Turn it off where the full trail fits.' },
    { name: 'label', type: 'string', default: 'Breadcrumb', required: false, description: 'The accessible name of the navigation landmark, translated. Assistive technology adds "navigation" itself.' },
    { name: 'renderLink', type: 'function', required: false, description: 'Renders each ancestor through a router\'s link, so one anchor renders and the component depends on no router. The plain anchor by default.' },
  ],

  // `[]` — the trail is not interactive itself; its links and the overflow button carry their own states.
  states: [],
  variants: {
    path: ['full', 'parent'],
    // Q382 A: the mark between steps, one setting for the whole trail. The parent path has none (excludeCoordinates).
    separator: ['chevron', 'slash'],
    size: ['medium', 'small'],
  },
  // A product picks the path per breakpoint in code and the separator once; nothing switches either on screen.
  axisKinds: { path: 'authoring', separator: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}'],
  densitySpacing: ['size.{size}.gap', 'back-gap'],

  tokens: {
    // The space between items, matching the space inside each item before its separator (DRAFT on #2666).
    'size.medium.gap': 'space.100',
    'size.small.gap': 'space.050',
    // The parent path: the back chevron beside the link, at Link's own icon gap and icon size.
    'back-gap': 'space.050',
    'back-icon': 'icon.size.xs',
    // The back chevron in the link's icon role (#1471), lowest 4.26:1 on background.primary (measured for the proposal).
    'icon': 'color.icon.link.default',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim: the targets are nested.
        role: 'target',
        children: ['items', 'backGlyph', 'parentLink'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'back-gap',
        note: 'The navigation: a row that hugs the trail, or the one link up to the parent, with no padding and no fill.',
      },
      // THE ITEMS SLOT (Q307 A): BreadcrumbItem instances, two ancestors and the current page by default.
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        presentWhen: { path: ['full'] },
        // At least two items (an ancestor and the current page), and only a BreadcrumbItem (the proposal's Figma
        // properties table, approved).
        slotSettings: { minChildren: 2, allowPreferredValuesOnly: true },
        preferred: ['breadcrumb-item'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        children: ['item1', 'item2', 'item3'],
        note: 'The trail: a native slot holding BreadcrumbItem instances in a row, two ancestors and the current page by default.',
      },
      item1: item('ancestor', 'The first step, a link to the root page.'),
      item2: item('ancestor', 'A second step, a link to the parent page.'),
      item3: item('current', 'The current page, last and not a link.'),
      backGlyph: {
        kind: 'vector',
        glyph: 'chevron-left',
        size: 'back-icon',
        presentWhen: { path: ['parent'] },
        note: 'The parent path: a 16px chevron pointing up the trail, in the link icon color, before the link.',
      },
      parentLink: {
        kind: 'nest',
        nests: 'link',
        presentWhen: { path: ['parent'] },
        nesting: { kind: 'nest-exposed', variant: { style: 'inline', weight: 'default', size: 'medium', surface: 'default', state: 'rest' }, expose: ['state'], follow: ['size'] },
        overrides: { texts: { label: 'Parent page' } },
        note: 'The parent path: a Link to the parent page, inline and default weight, reading "Parent page". Its state is set on Breadcrumbs.',
      },
    },
    codeOnly: [
      'code delivery pending: behavior layer. The entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      'The landmark — <nav aria-label="Breadcrumb">: singular, without the word "navigation", which assistive technology adds, and translated. The label tells this landmark apart from the main, footer and in-page navigations.',
      'The list — an <ol> with each step in an <li>, so "list, 4 items" and each position are announced. The last item renders as the current page.',
      'Collapsing a long trail — above maxItems (5), keep itemsBeforeCollapse (1) and itemsAfterCollapse (2) and put the middle behind one overflow button. The root and the current page always stay visible. A width-measuring collapse (ResizeObserver) can follow as an enhancement.',
      'Expanding in place — pressed, the overflow button is replaced by the hidden steps as ordinary links, and focus moves to the first revealed link. No popover, no menu keyboard model and no aria-haspopup. When Menu is built, the same button can open a Menu instead (aria-haspopup="menu", aria-expanded, Escape returning focus to it): a new collapse value, with no Figma change.',
      'Long labels — ancestor labels never truncate. If the trail still does not fit once collapsed, only the current page\'s label stops at a max width (DRAFT 240px) with an ellipsis; the page\'s h1 carries the full name below it.',
      'The small-screen switch — below breakpoint.sm (480px), a container query swaps the trail for one link up to the parent, still inside the <nav>, going up a level and never back in history. responsive={false} turns it off. In Figma, the parent path is a member the designer places for a small frame.',
      'The back link in code — the chevron sits inside the anchor, aria-hidden, and takes the link\'s color at every state. Figma draws it beside the nested Link in the link\'s rest color.',
      'Router integration — renderLink renders each ancestor through the router\'s own link (Link\'s asChild), so one <a href> renders per step.',
      'Structured data — the component emits no JSON-LD BreadcrumbList; the page\'s search layer owns it. A script inside a component duplicates under server rendering and can be indexed from a hidden mobile subtree.',
      'Figma item count — the native items slot holds three items by default and at least two; a designer adds, removes and reorders them, and sets a middle item\'s kind to overflow to show a collapsed trail. Items keep the size they were placed at when Breadcrumbs changes size.',
      'RTL — the row mirrors: the root sits at the right edge, chevron separators point left (a slash does not mirror), and the back chevron points right.',
      'The separator in code — the separator prop, chevron by default, sets the CSS ::after mark on every <li> but the last; it is never text and never in the accessibility tree.',
    ],
  },

  figmaProperties: {
    variantAxes: ['path', 'separator', 'size'],
    // The parent path is one link up, with no separator, so it has no slash member.
    excludeCoordinates: [{ path: ['parent'], separator: ['slash'] }],
    booleans: {},
  },

  accessibility: {
    role: 'navigation landmark named "Breadcrumb", holding an ordered list of steps',
    wcag: [
      '1.3.1 Info and Relationships (an ordered list inside a named navigation landmark)',
      '2.4.8 Location (shows where the page sits in the site)',
      '2.4.5 Multiple Ways (one of the ways to reach a page)',
      '1.4.1 Use of Color (links are underlined at every state)',
      '1.4.3 Contrast (targets 4.5:1 for the links and the current page against the page)',
      '1.4.10 Reflow (targets one link up to the parent below 480px)',
      '2.4.4 Link Purpose',
      '2.4.7 Focus Visible',
      '2.5.8 Target Size (targets 24px for each link through a code-side hit area)',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'Tab moves through the ancestor links and the overflow button; Enter follows a link; Enter or Space presses the overflow button. The current page takes no focus.',
    focus: 'Each link and the overflow button shows its own focus ring. After the overflow button is pressed, focus moves to the first revealed link.',
    aria: 'A <nav> with aria-label="Breadcrumb", translated. aria-current="page" on the current page, never aria-current="location". The separators are CSS, never in the accessibility tree. The overflow button is named "Show full path" (DRAFT). On a small screen the back chevron is aria-hidden. In right-to-left text the row and the chevrons mirror.',
  },

  content: {
    labelPattern: 'Each step is its page\'s own title, short and in sentence case. The root is "Home". No "You are here" prefix and no separators typed as text.',
  },

  docs: {
    usage: 'Use breadcrumbs on a site three or more levels deep, to show where a page sits and to climb back up. They follow the site\'s structure, not the visitor\'s history, and supplement the main navigation. For a one or two level site, use a single link back, or nothing. To go back in history, use the browser\'s Back or a Link. To switch between peers at one level, use Tabs.',
    do: [
      'Start at the root and end at the current page',
      'Use each page\'s own title as its label',
      'Place breadcrumbs above the page heading',
      'Let a long trail collapse its middle rather than wrap',
    ],
    dont: [
      'Show the visitor\'s click history',
      'Make the current page a link',
      'Truncate an ancestor\'s label',
      'Use breadcrumbs as the only navigation',
    ],
    contentGuidelines: 'Page titles in sentence case, matching each page heading. "Home" for the root.',
  },

  ai: {
    primaryPurpose: 'Show the current page\'s place in the site hierarchy as links to its ancestors, ending in the current page.',
    whenToUse: 'A page three or more levels deep in a stable hierarchy (a catalog, documentation, settings), where people need to see where they are and climb back up.',
    avoidWhen: 'The site is one or two levels deep (use a single Link back), the path is the visitor\'s history (use the browser\'s Back or a Link), the choice is between peers at one level (use Tabs), or the steps are a required sequence (a stepper, not built yet).',
    commonPartners: ['breadcrumb-item', 'link', 'tabs'],
    triggerKeywords: ['breadcrumbs', 'breadcrumb trail', 'breadcrumb navigation', 'you are here', 'page hierarchy path', 'back to parent page'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['breadcrumb-item', 'link'],
    alternativeTo: ['link', 'tabs'],
    replacesPatterns: ['links separated by typed ">" or "/" characters', 'a history trail of visited pages', 'a breadcrumb whose last item links to the page itself'],
    supersededBy: [],
    planned: ['menu'],
  },

  motion: {
    enter: 'None. Steps revealed from the overflow button appear at once.',
    exit: 'None.',
    reduceMotion: 'No motion to reduce.',
  },

  notes: {
    contested: [],
    unverified: [
      'The contrast figures (links lowest 4.94:1 on background.primary and 4.56:1 on background.secondary; the current page 15.98:1 and 14.05:1; the back chevron 4.26:1) were measured for the proposal from the committed emission; `test.ts` holds the link and current-page pairs over every committed brand and mode.',
    ],
    evolution: [
      '2026-10-16 (#2666): built from the approved wireframe, every numbered call A, on the items-slot pattern of #2649 (PR #2660, open at the time). Sizes medium-first by the later owner rule Q359 B, which supersedes the proposal\'s small-first order.',
      '2026-10-16 (Q382 A, after QA): one `separator` setting, chevron or slash, chevron by default, for every step, through `_breadcrumb-separator`. The overflow item and the parent path are unchanged.',
    ],
  },
};
