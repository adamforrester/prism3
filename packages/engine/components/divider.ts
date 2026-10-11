/**
 * Divider — a 1px rule that separates content (#2455). Pulled forward by the owner so Accordion (#2417) can
 * nest it as its item rule from day one; Tabs' baseline, lists and cards can nest it later.
 *
 * KB brief: `components/divider.md` — category `foundations`, as the brief files it. The brief's one
 * load-bearing call is the semantics bit, and this def follows it (owner Q190.1 A): DECORATIVE BY DEFAULT.
 * The `decorative` prop defaults to true (`aria-hidden="true"` / `role="none"`); `decorative=false` makes the
 * rule a separator (`<hr>` where native, `role="separator"` otherwise).
 *
 * ── `decorative`: A CODE PROP, NOT A FIGMA PROPERTY ──────────────────────────────────────────────
 *
 * A decorative rule and a semantic one are the same pixels, so a Figma property for it would toggle nothing
 * the canvas can show: a boolean drives one node's `visible`, and neither value hides the rule. The bit lives
 * in code only, stated in `anatomy.codeOnly`, the way the brief puts it ("tokens, not props" for thickness and
 * color; the semantics bit is the one real prop).
 *
 * ── `inset`: A FIGMA VARIANT AXIS (owner Q190.2 A) ───────────────────────────────────────────────
 *
 * The brief lists `inset` (`none | inset | middle-inset`, after Material 3) among the VARIANTS, and it moves
 * pixels, so it projects. `none` runs the rule edge to edge; `inset` indents it from the start (the inline
 * start, `margin-inline-start` in code, so it mirrors in RTL per the brief's §9); `middle-inset` indents both
 * ends. It reuses the axis NAME button's flush control already put in `VARIANT_AXES`, with a disjoint value
 * set declared in `lint-axis-values.ts`: both say how far a box sits in from its container's edge.
 *
 * The indent is `space.200` (16px), the closest existing step to Material's 16dp inset; the brief names no
 * token. A vertical middle inset is `space.100` (8px), because a vertical rule is usually as tall as one
 * control. Both are owner items.
 *
 * A VERTICAL RULE TAKES `none` AND `middle-inset` ONLY (`excludeCoordinates`, an owner item). The start-only
 * inset is an inline-axis idea (a list's rule starting where its text does, after a leading avatar), and a
 * vertical rule's start would be its TOP, which `PaddingDef` cannot pad alone (`block` pads both ends). So the
 * Figma set is five members, not six, and code refuses the same coordinate.
 *
 * ── THE SHAPE: A PADDED BOX AND THE RULE THAT FILLS IT ───────────────────────────────────────────
 *
 * The root `divider` is a row box that paints nothing: both dimensions bound per orientation (thickness and a
 * nominal length), and its padding is the inset. Its one child, `rule`, paints the `fill` and fills the root's
 * content box on both axes (`grow` along the row, `crossAxisFill` across it), so the rule is the root less its
 * inset. With no inset the two coincide and the pixels are exactly the 1px box this def first shipped.
 *
 * A filled box rather than a stroke: a stroke draws inside a box's bounds on all four sides, so a 1px
 * horizontal rule drawn as a stroke would need a 0-height box and a bottom-only stroke, which `PartDef` cannot
 * say (Figma's per-side stroke weights are not bindable here). A 1px box with a fill is the same pixels, in
 * code as in Figma: `block-size: var(--border-width-hairline); background: var(--color-border-secondary)`.
 *
 * FILLING THE PARENT is a placement fact, and the root sets no `fill` sizing for it. A root has no parent in
 * its own def; `sizing.x: 'fill'` with a `placementWidth` is the idiom for a root that fills across, but it is
 * one mode for every member, and a vertical rule fills the other axis. So the standalone member binds a
 * NOMINAL length (veil's and focus-ring's idiom): `container.narrow` across for horizontal, `size.md.height`
 * tall for vertical, the height of the medium controls a vertical rule usually sits between. A host that nests
 * the divider stretches it: Accordion's item, a column, nests it with `crossAxisFill`, which projects the
 * instance as STRETCH across and FIXED on that axis (`nestSizingOf` reads the root's `layout`, which is why the
 * root declares one). The inset is the root's padding, so it survives the stretch. In code the rule fills its
 * container (`inline-size: 100%` / `align-self: stretch`).
 *
 * ── `orientation`: A NEW NAME IN THE CLOSED `VARIANT_AXES` LIST ──────────────────────────────────
 *
 * The owner's issue names the axis `orientation`, which is also the ARIA attribute it drives
 * (`aria-orientation`). Reopening the list for it is the mechanical fallout of that name, argued in
 * `VARIANT_AXES`'s own header and carried as a `sole` set in `lint-axis-values.ts`.
 *
 * The visible defaults are approved (owner Q190.3 A): horizontal and vertical, `border-width.hairline`,
 * `color.border.secondary`, fills its parent, no states, its own `↳ Divider` page after Tabs. Held back as
 * options the issue named but no consumer has asked for yet: a `thick` thickness and a `color.border.primary`
 * variant. The brief's labelled divider (`label` / `labelPosition`) is deferred to its own issue.
 */
