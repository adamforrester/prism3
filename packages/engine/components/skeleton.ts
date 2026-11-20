/**
 * Skeleton — a content-shaped placeholder for the initial load of a known layout (#4109, owner decisions OD-S1 to
 * OD-S7 all A, 2026-11-19; Q-AT2 on #4001). It completes the loading set beside Spinner (a short wait with no shape)
 * and Progress (measurable work): a skeleton reserves the final content's box, so nothing shifts when the content
 * arrives.
 *
 * KB brief: `components/skeleton.md`. Category `foundations`, the brief's, beside Spinner. The brief was read as it is
 * quoted and paraphrased in the proposal (#4109): this lane had no checkout of the knowledge base.
 *
 * ── ONE PRIMITIVE, A SHAPE AXIS (OD-S2 A) ────────────────────────────────────────────────────────
 *
 * Three shapes, `text`, `circle` and `rect`, composed by the consumer inside the real layout (a card, a list row),
 * never one page-sized skeleton. Explicit dimensions only: a skeleton that derives its size from hidden children
 * renders 0×0 on the server and then shifts, so code never auto-derives (the brief settles it).
 *
 * ── THE FIGMA SET (OD-S6 A) ──────────────────────────────────────────────────────────────────────
 *
 * Four members: `shape` [text, circle, rect] × `size` [medium, small], with `small` on text only
 * (`excludeCoordinates`). Text draws three line rows, each one body line box tall, with a bar inside each at the
 * stepped ragged-right widths (100 / 80 / 40%). Rect fills its built 320×180 and resizes freely. Circle fills its
 * built 40×40 square, the medium avatar size, and resizes with the instance.
 *
 * NOT LOCKED (OD-S6 A asked for a 1:1 lock; flagged in the PR). `aspectRatio` reads its proportion off a variant
 * axis whose every value is a `W:H` ratio, and Skeleton's `shape` axis is not one. A lock on an inner box that binds
 * its width would not help either: resizing the instance would resize the root around a circle that stays bound.
 * The lock has to sit on the root at `shape=circle` only, which needs a schema change, held for the owner.
 *
 * ── PAINT: ONE SURFACE IN PIECES ─────────────────────────────────────────────────────────────────
 *
 * The three bars and the block are one painted surface split by layout, so they share `fill` through a
 * `paintGroup` (#3051, Divider's precedent). `fill` binds `color.background.tertiary` (OD-S4 A), the recessed
 * neutral, so a skeleton reads on the page and on a `background.secondary` card. The container and the line rows
 * paint nothing.
 *
 * ── TWO GEOMETRY CALLS THE PROPOSAL LEFT TO THE BUILD (flagged in the PR) ────────────────────────────
 *
 * 1. THE BAR HEIGHT (OD-S5 A, "about two thirds of the line box, centered, as a def-local literal ratio"). Figma
 *    binds a variable, not an expression, and no rung is two thirds of a body line box, so the line row carries a
 *    fixed `space.050` inset above and below and the bar fills what is left: 24 − 8 = 16 at medium (two thirds) and
 *    21 − 8 = 13 at small (0.62). The inset is off `densitySpacing`, so density does not move it.
 * 2. THE STEPPED WIDTHS. Figma's auto layout has no percentage width. The first bar grows across its row; the second
 *    and third are built at 80% and 40% of the 320 build width as literal floors (256 and 128, the `minWidth`
 *    posture, no token), so a resized instance keeps those two at their pixel widths. Code sets the percentages.
 */
import { ComponentDef } from '../component-schema';

