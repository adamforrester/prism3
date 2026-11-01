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
 * A Figma boolean drives one node's `visible`, and neither value hides the rule, so a Figma property for the
 * bit would toggle nothing the canvas can show. The bit lives in code only, stated in `anatomy.codeOnly`, the
 * way the brief puts it ("tokens, not props" for thickness and color; the semantics bit is the one real prop).
 *
 * IT CHANGES THE COLOR IN CODE (#2569, owner Q259 3A). A decorative rule paints `color.border.secondary`, a
 * decorative rung at ~2:1. A separator (decorative=false) marks a boundary someone has to perceive, so it
 * paints `color.border.tertiary`, the first neutral edge the engine contracts at 3:1 on every page and surface
 * tier; this closes the tinted-surface limit Q208/Q227 documented (#2498). The binding is `separator.fill`, a
 * CODE-ONLY paint: the Figma set keeps the decorative default, and `lint-paint.ts` names the key as unreached.
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
 * The root `divider` is a box that paints nothing, a row horizontal and a column vertical (#3143): both dimensions
 * bound per orientation (thickness and a nominal length), and its padding is the inset. Its one child, `rule`, paints
 * the `fill` and fills the root's content box on both axes (`grow` along it, `crossAxisFill` across), so the rule is the root less its
 * inset. With no inset the two coincide and the pixels are exactly the 1px box this def first shipped.
 *
 * A filled box rather than a stroke: a stroke draws inside a box's bounds on all four sides, so a 1px
 * horizontal rule drawn as a stroke would need a 0-height box and a bottom-only stroke, which `PartDef` cannot
 * say (Figma's per-side stroke weights are not bindable here). A 1px box with a fill is the same pixels, in
 * code as in Figma: `block-size: var(--border-width-hairline); background: var(--color-border-secondary)` (a
 * separator's is `--color-border-tertiary`, above).
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
 * variant.
 *
 * ── `labeled`: THE RULE BROKEN BY A SHORT CENTERED LABEL (#3051, owner Q3051.1–.7, all A) ──────────
 *
 * The brief's labeled divider, the "Or" between two groups of actions. A `labeled: false | true` VARIANT AXIS,
 * the name Pagination.Item already put in `VARIANT_AXES` (so no schema change; the value set joins its `labeled`
 * entry in `lint-axis-values.ts`), with `false` first so the inserted member is today's plain rule. Not a
 * boolean: with the label hidden an auto-layout row still draws two lines and a gap, not one rule, so showing
 * the label changes the structure (the icon canon's test). In code there is no `labeled` prop: a non-empty
 * `label` string IS the labeled divider, and the axis is its authoring projection.
 *
 * The labeled member draws `leadingRule` (grows), `label` (hugs) and `trailingRule` (grows) in the same row,
 * `space.300` apart (Q3051.4 A: 24px, about 2.4× the 14px label's cap height, inside the reference's 2–3× band),
 * centered on the label's line box: the root's height binds `type.label.md.line-box`, the baked px of that line
 * box (the checkbox row's #1201 construction), so the root is exactly one label line tall and each line sits on
 * its middle. The label is `type.label.md.default` in `color.text.secondary` (Q3051.4 A, Q3051.5 A), held at 4.5:1
 * on the page tiers its `.ai.json` lists (`sits_on`) by `test.ts` (#3051; a brand with `secondaryTextGround: page`
 * promises only `background.primary`, Q3212.6 A); the lines keep the plain rule's `color.border.secondary` and hairline. Center
 * only (Q3051.3 A); inset `none` only (Q3051.6 A), so `excludeCoordinates` removes the two insets × labeled.
 * Placeholder copy "Or", sentence case (Q3051.7 A).
 *
 * ── VERTICAL AND LABELED (#3143, owner Q3143.1–.7, all A) ─────────────────────────────────────────
 *
 * #3051 shipped the label horizontal only; #3143 reopens the vertical coordinate, so the set is seven members. The
 * label stays UPRIGHT with a line above and below it (Q3143.1 A: every system read that builds this lays it out as a
 * column, none rotates it). The root's direction follows the member (`directionWhen`, Button group's #2661 field): a
 * row horizontal, a column vertical. The plain vertical rule keeps its pixels, because `grow` now runs down the
 * column and `crossAxisFill` across it, but its plan's layout mode moves from HORIZONTAL to VERTICAL.
 *
 * The vertical labeled root HUGS the label across (Q3143.2 A, `sizingWhen`, the narrow schema addition #3143 makes),
 * so it is as wide as the word, `inline-size: max-content` in code. Its lines sit `space.150` (12px) from the label
 * (Q3143.3 A, Fluent's exact gap; the line box already carries the half-leading), on their own `vertical.gap` key so
 * the horizontal 24px is unchanged, and both follow density. Inset `none` only (Q3143.4 A). The standalone member is
 * `size.xl.height` (68px) tall, and the docs state a 56px minimum: a 16px label, two 12px gaps and two 8px lines
 * (Q3143.5 A). It is for Or between alternatives only; a group title stays a heading (Q3143.6 A). The accessibility
 * contract is Q3051.2 A unchanged, and it sets no `aria-orientation`: no role, so there is nothing for it to describe
 * (Q3143.7 A).
 *
 * A LINE BINDS ITS THICKNESS ON THE CROSS AXIS ONLY. Each line binds `{orientation}.line.width` and `.height`, the
 * hairline both ways, and grows along the main axis; the projection does not write a bound size on the axis a part
 * grows along (`anatomy-figma.ts`, #3143 build check 1), because the parent decides that length.
 *
 * ACCESSIBILITY (Q3051.2 A). ARIA 1.2 makes a separator's children presentational, so a `role="separator"`
 * wrapper would hide its own label. The labeled divider's wrapper takes no role, the two lines are
 * `aria-hidden="true"`, and the label is plain text in the reading order. `decorative` has no effect there.
 */
import { ComponentDef } from '../component-schema';

export const divider: ComponentDef = {
  id: 'divider',
  name: 'Divider',
  aliases: ['separator', 'rule', 'hr'],
  // `foundations` (#1700) — the brief's own category.
  category: 'foundations',
  status: 'draft',
  summary: 'A thin rule between groups of content. Horizontal or vertical, or broken by a short centered label.',
  description:
    'A 1px rule that separates groups of content when spacing alone leaves the grouping unclear: sections of a page, rows of an accordion, or a cluster of controls in a toolbar. Horizontal by default, spanning the width of its container; vertical between items in a row, spanning its height. It can run edge to edge or sit inset from the start or from both ends. A labeled divider breaks the rule with one short centered word, such as Or between two ways to sign in: a line on each side, 24px clear of the label (12px when vertical), and the label in the secondary text color, which clears 4.5:1 against the page. It has no interaction states. Decorative by default, so assistive technology ignores it; set decorative to false when the rule marks a real break in the content, and it becomes a separator. A labeled divider is read as its label.',

  props: [
    { name: 'orientation', type: "enum: 'horizontal' | 'vertical'", values: ['horizontal', 'vertical'], default: 'horizontal', required: false, description: 'Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute.' },
    { name: 'inset', type: "enum: 'none' | 'inset' | 'middle-inset'", values: ['none', 'inset', 'middle-inset'], default: 'none', required: false, description: 'How far the rule sits in from its container\'s edges. none runs edge to edge; inset starts the rule 16px in from the start edge, so it lines up with indented content such as list text after an avatar; middle-inset indents both ends. The start edge follows text direction. A vertical rule takes none or middle-inset only.' },
    { name: 'decorative', type: 'boolean', default: true, required: false, description: 'Whether the rule is only visual. true (the default) hides it from assistive technology with aria-hidden="true". Set false when the rule marks a real break in the content: it becomes a separator, an <hr> for a horizontal rule, drawn in border.tertiary so it reaches 3:1 on every background. It has no effect on a labeled divider, where the label marks the break.' },
    { name: 'label', type: 'string', required: false, description: 'One short word that breaks the rule in the middle, such as Or. Setting it makes a labeled divider: a line on each side, centered on the label. No inset only. A vertical labeled divider keeps the label upright, with a line above and below it. Screen readers read the label as plain text and skip the two lines. Pass the translated word.' },
  ],

  // `[]` — a divider is not interactive. It has no hover, press or focus, the same claim veil and focus-ring make.
  states: [],

  variants: {
    orientation: ['horizontal', 'vertical'],
    inset: ['none', 'inset', 'middle-inset'],
    // #3051 (Q3051.1 A): `false` first, so the inserted member is the plain rule, as in code (no label).
    labeled: ['false', 'true'],
  },
  // A rule runs one way, sits at one inset and carries a label or not where it is placed, and none of them
  // changes on screen.
  axisKinds: { orientation: 'authoring', inset: 'authoring', labeled: 'authoring' },

  // #3051, #3143: the label-to-line gap follows density, as every gap does, on each orientation's own key.
  densitySpacing: ['horizontal.gap', 'vertical.gap'],

  // One ink for every member: the rule's `fill`.
  paintKeys: ['{slot}'],

  tokens: {
    // THE COLOR (DRAFT, owner item). `color.border.secondary` is the decorative rung of the edge ladder.
    'fill': 'color.border.secondary',
    // A SEPARATOR'S COLOR (#2569, owner Q259 3A) — code only: a divider with decorative=false paints the first
    // neutral edge contracted at 3:1 on every page and surface tier. No Figma member draws it (see header).
    'separator.fill': 'color.border.tertiary',
    // THE LABEL (#3051, Q3051.4 A and Q3051.5 A): the medium label style in the secondary text ink, the part that
    // carries meaning, so it is held at 4.5:1 against the page tiers its `.ai.json` lists (`test.ts` #3051).
    'label': 'color.text.secondary',
    'label.type': 'type.label.md.default',
    // THE THICKNESS (DRAFT, owner item) — the box's cross dimension, per orientation. A horizontal labeled root is
    // one label line box tall (#3051, the baked px of `type.label.md` at its line height). A vertical labeled root
    // HUGS its label across (#3143, Q3143.2 A, `sizingWhen`), so `vertical.true.width` is never written; it resolves
    // only because every binding key must, at the label's line box, the width it would take if it stopped hugging.
    'horizontal.false.height': 'border-width.hairline',
    'horizontal.true.height': 'type.label.md.line-box',
    'vertical.false.width': 'border-width.hairline',
    'vertical.true.width': 'type.label.md.line-box',
    // EACH LINE'S THICKNESS, both ways (#3143): the cross axis is the hairline; the main-axis key resolves to the same
    // hairline but is never written, because the line grows along that axis and the projection writes no bound size
    // on a growing axis (build check 1).
    'horizontal.line.width': 'border-width.hairline',
    'horizontal.line.height': 'border-width.hairline',
    'vertical.line.width': 'border-width.hairline',
    'vertical.line.height': 'border-width.hairline',
    // THE GAP between the label and each line: `space.300`, 24px, across a row (#3051, Q3051.4 A), and `space.150`,
    // 12px, down a column (#3143, Q3143.3 A), where the 16px line box already adds the half-leading. The plain rule is
    // the root's only child, so the gap lays nothing out there.
    'horizontal.gap': 'space.300',
    'vertical.gap': 'space.150',
    // THE NOMINAL LENGTH — not a design decision about divider length (there is none: in use it fills its
    // container). It exists only so the standalone member is a rule-shaped artifact rather than a 1×1 frame.
    // `container.narrow` (720px) is veil's idiom; `size.md.height` is focus-ring's, the medium control height. A
    // vertical labeled divider is `size.xl.height` (68px) tall (#3143, Q3143.5 A): at one control tall it reads as a
    // word, not a divider, and the docs state its 56px minimum.
    'horizontal.false.width': 'container.narrow',
    'horizontal.true.width': 'container.narrow',
    'vertical.false.height': 'size.md.height',
    'vertical.true.height': 'size.xl.height',
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
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'presentation',
        children: ['rule', 'leadingRule', 'label', 'trailingRule'],
        // A layout so a host can stretch the nested instance (`nestSizingOf` reads it); both axes FIXED,
        // because both are bound. A ROW horizontal and a COLUMN vertical (#3143, `directionWhen`), so the rule
        // grows along it and stretches across it. CENTERED across (#3051), so a labeled divider's two lines sit
        // on the middle of the label; the plain rule stretches across, so the alignment moves none of its pixels.
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        directionWhen: { axis: 'orientation', values: { horizontal: 'row', vertical: 'column' } },
        // #3143 (Q3143.2 A): the vertical labeled root hugs its label across, so a longer word widens it.
        sizingWhen: { when: { orientation: ['vertical'], labeled: ['true'] }, x: 'hug' },
        width: '{orientation}.{labeled}.width',
        height: '{orientation}.{labeled}.height',
        gap: '{orientation}.gap',
        // The inset. `inlineEnd` because the two inline sides differ at `inset` (the start only).
        padding: { block: '{orientation}.{inset}.pad-block', inlineLabel: '{orientation}.{inset}.pad-start', inlineEnd: '{orientation}.{inset}.pad-end' },
        note: 'The divider\'s footprint: the thickness one way and the length the other, with the inset as its padding. A labeled divider is one label line tall. It paints nothing.',
      },
      rule: {
        kind: 'box',
        // `target` because the schema requires exactly one — NOT an interaction claim, the same
        // schema-satisfying use veil's and focus-ring's single box make.
        role: 'target',
        paintSlots: ['fill'],
        // #3051: the plain rule and the labeled member's two lines are ONE rule in pieces, so they share the fill.
        paintGroup: 'rule',
        // Fills the root's content box on both axes, so the rule is the footprint less the inset.
        grow: true,
        crossAxisFill: true,
        // #3051: the plain rule only. A labeled divider draws its two lines and the label instead.
        presentWhen: { labeled: ['false'] },
        note: 'The rule itself: one box, one fill, no children. Its thickness is the hairline border width; its length fills the container it sits in, less the inset, so the standalone length is a placeholder a host stretches.',
      },
      // #3051 (Q3051.1 A): the labeled member's three cells. Each line GROWS along the root's main axis and binds the
      // hairline as its thickness across it (#3143: both keys per orientation), so the two split what the label leaves
      // and sit on the middle of the root.
      leadingRule: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        paintGroup: 'rule',
        grow: true,
        width: '{orientation}.line.width',
        height: '{orientation}.line.height',
        presentWhen: { labeled: ['true'] },
        note: 'The line before the label, in the rule\'s color and thickness. It fills the space the label leaves on its side.',
      },
      label: {
        kind: 'text',
        type: 'label.type',
        presentWhen: { labeled: ['true'] },
        note: 'The short word that breaks the rule, such as Or, in the secondary text color. It hugs its text and never wraps.',
      },
      trailingRule: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        paintGroup: 'rule',
        grow: true,
        width: '{orientation}.line.width',
        height: '{orientation}.line.height',
        presentWhen: { labeled: ['true'] },
        note: 'The line after the label, the same as the line before it, so the label sits centered.',
      },
    },
    codeOnly: [
      // MUST NOT lead with `orientation` or `inset` (axes this def projects) — see the `admits()` trap.
      'decorative — a code prop with no Figma property. A Figma boolean only shows or hides a node, and neither value hides the rule, so the Figma set draws the decorative default. true (the default) renders `aria-hidden="true"` (a `<div>`, or an `<hr>` with `role="none"` as well) in `color.border.secondary`; false renders an `<hr>` for a horizontal rule, or `<div role="separator" aria-orientation="vertical">` for a vertical one, in `color.border.tertiary` (the `separator.fill` binding), which reaches 3:1 on every background.',
      'filling the container — a divider spans its container: a horizontal rule `inline-size: 100%` (or the stretch a flex or grid column gives it), a vertical rule `align-self: stretch` in a row. Figma cannot hold that for a standalone component, which has no parent, so the standalone member binds a nominal length (`container.narrow` across, `size.md.height` tall) and a host that nests it stretches the instance with `crossAxisFill`.',
      'the element — for a separator (decorative=false), use `<hr>` for a horizontal rule: it is a separator to assistive technology with no extra attributes. Reset its border and margin (`border: 0; margin: 0`) and paint it as a box: `block-size: var(--border-width-hairline); background: var(--color-border-tertiary)`. A vertical rule is a `<div role="separator" aria-orientation="vertical">` with `inline-size` set to the hairline instead, because `<hr>` is horizontal by default. Never give a divider focus: a separator that is not a splitter takes no place in the tab order.',
      'the inset in code — a margin on logical edges, so it mirrors in right-to-left text: `margin-inline-start: var(--space-200)` at inset, both `margin-inline` sides at middle-inset, and `margin-block: var(--space-100)` for a vertical middle inset. Figma holds the same distances as the divider\'s padding.',
      'forced colors — under `forced-colors: active` a background is replaced, and a 1px box painted only by `background` can disappear. Give it `background: CanvasText` (or a `border-block-start` in place of the background) inside a `@media (forced-colors: active)` block so the rule survives.',
      // #3051 — MUST NOT lead with `labeled` (an axis this def projects): see the `admits()` trap.
      'the labeled divider in code — a non-empty `label` makes it; there is no separate prop. Markup: `<div class="divider" data-labeled><span class="divider-line" aria-hidden="true"></span><span class="divider-label">Or</span><span class="divider-line" aria-hidden="true"></span></div>`, with `display: flex; align-items: center; gap: var(--space-300)` on the wrapper, `flex: 1 1 0; block-size: var(--border-width-hairline); background: var(--color-border-secondary)` on each line, and `font: var(--type-label-md-default); color: var(--color-text-secondary); white-space: nowrap` on the label. Vertical, the same three spans with `flex-direction: column; gap: var(--space-150); inline-size: max-content; min-block-size: 56px` on the wrapper and `flex: 1 1 0; inline-size: var(--border-width-hairline)` on each line, the label upright between them. `inset="none"` only: refuse (or ignore) a label on an inset divider.',
      'the labeled divider\'s semantics — ARIA 1.2 makes a separator\'s children presentational, so a `role="separator"` wrapper would hide the label from assistive technology. The wrapper takes no role and no `aria-hidden`, both lines are `aria-hidden="true"`, and the label is plain text in the reading order, read as "Or" between the two groups. `decorative` has no effect on a labeled divider, and its lines keep `color.border.secondary`. Not focusable. Under forced colors the lines take `background: CanvasText`, as the plain rule does; the label keeps the system text color.',
      'RTL — the labeled divider is symmetric, so nothing moves; flex order and logical properties mirror it for free.',
      'text expansion — the label hugs its word and the lines take what is left, so a longer translation shortens both lines equally. Keep it to one or two words; the label does not wrap.',
    ],
  },

  figmaProperties: {
    // One axis, two members. No state axis (no states), no texts, no swaps.
    variantAxes: ['orientation', 'inset', 'labeled'],
    // A vertical rule takes no start-only inset (the header gives the reason), and a labeled rule takes no inset
    // (#3051 Q3051.6 A, #3143 Q3143.4 A), so the set is seven members: five plain and two labeled, one each way.
    excludeCoordinates: [
      { orientation: ['vertical'], inset: ['inset'] },
      { inset: ['inset', 'middle-inset'], labeled: ['true'] },
    ],
    // #3051: the labeled member is one label line tall where the plain rule is a hairline, because `label` and the
    // two lines are gated on the axis. #3143: the vertical labeled member is 68px tall where the plain one is 44px.
    footprintVaries: ['labeled'],
    // #3051 (Q3051.7 A): "Or", sentence case. The one text property, bound on the labeled member only.
    texts: {
      label: { part: 'label', default: 'Or' },
    },
    // Considered, and none survive — `decorative` changes no node's visibility (its color change is code only),
    // and a rule has nothing to toggle.
    booleans: {},
  },

  accessibility: {
    role: 'none with aria-hidden="true" by default, because a divider is decorative unless set otherwise; with decorative=false, separator (native <hr> for a horizontal rule, role="separator" with aria-orientation="vertical" for a vertical one); a labeled divider takes no role, its two lines hidden and its label read as plain text',
    wcag: [
      '1.3.1 Info and Relationships — a rule that marks a real break in content is a separator, so assistive technology hears the break a sighted reader sees',
      // The tinted-surface limit (owner Q208 A) is closed by #2569 (Q259 3A): a separator binds `border.tertiary`,
      // contracted at 3:1 against every page and surface tier in every mode. DRAFT copy, owner item.
      '1.4.11 Non-text Contrast — a decorative divider carries no information and needs no contrast minimum. A divider that marks a real boundary (decorative=false) uses border.tertiary, which reaches 3:1 on every background.',
      '1.4.3 Contrast (Minimum) — a labeled divider\'s label is text.secondary, which clears 4.5:1 on the page backgrounds its color\'s metadata lists. Its two lines are decorative and need no minimum.',
    ],
    focus: 'None. A divider is not focusable and takes no place in the tab order.',
    aria: 'By default the rule sets aria-hidden="true", so a screen reader does not announce a break that means nothing. With decorative=false, an <hr> needs no attributes, and a vertical rule sets role="separator" and aria-orientation="vertical". A labeled divider sets no role: a separator hides its own text, so the label would not be read. Its two lines set aria-hidden="true", and the label is plain text in the reading order, read as Or between the two groups. Pass the translated word.',
  },

  content: {
    labelPattern: 'A labeled divider names the choice between two groups of actions with one short word, such as Or, in sentence case. To title the group below, use a heading.',
  },

  docs: {
    usage: 'Use a divider to separate groups of related content when spacing alone does not make the groups clear: sections of a page, rows in an accordion or list, or a cluster of controls in a toolbar. Horizontal by default, spanning its container; vertical between items in a row. Inset it from the start to line up with indented content, or from both ends to separate within a section. It is decorative by default; set decorative to false when the rule marks a real break in the content. Give it a label, such as Or, when it sits between two alternative groups of actions, such as social sign-in above and email sign-in below. Vertical, it sits between two groups side by side on a wide layout.',
    do: [
      'Let the divider span its container, so the break reads as a break between whole groups',
      'Try spacing first, and add a divider when the groups still run together',
      'Use a vertical divider between clusters of controls in a row, such as a toolbar',
      'Leave a divider decorative unless it marks a real break in the content, so a screen reader is not told about every visual line',
      'Use a labeled divider with Or between two alternative ways to do one thing, such as two ways to sign in',
      'Use a vertical labeled divider only where both groups are at least 56px tall; between two single buttons, stack them and use a horizontal one',
    ],
    dont: [
      'Put a divider between every item in a list; increase the spacing instead',
      'Put a title, a sentence or controls inside a divider; title the group with a heading, and keep a label to one short word such as Or',
      'Use a divider as the only cue that two groups are separate when the rule is faint; add spacing too',
      'Stack a divider directly against a border, such as the edge of a card, so two lines sit side by side',
    ],
    contentGuidelines: 'A plain divider holds no copy. A labeled divider holds one short word, such as Or, in sentence case, with no punctuation.',
  },

  ai: {
    primaryPurpose: 'Separate groups of content with a thin horizontal or vertical rule that spans its container.',
    whenToUse: 'Two groups of content sit next to each other and spacing alone does not separate them: page sections, accordion or list rows, or clusters of controls in a toolbar (vertical).',
    avoidWhen: 'Spacing already separates the groups, the edge is a container\'s own border (a card or field draws its own), or the break needs a title or more than one short word (use a heading). A labeled divider is for one word, such as Or, between two alternative groups of actions.',
    // Accordion (#2417) nests the divider as its item rule, so it is a host here. List (#2319) is registered now and
    // sits beside it, though its first cut nests none. The brief's other partners (menu, card, stack, toolbar) are not
    // registered defs yet, so they wait in `composition.planned`.
    commonPartners: ['accordion', 'list'],
    triggerKeywords: ['divider', 'separator', 'rule', 'horizontal rule', 'vertical rule', 'hr', 'line between sections', 'section break', 'or divider', 'labeled divider', 'text divider'],
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
    planned: ['menu', 'card', 'stack', 'toolbar'],
  },

  notes: {
    contested: [
      'Approved defaults (owner Q190.3 A): the `orientation` axis and its two values; `border-width.hairline` as the thickness; `color.border.secondary` as the color (the decorative rung of the edge ladder, ~2:1 against the page since #2569; a separator, decorative=false, paints `color.border.tertiary` in code); filling the container; no states; its own Figma page. Held back: a `thick` thickness and a `color.border.primary` variant, each one more axis value when a consumer needs it.',
      'DECORATIVE BY DEFAULT (owner Q190.1 A, after the brief): `decorative` defaults to true and hides the rule from assistive technology. The inverse default, a separator everywhere, is the more common real-world bug: a screen reader announces a separator between every toolbar button.',
      'THE INSET STEPS ARE DRAFT (owner Q190.2 A): `space.200` for the start and both-ends insets, `space.100` for a vertical middle inset, the closest existing steps; the brief names no token. A vertical rule takes no start-only inset, so the Figma set is five members.',
      'THE LABELED DIVIDER (#3051) is built on the proposal\'s recommendations, held for the owner\'s confirmation in the PR: Q3051.1 A a `labeled` axis plus a `label` text property and prop; Q3051.2 A no role on the wrapper, the lines aria-hidden, the label read as text; Q3051.3 A center only (the brief\'s `labelPosition` start and end are a later value addition, `alignment: center | start | end`); Q3051.4 A `type.label.md.default` with `space.300`; Q3051.5 A `color.text.secondary`; Q3051.6 A horizontal, inset `none` only (reopened for vertical by #3143); Q3051.7 A "Or", sentence case.',
      'THE VERTICAL LABELED DIVIDER (#3143, owner Q3143.1–.7, all A): the label upright with a line above and below; the root hugging the label across (`sizingWhen`); `space.150` between the label and each line, following density; inset `none` only, so seven members; a 56px minimum and a 68px (`size.xl.height`) standalone member; Or between alternatives only, a group title stays a heading; the Q3051.2 accessibility contract unchanged, with no `aria-orientation`.',
    ],
    unverified: [
      'A HOST STRETCHING A BOUND LENGTH. The standalone member binds its length to a variable; a host that nests it with `crossAxisFill` projects the instance as STRETCH on that axis. That stretch overriding the inherited width binding on the real Figma host is expected but not yet measured — the first nesting host (Accordion) is where it gets measured.',
      'THE LABELED DIVIDER ON A REAL HOST (#3051): the two lines GROW along a fixed row and center on a root one label line box tall. The offline shim builds and reads it back; a stretched nested instance (Accordion\'s `crossAxisFill`) has not been measured with a label, because no host nests the labeled member yet.',
      'THE VERTICAL LABELED DIVIDER ON A REAL HOST (#3143): its two lines GROW down a fixed column and bind the hairline across, and the root hugs the label. The offline shim builds and reads it back. A bound size on the axis a line grows along is not written (build check 1): the shim does not model a binding that turns a filling child fixed, so the projection drops the write rather than depend on that unmeasured behavior. Neither that behavior nor the update of a plain vertical member from a HORIZONTAL to a VERTICAL root on a file built before #3143 has been measured on a real host yet (#3157).',
      'THE NOMINAL LENGTHS ARE PLACEHOLDERS. `container.narrow` (720px) and `size.md.height` make the standalone members rule-shaped; nobody has decided they are right, and in use the rule fills its container.',
    ],
  },
};
