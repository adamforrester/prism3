/**
 * Banner — a persistent message in the page flow about an important state, with optional actions.
 * KB brief: `components/banner.md`.
 *
 * ── THE OWNER'S SHAPE (the proposal on #2579, approved as recommended by Q327, 2026-10-16) ─────────────────────
 *
 * Four tones (`info | success | warning | danger`, FieldMessage's statuses and Badge's status tones less neutral),
 * subtle emphasis only (the tone's tint, no bold variant), and a `width` axis for placement: `contained` (a rounded
 * box inside a section) or `full` (square corners, for the top of a page). 4 × 2 = 8 members. No size axis (the brief
 * names none; density moves the spacing) and no state axis: a banner is not interactive, its buttons are.
 *
 * ── PAINT ─────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The fill is the tone's subtle surface (`color.foreground.{tone}-subtle`, which the token tier already describes as
 * the banner surface), the edge a full 1px border in the tone's BORDER role (`color.border.{tone}`, Q327.8 A), and the
 * glyph the tone's ICON role. A border never binds an icon or text role (Q346), so the edge and the glyph are two
 * bindings even where they resolve alike. The title and the body are `color.text.primary` (Q327.4 A): the tone stays
 * on the glyph and the edge. `test.ts` holds every pair to its floor as literals across every example brand × mode.
 *
 * ── PARTS ─────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The tone glyph (four `presentWhen` vector parts, FieldMessage's shape and FieldMessage's glyph per status, so a
 * danger banner and an errored field show the same mark), a content column (title, the body as a native slot, the
 * actions row), and a dismiss button (FlushIconButton.Neutral, flush, small, always the `close` glyph with no swap: Q386 on
 * #2808; flush per owner QA 2026-10-19, as Dialog's close). The actions are up to
 * two nested Button.Neutral, outline then text, off by default (Q327.6 A). Q363 (#2661) decided a shared Button group
 * container for action sets; it is not built yet, so the actions are nested Buttons here and the move is filed as
 * #2787. Mints nothing.
 */
import { ComponentDef } from '../component-schema';

/** The tone glyph. One part per tone because `glyph` substitutes the axis VALUE verbatim (FieldMessage's header). */
const toneGlyph = (tone: string, glyph: string, shape: string) => ({
  kind: 'vector' as const,
  glyph,
  size: 'glyph-size',
  presentWhen: { tone: [tone] },
  optional: true,
  note: `The ${tone} glyph, ${shape}, hidden from assistive technology: the text carries the meaning, and the shape tells the tones apart without color.`,
});

