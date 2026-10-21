/**
 * SearchField (#2888, owner decisions Q514, 2026-10-21) — a single-line field for a query the user types to find
 * something: a site search, a filter over a list. KB brief: `components/text-field.md` (§3 and §10 name it one of
 * TextField's thin specializations; there is no search brief of its own). Field research:
 * `reference/Prism2/component-specs/search-field.json` (a `searchLine` leading glyph on by default, a `closeFill` clear
 * glyph, a visible label by default, five states).
 *
 * ONE CALL TO THE FIELD FACTORY (Password field's pattern, Q301.8 A). Everything TextField is — the token block, the
 * seven projected states, `status`, the size system, the nested FieldLabel, FieldMessage and focus ring — comes from
 * `makeTextField` in `text-field.ts`, so a fix there reaches this field without a copy. What this file states is what
 * differs:
 *
 *  · ITS OWN STYLE (Q?1 A). The edge comes from the brand's Search field style lever (`searchFieldStyle`), not from
 *    Field style: `follow` (the default) takes Field style, `outline` or `underline` sets search apart. Resolved by
 *    `fieldStyleFor` in `anatomy-figma.ts`, then drawn by the same `applyFieldStyle` every field uses. No Figma axis
 *    and no per-instance prop, so the set stays 84 members.
 *  · THE LEADING GLYPH IS `search` AND SHOWN by default (Prism 2's `leadingIcon: true`).
 *  · THE CLEAR BUTTON (Q?3 A) is TextField's trailing glyph, starting at `close-filled` and built hidden; a designer
 *    shows it on a filled instance. The code behavior is in `codeOnly`.
 *  · THE LABEL (Q?4 A) is visible by default. `hideLabel` hides it visually in code and keeps it in the accessibility
 *    tree; in Figma a `label` switch removes it from the member.
 *  · NO SUBMIT BUTTON (Q?5 A): Enter submits the host's form. FOUR STATUSES (Q?6 A): size(3) × status(4) × state(7)
 *    = 84 members, TextField's count. THE FIELD ONLY (Q?7 A): suggestions come later on a combobox (#2899).
 *  · THE SITE HEADER (Q?8 A) is a usage example in `docs`, not a component.
 *
 * The wording "Clear search" and "Search cleared" is the owner's (Q514, approved as drafted).
 */
import { ComponentDef } from '../component-schema';
import { makeTextField } from './text-field';

