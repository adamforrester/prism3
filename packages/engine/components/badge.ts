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
 *   3. VISUALLY DISTINCT FROM INTERACTIVE COMPONENTS. Every color binding is a tone or neutral surface
 *      role (`color.foreground.*`) or a text role (`color.text.*`) — never `color.interactive.*`, and the
 *      surface paints no border, so there is no fill-and-stroke pairing that reads as a button. `test.ts`
 *      holds this by name against a literal family list. `notes.contested` names what Tag must differ on.
 *   4. NO TOUCH TARGET. Not interactive, so `lint-hit-target.ts` lists it in `EXCLUDED` with that reason;
 *      a count on an icon button relies on the icon button's target.
 *
 * ── WHAT IS HELD, and why the projection is the status label only ─────────────────────────────────────
 *
 * The genre is a VARIANT AXIS in Figma terms (a designer picks a count member or a dot member), and no
 * name in the closed `VARIANT_AXES` vocabulary expresses it: `appearance` is an emphasis ladder over one
 * treatment, `style` a stroke treatment, `shape` a corner silhouette, and a genre is none of those — it
 * changes the content model, the placement and the accessibility contract together. A new axis name is
 * the owner's call, so `genre` is proposed in the PR and NOT added to the schema. Until it is admitted,
 * `genre` is a code prop, `variants` carries `tone` only, and the Figma set projects the status label —
 * the one genre that stands in flow on its own, with no host to overlay. The count and dot members
 * (circle-to-pill growth, the fixed dot square, the cutout stroke in the canvas color) land with the axis.
 *
 * `tone` is the existing axis name, and the right one: it is WHICH semantic role the label paints from,
 * the same kind of distinction `icon`'s `tone` names. Its values are the token tier's own words
 * (`danger`, not the brief's `error`) so a binding key and its ref agree; `neutral` leads because it is
 * the default. Against `icon`'s nine inks the set is `overlapping` (both carry info/success/warning/
 * danger; this one adds `neutral`, `icon` carries `inherit` and the rank words), recorded in
 * `lint-axis-values.ts` with that reason.
 *
 * ── THE BINDINGS, from the preview's badge pattern ────────────────────────────────────────────────────
 *
 * A tone label is `text.<tone>` on `foreground.<tone>-subtle` — the pair the engine already gates at
 * 4.5:1 in every mode (the semantic ink is contracted against its own subtle tint, `modes.ts`), and the
 * pair `preview.ts`'s `info-subtle` badge binds. Neutral is `text.primary` on `foreground.secondary`.
 * `type.label.sm.emphasis`, `space.150` × `space.100`, `radius.round` are the preview's own bindings.
 * Subtle rather than bold fills is a visual choice held for the owner in the PR.
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
  variants: {
    tone: ['neutral', 'info', 'success', 'warning', 'danger'],
  },
  // WHEN each axis changes (#1611): a status label's tone moves live (a build going from running to
  // failed), so `tone` is runtime, and the box must not move when it does — the text and padding are
  // the same in every tone.
  axisKinds: { tone: 'runtime' },

  paintKeys: ['{tone}.{slot}'],

  tokens: {
    'type': 'type.label.sm.emphasis',
    'pad-x': 'space.150',
    'pad-y': 'space.100',
    'radius': 'radius.round',
    'neutral.fill': 'color.foreground.secondary',
    'neutral.label': 'color.text.primary',
    'info.fill': 'color.foreground.info-subtle',
    'info.label': 'color.text.info',
    'success.fill': 'color.foreground.success-subtle',
    'success.label': 'color.text.success',
    'warning.fill': 'color.foreground.warning-subtle',
    'warning.label': 'color.text.warning',
    'danger.fill': 'color.foreground.danger-subtle',
    'danger.label': 'color.text.danger',
  },

  anatomy: {
    root: 'surface',
    parts: {
      surface: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        radius: 'radius',
        children: ['text'],
        note: 'The pill: a tone fill, fully rounded, sized by its text. It paints no border, so it never reads as a button or a field.',
      },
      text: {
        kind: 'text',
        type: 'type',
        note: 'The status text in the tone\'s text role. It carries the meaning, so the tone is never the only signal.',
      },
    },
    codeOnly: [
      'the genre switch — only the status label projects to Figma until a genre axis is admitted, so a count and a dot exist in code alone. Count: a number in the same pill that grows from a circle to a pill as digits are added, hidden at zero unless showZero, capped as max followed by a plus sign. Dot: a fixed square of about 8px with no text. Both sit over their host, anchored to its top trailing corner, with a stroke in the canvas color that separates them from the host.',
      'the overlay placement — a count or dot is positioned against its host from a wrapper that owns the stacking context, so a host with overflow hidden does not clip it. Inset uses inset-inline-end so it mirrors in right-to-left layouts. circular overlap pulls the badge in by about 14.6% of the host size, onto the curve.',
      'the accessible-name wiring — for a count or dot the badge is aria-hidden and the host composes the meaning into its own name ("Inbox, 3 unread messages"). A count that changes after render is announced through one shared polite live region, debounced, never one region per badge. None of this has a Figma expression.',
      'number formatting — the count and its cap render through Intl.NumberFormat, so a locale with different digits or grouping reads correctly.',
    ],
  },

  figmaProperties: {
    variantAxes: ['tone'],
    texts: {
      label: {
        part: 'text',
        default: 'Status',
      },
    },
    swaps: {},
    booleans: {},
  },

  accessibility: {
    role: 'none. A status label is plain text and announces itself; a count or dot is aria-hidden and its meaning is in the host\'s accessible name.',
    wcag: [
      '1.4.1 Use of Color (the text carries the meaning; a tone, or a dot, is never the only signal)',
      '1.4.3 Contrast (the label ink clears 4.5:1 on its own tone fill, in every mode)',
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
    contentGuidelines: 'Name the state, not the color: "Failed", not "Red". Use the same word for the same state everywhere, and keep it short enough to read at a glance. For a count or dot, write the host\'s accessible name so it says what the badge shows ("Notifications, 5 new"), since the badge itself is not read.',
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
    ],
    unverified: [
      'The circular-overlap inset of about 14.6%, from the brief, derived from a circle\'s geometry (1 − 1/√2, halved). Not measured against any shipping system here.',
      'Neutral\'s pair (`text.primary` on `foreground.secondary`) is measured by `test.ts` at 4.5:1 across the corpus brands, but not gated by the engine\'s own contract the way a tone ink on its tint is. In high-contrast modes the neutral surfaces flatten toward the page, so the neutral pill\'s shape may not show against the page there. The text still reads, and nothing requires a static label\'s shape to clear 3:1.',
    ],
    evolution: [
      'A `genre` variant axis, so the count and dot project to Figma beside the status label (held for the owner).',
      'A leading icon on the status label, as the brief allows, painted from the tone\'s icon role.',
      'A size axis (small, medium, large) for the count and status label, once a host needs more than one.',
      'Bold tone fills for the count, where a subtle tint over a busy host may not stand out.',
    ],
  },
};
