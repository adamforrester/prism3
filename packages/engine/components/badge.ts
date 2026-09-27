/**
 * Badge — a small, static marker: a status label in the flow of text, a count over a host, or a presence
 * dot over a host. KB brief: `components/badge.md`. It is the brief's three genres (§1) as one component,
 * which is the owner's decision (2026-09-27) and the brief's contested alternative (§10, §15): the brief's
 * practice default is three sibling components (a count badge, a dot and a status label), and the owner
 * chose one component switched by props, with each genre's accessibility contract carried precisely.
 *
 * ── THE OWNER'S FOUR DECISIONS (2026-09-27), and where each one lives ─────────────────────────────────
 *
 *   1. STATIC. No hover, pressed, focus or disabled of its own, no focus ring, never a link. `states: []`.
 *      Anything a user can click, toggle or remove is a Tag, which is a different component. A static
 *      keyword, category or file size ("PDF 262 KB") is a Badge.
 *   2. ONE COMPONENT, SWITCHED BY PROPS. `props.genre` carries `status | count | dot`, with the self-
 *      describing value names the owner asked for (`status`, not `default`). The two accessibility
 *      contracts are in `accessibility.aria`: a count or dot is aria-hidden and its meaning is in the
 *      HOST's accessible name; a status label announces its own text.
 *   3. VISUALLY DISTINCT FROM INTERACTIVE COMPONENTS. Every color binding is a surface role
 *      (`color.foreground.*`, or its inverse twin) or a text role (`color.text.*`, or its inverse twin) —
 *      never `color.interactive.*`, and the surface paints no border, so there is no fill-and-stroke
 *      pairing that reads as a button. `test.ts` holds this by name against a literal family list.
 *      `notes.contested` names what Tag must differ on.
 *   4. NO TOUCH TARGET. Not interactive, so `lint-hit-target.ts` lists it in `EXCLUDED` with that reason;
 *      a count on an icon button relies on the icon button's target.
 *
 * ── THE GENRE AXIS (owner-approved follow-up, 2026-09-27) ─────────────────────────────────────────────
 *
 * `genre` is the nineteenth name in `VARIANT_AXES` (its case is argued there): a genre changes the content
 * model, the placement and the accessibility contract together, which none of `appearance`, `style` or
 * `shape` expresses. It is the FIRST axis and `status` its first value, so Figma's default member is the
 * code default. It is an AUTHORING axis — a designer or author picks the genre, and it never changes while
 * the page is open — so the box may differ across genres; `tone` stays runtime, and the box holds still
 * along it.
 *
 * ONE ANATOMY, THREE SHAPES, by presence gates rather than three trees. The `surface` pill paints the fill
 * in every genre, and its padding is keyed on the genre (`{genre}.pad-x`, `{genre}.pad-y`):
 *   · status — the `text` part, the status label, at `space.150` × `space.100`, as before.
 *   · count  — the `count` part, a number, at `space.075` × `space.025`. A single digit reads as a circle
 *     and more digits grow it into a pill, because the surface hugs its text under `radius.round`. Figma
 *     has no width-equals-height floor, so one digit is a near-circle whose exact width depends on the
 *     brand's digit advance; code sets `min-inline-size` equal to the block size (`codeOnly`).
 *   · dot    — the `dot` part, a fixed square with no paint of its own, bound to `control.size.sm.dot` (8px
 *     at comfortable density, 6px at compact, which is the brief's density-scaled dot). The surface pads it
 *     by `space.0`, hugs it, and paints the round fill over it.
 * Two text parts rather than one, for the reason text-field has two (#1567): a bound TEXT node shows its
 * set's ONE default, so one node cannot read "Status" on some members and "3" on others.
 *
 * ── THE PAINT ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * ONE GRAMMAR, `{tone}.{genre}.{slot}`, with no fallback template: every (tone, genre) pair names its own
 * fill and label, so a missing key is a hole `lint-paint` arm 3 reports rather than a coordinate that
 * silently paints another genre's colors.
 *
 * STATUS: a tone label is `text.<tone>` on `foreground.<tone>-subtle` — the pair `modes.ts` already
 * contracts at 4.5:1 in every mode, and the pair `preview.ts`'s `info-subtle` badge binds.
 * COUNT and DOT: the bold tone fill `foreground.<tone>`, with `text.on-<tone>` on the count — the pair the
 * engine contracts for a bold fill. Both clear 3:1 against the page in every example brand and mode.
 *
 * NEUTRAL, IN EVERY GENRE: `inverse.foreground.tertiary` with `inverse.text.primary`. The first binding,
 * `foreground.secondary`, measured 1.00:1 against `background.primary` in both high-contrast modes and
 * 1.21–1.38:1 elsewhere, so the pill had no shape (owner-approved fix: a darker neutral fill). The search
 * that chose this pair is worth knowing before anyone "simplifies" it: no neutral surface role clears even
 * 1.5:1 against the page in all 20 brand × mode cells, because the high-contrast modes flatten every
 * `foreground.*`/`background.*` surface onto the page; the mid grays that do separate there
 * (`border.secondary`) drop `text.primary` on them to about 2.1:1. So a visible neutral needs an inverse
 * ink, and the inverse surface is the engine's own bold neutral ("the opposite-polarity fill"), whose ink
 * is `inverse.text.primary`. Its least dark tier is used. `test.ts` gates it at 3:1 against the page — the
 * fill is the pill's only boundary — and the label at 4.5:1, in all five example brands.
 */
