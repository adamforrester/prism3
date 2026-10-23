/**
 * Progress — the progress bar and the progress ring (#2670). KB brief: `components/progress.md`, scoped by owner
 * decision Q318.1 A to the progress bar as the brief defines it (not a Stepper). Built from the design proposal on
 * #2670, approved by the owner on 2026-10-16 with every numbered call at its recommendation (A):
 *
 *   1. one Progress: linear determinate, linear indeterminate, circular determinate;
 *   2. circular only when determinate — superseded by owner Q545 B (2026-10-22): the ring is indeterminate too, a
 *      still frame of its turning arc with no value, and the Spinner stays for a short wait inside a control;
 *   3. the ring's value text sits beside it, on by default;
 *   4. status active, complete, error — a glyph and a message, never color alone;
 *   5. a pale 4px track (`color.background.tertiary`) with a stop dot at its end, the fill on `color.icon.<role>`;
 *   6. the sweep's period as its own motion pair, `motion.duration.sweep` (1600ms) and `.duration-reduced.sweep`
 *      (2600ms), outside the tempo-scaled ramp (CONTRACT 14.8.0);
 *   7. reduced motion keeps the sweep and slows it, as the Spinner keeps its turn;
 *   8. announced at 25, 50 and 75%, and at the end;
 *   9. one linear thickness, 4px;
 *  10. named Progress, on its own page;
 *  11. the wording as drafted.
 *
 * THE STRUCTURE. One tree, gated by `shape`: the linear members build a header (label and value) and a track; the
 * circular members build a ring and its value beside it. Both build the message, which is a nested FieldMessage
 * (success at complete, error at error): the end state's glyph, ink and caption are FieldMessage's own, so an error
 * on a progress bar reads the same as an error under a field (owner Q352/Q354: errors show one way, and `error` is
 * a value of the `status` axis here, as it is on the fields).
 *
 * THE FILL'S LENGTH. Figma has no percentage width, so the still members show a proportion by layout, not a
 * number: the fill and the empty rest of the track each `grow` and split the track evenly (50%). At complete the
 * rest is absent and the fill takes the whole track. The indeterminate member is a still frame of the sweep: an
 * empty lead, the segment and the empty rest, each a third. A designer showing another value sets the fill's
 * width on the instance. The value text reads "50%" to match, and "100%" at complete.
 *
 * TWO VALUE TEXTS, NOT ONE (owner QA on the build, 2026-10-16). The first build gave `valueText` a per-member default,
 * "100%" at complete (`byVariant`), on one TEXT property. A set-level TEXT property holds one default that every bound
 * member shows (#1567), so every member read "50%", the complete one included, and the plugin reported the parts as
 * COLLAPSED. So "100%" is its own pair of parts, `valueComplete` and `ringValueComplete`, present at complete only, on
 * a second, Figma-only TEXT property ("complete value text"; code renders both from `valueText`), and "50%" is
 * present at active and error only.
 *
 * THE RING is two component-owned glyphs on one square (`component-glyphs.ts`, `progress-*`): the pale track, a full
 * annulus in the track role, in the flow, and the arc over it (`stackCentered`), the band 3px at the small 24px ring
 * (owner Q544 A; it was 2px) and 4px at the medium 40px one. A determinate ring's arc is its value, half the ring in
 * the still member; an indeterminate ring's is the turning arc at rest, the Spinner's third of the circle (Q545 B).
 *
 * THE HEADER aligns the label and the value on their baseline (owner Q535.1 A), so the two type sizes share one
 * line of text; its floor still holds one height whether or not the value shows. Both are filled outlines on the 24-unit artboard, so the band scales with
 * the size the way the Spinner's does. Not a stroke on the ring box: a stroke binds a border role (Q346), and no
 * border role clears 3:1 against the fill. Not one glyph with two layers, as the Spinner's is: a glyph takes one ink,
 * and the track is a different role from the arc (call 5).
 *
 * WHY NOT `loader` AS AN ALIAS, though the brief lists it: it is already a Spinner alias, and one alias names one
 * component (call 10).
 */
