/**
 * Accordion.Indicator — the open/closed glyph an Accordion's header shows, as a BUILDING BLOCK: a component only ever
 * nested in an Accordion, never placed on its own (KB brief: `components/accordion.md`).
 *
 * ── THE BUILDING-BLOCK SHAPE (owner decision Q183, 2026-10-10, #2417) ──────────────────────────────────
 *
 * The four glyphs (chevron down and up, plus and minus) live in this one subcomponent, nested in the Accordion's
 * header. The Accordion's members nest it at their own `indicator`, `expansion` and `size` (`follow`), so a collapsed
 * member shows down or plus and an expanded one up or minus. Q183 first EXPOSED `indicator` on the nested instance
 * instead of giving the Accordion the axis; #2878 (Q-block A) moved the choice onto the Accordion as its own variant
 * axis, because a designer on a published library had to find the nested glyph inside each accordion to change it.
 *
 * ── THE `_` NAME ──────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The id leads with `_` because a set's Figma name is its id, and Figma leaves a component whose name starts with
 * `_` out of a published library: designers place the Accordion, never this. The owner named it `_accordion-indicator`.
 *
 * Its size follows the Accordion's (`follow`), so its glyph is the Accordion's glyph size at every rung. It has no
 * states: its ink is the Accordion header's, which does not change with focus.
 */
import { ComponentDef } from '../component-schema';

