/**
 * Tooltip — a short line of text that names or describes the control under the pointer or keyboard focus, on the
 * inverse surface, with an arrow pointing at the control (KB brief: `components/tooltip.md`).
 *
 * ── THE OWNER'S SHAPE (the proposal on #4009, every OD at its recommendation; Q-FL2 on #4007 and #4009, 2026-11-19) ──
 *
 * OD-T1 A: hover and keyboard focus only, short plain text, never focusable. The "i" button that opens on press is a
 * Toggletip, a Popover recipe (the brief names it), not a Tooltip mode. OD-T2 A: an arrow, on by default, as a
 * boolean over four placement-gated glyph parts (the Switch.Control `state icon` pattern: disjoint gates, one node per
 * member). OD-T3 A: the arrow is centered on every member and `align` is code only. OD-X2 A: logical sides
 * `top | bottom | start | end`, so start and end swap under right-to-left with no rename. OD-T4 A: the show delay on
 * hover, at once on keyboard focus, at once inside the skip window. K6 B (overriding OD-T5's second half): description
 * by default; on an icon-only trigger the tooltip IS the name (label mode, `aria-labelledby`), never a hidden twin of
 * an `aria-label`. K7 A (owner, 2026-11-19, after the KB brief moved to a fade alone): a fade alone, with no
 * scale, no animation inside the skip window, and the reduced-motion fade under reduced motion. K8 A: an owned, dependency-free
 * positioning layer on the platform for the code proof of concept.
 *
 * ── THE SET: `placement` × 4, NO SCHEMA CHANGE ─────────────────────────────────────────────────────────────────────
 *
 * `placement` is already in `VARIANT_AXES` (Dialog's). The arrow's edge and the container's direction change between
 * members, which is layout, so the axis passes the variant rule (#3383, Q3 A). The container is a column at top and
 * bottom and a row at start and end (`directionWhen`); the arrow parts sit in the child list in the order that puts
 * each on the bubble's trigger side, and only one builds per member. `footprintVaries: ['placement']`, because the
 * arrow moves from the foot to the side.
 *
 * ── THE SURFACE (OD-X1: Tooltip is the inverse one, as Toast) ─────────────────────────────────────────────────────
 *
 * `color.inverse.background.primary` for the bubble AND the arrow, through one binding key (`fill`), so the two cannot
 * drift; `color.inverse.text.primary` for the label. No shadow and no border: the inverse surface separates itself
 * (Toast's pair measures 15.98:1 against the page in the lowest committed cell). `test.ts` measures the label on the
 * bubble over every committed brand and mode.
 *
 * ── THE NUMBERS WITH NO TOKEN (OD-T6, approved as placeholders) ──────────────────────────────────────────────────
 *
 * The arrow is a component-owned glyph (`component-glyphs.ts`, `tooltip-arrow-*`), built at a literal 8px (`glyphPx`),
 * an 8px base and a 4px tip. A vector part is square, so the far half of the arrow's 8px box is clear. The max width,
 * 240px, has no Figma projection: `wrap: 'hug'` (the field label's max-width wrap) requires the text's parent to be
 * the root, and the label sits inside the padded bubble. So Figma's bubble hugs its label on one line, and the wrap at
 * 240px is code (`codeOnly`). That is OWNER DECISION OD-TB1 A, decided (owner, 2026-11-19). The offset from
 * the trigger, `space.100` to the arrow's tip, is code: Figma has no trigger.
 */
import { ComponentDef } from '../component-schema';