export const searchField: ComponentDef = makeTextField({
  id: 'search-field',
  name: 'SearchField',
  aliases: ['search-input', 'search-box', 'search'],
  summary: 'Search field: a text field with a search glyph and a clear button, for a query.',
  description:
    'A single-line field for a query the user types to find something — a site search, a filter over a list. TextField\'s anatomy and contract with a leading search glyph, a clear button while it holds a value, and an edge the brand can set apart from its other fields. Not for suggestions as the user types (a combobox, not built yet), and not for any other single-line text (TextField).',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The persistent label (rendered as FieldLabel), usually "Search" or what is searched ("Search products"). Required, even when hidden. Never the placeholder.' },
    { name: 'hideLabel', type: 'boolean', default: false, required: false, description: 'Hides the label visually and keeps it in the accessibility tree, so the field keeps its name. For a search whose purpose is plain from where it sits, such as a site header. Never display: none.' },
    { name: 'value', type: 'string', required: false, description: 'Controlled value; pair with onChange.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'Uncontrolled initial value.' },
    { name: 'onChange', type: 'function', required: false, description: 'Change handler (also onBlur / onFocus). Also fires with an empty value when the clear button clears the field.' },
    { name: 'placeholder', type: 'string', required: false, description: 'An example query only; vanishes on input. Never the label.' },
    { name: 'helpText', type: 'string | node', required: false, description: 'Persistent guidance (rendered as FieldMessage, default status), wired via aria-describedby. Off by default in most searches.' },
    { name: 'validation', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'The validation state, as on TextField: each non-default status swaps the input border and sets the nested message to the matching status; error also sets aria-invalid. A search rarely needs one; a query that is too short is one case.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The validation text shown at error / warning / success, added to aria-describedby. Say what is wrong and how to fix it (SC 3.3.3).' },
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'Whether the composed FieldMessage is shown. On by default; turning it off hides the message entirely. Never hides a message the field needs.' },
    { name: 'required', type: 'boolean', default: false, required: false, description: 'Sets required / aria-required, and turns on the FieldLabel\'s required marker.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled. The clear button is not shown while the field is disabled.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'Focusable, copyable and submitted, and passes contrast. The clear button is not shown, because the value cannot change.' },
    { name: 'autoComplete', type: 'string (WHATWG token)', required: false, description: 'Usually off for a site search, so the browser does not offer earlier queries over the page. Pass a token where a saved value helps.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'The search glyph before the value, aria-hidden and never the accessible name. Shown by default; turn it off or swap it where the field\'s purpose needs a different mark.' },
    { name: 'trailingIcon', type: 'slot', required: false, description: 'The clear button\'s glyph, close-filled by default. In code the clear button is a focusable button named "Clear search", shown only while the field holds a value.' },
    { name: 'onClear', type: 'function', required: false, description: 'Called after the clear button empties the field, with focus back on the input.' },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Results are loading; sets aria-busy and does not block typing.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'TextField\'s three tiers: the input type, the nested label and the padding scale with it. Every size keeps the 44px target. small is for fine pointers only: on a coarse pointer the code sets the small input to 16px, because iOS Safari zooms the page when it focuses an input under 16px. The edge, outline or underline, is the brand\'s Search field style setting, not a prop.' },
    { name: 'id', type: 'string', required: false, description: 'Wiring + form submission; auto-generated with useId if omitted. The clear button\'s aria-controls names it.' },
    { name: 'name', type: 'string', required: false, description: 'A real <input name>, so the query submits with the host\'s form ("q" is common).' },
  ],

  edge: 'trailing-glyph',
  valueDefault: 'Entered text',
  leading: { glyph: 'search', shown: true },
  trailing: { glyph: 'close-filled' },
  labelSwitch: true,
  codeOnly: [
    'the SMALL field on a COARSE POINTER (#2266, owner decision Q7 A) — iOS Safari zooms the page when it focuses an input whose text is under 16px, and the small field\'s input is 14px. So `small` is for fine pointers: under `@media (pointer: coarse)` the code sets the small input\'s font size to 16px, which keeps the page still. The token (`type.body.sm`) and the Figma member stay at 14, because Figma has no focus zoom. On a touch device the small field therefore pairs a 12px label with a 16px input. Never `maximum-scale=1` in the viewport meta: it blocks pinch zoom as well (WCAG 1.4.4).',
    'style — not projected: the search field\'s edge is the brand\'s Search field style setting (#2888, owner decision Q514 taking Q?1 A), not a prop or a Figma variant. `follow`, the default, takes the brand\'s Field style (#2695); `outline` draws a box and `underline` one line under the value, whatever the other fields draw. In code the brand sets it once and every search field takes it; the search field set is built in that style.',
    'pending — not projected: its delta is a runtime spinner swap with no distinct static skin a designer picks from a matrix, and the pending member would differ from `rest` only by a node Figma cannot animate. In code a spinner replaces an adornment while async validation or the value resolves, and the field sets aria-busy, so it stays in `states` and is admitted OUT of the projected `stateAxis`.',
    'empty — not projected: in Figma the empty field IS the rest, hover and focus-visible members, which show the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. In code emptiness is a content condition that co-occurs with every interaction, so `empty` stays in `states` (`label.empty` and `error.border.empty` keep the "required field left blank" coordinate) and is held out of the projected `stateAxis` with `pending`, leaving size(3) × status(4) × state(7) = 84 members over rest / hover / filled / focus-visible / focus-visible-filled / disabled / read-only. In code the field holds no value, so it shows the placeholder; the placeholder and the value are one <input>: its `placeholder` attribute and its value, never two elements.',
    'the FOCUS CARET — Figma draws a static bar before the placeholder on the focus-visible member. Code draws the browser\'s native caret, blinking, at the insertion point, with `caret-color` set from `color.text.primary` (the `caret` binding), so it keeps the value ink over the placeholder\'s muted one.',
    'the CLEAR BUTTON in code (#2888, owner decision Q514 taking Q?3 A) — a `<button type="button" aria-label="Clear search" aria-controls="{input id}">` drawing the trailing glyph, rendered only while the input holds a value and the field is neither disabled nor read-only, so an empty field never offers it. Pressing it empties the input, fires onChange with the empty value and then onClear, RETURNS FOCUS TO THE INPUT, and the app\'s shared polite live region says "Search cleared" once. It is its own Tab stop after the input. Figma builds the glyph hidden on every member (the `trailing icon` switch, off by default); a designer shows it on a filled instance.',
    'ONE CLEAR BUTTON ONLY — the browser\'s own cancel glyph on `type="search"` is hidden (`input[type="search"]::-webkit-search-cancel-button { appearance: none; display: none }`, and the decoration likewise), so the field never shows two.',
    'the HIDDEN LABEL (#2888, owner decision Q514 taking Q?4 A) — `hideLabel` keeps the <label> in the DOM and clips it from view (the visually-hidden technique: a 1px clipped box, never `display: none` or `visibility: hidden`), so the input keeps its accessible name. In Figma the `label` switch removes the nested label from the member, the closest a static member comes; the switch off stands for `hideLabel` in code, never for a field with no label.',
    'the SEARCH LANDMARK and the INPUT\'S ATTRIBUTES — the host wraps a site or section search in `<form role="search">` (or `<search>`), so it is a landmark. The input is `type="search"` with `enterkeyhint="search"`, so a touch keyboard labels its Enter key for searching. There is no submit button (owner decision Q514 taking Q?5 A): Enter submits the host\'s form.',
    'the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the input, stitches the FieldMessage into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the input and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit).',
    'the KEYBOARD MODEL — native text editing; Escape empties the field the way the clear button does, as a native search input does, and IME composition guards (do not search mid-composition). All of it is runtime interaction the closed static member cannot carry.',
    'RIGHT TO LEFT — the glyphs mirror with the row: the search glyph sits at the input\'s start edge and the clear button at its end; the search glyph itself is not flipped.',
  ],

  accessibility: {
    role: 'searchbox (native <input type="search">), plus a native <button type="button"> to clear it',
    wcag: [
      '1.3.1 Info and Relationships (a label, kept in the DOM when visually hidden, and the search landmark)',
      '2.4.6 Headings and Labels (the label names what is searched)',
      '3.3.2 Labels or Instructions',
      '4.1.2 Name, Role, Value (the clear button is named "Clear search")',
      '4.1.3 Status Messages ("Search cleared" through a polite live region)',
      '1.4.11 Non-text Contrast (TextField\'s field boundary, outline or underline)',
      '2.5.8 Target Size',
      '2.4.13 Focus Appearance (intent)',
    ],
    keyboard: 'Tab reaches the input, then the clear button while the field holds a value. Enter submits the host\'s form. Escape empties the field. Enter or Space on the clear button empties the field and returns focus to the input.',
    focus: 'The input takes TextField\'s focus ring. The clear button takes its own focus ring, and pressing it moves focus back to the input.',
    aria: 'The host wires the label, aria-describedby and aria-invalid as TextField does. A hidden label stays in the DOM, visually hidden, never display: none. The clear button carries aria-label="Clear search" and aria-controls naming the input; the cleared state is announced once through the app\'s shared polite live region: "Search cleared". While results load, aria-busy.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, no trailing colon: "Search", "Search products", "Filter orders".',
    errorPattern: 'What is wrong and how to fix it, such as "Enter at least 2 characters"; never "Invalid search".',
    emptyPattern: 'The label plus an optional placeholder with an example query; the search glyph stays.',
  },

  docs: {
    usage: 'Use for a query that finds or filters: a site search, a search within a section, a filter over a long list. The field nests FieldLabel above the box and FieldMessage below it; the box starts with the search glyph and ends with a clear button while it holds a value. Wrap a site or section search in a search landmark. Keep the label visible in a form; hide it only where the field\'s purpose is plain from where it sits, and it still names the field. In a site header, as an example and not a separate component: on a wide screen a small field sits inline in the header with its label hidden; on a narrow screen an Icon button named "Search" opens a search row under the header with a Cancel button, focus moves into the field, and Cancel closes the row and returns focus to the Search button.',
    do: [
      'Wrap a site or section search in a search landmark',
      'Keep a label on every search field, visually hidden where the context makes it plain',
      'Return focus to the input after the clear button empties it',
      'Hide the browser\'s own cancel glyph, so the field shows one clear button',
    ],
    dont: [
      'Use the placeholder as the label',
      'Show the clear button on an empty field',
      'Add a suggestions list to this field; use a combobox for that',
      'Set the search field\'s edge per instance; the brand sets it once',
    ],
    contentGuidelines: 'Label = noun phrase, sentence case, no trailing colon, naming what is searched. Placeholder = an example query. Clear button = "Clear search". After clearing, announce "Search cleared".',
  },

  ai: {
    primaryPurpose: 'Capture a search query, with a search glyph and a clear button.',
    whenToUse: 'Site search, a search within a section, a filter over a list: a single-line query the user types to find something.',
    avoidWhen: 'Suggestions appear as the user types (a combobox, not built yet), the text is not a query (TextField), or the value comes from a known set (Select).',
    commonPartners: ['field-label', 'field-message', 'icon', 'icon-button', 'spinner'],
    triggerKeywords: ['search field', 'search input', 'search box', 'search bar', 'filter field'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring'],
    alternativeTo: ['text-field'],
    replacesPatterns: ['search field with no label', 'two clear buttons in a search field', 'clear button on an empty search field'],
    planned: ['combobox'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The clear button appears and disappears with the value, as an instant change with no animation, so it reads the same under prefers-reduced-motion. The field\'s own state transitions are TextField\'s.',
  },

  notes: {
    contested: [
      'Its own style lever (owner decision Q514 taking Q?1 A), rather than a `style` variant on the set (B: 168 members, and style as a code coordinate, which #2721 kept out of every field) or both (C).',
      'The clear button is TextField\'s trailing glyph built hidden (Q?3 A), rather than an engine piece that ties a part\'s visibility to state (B) or a switch on by default that shows a clear button on an empty field (C, Prism 2).',
      'Four statuses kept (Q?6 A), rather than Prism 2\'s set with no status axis (B), so the field stays one factory call.',
    ],
    unverified: [
      'The leading glyph is built shown and starts at `search`, the clear glyph hidden at `close-filled` (`swapDefault`). That a live host keeps the swap defaults when a designer swaps a placed field\'s variant is the standing nesting caveat.',
    ],
    evolution: [
      'Phase 2 (owner decision Q514 taking Q?7 A): suggestions as the user types, on the planned generic combobox (#2899).',
    ],
  },
});
