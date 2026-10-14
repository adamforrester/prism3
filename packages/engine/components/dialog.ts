/**
 * Dialog — a panel over the page that holds a short task or a decision, centered, attached to the bottom edge, or
 * filling a small screen (KB brief: `components/dialog.md`).
 *
 * ── THE OWNER'S SHAPE (the proposal on #2609, decided by Q303, 2026-10-14) ──────────────────────────────────
 *
 * ONE component with a `placement` axis, `center | bottom | full`, and no side or drawer placement at all (Q303.1, which
 * amends the proposal's `side`). Center is the desktop placement and the phone default; bottom (a bottom sheet) and full
 * (a full-screen dialog) are small-viewport placements a product opts into per use. In code the placement can be set per
 * breakpoint, but NOTHING SWITCHES AUTOMATICALLY: a dialog stays centered on a phone unless the product chooses otherwise
 * (Q303.7). `size` (`medium | small | large`, the default first as the proposal's table lists it) sets the center panel's
 * width, 400 / 560 / 720px, as def-level literals with no new token (Q303.5 A). Bottom and full are full width, and full
 * is full height too, so they take no size: `excludeCoordinates` removes their small and large members, and the set is
 * 9 center members + 3 bottom + 3 full = 15. `footer` (`inline | stacked | none`, Q303.6 A) lays out the actions. No
 * state axis: a dialog has no hover, press or disabled of its own; its close button and footer buttons carry theirs.
 *
 * ── THE BACKDROP IS NOT IN THE COMPONENT (Q303.2 A and Q303.3 A) ─────────────────────────────────────────────────
 *
 * The panel is the component. The backdrop is `color.scrim.default`, a mode-varying fill the token tier names as the
 * modal backdrop, and in code it is the native `::backdrop`. A full-viewport fill inside the component would fix the
 * component to one screen size, so on the canvas the scrim is FURNITURE: an `_scrim-backdrop` instance the plugin draws
 * behind each center and bottom member (`apps/plugin/src/canvas-furniture.ts`), never a node of the set. A full-screen
 * dialog covers the page, so it has no visible backdrop (Q303.8). This is NOT `veil`: veil is a wash a designer chooses
 * over media, and the design-rebuild test's backdrop built from it is the correction the proposal opens with.
 *
 * ── CORNERS AND SIZE PER PLACEMENT (Q303.5 A, Q303.11 A as adjusted) ─────────────────────────────────────────────
 *
 * Center rounds all four corners, bottom its top two, full none, each on `radius.2xl` or `radius.none`, bound top and
 * bottom apart (`radiusEdges`). The member's size comes from `builtSize`: a center member is built at its size's width;
 * a bottom or full member at 360, a small phone's width and the narrowest common one above the 320px reflow floor; a
 * full member at 640 tall too, with the body growing to take the height so the footer sits at the bottom. The two
 * phone numbers are this build's and are held for the owner on #2609.
 *
 * ── PARTS ─────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * A header (the title, an optional description, and the close button: IconButton.Neutral, ghost, medium), an optional
 * divider above and below the body (the Divider, nested), the body (a native Figma slot, as the accordion's panel is,
 * #2417), and a footer of nested Buttons. The title row is the accordion's arrangement (Q262 A, #2456): the title beside
 * the close, top-aligned, so a wrapped title keeps the close beside its first line. Mints no new subcomponent.
 *
 * ── THE WALL (#2454) ───────────────────────────────────────────────────────────────────────────────────────
 *
 * Dialog is the tranche-4 def with the most behavior (`docs/41` §7). The contract below is framework-neutral and holds
 * under any answer to #2454: a modal `<dialog>` gives the top layer, an inert page, Escape and `::backdrop`; initial focus,
 * backdrop-click dismissal and focus return remain for a behavior layer. Code delivery is pending that decision.
 */
import { ComponentDef } from '../component-schema';

