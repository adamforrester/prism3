/**
 * Divider — a 1px rule that separates content (#2455). Pulled forward by the owner so Accordion (#2417) can
 * nest it as its item rule from day one; Tabs' baseline, lists and cards can nest it later.
 *
 * No KB brief: the catalogue has none for a divider or separator, and nothing below cites one. Category
 * `layout` — a divider structures the space between other content and carries none of its own; it is not a
 * form control, not feedback, and not a foundations primitive (an icon or a color) that other components
 * paint with.
 *
 * ── WHAT THE ISSUE RECOMMENDED, AND EVERY VISIBLE CHOICE IS DRAFT ────────────────────────────────
 *
 * Each of these is an owner item in the PR (`CLAUDE.md` principle 6): orientation horizontal | vertical; a
 * 1px thickness at `border-width.hairline`; the color `color.border.secondary`; it fills its parent's width
 * (or height, when vertical); no states, because it is not interactive; `<hr>` or `role="separator"` in code,
 * `aria-hidden` when decorative; its own Figma page. Held back as options the issue named but no consumer has
 * asked for yet: a `thick` thickness and a `color.border.primary` decorative variant. Each would be one more
 * axis value, added when a consumer needs it.
 *
 * ── `orientation`: A NEW NAME IN THE CLOSED `VARIANT_AXES` LIST ──────────────────────────────────
 *
 * The owner's issue names the axis `orientation`, which is also the ARIA attribute it drives
 * (`aria-orientation`). Reopening the list for it is the mechanical fallout of that name, argued in
 * `VARIANT_AXES`'s own header and carried as a `sole` set in `lint-axis-values.ts`.
 *
 * ── THE SHAPE: ONE FILLED BOX, BOTH DIMENSIONS BOUND PER ORIENTATION ─────────────────────────────
 *
 * One `box` root, `rule`, painting one `fill`, no children. The rule IS the box: its thickness is one
 * dimension and its length the other, so a horizontal member binds `height` to the hairline and `width` to a
 * nominal length, and a vertical member the reverse. Both bindings go through `{orientation}`-keyed tokens,
 * because the anatomy is one tree for every member and only the bindings may vary.
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
 * root declares one). In code the rule fills its container (`inline-size: 100%` / `align-self: stretch`).
 */
import { ComponentDef } from '../component-schema';