import { ComponentDef } from '../component-schema';

export const divider: ComponentDef = {
  id: 'divider',
  name: 'Divider',
  aliases: ['separator', 'rule', 'hr'],
  // `foundations` (#1700) — the brief's own category.
  category: 'foundations',
  status: 'draft',
  summary: 'A thin rule between groups of content. Horizontal or vertical, and it fills its container.',
  description:
    'A 1px rule that separates groups of content when spacing alone leaves the grouping unclear: sections of a page, rows of an accordion, or a cluster of controls in a toolbar. Horizontal by default, spanning the width of its container; vertical between items in a row, spanning its height. It can run edge to edge or sit inset from the start or from both ends. It carries no content and has no interaction states. Decorative by default, so assistive technology ignores it; set decorative to false when the rule marks a real break in the content, and it becomes a separator.',

  props: [
    { name: 'orientation', type: "enum: 'horizontal' | 'vertical'", values: ['horizontal', 'vertical'], default: 'horizontal', required: false, description: 'Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute.' },
    { name: 'inset', type: "enum: 'none' | 'inset' | 'middle-inset'", values: ['none', 'inset', 'middle-inset'], default: 'none', required: false, description: 'How far the rule sits in from its container\'s edges. none runs edge to edge; inset starts the rule 16px in from the start edge, so it lines up with indented content such as list text after an avatar; middle-inset indents both ends. The start edge follows text direction. A vertical rule takes none or middle-inset only.' },
    { name: 'decorative', type: 'boolean', default: true, required: false, description: 'Whether the rule is only visual. true (the default) hides it from assistive technology with aria-hidden="true". Set false when the rule marks a real break in the content: it becomes a separator, an <hr> for a horizontal rule.' },
  ],

  // `[]` — a divider is not interactive. It has no hover, press or focus, the same claim veil and focus-ring make.
  states: [],

  variants: {
    orientation: ['horizontal', 'vertical'],
    inset: ['none', 'inset', 'middle-inset'],
  },
  // A rule runs one way and sits at one inset where it is placed, and neither changes on screen.
  axisKinds: { orientation: 'authoring', inset: 'authoring' },

  // One ink for every member: the rule's `fill`.
  paintKeys: ['{slot}'],

  tokens: {
    // THE COLOR (DRAFT, owner item). `color.border.secondary` is the role the token tier describes as a divider.
    'fill': 'color.border.secondary',
    // THE THICKNESS (DRAFT, owner item) — the box's cross dimension, per orientation.
    'horizontal.height': 'border-width.hairline',
    'vertical.width': 'border-width.hairline',
    // THE NOMINAL LENGTH — not a design decision about divider length (there is none: in use it fills its
    // container). It exists only so the standalone member is a rule-shaped artifact rather than a 1×1 frame.
    // `container.narrow` (720px) is veil's idiom; `size.md.height` is focus-ring's, the medium control height.
    'horizontal.width': 'container.narrow',
    'vertical.height': 'size.md.height',
    // THE INSET (owner Q190.2 A; the steps are owner items) — the root's padding, per orientation and inset.
    // `space.200` (16px) is the closest existing step to Material's 16dp inset; a vertical middle inset is
    // `space.100` (8px), because a vertical rule is usually one control tall. A horizontal rule pads only its
    // inline sides, a vertical one only its block sides (both ends: `block` cannot pad one).
    'horizontal.none.pad-block': 'space.0',
    'horizontal.none.pad-start': 'space.0',
    'horizontal.none.pad-end': 'space.0',
    'horizontal.inset.pad-block': 'space.0',
    'horizontal.inset.pad-start': 'space.200',
    'horizontal.inset.pad-end': 'space.0',
    'horizontal.middle-inset.pad-block': 'space.0',
    'horizontal.middle-inset.pad-start': 'space.200',
    'horizontal.middle-inset.pad-end': 'space.200',
    'vertical.none.pad-block': 'space.0',
    'vertical.none.pad-start': 'space.0',
    'vertical.none.pad-end': 'space.0',
    // `vertical.inset` is EXCLUDED from the Figma set and not offered in code; its keys exist only because every
    // binding key must resolve at every coordinate, and they are zero so nothing reads them as an inset.
    'vertical.inset.pad-block': 'space.0',
    'vertical.inset.pad-start': 'space.0',
    'vertical.inset.pad-end': 'space.0',
    'vertical.middle-inset.pad-block': 'space.100',
    'vertical.middle-inset.pad-start': 'space.0',
    'vertical.middle-inset.pad-end': 'space.0',
  },

  anatomy: {
    root: 'divider',
    parts: {
      divider: {
        kind: 'box',
        role: 'presentation',
        children: ['rule'],
        // A layout so a host can stretch the nested instance (`nestSizingOf` reads it); both axes FIXED,
        // because both are bound. A ROW, so the rule grows along it and stretches across it.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        width: '{orientation}.width',
        height: '{orientation}.height',
        // The inset. `inlineEnd` because the two inline sides differ at `inset` (the start only).
        padding: { block: '{orientation}.{inset}.pad-block', inlineLabel: '{orientation}.{inset}.pad-start', inlineEnd: '{orientation}.{inset}.pad-end' },
        note: 'The divider\'s footprint: the thickness one way and the length the other, with the inset as its padding. It paints nothing.',
      },
      rule: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim, the same
        // schema-satisfying use veil's and focus-ring's single box make.
        role: 'target',
        paintSlots: ['fill'],
        // Fills the root's content box on both axes, so the rule is the footprint less the inset.
        grow: true,
        crossAxisFill: true,
        note: 'The rule itself: one box, one fill, no children. Its thickness is the hairline border width; its length fills the container it sits in, less the inset, so the standalone length is a placeholder a host stretches.',
      },
    },
    codeOnly: [
      // MUST NOT lead with `orientation` or `inset` (axes this def projects) — see the `admits()` trap.
      'decorative — a code prop with no Figma property. A decorative rule and a separator are the same pixels, so a Figma toggle would change nothing on the canvas. true (the default) renders `aria-hidden="true"` (a `<div>`, or an `<hr>` with `role="none"` as well); false renders an `<hr>` for a horizontal rule, or `<div role="separator" aria-orientation="vertical">` for a vertical one.',
      'filling the container — a divider spans its container: a horizontal rule `inline-size: 100%` (or the stretch a flex or grid column gives it), a vertical rule `align-self: stretch` in a row. Figma cannot hold that for a standalone component, which has no parent, so the standalone member binds a nominal length (`container.narrow` across, `size.md.height` tall) and a host that nests it stretches the instance with `crossAxisFill`.',
      'the element — for a separator (decorative=false), use `<hr>` for a horizontal rule: it is a separator to assistive technology with no extra attributes. Reset its border and margin (`border: 0; margin: 0`) and paint it as a box: `block-size: var(--border-width-hairline); background: var(--color-border-secondary)`. A vertical rule is a `<div role="separator" aria-orientation="vertical">` with `inline-size` set to the hairline instead, because `<hr>` is horizontal by default. Never give a divider focus: a separator that is not a splitter takes no place in the tab order.',
      'the inset in code — a margin on logical edges, so it mirrors in right-to-left text: `margin-inline-start: var(--space-200)` at inset, both `margin-inline` sides at middle-inset, and `margin-block: var(--space-100)` for a vertical middle inset. Figma holds the same distances as the divider\'s padding.',
      'forced colors — under `forced-colors: active` a background is replaced, and a 1px box painted only by `background` can disappear. Give it `background: CanvasText` (or a `border-block-start` in place of the background) inside a `@media (forced-colors: active)` block so the rule survives.',
    ],
  },

  figmaProperties: {
    // One axis, two members. No state axis (no states), no texts, no swaps.
    variantAxes: ['orientation', 'inset'],
    // A vertical rule takes no start-only inset (the header gives the reason), so the set is five members.
    excludeCoordinates: [{ orientation: ['vertical'], inset: ['inset'] }],
    // Considered, and none survive — `decorative` changes no pixel, and a rule has nothing to toggle.
    booleans: {},
  },

  accessibility: {
    role: 'none with aria-hidden="true" by default, because a divider is decorative unless set otherwise; with decorative=false, separator (native <hr> for a horizontal rule, role="separator" with aria-orientation="vertical" for a vertical one)',
    wcag: [
      '1.3.1 Info and Relationships — a rule that marks a real break in content is a separator, so assistive technology hears the break a sighted reader sees',
      // The tinted-surface limit (owner Q208 A): `color.border.secondary` measures 2.36–2.81:1 on
      // `background.secondary` / `tertiary` in light mode. A stronger border role is filed as #2498.
      '1.4.11 Non-text Contrast — a decorative divider carries no information and needs no contrast minimum; a divider that genuinely communicates a boundary should clear 3:1. On a tinted surface, such as background.secondary or background.tertiary in light mode, the default rule does not reach 3:1, so a divider that marks a real boundary (decorative=false) needs more than the default rule there.',
    ],
    focus: 'None. A divider is not focusable and takes no place in the tab order.',
    aria: 'By default the rule sets aria-hidden="true", so a screen reader does not announce a break that means nothing. With decorative=false, an <hr> needs no attributes, and a vertical rule sets role="separator" and aria-orientation="vertical".',
  },

  content: {
    labelPattern: 'A divider carries no text. To title the group below it, use a heading, not a label on the rule.',
  },

  docs: {
    usage: 'Use a divider to separate groups of related content when spacing alone does not make the groups clear: sections of a page, rows in an accordion or list, or a cluster of controls in a toolbar. Horizontal by default, spanning its container; vertical between items in a row. Inset it from the start to line up with indented content, or from both ends to separate within a section. It is decorative by default; set decorative to false when the rule marks a real break in the content.',
    do: [
      'Let the divider span its container, so the break reads as a break between whole groups',
      'Try spacing first, and add a divider when the groups still run together',
      'Use a vertical divider between clusters of controls in a row, such as a toolbar',
      'Leave a divider decorative unless it marks a real break in the content, so a screen reader is not told about every visual line',
    ],
    dont: [
      'Put a divider between every item in a list; increase the spacing instead',
      'Put text or controls inside a divider; title the group with a heading instead',
      'Use a divider as the only cue that two groups are separate when the rule is faint; add spacing too',
      'Stack a divider directly against a border, such as the edge of a card, so two lines sit side by side',
    ],
    contentGuidelines: 'A divider holds no copy.',
  },

  ai: {
    primaryPurpose: 'Separate groups of content with a thin horizontal or vertical rule that spans its container.',
    whenToUse: 'Two groups of content sit next to each other and spacing alone does not separate them: page sections, accordion or list rows, or clusters of controls in a toolbar (vertical).',
    avoidWhen: 'Spacing already separates the groups, the edge is a container\'s own border (a card or field draws its own), or the break needs a title (use a heading).',
    // The brief's partners (list, menu, card, stack, toolbar) and Accordion (#2417) are not registered defs
    // yet, so they wait in `composition.planned`; this list holds registered ids only.
    commonPartners: [],
    triggerKeywords: ['divider', 'separator', 'rule', 'horizontal rule', 'vertical rule', 'hr', 'line between sections', 'section break'],
    generationPriority: 3,
  },

  composition: {
    // Nests nothing (#1700).
    composesWith: [],
    alternativeTo: [],
    replacesPatterns: [
      'a hand-drawn line or a border-bottom on one item standing in for a separator',
    ],
    supersededBy: [],
    planned: ['accordion', 'list', 'menu', 'card', 'stack', 'toolbar'],
  },

  notes: {
    contested: [
      'Approved defaults (owner Q190.3 A): the `orientation` axis and its two values; `border-width.hairline` as the thickness; `color.border.secondary` as the color (the role the token tier names as a divider, 3.20:1 at its lowest against `background.primary`, measured in harbor light); filling the container; no states; its own Figma page. Held back: a `thick` thickness and a `color.border.primary` variant, each one more axis value when a consumer needs it.',
      'DECORATIVE BY DEFAULT (owner Q190.1 A, after the brief): `decorative` defaults to true and hides the rule from assistive technology. The inverse default, a separator everywhere, is the more common real-world bug: a screen reader announces a separator between every toolbar button.',
      'THE INSET STEPS ARE DRAFT (owner Q190.2 A): `space.200` for the start and both-ends insets, `space.100` for a vertical middle inset, the closest existing steps; the brief names no token. A vertical rule takes no start-only inset, so the Figma set is five members.',
      'THE LABELLED DIVIDER is deferred to its own issue: the brief\'s `label` and `labelPosition` (the "OR" between two ways to sign in).',
    ],
    unverified: [
      'A HOST STRETCHING A BOUND LENGTH. The standalone member binds its length to a variable; a host that nests it with `crossAxisFill` projects the instance as STRETCH on that axis. That stretch overriding the inherited width binding on the real Figma host is expected but not yet measured — the first nesting host (Accordion) is where it gets measured.',
      'THE NOMINAL LENGTHS ARE PLACEHOLDERS. `container.narrow` (720px) and `size.md.height` make the standalone members rule-shaped; nobody has decided they are right, and in use the rule fills its container.',
    ],
  },
};
