/**
 * PasswordField (#2317, owner decisions Q301, 2026-10-14) — a single-line field for a secret the user types: a
 * sign-in password, a new password, a PIN typed as text. KB brief: `components/text-field.md` (§3 and §10 name it
 * one of TextField's thin specializations, worth its own name so its extra control and that control's accessible
 * name are built in; there is no password brief of its own).
 *
 * ONE CALL TO THE FIELD FACTORY (Q301.8 A). Everything TextField is — the token block, the seven projected states,
 * `status`, the size system, the nested FieldLabel, FieldMessage and focus ring — comes from `makeTextField` in
 * `text-field.ts`, so a fix there reaches this field without a copy. What this file states is what differs:
 *
 *  · ITS OWN DEF (Q301.1 A), not a `reveal` option on TextField.
 *  · THE SHOW/HIDE BUTTON SITS ON THE LABEL ROW, end-aligned (Q301.2 B), outside the box. So the box has no
 *    trailing slot (`edge: 'toggle'`). The row is as tall as the label's line, not the button (#2804, Q380 A).
 *  · THE BUTTON IS A NESTED Button (Q301.3 B): text appearance, flush, primary intent, emphasis weight, SMALL at
 *    every field size (#2804, Q380 A). It goes disabled with the field, stays live at read-only, and status never
 *    colors it.
 *  · NO VISIBILITY AXIS (Q301.6 A): size(3) × status(4) × state(7) = 84 members, TextField's count. The default
 *    member is the HIDDEN state, a masked value and "Show"; a designer overrides the value and the button's text for
 *    the shown look.
 *  · The code-side contract (Q301.4 A, Q301.5 A, Q301.7 A) is in `codeOnly` and `accessibility`.
 *
 * The wording "Show", "Hide", " password", "Your password is shown" and "Your password is hidden" is DRAFT (Q301.5),
 * as is the masked value "••••••••".
 */
import { ComponentDef } from '../component-schema';
import { makeTextField } from './text-field';

