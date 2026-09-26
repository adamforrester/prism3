/**
 * Spinner — the indeterminate loading indicator (#1670; KB `components/spinner.md`, the Progress / Spinner /
 * Skeleton triad). A distinct primitive, not a glyph in the icon set: it carries behavior an icon cannot
 * (rotation, a reduced-motion substitute, a host-owned anti-flash delay and busy announcement), and a static
 * loading glyph in the set would invite shipping the drawing without any of it. Indeterminate only — no value.
 * The determinate circular progress in `reference/Prism2/component-specs/circular-progress-indicator.json`
 * feeds the later Progress component, not this one; nothing about this def comes from it.
 *
 * THE OWNER'S SPEC (2026-09-26), picked on a live comparison page, and final:
 *   a rotating arc — constant rotation, fixed arc length — over a faint full ring (the track) at 20% of the
 *   spinner's own color; the arc is 33% of the circle; the band is 2px at 24px and scales with size
 *   (16 → 1.33, 20 → 1.67, 32 → 2.67); round caps; 0.8s per turn, linear; under reduced motion a slow turn
 *   (2.6s), not a pulse or a static ring; sizes on the icon ladder 16 / 20 / 24 / 32, inked from the
 *   surrounding text/icon color (`currentColor`), so it drops into any icon slot.
 *
 * THE DRAWING lives in `component-glyphs.ts` (`SPINNER_GEOMETRY`), not here — a def names geometry, it does
 * not author path data. It is drawn as filled OUTLINES (the band's two edges and two round caps), which is
 * what makes the stroke scale with the size and keeps the caps round in Figma, where a stroke weight does not
 * follow a resize and `PartDef` has no cap field. The track's 20% is a LAYER opacity on its vector, which a
 * host rebinding the ink does not reset — see that file's header for why not a variable or a paint opacity.
 *
 * THE MOTION lives in two tokens, `motion.duration.spin` (800ms) and `motion.duration-reduced.spin` (2600ms),
 * outside the tempo-scaled ramp (`theme.ts`), because a spinner's turn is a loop period and its reduced form
 * is SLOWER rather than shorter or eliminated.
 *
 * FIGMA: one static member per size, each a square frame on the icon ladder holding one composed glyph
 * (track + arc at one rotation position). Emitted as standalone `spinner/<size>` components rather than one
 * variant set (`emitAsComponents`, the icon precedent): the button's pending state swaps a spinner into its
 * icon slot BY NAME, and a variant-set member's name (`size=small`) is not unique in a file.
 */
import { ComponentDef } from '../component-schema';