export const skeleton: ComponentDef = {
  id: 'skeleton',
  name: 'Skeleton',
  // The brief's map less `ghost` (OD-S1 A): a ghost button was retired, and the word should still reach nothing.
  aliases: ['placeholder', 'loading-placeholder', 'shimmer', 'skeleton-text', 'skeleton-avatar', 'skeleton-image'],
  category: 'foundations',
  status: 'draft',
  summary: 'Content-shaped placeholder for a first load. Reserves the box so nothing shifts on arrival.',
  description:
    'A quiet placeholder shaped like the content it stands for: lines of text, a circle for an avatar, or a rectangle for media or a card. It holds the final content\'s box during the first load of a known layout, so nothing moves when the content arrives. Compose skeletons inside the real layout, one per macro part of an item. A skeleton is hidden from assistive technology; the region that is loading carries the busy state and the one status message. In code it pulses softly, and the pulse stops under reduced motion.',

  props: [
    { name: 'shape', type: "enum: 'text' | 'circle' | 'rect'", values: ['text', 'circle', 'rect'], default: 'text', required: false, description: 'What the skeleton stands for: lines of text, a circle for an avatar, or a rectangle for media, a card or a block of content.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'Text only: the body text size the lines stand for, so each line takes the height of a line of that text.' },
    { name: 'lines', type: 'number', default: 3, required: false, description: 'Text only: how many lines to draw. Every line runs the full width except the last two, which step down to about 80% and 40%, the shape of a ragged paragraph.' },
    { name: 'width', type: 'string', default: '100%', required: false, description: 'A CSS length. Text and rect fill the width they are placed in by default; a circle takes its diameter from this.' },
    { name: 'height', type: 'string', required: false, description: 'A CSS length, required for a rect: set it to the height of the content it stands for, so the layout does not shift when that content arrives.' },
    { name: 'animation', type: "enum: 'pulse' | 'shimmer' | 'none'", values: ['pulse', 'shimmer', 'none'], default: 'pulse', required: false, description: 'The pulse fades the shape between two opacities; the shimmer sweeps a highlight across it in the reading direction. Both stop under reduced motion, and the shape stays.' },
  ],

  // `[]`: one visible condition, shown, and unmounted when the content arrives. The anti-flash windows are timing,
  // not states (`codeOnly`).
  states: [],

  variants: {
    shape: ['text', 'circle', 'rect'],
    // Medium leads, the code default (#2752).
    size: ['medium', 'small'],
  },
  axisKinds: { shape: 'authoring', size: 'authoring' },

  // One slot, `fill`, constant across the set: the shape changes the geometry, never the paint.
  paintKeys: ['{slot}'],

  tokens: {
    // OD-S4 A: the recessed neutral, so the shape reads on the page and on a `background.secondary` card.
    fill: 'color.background.tertiary',
    // A line row is one body line box tall, so a skeleton line takes the height of the text it stands for.
    'size.medium.line-box': 'type.body.md.line-box',
    'size.small.line-box': 'type.body.sm.line-box',
    // The fixed inset above and below each bar (OD-S5, see the header). Not on `densitySpacing`.
    'bar-inset': 'space.050',
    'bar-inline': 'space.0',
    // One corner per shape: the text bars, the rect and the circle.
    'text.radius': 'radius.sm',
    'rect.radius': 'radius.md',
    'circle.radius': 'radius.round',
    // THE MOTION, AS BINDINGS (Spinner's pattern): the names `motion` and `codeOnly` give in prose. No part binds them.
    'motion.pulse': 'motion.duration.sweep',
    'motion.pulse-easing': 'motion.easing-role.default',
    'motion.swap': 'motion.duration.fast',
    'motion.swap-reduced': 'motion.duration-reduced.fast',
    'motion.swap-easing': 'motion.easing-role.enter',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // The schema needs one target; nothing here is interactive.
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        // Text and rect are built at 320 wide, the fields' width, and fill what they are placed in; rect is 180 tall
        // (16:9) and its block grows down it. Circle is built at 40×40, the medium avatar size (a literal, as Dialog's
        // widths are, so `CONTRACT_VERSION` does not move), and the same block, fully round, fills it.
        builtSize: { axis: 'shape', widths: { text: 320, circle: 40, rect: 320 }, heights: { circle: 40, rect: 180 }, grow: 'block' },
        children: ['firstLine', 'middleLine', 'lastLine', 'block'],
        note: 'The box the skeleton holds open for the content. It paints nothing.',
      },
      firstLine: {
        kind: 'box', mirror: 'reverses',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        height: 'size.{size}.line-box',
        padding: { block: 'bar-inset', inlineLabel: 'bar-inline' },
        crossAxisFill: true,
        presentWhen: { shape: ['text'] },
        children: ['firstBar'],
        note: 'The first line: one line of body text tall, so the lines keep the rhythm of the text they stand for.',
      },
      firstBar: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fill' } },
        radius: '{shape}.radius',
        grow: true,
        crossAxisFill: true,
        paintSlots: ['fill'],
        paintGroup: 'shape',
        note: 'The bar on the first line, the full width, centered in its line.',
      },
      middleLine: {
        kind: 'box', mirror: 'reverses',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        height: 'size.{size}.line-box',
        padding: { block: 'bar-inset', inlineLabel: 'bar-inline' },
        crossAxisFill: true,
        presentWhen: { shape: ['text'] },
        children: ['middleBar'],
        note: 'The middle line, the same height as the first.',
      },
      middleBar: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fill' } },
        // 80% of the 320 build width (see the header).
        minWidth: 256,
        radius: '{shape}.radius',
        crossAxisFill: true,
        paintSlots: ['fill'],
        paintGroup: 'shape',
        note: 'The bar on the middle line, about 80% of the width.',
      },
      lastLine: {
        kind: 'box', mirror: 'reverses',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        height: 'size.{size}.line-box',
        padding: { block: 'bar-inset', inlineLabel: 'bar-inline' },
        crossAxisFill: true,
        presentWhen: { shape: ['text'] },
        children: ['lastBar'],
        note: 'The last line, the same height as the others.',
      },
      lastBar: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fill' } },
        // 40% of the 320 build width (see the header).
        minWidth: 128,
        radius: '{shape}.radius',
        crossAxisFill: true,
        paintSlots: ['fill'],
        paintGroup: 'shape',
        note: 'The bar on the last line, about 40% of the width, so the lines end like a ragged paragraph.',
      },
      block: {
        kind: 'box', mirror: 'never',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fill', y: 'fill' } },
        radius: '{shape}.radius',
        crossAxisFill: true,
        presentWhen: { shape: ['circle', 'rect'] },
        paintSlots: ['fill'],
        paintGroup: 'shape',
        note: 'The shape for media, a card or an avatar: a rectangle with rounded corners, or a circle. It fills the skeleton and resizes with it; hold Shift while resizing a circle to keep it round.',
      },
    },
    // No entry leads with `shape`, `size` or a state name (`admits()`, #867).
    codeOnly: [
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'the pulse and the shimmer — in code the pulse fades the whole shape between two opacities, one cycle every `var(--motion-duration-sweep)` (Progress\'s `motion.duration.sweep`, so no token is minted) on `var(--motion-easing-role-default)`, repeating until the content arrives (OD-S3 A). `animation="shimmer"` sweeps a highlight in `color.background.secondary` across the shape in the reading direction, one pass per period, animating `transform` on a pseudo-element, never `background-position`, so low-end devices keep the frame rate. `animation="none"` draws the still shape. Figma holds the still frame.',
      },
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'reduced motion — under `@media (prefers-reduced-motion: reduce)` the pulse and the shimmer stop and the shape stays, still. The shape carries the meaning, so a still shape is enough; this is the opposite of Spinner, whose turn is the cue and only slows.',
      },
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'the content swap — the host replaces the skeleton with the content, at once or with a short crossfade on `var(--motion-duration-fast)` and `var(--motion-easing-role-enter)` (`var(--motion-duration-reduced-fast)` under reduced motion: opacity is not vestibular). Never a long fade over content that is already there. Skeleton has no `loading` prop; the swap is the host\'s or the app\'s.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'anti-flash windows — the host waits a short delay before showing the skeleton, so a fast load shows nothing, and once shown keeps it a minimum time so it does not flash for a frame. The figures wait on the show-delay and minimum-show tokens (#3486); until then the host owns both timers, as with Spinner.',
      },
      {
        class: 'announcement',
        disposition: 'refused',
        description:
          'announcement — Skeleton never speaks (OD-S7 A). Every shape carries `aria-hidden="true"`. The region that holds the skeletons carries `aria-busy="true"` until its content arrives, then `false`, and owns one polite `role="status"` region, present and empty before the skeletons show, into which a descriptive label is written ("Loading order history", not a bare "Loading"). So ten skeletons in one card announce once. Focus never moves to the loaded content unless the load was the user\'s own action.',
      },
      {
        class: 'live-geometry',
        disposition: 'lowered',
        description:
          'the line widths — code sets every line to 100% of its width except the last two, at about 80% and 40%, for any `lines` count. Figma\'s auto layout has no percentage width, so the set draws three lines: the first grows across its row and the second and third are built at 256 and 128 (80% and 40% of the 320 build width) and keep those widths when an instance is resized. A designer stacks a second instance for more lines.',
      },
      {
        class: 'live-geometry',
        disposition: 'lowered',
        description:
          'the bar height — the bar is about two thirds of its line box, centered (OD-S5 A). Code computes it from the line box; Figma binds a variable, not an expression, so the line row carries a fixed `space.050` inset above and below and the bar fills the rest: 16 of 24 at medium, 13 of 21 at small.',
      },
      {
        class: 'live-geometry',
        disposition: 'lowered',
        description:
          'explicit dimensions — a rect takes the `width` and `height` of the content it stands for and a circle its diameter; nothing is derived from hidden children, which renders 0×0 on the server and then shifts. A host passes its own radius and aspect ratio, so the skeleton matches the content it replaces.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'right-to-left — the shapes are symmetric and do not mirror. Each line\'s bar starts at the start edge through logical properties, so under RTL the short lines end short of the left edge, and the shimmer sweeps in the reading direction, right to left. A composed skeleton layout follows its own layout.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['shape', 'size'],
    // Small is a text size; circle and rect have one member each.
    excludeCoordinates: [{ shape: ['circle', 'rect'], size: ['small'] }],
    // The parts change with the shape (`presentWhen`), so the box does too.
    footprintVaries: ['shape'],
    booleans: {},
  },

  accessibility: {
    role: 'none: every shape is hidden with `aria-hidden="true"`. The region that is loading carries `aria-busy` and owns one polite status message.',
    wcag: [
      '1.1.1 Non-text Content (the shapes are decorative and hidden)',
      '4.1.2 Name, Role, Value (the loading region carries `aria-busy` until its content arrives)',
      '4.1.3 Status Messages (one polite status message per loading region, with no focus move)',
      '2.2.2 Pause, Stop, Hide (targets: the pulse runs only while the content loads)',
      '2.3.3 Animation from Interactions (targets: the pulse and the shimmer stop under reduced motion)',
    ],
    focus: 'None. Nothing in a skeleton takes focus, and focus does not move to the loaded content unless the load was the user\'s own action.',
    aria: 'Set `aria-hidden="true"` on every skeleton; a screen reader never reads the shapes. On the region that is loading, set `aria-busy="true"` until its content arrives, then false. Keep one polite `role="status"` region present and empty before the skeletons show, and write a descriptive, translatable label into it ("Loading order history"), so a region of many skeletons announces once. The shapes do not mirror in right-to-left; the shimmer runs in the reading direction.',
  },

  content: {
    labelPattern: 'A skeleton carries no text. The loading region\'s status message names what is loading, in sentence case: "Loading order history", not a bare "Loading".',
  },

  docs: {
    usage: 'Use a skeleton for the first load of a layout you already know: a card, a list row, a profile header. Build it inside the real layout and abstract each item to its main parts, one circle, two lines and one rectangle, rather than one shape per badge or icon. Give a rect the size of the content it stands for and a circle its diameter, so nothing shifts when the content arrives. Hide every skeleton from assistive technology, and let the region that is loading carry `aria-busy` and one status message. For a short wait inside a control, use a spinner; for work with a known length, use progress.',
    do: [
      'Match the skeleton to the content it replaces: the same box, radius and proportion',
      'Abstract a complex item to its main parts: one circle, two lines, one rectangle',
      'Set `aria-hidden="true"` on every skeleton and `aria-busy` on the region that is loading',
      'Announce the load once, from the region, with a label that names it ("Loading order history")',
      'Let the host wait a moment before showing the skeleton, so a fast load does not flash',
    ],
    dont: [
      'Draw a skeleton that does not match the layout that arrives; a mismatched skeleton is worse than none',
      'Build one page-sized skeleton; compose small ones inside the real layout',
      'Use a skeleton for a short wait inside a control (use a spinner) or for work with a known length (use progress)',
      'Use a skeleton for an empty result; that is an empty state',
      'Let each skeleton announce itself; ten skeletons in one card should announce once',
      'Fade slowly from the skeleton to content that is already there',
    ],
    contentGuidelines: 'The shapes hold no copy. The status message names what is loading, in sentence case ("Loading order history"), and is written once for the region.',
  },

  ai: {
    primaryPurpose: 'Hold the shape and box of content that is loading for the first time, so the layout does not shift when it arrives.',
    whenToUse: 'The first load of a layout whose shape is known: a card, a list row, a profile header, a media frame. Compose text, circle and rect skeletons inside the real layout, sized to the content they stand for.',
    avoidWhen: 'The wait is short and inside a control (Spinner), the work has a known length (Progress), the result is empty (an empty state), the layout is not known in advance (a spinner in the region), or the content is already on screen and only refreshing.',
    commonPartners: ['spinner', 'progress', 'image-placeholder', 'list-item'],
    triggerKeywords: ['skeleton', 'skeleton screen', 'loading placeholder', 'content placeholder', 'shimmer', 'skeleton text', 'skeleton avatar', 'skeleton image', 'placeholder lines', 'loading state'],
    generationPriority: 3,
  },

  composition: {
    // Nests nothing.
    composesWith: [],
    alternativeTo: ['spinner', 'progress'],
    planned: ['avatar', 'card'],
    replacesPatterns: ['a page-sized loading illustration', 'a gray box with no relation to the content that arrives'],
  },

  motion: {
    enter: 'Shown at once when the host mounts it, after the host\'s short delay. The content replaces it at once or with a short crossfade on `motion.duration.fast` and `motion.easing-role.enter`.',
    exit: 'Replaced by the content; no exit of its own.',
    reduceMotion: 'The pulse runs one cycle every `motion.duration.sweep` while the content loads. Under prefers-reduced-motion the pulse and the shimmer stop and the shape stays still; the content crossfade, if any, runs on `motion.duration-reduced.fast`.',
  },

  notes: {
    contested: [
      'REDUCED MOTION STOPS THE PULSE, which the motion skill\'s R7 would not do for a functional loop (it slows Spinner and the Progress sweep). The brief settles it for a skeleton, and the owner approved it (OD-S3 A): the shape carries the meaning, so a still shape loses nothing, where a frozen spinner reads as a crash. The skill names only the spinner and the sweep, so it does not yet say this.',
      'THE PULSE IS NOT CAPPED at a number of cycles (the skill\'s R8, and SC 2.2.2\'s five seconds). It runs while the content loads and ends when the content arrives, the functional-loop rule; a load past about five seconds should move to a spinner or a progress bar in the region. Stated as intent in `accessibility.wcag`.',
      'THE FILL IS `background.tertiary` (OD-S4 A), one step darker than the Image placeholder\'s `background.secondary`, so a skeleton image and an empty frame read differently. The alternative (B) matched them, at the cost of fading out on a secondary card. Neither is checked against every ground in every mode by a gate: the shapes are hidden decoration, outside SC 1.4.11.',
    ],
    unverified: [
      'The brief was read through the proposal\'s quotation and paraphrase (#4109), not from a knowledge-base checkout. Sections the proposal did not quote (field evolution, §13; the external version numbers, §14) are not carried here.',
      'That a hugging bar with a literal min width builds at that width with no children is a host behavior; the roundtrip gate reads the built width back.',
    ],
    evolution: [
      'BUILT 2026-11-19 from the #4109 proposal, all seven owner decisions at A: no `ghost` alias, one primitive with a shape axis, pulse by default on `motion.duration.sweep`, the `background.tertiary` fill, a two-thirds bar, a four-member set, and a Skeleton that never speaks.',
    ],
  },
};