export const dialog: ComponentDef = {
  id: 'dialog',
  name: 'Dialog',
  aliases: ['modal', 'sheet', 'bottom-sheet', 'full-screen-dialog'],
  category: 'overlay',
  status: 'draft',
  summary: 'A panel over the page for a short task or a decision. Centered, a bottom sheet, or full screen.',
  description:
    'A modal panel over the page for a short task or a decision the user makes before going on: a confirmation, a short form, or a choice that needs the page behind it for context. The page behind is inert until the dialog closes. Centered by default, at a small, medium or large width; on a small screen a product can open it as a bottom sheet or full screen instead. A header names the task and holds the close button, the body holds the content, and the footer holds the actions. Not a toast or a banner (they do not interrupt), not a popover or a menu (they sit beside a control and do not trap focus), and not a page of its own for a long form.',

  props: [
    { name: 'open', type: 'boolean', default: false, required: false, description: 'Whether the dialog is showing. Opening it moves focus into it and makes the page behind it inert.' },
    { name: 'onOpenChange', type: 'function', required: false, description: 'Called with false on every attempt to close: the close button, Escape, a backdrop click on a standard dialog, or an action that closes it. Keep `open` in step with it.' },
    { name: 'title', type: 'node', required: true, description: 'The heading that names the task. It is the dialog\'s accessible name, so make it specific: "Delete this address?", not "Are you sure?". It wraps rather than truncating.' },
    { name: 'description', type: 'node', required: false, description: 'One or two sentences under the title that say what the dialog is for or what an action will do. Linked as the dialog\'s accessible description.' },
    { name: 'children', type: 'node', required: true, description: 'The body content. The body is the only part that scrolls; the header and footer stay in place.' },
    { name: 'actions', type: 'node', required: false, description: 'The footer buttons, the main action last in reading order (Cancel, then Save). Name each by what it does.' },
    { name: 'role', type: "enum: 'dialog' | 'alertdialog'", values: ['dialog', 'alertdialog'], default: 'dialog', required: false, description: 'dialog for a task or form. alertdialog for a confirmation that interrupts and needs an answer: it hides the close button, a backdrop click does not close it, and focus starts on the least destructive action.' },
    { name: 'placement', type: "enum: 'center' | 'bottom' | 'full'", values: ['center', 'bottom', 'full'], default: 'center', required: false, description: 'Where the panel sits. center on every screen by default; bottom (a bottom sheet) and full (full screen) are for small screens. Set per breakpoint; nothing switches automatically.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The width of a centered panel: 400, 560 or 720px. On a small screen a centered panel is as wide as the screen less its margins. Bottom and full panels are full width and ignore it.' },
    { name: 'footer', type: "enum: 'inline' | 'stacked' | 'none'", values: ['inline', 'stacked', 'none'], default: 'inline', required: false, description: 'How the actions are laid out. inline is a row at the end edge; stacked is full-width buttons, the main action on top; none is for a dialog whose body holds its own actions.' },
  ],

  states: [],
  variants: {
    placement: ['center', 'bottom', 'full'],
    // Medium first, so Figma's default member is the default size (the proposal's table, approved by Q303); the code
    // enum above keeps the ladder's order, as the fields' do (`lint-rung-names.ts` DEFAULT_FIRST).
    size: ['medium', 'small', 'large'],
    footer: ['inline', 'stacked', 'none'],
  },
  axisKinds: { placement: 'authoring', size: 'authoring', footer: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // ── THE PANEL (the proposal's §7, approved by Q303 "all A"). The ordinary card surface over the scrim (AI/D-2), and the
    // mode-aware shadow; in dark the surface lift carries the elevation.
    'fill': 'color.foreground.primary',
    'shadow': 'shadow.xl',
    // ── INK. The title in primary text, the description in secondary text, the body's placeholder in primary text.
    'label': 'color.text.primary',
    'indicator': 'color.text.secondary',
    'body': 'color.text.primary',
    // ── TYPE.
    // The title in the large label's emphasis weight, which every brand emits: the proposal drafted `type.title.sm.strong`,
    // which a brand with a single title weight (the nb-redesign example, `subtle` only) does not emit, so it would miss
    // at build time. The accordion's title met the same gap the same way (owner decision, 2026-10-11). Held on #2609.
    'title-type': 'type.label.lg.emphasis',
    'description-type': 'type.body.md.default',
    'body-type': 'type.body.md.default',
    // ── SPACE. Header to body and body to footer (DRAFT in the proposal, approved by Q303); the title to its description
    // and the title to the close button are this build's (held on #2609).
    'gap': 'space.200',
    'header-gap': 'space.200',
    'title-gap': 'space.100',
    'pad-none': 'space.0',
    // The panel padding: space.300 on a centered panel, space.200 below 480px (the proposal's §7). A bottom or full panel
    // is a small-screen placement, built at a phone's width, so it carries the small-screen padding.
    'placement.center.pad': 'space.300',
    'placement.bottom.pad': 'space.200',
    'placement.full.pad': 'space.200',
    // ── CORNERS (Q303.11 A as adjusted): center all four, bottom the top two, full none.
    'placement.center.radius-top': 'radius.2xl',
    'placement.center.radius-bottom': 'radius.2xl',
    'placement.bottom.radius-top': 'radius.2xl',
    'placement.bottom.radius-bottom': 'radius.none',
    'placement.full.radius-top': 'radius.none',
    'placement.full.radius-bottom': 'radius.none',
    // ── THE FOOTER (the proposal's §7): 12px between inline buttons, 8px between stacked ones.
    'footer.inline.gap': 'space.150',
    'footer.stacked.gap': 'space.100',
  },

  anatomy: {
    root: 'panel',
    parts: {
      panel: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill'],
        elevation: 'shadow',
        radiusEdges: { top: 'placement.{placement}.radius-top', bottom: 'placement.{placement}.radius-bottom' },
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        // The member's size per placement (Q303.5 A): a centered panel's width per size, a phone's width for bottom and
        // full, and a phone's height for full, where the body takes the height the header and footer do not.
        builtSize: {
          axis: 'placement',
          widths: { center: { medium: 560, small: 400, large: 720 }, bottom: 360, full: 360 },
          heights: { full: 640 },
          grow: 'body',
        },
        padding: { block: 'placement.{placement}.pad', inlineLabel: 'pad-none' },
        gap: 'gap',
        children: ['header', 'headerDivider', 'body', 'footerDivider', 'footerInline', 'footerStacked'],
        note: 'The panel: the surface, its shadow and its corners. It pads the top and bottom; the header, body and footer pad their own sides, so a divider runs edge to edge.',
      },
      header: {
        kind: 'box',
        role: 'presentation',
        // The accordion's title row (Q262 A, #2456): the title beside the close, top-aligned, so a wrapped title keeps the
        // close beside its first line.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'pad-none', inlineLabel: 'placement.{placement}.pad' },
        gap: 'header-gap',
        children: ['titleBox', 'close'],
        note: 'The header: the title and description, then the close button at the end edge.',
      },
      titleBox: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        gap: 'title-gap',
        children: ['title', 'description'],
        note: 'The title and the description under it. It fills the header beside the close button.',
      },
      title: {
        kind: 'text',
        type: 'title-type',
        wrap: true,
        note: 'The title: the dialog\'s accessible name. It wraps onto more lines rather than truncating.',
      },
      description: {
        kind: 'text',
        type: 'description-type',
        paintSlot: 'indicator',
        wrap: true,
        optional: true,
        note: 'The optional description under the title, in secondary text. Hidden by default.',
      },
      close: {
        kind: 'nest',
        nests: 'icon-button-neutral',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { appearance: 'ghost', size: 'medium', shape: 'square', surface: 'default', state: 'rest' } },
        note: 'The close button: an IconButton.Neutral, ghost, medium, labeled "Close". Shown by default; an alertdialog hides it.',
      },
      headerDivider: {
        kind: 'nest',
        nests: 'divider',
        optional: true,
        nesting: { kind: 'nest-fixed', variant: { orientation: 'horizontal', inset: 'none' } },
        crossAxisFill: true,
        note: 'The rule under the header, edge to edge. Off by default; in code it shows only while the body scrolls.',
      },
      body: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'pad-none', inlineLabel: 'placement.{placement}.pad' },
        children: ['placeholder'],
        note: 'The body: a slot that holds whatever the dialog needs, and the only part that scrolls. Its inline inset matches the header.',
      },
      placeholder: {
        kind: 'text',
        type: 'body-type',
        paintSlot: 'body',
        wrap: true,
        // Literal copy (DRAFT, held on #2609): a slot's text can carry no TEXT property, so the designer edits or replaces it in place.
        characters: 'Dialog content. Replace this with the text or components the dialog holds.',
        note: 'Placeholder content. Replace it with the text or components the dialog holds.',
      },
      footerDivider: {
        kind: 'nest',
        nests: 'divider',
        optional: true,
        presentWhen: { footer: ['inline', 'stacked'] },
        nesting: { kind: 'nest-fixed', variant: { orientation: 'horizontal', inset: 'none' } },
        crossAxisFill: true,
        note: 'The rule above the footer, edge to edge. Off by default, and absent when there is no footer.',
      },
      footerInline: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { footer: ['inline'] },
        layout: { direction: 'row', align: 'center', justify: 'end', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'pad-none', inlineLabel: 'placement.{placement}.pad' },
        gap: 'footer.inline.gap',
        children: ['cancelInline', 'confirmInline'],
        note: 'The inline footer: a row of buttons at the end edge, the main action last.',
      },
      cancelInline: {
        kind: 'nest',
        nests: 'button',
        nesting: { kind: 'nest-fixed', variant: { appearance: 'outline', size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        note: 'The secondary action, "Cancel": a Button, outline, medium.',
      },
      confirmInline: {
        kind: 'nest',
        nests: 'button',
        nesting: { kind: 'nest-fixed', variant: { appearance: 'filled', size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        note: 'The main action, "Save": a Button, filled, medium.',
      },
      footerStacked: {
        kind: 'box',
        role: 'presentation',
        presentWhen: { footer: ['stacked'] },
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'pad-none', inlineLabel: 'placement.{placement}.pad' },
        gap: 'footer.stacked.gap',
        children: ['confirmStacked', 'cancelStacked'],
        note: 'The stacked footer: full-width buttons, the main action on top.',
      },
      confirmStacked: {
        kind: 'nest',
        nests: 'button',
        crossAxisFill: true,
        nesting: { kind: 'nest-fixed', variant: { appearance: 'filled', size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        note: 'The main action, "Save", full width, on top.',
      },
      cancelStacked: {
        kind: 'nest',
        nests: 'button',
        crossAxisFill: true,
        nesting: { kind: 'nest-fixed', variant: { appearance: 'outline', size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' } },
        note: 'The secondary action, "Cancel", full width, under the main action.',
      },
    },
    codeOnly: [
      'role — `role="dialog"` with `aria-modal="true"`; the native `<dialog>` opened with `showModal()` provides both. `role: "alertdialog"` is a code prop with no Figma property: set it for a confirmation that interrupts and needs an answer. An alertdialog hides the close button (the Figma `close` toggle shows the result), keeps a backdrop click from closing it, and must hold at least one focusable control.',
      'labeling — `aria-labelledby` points at the title, made a heading (`<h2>`); `aria-describedby` points at the description when there is one.',
      'focus in — on open, focus moves into the dialog: to the first control in the body for a short form; to the title (`tabindex="-1"`) when the body is long reading content, so a screen reader starts at the top; for an alertdialog, to the least destructive action (Cancel). Never to a destructive button.',
      'focus held — Tab and Shift+Tab cycle inside the dialog, and the page behind is inert. A modal `<dialog>` makes the page inert natively.',
      'focus returned — on close, focus goes back to the control that opened the dialog. If that control is gone, to the nearest control that still makes sense, never to the page body.',
      'Escape — closes a dialog, and closes an alertdialog as Cancel. The close button is always reachable by keyboard, so the dialog is never a keyboard trap (SC 2.1.2).',
      'backdrop click — closes a dialog, never an alertdialog. Close only when the press started on the backdrop (`mousedown` target is the dialog element itself), so a text selection dragged out of the panel does not close it. A full-screen dialog has no visible backdrop; Escape and the close button still apply.',
      'scroll lock — the page behind does not scroll while the dialog is open (`html:has(dialog[open]) { overflow: hidden }`, with the scrollbar width added back as padding so the page does not shift). The body scrolls with `overscroll-behavior: contain`, so a scroll at its end does not move the page.',
      'only the body scrolls — the header and footer stay put and the body scrolls between them, so a focused field in the body is never hidden under the footer (SC 2.4.11). Show the two dividers only while the body overflows; in Figma they are the `dividers` toggle.',
      'placement per breakpoint, no automatic switch — `placement` can take a value per breakpoint, but nothing switches on its own: a dialog stays centered on a phone unless the product chooses bottom or full. A centered panel on a small screen is the viewport width less the grid margins. Bottom and full are full width; full is also full height. A bottom sheet is at most 90% of the viewport height, so the page shows above it; a centered panel at most the viewport height less the grid margin top and bottom. Above that, the body scrolls.',
      'the panel padding below 480px — `space.200` instead of `space.300` on a centered panel when the viewport is narrower than 480px. Figma builds the bottom and full members, which are small-screen placements, with `space.200`.',
      'motion — opening: a centered panel fades in and scales up a little; a bottom sheet and a full-screen dialog slide up from the bottom edge; the backdrop fades. On `motion.duration.moderate` with `motion.easing-role.enter`, and `motion.easing-role.exit` to close. Under `prefers-reduced-motion`, a fade only, at `motion.duration-reduced.moderate`, with no movement. Figma shows the panel at rest.',
      'the backdrop — `color.scrim.default` on `::backdrop`. It is not part of the component: the Figma page draws it behind each example as canvas furniture.',
      'stacking — a modal `<dialog>` renders in the top layer, so it needs no z-index. Avoid opening a dialog from a dialog: replace the content or close the first.',
      'right-to-left — the layout mirrors through logical properties: the close button moves to the start edge and the footer order mirrors.',
      'code delivery pending: behavior layer (#2454) — initial focus placement, backdrop-click dismissal and focus return wait on that decision. The contract above holds under any answer to it.',
    ],
  },

  figmaProperties: {
    variantAxes: ['placement', 'size', 'footer'],
    // Size is the center panel's alone (Q303.5 A): bottom and full are full width, so they keep only the default size.
    excludeCoordinates: [{ placement: ['bottom', 'full'], size: ['small', 'large'] }],
    gridAxis: 'footer',
    texts: {
      title: { part: 'title', default: 'Dialog title' },
      description: { part: 'description', default: 'Supporting text', figmaName: 'description text' },
    },
    booleans: {
      description: { part: 'description', default: false },
      close: { part: 'close', default: true, figmaName: 'close', figmaOnly: true },
      dividers: { part: ['headerDivider', 'footerDivider'], default: false, figmaName: 'dividers', figmaOnly: true, together: true },
    },
  },

  accessibility: {
    role: 'role="dialog" with aria-modal="true", or role="alertdialog" for a confirmation that needs an answer. A native <dialog> opened with showModal() provides the dialog role, the modal state, the top layer and an inert page.',
    wcag: [
      '1.3.1 Info and Relationships (the title is a heading and labels the dialog; the description describes it)',
      '2.1.1 Keyboard (every action, the close button included, works from the keyboard)',
      '2.1.2 No Keyboard Trap (focus is held inside on purpose, and Escape and the close button always let the user out)',
      '2.4.3 Focus Order (focus moves in on open, cycles inside, and returns to the opener on close)',
      '2.4.6 Headings and Labels (the title names the task)',
      '2.4.7 Focus Visible (every control inside shows the shared focus ring)',
      '2.4.11 Focus Not Obscured (only the body scrolls, so the footer never covers a focused field)',
      '1.4.10 Reflow (a bottom sheet or full-screen dialog keeps a 320px screen usable)',
      '2.5.8 Target Size (Minimum) (the close button is a medium icon button, 44px at the default density)',
      '4.1.2 Name, Role, Value (role, aria-modal and the accessible name are set)',
    ],
    keyboard: 'Tab and Shift+Tab cycle through the controls inside the dialog. Escape closes it (an alertdialog as Cancel). Enter and Space act on the focused button.',
    focus: 'Moves into the dialog on open (the first control, the title for long content, or Cancel in an alertdialog), stays inside while it is open, and returns to the control that opened it.',
    aria: 'aria-modal="true"; aria-labelledby pointing at the title; aria-describedby pointing at the description when there is one. The close button\'s accessible name is "Close". Hide the dividers from assistive technology.',
  },

  content: {
    labelPattern: 'The title names the task or asks the question ("Delete this address?"), never "Warning" or "Are you sure?". The main action echoes the title\'s verb ("Delete address"), not "OK" or "Yes". Sentence case.',
  },

  docs: {
    usage: 'Use a Dialog when the user must make a decision or finish a short task before going on, and needs the page behind for context: a confirmation, a short form, a choice. Center it on every screen by default; on a small screen, open it as a bottom sheet for a short choice within thumb reach, or full screen for a form that needs the whole screen. Use role alertdialog for a confirmation that interrupts, such as deleting something.',
    do: [
      'Name the task in the title, and the action in the main button',
      'Keep the close button on a standard dialog',
      'Put the main action last in the footer (Cancel, then Save)',
      'Let only the body scroll, and keep the footer in view',
      'Return focus to the control that opened the dialog',
    ],
    dont: [
      'Use a dialog for a passing message. Use a toast or a banner.',
      'Open a dialog from a dialog. Replace the content or close the first.',
      'Put a long, multi-step form in a dialog. Give it a page.',
      'Focus a destructive button when the dialog opens',
      'Build the backdrop into the panel. It is the page\'s scrim, behind the dialog.',
    ],
    contentGuidelines: 'Titles are specific and in sentence case. Body text is short and states the consequence of an action, especially one that cannot be undone. Buttons are named by what they do.',
  },

  ai: {
    primaryPurpose: 'Interrupt the page for a short task or a decision the user must make before going on.',
    whenToUse: 'A confirmation, a short form or a choice that needs the page behind it for context, and that the user must finish or dismiss before going on.',
    avoidWhen: 'The message is passing and needs no answer (a toast or a banner), the content belongs beside a control (a popover or a menu), the task is long or has many steps (a page of its own), or the content can sit in the page (an accordion).',
    commonPartners: ['button', 'icon-button-neutral', 'divider', 'text-field', 'select', 'checkbox-group', 'radio-group'],
    triggerKeywords: ['dialog', 'modal', 'bottom sheet', 'full-screen dialog', 'confirmation', 'alert dialog', 'popup'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['icon-button-neutral', 'divider', 'button'],
    alternativeTo: ['accordion'],
    replacesPatterns: ['a div overlay with a z-index and a hand-written focus trap', 'a backdrop built from a veil'],
    supersededBy: [],
    planned: ['toast', 'popover', 'menu'],
  },

  motion: {
    enter: 'A centered panel fades in and scales up a little; a bottom sheet and a full-screen dialog slide up from the bottom edge (motion.duration.moderate, motion.easing-role.enter). The backdrop fades in.',
    exit: 'The reverse, on motion.easing-role.exit.',
    reduceMotion: 'Under prefers-reduced-motion every placement fades only, at motion.duration-reduced.moderate, with no movement.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2609): the bottom and full members\' build size (360 wide, and 640 tall for full), the title-to-description gap (space.100) and the title-to-close gap (space.200), the body placeholder copy, the description text property\'s Figma name ("description text"), the `actions` prop, and Cancel as an outline Button beside a filled Save.',
      'The close button sits at the header\'s top edge, beside the first line of the title, without an offset that centers it on that line: whether the title moves down to center on the 44px button is held for the owner\'s visual QA.',
    ],
    unverified: [
      'The nested close button shows the file\'s default icon until a designer swaps it to close, and the nested footer buttons read "Button" until a designer types "Cancel" and "Save": a per-instance override on a nested instance is executor work no def can ask for yet (#2645).',
      'That the native slot keeps a designer\'s body content across a placement or footer switch in every Figma plan, as it does across the accordion\'s expansion switch.',
    ],
    evolution: [
      'Owner decisions: the proposal on #2609 (one component, the anatomy, the tokens, the accessibility contract), and Q303 (2026-10-14): no side or drawer placement; `placement` center, bottom or full, with no automatic switch; the backdrop `color.scrim.default` as canvas furniture and `::backdrop`; def-level widths; footer inline, stacked or none; Escape, close and backdrop click dismiss a dialog, and an alertdialog only through its buttons or Escape; `role` a code prop that hides close on an alertdialog; close on by default; corners per placement; the names and aliases; the placeholder wording.',
    ],
  },
};
