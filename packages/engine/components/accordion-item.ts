/**
 * Accordion.Item — ONE expand/collapse section: a header row (the button) and the panel it discloses
 * (KB brief: `components/accordion.md`). DRAFT for the owner's design proposal (#2417): nothing here is
 * approved, and every name, value and default visible to a designer is a draft.
 *
 * ── THE DECOMPOSITION (brief §2) ────────────────────────────────────────────────────────────────
 *
 * The brief ships a primitive (a single disclosure) and a set (the coordinated group). Prism3 already has
 * that shape twice — `checkbox-row` / `checkbox-group` and `radio-row` / `radio-group` — so this def is the
 * item and `accordion` is the group that nests up to eight of them. Used alone, the item is the
 * standalone disclosure: the visual is the same, only the code semantics differ (no list wrapper).
 *
 * ── EXPANSION IS A VARIANT AXIS, NOT A BOOLEAN ──────────────────────────────────────────────────
 *
 * Two things change together when an item opens: the panel appears AND the indicator flips (down → up,
 * or plus → minus). A node-visibility boolean toggles nodes in place but cannot also swap the glyph — one
 * boolean may drive several parts only when their gates never coexist, and "the panel, plus the up
 * chevron, minus the down chevron" is an on-and-off pair. So expansion is an axis, gated by `presentWhen`
 * on the panel and on each glyph. Its NAME is a schema question: `VARIANT_AXES` has no `expansion`, and
 * `selection` (the nearest) means something else. Held for the owner.
 *
 * ── THE INDICATOR IS AN AXIS TOO (owner call) ───────────────────────────────────────────────────
 *
 * `indicator: [chevron, plus-minus]`. The field's default is the chevron (down closed, up open); the
 * design-rebuild test that found this gap drew plus/minus. `indicator` is already a closed-vocabulary axis
 * name. It doubles the set (30 → 60); the alternative is chevron only.
 */
import { ComponentDef } from '../component-schema';