export const banner: ComponentDef = {
  id: 'banner',
  name: 'Banner',
  aliases: ['alert', 'callout', 'inline-alert'],
  category: 'feedback',
  status: 'draft',
  summary: 'A persistent message in the page flow about an important state, with optional actions.',
  description:
    'A message that sits in the page flow and stays until the user dismisses it or the condition clears: a page-level error, a service notice, or the result of a process that has to stay visible. Because it is part of the page and the tab order, it can carry actions. Four tones, each with its own glyph shape, so the tone is never carried by color alone. Contained inside a section, or full width at the top of a page. Not a toast (it does not go away by itself), not a field message (that belongs to one field), and not a dialog (it does not block the page).',

  props: [
    { name: 'tone', type: "enum: 'info' | 'success' | 'warning' | 'danger'", values: ['info', 'success', 'warning', 'danger'], default: 'info', required: false, description: 'How serious the message is. Sets the fill, the edge and the glyph. Match it to the message: danger for an error that blocks the user, warning for a risk, success for a finished process, info for everything else.' },
    { name: 'width', type: "enum: 'contained' | 'full'", values: ['contained', 'full'], default: 'contained', required: false, description: 'contained is a rounded box inside a section or card. full has square corners and spans the page, for a message about the whole app at the top of the page.' },
    { name: 'title', type: 'node', required: false, description: 'A short heading that names the issue ("Payment failed"), with no period at the end. When present, it labels the banner\'s region.' },
    { name: 'children', type: 'node', required: true, description: 'The body: what happened and what to do next, in one or two sentences. It can hold a link or a short list. Never repeat the title.' },
    { name: 'headingLevel', type: "enum: 2 | 3 | 4 | 5 | 6", values: ['2', '3', '4', '5', '6'], default: '2', required: false, description: 'The heading level of the title, matched to where the banner sits in the page outline, so the outline stays in order.' },
    { name: 'icon', type: 'node | false', required: false, description: 'Replaces the tone glyph, or false to hide it in a dense layout. The glyph is hidden from assistive technology either way.' },
    { name: 'actions', type: 'node', required: false, description: 'Up to two buttons that resolve the message, the main one first: an outline Button.Neutral, then a text Button.Neutral. Name each by what it does ("Retry", "Update billing").' },
    { name: 'dismissible', type: 'boolean', default: false, required: false, description: 'Whether the banner shows a dismiss button. Set it together with onDismiss. Leave a banner about a condition that still blocks the user not dismissible.' },
    { name: 'onDismiss', type: 'function', required: false, description: 'Called when the dismiss button is pressed. Remove the banner, store the dismissal so it does not return on reload, and move focus to a sensible place.' },
    { name: 'announce', type: "enum: 'auto' | 'none'", values: ['auto', 'none'], default: 'auto', required: false, description: 'Whether a banner inserted after the page loads is announced: auto announces it through the page\'s live region, assertively for danger and politely otherwise. A banner present when the page loads is never announced; it is read in order.' },
  ],

  states: [],
  variants: {
    tone: ['info', 'success', 'warning', 'danger'],
    width: ['contained', 'full'],
  },
  // A banner's tone changes live (a process going from running to failed), so `tone` is runtime and holds one footprint:
  // the glyph is the same size in every tone. `width` is chosen where the banner is placed.
  axisKinds: { tone: 'runtime', width: 'authoring' },

  paintKeys: ['{tone}.{slot}', '{slot}'],

  tokens: {
    // ── PAINT per tone (Q327: subtle only, a full 1px border in the tone). The border is the BORDER role (Q346).
    'info.fill': 'color.foreground.info-subtle',
    'info.border': 'color.border.info',
    'info.icon': 'color.icon.info',
    'success.fill': 'color.foreground.success-subtle',
    'success.border': 'color.border.success',
    'success.icon': 'color.icon.success',
    'warning.fill': 'color.foreground.warning-subtle',
    'warning.border': 'color.border.warning',
    'warning.icon': 'color.icon.warning',
    'danger.fill': 'color.foreground.danger-subtle',
    'danger.border': 'color.border.danger',
    'danger.icon': 'color.icon.danger',
    // ── INK (Q327.4 A): the title and the body in primary text, in every tone.
    'label': 'color.text.primary',
    'body': 'color.text.primary',
    // ── TYPE (the proposal's §5).
    'title-type': 'type.label.md.emphasis',
    'body-type': 'type.body.md.default',
    'glyph-size': 'icon.size.md',
    'border-width': 'border-width.hairline',
    // ── CORNERS (the proposal's §5, DRAFT): contained rounds, full is square.
    'width.contained.radius': 'radius.md',
    'width.full.radius': 'radius.none',
    // ── SPACE (the proposal's §5, DRAFT). In `densitySpacing`: the padding, the glyph to the content, the body to the
    // actions, and the actions to each other. The title to the body is FIXED at 4px: one step down at compact would be
    // 2px, under the 4px gap floor (owner, 2026-09-29).
    'pad': 'space.200',
    'gap': 'space.150',
    'content-gap': 'space.050',
    'actions-gap': 'space.150',
    'action-gap': 'space.100',
    // The title's first line is shorter than the 24px glyph (a 14px label at the snug line height), so the title is padded
    // down to center that line on the glyph, as the accordion's title is. Fixed: it tracks the glyph, not density.
    'title-offset': 'space.050',
  },
  densitySpacing: ['pad', 'gap', 'actions-gap', 'action-gap'],

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // The paint and geometry owner, in the schema's sense; the banner takes no focus (FieldMessage's reading).
        role: 'target',
        paintSlots: ['fill', 'border'],
        // The glyph, the content and the dismiss button, top-aligned so the glyph and the dismiss button stay beside the
        // first line when the text wraps.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        // Built at 480 for both widths (the proposal's §9); a host stretches the instance.
        placementWidth: 480,
        padding: { block: 'pad', inlineLabel: 'pad' },
        gap: 'gap',
        radius: 'width.{width}.radius',
        strokeWidth: 'border-width',
        children: ['iconInfo', 'iconSuccess', 'iconWarning', 'iconDanger', 'content', 'dismiss'],
        note: 'The banner: the tone\'s tinted surface with a 1px edge in the tone\'s border color, drawn inside so it adds no size. Rounded when contained, square when full width.',
      },
      // FieldMessage's glyph per status (its header measures the artwork): the exclamation in a triangle for the most
      // serious tone, in a circle for a warning. Held for the owner: the proposal listed the glyph names in tone order.
      iconInfo: toneGlyph('info', 'info-circle', 'an i in a circle'),
      iconSuccess: toneGlyph('success', 'check-circle', 'a check in a circle'),
      iconWarning: toneGlyph('warning', 'error-circle', 'an exclamation in a circle'),
      iconDanger: toneGlyph('danger', 'warning-triangle', 'an exclamation in a triangle'),
      content: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        gap: 'content-gap',
        children: ['titleBox', 'body', 'actions'],
        note: 'The title, the body and the actions, stacked. It fills the row between the glyph and the dismiss button.',
      },
      titleBox: {
        kind: 'box',
        role: 'presentation',
        optional: true,
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        paddingTop: 'title-offset',
        children: ['title'],
        note: 'The title\'s row, padded down so its first line centers on the glyph.',
      },
      title: {
        kind: 'text',
        type: 'title-type',
        wrap: true,
        note: 'The title: a short heading that names the issue. It wraps rather than truncating.',
      },
      body: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        children: ['placeholder'],
        note: 'The body: a slot that holds the message, and can take a link or a short list in place of the sentence.',
      },
      placeholder: {
        kind: 'text',
        type: 'body-type',
        paintSlot: 'body',
        wrap: true,
        // Literal copy (the proposal's §4, DRAFT): a slot's text can carry no TEXT property, so the designer edits it in place.
        characters: 'Body text. Say what happened and what to do next.',
        note: 'Placeholder text. Replace it with the message, or with a link or a list.',
      },
      actions: {
        kind: 'box',
        role: 'presentation',
        optional: true,
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        paddingTop: 'actions-gap',
        gap: 'action-gap',
        children: ['action1', 'action2'],
        note: 'The actions row under the body. Off by default.',
      },
      action1: {
        kind: 'nest',
        nests: 'button-neutral',
        nesting: { kind: 'nest-fixed', variant: { appearance: 'outline', size: 'small', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        overrides: { texts: { label: 'Action' } },
        note: 'The main action: a Button.Neutral, outline, small.',
      },
      action2: {
        kind: 'nest',
        nests: 'button-neutral',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { appearance: 'text', size: 'small', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        overrides: { texts: { label: 'Action' } },
        note: 'The second action: a Button.Neutral, text, small. Off by default.',
      },
      dismiss: {
        kind: 'nest',
        nests: 'flush-icon-button-neutral',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { shape: 'flush', size: 'small', state: 'rest' } },
        overrides: { swaps: { icon: 'close' } },
        note: 'The dismiss button: a FlushIconButton.Neutral, flush, small (the bare glyph, no edge or fill, as Dialog\'s close; owner QA 2026-10-19), always the close glyph, with no swap (Q386). Off by default.',
      },
    },
    codeOnly: [
      'static or inserted — a banner present when the page loads is a `<section aria-labelledby>` pointing at the title, read in document order, with no live region: `role="alert"` on it would announce it twice or at the wrong time. A banner inserted after an action is announced through the page\'s shared live region, which exists before the text is inserted: assertive (`role="alert"`) for danger, polite (`role="status"`) for the other tones. `announce="none"` turns that off.',
      'the heading level — the title renders as the `<h*>` that `headingLevel` names (default 2), never a hard-coded level. Figma has no heading level.',
      'dismissal — the dismiss button renders only when `dismissible` and `onDismiss` are both set. Its accessible name says what it dismisses ("Dismiss error message"), not a bare "Close". The dismissal is stored against an id and a version, so a dismissed notice does not return on reload. A banner about a condition that still blocks the user is not dismissible, or comes back only while the condition holds.',
      'focus after a dismiss — focus moves to a surviving element that makes sense (the control that caused the banner, or the page heading), never to the page body.',
      'the dismiss target — the small flush FlushIconButton is a 20px glyph; its hit area extends to at least 44×44px in code, as FlushIconButton\'s does.',
      'one banner at a time — show only the most serious banner in a region; route lower-priority messages to a notification list rather than stacking banners.',
      'motion — appears with an opacity fade; a dismiss collapses the height (about 150 to 200ms) and fades, on `motion.transition.exit`, so the content below does not jump. Under `prefers-reduced-motion` both are instant. A banner inserted at the top of a page later reserves its space. Figma shows the banner at rest.',
      'RTL — logical properties throughout: the glyph and the dismiss button swap edges. No glyph mirrors (the four tone glyphs and the close glyph are symmetric).',
      'text expansion — never a fixed height. The text wraps, and the actions row wraps onto a new line when the buttons do not fit.',
      'forced colors — the edge is a border, so it stays in the system border color when the browser removes the fill.',
      'the full width — the edge runs on all four sides at full width too. Top and bottom only, which a page-top banner often uses, needs a one-sided stroke the anatomy cannot express yet.',
    ],
  },

  figmaProperties: {
    variantAxes: ['tone', 'width'],
    texts: {
      title: { part: 'title', default: 'Title', figmaName: 'title text' },
    },
    booleans: {
      title: { part: 'titleBox', default: true },
      icon: { part: ['iconInfo', 'iconSuccess', 'iconWarning', 'iconDanger'], default: true },
      actions: { part: 'actions', default: false },
      secondAction: { part: 'action2', default: false, figmaName: 'second action', figmaOnly: true },
      dismissible: { part: 'dismiss', default: false, figmaName: 'dismiss' },
    },
  },

  accessibility: {
    role: 'A banner present when the page loads is a region (<section aria-labelledby> pointing at the title) and has no live role. A banner inserted after an action is announced through the page\'s live region: role="alert" for danger, role="status" for the other tones.',
    wcag: [
      '4.1.3 Status Messages (a banner inserted after an action is announced without moving focus)',
      '1.3.1 Info and Relationships (the title is a heading at the level the page outline needs, and it labels the region)',
      '1.4.1 Use of Color (each tone has its own glyph shape, and the text says what happened)',
      '1.4.3 Contrast (the title and body clear 4.5:1 on every tone\'s fill, measured in every mode of the example brands)',
      '1.4.11 Non-text Contrast (the edge clears 3:1 against the page and the glyph 3:1 against the fill, measured in every mode of the example brands)',
      '2.4.3 Focus Order (the actions are in the tab order, and a dismiss moves focus to a surviving element)',
      '2.5.8 Target Size (Minimum) (the dismiss button is a 20px glyph; targets 44×44px through a code-side hit area)',
      '2.2.1 Timing Adjustable (the reason errors go in a banner, which stays, rather than a toast, which goes away)',
    ],
    keyboard: 'The actions and the dismiss button are ordinary Tab stops in reading order. The banner itself takes no focus.',
    focus: 'No focus of its own. After a dismiss, focus moves to the control that caused the banner or to the page heading, never to the page body.',
    aria: 'The glyph is aria-hidden. A banner present at load: a section with aria-labelledby pointing at the title, and no role="alert". An inserted banner: announced through a live region that already exists, role="alert" for danger and role="status" otherwise. The dismiss button\'s accessible name names what it dismisses ("Dismiss error message"), and is translated.',
  },

  content: {
    labelPattern: 'Title: names the issue up front, in sentence case and with no period ("Payment failed", not "Error"). Body: what happened and what to do next, in one or two sentences, never repeating the title. Actions: a verb of one or two words ("Retry", "Update billing").',
    errorPattern: 'Say what went wrong, whether anything was lost, and how to fix it. Use danger only for an error that blocks the user.',
  },

  docs: {
    usage: 'Use a Banner for an important message the user should see and may need to act on, and that has to stay until it is resolved: a page-level error, a service notice, or the result of a process. Contain it inside the section it is about, or run it full width at the top of the page for a message about the whole app. Show one banner at a time in a region, the most serious one.',
    do: [
      'Match the tone to how serious the message is',
      'Name the issue in the title, and say what to do next in the body',
      'Give each action a verb that says what it does',
      'Move focus to a sensible place after a dismiss',
    ],
    dont: [
      'Use a banner for a short confirmation like "Saved". Use a toast.',
      'Use a banner for one field\'s validation. Use the field\'s message.',
      'Stack banners. Show the most serious one.',
      'Mark a banner present at page load as role="alert"',
      'Let a dismissed banner come back on reload',
    ],
    contentGuidelines: 'Titles are short, specific and in sentence case, with no period. The body states the consequence and the fix in one or two sentences; for more, link to the details. Action labels are verbs.',
  },

  ai: {
    primaryPurpose: 'Show a persistent, in-flow message about an important state, with optional actions to resolve it.',
    whenToUse: 'A page or section error, a service or maintenance notice, or a result that has to stay visible until the user acts on it or dismisses it.',
    avoidWhen: 'The message is a brief confirmation that can go away by itself (a toast), it is about one field (a field message), the user must decide before going on (a dialog), or it is a short status label beside content (a badge).',
    commonPartners: ['link', 'list', 'button', 'button-neutral'],
    triggerKeywords: ['banner', 'alert banner', 'callout', 'inline alert', 'message bar', 'notice', 'page error', 'service notice', 'section message'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['button-neutral', 'flush-icon-button-neutral'],
    alternativeTo: ['dialog', 'field-message', 'badge'],
    replacesPatterns: ['a colored div with an icon and role="alert" on a message present at load', 'an error shown as a toast that disappears'],
    supersededBy: [],
    planned: ['toast', 'button-group'],
  },

  motion: {
    enter: 'Fades in. A banner inserted at the top of a page reserves its space, so the content below does not jump.',
    exit: 'Collapses its height and fades (about 150 to 200ms, motion.transition.exit), so the content below moves up smoothly.',
    reduceMotion: 'Under prefers-reduced-motion it appears and goes instantly.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2579): the glyph per tone follows FieldMessage (danger: the exclamation in a triangle; warning: in a circle), where the proposal listed the glyph names in tone order; the full width keeps the edge on all four sides, where the proposal said top and bottom only (a one-sided stroke the anatomy cannot express, #2788); the title text property reads "title text" beside the "title" toggle, as Dialog\'s description does; the actions gap (space.100) and the actions row offset (space.150); the page under Components rather than a new feedback section.',
      'The actions are two fixed nested Buttons, not the shared Button group container Q363 decided (#2661); the move is filed as #2787.',
      'The brief\'s bold (high-contrast) emphasis, a neutral tone and the promotional genre are not built (Q327.1 A, Q327.2 A); each can follow.',
    ],
    unverified: [
      'That the native slot keeps a designer\'s body content across a tone or width switch, as it does across the accordion\'s expansion switch.',
      'Whether the nested buttons\' Rest, Hover and Pressed prototype reactions fire inside a nested instance (the open nesting item on #2466).',
    ],
    evolution: [
      'Q386 (#2808): no component requires the Neutral button families, so the dismiss nests FlushIconButton.Neutral with the close glyph fixed and no swap, as Dialog\'s close does (Q385).',
      'Owner decisions: the proposal on #2579 and Q327 (2026-10-16): tones info, success, warning and danger; subtle emphasis only; placement on a width axis, contained or full; title and body in text.primary; the body a native content slot; up to two actions, outline then text, off by default; the name Banner with the aliases alert, callout and inline-alert; a full 1px border in the tone color. Q346: the edge binds the border role, never an icon or text role.',
    ],
  },
};
