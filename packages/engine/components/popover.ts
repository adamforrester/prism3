/**
 * Popover — a non-modal panel anchored to the control that opened it (KB brief: `components/popover.md`).
 *
 * ── THE OWNER'S SHAPE (the proposal on #4008, decided by Q-FL2, 2026-11-19: "all as recommended") ─────────────────
 *
 * OD-P1 A: opened by a press on its trigger, never by hover; it may hold interactive content (a short form, links, a
 * toggletip's text). Not Dialog (modal), not Tooltip (text on hover), not Menu (a list of actions). OD-P2 A: no arrow,
 * so ONE member and no axes (the variant rule, #3383 Q3 A: width alone is not an axis). OD-P3 A: the surface numbers in
 * the proposal's token table, the 1px border included. OD-P5 A: nothing switches to a sheet on a small screen (Dialog's
 * Q303.7). OD-P6 A: focus leaving the popover closes it. OD-X1 A: Menu binds the same raised-surface roles, and
 * `test.ts` holds the two sets equal once Menu lands. OD-X2 A: logical sides and an align. OD-X5 A: the shared
 * "Popover / open" and "Popover / close" motion preset. K4 B: the aliases include `overlay` and `flyout`, as the brief
 * lists them. K5 B: a read-only popover leaves focus on its trigger; focus moves in only when the content is
 * interactive. K8 A for the POC: an owned, dependency-free positioning layer.
 *
 * ── PARTS ─────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Dialog's arrangement, smaller and with no dividers: a header (the title beside the close button, top-aligned, Q262 A),
 * the body (a native slot, #2417) and an optional footer that nests a Button group (Q363). The close button is
 * FlushIconButton.Neutral at small, the close glyph, as Dialog's is at medium (Q385 A). Mints no new subcomponent.
 *
 * ── THE BUILT WIDTH ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The proposal's 240 min and 360 max are literals, as Dialog's widths (Q303.5 A). The member is BUILT at 320, between
 * them, with the 240 floor as Figma's min width; the 360 cap is code only. The 320 is the owner's (decision 2, 2026-11-19).
 */
import { ComponentDef } from '../component-schema';

