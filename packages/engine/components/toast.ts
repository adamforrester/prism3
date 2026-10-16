/**
 * Toast — a short status message over the page after something the user did ("Added to bag"), announced politely,
 * with an optional action and a close button (KB brief: `components/toast.md`).
 *
 * ── THE OWNER'S SHAPE (the proposal and wireframe on #2668, every numbered call A, 2026-10-16) ─────────────────────
 *
 * ONE component on an `intent` axis, `neutral | success`, neutral first (call 2 A): 2 members. A toast confirms the
 * user's own action and is safe to miss (call 1 A); errors, warnings, lasting states and an action that has no other
 * route go to a banner, so there is no danger or warning member. Neutral carries no glyph (call 3 A); success carries
 * the circled check FieldMessage uses. No size axis (the brief names one size) and no state axis: a toast is not
 * interactive, and its nested Button and IconButton.Neutral carry their own states and prototype reactions.
 *
 * ── THE SURFACE (call 9 A) ────────────────────────────────────────────────────────────────────────────────────
 *
 * The inverse surface, `color.inverse.background.primary`, dark on a light page and light on a dark one: 15.98:1
 * against the page in the lowest committed cell (the proposal's §8), so it needs no border. The message is
 * `color.inverse.text.primary`, the success glyph `color.inverse.icon.success`. The nested action and close sit at
 * `surface: inverse`, so the projector's `color.inverse.*` rewrite gives them their inverse ink and focus ring and no
 * new role is minted. `test.ts` holds every one of these pairs over every committed brand × mode.
 *
 * ── THE CLOSE IS AN ICONBUTTON.NEUTRAL, NOT A FLUSHICONBUTTON (owner item) ──────────────────────────────────────
 *
 * The build brief named "Button / Flush icon button" for the nests. The approved proposal (§2) names IconButton.Neutral
 * for close, ghost, small, `surface: inverse`, and says why not FlushIconButton: it has no inverse surface. That is
 * still true on main: FlushIconButton.Neutral's glyph is `color.interactive.neutral.icon.rest`, the default-ground ink,
 * which on the inverse card is dark on dark. This build follows the approved proposal and lists it under Owner items.
 *
 * ── PLACEMENT, STACKING AND TIMING ARE CODE (calls 4, 5, 6, 10, 11) ──────────────────────────────────────────────
 *
 * The region that places the toast, owns the live region and the queue, and runs the timer is the code-side `Toaster`,
 * as Dialog's backdrop is not in Dialog (Q303.3). Figma shows the resting toast, built 360 wide (call 11 A) and hugging
 * its height. Everything Figma cannot express is in `codeOnly`, stated plainly as code-side. The proposal's canvas
 * furniture (a phone frame and a desktop frame) is filed as a follow-up, not built here.
 */
import { ComponentDef } from '../component-schema';