import { ComponentDef } from '../component-schema';

export const progress: ComponentDef = {
  id: 'progress',
  name: 'Progress',
  aliases: ['progress-bar', 'progress-indicator', 'linear-progress', 'circular-progress'],
  category: 'feedback',
  status: 'draft',
  summary: 'Shows how far a task has got, or that it is still running. Linear or circular.',
  description:
    'Shows that system work is under way and, when the system can measure it, how far along it is: an upload, an export, a batch save. A linear bar shows a known amount (determinate) or a sweeping segment while the amount is unknown (indeterminate). A ring shows a known amount in a small space, with its value beside it. At the end the bar turns to the success or danger color and a message with a glyph names the outcome. The label and the value sit outside the track, so neither loses contrast as the fill moves behind it.',

  props: [
    { name: 'type', type: "enum: 'determinate' | 'indeterminate'", values: ['determinate', 'indeterminate'], default: 'determinate', required: false, description: 'determinate = the work can be measured, so the bar shows how far it has got. indeterminate = it cannot, so a segment sweeps along the track and there is no value. Choose indeterminate rather than faking a value.' },
    { name: 'value', type: 'number', required: false, description: 'How far the work has got, between min and max, for a determinate bar. Omitted, the bar rests at min. Out-of-range values are clamped, with a warning in development. Never fake a value: a bar that creeps toward the end and stops there breaks the contract. If the work cannot be measured, set type to indeterminate.' },
    { name: 'min', type: 'number', default: 0, required: false, description: 'The start of the range.' },
    { name: 'max', type: 'number', default: 100, required: false, description: 'The end of the range: 100 for a percentage, or the total, such as a byte count.' },
    { name: 'label', type: 'string', required: true, description: 'What is in progress, with an active verb ("Uploading photo.jpg"). It is the accessible name. A linear bar shows it above the track; a ring is named by it without showing it.' },
    { name: 'valueText', type: 'string | (value: number) => string', required: false, description: 'The visible value, and the same string as aria-valuetext. A percentage by default, through Intl.NumberFormat, so "45%" localizes. Prefer a concrete amount when there is one ("45 MB of 100 MB").' },
    { name: 'shape', type: "enum: 'linear' | 'circular'", values: ['linear', 'circular'], default: 'linear', required: false, description: 'linear = a bar that fills its container. circular = a ring for a small space, determinate or indeterminate. An indeterminate ring shows no value.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The ring\'s size: medium is 40px with a 4px band, small is 24px with a 3px band. A linear bar has one thickness, 4px, and ignores this.' },
    { name: 'status', type: "enum: 'active' | 'complete' | 'error'", values: ['active', 'complete', 'error'], default: 'active', required: false, description: 'active = the work is running. complete = it finished: the fill turns to the success color and the message names the result. error = it failed: the fill stops where it failed, turns to the danger color, and the message names the problem and the next step.' },
    { name: 'message', type: 'string', required: false, description: 'The outcome, shown below the bar at complete and error with a glyph: past tense when done ("Upload complete"), the problem and the next step when it fails ("Upload failed. The connection dropped. Try again.").' },
    { name: 'showValue', type: 'boolean', default: true, required: false, description: 'Whether the value text shows. On by default. A ring keeps it on: it has no end to mark, so the value is how the amount reads.' },
    { name: 'announce', type: "enum: 'milestones' | 'end' | 'none'", values: ['milestones', 'end', 'none'], default: 'milestones', required: false, description: 'What a screen reader hears. milestones = once as the value passes 25, 50 and 75%, and again at the end. end = the end only. none = the host announces the work itself. An error is announced when it happens, except under none.' },
    { name: 'delay', type: 'number', default: 400, required: false, description: 'Milliseconds to wait before showing the bar. If the work finishes first, nothing shows, so a fast task does not flash a bar.' },
    { name: 'minDisplay', type: 'number', default: 500, required: false, description: 'Milliseconds the bar stays once shown, so it does not vanish after one frame.' },
  ],

  // `[]`: Progress is not interactive. Hover, focus and disabled belong to whatever started the work.
  states: [],

  // Each axis lists its code default first (owner Q347), so the first member of the set is the default bar:
  // linear, determinate, active, medium.
  variants: {
    shape: ['linear', 'circular'],
    type: ['determinate', 'indeterminate'],
    status: ['active', 'complete', 'error'],
    size: ['medium', 'small'],
  },
  axisKinds: { shape: 'authoring', type: 'runtime', status: 'runtime', size: 'authoring' },

  // Status first, then the bare slot: the fill, the stop dot and the arc change with the status; the track, the
  // label and the value do not.
  paintKeys: ['{status}.{slot}', '{slot}'],

  tokens: {
    // The ring's square, on the icon ladder: small 24px, medium 40px.
    'size.small': 'icon.size.md',
    'size.medium': 'icon.size.xl',
    // The linear track's thickness and the stop dot's square, 4px (call 9).
    'track-height': 'border-width.heavy',
    'stop-size': 'border-width.heavy',
    radius: 'radius.capsule',
    'label-type': 'type.label.md.emphasis',
    'value-type': 'type.body.sm.default',
    // The column between header, track and message, and the space between the label and the value.
    gap: 'space.075',
    'header-gap': 'space.100',
    // The header's floor: the taller of the two texts (the value, a body line) fits under it, so an indeterminate bar, which
    // shows no value, is as tall as a determinate one.
    'header-min': 'icon.size.md',
    'ring-gap': 'space.100',

    // The track, both shapes: the pale role (call 5). The linear track's box fill, and the ring track glyph's ink.
    fill: 'color.background.tertiary',
    // The fill (a box's `indicator`), and the stop dot and the arc (a glyph's `icon`), per status. An icon role, not an
    // interactive one: Progress is not interactive, and `icon.brand` clears 3:1 against the track where the
    // interactive fill does not in every cell (#2670 §5).
    'active.indicator': 'color.icon.brand',
    'complete.indicator': 'color.icon.success',
    'error.indicator': 'color.icon.danger',
    'active.icon': 'color.icon.brand',
    'complete.icon': 'color.icon.success',
    'error.icon': 'color.icon.danger',
    label: 'color.text.primary',
    body: 'color.text.secondary',
  },
  // The gaps stay fixed at every density, as Dialog's and the groups' do: none sits beside a padding to keep in step.

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        // Built at a width per shape, which an instance overrides: a linear bar at 360 (it fills its container), a
        // ring at FieldMessage's own 320, the width its end-state message takes.
        builtSize: { axis: 'shape', widths: { linear: 360, circular: 320 } },
        children: ['header', 'track', 'ringRow', 'messageComplete', 'messageError'],
        note: 'The column: the label and value, the track, and the message at complete and error. A linear bar fills the width it is placed in.',
      },
      header: {
        kind: 'box',
        layout: { direction: 'row', align: 'baseline', justify: 'space-between', sizing: { x: 'fill', y: 'hug' } },
        gap: 'header-gap',
        minHeight: 'header-min',
        crossAxisFill: true,
        presentWhen: { shape: ['linear'] },
        children: ['label', 'value', 'valueComplete'],
        note: 'The label at the start and the value at the end, on one baseline, above the track and never inside it. A floor holds it one height whether or not a value shows, so a determinate and an indeterminate bar measure the same.',
      },
      label: {
        kind: 'text',
        type: 'label-type',
        optional: true,
        note: 'What is in progress, with an active verb. It is also the accessible name.',
      },
      value: {
        kind: 'text',
        type: 'value-type',
        paintSlot: 'body',
        optional: true,
        presentWhen: { shape: ['linear'], type: ['determinate'], status: ['active', 'error'] },
        note: 'The amount, end-aligned: a percentage, or a concrete amount such as "45 MB of 100 MB". The same text a screen reader gets as the value.',
      },
      valueComplete: {
        kind: 'text',
        type: 'value-type',
        paintSlot: 'body',
        optional: true,
        presentWhen: { shape: ['linear'], type: ['determinate'], status: ['complete'] },
        note: 'The amount at complete, "100%", end-aligned. Its own text, so it does not share the running bar\'s "50%".',
      },
      track: {
        kind: 'box',
        paintSlots: ['fill'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fixed' } },
        height: 'track-height',
        radius: 'radius',
        clipsContent: true,
        crossAxisFill: true,
        presentWhen: { shape: ['linear'] },
        children: ['lead', 'fill', 'rest', 'dotGlyph'],
        note: 'The pale 4px track, the full length of the work. It is close to the page color, so the stop dot at its end marks where the work finishes.',
      },
      lead: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fill' } },
        grow: true,
        crossAxisFill: true,
        presentWhen: { shape: ['linear'], type: ['indeterminate'] },
        note: 'The empty track before the sweeping segment, in the still frame of an indeterminate bar.',
      },
      fill: {
        kind: 'box',
        paintSlots: ['indicator'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fill' } },
        radius: 'radius',
        grow: true,
        crossAxisFill: true,
        note: 'The filled part of the track, from the start edge: the brand color while active, success at complete, danger at error. On an indeterminate bar it is the segment that sweeps.',
      },
      rest: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'fill' } },
        grow: true,
        crossAxisFill: true,
        presentWhen: { shape: ['linear'], status: ['active', 'error'] },
        note: 'The empty track still to go. Absent at complete, where the fill runs the whole length.',
      },
      // A DISC GLYPH, not a box: the fill box already claims `indicator`, and two boxes cannot share a slot. As a
      // glyph it takes the arc's `{status}.icon`, which is the fill's color in every status.
      dotGlyph: {
        kind: 'vector',
        glyph: 'progress-stop',
        size: 'stop-size',
        presentWhen: { shape: ['linear'], type: ['determinate'] },
        note: 'The stop dot: a 4px dot in the fill color at the end of the track, marking where the work finishes, because the pale track alone does not stand out from the page.',
      },
      ringRow: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'ring-gap',
        presentWhen: { shape: ['circular'] },
        children: ['ring', 'ringValue', 'ringValueComplete'],
        note: 'The ring with its value beside it.',
      },
      ring: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        size: 'size.{size}',
        children: ['ringGlyph', 'arcGlyph', 'fullRingGlyph'],
        note: 'The ring\'s square: 24px at small, 40px at medium. It paints nothing; the track and the arc are drawn inside it.',
      },
      ringGlyph: {
        kind: 'vector',
        glyph: 'progress-ring-{size}',
        size: 'size.{size}',
        paintSlot: 'fill',
        presentWhen: { shape: ['circular'] },
        note: 'The ring\'s pale track, the same color as the linear track: a full circle 3px wide at 24px and 4px wide at 40px.',
      },
      arcGlyph: {
        kind: 'vector',
        glyph: 'progress-arc-{type}-{size}',
        size: 'size.{size}',
        stackCentered: true,
        presentWhen: { shape: ['circular'], status: ['active', 'error'] },
        note: 'The arc over the track, from twelve o\'clock clockwise, with round ends. On a determinate ring it is the value, half the ring in the still member; on an indeterminate ring it is a third of the ring, one still frame of its turn. Brand color while active, danger at error.',
      },
      fullRingGlyph: {
        kind: 'vector',
        glyph: 'progress-ring-{size}',
        size: 'size.{size}',
        stackCentered: true,
        presentWhen: { shape: ['circular'], status: ['complete'] },
        note: 'The full ring at complete, in the success color.',
      },
      ringValue: {
        kind: 'text',
        type: 'value-type',
        paintSlot: 'body',
        optional: true,
        presentWhen: { shape: ['circular'], type: ['determinate'], status: ['active', 'error'] },
        note: 'The ring\'s value, beside it. On by default: a ring has no end to mark, so the value is how its amount reads. An indeterminate ring has none.',
      },
      ringValueComplete: {
        kind: 'text',
        type: 'value-type',
        paintSlot: 'body',
        optional: true,
        presentWhen: { shape: ['circular'], status: ['complete'] },
        note: 'The ring\'s value at complete, "100%", beside the full ring.',
      },
      messageComplete: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'success' } },
        overrides: { texts: { message: 'Message' } },
        optional: true,
        crossAxisFill: true,
        presentWhen: { status: ['complete'] },
        note: 'The outcome when the work finishes: a check glyph and a past-tense caption in the success color.',
      },
      messageError: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'error' } },
        overrides: { texts: { message: 'Message' } },
        optional: true,
        crossAxisFill: true,
        presentWhen: { status: ['error'] },
        note: 'The outcome when the work fails: the error glyph and a caption in the danger color that names the problem and the next step.',
      },
    },
    // No entry leads with an axis or state name: `admits()` reads a leading name as license to drop it (#867).
    codeOnly: [
      'the fill\'s length — in code the fill is the track\'s inline size times (value − min) / (max − min), clamped, with a warning in development for a value out of range. Figma has no percentage width, so each still member splits the track by layout: half at active and error, the whole track at complete. A designer showing another amount sets the fill\'s width on the instance.',
      'the sweep — an indeterminate bar moves a segment 30% of the track long from before the start edge to past the end, one pass every `var(--motion-duration-sweep)` (1600ms), on `var(--motion-easing-calm)`, repeating, with the track clipping it. Under `@media (prefers-reduced-motion: reduce)` the same pass runs every `var(--motion-duration-reduced-sweep)` (2600ms): slower, never stopped, because the moving segment is the only sign the work is continuing. Figma holds one still frame of it.',
      'the fill transition — the fill moves to each new value over `var(--motion-duration-moderate)` on `var(--motion-easing-role-default)`, so bursty data reads as steady progress. Under reduced motion it runs `var(--motion-duration-reduced-moderate)`, which is 0ms, so it snaps. At complete and error the color crossfades over `var(--motion-duration-fast)`.',
      'the ring in code — one `<svg viewBox="0 0 24 24">`: the track circle in the track color and the value arc with `stroke-dasharray` set from the value, `stroke-linecap: round`, rotated -90deg so it starts at twelve o\'clock. The stroke width is the band in viewBox units (3 at small, 2.4 at medium: the band\'s px × 24 / the ring\'s px), the circle\'s radius 12 minus half of it, so the outer edge lies on the viewBox\'s edge and it matches the Figma outlines.',
      'the indeterminate ring — the same `<svg>` with the arc\'s `stroke-dasharray` fixed at a third of the circle and no value text. The arc turns continuously: `animation: progress-turn var(--motion-duration-sweep) linear infinite`, a `@keyframes progress-turn { to { transform: rotate(1turn) } }` on the arc alone, so the track holds still (1600ms per turn, Progress\'s own sweep period). Only `transform` animates, never `stroke-dasharray` or `stroke-dashoffset`, so it keeps moving under heavy main-thread load. Under `@media (prefers-reduced-motion: reduce)` it turns every `var(--motion-duration-reduced-sweep)` (2600ms): slower, never stopped, because the turn is the only sign the work is continuing. Figma holds one still frame, the arc at rest from twelve o\'clock. In right-to-left the arc turns counterclockwise.',
      'right-to-left — the linear fill grows from the inline-start edge (the right) through logical properties, and the label and value swap sides. The ring runs counterclockwise from twelve o\'clock. The sweep moves from right to left.',
      'number formatting — the value text defaults to a percentage through Intl.NumberFormat ("45%", "%45", "45 %"), and a concrete amount ("45 MB of 100 MB", "Step 3 of 5") is localized with its word order. The value text is never truncated; the label wraps instead.',
      'text expansion — the label wraps rather than truncating, and the value keeps its full text at the end of the header.',
      'the value contract — `role="progressbar"` named by the label (`aria-labelledby`, or `aria-label` on a ring, whose label does not show). Determinate: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext` whenever the visible value is not a bare percentage. Indeterminate: none of the three, never a fixed `aria-valuenow="0"` (it reads as stuck at 0%), and `aria-busy="true"` on the region the work updates.',
      'the milestone announcements — a visually hidden `aria-live="polite"` region, in the DOM and empty from mount. The last milestone spoken is kept in a ref; when the value passes 25, 50 or 75% for the first time, the region\'s text is set to the value text; at max it is set to the message ("Upload complete"). An error message is set when the error happens. `aria-valuenow` never triggers speech. `announce="end"` skips the milestones; `announce="none"` leaves the region empty.',
      'the anti-flash timers — the component waits `delay` (400ms) before it shows, and shows nothing if the work finishes first; once shown it stays at least `minDisplay` (500ms). Both timers are cleared on unmount.',
      'the end-state message — a nested FieldMessage, success at complete and error at error. Its glyph is aria-hidden; the caption carries the meaning. A "Try again" action after an error belongs to the host, placed beside the bar, not inside it.',
    ],
  },

  figmaProperties: {
    variantAxes: ['shape', 'type', 'status', 'size'],
    // The sparse grid: a linear bar has one thickness (no small), and indeterminate work has no end state, on either
    // shape. An indeterminate ring is built at both sizes (owner Q545 B; until then a ring always had a value). Twelve
    // members.
    excludeCoordinates: [
      { shape: ['linear'], size: ['small'] },
      { type: ['indeterminate'], status: ['complete', 'error'] },
    ],
    // The message row comes and goes with the status.
    footprintVaries: ['status'],
    texts: {
      label: { part: 'label', default: 'Label', figmaName: 'label text' },
      valueText: { part: 'value', default: '50%', figmaName: 'value text', also: ['ringValue'] },
      // "100%" at complete: its own parts and property, because one TEXT property shows one default on every member
      // (#1567). Figma-only: code renders both from `valueText`.
      completeValueText: { part: 'valueComplete', default: '100%', figmaName: 'complete value text', also: ['ringValueComplete'], figmaOnly: true },
    },
    swaps: {},
    booleans: {
      showLabel: { part: 'label', default: true, figmaName: 'label', figmaOnly: true },
      showValue: { part: ['value', 'ringValue', 'valueComplete', 'ringValueComplete'], default: true, figmaName: 'value' },
      message: { part: ['messageComplete', 'messageError'], default: true, figmaName: 'message' },
    },
  },

  accessibility: {
    role: 'progressbar, named by the label. A polite live region beside it carries the milestone and end announcements.',
    wcag: [
      '4.1.2 Name, Role, Value (role progressbar named by its label; with a value, aria-valuenow, aria-valuemin, aria-valuemax and aria-valuetext)',
      '4.1.3 Status Messages (the milestones, the end and an error reach a screen reader through a polite live region)',
      '1.4.1 Use of Color (the length of the fill and the value text carry the amount; complete and error carry a glyph and a message)',
      '1.4.3 Contrast (the label, the value and the message clear 4.5:1 against the page, measured in every mode of the example brands)',
      '1.4.11 Non-text Contrast (the fill clears 3:1 against the track, and the stop dot against the page, measured in every mode of the example brands)',
      '2.2.2 Pause, Stop, Hide (targeted: an indeterminate bar is for work the user waits on; for long background work, show a status line or let the user hide the bar)',
    ],
    keyboard: 'None. Progress takes no focus and has no action.',
    focus: 'Never focusable. Focus stays where it was when the work started.',
    aria: 'Determinate: role="progressbar", aria-labelledby pointing at the label (aria-label on a ring, whose label does not show), aria-valuenow, aria-valuemin and aria-valuemax, and aria-valuetext whenever the visible value is not a bare percentage ("45 MB of 100 MB"). Indeterminate: role="progressbar" with no value attributes, and aria-busy="true" on the region being updated. A screen reader does not reliably speak a changing aria-valuenow, and speaking every step floods it, so a polite live region, present and empty from the start, speaks the value as it passes 25, 50 and 75%, and the message at the end. An error is spoken when it happens. The message glyph is aria-hidden. Every string, the "%" sign included, is translatable.',
  },

  content: {
    labelPattern: 'Name the work with an active verb, in sentence case: "Uploading photo.jpg", "Saving your changes". Keep one label for the whole task rather than cycling through technical steps ("Resolving…", "Connecting…"), which flickers on screen and floods a screen reader.',
    errorPattern: 'Name what failed and the next step: "Upload failed. The connection dropped. Try again." Not a bare "Error".',
  },

  docs: {
    usage: 'Use Progress for system work that takes more than a few seconds: a determinate bar when the work can be measured (bytes, items, a known length), an indeterminate bar when it cannot. Use a ring when the space is small, such as a row in a list: determinate when the amount is known, indeterminate when it is not. Choose a ring over a Spinner when the work is a task with an outcome: the ring is named by its label, ends in complete or error with a message, and turns determinate once the amount is known. Use a Spinner for a short wait inside a control, such as a button\'s pending state, where there is no outcome to report. For a first load of content, use a placeholder in the layout\'s shape. Use the bar for work the user waits on; for long background work, show a status line, or let the user hide the bar.',
    do: [
      'Name the work in the label with an active verb',
      'Show a concrete amount when there is one ("45 MB of 100 MB")',
      'Start indeterminate and switch to determinate once the amount is known',
      'End with a message: past tense when done, the problem and the next step when it fails',
      'Put a retry action beside the bar, not inside it',
    ],
    dont: [
      'Fake a value. A bar that creeps toward the end and stops there breaks the contract; use an indeterminate bar',
      'Put the label or the value inside the track',
      'Use a ring for a short wait inside a control. That is a Spinner',
      'Use Progress for a static measurement such as storage used. That is a meter',
      'Use Progress for a user\'s place in a multi-step form. That is a stepper',
      'Show the outcome by color alone',
    ],
    contentGuidelines: 'Label: what is happening, with an active verb ("Uploading photo.jpg"), one label for the whole task. Value: a concrete amount where there is one ("45 MB of 100 MB", "Step 3 of 5"), otherwise a percentage. End: past tense when done ("Upload complete"); when it fails, what failed and the next step ("Upload failed. The connection dropped. Try again.").',
  },

  ai: {
    primaryPurpose: 'Show that system work is under way and, when it can be measured, how far along it is.',
    whenToUse: 'An upload, export or batch job that takes more than a few seconds: determinate when the amount is known, indeterminate when it is not. A ring when the space is small, measured or not, for a task that ends in complete or error.',
    avoidWhen: 'The wait is short and inside a control (use a spinner), the content is loading for the first time (a placeholder in the layout\'s shape), the value is a static measurement such as storage used (a meter), it marks a user\'s place in a multi-step flow (a stepper).',
    commonPartners: ['button', 'spinner', 'field-message'],
    triggerKeywords: ['progress', 'progress bar', 'progress indicator', 'linear progress', 'circular progress', 'progress ring', 'upload progress', 'determinate', 'indeterminate'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['field-message'],
    alternativeTo: ['spinner'],
    planned: ['skeleton', 'meter', 'stepper'],
    replacesPatterns: ['a bar that creeps to 99% while the real amount is unknown', 'a label printed inside the moving fill'],
  },

  motion: {
    enter: 'Appears after a short delay (400ms), so a fast task shows nothing. The fill moves to each new value over `motion.duration.moderate` on `motion.easing-role.default`. An indeterminate bar sweeps its segment across the track once every `motion.duration.sweep` (1600ms), on `motion.easing.calm`. At complete and error the color crossfades over `motion.duration.fast`.',
    exit: 'Stays at least 500ms once shown, then leaves with its host.',
    reduceMotion: 'The fill snaps to each value (`motion.duration-reduced.moderate`, 0ms). The indeterminate sweep keeps moving, more slowly: one pass every `motion.duration-reduced.sweep` (2600ms). It is never removed, because a still bar reads as stuck.',
  },

  notes: {
    contested: [
      'REDUCED MOTION SLOWS THE SWEEP rather than substituting an opacity pulse (owner call 7 A, matching the Spinner). Brief §6 and §8 name a slow pulse (40% to 100% over about 1.5s) or a static "Loading…" as the substitute. Both agree on the rule that matters: never remove the only busy cue.',
      'THE END STATES ARE A NESTED FieldMessage, not a message drawn here. The brief (§4) gives complete a checkmark replacing the percentage; the proposal and this def keep the value and add the message row below, so the end state carries a glyph and text the way a field\'s validation does (owner Q352/Q354: one way to show an error). The cost: the error glyph is FieldMessage\'s exclamation in a triangle, where the proposal named `error-circle`.',
      'UNIFIED Progress with a `shape` prop (brief §10\'s practice default) rather than distinct LinearProgress and CircularProgress (MUI, Fluent). The bundle-size argument for the split is answered by tree-shaking.',
      'THE DETERMINATE THRESHOLD (brief §15): when the work can honestly be measured. This def\'s answer is the `type` prop: determinate by default (owner item 7), indeterminate when the work cannot be measured, and the docs say never to fake a value.',
      'THE GLOBAL ROUTE-CHANGE BAR (brief §4, §11) is out of scope: a product-shell placement whose visual eases while the value stays indeterminate. It can follow as a placement once a shell exists.',
      'NO BUFFER, no segmented bar, no dashboard gauge (brief §4). A buffer fill is a media-player need not on the table; a gauge is a meter.',
      'THE STILL MEMBERS SHOW 50%, not the proposal wireframe\'s 45% and 62%: Figma has no percentage width, and two growing boxes split the track evenly, so the value text reads 50% to match. A literal width would freeze the fill when an instance is stretched.',
      'AN INDETERMINATE RING, beside the Spinner (owner Q545 B, 2026-10-22). The approved proposal (call 2) left a ring that spins with no value to the Spinner. The owner added it to Progress so a ring can stand for an unmeasured task and turn determinate in place. The two differ in what the work is: Progress names a task that ends in complete or error; a Spinner is a short wait inside a control, unnamed on screen. Figma holds one still frame of the turn, the Spinner\'s third of the circle at rest; the track is the pale track role at full strength, not the Spinner\'s 20% of its own ink.',
      'THE CIRCULAR MEMBERS CARRY THE MESSAGE TOO. The proposal\'s circular anatomy lists the ring and its value only; call 4 (never color alone) needs the glyph and message at complete and error on a ring as well, so the message is built on both shapes. The ring members are as wide as the message where it shows.',
      'HELD FOR THE OWNER (QA on the build, 2026-10-16): "100%" at complete is its own text on a Figma-only TEXT property, "complete value text", beside "value text". One property could not show 50% and 100% (#1567). The alternative is a code prop for the complete text, which code does not need.',
    ],
    unverified: [
      'The external 2026 version numbers, and Material 3\'s Expressive wavy tracks (brief §14 flags both).',
      'Which screen readers speak a changing `aria-valuenow` (brief §6 asks for a check against current ones). The milestone region does not depend on it.',
      'The arc over the ring\'s inside stroke, on a real host: the outlines are drawn to lie exactly on the stroke at both sizes, and that is measured on the plan, not in Figma.',
    ],
    evolution: [
      'FIELD (brief §13.1): `role="meter"` and `role="progressbar"` were formalized as separate roles; React Aria ships separate hooks. A static measurement is not this component.',
      'FIELD (brief §13.2): milestone announcements through a polite region replaced binding a screen reader to `aria-valuenow`.',
      'FIELD (brief §13.3): the anti-flash delay and minimum display time became the standard; a 50ms flash reads worse than nothing.',
      'FIELD (brief §13.4): reduced motion reduces the indeterminate animation and never removes it.',
      'FIELD (brief §13.5): Material 3\'s stop indicator (December 2023), the 4dp end dot for SC 1.4.11, which this def\'s stop dot follows.',
      '2026-10-16 (owner QA on the build): the complete members read "100%" through their own text and a Figma-only "complete value text" property, after one property showed "50%" on every member.',
      '2026-10-22 (owner QA, Q535 / Q544 / Q545): the header\'s label and value align on their baseline; the small ring\'s band goes from 2px to 3px; an indeterminate ring joins at both sizes, with no value.',
    ],
  },
};