import { ComponentDef } from '../component-schema';

export const badge: ComponentDef = {
  id: 'badge',
  name: 'Badge',
  aliases: ['status-badge', 'counter-badge', 'notification-badge', 'notification-dot', 'presence-badge', 'label', 'counter', 'state-label'],
  category: 'foundations',
  status: 'draft',
  summary: 'A static status label, count or dot. Nothing to click, and color is never the only signal.',
  description:
    'A small, static marker in one of three genres. A status label is short text in the flow of content, such as a lifecycle state, a keyword or a file size, and it announces its own text. A count is a number over a host, such as unread messages on an icon button, capped at a maximum. A dot is a contentless mark over a host for presence or unread state. A count or dot is hidden from assistive technology, and its meaning goes in the host\'s accessible name. A badge has no hover, focus or pressed state. Anything a user can click, toggle or remove is a tag.',

  props: [
    { name: 'genre', type: "enum: 'status' | 'count' | 'dot'", values: ['status', 'count', 'dot'], default: 'status', required: false, description: 'Which kind of badge. status = a short label in flow that announces its own text. count = a number over a host, hidden from assistive technology. dot = a contentless mark over a host, also hidden. For a count or dot, the host carries the meaning in its accessible name.' },
    { name: 'tone', type: "enum: 'neutral' | 'info' | 'success' | 'warning' | 'danger'", values: ['neutral', 'info', 'success', 'warning', 'danger'], default: 'neutral', required: false, description: 'Which semantic role the badge paints from. The text carries the meaning, so a tone never stands in for it.' },
    { name: 'label', type: 'string', required: false, description: 'The status text, for genre status. One or two words, in consistent casing across the product.' },
    { name: 'value', type: 'number', required: false, description: 'The count, for genre count. Above max it shows as max followed by a plus sign, formatted for the locale.' },
    { name: 'max', type: 'number', default: '99', required: false, description: 'The largest count shown in full, for genre count. A larger value shows as "99+".' },
    { name: 'showZero', type: 'boolean', default: 'false', required: false, description: 'Whether a count of zero still shows, for genre count. Hidden by default, since zero is usually nothing to act on.' },
    { name: 'overlap', type: "enum: 'rectangular' | 'circular'", values: ['rectangular', 'circular'], default: 'rectangular', required: false, description: 'The host shape a count or dot sits over. circular pulls the badge in toward the curve so it stays on the host\'s edge, such as an avatar.' },
  ],

  states: [],
  // `genre` first, `status` first within it: Figma's default member is the set's first child, so the
  // Figma default is the code default (#1699). `tone` keeps `neutral` first for the same reason.
  variants: {
    genre: ['status', 'count', 'dot'],
    tone: ['neutral', 'info', 'success', 'warning', 'danger'],
  },
  // WHEN each axis changes (#1611): a status label's tone moves live (a build going from running to
  // failed), so `tone` is runtime, and the box must not move when it does — the text and padding are
  // the same in every tone. `genre` is chosen when the badge is placed and never changes on screen, so it
  // is authoring, and the three genres may differ in size.
  axisKinds: { genre: 'authoring', tone: 'runtime' },

  paintKeys: ['{tone}.{genre}.{slot}'],

  tokens: {
    'type': 'type.label.sm.emphasis',
    'radius': 'radius.round',
    // ── GEOMETRY, per genre. The surface hugs its content under `radius.round`, so the padding pair is the
    // whole shape: a pill around the status text, a near-circle around one digit that grows into a pill,
    // and nothing around the dot's fixed square.
    'status.pad-x': 'space.150',
    'status.pad-y': 'space.100',
    'count.pad-x': 'space.075',
    'count.pad-y': 'space.025',
    'dot.pad-x': 'space.0',
    'dot.pad-y': 'space.0',
    // The dot's diameter: the tier's small dot rung, 8px at comfortable density and 6px at compact.
    'dot-size': 'control.size.sm.dot',

    // ── STATUS: the subtle tint and the tone's text ink; neutral is the inverse surface and its ink.
    'neutral.status.fill': 'color.inverse.foreground.tertiary',
    'neutral.status.label': 'color.inverse.text.primary',
    'info.status.fill': 'color.foreground.info-subtle',
    'info.status.label': 'color.text.info',
    'success.status.fill': 'color.foreground.success-subtle',
    'success.status.label': 'color.text.success',
    'warning.status.fill': 'color.foreground.warning-subtle',
    'warning.status.label': 'color.text.warning',
    'danger.status.fill': 'color.foreground.danger-subtle',
    'danger.status.label': 'color.text.danger',

    // ── COUNT: the bold tone fill and the ink the engine contracts on it.
    'neutral.count.fill': 'color.inverse.foreground.tertiary',
    'neutral.count.label': 'color.inverse.text.primary',
    'info.count.fill': 'color.foreground.info',
    'info.count.label': 'color.text.on-info',
    'success.count.fill': 'color.foreground.success',
    'success.count.label': 'color.text.on-success',
    'warning.count.fill': 'color.foreground.warning',
    'warning.count.label': 'color.text.on-warning',
    'danger.count.fill': 'color.foreground.danger',
    'danger.count.label': 'color.text.on-danger',

    // ── DOT: the count's fill, and no text.
    'neutral.dot.fill': 'color.inverse.foreground.tertiary',
    'info.dot.fill': 'color.foreground.info',
    'success.dot.fill': 'color.foreground.success',
    'warning.dot.fill': 'color.foreground.warning',
    'danger.dot.fill': 'color.foreground.danger',
  },

  anatomy: {
    root: 'surface',
    parts: {
      surface: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: '{genre}.pad-y', inlineLabel: '{genre}.pad-x' },
        radius: 'radius',
        children: ['text', 'count', 'dot'],
        note: 'The pill: a tone fill, fully rounded, sized by what it holds. A pill around a status label, a circle around one digit that grows into a pill, or the dot itself. It paints no border, so it never reads as a button or a field.',
      },
      text: {
        kind: 'text',
        type: 'type',
        presentWhen: { genre: ['status'] },
        note: 'The status text in the tone\'s text role. It carries the meaning, so the tone is never the only signal.',
      },
      count: {
        kind: 'text',
        type: 'type',
        presentWhen: { genre: ['count'] },
        note: 'The number, in the ink paired with the bold tone fill. Capped as the maximum followed by a plus sign, as in "99+".',
      },
      dot: {
        kind: 'box',
        role: 'presentation',
        size: 'dot-size',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { genre: ['dot'] },
        note: 'The dot\'s fixed square, about 8px. It paints nothing itself: the pill around it has no padding at this genre, so the pill\'s round fill is the dot.',
      },
    },
    codeOnly: [
      'the overlay rules for a count or dot — a count hides at zero unless showZero, caps as max followed by a plus sign, and sets min-inline-size equal to its block size so one digit is an exact circle (Figma has no width-equals-height floor, so the member approximates it with padding). Over a host, both carry a stroke in the canvas color that separates them from the host; the Figma members stay fill-only, since that stroke exists only against a host.',
      'the overlay placement — a count or dot is positioned against its host from a wrapper that owns the stacking context, so a host with overflow hidden does not clip it. Inset uses inset-inline-end so it mirrors in right-to-left layouts. circular overlap pulls the badge in by about 14.6% of the host size, onto the curve.',
      'the accessible-name wiring — for a count or dot the badge is aria-hidden and the host composes the meaning into its own name ("Inbox, 3 unread messages"). A count that changes after render is announced through one shared polite live region, debounced, never one region per badge. None of this has a Figma expression.',
      'number formatting — the count and its cap render through Intl.NumberFormat, so a locale with different digits or grouping reads correctly.',
    ],
  },

  figmaProperties: {
    variantAxes: ['genre', 'tone'],
    texts: {
      label: {
        part: 'text',
        default: 'Status',
      },
      value: {
        part: 'count',
        default: '3',
      },
    },
    swaps: {},
    booleans: {},
  },

  accessibility: {
    role: 'none. A status label is plain text and announces itself; a count or dot is aria-hidden and its meaning is in the host\'s accessible name.',
    wcag: [
      '1.4.1 Use of Color (the text carries the meaning; a tone, or a dot, is never the only signal)',
      '1.4.3 Contrast (the label ink clears 4.5:1 on its own fill, in every mode)',
      '1.4.11 Non-text Contrast (targets 3:1 between the fill and the page for the neutral status label and every count and dot, since the fill is the badge\'s only boundary)',
      '4.1.2 Name, Role, Value (a count or dot joins its host\'s accessible name, so the host says what it means)',
      '4.1.3 Status Messages (a count that changes after render reaches assistive technology through a polite live region)',
    ],
    keyboard: 'None. A badge takes no focus and has no action. A count on an icon button is reached through the button.',
    focus: 'Never focusable, and no focus ring. The host carries focus.',
    aria: 'Status label: not aria-hidden, and no role of its own. It reads as text in place, so it must not be given role="status". Count and dot: aria-hidden="true", and the host composes the meaning into its accessible name, as in "Inbox, 3 unread messages" or "Maya, online". A dot needs that text in the host name. Never describe it by color, as in "red dot". A count that changes while the page is open is announced through one shared polite live region.',
  },

  content: {
    labelPattern: 'Status label: one or two words, in the same casing everywhere ("In review", "Failed", "PDF 262 KB"). Count: a number, capped ("99+"). Dot: no text on screen. The host names what it means ("3 unread messages", "Online").',
  },

  docs: {
    usage: 'Use a status label to show a state or attribute inline, such as a lifecycle state beside a title or a keyword on a card. Use a count over a host for an accumulation the user can act on, such as unread messages. Use a dot when the exact number is unknown or does not matter, such as presence on an avatar. Keep it static. If it needs to be clicked, toggled or removed, it is a tag.',
    do: [
      'Put the meaning of a count or dot in the host\'s accessible name',
      'Cap a count, as in "99+", and hide it at zero unless zero matters',
      'Keep a status label to one or two words, in the same casing everywhere',
      'Pair every tone with text that says the same thing',
    ],
    dont: [
      'Make a badge clickable, selectable or removable. That is a tag.',
      'Use a badge for feedback about an action. That is a toast or a banner.',
      'Rely on the tone or a dot alone to carry meaning',
      'Put more than one count or dot on one host',
    ],
    contentGuidelines: 'Name the state, not the color: "Failed", not "Red". Use the same word for the same state everywhere, and keep it short enough to read at a glance. For a count, show the number up to the cap and the cap followed by a plus sign above it ("99+"). For a count or dot, write the host\'s accessible name so it says what the badge shows ("Notifications, 5 new"), since the badge itself is not read.',
  },

  ai: {
    primaryPurpose: 'Mark a status, count or presence with a small static badge that nobody clicks.',
    whenToUse: 'A short inline state or attribute (status), an actionable number over an icon button or tab (count), or presence or unread state over an avatar or nav item (dot).',
    avoidWhen: 'The user can click, toggle or remove it (use a tag), the message is feedback about an action (use a toast or banner), or the color would be the only signal.',
    commonPartners: ['icon-button', 'button'],
    triggerKeywords: ['badge', 'status badge', 'status label', 'counter badge', 'count badge', 'notification badge', 'notification dot', 'unread count', 'presence dot', 'label', 'pill label'],
    generationPriority: 3,
  },

  composition: {
    composesWith: [],
    alternativeTo: [],
    planned: ['tag', 'avatar', 'tabs', 'toast', 'banner'],
    replacesPatterns: ['a hand-drawn colored pill', 'a red circle with a number drawn over an icon'],
  },

  motion: {
    enter: 'A count or dot scales in from zero, from the corner it is anchored to. When a count changes, only the number animates, not the pill. A status label appears with no motion. A dot pulses only for a critical alert.',
    exit: 'A count or dot scales out to its anchor corner.',
    reduceMotion: 'Under prefers-reduced-motion every change is instant: no scale, no pulse.',
  },

  notes: {
    contested: [
      'One component or three. The brief\'s practice default is three siblings (count badge, dot, status label: Fluent, Primer); the owner chose one component switched by `genre` (2026-09-27), which is the brief\'s contested alternative (MUI, Ant). The cost the brief names is real: the accessibility contract differs by genre (hidden overlay vs announced label), so `accessibility.aria` states both, and a consumer must pick the genre deliberately rather than inherit a default. `genre` defaults to `status` because that is the only genre that needs no host.',
      'THE HOOK FOR THE TAG LANE: what Tag must differ on, so the two never read alike at rest. (1) Tag binds the `color.interactive.*` family; Badge never does, and `test.ts` holds that. (2) Tag has states (hover, pressed, focus-visible, disabled, and selected where it toggles); Badge has none. (3) Tag carries a 44px touch target; Badge is excluded from `lint-hit-target.ts`. (4) Tag shows an affordance at rest — a boundary stroke, a remove control, or both — where Badge is a borderless tone fill; which at-rest cue Tag uses is the Tag lane\'s design call, and the one thing it may not do is look like this pill. (5) Tag stands on Icon Button for its remove control; Badge nests nothing.',
      'Whether the status label belongs here or in Tag. The brief records the field split: MUI, Ant and Carbon fold the status label into Chip or Tag; Fluent, Primer and Polaris ship it as its own badge or label. The owner put it here (static means Badge), and the Badge-or-Tag test is interactivity: if it has an action, a remove control or a selected state, it is a Tag.',
      'Hide at zero by default (`showZero: false`), per the brief; some systems show "0" for a count the user has just cleared. Kept as the brief states it.',
      'The neutral status label is now the loudest status label: a bold inverse fill beside four subtle tone tints (held for the owner, 2026-09-27). The alternatives measured were a mid gray from existing roles (`text.secondary` under `inverse.text.primary`, 5.0:1 against the page and 5.0:1 for the label at the weakest cell) and a new neutral surface role with its own high-contrast treatment, which would be a new token name and a CONTRACT change.',
      'The four subtle tone tints themselves measure 1.06–1.40:1 against the page, lowest in dark mode, so the tone pills have little shape either. Their text carries the meaning, so nothing requires the shape; whether they should separate the way neutral now does is open.',
    ],
    unverified: [
      'The circular-overlap inset of about 14.6%, from the brief, derived from a circle\'s geometry (1 − 1/√2, halved). Not measured against any shipping system here.',
      'The count member\'s circle at one digit is an approximation: `space.075` inline padding around one digit against `space.025` block padding around the label line. It is about 1px off square in the example brands\' fonts by arithmetic, and has not been measured on a live Figma host.',
      'The dot binds `control.size.sm.dot`, the small selection control\'s dot rung, because it is the tier\'s density-scaled 8px dot. It borrows a control token for a non-control; a badge-specific rung would be a new token name.',
    ],
    evolution: [
      'The `genre` variant axis (owner-approved, 2026-09-27): the count and dot project to Figma beside the status label, fifteen members in all. Before it, the count and dot existed in code only.',
      'Bold tone fills for the count and dot (owner-approved with the genre axis): `foreground.<tone>` under `text.on-<tone>`, where the status label keeps the subtle tint.',
      'The neutral fill (owner-approved, 2026-09-27): `foreground.secondary` measured 1.00:1 against the page in high-contrast modes, so it moved to the inverse surface, gated at 3:1 against the page.',
      'A leading icon on the status label, as the brief allows, painted from the tone\'s icon role.',
      'A size axis (small, medium, large) for the count and status label, once a host needs more than one.',
    ],
  },
};