export const popover: ComponentDef = {
  id: 'popover',
  name: 'Popover',
  aliases: ['popup', 'overlay', 'anchored-overlay', 'floating-panel', 'flyout'],
  category: 'overlay',
  status: 'draft',
  summary: 'A panel beside the control that opened it, for detail or a short task. The page stays usable.',
  description:
    'A non-modal panel anchored to the button that opened it. It holds content the user reaches for on purpose and that belongs next to that control: a few details, a short form, a set of links, or an explanation behind an info button. It opens on a press, sits below its trigger by default, and moves to stay on screen. The page stays usable while it is open, and a press outside, Escape or moving focus away closes it. A header can hold a title and the close button, the body holds the content, and an optional footer holds actions. Not a dialog (it does not block the page), not a tooltip (it opens on a press and can hold controls), and not a menu (a menu is a list of actions).',

  props: [
    { name: 'open', type: 'boolean', default: false, required: false, description: 'Whether the popover is showing. Leave it unset and use defaultOpen for a popover that manages its own state.' },
    { name: 'defaultOpen', type: 'boolean', default: false, required: false, description: 'Whether the popover starts open, when open is not set.' },
    { name: 'onOpenChange', type: 'function', required: false, description: 'Called with true when the trigger opens the popover, and with false on every way it closes: the close button, Escape, a press outside, or focus moving out of it.' },
    { name: 'placement', type: "enum: 'top' | 'bottom' | 'start' | 'end'", values: ['top', 'bottom', 'start', 'end'], default: 'bottom', required: false, description: 'The side of the trigger it opens on. start and end follow the writing direction. When there is no room on that side it moves to the opposite one.' },
    { name: 'align', type: "enum: 'start' | 'center' | 'end'", values: ['start', 'center', 'end'], default: 'start', required: false, description: 'Where it lines up along that side: with the start edge of the trigger, its center, or its end edge. It shifts along the side to stay on screen.' },
    { name: 'title', type: 'string', required: false, description: 'A short heading that names the popover. When set it is the accessible name; without one, give the popover a label.' },
    { name: 'showClose', type: 'boolean', default: true, required: false, description: 'Whether the header shows the close button. Escape and a press outside close it either way.' },
    { name: 'children', type: 'node', required: true, description: 'The body content: text, links or a few controls. The body scrolls when the screen is too short for it.' },
    { name: 'footer', type: 'slot', anyOf: ['button', 'button-neutral', 'button-destructive'], minItems: 1, maxItems: 2, required: false, description: 'Actions at the bottom of the panel, one or two buttons laid out by a Button group. Leave it off for a popover that only shows information.' },
    { name: 'initialFocus', type: 'node', required: false, description: 'The control that takes focus when the popover opens, for a popover that holds controls. Unset, the first control does. A popover with no controls leaves focus on its trigger.' },
    { name: 'arrow', type: 'boolean', default: false, required: false, description: 'Whether a small arrow points at the trigger. Off by default; turn it on where the link to the trigger is unclear.' },
  ],

  states: [],
  // ONE MEMBER (OD-P2 A: no arrow, so nothing in the drawing changes with the side). The engine projects no set without
  // an axis, so the one member carries the default side, `placement: bottom`; the other three sides are code only (the
  // collision entry in codeOnly). Decided (owner, 2026-11-19): a one-value axis, rather than an engine change that
  // builds an axis-less def as a plain component.
  variants: { placement: ['bottom'] },
  axisKinds: { placement: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // ── THE RAISED SURFACE (OD-P3 A; OD-X1 A: Menu's panel binds these same five, held equal in `test.ts`). Dialog's fill
    // role (Q721 A), so the brand's raisedSurface setting reaches it; one step lighter in shadow than Dialog, because a
    // non-modal layer sits below a modal one; and a hairline edge, because no scrim separates it from a page of the
    // same color.
    'fill': 'color.foreground.raised',
    'border': 'color.border.secondary',
    'border-width': 'border-width.hairline',
    'shadow': 'shadow.lg',
    'radius': 'radius.lg',
    // ── INK.
    'label': 'color.text.primary',
    'body': 'color.text.primary',
    // ── TYPE: the title one rung under Dialog's.
    'title-type': 'type.label.md.emphasis',
    'body-type': 'type.body.sm.default',
    // ── SPACE: Dialog's small-screen padding; the gap tighter than the padding beside it.
    'pad': 'space.200',
    'gap': 'space.150',
  },

  anatomy: {
    root: 'panel',
    parts: {
      panel: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        strokeWidth: 'border-width',
        elevation: 'shadow',
        radius: 'radius',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        // Built at 320, between the 240 floor and the 360 cap (owner decision 2, 2026-11-19); an instance a designer resizes keeps
        // the floor.
        placementWidth: 320,
        minWidth: 240,
        padding: { block: 'pad', inlineLabel: 'pad' },
        gap: 'gap',
        children: ['header', 'body', 'footer'],
        note: 'The panel: the raised surface, its edge, its shadow and its corners. It pads all four sides.',
      },
      header: {
        kind: 'box', mirror: 'reverses',   // as Dialog's header (#3986): the close button moves to the start edge in RTL
        role: 'presentation',
        // Dialog's and the accordion's title row (Q262 A): the title beside the close button, top-aligned, so a wrapped
        // title keeps the close button beside its first line.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        gap: 'gap',
        children: ['titleBox', 'close'],
        note: 'The header: the title, then the close button at the end edge.',
      },
      titleBox: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        children: ['title'],
        note: 'Holds the title, filling the header beside the close button.',
      },
      title: {
        kind: 'text',
        type: 'title-type',
        paintSlot: 'label',
        wrap: true,
        optional: true,
        note: 'The title: the popover\'s accessible name when it is shown. It wraps rather than truncating.',
      },
      close: {
        kind: 'nest',
        nests: 'flush-icon-button-neutral',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { shape: 'flush', size: 'small', surface: 'default', state: 'rest' } },
        overrides: { swaps: { icon: 'close' } },
        note: 'The close button: a FlushIconButton.Neutral, flush, small, labeled "Close", always showing the close icon. Shown by default.',
      },
      body: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        // The body is the scroll region when the screen is shorter than the popover, as Dialog's is: it crops and scrolls,
        // and the header and footer stay put.
        clipsContent: true,
        scroll: 'vertical',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        children: ['placeholder'],
        note: 'The body: a slot that holds whatever the popover needs, and the only part that scrolls.',
      },
      placeholder: {
        kind: 'text',
        type: 'body-type',
        paintSlot: 'body',
        wrap: true,
        // DRAFT copy: a slot's text carries no TEXT property, so the designer edits or replaces it in place.
        characters: 'Popover content. Replace this with the text or components the popover holds.',
        note: 'Placeholder content. Replace it with the text or components the popover holds.',
      },
      footer: {
        kind: 'nest',
        nests: 'button-group',
        optional: true,
        crossAxisFill: true,
        nesting: { kind: 'nest-fixed', variant: { layout: 'inline' } },
        nestItemPrefers: { cancel: 'button-neutral' },
        note: 'The footer: a Button group, inline, at the end edge. Off by default.',
      },
    },
    codeOnly: [
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'role — `role="dialog"` with no `aria-modal`: the page stays usable. Named by `aria-labelledby` on the title, or by `aria-label` when there is no title. The trigger, a Button or IconButton, carries `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'focus on opening — a popover that holds controls moves focus to `initialFocus`, or to its first control. A read-only popover (text, an explanation) leaves focus on its trigger; the next entry is how a screen reader reaches its content. The `popover` attribute moves no focus, so code does.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'read-only announcement — a read-only popover (the toggletip case: an explanation behind an info button) announces its content through a polite live region (`role="status"`) when it opens, and sits right after its trigger in the DOM, so it is also the next thing in reading order. The trigger\'s `aria-controls` stays, but most screen readers do not announce it, so it is not how the content is reached.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'focus not held — Tab is not trapped. Tabbing past the last control closes the popover and goes on from the element after the trigger; Shift+Tab from the first returns to the trigger. Focus leaving by Tab or a press outside closes it.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'Escape — closes the popover and returns focus to the trigger. A press outside closes it and leaves focus where the press put it. Focus returns to the trigger by default (`restoreFocus`), and never to the page body.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'collision — the design file builds one member, at the default side, bottom: with no arrow the panel draws the same on every side. In code it opens on `placement` and `align` (logical sides, so start and end swap under right-to-left), offset `space.100` from the trigger. With no room on that side it flips to the opposite one, then shifts along its side to stay `space.200` inside the viewport. The arrow, when on, follows the flip.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'the width — it hugs its content between 240px and 360px, and never wider than the viewport less its margins (SC 1.4.10). Figma builds it at 320px with the 240px floor.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'only the body scrolls — when the viewport is shorter than the popover, the body scrolls and the header and footer stay put (`flex: 1 1 auto; min-height: 0; overflow-y: auto` on the body), so a focused control is never hidden (SC 2.4.11).',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'no automatic switch — on a small screen it stays a popover. A product that wants a sheet on a phone opens a Dialog at `placement="bottom"` there instead.',
      },
      {
        class: 'implementation',
        disposition: 'refused',
        description:
          'the floating layer — the `popover` attribute gives the top layer, light dismiss and Escape; CSS anchor positioning with `position-try-fallbacks` gives the flip, with a small owned shift fallback where anchor positioning is missing. No positioning library. Anchor positioning fails silently inside some positioned ancestors (a containing block that clips it), so test it inside scrolling and transformed containers. Menu and Tooltip use the same layer.',
      },
      {
        class: 'visual-treatment',
        disposition: 'refused',
        description:
          'the arrow — not drawn in the design file: it is off by default, and a member per side would add four members for an option most popovers leave off. In code it is a small square in the panel\'s fill and border, rotated, on the trigger\'s side, centered on the trigger where the shift allows.',
      },
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'motion — the Popover / open and Popover / close pattern, shared with Menu: opening fades in and scales up from a little under full size, with the transform origin on the trigger\'s side (following a flip), on `motion.duration.fast` and `motion.easing-role.enter`; closing fades out on `motion.duration.instant` and `motion.easing-role.exit`. Under `prefers-reduced-motion` it fades only, with no scale, on `motion.duration-reduced.fast` to open and to close. Figma shows the panel at rest.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'right-to-left — the layout mirrors through logical properties: the close button moves to the start edge and the footer order mirrors; start and end placements swap sides.',
      },
      {
        class: 'deferred',
        disposition: 'refused',
        description:
          'Plain HTML/CSS: wire this behavior contract up in your framework. The web component includes it. In plain HTML/CSS that covers initial focus, Tab-out dismissal and focus return.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['placement'],
    texts: {
      title: { part: 'title', default: 'Popover title', figmaName: 'title text' },
    },
    booleans: {
      title: { part: 'title', default: true },
      showClose: { part: 'close', default: true, figmaName: 'close' },
      footer: { part: 'footer', default: false },
    },
  },

  accessibility: {
    role: '`role="dialog"` with no `aria-modal`, so the page stays usable. The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.',
    wcag: [
      '1.3.1 Info and Relationships (the title names the popover through aria-labelledby)',
      '1.4.10 Reflow (the popover is never wider than the viewport less its margins)',
      '1.4.13 Content on Hover or Focus (it opens on a press, stays until dismissed, and Escape closes it)',
      '2.1.1 Keyboard (the trigger, every control inside and the close button work from the keyboard)',
      '2.1.2 No Keyboard Trap (Tab moves through and out, and Escape closes it)',
      '2.4.3 Focus Order (focus moves in only for interactive content, and returns to the trigger on Escape)',
      '2.4.7 Focus Visible (every control inside shows the shared focus ring)',
      '2.4.11 Focus Not Obscured (only the body scrolls, so a focused control stays in view)',
      '4.1.2 Name, Role, Value (the trigger states its popup and whether it is expanded)',
    ],
    keyboard: 'Enter or Space on the trigger opens it. Tab and Shift+Tab move through the controls inside and out of it, and leaving closes it. Escape closes it and returns focus to the trigger.',
    focus: 'Moves into the popover on open only when it holds controls: to the chosen control or the first one. A popover that only shows information leaves focus on its trigger. Escape returns focus to the trigger.',
    aria: 'aria-labelledby pointing at the title, or aria-label when there is no title. On the trigger: aria-haspopup="dialog", aria-expanded, and aria-controls pointing at the popover. The close button\'s accessible name is "Close".',
  },

  content: {
    labelPattern: 'A title, when there is one, names what the popover holds in a few words ("Shipping details"), in sentence case. The trigger says what it opens.',
  },

  docs: {
    usage: 'Use a Popover for content the user asks for that belongs next to the control that opened it: a few details, a short form such as a filter or a date, a set of links, or the explanation behind an info button. It opens on a press and leaves the page usable. For a decision the user must make before going on, use a Dialog; for a hint on hover, a tooltip; for a list of actions, a Menu.',
    do: [
      'Open it from a button, on a press',
      'Keep it short: a few lines, a few controls',
      'Give it a title, or a label when it has none',
      'Leave focus on the trigger when it only shows information',
      'Return focus to the trigger when Escape closes it',
    ],
    dont: [
      'Open a popover on hover. Use a tooltip for a hint.',
      'Put a long form or a task the user must finish in it. Use a Dialog.',
      'Use it as a list of actions. Use a Menu.',
      'Open a popover from a popover',
    ],
    contentGuidelines: 'Titles are short and in sentence case. Body text says what the user needs and no more. Buttons are named by what they do.',
  },

  ai: {
    primaryPurpose: 'Show extra detail or a short task beside the control that opened it, without blocking the page.',
    whenToUse: 'The user presses a button to see a few details, an explanation, a set of links or a short form that belongs next to that button, and the page should stay usable while it is open.',
    avoidWhen: 'The user must decide or finish before going on (a dialog), the content is a hint shown on hover (a tooltip), the content is a list of actions (a menu), or the content can sit in the page (an accordion).',
    commonPartners: ['button', 'button-neutral', 'icon-button', 'icon-button-neutral', 'flush-icon-button-neutral', 'button-group', 'link', 'text-field', 'select', 'checkbox-group'],
    triggerKeywords: ['popover', 'popup', 'flyout', 'floating panel', 'anchored panel', 'toggletip', 'info popover', 'filter popover'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['flush-icon-button-neutral', 'button-group'],
    alternativeTo: ['dialog', 'tooltip'],
    replacesPatterns: ['an absolutely positioned div with a hand-written click-outside handler', 'a dialog used for a few lines of detail'],
    supersededBy: [],
    planned: ['menu'],
  },

  motion: {
    enter: 'Fades in and scales up from a little under full size, from the trigger\'s side (motion.duration.fast, motion.easing-role.enter). The origin follows the side it opens on.',
    exit: 'Fades out (motion.duration.instant, motion.easing-role.exit), quicker than it opened.',
    reduceMotion: 'Under prefers-reduced-motion it fades only, with no scale, on motion.duration-reduced.fast to open and to close. A fade is not movement, and it keeps the cue that a layer opened or closed.',
  },

  notes: {
    contested: [],
    unverified: [
      'That the header row collapses when both the title and close toggles are off (no gap left above the body). The plan hides both nodes; no live file has read the header\'s height back.',
      'The Popover / open and Popover / close motion preset is described here but not built: the #2857 starter set exists only as a wireframe, so there is no preset to bind yet.',
    ],
    evolution: [
      'Owner decisions (2026-11-19, on #4252), all as recommended: (1) the set is one member on a one-value axis, placement=bottom, the default side, because the engine projects no set without an axis; (2) the member is built 320px wide, between the proposal\'s 240px floor and 360px cap; (3) the brief\'s trapFocus and modal are not props, because a trapped or modal popover is a Dialog (OD-P1 A), and restoreFocus is always on; (4) the motion keeps motion.duration.fast, 100ms on the reference brand, which the tempo lever moves per brand; (5) Popover has its own page under Components; (6) the copy is approved.',
      'Owner decision S1 A (2026-11-19, on #4252): a read-only popover announces its content through a polite live region (role="status") and sits right after its trigger in the DOM. aria-controls is not relied on, because most screen readers do not announce it.',
      'Owner decision Q-FL2 (2026-11-19, on #4007 and #4008): the proposal\'s recommendations OD-P1 to OD-P6 and OD-X1 to OD-X5, read with the KB brief check; K4 B (the aliases overlay and flyout, as the brief lists them); K5 B (a read-only popover leaves focus on its trigger); K8 A for the POC (an owned, dependency-free positioning layer, the library question going to the developers).',
    ],
  },
};
