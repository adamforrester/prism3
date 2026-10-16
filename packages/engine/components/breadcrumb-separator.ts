/**
 * Breadcrumb.Separator — the mark between two steps of a Breadcrumbs trail: a chevron or a slash (#2666).
 *
 * KB brief: `components/breadcrumbs.md`
 *
 * Owner decision Q382 A (2026-10-16, after QA on the first build): a separate part, `_breadcrumb-separator`, with two
 * looks, `type: chevron | slash`. Breadcrumbs gets one `separator` setting that applies to every step, chevron by
 * default, and both looks stay in the secondary icon color. It replaces the fixed `chevron-right` glyph each item drew
 * (call 6 A), keeping that glyph's size (16px, `icon.size.xs`, at both item sizes) and role (`color.icon.secondary`).
 *
 * A `_` BUILDING BLOCK (Q349): used only inside a BreadcrumbItem, never placed on its own and never a slot's preferred
 * item, so the prefix costs nothing here (#2783 is about slot items).
 *
 * HOW THE SETTING REACHES IT. `follow` passes an axis by its own name, and Q382 names this axis `type` and the
 * Breadcrumbs setting `separator`. So Breadcrumbs and BreadcrumbItem both carry a `separator` axis, Breadcrumbs passes
 * it to every item, and the item nests this set twice, the chevron at `separator=chevron` and the slash at
 * `separator=slash` (`presentWhen`). No engine change.
 *
 * THE SLASH GLYPH IS NOT REMIX'S. Remix has no plain slash, so `slash` is drawn for this project (`icon-set.ts`,
 * `icons/NOTICE.md`): a 2px stroke on the 24px grid, the chevron's weight. Held for the owner on #2666.
 */
import { ComponentDef } from '../component-schema';

export const breadcrumbSeparator: ComponentDef = {
  id: '_breadcrumb-separator',
  name: 'Breadcrumb.Separator',
  aliases: ['breadcrumb-divider', 'crumb-separator'],
  category: 'navigation',
  status: 'draft',
  summary: 'The mark between two breadcrumb steps: a chevron or a slash, in the secondary icon color.',
  description:
    'The mark between two steps of a Breadcrumbs trail, after every step but the current page. A chevron that points toward the current page, or a slash. Breadcrumbs chooses one for the whole trail. It is 16px at both breadcrumb sizes, in the secondary icon color, and decorative: it is never read aloud or focused.',

  props: [
    { name: 'type', type: "enum: 'chevron' | 'slash'", values: ['chevron', 'slash'], default: 'chevron', required: false, description: 'chevron: a chevron pointing toward the current page. slash: a forward slash. Set by the Breadcrumbs it sits in, for every step at once.' },
  ],

  // `[]` — the mark is decorative; it takes no pointer and no focus.
  states: [],
  variants: {
    type: ['chevron', 'slash'],
  },
  axisKinds: { type: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // The secondary icon role (Q382 A), a glyph role (#1471), as the item's chevron was (call 6 A).
    'icon': 'color.icon.secondary',
    // 16px at both breadcrumb sizes (call 6 A).
    'glyph-size': 'icon.size.xs',
  },

  anatomy: {
    root: 'frame',
    parts: {
      frame: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim (the accordion indicator makes the same).
        role: 'target',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        size: 'glyph-size',
        children: ['chevron', 'slash'],
        note: 'The mark\'s box, one 16px icon square. Exactly one glyph shows in it.',
      },
      chevron: { kind: 'vector', glyph: 'chevron-right', size: 'glyph-size', presentWhen: { type: ['chevron'] }, note: 'A chevron pointing toward the current page.' },
      slash: { kind: 'vector', glyph: 'slash', size: 'glyph-size', presentWhen: { type: ['slash'] }, note: 'A forward slash.' },
    },
    codeOnly: [
      'The separator in code — CSS ::after on every <li> but the last, with pointer-events: none: never text content, never a list item, never in the accessibility tree. In code it is part of Breadcrumbs, not a component of its own; Figma draws it as this glyph inside each ancestor and overflow item.',
      'The look in code — Breadcrumbs\' `separator` prop, chevron or slash, applied to every step.',
      'RTL — the chevron flips to point left, toward the current page. The slash does not mirror.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type'],
    booleans: {},
  },

  accessibility: {
    role: 'none: decorative, drawn by CSS and never in the accessibility tree',
    wcag: [
      '1.3.1 Info and Relationships (the trail\'s order is the list\'s, not the separator\'s)',
    ],
    focus: 'None. The mark takes no focus.',
    aria: 'None. The mark is CSS generated content, never announced.',
  },

  content: {
    labelPattern: 'The mark carries no text.',
  },

  docs: {
    usage: 'Part of a BreadcrumbItem. Choose chevron or slash once, on Breadcrumbs; every step shows the same mark.',
    do: [
      'Choose the look once, on Breadcrumbs',
    ],
    dont: [
      'Place a separator on its own, or type one as text between links',
      'Mix chevrons and slashes in one trail',
    ],
    contentGuidelines: 'The separator holds no copy.',
  },

  ai: {
    primaryPurpose: 'The mark between two steps of a Breadcrumbs trail, a chevron or a slash.',
    whenToUse: 'Only as a child of BreadcrumbItem. Generate Breadcrumbs instead.',
    avoidWhen: 'Always on its own. Use Breadcrumbs; for a plain icon, use an Icon.',
    commonPartners: ['breadcrumb-item', 'breadcrumbs'],
    triggerKeywords: ['breadcrumb separator', 'breadcrumb slash', 'breadcrumb chevron'],
    generationPriority: 9,
  },

  composition: {
    // Nests nothing: its glyphs are its own vector parts.
    composesWith: [],
    alternativeTo: [],
    replacesPatterns: ['a "/" or ">" typed as text between breadcrumb links'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'None.',
    exit: 'None.',
    reduceMotion: 'No motion to reduce.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2666, Q382): the slash glyph is drawn for this project, not taken from Remix, which has no plain slash. The name Breadcrumb.Separator (Family.Part read from the id, as the skill names a `_` part) and the aliases are judgment calls.',
    ],
    unverified: [
      'The separator\'s contrast (lowest 3.51:1 on background.primary, 3.16:1 on background.secondary, measured for the proposal) is decorative and held to no floor.',
    ],
    evolution: [
      '2026-10-16 (Q382 A): split out of BreadcrumbItem as its own part, with a slash beside the chevron.',
    ],
  },
};