export const passwordField: ComponentDef = makeTextField({
  id: 'password-field',
  name: 'PasswordField',
  aliases: ['password-input', 'password'],
  summary: 'Password field: a text field with a Show button on its label row that reveals the characters.',
  description:
    'A single-line field for a secret the user types — a sign-in password, a new password, a PIN typed as text. TextField\'s anatomy and contract with one added action: a Show/Hide button at the end of the label row that switches the input between masked and plain text. Not for a one-time code in separate boxes (a code input, not built yet), and not for any other single-line text (TextField).',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The visible, persistent label (rendered as FieldLabel), usually "Password" or "New password". Required. Never the placeholder.' },
    { name: 'value', type: 'string', required: false, description: 'Controlled value; pair with onChange.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'Uncontrolled initial value.' },
    { name: 'onChange', type: 'function', required: false, description: 'Change handler (also onBlur / onFocus).' },
    { name: 'placeholder', type: 'string', required: false, description: 'An example only; vanishes on input. The password rules belong in helper text or a list under the field, never here.' },
    { name: 'helpText', type: 'string | node', required: false, description: 'Persistent guidance (rendered as FieldMessage, default status), wired via aria-describedby. State the rules for a new password here, before the user types.' },
    { name: 'validation', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'The validation state, as on TextField: each non-default status swaps the input border and sets the nested message to the matching status; `error` also sets aria-invalid. The Show/Hide button never takes the status color.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The validation text shown at error / warning / success, added to aria-describedby. Say what is wrong and how to fix it (SC 3.3.3).' },
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'Whether the composed FieldMessage is shown. ON by default; turning it off hides the message entirely. Never hides a message the field needs.' },
    { name: 'required', type: 'boolean', default: false, required: false, description: 'Sets required / aria-required, and turns on the FieldLabel\'s required marker.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled. Disables the Show/Hide button with the field.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'Focusable, copyable and submitted, and passes contrast. The Show/Hide button stays live, so a read-only value can still be shown.' },
    { name: 'autoComplete', type: "enum: 'current-password' | 'new-password'", values: ['current-password', 'new-password'], required: true, description: 'Required (SC 1.3.5): `current-password` on a sign-in form, `new-password` where the user sets one, so a password manager fills or offers to generate it. Never `off`.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An optional leading glyph before the value, aria-hidden and never the accessible name. Hidden by default; the file nominates the swap target.' },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Async validation in progress; sets aria-busy; does not block typing.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'TextField\'s three tiers: the input type and the nested label scale with it. The Show/Hide button is small at every size, so the label row stays one label line tall. Every size keeps the input\'s 44px target; the button\'s hit area is 44×44 at medium and large and 24×24 at small, in code.' },
    { name: 'id', type: 'string', required: false, description: 'Wiring + form submission; auto-generated with useId if omitted. The Show/Hide button\'s aria-controls names it.' },
    { name: 'name', type: 'string', required: false, description: 'A real <input name>, so the field works in a native <form> and a password manager recognizes it.' },
  ],

  edge: 'toggle',
  // DRAFT (Q301.6): the masked value the hidden default member shows. Eight bullets, the input's own mask glyph.
  valueDefault: '••••••••',
  codeOnly: [
    'the SMALL field on a COARSE POINTER (#2266, owner decision Q7 A) — iOS Safari zooms the page when it focuses an input whose text is under 16px, and the small field\'s input is 14px. So `small` is for fine pointers: under `@media (pointer: coarse)` the code sets the small input\'s font size to 16px, which keeps the page still. The token (`type.body.sm`) and the Figma member stay at 14, because Figma has no focus zoom. On a touch device the small field therefore pairs a 12px label with a 16px input. Never `maximum-scale=1` in the viewport meta: it blocks pinch zoom as well (WCAG 1.4.4).',
    'style — the field\'s edge is the brand\'s Field style setting, not a prop or a Figma variant: `outline` draws a box, `underline` one line under the value. The brand sets it once, every field takes it, and the field sets are built in that style (#2695).',
    'pending — a real STATE (a spinner replaces an adornment while async validation/value resolves, and the field sets aria-busy), deliberately NOT a Figma variant. Its delta is a runtime spinner swap with no distinct static skin a designer picks from a matrix — the pending member would differ from `rest` only by a node Figma cannot animate — so it stays in `states` (the code tier carries it) and is admitted OUT of the projected `stateAxis`.',
    'empty — a real STATE in code (the field holds no value, so it shows the placeholder), NOT a Figma variant: in Figma the empty field IS the rest, hover and focus-visible members, which show the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. In code emptiness is a content condition that co-occurs with every interaction, so `empty` stays in `states` (`label.empty` and `error.border.empty` keep the "required field left blank" coordinate) and is held out of the projected `stateAxis` with `pending`, leaving size(3) × status(4) × state(7) = 84 members over rest / hover / filled / focus-visible / focus-visible-filled / disabled / read-only. In code the placeholder and the value are one <input>: its `placeholder` attribute and its value, never two elements.',
    'the FOCUS CARET — Figma draws a static bar before the placeholder on the focus-visible member. Code draws the browser\'s native caret, blinking, at the insertion point, with `caret-color` set from `color.text.primary` (the `caret` binding), so it keeps the value ink over the placeholder\'s muted one.',
    'the SHOW/HIDE BUTTON in code (owner decisions Q301.4 A and Q301.5 A) — a `<button type="button" aria-controls="{input id}">` after the label, whose visible text is "Show" while the password is hidden and "Hide" while it is shown, followed by visually hidden text " password", so its name is "Show password" or "Hide password". Pressing it switches the input between `type="password"` and `type="text"`, keeps the caret where it was, and KEEPS FOCUS ON THE BUTTON, so it can be pressed again. The app\'s shared polite live region then says "Your password is shown" or "Your password is hidden" (DRAFT), because some screen readers do not re-read a focused button\'s new name. Never `aria-pressed` as well: a changing name and a pressed state announce the change twice, in opposite directions. Figma shows the button\'s look only.',
    'the SHOWN look in Figma — there is no visibility axis (owner decision Q301.6 A). Every member is the hidden state: the masked value and "Show". For the shown look a designer overrides the `value` text and the button\'s `label` text ("Hide"), which surfaces on the field\'s panel because the button is an exposed nested instance.',
    'BACK TO HIDDEN ON SUBMIT (owner decision Q301.7 A) — the field returns to `type="password"` when its form submits, so a browser never stores or restores the value as plain text.',
    'ONE TOGGLE ONLY — the browser\'s own reveal button is hidden (`input::-ms-reveal { display: none }`), so the field never shows two.',
    'the INPUT\'S ATTRIBUTES — `autocomplete` is required, `current-password` or `new-password`, and never `off` (SC 1.3.5). Paste is never blocked: blocking it fails SC 3.3.8 Accessible Authentication, and a password manager needs it. `spellcheck="false"` and `autocapitalize="none"`, so the value is not sent to a spelling service or changed by the keyboard. `passwordrules` passes through when the host provides one.',
    'the LABEL ROW\'S HEIGHT and the BUTTON\'S HIT AREA (#2804, owner decision Q380 A) — the button is a small Button at every field size, and the row is one label line tall: 18px for a small field, 21 for a medium one and 24 for a large one. In Figma the button stretches to the row. In code the button inside the row sets `block-size: auto` and `padding-block: 0`, so it is one line of its 14px label and the row takes the label\'s height. Figma draws the flush button at its label\'s width. In code the flush button\'s hit area is at least 44×44 at medium and large sizes, and at least 24×24 at small, through a transparent `::before` inset outward (Button\'s flush rule, #2408), so the label row does not move. At medium and large the row (21 and 24px) is shorter than 44, so the extension is ANCHORED: its bottom edge sits on the label row\'s bottom edge and it reaches up and sideways, never down into the input box (a centered 44 would reach 3.5 and 2px into the box). At small the 24×24 is centered and reaches 3px past the row, inside the 8px gap above the box. Either way it never overlaps the input\'s target.',
    'RIGHT TO LEFT — the label row mirrors, so the button sits at the row\'s left end; the masked value follows the input\'s direction.',
    'the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the input, stitches the FieldMessage into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the input and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit).',
    'the KEYBOARD MODEL — native text editing and IME composition guards (do not validate mid-composition). All of it is runtime interaction the closed static member cannot carry.',
  ],

  accessibility: {
    role: 'textbox (native <input type="password">, switched to type="text" while shown), plus a native <button type="button">',
    wcag: [
      '1.3.1 Info and Relationships (label, describedby, and the button\'s aria-controls)',
      '1.3.5 Identify Input Purpose (autocomplete current-password or new-password, never off)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions',
      '3.3.8 Accessible Authentication (paste is never blocked, so a password manager can fill the field)',
      '4.1.2 Name, Role, Value (the button\'s name changes Show password / Hide password)',
      '1.4.11 Non-text Contrast (TextField\'s field boundary)',
      '2.5.8 Target Size (the button\'s hit area: 44×44, or 24×24 at small)',
      '2.4.13 Focus Appearance (intent)',
    ],
    keyboard: 'Tab reaches the input, then the Show/Hide button. Enter or Space on the button shows or hides the password, and focus stays on the button. Tab order follows the visual order in left-to-right and right-to-left layouts.',
    focus: 'The input takes TextField\'s focus ring. The button takes Button\'s own focus ring. Pressing the button never moves focus.',
    aria: 'The host wires the label, aria-describedby and aria-invalid as TextField does. The button carries aria-controls naming the input and a name that changes ("Show password" / "Hide password"), not aria-pressed. Each change is announced once through the app\'s shared polite live region: "Your password is shown" / "Your password is hidden".',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, no trailing colon: "Password", "New password", "Current password".',
    errorPattern: 'What is wrong and how to fix it, such as "Enter a password with at least 12 characters"; never "Invalid password".',
    emptyPattern: 'The label plus an optional placeholder, as on TextField.',
  },

  docs: {
    usage: 'Use for a password, a PIN typed as text, or any other secret a user types. The field nests FieldLabel and a Show/Hide button on the label row, the input box below, and FieldMessage under it. Set `autoComplete` to `current-password` on a sign-in form and `new-password` where the user sets one. Put the rules for a new password in helper text or a list under the field.',
    do: [
      'Set autoComplete to current-password or new-password on every password field',
      'Let the user paste, so a password manager can fill the field',
      'Return the field to hidden when its form submits',
      'State the rules for a new password before the user types',
    ],
    dont: [
      'Use an eye icon inside the field instead of the Show/Hide button',
      'Add aria-pressed to the button as well as changing its name',
      'Use this for a one-time code in separate boxes',
      'Put the password rules in the placeholder',
    ],
    contentGuidelines: 'Label = noun phrase, sentence case, no trailing colon. Button = "Show" / "Hide", with " password" in visually hidden text. Error says what is wrong and how to fix it.',
  },

  ai: {
    primaryPurpose: 'Capture a password or other typed secret, with a button that shows or hides the characters.',
    whenToUse: 'Sign-in, sign-up, change-password and PIN fields: any single-line secret the user types.',
    avoidWhen: 'The text is not a secret (TextField), the code is entered in separate boxes (a code input, not built yet), or the value comes from a known set (Select).',
    commonPartners: ['field-label', 'field-message', 'button', 'list'],
    triggerKeywords: ['password field', 'password input', 'show password', 'sign in', 'PIN'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'button'],
    alternativeTo: ['text-field'],
    replacesPatterns: ['eye icon inside a password field', 'password field with no way to show the characters', 'autocomplete="off" on a password'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'Showing or hiding the password is an instant swap of the input type and the button\'s text, with no animation, so it reads the same under prefers-reduced-motion. The field\'s own state transitions are TextField\'s.',
  },

  notes: {
    contested: [
      'The button\'s position (owner decision Q301.2 B): on the label row, end-aligned, rather than beside the box (A) or below the field (C). The button\'s code hit area does not move the row.',
      'The button\'s size and the row\'s height (owner decision Q380 A, #2804): a small text Button at every field size, and a row one label line tall, rather than a button that follows the field\'s size and a row as tall as the button (36, 44 and 56px at small, medium and large). The label now sits 8px above the box at every size, where TextField\'s label sits, instead of 17, 19.5 and 24px. Link was considered for the control and declined: Show is an action, so it is a button for assistive tech (WCAG 4.1.2); the text appearance gives it the link look.',
      'The button\'s code-side hit area at medium and large (owner question on #2809, option A built): 44×44, anchored so its bottom edge sits on the label row\'s bottom edge, which keeps Button\'s 44 floor for a nested flush Button (#1741, Q170 B) without reaching into the input box. The alternatives: 24×24 at every size as a named exception to the floor (B), or a row that grows to 44 on coarse pointers only (C).',
      'A changing name versus aria-pressed (owner decision Q301.5 A): the name changes Show/Hide and a polite announcement says the new state. The constant name with aria-pressed was declined, because the visible text could not then change to "Hide".',
    ],
    unverified: [
      'The button stretches to the label row (`STRETCH`, #2804) while Button\'s own height is bound to a 36px size. That a live host lets the row hug the label alone and sizes the instance to the row, with its label centered and not clipped, is modeled offline only.',
      'The nested button\'s text is set to "Show" on every member by a property override on the nested instance (`nestTexts`). Whether the live host keeps that override when a designer swaps a placed field\'s variant is the standing nesting caveat.',
    ],
    evolution: [
      'A later idea (owner, Q301.6): the Show/Hide button as its own subcomponent with a shown and a hidden variant, the field\'s value still changed by hand. Filed separately; not part of this def.',
    ],
  },
});