export const accordionIndicator: ComponentDef = {
  id: '_accordion-indicator',
  name: 'Accordion.Indicator',
  aliases: ['accordion-chevron', 'disclosure-indicator'],
  category: 'navigation',
  status: 'draft',
  summary: 'The open or closed glyph inside an Accordion header: a chevron or a plus and minus.',
  description:
    'The glyph an Accordion header shows to say whether its section is open: a chevron that points down when closed and up when open, or a plus that becomes a minus. It lives inside the Accordion and is never placed on its own. Choose chevron or plus-minus on the Accordion; the open or closed glyph follows the Accordion\'s state. The glyph is decorative: the header button\'s expanded state carries the meaning.',

  props: [
    { name: 'indicator', type: "enum: 'chevron' | 'plus-minus'", values: ['chevron', 'plus-minus'], default: 'chevron', required: false, description: 'Which pair of glyphs shows: a chevron (down closed, up open) or a plus and minus (plus closed, minus open).' },
    { name: 'expansion', type: "enum: 'collapsed' | 'expanded'", values: ['collapsed', 'expanded'], default: 'collapsed', required: false, description: 'Whether the section the glyph belongs to is open. Set by the Accordion it sits in.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The glyph size. Set by the Accordion it sits in.' },
  ],

  // `[]` — the glyph is not interactive; the Accordion header around it is.
  states: [],

  variants: {
    indicator: ['chevron', 'plus-minus'],
    expansion: ['collapsed', 'expanded'],
    size: ['medium', 'small', 'large'],
  },
  // The pair is chosen where the Accordion is placed; the glyph turns when the section opens and closes.
  axisKinds: { indicator: 'authoring', expansion: 'runtime', size: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // The header's own glyph ink, an icon role (#1471). Approved (Q241).
    'icon': 'color.interactive.neutral.icon.rest',
    // The glyph size per Accordion size (owner QA, 2026-10-12, superseding Q241.3): one rung below the control's, 16/20/24.
    'size.small.icon': 'icon.size.xs',
    'size.medium.icon': 'icon.size.sm',
    'size.large.icon': 'icon.size.md',
  },

  anatomy: {
    root: 'frame',
    parts: {
      frame: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim (divider's `rule` makes the same).
        role: 'target',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        size: 'size.{size}.icon',
        children: ['chevronDownGlyph', 'chevronUpGlyph', 'plusGlyph', 'minusGlyph'],
        note: 'The glyph\'s box, one icon square at the Accordion\'s size. Exactly one glyph shows in it.',
      },
      chevronDownGlyph: { kind: 'vector', glyph: 'chevron-down', size: 'size.{size}.icon', presentWhen: { indicator: ['chevron'], expansion: ['collapsed'] }, note: 'Closed: a chevron pointing down.' },
      chevronUpGlyph: { kind: 'vector', glyph: 'chevron-up', size: 'size.{size}.icon', presentWhen: { indicator: ['chevron'], expansion: ['expanded'] }, note: 'Open: a chevron pointing up.' },
      plusGlyph: { kind: 'vector', glyph: 'plus', size: 'size.{size}.icon', presentWhen: { indicator: ['plus-minus'], expansion: ['collapsed'] }, note: 'Closed, when the pair is plus and minus: a plus.' },
      minusGlyph: { kind: 'vector', glyph: 'minus', size: 'size.{size}.icon', presentWhen: { indicator: ['plus-minus'], expansion: ['expanded'] }, note: 'Open, when the pair is plus and minus: a minus.' },
    },
    codeOnly: [
      'the glyph in code — an `aria-hidden="true"` icon inside the Accordion header button. In code it is part of the Accordion, not a component of its own: the button\'s `aria-expanded` carries the state, and the glyph only shows it.',
      'the turn — a chevron may rotate 180 degrees on open instead of swapping glyphs (motion.transition.enter / exit, the reduced duration under prefers-reduced-motion). Figma swaps the down and up glyphs, since a variant holds no motion.',
      'RTL — no glyph mirrors: a down or up chevron and a plus or minus are symmetric about the vertical axis.',
    ],
  },

  figmaProperties: {
    variantAxes: ['indicator', 'expansion', 'size'],
    booleans: {},
  },

  accessibility: {
    role: 'none: the glyph is decorative and hidden from assistive technology (aria-hidden="true"); the Accordion header button carries the role and the expanded state',
    wcag: [
      '1.4.1 Use of Color — open and closed differ by glyph, never by color alone',
      '1.4.11 Non-text Contrast — the glyph clears 3:1 against the page in the header\'s icon ink',
    ],
    focus: 'None. The Accordion header around the glyph takes focus.',
    aria: 'Hide the glyph from assistive technology with aria-hidden="true". The header button\'s aria-expanded says whether the section is open.',
  },

  content: {
    labelPattern: 'The glyph carries no text.',
  },

  docs: {
    usage: 'Part of an Accordion. Choose chevron or plus-minus on the Accordion; the glyph follows the Accordion\'s open or closed state.',
    do: [
      'Choose the pair once, on the Accordion, and keep one pair across a page',
    ],
    dont: [
      'Place the indicator on its own; use an Accordion',
      'Rely on the glyph alone to say a section is open; the header button\'s expanded state carries it',
    ],
    contentGuidelines: 'The indicator holds no copy.',
  },

  ai: {
    primaryPurpose: 'Show whether an Accordion section is open, with a chevron or a plus and minus inside its header.',
    whenToUse: 'Only as a child of an Accordion. Generate an Accordion, which places the indicator in each header.',
    avoidWhen: 'Always on its own. Use an Accordion; for a plain icon, use an Icon.',
    commonPartners: ['accordion', 'icon'],
    triggerKeywords: ['accordion indicator', 'accordion chevron', 'expand collapse glyph'],
    generationPriority: 9,
  },

  composition: {
    // Nests nothing: its glyphs are its own vector parts.
    composesWith: [],
    alternativeTo: [],
    replacesPatterns: [
      'a separate down and up chevron icon toggled by hand in each accordion header',
    ],
    supersededBy: [],
    planned: [],
  },

  notes: {
    contested: [
      'THE BUILDING-BLOCK SHAPE (owner Q183): four glyphs in one subcomponent. Its `indicator` was exposed on the Accordion until #2878 (Q-block A) made it an Accordion axis the nested instance follows, doubling the Accordion to 48 members. The name `_accordion-indicator` is the owner\'s; `Accordion.Indicator` as the display name is approved (Q241).',
      'THE GLYPH SIZES (owner QA, 2026-10-12, superseding Q241.3): one rung below the control\'s, `icon.size.xs`, `sm`, `md` (16/20/24px). The first set, 20/24/32px, as Tab and Tag mapped theirs until #2725, read too large on the live build.',
    ],
  },
};
