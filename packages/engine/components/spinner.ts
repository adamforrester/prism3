/**
 * Spinner — the indeterminate loading indicator (#1670; KB `components/spinner.md`, the Progress / Spinner /
 * Skeleton triad). A distinct primitive, not a glyph in the icon set: it carries behavior an icon cannot
 * (rotation, a reduced-motion substitute, a host-owned anti-flash delay and a busy announcement), and a static
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
 * THE OWNER'S DECISIONS OF 2026-09-27, carried with the brief:
 *   · the DEFAULT ANNOUNCEMENT — a standalone spinner is a polite `role="status"` named "Loading" (the `label`
 *     default). A host that announces its own busy state (Button / IconButton `isPending`) opts out with the
 *     standard `aria-hidden="true"` attribute, not a new prop. Before this the spinner was hidden by default and
 *     only a `label` made it speak — the brief's first trap ("never an unlabeled spinner") in the default path.
 *   · the ENTER FADE — a quick opacity fade on `motion.duration.fast`, the shortest ramp role that reads as a
 *     fade (`instant`, 50ms, is three frames and reads as a cut). Kept under reduced motion: opacity is not
 *     vestibular.
 *   · DEFERRED: a visible label / `labelPosition`, `staticColor`, the overlay / mask and a `spinning` prop.
 *     DECLINED: a success / error end state. Each is a `notes.contested` entry with the brief's alternative.
 *
 * THE BRIEF CARRY-FORWARD (2026-09-27) follows `textarea.ts` / `button.ts`: the no-value contract in
 * `accessibility.aria`, the pending-host focus rule in `accessibility.focus`, RTL force-clockwise, the fixed
 * arc (`disableShrink` by construction) and the anti-flash figures in `anatomy.codeOnly`, the §7 label rules in
 * `content.labelPattern` / `docs.contentGuidelines`, the time bands in `ai.*`, and the brief's contested,
 * unverified and field-evolution points in `notes`.
 *
 * THE DRAWING lives in `component-glyphs.ts` (`SPINNER_GEOMETRY`), not here — a def names geometry, it does
 * not author path data. It is drawn as filled OUTLINES (the band's two edges and two round caps), which is
 * what makes the stroke scale with the size and keeps the caps round in Figma, where a stroke weight does not
 * follow a resize and `PartDef` has no cap field. The track's 20% is a LAYER opacity on its vector, which a
 * host rebinding the ink does not reset — see that file's header for why not a variable or a paint opacity.
 *
 * THE MOTION lives in two tokens, `motion.duration.spin` (800ms) and `motion.duration-reduced.spin` (2600ms),
 * outside the tempo-scaled ramp (`theme.ts`), because a spinner's turn is a loop period and its reduced form
 * is SLOWER rather than shorter or eliminated. The enter fade is on the ramp (`motion.duration.fast`).
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
  // Brief §10's map, less `circular-progress` / `progress-circle` — they route to Progress (`notes.contested`).
  aliases: ['loading indicator', 'activity indicator', 'loader', 'busy indicator', 'loading', 'inline-loading', 'spin'],
  // Brief §15 (`category: foundations`), beside `icon` and `focus-ring`. Measured before moving it off
  // `feedback`: `validateComponentDef` requires the field and nothing else reads it — no emitter, projection,
  // plan or gate — so the move is metadata only. The Figma page is the plugin's file taxonomy (Subcomponents,
  // owner-decided 2026-09-26), which keys on the id, not on this.
  category: 'foundations',
  status: 'draft',
  summary: 'Indeterminate loading indicator on the icon ladder. Announces "Loading" unless its host hides it.',
  description:
    'A rotating arc over a faint full ring, showing that work is in progress with no known end. Sized on the icon ladder (16 / 20 / 24 / 32) and inked from the surrounding text or icon color, so it drops into any icon slot — a button\'s leading visual, a field\'s trailing slot. On its own it is a polite status named "Loading", or a more specific `label`; inside a host that announces its own busy state, the host hides it with `aria-hidden`. It has no value, so it never stands in for a determinate progress bar.',

  props: [
    { name: 'size', type: "enum: 'x-small' | 'small' | 'medium' | 'large'", values: ['x-small', 'small', 'medium', 'large'], default: 'medium', required: false, description: 'The icon ladder: 16 / 20 / 24 / 32. The band scales with it (2px at 24). Inside a host slot, take the slot\'s own icon size.' },
    { name: 'label', type: 'string', default: 'Loading', required: false, description: 'The accessible name of the spinner\'s `role="status"` wrapper, visually hidden and announced politely. "Loading" by default; name the work when it is known ("Loading results"). A host that already announces its own busy state (a Button or IconButton `isPending`, which set `aria-busy` and carry their own live region) puts `aria-hidden="true"` on the spinner instead, so the state is announced once.' },
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
    // No entry LEADS with `size` or a state name: `admits()` reads a leading name as license to leave that axis
    // or state out of the projection (#867), and every one of these is behavior Figma cannot hold, not an axis.
    codeOnly: [
      'rotation — the whole behavior. In code the spinner turns continuously: `animation: spin var(--motion-duration-spin) linear infinite` (800ms per turn), a `@keyframes spin { to { transform: rotate(1turn) } }` on the SVG. Figma holds one rest position per size; a prototype rotation loop for presentations is optional and not built here.',
      'reduced motion — under `@media (prefers-reduced-motion: reduce)` the turn SLOWS to `var(--motion-duration-reduced-spin)` (2600ms per turn), still linear and infinite. Not a pulse and not a static ring: the turn is what tells a sighted user work is continuing, so reduced motion keeps it and takes the speed out of it.',
      'the stroke in code — one `<svg viewBox="0 0 24 24">` with two circles at r=10: the track at `stroke-opacity: 0.2` and the arc with `stroke-dasharray` 33% of the circumference (20.73 of 62.83), both `stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"`, the arc rotated -90deg so it starts at twelve o\'clock. The viewBox scales the 2-unit stroke with the rendered size, the same proportion the Figma outlines hold.',
      'a fixed arc — MUI\'s `disableShrink`, held by construction. The only animation is the GPU `transform: rotate` above; the arc\'s `stroke-dasharray` is static, and nothing animates `stroke-dasharray` or `stroke-dashoffset`. A dash animation is computed by layout and paint, so it drops frames or freezes under heavy main-thread load (parsing a large JSON payload, rendering a large React tree) — exactly when a spinner most needs to look alive (brief §8).',
      'right-to-left — the turn stays clockwise and does not mirror (Spectrum\'s rule, brief §9). Clockwise reads as time moving forward; counter-clockwise reads as undo or going back. Layout mirrors through logical properties, and the rotation is the deliberate exception, so no `[dir="rtl"]` rule flips it.',
      'enter fade — the spinner fades in when it mounts: `opacity` 0 → 1 over `var(--motion-duration-fast)` on `var(--motion-easing-role-enter)`, and under reduced motion over `var(--motion-duration-reduced-fast)`, because a change of opacity is not vestibular motion. Figma holds the visible member.',
      'anti-flash delay — the HOST\'s, not the spinner\'s. A spinner that appears for a fast operation flashes, so the host waits about 200–500ms before mounting it and renders nothing if the work resolves first; once shown, the host keeps it about 500ms so it does not flash for one frame, and clears both timers on unmount (brief §11, inherited from Progress; Ant and Fluent expose the wait as a first-class `delay` prop). A button\'s `isPending` "delays the spinner". The spinner renders the moment it is mounted.',
      'announcement — a wrapper with `role="status"` and `aria-live="polite"` around an `aria-hidden` `<svg>`, with the `label` ("Loading" by default) in a visually hidden span (brief §11). A host that already announces its busy state through its own live region — a Button or IconButton `isPending`, or a region carrying `aria-busy` with a live status (Primer\'s stance) — puts `aria-hidden="true"` on the spinner, so the state is announced once. Never `aria-valuenow` and never `role="progressbar"`: a spinner has no value.',
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
    role: '`status` with `aria-live="polite"`, named by `label` — "Loading" by default. Hidden (`aria-hidden="true"`) inside a host that announces its own busy state.',
    // No 2.2.2 or 2.3.3 (owner, 2026-09-26) — see `notes.contested`.
    wcag: [
      '1.1.1 Non-text Content (the drawing is `aria-hidden`; the status text is the name)',
      '1.4.11 Non-text Contrast (the arc takes its host\'s icon ink, meant to clear 3:1; the track is decorative and exempt)',
      '4.1.3 Status Messages (the polite "Loading" status when it stands alone; the host\'s own announcement when the host hides it)',
    ],
    focus: 'None. The spinner takes no focus. A pending host control keeps its own: it takes `aria-disabled="true"`, not native `disabled`, which removes the control from the accessibility tree and sends focus to the page body (USWDS), and it suppresses the repeat click in script — see Button\'s `isPending`.',
    aria: 'Standalone, the default: a `role="status"` wrapper with `aria-live="polite"`, named by `label` ("Loading" unless a more specific label is given), around an `aria-hidden` drawing. Inside a host that already announces its busy state — a Button or IconButton `isPending`, which set `aria-busy` and carry their own polite live region — the host sets `aria-hidden="true"` on the spinner, so the state is announced once rather than twice. Never `aria-valuenow` and never `role="progressbar"`: a spinner has no value, and an indeterminate progressbar can make some screen readers keep announcing the missing value.',
  },

  // Brief §7, owner-approved 2026-09-27 for the optional label.
  content: {
    labelPattern: 'Name the work, in sentence case: "Loading results", "Saving changes" — not "Loading…" or "Please wait". "Loading" is the fallback only when nothing more specific is known. One status for the whole wait, not a chain of steps ("Fetching…", "Parsing…") that floods the live region; for a region or a longer wait, the host announces completion ("Results loaded").',
  },

  docs: {
    usage: 'Use a spinner for a short wait with no known end — about 200ms to 5s — inside the thing that is waiting: a button that is saving, a field checking its value, a region reloading. Size it to the icon slot it sits in, and let it take the ink around it. The host decides when it shows (after a short delay, so a fast operation does not flash). On its own the spinner announces a polite "Loading" status, or a more specific `label`; inside a host that announces its own busy state, such as a Button\'s `isPending`, the host sets `aria-hidden="true"` on it.',
    do: [
      'Put the spinner in the host\'s own icon slot at that slot\'s icon size, so nothing around it moves',
      'Let the host delay showing it, so a fast operation does not flash a spinner',
      'Give a standalone spinner a specific `label` ("Loading results") when the work is known',
      'Set `aria-hidden="true"` on a spinner inside a host that announces its own busy state (`aria-busy`, a Button\'s `isPending`)',
      'Keep the turn under reduced motion, slowed to the reduced duration',
    ],
    dont: [
      'Use a spinner for work with a known length — show determinate progress',
      'Draw a static loading glyph from the icon set instead — it drops the rotation, the reduced-motion turn and the announcement',
      'Leave a spinner exposed inside a host that already announces its busy state — the state is announced twice; set `aria-hidden="true"` on it',
      'Keep the generic "Loading" when the work is known — name it ("Loading results")',
      'Show many spinners at once — a dashboard that starts one per widget on load reads as noise; use one placeholder for the layout and keep the spinner for a single user-triggered wait (Primer)',
      'Put `role="progressbar"` or `aria-valuenow` on a spinner — it has no value, and a value is determinate progress',
      'Stop the turn under reduced motion — slow it',
    ],
    contentGuidelines: 'Label: specific and in sentence case — "Loading results", "Updating profile" — not "Loading…" or "Please wait"; "Loading" is the fallback when nothing more specific is known. One status for the whole wait, and for a region or a longer wait the host announces completion ("Results loaded"). Inside a button, the button keeps its accessible name while pending.',
  },

  ai: {
    primaryPurpose: 'Show that work is in progress with no known end, inside the control or region that is waiting.',
    whenToUse: 'A short indeterminate wait of about 200ms to 5s (Material 3\'s bands) inside a host: a pending Button, a field validating its value, a region reloading. Size it to the host\'s icon slot.',
    avoidWhen: 'The wait is under 200ms (show nothing — a spinner that brief only flashes), runs past about 5s or has a known length (determinate progress, not built yet — including a circular progress with a value), the page is loading its layout (a skeleton, not built yet), or you want a static icon — the spinner is behavior, not a glyph.',
    commonPartners: ['button', 'icon-button', 'text-field', 'select'],
    triggerKeywords: ['spinner', 'loading', 'loader', 'busy', 'pending', 'activity indicator', 'loading indicator', 'inline-loading', 'spin'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['button'],
    alternativeTo: [],
    // `toast` — brief §12: a background wait that ends in a success or failure toast closes the loop.
    planned: ['progress', 'skeleton', 'toast'],
    replacesPatterns: ['an animated loading GIF', 'a static loading glyph in the icon set'],
  },

  motion: {
    enter: 'A quick fade in on mount: opacity over `motion.duration.fast` (100ms at the standard tempo) on the `motion.easing-role.enter` curve. The host decides when to mount it.',
    exit: 'none',
    reduceMotion: 'The turn runs `motion.duration.spin` (800ms) per turn, linear and infinite. Under prefers-reduced-motion it runs `motion.duration-reduced.spin` (2600ms) per turn instead — slower, never stopped. The enter fade stays, on `motion.duration-reduced.fast` — a change of opacity is not vestibular motion.',
  },

  notes: {
    contested: [
      'THE TRACK IS A LAYER OPACITY, not a variable carrying the alpha (#1673\'s approach) and not a paint opacity. The spinner takes whatever ink its host pushes (on-fill, icon ink, disabled ink, their inverse twins); a 20% variable would need a twin of every one, and the host would still push its solid ink onto the track. A paint opacity is reset when the host rebinds the paint. A layer opacity survives both.',
      'STANDALONE COMPONENTS, not one variant set (`emitAsComponents`). The button swaps a spinner into its icon slot by component name, and a set member\'s name is not unique in a file.',
      'THE TURN IS NOT TEMPO-SCALED. `motion.duration.spin` holds 800ms at every tempo, where the transition ramp scales with the brand\'s tempo lever.',
      'A SEPARATE PRIMITIVE, not a `CircularProgress` variant (brief §1, §10). The practice default, and this def: a separate `Spinner` keeps the no-value contract off a component that carries `value` / `min` / `max`, so a button loader is never read as a `progressbar` that needs a value. The alternative is the fold MUI (`CircularProgress variant="indeterminate"`) and Spectrum (`ProgressCircle isIndeterminate`) ship. Material 3 split its "Loading indicator" out of indeterminate progress in May 2025 (unverified, see below).',
      'THE ANNOUNCEMENT MODEL (brief §6) — three methods in the field: `role="status"` with a hidden "Loading" (the APG-recommended pattern, and this def\'s default); an indeterminate `role="progressbar"` with no `aria-valuenow` (permitted, but some screen readers keep announcing the missing value, so ruled out here); and `aria-busy` on the region with an `aria-hidden` drawing (Primer; the practice default for the overlay or region case, and what a host does when it hides the spinner).',
      'INLINE vs OVERLAY, and the API divide (brief §3, §4). This def is the inline primitive only: no mask, no `spinning` toggle, no `fullscreen`. The alternatives are Ant\'s `Spin`, which wraps content in a dimming mask and blocks it, and, on API shape, Base Web\'s exhaustive `overrides` (drilling into `Svg` / `TrackPath`) against Spectrum\'s locked-down API (only `staticColor`). This def sits at the locked-down end: `size` and `label`.',
      'REDUCED MOTION SLOWS THE TURN rather than substituting a pulse (owner, 2026-09-26). Brief §6 and §8 name a slow opacity pulse, or a static indicator with a low-frequency text ellipsis, as the substitute. Both agree on the rule that matters: never a frozen ring, which reads as a crash (Primer: make it subtle, do not remove it).',
      'THE ANTI-FLASH DELAY IS THE HOST\'S, not a `delay` prop. Brief §3 lists `delay` (~200–500ms), a first-class prop in Ant and Fluent. The host already decides when to mount the spinner and owns the busy announcement, so the timer sits with that decision; a `delay` prop would put a second timer beside the host\'s. The alternative is the brief\'s prop, defaulting to 0.',
      'NO 2.2.2 OR 2.3.3 CLAIM (owner, 2026-09-26). Brief §6 lists 2.2.2 Pause, Stop, Hide and 2.3.3 Animation from Interactions for the reduced-motion rule; the owner declined both claims, so `accessibility.wcag` names 1.1.1, 1.4.11 and 4.1.3 only.',
      'CIRCULAR-PROGRESS AND PROGRESS-CIRCLE ARE NOT ALIASES here, though brief §10 lists both to map. They are MUI\'s and Spectrum\'s names for the fold the practice keeps apart, and in this repo the circular progress on record (`reference/Prism2/component-specs/circular-progress-indicator.json`) is determinate and feeds the planned Progress component. Routing those names to the spinner would hand an agent asking for a circular progress with a value the one component that has none. The alternative is the brief\'s mapping, which fits a system with no determinate circle.',
      'A VISIBLE LABEL AND `labelPosition` — deferred by owner (2026-09-27). The `label` is visually hidden. The brief\'s alternative (§2, §3, §9): an adjacent text slot (Ant\'s `description`, replacing `tip`), placed by `labelPosition` before / after / above / below (Fluent), which flips logically under RTL.',
      '`staticColor` — deferred by owner (2026-09-27). The spinner takes its host\'s ink. The brief\'s alternative (§3, §4, §6): Spectrum\'s white / black `staticColor` for a spinner over imagery or video, where theme roles fail 3:1.',
      'THE OVERLAY / MASK — deferred by owner (2026-09-27). The brief\'s alternative (§2, §4, §11): a `position: relative` wrapper with an absolute scrim dimming the wrapped content and a centered spinner (Ant `Spin`; `fullscreen` for a page-blocking loader), blocking interaction only for genuinely blocking work (`pointer-events` / `inert`, plus `aria-busy` on the masked content).',
      'A `spinning` PROP — deferred by owner (2026-09-27). The brief\'s alternative (§3): Ant\'s toggle that shows the overlay over wrapped content. The host mounts and unmounts the spinner instead.',
      'A SUCCESS / ERROR END STATE — declined by owner (2026-09-27). Brief §4 notes Carbon\'s `InlineLoading` resolving to a checkmark or an error mark, without arguing for or against it, and §12 closes the loop with a background spinner resolving into a success or failure toast. The outcome belongs to the host, or to a toast or inline message, not to the spinner.',
    ],
    unverified: [
      'The external 2026 version numbers and the Material 3 "Loading indicator" split (May 2025 Expressive Update) — brief §14 holds them loosely and flags them unverified, and so does this def. They back the separate-primitive call and the 200ms / 5s bands, both of which stand on their own reasoning.',
      'The `role="status"`-versus-`role="progressbar"` announcement specifics — which screen readers keep announcing an indeterminate progressbar\'s missing value. The brief asks for verification against current screen readers; not verified here.',
      '1.4.11 for the arc: it takes its host\'s icon ink and is stated to clear 3:1, but that is not measured per host. Standalone it binds `color.icon.primary`, which the engine gates against `background.primary`; inside a host it takes whatever ink the host pushes (on-fill, disabled ink, their inverse twins), and no gate composes the spinner onto each host\'s ground and measures the arc there.',
    ],
    evolution: [
      'VERIFIED ON A REAL HOST (2026-09-26). The two items this def shipped as unverified were measured live through `figma.createNodeFromSvg` in the owner\'s test file. The importer makes one VECTOR per `<path>`, in path order, named by its `id`. `track` imports at layer opacity 0.2 (read back as 0.20000000298, single precision), even-odd winding, 22x22 at (1,1). `arc` imports at opacity 1, nonzero winding, 12x16.79 at (11,1). Both outlines arrive as cubic curves (24 and 16 segments, no straight lines), so the elliptical-arc commands convert without flattening.',
      'THE DEFAULT ANNOUNCEMENT (owner, 2026-09-27). The def shipped hidden by default, speaking only with a `label` — which put the brief\'s first trap, an unlabeled spinner silent to assistive tech, on the default path of every standalone use. Now `label` defaults to "Loading" and the spinner is a polite status; a host that announces its own busy state opts out with `aria-hidden="true"`. Button and IconButton say so in their `accessibility.aria`.',
      'THE ENTER FADE (owner, 2026-09-27). `motion.enter` was "none (present on mount)"; it is now a quick opacity fade on `motion.duration.fast`, the brief\'s "appear is a quick fade" (§8). `instant` (50ms) was the shorter candidate and reads as a cut. No new token.',
      'CATEGORY `feedback` → `foundations` (2026-09-27), to brief §15. Nothing reads the field beyond the required check, so no surface moved.',
      'FIELD (brief §13.1): loading rendering went from GIF to CSS `border-radius` to inline SVG — precise, and themeable through `currentColor` and dash control. This def is the SVG end, drawn as outlines in Figma.',
      'FIELD (brief §13.2): the spinner-versus-progress split. Material 2 folded the two into an indeterminate `CircularProgress`; Material 3 (May 2025) split its "Loading indicator" out for short waits. The practice keeps them distinct in name and contract even where the rendering is shared.',
      'FIELD (brief §13.3): never unlabeled. A bare animated SVG is silent to assistive tech; `role="status"` with a "Loading" name, or `aria-busy` on the region, is now the baseline. The default "Loading" above is this def\'s answer.',
      'FIELD (brief §13.4): `aria-disabled` over `disabled` in loading buttons (USWDS), keeping focus and the workflow rather than sending focus to the page body. Button\'s `isPending` carries it.',
      'FIELD (brief §13.5): the anti-flash discipline, the reduced-motion substitute and `currentColor` theming, carried over from the perceived-performance and motion-accessibility work.',
    ],
  },
};
