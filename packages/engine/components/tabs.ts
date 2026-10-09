/**
 * Tabs — the tab list (#2416, DRAFT for the owner's design proposal, not for merge).
 *
 * KB brief: `components/tabs.md`
 *
 * A row of nested `tab` instances above a 1px baseline. Tab 1 is selected; tabs 4 to 6 sit behind Figma-only
 * booleans (the radio-group precedent for a variable child count, #2344), so the set is `size` only: 3
 * members. The panel is not drawn: it is the page content below, and its role and wiring are code-only.
 * Every design call here is held on #2416.
 */
import { ComponentDef } from '../component-schema';

const tabNest = (selection: 'selected' | 'unselected') => ({
  kind: 'nest' as const,
  nests: 'tab',
  nesting: { kind: 'nest-fixed' as const, variant: { selection, size: 'medium', state: 'rest' }, follow: ['size'] },
});

export const tabs: ComponentDef = {
  id: 'tabs',
  name: 'Tabs',
  aliases: ['tab-list', 'tab-group', 'tab-bar', 'tab-panel'],
  category: 'navigation',
  status: 'draft',
  summary: 'A row of tabs that switches between panels of related content in place.',
  description:
    'A row of tabs above a baseline. Each tab names one panel of related content; selecting a tab shows its panel in place and hides the rest, without changing the page or the address. One tab is always selected. Arrow keys move between tabs, and Tab moves on into the panel.',

  props: [
    { name: 'value', type: 'string', required: false, description: 'The key of the selected tab. Controlled; pair it with onChange.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'The key of the tab selected first, when the list manages its own state.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called with the new key when the selected tab changes.' },
    { name: 'activation', type: "enum: 'automatic' | 'manual'", values: ['automatic', 'manual'], default: 'automatic', required: false, description: 'automatic: moving focus with the arrow keys selects the tab. manual: arrows move focus only, and Enter or Space selects. Use manual when showing a panel is slow.' },
    { name: 'label', type: 'string', required: false, description: 'The accessible name of the tab list, when nothing on the page already names it.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Passed to every tab.' },
  ],

  states: ['rest'],
  variants: { size: ['small', 'medium', 'large'] },
  axisKinds: { size: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    'gap': 'space.0',
    'fill': 'color.border.primary',
    'baseline-height': 'border-width.hairline',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        children: ['list', 'baseline'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        note: 'The tab list: the row of tabs above the baseline.',
      },
      list: {
        kind: 'box',
        role: 'presentation',
        children: ['tab1', 'tab2', 'tab3', 'tab4', 'tab5', 'tab6'],
        layout: { direction: 'row', align: 'end', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        note: 'The tabs, side by side with no gap; each tab carries its own padding.',
      },
      tab1: { ...tabNest('selected'), note: 'The first tab, selected.' },
      tab2: { ...tabNest('unselected'), note: 'A second tab.' },
      tab3: { ...tabNest('unselected'), note: 'A third tab.' },
      tab4: { ...tabNest('unselected'), optional: true, note: 'A fourth tab, off by default.' },
      tab5: { ...tabNest('unselected'), optional: true, note: 'A fifth tab, off by default.' },
      tab6: { ...tabNest('unselected'), optional: true, note: 'A sixth tab, off by default.' },
      baseline: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        height: 'baseline-height',
        crossAxisFill: true,
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        note: 'The 1px line under the tabs, which the selected underline sits on.',
      },
    },
    codeOnly: [
      'The tab list in code — role="tablist" with an accessible name, and aria-orientation when vertical. One tab stop: the selected tab is tabindex="0", the rest -1. Arrow keys move between tabs (Left and Right, or Up and Down when vertical), Home and End go to the first and last, and disabled tabs are skipped.',
      'The panel — role="tabpanel", aria-labelledby naming its tab and tabindex="0", so Tab after the list lands on the panel. Not drawn in Figma: the panel is the content below the list.',
      'Panel mounting — the default mounts a panel when it is first shown; keep it mounted when it holds state (a half-filled form), or mount all panels when find-in-page or print must reach them.',
      'The selected underline in code — one element owned by the list that moves to the selected tab, sitting on the baseline (it overlaps the 1px line).',
      'Overflow — a horizontal list never wraps. When the tabs do not fit, it scrolls with a fade at the cut edge, or ends in a "More" menu.',
      'RTL — the row mirrors, the first tab sits rightmost, and Left and Right follow reading order: in RTL, Left moves to the next tab.',
      'A disabled selected tab — if the selected tab becomes disabled, move tabindex="0" to the nearest enabled tab.',
      'Deep links — a tab can be bound to a hash or query parameter through the History API, with no route change.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    booleans: {
      tab4: { part: 'tab4', default: false, figmaName: 'Tab 4', figmaOnly: true },
      tab5: { part: 'tab5', default: false, figmaName: 'Tab 5', figmaOnly: true },
      tab6: { part: 'tab6', default: false, figmaName: 'Tab 6', figmaOnly: true },
    },
  },

  accessibility: {
    role: 'tablist containing tabs, each tab controlling one tabpanel',
    wcag: [
      '4.1.2 Name, Role, Value',
      '2.1.1 Keyboard (arrow keys, Home and End)',
      '2.4.3 Focus Order (one tab stop for the list, then the panel)',
      '1.4.11 Non-text Contrast (targets 3:1 for the selected underline)',
      '1.4.1 Use of Color',
      '2.4.13 Focus Appearance',
    ],
    keyboard: 'Tab moves into the list, landing on the selected tab, and the next Tab moves into the panel. Left and Right move between tabs (Up and Down when vertical), wrapping at the ends; Home and End go to the first and last. With automatic activation, moving focus selects; with manual activation, Enter or Space selects.',
    focus: 'Focus stays on the tab after it is selected, so arrowing continues. The panel takes focus as a whole (tabindex="0").',
    aria: 'role="tablist" with an aria-label or aria-labelledby; aria-selected on every tab; aria-controls from each tab to its panel and aria-labelledby back. Never use tabs to change the page: a route change is a navigation of links with aria-current.',
  },

  content: {
    labelPattern: 'Short, parallel nouns, one or two words each. Past six or seven tabs, rethink the grouping.',
  },

  docs: {
    usage: 'Use tabs to switch between peer sections of related content in one place, one at a time, such as a product\'s description, specifications and reviews. Don\'t use tabs to go to another page (use links in a navigation), to change a setting or filter the current view (use a segmented control, not built yet, or a select), or for content people need to compare side by side.',
    do: [
      'Keep labels short, parallel nouns',
      'Keep one tab selected at all times',
      'Use manual activation when a panel takes time to load',
      'Give the list a name when nothing on the page already gives it one',
    ],
    dont: [
      'Use tabs to change the page or the address',
      'Use tabs to filter or re-sort the current view',
      'Nest tabs more than two levels deep',
      'Wrap tabs onto a second line; let the list scroll',
    ],
    contentGuidelines: 'One or two words per tab, nouns, sentence case.',
  },

  ai: {
    primaryPurpose: 'Switch between peer panels of related content in place, one at a time.',
    whenToUse: 'Two to about six peer sections of one subject, viewed one at a time, where switching is quick and the address need not change.',
    avoidWhen: 'The selection changes the page or the address (a navigation of links), filters or re-sorts the current view (a segmented control, not built yet, or Select), is a required sequence (a stepper, not built yet), or has many independent sections (an accordion, not built yet).',
    commonPartners: ['tab', 'badge', 'icon'],
    triggerKeywords: ['tabs', 'tab list', 'tab bar', 'tabbed panels', 'tabbed content', 'switch panels'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['tab'],
    alternativeTo: ['select'],
    replacesPatterns: ['show and hide divs with no tab semantics', 'role="tab" on links that change the route'],
    supersededBy: [],
    planned: ['segmented-control', 'accordion', 'link'],
  },

  motion: {
    enter: 'None. On a change, the underline slides to the new tab and the panel cross-fades, about 150–200ms.',
    exit: 'The outgoing panel fades out under the incoming one. Panels never slide sideways.',
    reduceMotion: 'The underline snaps and the panel swaps with no transition.',
  },

  notes: {
    contested: [
      'DRAFT for #2416. Every design call is held on the issue.',
    ],
    unverified: [],
    evolution: [],
  },
};
