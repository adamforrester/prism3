/**
 * Accordion.Indicator — the open/closed glyph an Accordion nests in its header (#2417, owner Q183).
 *
 * KB brief: `components/accordion.md`. Category `navigation`, the brief's, shared with the Accordion it
 * belongs to: this is one of that component's parts, built as its own set so the designer's glyph choice has
 * a component to live on.
 *
 * ── WHY A SUBCOMPONENT AND NOT AN AXIS ON THE ACCORDION (owner Q183, the building-block shape) ───────────
 *
 * Q182 drafted `indicator: [chevron, plus-minus]` as an accordion axis (96 members). Q183 replaced it: the
 * glyph style is chosen ONCE, on this nested set, and the Accordion EXPOSES it (`nest-exposed`, `expose:
 * ['style']`) while FOLLOWING its own `expansion` and `size` into the nested coordinate. So the accordion's
 * collapsed members nest `expansion=collapsed` (down or plus) and its expanded members nest
 * `expansion=expanded` (up or minus), and the designer's `style` is an override on the nested instance,
 * not a coordinate of the accordion. The Accordion projects 24 members instead of 48.
 *
 * THE PREMISE TO VERIFY LIVE: Figma keeps an exposed nested instance's variant override when the host
 * instance switches variant, provided the nested layer has the same name and the same component set in
 * both host members. `test-write-components.ts` holds that precondition on the shim (same layer name, same
 * set, `style` overridable, `expansion` following); the host's preservation itself is Figma's behavior and
 * is checked in a live file, not here.
 *
 * ── THE FOUR GLYPHS ─────────────────────────────────────────────────────────────────────────────────────
 *
 * `chevron-down`, `chevron-up`, `plus` and `minus` are all in the icon set, so each projects as an instance
 * of its icon component (#2380). They are four gated parts rather than one templated glyph because the glyph
 * depends on TWO axes (style × expansion). Each pair is symmetric about the vertical axis, so none mirrors in
 * RTL.
 *
 * ── THE `style` AXIS NAME ───────────────────────────────────────────────────────────────────────────────
 *
 * `style` is in the closed vocabulary and is a treatment choice over the same meaning (open or closed), which
 * is what chevron versus plus-minus is. `indicator`, the proposal's name, is spent on the Accordion's own
 * position axis (see `accordion.ts`), where it names the part that moves.
 */
import { ComponentDef } from '../component-schema';