export const spinner: ComponentDef = {
  id: 'spinner',
  name: 'Spinner',
  aliases: ['loading indicator', 'activity indicator', 'loader', 'busy indicator'],
  category: 'feedback',
  status: 'draft',
  summary: 'Indeterminate loading indicator on the icon ladder, inked by its host. Decorative inside a host.',
  description:
    'A rotating arc over a faint full ring, showing that work is in progress with no known end. Sized on the icon ladder (16 / 20 / 24 / 32) and inked from the surrounding text or icon color, so it drops into any icon slot — a button\'s leading visual, a field\'s trailing slot. Decorative inside a host that announces the busy state; it has no value, so it never stands in for a determinate progress bar.',

  props: [
    { name: 'size', type: "enum: 'x-small' | 'small' | 'medium' | 'large'", values: ['x-small', 'small', 'medium', 'large'], default: 'medium', required: false, description: 'The icon ladder: 16 / 20 / 24 / 32. The band scales with it (2px at 24). Inside a host slot, take the slot\'s own icon size.' },
    { name: 'label', type: 'string', required: false, description: 'Only for a spinner that stands alone with no labeled host: renders `role="status"` with this text as its accessible name. Absent, the default, the spinner is `aria-hidden` and the host announces the busy state (a button\'s `isPending`, a region\'s `aria-busy`).' },
  ],

  // `[]`: the spinner has no interactive state. Hover, focus and disabled belong to its host.
  states: [],

  variants: {
    size: ['x-small', 'small', 'medium', 'large'],
  },
  axisKinds: { size: 'authoring' },

  // One paintable surface, the glyph: its ink is the `icon` slot and nothing else. The host overrides it on
  // the instance (`descendantFills`), which is how the spinner takes the ink of whatever it sits in.
  paintKeys: ['{slot}'],

  tokens: {
    // The icon ladder, word → rung, the same four lines `icon` carries: x-small 16, small 20, medium 24, large 32.
    'size.x-small': 'icon.size.xs',
    'size.small': 'icon.size.sm',
    'size.medium': 'icon.size.md',
    'size.large': 'icon.size.lg',
    // Standalone ink. `currentColor` in code; in Figma the primary icon role until a host pushes its own.
    icon: 'color.icon.primary',
  },

  anatomy: {
    root: 'frame',
    parts: {
      frame: {
        kind: 'box',
        role: 'target',
        size: 'size.{size}',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['ring'],
        note: 'The square on the icon ladder. Paints nothing; it is the box a host resizes to its own slot. `target` only in the schema\'s sense — the spinner is never interactive.',
      },
      ring: {
        kind: 'vector',
        glyph: 'spinner',
        size: 'size.{size}',
        note: 'The composed drawing: the track (a full ring at 20% layer opacity) under the head arc (33% of the circle, round caps), both filled outlines inked with the one icon color. Drawn at the rest position — the arc starting at twelve o\'clock and running clockwise.',
      },
    },
    codeOnly: [
      'rotation — the whole behavior. In code the spinner turns continuously: `animation: spin var(--motion-duration-spin) linear infinite` (800ms per turn), a `@keyframes spin { to { transform: rotate(1turn) } }` on the SVG. Figma holds one rest position per size; a prototype rotation loop for presentations is optional and not built here.',
      'reduced motion — under `@media (prefers-reduced-motion: reduce)` the turn SLOWS to `var(--motion-duration-reduced-spin)` (2600ms per turn), still linear and infinite. Not a pulse and not a static ring: the turn is what tells a sighted user work is continuing, so reduced motion keeps it and takes the speed out of it.',
      'the stroke in code — one `<svg viewBox="0 0 24 24">` with two circles at r=10: the track at `stroke-opacity: 0.2` and the arc with `stroke-dasharray` 33% of the circumference (20.73 of 62.83), both `stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"`, the arc rotated -90deg so it starts at twelve o\'clock. The viewBox scales the 2-unit stroke with the rendered size, the same proportion the Figma outlines hold.',
      'anti-flash delay — the HOST\'s, not the spinner\'s. A spinner that appears for a fast operation flashes; the host waits before showing it (the button\'s `isPending` "delays the spinner") and, once shown, keeps it long enough to be read. The spinner renders the moment it is mounted.',
      'announcement — decorative by default (`aria-hidden="true"`). The host owns the busy state and its announcement (`aria-busy` on the region, a button\'s `isPending` with a polite live-region message), because a spinner is invisible to assistive tech. Only a standalone spinner with a `label` renders `role="status"`.',
    ],
  },

  // `size` alone: one member per rung. No `stateAxis` (no states), no swaps, no texts; `booleans` stated-empty.
  // `emitAsComponents`: four top-level `spinner/<size>` components, so a host can swap one in by name.
  figmaProperties: {
    variantAxes: ['size'],
    booleans: {},
    emitAsComponents: true,
  },

  accessibility: {
    role: 'none when decorative (`aria-hidden="true"`, the default); `status` when it stands alone with a `label`',
    wcag: [
      '1.1.1 Non-text Content (decorative inside a host that names the busy state)',
      '1.4.11 Non-text Contrast (the arc takes its host\'s icon ink, which already clears 3:1; the track is decorative and exempt)',
      '2.2.2 Pause, Stop, Hide (the spinner shows only while work runs, and stops when it ends)',
      '2.3.3 Animation from Interactions (reduced motion slows the turn)',
      '4.1.3 Status Messages (the host announces the busy state, not the spinner)',
    ],
    focus: 'None. The spinner takes no focus; a pending control keeps its own focus while the spinner turns inside it.',
    aria: 'Decorative by default: `aria-hidden="true"`, and the host carries the state — `aria-busy="true"` on the region that is loading, or a pending button\'s polite live-region message. Never both: a labeled spinner inside a host that already announces double-announces. A standalone spinner with no host takes a `label` and `role="status"`.',
  },

  docs: {
    usage: 'Use a spinner for a short wait with no known end, inside the thing that is waiting — a button that is saving, a field checking its value, a region reloading. Size it to the icon slot it sits in, and let it take the ink around it. The host decides when it shows (after a short delay, so a fast operation does not flash) and announces the busy state; the spinner only turns.',
    do: [
      'Put the spinner in the host\'s own icon slot at that slot\'s icon size, so nothing around it moves',
      'Let the host delay showing it, so a fast operation does not flash a spinner',
      'Let the host announce the busy state (`aria-busy`, a button\'s `isPending`) and keep the spinner hidden from assistive tech',
      'Keep the turn under reduced motion, slowed to the reduced duration',
    ],
    dont: [
      'Use a spinner for work with a known length — show determinate progress',
      'Draw a static loading glyph from the icon set instead — it drops the rotation, the reduced-motion turn and the host\'s announcement',
      'Label a spinner that sits inside a host that already announces',
      'Stop the turn under reduced motion — slow it',
    ],
  },

  ai: {
    primaryPurpose: 'Show that work is in progress with no known end, inside the control or region that is waiting.',
    whenToUse: 'A short indeterminate wait inside a host: a pending Button, a field validating its value, a region reloading. Size it to the host\'s icon slot.',
    avoidWhen: 'The work has a known length (use determinate progress, not built yet), the page is loading its layout (a skeleton, not built yet), or you want a static icon — the spinner is behavior, not a glyph.',
    commonPartners: ['button', 'icon-button', 'text-field', 'select'],
    triggerKeywords: ['spinner', 'loading', 'loader', 'busy', 'pending', 'activity indicator', 'loading indicator'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['button'],
    alternativeTo: [],
    planned: ['progress', 'skeleton'],
    replacesPatterns: ['an animated loading GIF', 'a static loading glyph in the icon set'],
  },

  motion: {
    enter: 'none (present on mount; the host delays mounting it)',
    exit: 'none',
    reduceMotion: 'The turn runs `motion.duration.spin` (800ms) per turn, linear and infinite. Under prefers-reduced-motion it runs `motion.duration-reduced.spin` (2600ms) per turn instead — slower, never stopped.',
  },

  notes: {
    contested: [
      'THE TRACK IS A LAYER OPACITY, not a variable carrying the alpha (#1673\'s approach) and not a paint opacity. The spinner takes whatever ink its host pushes (on-fill, icon ink, disabled ink, their inverse twins); a 20% variable would need a twin of every one, and the host would still push its solid ink onto the track. A paint opacity is reset when the host rebinds the paint. A layer opacity survives both.',
      'STANDALONE COMPONENTS, not one variant set (`emitAsComponents`). The button swaps a spinner into its icon slot by component name, and a set member\'s name is not unique in a file.',
      'THE TURN IS NOT TEMPO-SCALED. `motion.duration.spin` holds 800ms at every tempo, where the transition ramp scales with the brand\'s tempo lever.',
    ],
    unverified: [
      'THE LAYER OPACITY ON A REAL HOST. The offline shim imports each `<path>` as its own VECTOR with the element\'s `opacity` as the layer opacity; that Figma\'s importer does the same is the reading of its documented behavior, not a live measurement. The symptom to look for: a spinner member whose track draws at full strength, as a solid ring.',
      'THE ARC COMMANDS ON A REAL HOST. The outlines use SVG elliptical-arc (`A`) commands, which no icon-set glyph does. Figma\'s importer reads them; the symptom of a problem would be a polygonal or missing ring.',
    ],
  },
};