export const accordionItem: ComponentDef = {
  id: 'accordion-item',
  name: 'Accordion.Item',
  aliases: ['disclosure', 'collapse', 'expander', 'details', 'expansion-panel', 'collapsible'],
  category: 'navigation',
  status: 'draft',
  summary: 'One section that opens and closes in place. The whole header row is the button.',
  description:
    'One expand/collapse section: a header that names the content, and a panel that opens below it. The whole header row is the button, and the indicator shows whether the section is open. Use it alone for one optional block of detail, or stack several in an Accordion. Not one-at-a-time peer panels (tabs, not built yet), not a multi-level hierarchy (a tree, not built yet), and not navigation.',

  props: [
    { name: 'title', type: 'node', required: true, description: 'The header text: a short noun phrase or a question that tells the user what the panel holds. It wraps rather than truncating.' },
    { name: 'children', type: 'node', required: true, description: 'The panel content. Hidden from the page, the tab order and assistive technology while the item is closed.' },
    { name: 'value', type: 'string', required: false, description: 'The key the Accordion uses to track which items are open. Defaults to the item\'s position, but a stable key is safer when items are added or reordered.' },
    { name: 'defaultExpanded', type: 'boolean', default: false, required: false, description: 'Opens the item on first render when nothing controls it. Inside an Accordion, the group\'s defaultValue does this instead.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Locks the item in its current state and removes the header from the tab order. Prefer hiding a section to disabling it.' },
    { name: 'headingLevel', type: "enum: 2 | 3 | 4 | 5 | 6", values: ['2', '3', '4', '5', '6'], default: '3', required: false, description: 'The level of the heading that wraps the header button. Set it one below the heading the accordion sits under, so the page outline stays intact. Inside an Accordion, the group sets it for every item.' },
    { name: 'indicator', type: "enum: 'chevron' | 'plus-minus'", values: ['chevron', 'plus-minus'], default: 'chevron', required: false, description: 'The open/closed glyph at the end of the header: a chevron that points down when closed and up when open, or a plus that becomes a minus. Inside an Accordion, the group sets it for every item.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The header\'s type, padding and indicator size. Every size keeps the header at least 44px tall.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    expansion: ['collapsed', 'expanded'],
    indicator: ['chevron', 'plus-minus'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { expansion: 'runtime', indicator: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}.{state}', '{slot}'],
  densitySpacing: ['size.{size}.pad-x', 'size.{size}.pad-y', 'size.{size}.gap'],

  tokens: {
    // ── THE HEADER: neutral interactive ink, a hover/pressed wash, the shared focus ring.
    'overlay.hover': 'color.interactive.neutral.overlay.hover',
    'overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'label': 'color.interactive.neutral.text.rest',
    'label.hover': 'color.interactive.neutral.text.hover',
    'label.pressed': 'color.interactive.neutral.text.pressed',
    'icon': 'color.interactive.neutral.icon.rest',
    'icon.hover': 'color.interactive.neutral.icon.hover',
    'icon.pressed': 'color.interactive.neutral.icon.pressed',
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',

    // ── THE DIVIDER: a hairline under each item, the "stronger border / divider" role.
    'fill': 'color.border.secondary',
    // The disabled branch asks for `disabled.<slot>`; unbound, the divider vanishes on a disabled item.
    'disabled.fill': 'color.border.secondary',
    'divider-width': 'border-width.hairline',

    // ── PER SIZE. The header floor is 44px at every size (select's small-size rule); size moves type,
    // padding and the glyph. The indicator sits in a box one header line tall (checkbox-row's line-box
    // construction), so on a wrapping header it holds the first line.
    'size.small.min-height': 'size.md.min-height',
    'size.small.pad-x': 'space.150',
    'size.small.pad-y': 'space.100',
    'size.small.gap': 'space.100',
    'size.small.type': 'type.body.sm.strong',
    'size.small.panel-type': 'type.body.sm.default',
    'size.small.panel-pad-y': 'space.050',
    'size.small.line-box': 'control.size.sm.line-box',
    'size.small.icon': 'icon.size.sm',
    'size.medium.min-height': 'size.md.min-height',
    'size.medium.pad-x': 'space.200',
    'size.medium.pad-y': 'space.150',
    'size.medium.gap': 'space.150',
    'size.medium.type': 'type.body.md.strong',
    'size.medium.panel-type': 'type.body.md.default',
    'size.medium.panel-pad-y': 'space.100',
    'size.medium.line-box': 'control.size.md.line-box',
    'size.medium.icon': 'icon.size.sm',
    'size.large.min-height': 'size.lg.height',
    'size.large.pad-x': 'space.300',
    'size.large.pad-y': 'space.200',
    'size.large.gap': 'space.200',
    'size.large.type': 'type.body.lg.strong',
    'size.large.panel-type': 'type.body.lg.default',
    'size.large.panel-pad-y': 'space.150',
    'size.large.line-box': 'control.size.lg.line-box',
    'size.large.icon': 'icon.size.md',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        placementWidth: 320,
        minWidth: 120,
        children: ['header', 'panel', 'divider'],
      },
      header: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay'],
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        minHeight: 'size.{size}.min-height',
        padding: { block: 'size.{size}.pad-y', inlineLabel: 'size.{size}.pad-x' },
        gap: 'size.{size}.gap',
        children: ['label', 'indicatorBox', 'focusRing'],
        note: 'The header row and the hit target: the whole row is the button, so a click anywhere on it opens or closes the section. A wash shows on hover and press.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type',
        wrap: true,
        note: 'The section title. It fills the row and wraps onto more lines rather than truncating; the indicator stays on the first line.',
      },
      indicatorBox: {
        kind: 'box',
        role: 'presentation',
        height: 'size.{size}.line-box',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        children: ['chevronDown', 'chevronUp', 'plus', 'minus'],
      },
      chevronDown: { kind: 'vector', glyph: 'chevron-down', size: 'size.{size}.icon', presentWhen: { expansion: ['collapsed'], indicator: ['chevron'] }, note: 'The closed indicator: a chevron pointing down. Decorative; the button\'s expanded state carries the meaning.' },
      chevronUp: { kind: 'vector', glyph: 'chevron-up', size: 'size.{size}.icon', presentWhen: { expansion: ['expanded'], indicator: ['chevron'] }, note: 'The open indicator: a chevron pointing up.' },
      plus: { kind: 'vector', glyph: 'plus', size: 'size.{size}.icon', presentWhen: { expansion: ['collapsed'], indicator: ['plus-minus'] }, note: 'The closed indicator when the indicator is plus/minus.' },
      minus: { kind: 'vector', glyph: 'minus', size: 'size.{size}.icon', presentWhen: { expansion: ['expanded'], indicator: ['plus-minus'] }, note: 'The open indicator when the indicator is plus/minus.' },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the header row while it has keyboard focus.',
      },
      panel: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { expansion: ['expanded'] },
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'size.{size}.panel-pad-y', inlineLabel: 'size.{size}.pad-x' },
        children: ['content'],
        note: 'The disclosed content, present only while the item is open. Its inline inset matches the header, so the content lines up under the title.',
      },
      content: {
        kind: 'text',
        type: 'size.{size}.panel-type',
        wrap: true,
        presentWhen: { expansion: ['expanded'] },
        note: 'A placeholder paragraph. In code the panel holds any content.',
      },
      divider: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        height: 'divider-width',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        crossAxisFill: true,
        note: 'A hairline under the item that separates it from the next.',
      },
    },
    codeOnly: [
      'the heading wrapper — the header button sits inside an <hN> of the level `headingLevel` names (default 3). Figma has no heading level; the outline is a code contract.',
      'the panel region — role="region" with aria-labelledby pointing at the header button, and the button carries aria-expanded and aria-controls. A closed panel is `hidden` (out of the page, the tab order and assistive technology).',
      'the panel content — `children` takes any node. Figma draws one placeholder paragraph.',
      'the height animation — the panel eases open and closed (motion.transition.enter / exit); under reduced motion it snaps. Figma variants carry no motion.',
      'the asymmetric panel inset — the panel wants no top inset (the header\'s bottom padding already spaces it) and a larger bottom one; `PaddingDef.block` is one value for both, so the draft uses a small symmetric inset.',
      'the panel ink — the panel text paints the `label` slot, the header\'s interactive neutral ink, because a text part can ask only for `label`; it should be page ink (`color.text.primary`) that does not follow the header\'s hover or disabled state. A second text ink is an engine change.',
      'RTL — the header mirrors through logical properties: the indicator moves to the left edge and the title aligns right. The chevron and the plus/minus are vertically symmetric, so no glyph mirrors.',
      'text expansion — the title wraps; the header uses min-height, never a fixed height, and the indicator holds the first line.',
    ],
  },

  figmaProperties: {
    variantAxes: ['expansion', 'indicator', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    footprintVaries: ['expansion'],
    texts: {
      title: { part: 'label', default: 'Section title' },
      children: { part: 'content', default: 'Section content. Replace this with the text or components the section holds.', figmaName: 'content' },
    },
    booleans: {},
  },

  accessibility: {
    role: 'A native <button> with aria-expanded and aria-controls, inside an <hN>; the panel is role="region" with aria-labelledby pointing at the button. Native <details>/<summary> is the alternative where its styling and animation support are enough.',
    wcag: [
      '4.1.2 Name, Role, Value (a button that exposes aria-expanded)',
      '1.3.1 Info and Relationships (each header is a heading at the level the page outline needs)',
      '2.1.1 Keyboard (Enter and Space open and close; Tab reaches every header)',
      '2.4.3 Focus Order (each header is its own tab stop; when open, the next Tab moves into the panel)',
      '2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring around the header)',
      '1.4.1 Use of Color (open and closed differ by glyph, not by color)',
      '1.4.11 Non-text Contrast (the indicator glyph clears 3:1 against the page)',
      '2.5.5 Target Size (Enhanced), as intent (the whole header is the target, at least 44px tall on comfortable and spacious density)',
    ],
    keyboard: 'Tab moves from header to header, and into an open panel\'s content. Enter or Space opens and closes the focused header. There is no roving tab index. Up and Down between headers, and Home and End, are optional extras and must not trap focus.',
    focus: 'A focus ring around the header row on :focus-visible. Opening a section does not move focus.',
    aria: 'Hide the indicator glyph from assistive technology (aria-hidden="true"); the button\'s aria-expanded carries the state. Do not put role="tab" or a tablist on an accordion.',
  },

  content: {
    labelPattern: 'Concise, parallel noun phrases, or questions in an FAQ. The title says what the panel holds. Sentence case, no trailing colon.',
  },

  docs: {
    usage: 'Use an Accordion.Item on its own for one optional block of detail, such as a promo code field or shipping details. Stack several in an Accordion for a set of sections a user scans and opens on demand.',
    do: [
      'Make the whole header row the button, so the hit target is the full width',
      'Write titles that say what the section holds',
      'Let a long title wrap',
    ],
    dont: [
      'Hide content most users need. Show it instead.',
      'Put an accordion inside an accordion. For more than one level, use a tree.',
      'Truncate a title with an ellipsis',
    ],
    contentGuidelines: 'Titles are short, parallel noun phrases or questions, in sentence case, with no trailing colon.',
  },

  ai: {
    primaryPurpose: 'Show one section of content on demand, under a header the user opens and closes in place.',
    whenToUse: 'One optional block of detail on its own, or one section inside an Accordion.',
    avoidWhen: 'The user needs the content most of the time (show it), the sections are one-at-a-time peer views (tabs, not built yet), the content nests more than one level (a tree, not built yet), or the header navigates somewhere (a link).',
    commonPartners: ['accordion', 'icon', 'button', 'text-field'],
    triggerKeywords: ['accordion item', 'disclosure', 'collapsible section', 'expandable section', 'show more', 'details', 'expander'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [],
    planned: ['tabs', 'tree', 'divider', 'link'],
    replacesPatterns: ['a show/hide div with no aria-expanded or heading', 'a tablist used for vertical sections that open together'],
  },

  motion: {
    enter: 'The panel eases open to its content height (motion.transition.enter) and the chevron turns to point up.',
    exit: 'The panel eases closed (motion.transition.exit) and the chevron turns back.',
    reduceMotion: 'Under prefers-reduced-motion the panel opens and closes at the reduced duration (snapping, in practice), since the change is the information and the height movement is not.',
  },

  notes: {
    contested: [
      'The expansion axis name. `VARIANT_AXES` is closed and has no `expansion`; this draft adds it. The alternative is `selection: [collapsed, expanded]`, which misnames the distinction. Held for the owner.',
      'The indicator: chevron (field default) vs plus/minus (the design-rebuild test). An axis doubles the set; chevron-only keeps 30 members. Held for the owner.',
      'The header type: `type.body.{rung}.strong` (draft) vs `type.label.{rung}.emphasis` (14px snug, wraps tightly) vs `type.title.*` (the brand display face, loud). Held for the owner.',
      'The divider role: `color.border.secondary` (draft, "divider") vs `color.border.primary` (decorative ~1.4:1). Held for the owner.',
      'The contained (boxed card) variant from the brief is not drafted; flush only. Held for the owner.',
    ],
    unverified: [
      'The asymmetric panel inset needs `PaddingDef` to carry start and end block values; the draft uses a symmetric one.',
    ],
    evolution: [],
  },
};