export const toast: ComponentDef = {
  id: 'toast',
  name: 'Toast',
  aliases: ['snackbar', 'notification', 'flag', 'flash-message'],
  category: 'feedback',
  status: 'draft',
  summary: 'A short status message over the page after an action. Announced politely; it never takes focus.',
  description:
    'A short status message that appears over the page after something the user did, such as "Added to bag" or "Address saved", and goes away by itself. It confirms the user\'s own action, and the page already shows the change, so missing it costs nothing. It is announced politely and never takes focus. It can carry one action, which also exists elsewhere on the page, and a close button. One toast shows at a time: a new one replaces the one showing. Not a banner (a message the user must see, such as an error, stays in the page until it is resolved), not a dialog (a decision before going on), and not a field message (about one field).',

  props: [
    { name: 'message', type: 'string', required: true, description: 'The status, a few words stating the outcome ("Added to bag"). It wraps onto a second line rather than truncating.' },
    { name: 'intent', type: "enum: 'neutral' | 'success'", values: ['neutral', 'success'], default: 'neutral', required: false, description: 'neutral for a plain confirmation, with no glyph. success adds a circled check beside the message. A message the user must not miss, such as an error, is a banner, not a toast.' },
    { name: 'action', type: '{ label: string; onAction: function }', required: false, description: 'At most one action, a text button named by one verb ("Undo", "View bag"). The same action must also exist elsewhere on the page. A toast with an action does not close by itself.' },
    { name: 'duration', type: 'number', default: 6000, required: false, description: 'How long a toast with no action shows, in milliseconds. Never less than 5000; a shorter value is raised to 5000. Raise it for a longer or translated message. Ignored when there is an action.' },
    { name: 'dismissible', type: 'boolean', default: true, required: false, description: 'Shows the close button, named "Dismiss". On by default: it is the one exit a user can count on.' },
    { name: 'onDismiss', type: 'function', required: false, description: 'Called when the toast closes for any reason: the close button, the timer, the next toast replacing it, or the action.' },
  ],

  states: [],
  variants: {
    // Neutral first: the code default, so Figma's first member is the code default too (Q347, Q359).
    intent: ['neutral', 'success'],
  },
  axisKinds: { intent: 'authoring' },

  // The intent leads, so `success.icon` answers the success member only; the card and the message are the same on both.
  paintKeys: ['{intent}.{slot}', '{slot}'],

  tokens: {
    // ── PAINT (call 9 A). The inverse surface and its ink.
    'fill': 'color.inverse.background.primary',
    'label': 'color.inverse.text.primary',
    'success.icon': 'color.inverse.icon.success',
    'shadow': 'shadow.lg',
    'radius': 'radius.xl',
    // ── TYPE AND GLYPH.
    'type': 'type.body.md.default',
    'glyph-size': 'icon.size.sm',
    // ── SPACE (the proposal's §8, DRAFT, approved by call 13 A): block 8, inline start 16, inline end 8; the glyph to
    // the message 12; the action to the close 4. The message to the controls is this build's, 8 (the wireframe's).
    'pad-y': 'space.100',
    'pad-x': 'space.200',
    'pad-end': 'space.100',
    'gap': 'space.100',
    'glyph-gap': 'space.150',
    'controls-gap': 'space.050',
  },

  // The paddings and the two content gaps follow density. The 4px between the action and the close does not: it is
  // already the gap floor (`space.050`), and compact would take it to 2.
  densitySpacing: ['pad-y', 'pad-x', 'pad-end', 'gap', 'glyph-gap'],

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill'],
        elevation: 'shadow',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        // Built 360 wide (call 11 A), a small phone's width less nothing: in code it is the viewport less the grid
        // margins below 768px, and 320 to 480px from 768px.
        placementWidth: 360,
        padding: { block: 'pad-y', inlineLabel: 'pad-x', inlineEnd: 'pad-end' },
        gap: 'gap',
        children: ['content', 'controls'],
        note: 'The toast: the inverse surface, its shadow and its corners. It holds the message on the start side and the action and close button on the end side.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        // Start, not center: a two-line message keeps the glyph beside its first line.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        gap: 'glyph-gap',
        children: ['icon', 'message'],
        note: 'The glyph and the message. It takes the width the action and close button do not.',
      },
      icon: {
        kind: 'vector',
        glyph: 'check-circle',
        size: 'glyph-size',
        presentWhen: { intent: ['success'] },
        note: 'The success glyph, a circled check, hidden from assistive technology: the message carries the meaning. A neutral toast has no glyph.',
      },
      message: {
        kind: 'text',
        type: 'type',
        wrap: true,
        note: 'The message. It wraps onto a second line rather than truncating.',
      },
      controls: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'row', align: 'center', justify: 'end', sizing: { x: 'hug', y: 'hug' } },
        gap: 'controls-gap',
        children: ['action', 'close'],
        note: 'The action and the close button, at the end edge.',
      },
      action: {
        kind: 'nest',
        nests: 'button',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { appearance: 'text', size: 'small', surface: 'inverse', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        overrides: { texts: { label: 'Action' } },
        note: 'The action: a Button, text, small, on the inverse surface, reading "Action" until a designer names it. Off by default.',
      },
      close: {
        kind: 'nest',
        nests: 'icon-button-neutral',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { appearance: 'ghost', size: 'small', shape: 'square', surface: 'inverse', state: 'rest' } },
        overrides: { swaps: { icon: 'close' } },
        note: 'The close button: an IconButton.Neutral, ghost, small, on the inverse surface, showing the close glyph and named "Dismiss". On by default.',
      },
    },
    codeOnly: [
      'the Toaster — the toast is never rendered in place. One `<Toaster />` is mounted once at the app root and renders the fixed-position region, the live region and the landmark. Code fires a toast with `toast(message, options)`, which returns an id; `toast.dismiss(id)` closes it. Options: `intent`, `action: { label, onAction }`, `duration`, `dismissible`. Toaster props: `placement` (per breakpoint), `offset`, `label`. Figma shows the toast, not the region.',
      'the live region — one shared region with `role="status"` and `aria-atomic="true"` (polite), present and empty from app start. The message is written into it a frame after the region exists, because some screen readers (NVDA) ignore a region inserted together with its text. Never one region per toast. The message is announced once; the success glyph is `aria-hidden`.',
      'no focus steal — showing a toast never moves focus.',
      'placement — below `breakpoint.md` (768px): bottom center, the viewport width less `grid.sm.margin` (16px) each side, above `env(safe-area-inset-bottom)`. From 768px: the bottom inline-end corner, inset by the grid margin, 320 to 480px wide. In right-to-left the corner is the left one, through logical properties (`inset-inline-end`). A sticky bottom bar on the page raises the region by the Toaster `offset`, so the toast never sits on it. Figma builds the toast at 360 wide.',
      'one at a time — a new toast replaces the one showing: the old one plays its exit, then the new one its enter. Nothing queues, so a stale message never shows after the user has moved on.',
      'timing, no action — the toast closes after `duration`, 6000ms by default and never less than 5000ms (a shorter value is clamped). The timer pauses while the pointer is over the toast, while focus is inside the region, and while the window is hidden or blurred, and resumes with the time left; it does not restart. Figma has no timer.',
      'timing, with an action — no timer. The toast stays until the action, the close button, the next toast, or a page change. `duration` is ignored.',
      'the keyboard route — the region is a landmark, `<section aria-label="Notifications">`. F6 moves focus into it, to the newest toast\'s first control; Escape or Shift+F6 returns focus to where it was. The action always also exists elsewhere on the page, so a keyboard user who never enters the region loses nothing.',
      'the action — at most one. A text Button; when it navigates ("View bag") code renders it as a link element. Its label is set per toast in code; in Figma a designer edits the nested Button\'s label, since a nested instance\'s text cannot be a property of the toast.',
      'the close button — `aria-label="Dismiss"`. A small IconButton.Neutral is a 36px box; its hit area is extended to 44×44px in code, as IconButton records.',
      'focus not obscured — while a toast shows, the page sets `scroll-padding-bottom` to the toast\'s height plus its offset, so a focused control near the bottom of the viewport scrolls clear of it.',
      'motion — enter: an 8px slide up and a fade on `motion.transition.enter` (`motion.duration.normal`, `motion.easing-role.enter`). Exit: a fade on `motion.transition.exit` (`motion.duration.fast`, `motion.easing-role.exit`). Under `prefers-reduced-motion`, the fade only, on `motion.duration-reduced.normal`. Both placements are anchored to the bottom, so the slide is upward in either reading direction and does not mirror. Figma shows the toast at rest.',
      'RTL — the row mirrors through logical properties: the glyph and message move to the right and the controls to the left.',
      'text expansion — a translated message wraps onto a second line, never truncates, and takes a longer `duration`.',
      'out of scope — a loading or promise toast, a timeout bar, swipe to dismiss and a notification history. If swipe is added, the close button is its non-gesture alternative.',
    ],
  },

  figmaProperties: {
    variantAxes: ['intent'],
    texts: {
      message: { part: 'message', default: 'Status message' },
    },
    booleans: {
      action: { part: 'action', default: false, figmaName: 'action' },
      dismissible: { part: 'close', default: true, figmaName: 'close' },
    },
  },

  accessibility: {
    role: 'The toast sits in one shared role="status" live region (polite, aria-atomic="true"), inside a landmark labeled "Notifications". The toast itself takes no role and never takes focus.',
    wcag: [
      '4.1.3 Status Messages (the message is announced through a live region without moving focus)',
      '2.2.1 Timing Adjustable (a toast with no action shows for at least 5 seconds, pausing on hover, focus and a hidden window; a toast with an action does not time out)',
      '1.4.1 Use of Color (success has a glyph shape and its text, not color alone)',
      '1.4.3 Contrast (Minimum) (the message clears 4.5:1 on the inverse surface)',
      '1.4.11 Non-text Contrast (the success glyph and the focus ring clear 3:1 on the inverse surface)',
      '2.1.1 Keyboard (F6 reaches the action and the close button; the action also exists elsewhere on the page)',
      '2.4.3 Focus Order (focus enters the region only when the user moves it there, and Escape returns it)',
      '2.4.11 Focus Not Obscured (Minimum) (the page keeps a focused control clear of the toast)',
      '2.5.8 Target Size (Minimum) (the close button is a 36px box, above 24px; targets 2.5.5 at 44×44 in code)',
    ],
    keyboard: 'F6 moves focus into the notifications region, to the newest toast\'s first control. Tab moves between the action and the close button. Escape or Shift+F6 returns focus to where it was. Enter and Space act on the focused button.',
    focus: 'Showing a toast never moves focus. Focus enters only by F6, and Escape returns it.',
    aria: 'The live region is role="status" with aria-atomic="true", present and empty from app start. The success glyph is aria-hidden. The close button\'s accessible name is "Dismiss" and the region\'s label is "Notifications"; both are translatable. Nothing mirrors in motion.',
  },

  content: {
    labelPattern: 'State the outcome in a few words, in sentence case, with no period: "Added to bag", "Address saved". The action is one verb or a short verb phrase: "Undo", "View bag".',
  },

  docs: {
    usage: 'Use a Toast to confirm something the user did, when the page already shows the change: "Added to bag", "Address saved", "Code copied". If missing the message would cost the user something, use a banner. A decision before going on is a dialog; a message about one field is a field message.',
    do: [
      'Confirm the user\'s own action in a few words',
      'Use success when the action completed, and neutral otherwise',
      'Keep the close button',
      'Make the action also available elsewhere on the page',
      'Raise the duration for a long or translated message',
    ],
    dont: [
      'Show an error or a warning in a toast. Use a banner.',
      'Put the only route to an action in a toast',
      'Add more than one action',
      'Move focus to a toast',
      'Set a duration under 5 seconds',
    ],
    contentGuidelines: 'Short and factual: the outcome, not a conversation. The glyph carries the tone, so the text stays plain. Name the action by what it does.',
  },

  ai: {
    primaryPurpose: 'Confirm the user\'s own action with a short status over the page that is safe to miss.',
    whenToUse: 'After an action whose result the page already shows ("Added to bag", "Address saved"), when a brief, polite confirmation helps and missing it costs nothing.',
    avoidWhen: 'The message is an error, a warning or anything the user must see (a banner); it asks for a decision (a dialog); it is about one field (a field message); or its action has no other route on the page.',
    commonPartners: ['button', 'icon-button-neutral', 'field-message', 'dialog'],
    triggerKeywords: ['toast', 'snackbar', 'notification', 'confirmation message', 'status message', 'added to bag'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['button', 'icon-button-neutral'],
    alternativeTo: ['dialog', 'field-message'],
    replacesPatterns: ['an alert() after a save', 'a status message that moves focus', 'a timed message with no pause'],
    supersededBy: [],
    planned: ['banner'],
  },

  motion: {
    enter: 'An 8px slide up and a fade (motion.transition.enter: motion.duration.normal, motion.easing-role.enter).',
    exit: 'A fade (motion.transition.exit: motion.duration.fast, motion.easing-role.exit). A replacement plays the exit, then the enter.',
    reduceMotion: 'Under prefers-reduced-motion, the fade only, with no slide, at motion.duration-reduced.normal.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2668): the close nests IconButton.Neutral as the approved proposal says, not FlushIconButton as the build brief named, because FlushIconButton has no inverse surface; the 8px gap between the message and the controls (the proposal leaves it open; the wireframe uses 8px); the action label as a nested Button\'s text rather than a toast text property.',
    ],
    unverified: [
      'That the nested Button and IconButton.Neutral carry their prototype reactions into the toast\'s instances on the canvas, as they do inside Dialog.',
      'The live-region timing (one frame after the region exists) and NVDA\'s behavior, against current assistive technology.',
    ],
    evolution: [
      'Owner decisions: the proposal and wireframe on #2668, every numbered call A (2026-10-16): toast for the user\'s own action and safe to miss, errors to a banner; intents neutral and success; no glyph on neutral; bottom center below 768px and the bottom inline-end corner from 768px; one at a time, the newest replacing; 6s with a 5s floor and pauses, no timer with an action; at most one action that also exists elsewhere; close on by default; the inverse surface; F6 in, Escape out; built at 360; named Toast with its aliases; the wording as drafted.',
      'The brief\'s severity set (info, success, warning, error, loading), its stacked toaster, its timeout bar and its swipe are not built: errors and warnings go to a banner (call 1 A), one toast shows at a time (call 5 A), and the rest is out of scope (the proposal\'s §11).',
    ],
  },
};