export const divider: ComponentDef = {
  id: 'divider',
  name: 'Divider',
  aliases: ['separator', 'rule', 'horizontal-rule'],
  // `layout` (#1700) — no brief, so a stated choice; the header gives the reason.
  category: 'layout',
  status: 'draft',
  summary: 'A thin rule between groups of content. Horizontal or vertical, and it fills its container.',
  description:
    'A 1px rule that separates groups of content: sections of a page, items in a list, rows of an accordion, or a cluster of controls in a toolbar. Horizontal by default, spanning the width of its container; vertical between items in a row, spanning its height. It carries no content and has no interaction states. Where the break is meaningful, it is a separator to assistive technology; where it is only visual, hide it.',

  props: [
    { name: 'orientation', type: "enum: 'horizontal' | 'vertical'", values: ['horizontal', 'vertical'], default: 'horizontal', required: false, description: 'Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute.' },
  ],

  // `[]` — a divider is not interactive. It has no hover, press or focus, the same claim veil and focus-ring make.
  states: [],

  variants: {
    orientation: ['horizontal', 'vertical'],
  },
  // A rule runs one way where it is placed and never turns on screen.
  axisKinds: { orientation: 'authoring' },

  // One ink for every member: the box's `fill`.
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
  },

  anatomy: {
    root: 'rule',
    parts: {
      rule: {
        kind: 'box',
        // `target` because the schema requires exactly one and a one-part anatomy has one candidate — NOT an
        // interaction claim, the same schema-satisfying use veil's and focus-ring's single box make.
        role: 'target',
        paintSlots: ['fill'],
        // A layout so a host can stretch the nested instance (`nestSizingOf` reads it); both axes FIXED,
        // because both are bound. No children, so direction, align and justify move nothing.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        width: '{orientation}.width',
        height: '{orientation}.height',
        note: 'The rule itself: one box, one fill, no children. Its thickness is the hairline border width; its length fills the container it sits in, so the standalone length is a placeholder a host stretches.',
      },
    },
    codeOnly: [
      // MUST NOT lead with `orientation` (an axis this def projects) — see the `admits()` trap.
      'filling the container — a divider spans its container: a horizontal rule `inline-size: 100%` (or the stretch a flex or grid column gives it), a vertical rule `align-self: stretch` in a row. Figma cannot hold that for a standalone component, which has no parent, so the standalone member binds a nominal length (`container.narrow` across, `size.md.height` tall) and a host that nests it stretches the instance with `crossAxisFill`.',
      'the element — use `<hr>` for a horizontal rule: it is a separator to assistive technology with no extra attributes. Reset its border and margin (`border: 0; margin: 0`) and paint it as a box: `block-size: var(--border-width-hairline); background: var(--color-border-secondary)`. A vertical rule is a `<div role="separator" aria-orientation="vertical">` with `inline-size` set to the hairline instead, because `<hr>` is horizontal by default.',
      'decorative rules — when the break carries no meaning (a rule inside a card, between items a list already groups), set `aria-hidden="true"` on it, the standard attribute rather than a prop, the way a host hides a nested spinner. Never give a divider focus: a separator that is not a splitter takes no place in the tab order.',
      'forced colors — under `forced-colors: active` a background is replaced, and a 1px box painted only by `background` can disappear. Give it `background: CanvasText` (or a `border-block-start` in place of the background) inside a `@media (forced-colors: active)` block so the rule survives.',
    ],
  },

  figmaProperties: {
    // One axis, two members. No state axis (no states), no texts, no swaps.
    variantAxes: ['orientation'],
    // Considered, and none survive — a rule has one node and nothing to toggle.
    booleans: {},
  },

  accessibility: {
    role: 'separator (native <hr> for a horizontal rule, role="separator" with aria-orientation="vertical" for a vertical one), or none with aria-hidden="true" when the rule is decorative',
    wcag: [
      '1.3.1 Info and Relationships — a rule that marks a real break in content is a separator, so assistive technology hears the break a sighted reader sees',
      '1.4.11 Non-text Contrast — a divider is not a UI control boundary, so it does not need 3:1; where a layout relies on the rule alone to show that two groups are separate, aim for the same 3:1 and add spacing as a second cue',
    ],
    focus: 'None. A divider is not focusable and takes no place in the tab order.',
    aria: 'An <hr> needs no attributes. A vertical rule sets role="separator" and aria-orientation="vertical". A decorative rule sets aria-hidden="true", so a screen reader does not announce a break that means nothing.',
  },

  content: {
    labelPattern: 'A divider carries no text. To title the group below it, use a heading, not a label on the rule.',
  },

  docs: {
    usage: 'Use a divider to separate groups of related content when spacing alone does not make the groups clear: sections of a page, rows in an accordion or list, or a cluster of controls in a toolbar. Horizontal by default, spanning its container; vertical between items in a row. Mark it aria-hidden when the break is only visual.',
    do: [
      'Let the divider span its container, so the break reads as a break between whole groups',
      'Try spacing first, and add a divider when the groups still run together',
      'Use a vertical divider between clusters of controls in a row, such as a toolbar',
      'Set aria-hidden="true" on a divider that only decorates',
    ],
    dont: [
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
    // Hosts that nest or sit beside it. Accordion (#2417) is not yet registered, so it is in `planned`.
    commonPartners: ['button', 'icon-button'],
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
    planned: ['accordion'],
  },

  notes: {
    contested: [
      'DRAFT, every visible choice (owner items in the PR): the `orientation` axis name and its two values; `border-width.hairline` as the thickness; `color.border.secondary` as the color (the role the token tier names as a divider, 3.26:1 at its lowest across brands and modes per the issue); filling the container; no states; `<hr>` / `role="separator"` with `aria-hidden` when decorative; its own Figma page. Held back: a `thick` thickness and a `color.border.primary` decorative variant, each one more axis value when a consumer needs it.',
      'NO `isDecorative` PROP. A decorative rule is hidden with the standard `aria-hidden` attribute, as a host hides a nested spinner (spinner, owner 2026-09-27). A prop would be one more name for an attribute every element already takes. An owner call if the code surface wants it explicit.',
    ],
    unverified: [
      'A HOST STRETCHING A BOUND LENGTH. The standalone member binds its length to a variable; a host that nests it with `crossAxisFill` projects the instance as STRETCH on that axis. That stretch overriding the inherited width binding on the real Figma host is expected but not yet measured — the first nesting host (Accordion) is where it gets measured.',
      'THE NOMINAL LENGTHS ARE PLACEHOLDERS. `container.narrow` (720px) and `size.md.height` make the standalone members rule-shaped; nobody has decided they are right, and in use the rule fills its container.',
    ],
  },
};