export const tooltip: ComponentDef = {
  id: 'tooltip',
  name: 'Tooltip',
  aliases: ['hint', 'infotip', 'info-tip'],
  category: 'overlay',
  status: 'draft',
  summary: 'A short text label for the control under the pointer or focus. It never takes focus.',
  description:
    'A short line of plain text that names or describes a control. It shows when the pointer rests on the control or keyboard focus reaches it, and hides when both leave or the user presses Escape. It never takes focus and holds nothing interactive, and touch has no hover, so the information it shows must also be available another way. On an icon-only control it is the control\'s name; anywhere else it adds a description. Not a popover (anything interactive, or content opened by a press), not a toast (a status after an action), and not a field message (help or an error under a field).',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The text, a few words in plain text with no links or buttons. It wraps at the maximum width and never truncates.' },
    { name: 'placement', type: "enum: 'top' | 'bottom' | 'start' | 'end'", values: ['top', 'bottom', 'start', 'end'], default: 'top', required: false, description: 'The side of the control the tooltip prefers. It moves to the opposite side when there is no room. start and end follow the reading direction: start is the left in left-to-right text and the right in right-to-left text.' },
    { name: 'align', type: "enum: 'start' | 'center' | 'end'", values: ['start', 'center', 'end'], default: 'center', required: false, description: 'Where the tooltip lines up along its side of the control. The arrow stays pointed at the control\'s center.' },
    { name: 'arrow', type: 'boolean', default: true, required: false, description: 'Shows the arrow that points at the control. On by default.' },
    { name: 'kind', type: "enum: 'description' | 'label'", values: ['description', 'label'], default: 'description', required: false, description: 'description adds a description to a control that already has a name. label makes the tooltip the control\'s name, for an icon-only control, so the name is announced once.' },
    { name: 'delay', type: 'number', required: false, description: 'How long the pointer rests on the control before the tooltip shows, in milliseconds. Keyboard focus shows it at once.' },
    { name: 'closeDelay', type: 'number', required: false, description: 'How long the tooltip stays after the pointer leaves, in milliseconds, so the pointer can move onto it.' },
    { name: 'open', type: 'boolean', required: false, description: 'Whether the tooltip shows, when the app controls it. Leave it unset and the tooltip shows and hides by itself.' },
    { name: 'defaultOpen', type: 'boolean', default: false, required: false, description: 'Whether the tooltip shows at first, when the app does not control it.' },
    { name: 'onOpenChange', type: 'function', required: false, description: 'Called with true when the tooltip shows and false when it hides, for any reason.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Stops the tooltip showing. The control itself is unaffected.' },
    { name: 'children', type: 'node', required: true, description: 'The control the tooltip belongs to: one element that can take keyboard focus.' },
  ],

  // A tooltip has no interaction state of its own: it is shown or hidden, and shown is all the design file draws. The
  // brief's states (hidden, delayed, showing, closing) are timing, carried in `codeOnly`.
  states: [],
  variants: {
    // Top first: the code default, so Figma's first member is the code default too (Q347, Q359).
    placement: ['top', 'bottom', 'start', 'end'],
  },
  axisKinds: { placement: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // ── PAINT (OD-X1: the inverse surface, as Toast). One key paints the bubble and the arrow.
    'fill': 'color.inverse.background.primary',
    'label': 'color.inverse.text.primary',
    'radius': 'radius.md',
    // ── TYPE (OD-T6): the 14px body style, Toast's message.
    'type': 'type.body.sm.default',
    // ── SPACE (OD-T6): block 4, inline 8 at comfortable.
    'pad-y': 'space.050',
    'pad-x': 'space.100',
  },

  densitySpacing: ['pad-y', 'pad-x'],

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'presentation',
        // The arrow on the bubble's trigger side: under it at top, over it at bottom, after it at start, before it at
        // end. Only one arrow builds per member, so the order places it.
        children: ['bottomGlyph', 'endGlyph', 'bubble', 'topGlyph', 'startGlyph'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        directionWhen: { axis: 'placement', values: { top: 'column', bottom: 'column', start: 'row', end: 'row' } },
        note: 'Holds the bubble and its arrow, the arrow on the side facing the control. It paints nothing.',
      },
      bubble: {
        kind: 'box',
        // `target` because the schema requires exactly one: not an interaction claim (veil's use).
        role: 'target',
        paintSlots: ['fill'],
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        children: ['label'],
        note: 'The inverse surface behind the text, with rounded corners and no shadow.',
      },
      label: {
        kind: 'text',
        type: 'type',
        note: 'The text. It wraps at the maximum width and never truncates.',
      },
      topGlyph: {
        kind: 'vector',
        glyph: 'tooltip-arrow-down',
        glyphPx: 8,
        paintSlot: 'fill',
        optional: true,
        presentWhen: { placement: ['top'] },
        note: 'The arrow under the bubble, pointing down at the control, in the bubble\'s color. Shown by default.',
      },
      bottomGlyph: {
        kind: 'vector',
        glyph: 'tooltip-arrow-up',
        glyphPx: 8,
        paintSlot: 'fill',
        optional: true,
        presentWhen: { placement: ['bottom'] },
        note: 'The arrow over the bubble, pointing up at the control, in the bubble\'s color. Shown by default.',
      },
      startGlyph: {
        kind: 'vector',
        mirror: 'mirrors',
        glyph: 'tooltip-arrow-end',
        glyphPx: 8,
        paintSlot: 'fill',
        optional: true,
        presentWhen: { placement: ['start'] },
        note: 'The arrow at the bubble\'s end side, pointing at the control, in the bubble\'s color. Shown by default.',
      },
      endGlyph: {
        kind: 'vector',
        mirror: 'mirrors',
        glyph: 'tooltip-arrow-start',
        glyphPx: 8,
        paintSlot: 'fill',
        optional: true,
        presentWhen: { placement: ['end'] },
        note: 'The arrow at the bubble\'s start side, pointing at the control, in the bubble\'s color. Shown by default.',
      },
    },
    codeOnly: [
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'the tooltip element — `role="tooltip"` with an `id`, rendered in the top layer through the `popover="manual"` attribute, never inside the trigger. In description mode (the default) the trigger carries `aria-describedby` pointing at it; in label mode the trigger carries `aria-labelledby` pointing at it and no `aria-label`, so the name is announced once. The element stays in the DOM while hidden, so the reference always resolves. Never the `title` attribute.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'showing and hiding — it shows on pointer hover after `delay`, at once on keyboard focus (`:focus-visible`), and at once with no entry animation when the pointer moves from one tooltip trigger to another within the shared skip window. It hides when both the pointer and focus have left, after `closeDelay`, so the pointer can cross onto it; Escape hides it without moving focus. It never takes focus, never holds a focusable element, and never hides on a timer while it is hovered or focused.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'timing defaults — `delay`, `closeDelay` and the skip window are shared settings of a provider mounted once, so every tooltip on a page keeps the same rhythm. Their default values have no tokens yet; the ranges the field uses for them are with the motion gap batch (#3486).',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'positioning — anchored to the trigger with CSS anchor positioning, offset `space.100` from the trigger to the arrow\'s tip. With no room on its side it flips to the opposite one (`position-try-fallbacks: flip-block, flip-inline`), then shifts along its side to stay a `space.100` collision margin inside the viewport; a small owned fallback does the same where anchor positioning is missing. When it shifts, the arrow stays pointed at the trigger\'s center and never enters the bubble\'s corner radius, and a flipped tooltip turns its arrow with it. It never covers its own trigger. No positioning library.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'the maximum width — the bubble hugs its text up to 240px (`max-width: 240px`), then the text wraps onto more lines; it never truncates and never scrolls. The design file draws the bubble hugging one line.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'the alignment along a side — one centered member per side keeps the set at four, and the alignment is a position the layer computes. In code, the `align` prop\'s start and end line the bubble up with the matching edge of the trigger, and the arrow stays pointed at the trigger\'s center.',
      },
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'motion — show: opacity 0 to 1, a fade alone with no scale, on `motion.duration.fast` and `motion.easing-role.enter`. Hide: a fade on `motion.duration.instant` and `motion.easing-role.exit`. Inside the skip window it appears with no animation. Under `prefers-reduced-motion` both ways fade on `motion.duration-reduced.fast`.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL — start and end are logical: in right-to-left text a start tooltip sits on the trigger\'s right and its arrow flips to point at it, with no rename. The text is set in the document direction.',
      },
      {
        class: 'localization',
        disposition: 'unsupported',
        description:
          'text expansion — a translated label wraps at the maximum width onto more lines, never truncates; the bubble grows taller, not wider.',
      },
      {
        class: 'content-rule',
        disposition: 'refused',
        description:
          'the trigger — always focusable. On a control that is unavailable, use `aria-disabled="true"` (an IconButton\'s `isInactive`), never native `disabled`, which takes it out of the focus order so the tooltip can never be reached by keyboard.',
      },
      {
        class: 'deferred',
        disposition: 'refused',
        description:
          'out of scope — the Toggletip (an "i" button that opens on press, announced through a `role="status"` live region and usable on touch), rich content, links and buttons inside the bubble: each is a Popover.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['placement'],
    footprintVaries: ['placement'],
    texts: {
      label: { part: 'label', default: 'Tooltip text' },
    },
    booleans: {
      arrow: { part: ['topGlyph', 'bottomGlyph', 'startGlyph', 'endGlyph'], default: true, figmaName: 'arrow' },
    },
  },

  accessibility: {
    role: '`role="tooltip"`. It never takes focus. By default the control it belongs to points at it with `aria-describedby`; on an icon-only control the control points at it with `aria-labelledby` instead, and the tooltip is its name.',
    wcag: [
      '1.4.13 Content on Hover or Focus (Escape dismisses it without moving focus, the pointer can move onto it, and it stays while it is hovered or focused)',
      '1.4.3 Contrast (Minimum) (the text clears 4.5:1 on the inverse surface)',
      '1.4.4 Resize Text (targets it: the text wraps at the maximum width rather than truncating)',
      '2.1.1 Keyboard (keyboard focus shows it, the same as hover)',
      '2.5.3 Label in Name (in label mode the tooltip is the control\'s name, so the visible words and the name match)',
      '4.1.2 Name, Role, Value (in label mode the control takes its name from the tooltip)',
    ],
    keyboard: 'Tab to the control shows the tooltip at once. Escape hides it and leaves focus on the control. Moving focus away hides it. The tooltip itself is never in the focus order.',
    focus: 'Focus stays on the control. The tooltip never takes focus and holds nothing focusable.',
    aria: 'role="tooltip" on the tooltip. aria-describedby on the control by default, or aria-labelledby on an icon-only control, which then carries no aria-label. The tooltip stays in the page while hidden, so the reference always resolves. On an unavailable control use aria-disabled="true", never the native disabled attribute. The text is translatable; start and end swap sides in right-to-left text.',
  },

  content: {
    labelPattern: 'A few words in sentence case, with no period: "Add to favorites", "Copy link". On an icon-only control, name the action as a verb, never the icon\'s shape ("Close", not "X").',
  },

  docs: {
    usage: 'Use a Tooltip to name an icon-only control or to add a short description to a control, shown on hover and keyboard focus. Touch has no hover, so the tooltip never holds the only copy of what it says. Anything interactive, or content that opens on a press, is a Popover; a status after an action is a Toast; help under a field is a field message.',
    do: [
      'Use label mode when an icon-only control has a tooltip',
      'Keep it to a few words of plain text',
      'Keep the words the same as the control\'s accessible name',
      'Use `aria-disabled="true"` on an unavailable control that has a tooltip',
    ],
    dont: [
      'Put a link, a button or anything focusable in a tooltip. Use a popover.',
      'Put information only in a tooltip. Touch has no hover.',
      'Attach a tooltip to a natively disabled control. Keyboard focus cannot reach it.',
      'Use the title attribute instead',
      'Repeat a visible text label in a tooltip',
    ],
    contentGuidelines: 'Short and plain: the name of the action or one fact about it. No punctuation at the end, no formatting, nothing to click.',
  },

  ai: {
    primaryPurpose: 'Name or describe a control with a few words shown on hover and keyboard focus.',
    whenToUse: 'An icon-only control needs a visible name, or a control needs one short fact that its label does not carry, and the same information is also reachable without hover.',
    avoidWhen: 'The content has a link, a button or anything to act on, or opens on a press (a popover); it reports the result of an action (a toast); it is help or an error for a field (a field message); or it is the only place the information lives.',
    commonPartners: ['icon-button', 'flush-icon-button', 'button'],
    triggerKeywords: ['tooltip', 'hint', 'hover text', 'hover label', 'icon label', 'info tip'],
    generationPriority: 3,
  },

  composition: {
    composesWith: [],
    alternativeTo: ['field-message', 'popover'],
    replacesPatterns: ['the `title` attribute', 'a hover-only label with no keyboard route', 'a tooltip on a natively disabled control'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'A fade (motion.duration.fast, motion.easing-role.enter). Moving from one tooltip to the next soon after, it appears with no animation.',
    exit: 'A fade (motion.duration.instant, motion.easing-role.exit).',
    reduceMotion: 'Under prefers-reduced-motion, the same fade, at motion.duration-reduced.fast both ways.',
  },

  notes: {
    contested: [],
    unverified: [
      'That Figma builds a `glyphPx` vector inside an auto-layout column and row with the arrow centered on the bubble and abutting it, on a real file: the shim models it, no live file has measured it yet.',
      'That `motion.duration.fast` sits in the briefs\' 120 to 180ms range at every tempo (the Q-FL2 note).',
      'CSS anchor positioning\'s `position-try-fallbacks` support across the target browsers, against the owned fallback the positioning entry names.',
    ],
    evolution: [
      'Owner decisions (2026-11-19, on #4251), all as recommended: OD-TB1 A (the design file\'s bubble hugs one line; the 240px wrap is code only); OD-TB2 A (an 8px base and a 4px right-angled tip); OD-TB3 A (its own Tooltip page under Components; Popover gets its own page too); K7 A (a fade alone, with no scale, replacing the K7 B fade plus scale); N1 A (docs.do: use label mode when an icon-only control has a tooltip); Popover and Tooltip list each other in alternativeTo, replacing the planned entries, which lands with whichever of #4251 and #4252 merges second, because the list must be symmetric.',
      'Owner decisions: the proposal on #4009 with every OD at its recommendation (Q-FL2, 2026-11-19), read with the KB brief check on #4009 (8 agree, 2 conflict, 2 silent). K6 B: label mode on an icon-only trigger, not an `aria-hidden` twin of the `aria-label`. K7 B was built first and reopened (see the previous entry). K8 A: an owned positioning layer on the platform for the POC. OD-X2 A: logical sides. OD-T6: max width 240, offset `space.100`, an 8-unit arrow, `type.body.sm.default`, built as placeholders. Generation priority 3, as Badge: the proposal\'s Identity section, adopted with the rest in Q-FL2 (not the Tier 1 of #4001\'s table, a different scale).',
      'Motion presets: no preset registry exists in the engine yet (#2857 is a wireframe), so the proposed Tooltip / show and Tooltip / hide are this def\'s `motion` field and `codeOnly` entry only; nothing was added to a preset set.',
      'The brief\'s close delay and shared skip delay are props and a provider setting here; their default values go to the motion gap batch (#3486).',
    ],
  },
};