export const accordionIndicator: ComponentDef = {
  id: '_accordion-indicator',
  name: 'Accordion.Indicator',
  aliases: [],
  category: 'navigation',
  status: 'draft',
  summary: 'The open and closed glyph inside an Accordion header. Pick chevron or plus and minus.',
  description:
    'The glyph that shows whether an Accordion section is open: a chevron that points down when closed and up when open, or a plus that becomes a minus. The style is picked once on the nested indicator, and the Accordion sets the rest, so switching a section open or closed keeps the style. It is a building block of the Accordion, not a component to place on its own.',

  props: [
    { name: 'style', type: "enum: 'chevron' | 'plus-minus'", values: ['chevron', 'plus-minus'], default: 'chevron', required: false, description: 'The glyph pair: a chevron that points down when closed and up when open, or a plus when closed and a minus when open.' },
    { name: 'expansion', type: "enum: 'collapsed' | 'expanded'", values: ['collapsed', 'expanded'], default: 'collapsed', required: false, description: 'Whether the section is open. Set by the Accordion it sits in.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The glyph size. Set by the Accordion it sits in.' },
  ],

  states: [],
  variants: {
    style: ['chevron', 'plus-minus'],
    expansion: ['collapsed', 'expanded'],
    size: ['small', 'medium', 'large'],
  },
  axisKinds: { style: 'authoring', expansion: 'runtime', size: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // An ICON role (#1471): the glyph is a glyph, so it never binds the header's text ink, even where the two
    // resolve to one value. No state key: the accordion has no hover, pressed or disabled member (Q182/Q183).
    'icon': 'color.interactive.neutral.icon.rest',
    // The glyph square per size: 20px at small, 24px at medium and large. The proposal's table had 20px at
    // medium; the default size resolves the `md` rung (#756, `lint-rung-names`), and 24px fills the medium
    // header's 24px line box.
    'size.small.icon': 'icon.size.sm',
    'size.medium.icon': 'icon.size.md',
    'size.large.icon': 'icon.size.md',
  },

  anatomy: {
    root: 'glyph',
    parts: {
      glyph: {
        kind: 'box',
        // The schema's one `target` per def, on the root as `icon` and `spinner` mark theirs. Not a hit area of
        // its own: the Accordion's header is the target, and `lint-hit-target` excludes this set.
        role: 'target',
        size: 'size.{size}.icon',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['chevronDown', 'chevronUp', 'plus', 'minus'],
        note: 'The glyph square. It holds one of four glyphs, picked by the style and by whether the section is open.',
      },
      chevronDown: { kind: 'vector', glyph: 'chevron-down', size: 'size.{size}.icon', presentWhen: { style: ['chevron'], expansion: ['collapsed'] }, note: 'Closed, chevron style: a chevron pointing down.' },
      chevronUp: { kind: 'vector', glyph: 'chevron-up', size: 'size.{size}.icon', presentWhen: { style: ['chevron'], expansion: ['expanded'] }, note: 'Open, chevron style: a chevron pointing up.' },
      plus: { kind: 'vector', glyph: 'plus', size: 'size.{size}.icon', presentWhen: { style: ['plus-minus'], expansion: ['collapsed'] }, note: 'Closed, plus and minus style: a plus.' },
      minus: { kind: 'vector', glyph: 'minus', size: 'size.{size}.icon', presentWhen: { style: ['plus-minus'], expansion: ['expanded'] }, note: 'Open, plus and minus style: a minus.' },
    },
    codeOnly: [
      'the glyph turn — in code the chevron may rotate between down and up over motion.transition.enter / exit, and under reduced motion it takes the motion.duration-reduced.* twin. Figma members are static: one glyph per member.',
      'aria-hidden — the glyph is decorative in code; the header button\'s aria-expanded carries the state. Figma has no accessibility tree.',
    ],
  },

  figmaProperties: {
    variantAxes: ['style', 'expansion', 'size'],
    booleans: {},
  },

  accessibility: {
    role: 'none — presentational. The Accordion header\'s button carries the open state; the glyph repeats it visually.',
    wcag: [
      '1.4.1 Use of Color (open and closed differ by glyph shape, never by color)',
      '1.4.11 Non-text Contrast (the glyph ink clears 3:1 against the page)',
    ],
    aria: 'Hide the glyph from assistive technology (aria-hidden="true"). The button\'s aria-expanded is the state a screen reader announces.',
  },

  docs: {
    usage: 'Leave it inside the Accordion. Pick chevron or plus and minus on the nested indicator of an Accordion instance; the Accordion sets whether it shows the open or the closed glyph, and its size.',
    do: [
      'Pick the style once per set of stacked accordions, so every section in the set matches',
    ],
    dont: [
      'Place it on its own as an icon. Use the Icon component for a standalone glyph.',
    ],
  },

  ai: {
    primaryPurpose: 'Show whether an Accordion section is open, as a chevron or a plus and minus glyph.',
    whenToUse: 'Only inside an Accordion header, which nests it and sets its open state and size.',
    avoidWhen: 'Anywhere outside an Accordion: a standalone glyph is an Icon, and a control that opens a menu is a Select or a button.',
    commonPartners: ['accordion', 'icon'],
    triggerKeywords: ['accordion indicator', 'accordion chevron', 'plus minus toggle glyph'],
    generationPriority: 1,
  },

  composition: {
    composesWith: [],
    alternativeTo: [],
    planned: [],
    replacesPatterns: ['a chevron rotated by hand per section'],
  },

  motion: {
    enter: 'Opening the section swaps the closed glyph for the open one (motion.transition.enter); a chevron may turn rather than swap.',
    exit: 'Closing the section swaps it back (motion.transition.exit).',
    reduceMotion: 'Under prefers-reduced-motion the turn takes the reduced duration (motion.duration-reduced.*), so the glyph changes without visible travel.',
  },

  notes: {
    contested: [
      'Whether Figma keeps the nested style override when an Accordion instance switches expansion. The shim holds the precondition (same layer, same set, `style` exposed and `expansion` followed); the behavior itself is verified in a live file (owner Q183).',
    ],
    unverified: [],
    evolution: [
      'The indicator style was an Accordion variant axis in the proposal (Q182, 96 members). Owner Q183 made it this nested building block, exposed on the Accordion, so the Accordion projects 24 members.',
    ],
  },
};
