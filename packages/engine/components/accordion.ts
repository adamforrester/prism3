/**
 * Accordion — ONE expand/collapse section: a header row that is the button, and the panel it opens below it
 * (KB brief: `components/accordion.md`).
 *
 * ── THE OWNER'S SHAPE (Q180 as revised by Q182, then Q183, 2026-10-10, #2417) ────────────────────────────────
 *
 * A SINGLE item, no group def: a designer stacks items, and the group's code contract (single or multiple open,
 * heading level, key arrays) lives in `codeOnly`. Forty-eight members: `expansion` × `iconPosition` × `indicator` ×
 * `size` × the state axis (rest, focus-visible). No hover (Q182), and no disabled or pressed member (Q183: accordions
 * are not really disabled, and only focus is added). The indicator is a BUILDING BLOCK, `_accordion-indicator`,
 * nested in the header (see that file for why).
 *
 * ── THE `indicator` AXIS (#2878, Q-block A, reversing Q183's exposed nested property) ────────────────────────
 *
 * The pair of glyphs (chevron or plus-minus) is a variant axis on the Accordion, and the nested indicator FOLLOWS it
 * per member, as it follows `expansion` and `size`. Q183 exposed the nested instance's `indicator` instead, to keep
 * the set at 24; on a published library a designer had to find the nested glyph inside each accordion to change it
 * (#2878), and the exposed override did not survive an `iconPosition` switch (two parts, two instances). Additive for
 * library consumers: `chevron` leads, so Update renames the existing 24 members to `indicator=chevron` in place,
 * keeping their node ids and keys, and builds the 24 plus-minus members (test-update-apply's published accordion arm).
 *
 * ── WHERE THE INDICATOR SITS (`iconPosition`, Q182: leading the default; the values named by Q242, the axis by the QA) ─
 *
 * A leading indicator stays beside the title under zoom and magnification (WCAG 1.4.10 reflow), where a trailing one
 * can drift off the visible area. `leading | trailing` (Q242) are Button's leading and trailing visuals and Switch
 * row's label position, and follow text direction. Node order is fixed per set, so the two positions are two parts,
 * `leadingIndicator` and `trailingIndicator`, each gated by `iconPosition`. The owner QA's centered header
 * (2026-10-12), revised by Q262 A and Q276 A: the glyph and the title share a `titleRow`, top-aligned so the glyph stays beside a
 * wrapped title's first line, and the header centers that row so a single line is centered under the 44px floor.
 * The axis is `iconPosition` because a bare `position` read as if it could be the label's (owner QA); its Figma name
 * reads `iconPosition` until variant axes can carry a display name ("icon position").
 *
 * ── THE PANEL IS A NATIVE FIGMA SLOT (Q182: "a swappable slot … the build checks whether Figma's native slot
 * feature fits better") ──────────────────────────────────────────────────────────────────────────────────────
 *
 * It does fit better, measured: a native slot takes whatever a designer drops into it on an instance, in place,
 * and keeps it across an expansion switch (to the collapsed member, which has no panel, and back). An
 * instance-swap slot would swap a whole component the designer must make first. So `content` declares
 * `contentSlot`; its default content is a placeholder paragraph in page ink (`body`, Q182's engine fix), and its
 * padding pads the top and the bottom differently (`blockEnd`, Q182's other engine fix).
 *
 * ── THE DIVIDER IS NESTED (Q182: "a Divider component is built first and nested here") ──────────────────────
 *
 * `divider` nests the Divider, stretched across the item (`crossAxisFill`). Measured on a real host: the stretch
 * overrides the Divider's 720px standalone length, and the stretched instance drops that width binding, so the
 * read-back expects none on it.
 */
import { ComponentDef } from '../component-schema';

export const accordion: ComponentDef = {
  id: 'accordion',
  name: 'Accordion',
  aliases: ['disclosure', 'collapse', 'expander', 'details', 'expansion-panel', 'collapsible'],
  category: 'navigation',
  status: 'draft',
  summary: 'One section that opens and closes in place under its header. The whole header row is the button.',
  description:
    'One expand and collapse section: a header that names the content, and a panel that opens below it. The whole header row is the button, and an indicator beside the title shows whether the section is open. Stack several for a set of sections a user scans and opens on demand, such as FAQs, settings groups or product details, or use one on its own for an optional block of detail. Not one-at-a-time peer panels (tabs), not a multi-level hierarchy (a tree), and not navigation.',

  props: [
    { name: 'title', type: 'node', required: true, description: 'The header text: a short noun phrase, or a question in an FAQ, that tells the user what the panel holds. It wraps rather than truncating.' },
    { name: 'children', type: 'node', required: true, description: 'The panel content. Hidden from the page, the tab order and assistive technology while the section is closed.' },
    { name: 'value', type: 'string', required: false, description: 'The key a group of accordions uses to track which sections are open. A stable key is safer than a position when sections are added or reordered.' },
    { name: 'defaultExpanded', type: 'boolean', default: false, required: false, description: 'Opens the section on first render when nothing controls it.' },
    { name: 'headingLevel', type: "enum: 2 | 3 | 4 | 5 | 6", values: ['2', '3', '4', '5', '6'], default: '3', required: false, description: 'The level of the heading that wraps the header button. Set it one below the heading the accordion sits under, so the page outline stays intact.' },
    { name: 'indicator', type: "enum: 'chevron' | 'plus-minus'", values: ['chevron', 'plus-minus'], default: 'chevron', required: false, description: 'The open and closed glyph: a chevron that points down when closed and up when open, or a plus that becomes a minus.' },
    { name: 'iconPosition', type: "enum: 'leading' | 'trailing'", values: ['leading', 'trailing'], default: 'leading', required: false, description: 'Which side of the title the indicator sits on, following text direction. leading keeps it beside the title when the page is zoomed; in right-to-left text, leading is the right edge.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The header\'s type, padding and indicator size. Every size keeps the header at least 44px tall.' },
  ],

  states: ['rest', 'focus-visible'],
  variants: {
    expansion: ['collapsed', 'expanded'],
    iconPosition: ['leading', 'trailing'],
    // #2878 (Q-block A): the pair of glyphs, on the Accordion itself. `chevron` leads, so an Update gives every member a
    // set built before the axis `indicator=chevron` in place and builds the plus-minus members beside them.
    indicator: ['chevron', 'plus-minus'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { expansion: 'runtime', iconPosition: 'authoring', indicator: 'authoring', size: 'authoring' },

  paintKeys: ['{slot}'],
  densitySpacing: ['size.{size}.pad-x', 'size.{size}.pad-y', 'size.{size}.gap', 'size.{size}.panel-pad-end'],

  tokens: {
    // ── INK (approved, Q241). The title is interactive neutral ink; the panel's placeholder is page ink (`body`).
    // The title TYPE is `type.label.{rung}.emphasis`, which every brand emits (owner decision, 2026-10-11, revising
    // Q182's `type.body.*.strong`: a brand emits body strong only if it adds that weight, and nb-redesign does not).
    'label': 'color.interactive.neutral.text.rest',
    'body': 'color.text.primary',
    // The ring is drawn INSIDE the header's edge (Q257 A, superseding Q243): offset 0, the fields' offset, and no stroke
    // compensation, so focus-ring's inside stroke sits within the header. A full-width header's outset ring was clipped by
    // an overflow-hidden container and covered the nested Divider by its stroke width (measured live, 2px).
    'ring-offset': 'focus.ring.offset-field',

    // ── PER SIZE (the padding pending the owner's visual QA, Q241). The header floor is 44px at every size (Q182): `size.md.min-height` at small and medium,
    // `size.lg.height` at large. Size moves the type, the padding and the indicator's line box.
    'size.small.min-height': 'size.md.min-height',
    'size.small.pad-x': 'space.150',
    'size.small.pad-y': 'space.100',
    'size.small.gap': 'space.100',
    'size.small.type': 'type.label.sm.emphasis',
    'size.small.panel-type': 'type.body.sm.default',
    'size.small.panel-pad-top': 'space.0',
    'size.small.panel-pad-end': 'space.150',
    'size.small.title-offset': 'space.025',
    'size.medium.min-height': 'size.md.min-height',
    'size.medium.pad-x': 'space.200',
    'size.medium.pad-y': 'space.150',
    'size.medium.gap': 'space.150',
    'size.medium.type': 'type.label.md.emphasis',
    'size.medium.panel-type': 'type.body.md.default',
    'size.medium.panel-pad-top': 'space.0',
    'size.medium.panel-pad-end': 'space.200',
    'size.medium.title-offset': 'space.025',
    'size.large.min-height': 'size.lg.height',
    // Q338 A (#2726): 20 at large, not the fields' 24, so the inline padding steps 12/16/20. The panel's inline inset is this key too.
    'size.large.pad-x': 'space.250',
    'size.large.pad-y': 'space.200',
    'size.large.gap': 'space.200',
    'size.large.type': 'type.label.lg.emphasis',
    'size.large.panel-type': 'type.body.lg.default',
    'size.large.panel-pad-top': 'space.0',
    'size.large.panel-pad-end': 'space.300',
    'size.large.title-offset': 'space.025',
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
        children: ['header', 'content', 'divider'],
        note: 'One section: the header, the panel when open, and the rule under it.',
      },
      header: {
        kind: 'box',
        role: 'target',
        // The header CENTERS its one flow child, `titleRow` (owner Q276 A): a single line is centered at every size,
        // type and density, where top alignment put all of the 44px floor's slack under it (6px high at small). A
        // wrapped title grows the row past the floor, and the header hugs it.
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        minHeight: 'size.{size}.min-height',
        padding: { block: 'size.{size}.pad-y', inlineLabel: 'size.{size}.pad-x' },
        children: ['titleRow', 'focusRing'],
        note: 'The header row and the hit target: the whole row is the button, so a click anywhere on it opens or closes the section.',
      },
      titleRow: {
        kind: 'box',
        role: 'presentation',
        // The glyph and the title, top-aligned INSIDE the row (owner Q262 A, kept by Q276 A): the glyph sits beside
        // the title's FIRST line, so a wrapped title keeps it there (#1009), and the title's 2px offset (`titleBox`)
        // centers line one on the glyph. Named for the title-row building block (#2456, Q267 A), which can take this
        // part's place as a nested instance.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        grow: true,
        gap: 'size.{size}.gap',
        children: ['leadingIndicator', 'titleBox', 'trailingIndicator'],
        note: 'The indicator and the title, side by side. The header centers this row, and the glyph inside it stays beside the title\'s first line.',
      },
      leadingIndicator: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { iconPosition: ['leading'] },
        // Prism2's icon container (Q262): as tall as the title row, its glyph at the top.
        layout: { direction: 'row', align: 'start', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        children: ['leadingGlyph'],
        note: 'The indicator before the title: as tall as the title row, with the glyph at its top, beside the title\'s first line.',
      },
      leadingGlyph: {
        kind: 'nest',
        nests: '_accordion-indicator',
        nesting: { kind: 'nest-fixed', variant: { indicator: 'chevron', expansion: 'collapsed', size: 'medium' }, follow: ['indicator', 'expansion', 'size'] },
        note: 'The open and closed glyph. It follows the Accordion\'s indicator, open state and size.',
      },
      titleBox: {
        kind: 'box',
        role: 'presentation',
        // Prism2's text column, and its 2px icon offset mirrored onto the title (Q262): every brand's title line
        // (label type at the snug line height) is SHORTER than the glyph, so the title is padded down 2px (space.025)
        // to center its first line on the glyph, within 1px at every size.
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        paddingTop: 'size.{size}.title-offset',
        children: ['label'],
        note: 'The title\'s column. It fills the row, and sits 2px lower than the glyph so the first line centers on it.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type',
        wrap: true,
        note: 'The section title. It fills the row and wraps onto more lines rather than truncating.',
      },
      trailingIndicator: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { iconPosition: ['trailing'] },
        // Prism2's icon container (Q262): as tall as the title row, its glyph at the top.
        layout: { direction: 'row', align: 'start', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        children: ['trailingGlyph'],
        note: 'The indicator after the title: as tall as the title row, with the glyph at its top, beside the title\'s first line.',
      },
      trailingGlyph: {
        kind: 'nest',
        nests: '_accordion-indicator',
        nesting: { kind: 'nest-fixed', variant: { indicator: 'chevron', expansion: 'collapsed', size: 'medium' }, follow: ['indicator', 'expansion', 'size'] },
        note: 'The open and closed glyph, after the title.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        drawnInside: true,
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, drawn inside the header row\'s edge while it has keyboard focus (Q257), so it never overlaps the Divider or gets clipped.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { expansion: ['expanded'] },
        contentSlot: true,
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'size.{size}.panel-pad-top', blockEnd: 'size.{size}.panel-pad-end', inlineLabel: 'size.{size}.pad-x' },
        children: ['placeholder'],
        note: 'The panel, present only while the section is open: a slot that holds whatever content the section needs. Its inline inset matches the header.',
      },
      placeholder: {
        kind: 'text',
        type: 'size.{size}.panel-type',
        paintSlot: 'body',
        wrap: true,
        // Literal copy (approved, Q241): a slot's text can carry no TEXT property, so the designer edits or replaces it in place.
        characters: 'Section content. Replace this with the text or components the section holds.',
        note: 'Placeholder content. Replace it with the text or components the section holds.',
      },
      divider: {
        kind: 'nest',
        nests: 'divider',
        nesting: { kind: 'nest-fixed', variant: { orientation: 'horizontal', inset: 'none' } },
        crossAxisFill: true,
        note: 'The rule under the section, separating it from the next. It spans the section\'s width.',
      },
    },
    codeOnly: [
      'the heading wrapper — the header button sits inside an <hN> of the level `headingLevel` names (default 3). Figma has no heading level; the outline is a code contract.',
      'the panel region — role="region" with aria-labelledby pointing at the header button, and the button carries aria-expanded and aria-controls. A closed panel is `hidden` (out of the page, the tab order and assistive technology). Leave the region role off when more than about six panels can be open at once, so the page does not fill with landmarks.',
      'the panel content — `children` takes any node. Figma draws a placeholder paragraph in the slot, which a designer replaces.',
      'native first — <details> and <summary> give the expand, collapse, keyboard and focus behavior with no script, and `name="…"` on a set of them makes a single-open group. Custom ARIA (a button with aria-expanded) is the path for controlled state.',
      'a group of accordions — a stack of items, no Figma def (owner decision). In code, a group takes `type: "multiple" | "single"` (default multiple: comparing two sections needs both open), `value` / `defaultValue` / `onValueChange` as key arrays, and `headingLevel`, `indicator` and `size` for every item. All sections may be closed. Wrapped in a list (<ul>/<li>) only in a group, never on a single item.',
      'the hover — no hover member and no hover wash (owner decision); the header shows the pointer cursor only.',
      'the height animation — the panel eases open and closed (motion.transition.enter / exit); under prefers-reduced-motion it opens and closes at the reduced duration. Figma variants carry no motion.',
      'RTL — the header mirrors through logical properties: a leading indicator moves to the right edge and the title aligns right. No glyph mirrors.',
      'text expansion — the title wraps; the header uses min-height, never a fixed height, and the indicator centers on the title.',
      'scroll into view — after a section opens, scroll its header into view (`scrollIntoView({ block: "nearest" })` on the next frame) so a tall panel does not push it off screen.',
    ],
  },

  figmaProperties: {
    variantAxes: ['expansion', 'iconPosition', 'indicator', 'size'],
    // The panel reads "icon position" (owner, 2026-10-12; #2571), as Button's `leading` slot axis reads "leading icon".
    variantAxisNames: { iconPosition: 'icon position' },
    stateAxis: { name: 'state', values: ['rest', 'focus-visible'] },
    gridAxis: 'state',
    footprintVaries: ['expansion'],
    texts: {
      title: { part: 'label', default: 'Section title' },
    },
    booleans: {},
  },

  accessibility: {
    role: 'A native <button> with aria-expanded and aria-controls, inside an <hN>; the panel is role="region" with aria-labelledby pointing at the button. Native <details> and <summary> are the alternative where their styling and animation support are enough.',
    wcag: [
      '4.1.2 Name, Role, Value (a button that exposes aria-expanded)',
      '1.3.1 Info and Relationships (each header is a heading at the level the page outline needs)',
      '2.1.1 Keyboard (Enter and Space open and close; Tab reaches every header)',
      '2.4.3 Focus Order (each header is its own tab stop; when open, the next Tab moves into the panel)',
      '2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring around the header)',
      '1.4.1 Use of Color (open and closed differ by glyph, not by color)',
      '1.4.10 Reflow, as intent (a leading indicator stays beside the title when the page is zoomed)',
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
    usage: 'Use an Accordion to compress a set of independent sections into scannable headers, such as FAQs, settings groups, filter panels or product details, or on its own for one optional block of detail, such as a promo code field. Let several be open at once unless space is very tight.',
    do: [
      'Make the whole header row the button, so the hit target is the full width',
      'Write titles that say what the section holds',
      'Let a long title wrap',
      'Let every section be closed',
    ],
    dont: [
      'Hide content most users need. Show it instead.',
      'Force one section to stay open. If one view must always show, use tabs.',
      'Put an accordion inside an accordion. For more than one level, use a tree.',
      'Truncate a title with an ellipsis',
    ],
    contentGuidelines: 'Titles are short, parallel noun phrases or questions, in sentence case, with no trailing colon.',
  },

  ai: {
    primaryPurpose: 'Show a section of content on demand, under a header the user opens and closes in place.',
    whenToUse: 'A set of independent sections a user scans and opens on demand (FAQs, settings, product details), or one optional block of detail on its own.',
    avoidWhen: 'The user needs the content most of the time (show it), the sections are one-at-a-time peer views (tabs), the content nests more than one level (a tree, not built yet), or the header navigates somewhere (a link).',
    commonPartners: ['tabs', 'divider', 'icon', 'button', 'text-field'],
    triggerKeywords: ['accordion', 'disclosure', 'collapsible section', 'expandable section', 'faq', 'show more', 'details', 'expander'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['_accordion-indicator', 'focus-ring', 'divider'],
    alternativeTo: ['tabs'],
    replacesPatterns: ['a show/hide div with no aria-expanded or heading', 'a tablist used for vertical sections that open together'],
    supersededBy: [],
    planned: ['tree'],
  },

  motion: {
    enter: 'The panel eases open to its content height (motion.transition.enter), and the indicator turns to its open glyph.',
    exit: 'The panel eases closed (motion.transition.exit), and the indicator turns back.',
    reduceMotion: 'Under prefers-reduced-motion the panel opens and closes at the reduced duration, since the change is the information and the height movement is not.',
  },

  notes: {
    contested: [
      'PENDING THE OWNER\'S VISUAL QA (Q241): the block padding (8/12/16), the gap (8/12/16) and the panel\'s bottom inset (12/16/24). Decided since: the inline padding steps 12/16/20 at the header and the panel alike (Q338 A, revising 24 at large; the fields keep 24), and the panel keeps its own padding, aligned to the header edge rather than to the title (Q339 A). Approved in Q241: the inks (`interactive.neutral.text.rest` for the title, `text.primary` for the panel placeholder), the Figma copy ("Section title", and the panel placeholder), the property names, the page placement and the prose.',
      'A flush style only: the brief\'s contained (boxed card) variant is not built.',
      'DRAFT (#2646), for the owner: the panel slot (`content`) declares no constraint. No minimum or maximum child count, no preferred components and not preferred-only, and a new instance shows the placeholder. A section holds whatever its content is (text, a list, a form, an image), so any limit here would flag ordinary use.',
    ],
    unverified: [
      'That the native slot behaves the same on a designer\'s instance in every Figma plan: slots were measured in one file; a plan without the feature keeps the panel as a plain frame, and the build says so.',
    ],
    evolution: [
      'Owner decisions: Q180 (a design proposal), Q182 (one item, no group def; an indicator before or after the title, before the default; no hover; the content a swappable slot; a nested Divider; the expansion axis; the body type; the 44px floor; three sizes; reduced motion through the duration tokens; the two engine fixes), Q183 (the building-block indicator, 24 members, no disabled and no pressed), Q242 (the position values `leading | trailing`, as Button and Switch row name theirs), Q243 (the header\'s focus ring on its edge, `focus.ring.offset-field`), and the owner\'s QA of the live build (2026-10-12): the header centered, the glyphs one rung smaller (16/20/24), Q257 A (the ring drawn inside the header\'s edge), and `position` renamed `iconPosition`; Q262 A and Q266 A (the glyph beside the title\'s first line, the title padded 2px down); Q276 A (the glyph and the title in a `titleRow` the header centers, so a single line is centered under the 44px floor at every size); Q338 A (the large inline padding 24 → 20, `space.250`, so the side padding steps 12/16/20) and Q339 A (no change: the panel keeps its own padding). #2878 (Q-block A, 2026-10-25): the indicator pair is an `indicator` axis on the Accordion, which the nested indicator follows, so the set is 48 members and the nested instance is no longer exposed.',
    ],
  },
};
