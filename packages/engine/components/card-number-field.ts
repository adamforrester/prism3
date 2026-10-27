/**
 * CardNumberField (#2343 PR 4, the card-number half of #2429) — a single-line field for a payment card's number, with
 * the card network's tile at its trailing edge.
 *
 * No KB brief: `schema/kb-briefs.json` lists no card, payment or checkout brief. Category `form`, TextField's, because
 * it is TextField with a different trailing cell. The sources are the #2429 proposal (2026-10-09, refreshed 2026-10-12),
 * its 16 recommendations taken as a block (owner Q-B10 A, 2026-10-26, Q11 replaced by Q-B1 B), the #2343 pre-work §3
 * (2026-10-25), and the owner's artwork calls (Q720 A, Q780 A, Q783 A). The KB's data-collection recipe is the field
 * research (`patterns/data-collection-recipes.md`, the card recipe).
 *
 * ONE CALL TO THE FIELD FACTORY (Password's pattern, Q301.8 A). The token block, the seven projected states, `status`,
 * the size system, the nested FieldLabel, FieldMessage and focus ring come from `makeTextField`, so a fix there reaches
 * this field without a copy. What this file states is what differs:
 *
 *  · THE TRAILING CELL IS A PAYMENT TILE (`edge: 'mark'`, #2429 §2). A swap slot whose content is a brand mark, card-
 *    shaped (the mark's own proportion, `aspectLock`), as tall as the icon rung (20 at small and medium, 24 at large),
 *    and never retinted (`fixedPaint`). TextField's trailing glyph is gone: the tile takes its place.
 *  · IT STARTS AT THE GENERIC TILE (owner, 2026-10-27: the generic tile is the owner's "no card type yet" artwork, which
 *    replaces the core `bank-card` glyph the 2026-10-25 proposal planned). Named through the mark set, never as a path:
 *    the tile kind is whichever kind the set draws on the tile artboard (`payment/` since PR 3's rename of `card/`).
 *  · THE MARK SLOT TAKES CARD NETWORKS ONLY (Q-C7 A, awaiting the owner). The tile kind is every "accepted payments"
 *    tile (Q780 A), wallets and pay-later services included, and card-number detection can only ever name a card
 *    network. So the `brand` prop's values are the typed `CARD_NETWORKS` list below, each checked here to be a tile in
 *    the set. A network the owner adds to `payment/` joins by one line here and one in `lint-mark-slots.ts`, which
 *    keeps its own literal list and holds the outcome against the folder. No wallet, logo or social mark can be named.
 *  · TRAILING, FOLLOWING TEXT DIRECTION (#2429 Q7 a), never flipped. No position axis.
 *  · size(3) × status(4) × state(7) = 84 members, TextField's count; medium first (#2429 Q4 b, the fields' exception).
 *  · The code-side contract (formatting, detection, hosted fields, the hidden network name) is in `codeOnly`,
 *    `accessibility` and the props.
 *
 * NOT IN THIS PR: the PaymentField group (#2429 Q1 A) with its expiration date, security code, postal code and name on
 * card parts, the proposal's PR 4b. Those parts are TextFields with their own autocomplete tokens; the group is the
 * follow-up. Co-badged cards stay out of scope (#2429 Q13 b).
 *
 * The wording "Card number", "1234 1234 1234 1234", "The card type shows when you start typing." and the error lines
 * are DRAFT (#2429 §8, accepted as a block with Q16), as is the filled value "1234 5678 9012 3456".
 */
import { ComponentDef } from '../component-schema';
import { BRAND_MARK_NAMES } from '../brand-mark-glyphs';
import { BRAND_MARK_KINDS } from '../brand-mark-set';
import { makeTextField } from './text-field';

/** The payment tiles: every mark the set draws on the tile artboard, by kind, so a kind renamed in the set (`card/` →
 *  `payment/`, PR 3) reaches this field without an edit. */
const TILES = BRAND_MARK_NAMES.filter((n) => BRAND_MARK_KINDS[n.split('/')[0]] === 'tile');
/** The tile kind, the first segment every tile shares. */
const TILE_KIND = TILES[0]?.split('/')[0];
if (!TILE_KIND || TILES.some((n) => !n.startsWith(`${TILE_KIND}/`)))
  throw new Error(`card-number-field: the mark set draws its tile-artboard marks under ${JSON.stringify([...new Set(TILES.map((n) => n.split('/')[0]))])}; the field needs exactly one tile kind`);
/** The network the field shows before it can tell: the generic tile. */
const GENERIC = 'generic';
/** The card networks the field can show, the `brand` values (Q-C7 A): the tiles card-number detection or a payment
 *  provider's card-brand event can name. Never a wallet or a pay-later service: those tiles are in the same kind
 *  (Q780 A) and no card number ever detects them. */
type CardNetwork = typeof GENERIC | 'amex' | 'diners-club' | 'discover' | 'maestro' | 'mastercard' | 'visa';
const CARD_NETWORKS: readonly CardNetwork[] = [GENERIC, 'amex', 'diners-club', 'discover', 'maestro', 'mastercard', 'visa'];
const tileless = CARD_NETWORKS.filter((n) => !(TILES as readonly string[]).includes(`${TILE_KIND}/${n}`));
if (tileless.length)
  throw new Error(`card-number-field: the card networks ${JSON.stringify(tileless)} have no tile in the mark set's ${TILE_KIND}/ kind; the field shows each network's own tile`);

export const cardNumberField: ComponentDef = makeTextField({
  id: 'card-number-field',
  name: 'CardNumberField',
  aliases: ['card-number-input', 'credit-card-number', 'card-number'],
  summary: 'Card number field: a text field with the card network\'s tile at its trailing edge.',
  description:
    'A single-line field for a payment card\'s number. TextField\'s anatomy and contract, with the card network\'s tile at the trailing edge of the box: a generic card until the number shows the network, then that network\'s tile, in its own colors. The network is also stated in text, so the tile is decorative. Ask for the expiration date and the security code in their own text fields beside it, never in this box.',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The visible, persistent label (rendered as FieldLabel), usually "Card number". Required. Never the placeholder.' },
    { name: 'value', type: 'string', required: false, description: 'Controlled value: the digits only, without the spaces the field shows between groups. Pair with onChange.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'Uncontrolled initial value, digits only.' },
    { name: 'onChange', type: 'function', required: false, description: 'Change handler (also onBlur / onFocus). Receives the digits without the group spaces.' },
    { name: 'placeholder', type: 'string', required: false, description: 'A format example only, such as "1234 1234 1234 1234". It vanishes on input and never replaces the label.' },
    { name: 'helpText', type: 'string | node', required: false, description: 'Persistent guidance (rendered as FieldMessage, default status), wired via aria-describedby, such as "The card type shows when you start typing."' },
    { name: 'validation', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'The validation state, as on TextField: each non-default status swaps the input border and sets the nested message to the matching status; error also sets aria-invalid. A number that fails the checksum is a warning, not an error, because some valid cards fail it. The tile never takes the status color.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The validation text shown at error / warning / success, added to aria-describedby. Say what is wrong and how to fix it, such as "Enter the card number."' },
    { name: 'showMessage', type: 'boolean', default: false, required: false, description: 'Whether the composed FieldMessage is shown. Off by default; turn it on to render the helper or validation message. Never hides a message the field needs.' },
    { name: 'required', type: 'boolean', default: false, required: false, description: 'Sets required / aria-required, and turns on the FieldLabel\'s required marker.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled. A disabled field also disables a hosted input. The tile keeps its own colors.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'Focusable, copyable and submitted, and passes contrast, as on TextField. For a saved card, show the last four digits in a read-only display instead of this field.' },
    { name: 'brand', type: `enum: ${CARD_NETWORKS.map((n) => `'${n}'`).join(' | ')}`, values: [...CARD_NETWORKS], default: GENERIC, required: false, description: 'The card network the field shows: generic until the leading digits tell the network, then that network\'s tile. Set it from the card-type detection, or from the payment provider\'s card-brand event when the provider hosts the input. Card networks only: a wallet or pay-later tile is never a value, because no card number names one.' },
    { name: 'brandName', type: 'string', required: false, description: 'The detected network\'s name in the app\'s own words, such as "Visa". It goes in a visually hidden description on the input, linked by aria-describedby, so the network is never conveyed by the tile alone. Leave it empty while brand is generic.' },
    { name: 'showCardMark', type: 'boolean', default: true, required: false, description: 'Whether the tile shows. On by default; the field shows the generic tile before it knows the network.' },
    { name: 'renderInput', type: 'function', required: false, description: 'Returns the payment provider\'s mount point, the element its hosted input mounts into. With it, the field draws the label, box, tile, focus ring and message around the provider\'s input and never renders the card number input itself. Without it, the field renders a native input, which puts the page outside the lightest card-data compliance scope.' },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Async validation in progress; sets aria-busy; does not block typing.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An optional leading glyph before the value, aria-hidden and never the accessible name. Hidden by default; the file nominates the swap target.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'TextField\'s three tiers: the input type and the nested label scale with it. The tile is 20px tall at small and medium and 24px at large, its width from the tile\'s proportion. Every size keeps the input\'s 44px target.' },
    { name: 'id', type: 'string', required: false, description: 'Wiring + form submission; auto-generated with useId if omitted, tying label to input and the aria-describedby chain.' },
    { name: 'name', type: 'string', required: false, description: 'A real <input name> in the native mode, so the field works in a native <form>. A hosted input has no name on the page.' },
  ],

  edge: 'mark',
  mark: { start: `${TILE_KIND}/${GENERIC}` },
  // DRAFT: a format example, not a real card's number.
  valueDefault: '1234 5678 9012 3456',
  codeOnly: [
    'the SMALL field on a COARSE POINTER (#2266, owner decision Q7 A) — iOS Safari zooms the page when it focuses an input whose text is under 16px, and the small field\'s input is 14px. So `small` is for fine pointers: under `@media (pointer: coarse)` the code sets the small input\'s font size to 16px, which keeps the page still. The token (`type.body.sm`) and the Figma member stay at 14, because Figma has no focus zoom. On a touch device the small field therefore pairs a 12px label with a 16px input. Never `maximum-scale=1` in the viewport meta: it blocks pinch zoom as well (WCAG 1.4.4).',
    'style — not projected: the field\'s edge is the brand\'s Field style setting, not a prop or a Figma variant: `outline` draws a box, `underline` one line under the value. In code the brand sets it once, every field takes it, and the field sets are built in that style (#2695).',
    'pending — not projected: its delta is a runtime spinner swap with no distinct static skin a designer picks from a matrix, and the pending member would differ from `rest` only by a node Figma cannot animate. In code a spinner replaces an adornment while async validation or the value resolves, and the field sets aria-busy, so it stays in `states` and is admitted OUT of the projected `stateAxis`.',
    'empty — not projected: in Figma the empty field IS the rest, hover and focus-visible members, which show the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. In code emptiness is a content condition that co-occurs with every interaction, so `empty` stays in `states` (`label.empty` and `error.border.empty` keep the "required field left blank" coordinate) and is held out of the projected `stateAxis` with `pending`, leaving size(3) × status(4) × state(7) = 84 members over rest / hover / filled / focus-visible / focus-visible-filled / disabled / read-only. In code the field holds no value, so it shows the placeholder; the placeholder and the value are one <input>: its `placeholder` attribute and its value, never two elements.',
    'the FOCUS CARET — Figma draws a static bar before the placeholder on the focus-visible member. Code draws the browser\'s native caret, blinking, at the insertion point, with `caret-color` set from `color.text.primary` (the `caret` binding), so it keeps the value ink over the placeholder\'s muted one.',
    'the INPUT\'S ATTRIBUTES (#2429 §5) — `autocomplete="cc-number"` (SC 1.3.5, never `off`), `inputmode="numeric"` and never `type="number"` (a wheel or arrow key changes the value, and an invalid entry gives no feedback), `spellcheck="false"`, and `dir="ltr"` on the input in a right-to-left layout, because a card number reads left to right in every script. Paste is never blocked, and pasted spaces and hyphens are accepted.',
    'GROUPING AS THE USER TYPES (#2429 §5) — the field shows the digits in the detected network\'s groups (4-4-4-4, or 4-6-5 for a 15-digit network), keeps the caret where the user is typing, and never announces the reformatting. The spaces are not part of the value: `value` and `onChange` carry digits only. The length is never capped below 19 digits. No auto-advance to the next field when the number is complete (SC 3.2.2). No masking while typing: people check what they typed.',
    'CARD-TYPE DETECTION and the TILE (#2429 §5, Q10 A) — detection reads the leading digits and sets `brand`; there is never a manual card-type select. The tile swaps in place, generic until the network is known. The tile is decorative (`aria-hidden="true"` on the mark), and the network is stated in text: `brandName` goes in a visually hidden element linked by `aria-describedby`, NOT a live region, so typing never triggers speech. A network the merchant does not accept keeps its detected tile, and the field shows the error. In forced-colors mode the tile alone sets `forced-color-adjust: none`, so it keeps the provider\'s colors and the field around it follows the user\'s.',
    'the HOSTED INPUT (#2429 §6, Q12 b, hosted the documented default) — most checkouts take the number in the payment provider\'s hosted input, an iframe the provider serves, which keeps the merchant in the lightest card-data compliance scope (PCI DSS SAQ A). With `renderInput`, the field is a shell: it draws the label, box, tile, focus ring and message outside the frame, driven by the provider\'s state events (focus, invalid, complete, empty) and brand event, and the provider owns the input, its value, its caret, its formatting and its detection. A host `<label for>` cannot reach inside an iframe, so the visible label wraps the mount point, clicking it calls the provider\'s `focus()`, and the label text is passed into the provider\'s own label or `title` option. `aria-describedby` cannot cross the frame either, so the validation text is mirrored into the provider\'s message API where it has one. The typed text\'s font, size and ink are passed through the provider\'s styling API from the same tokens the shell binds. Without `renderInput` the field renders a native input, for prototypes and providers that tokenize page inputs; the docs say plainly that such a page is outside SAQ A.',
    'VALIDATION (#2429 §5, the pre-work §3.3) — empty ("Enter the card number."), a number that fails the Luhn checksum (a warning, not an error, because some UnionPay numbers fail it: "Check the card number. It doesn\'t match a valid card."), and a network the merchant does not accept (built from the accepted list). Validate on blur, then on input once the field shows an error, as TextField does; never mid-IME-composition. A decline from the processor belongs to the card group, not this field.',
    'the TILE in Figma — a swap slot that starts at the generic tile and binds only its height (`size.{size}.mark-height`, the icon rung); both executors lock the instance to its own component\'s proportion, so a 32×20 tile is about 38×24 at large. It takes no ink from the field at any state, disabled included (`fixedPaint`). The tile\'s rounded corners and edge belong to the brand-mark component. The `card mark` switch shows or hides it; `↳ swap card mark` picks the card network\'s tile.',
    'RIGHT TO LEFT — the label, the box and the tile\'s position mirror, so the tile sits at the box\'s left end. The digits stay left to right (`dir="ltr"` on the input), and the tile\'s artwork is never flipped. One provider turns off number grouping in right-to-left layouts; the hosted adapter states that limit rather than hiding it.',
    'the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the input, stitches the FieldMessage and the hidden network name into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the input and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit).',
    'the KEYBOARD MODEL — native text editing and IME composition guards (do not validate mid-composition). All of it is runtime interaction the closed static member cannot carry.',
  ],

  accessibility: {
    role: 'textbox (a native <input inputmode="numeric">, or the payment provider\'s hosted input inside its frame)',
    wcag: [
      '1.3.5 Identify Input Purpose (autocomplete cc-number, never off)',
      '1.3.1 Info and Relationships (label, describedby and the hidden network name)',
      '1.4.1 Use of Color (the network is stated in text, never by the tile alone)',
      '3.2.2 On Input (no auto-advance when the number is complete)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion',
      '1.4.11 Non-text Contrast (TextField\'s field boundary)',
      '2.4.13 Focus Appearance (intent)',
    ],
    keyboard: 'Native text editing. Tab reaches the input; the tile is not a stop. Focus never moves on its own when the number is complete.',
    focus: 'The input takes TextField\'s focus ring. With a hosted input, the ring follows the provider\'s focus event, and clicking the label focuses the provider\'s input.',
    aria: 'The host wires the label, aria-describedby and aria-invalid as TextField does. The tile is aria-hidden. The detected network\'s name is a visually hidden description on the input, added to aria-describedby and never a live region, so typing is not interrupted by speech. Reformatting is not announced. With a hosted input, the label text is also passed to the provider\'s own label option, because a label outside the frame cannot name the input inside it.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, no trailing colon: "Card number". Its neighbors spell out their names too: "Expiration date" and "Security code", never an acronym.',
    errorPattern: 'What is wrong and how to fix it: "Enter the card number." · "Check the card number. It doesn\'t match a valid card." · "This card type isn\'t accepted. Use Visa, Mastercard or American Express." (the accepted list, from the app).',
    emptyPattern: 'The label plus an optional format example as the placeholder, "1234 1234 1234 1234", and the generic tile.',
  },

  docs: {
    usage: 'Use for a payment card\'s number in a checkout or a saved-card form. The field nests FieldLabel above, the input box with the card network\'s tile at its trailing edge, and FieldMessage below. Set brand from the card-type detection, or from the payment provider\'s brand event, and brandName to the network\'s name, so the network is stated in text as well as shown. Ask for the expiration date and the security code in their own text fields, with autocomplete cc-exp and cc-csc. When the payment provider hosts the input, pass its mount point with renderInput and let the field draw everything around it.',
    do: [
      'Let the leading digits set the network, and swap the tile in place',
      'State the detected network in text with brandName, not by the tile alone',
      'Group the digits as the user types, and keep the value digits only',
      'Use the payment provider\'s hosted input in production, with renderInput',
      'Warn, rather than block, when the number fails the checksum',
    ],
    dont: [
      'Recolor, dim or redraw the tile, at any state',
      'Add a card-type select: the digits tell the network',
      'Put the expiration date or the security code in this box',
      'Use type="number" or turn off autocomplete',
      'Move focus to the next field when the number is complete',
    ],
    contentGuidelines: 'Label = "Card number", sentence case, no trailing colon. Placeholder = a format example only. Helper = "The card type shows when you start typing." Error says what is wrong and how to fix it.',
  },

  ai: {
    primaryPurpose: 'Capture a payment card\'s number, showing the detected card network\'s tile and stating the network in text.',
    whenToUse: 'The card number in a checkout or a saved-card form, beside text fields for the expiration date and the security code.',
    avoidWhen: 'The value is not a card number (TextField), the card is already saved (show its last four digits as text), or the payment is a wallet or express checkout (a wallet button, not built yet). Never for the expiration date or the security code (TextField with autocomplete cc-exp or cc-csc).',
    commonPartners: ['text-field', 'brand-mark', 'field-label', 'field-message', 'button'],
    triggerKeywords: ['card number', 'credit card field', 'payment card', 'card details', 'checkout card'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring'],
    alternativeTo: ['text-field'],
    replacesPatterns: ['a card number in a plain text input with no card type', 'a manual card-type select', 'number, expiration and security code packed into one box', 'type="number" on a card number'],
    planned: ['payment-field', 'wallet-button'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The tile swaps in place with no animation when the network is detected, so it reads the same under prefers-reduced-motion. The field\'s own state transitions are TextField\'s.',
  },

  notes: {
    contested: [
      'The PaymentField group (#2429 Q1 A) is a separate component and the follow-up (PR 4b): this field ships first, and the expiration date and security code are TextFields until the group composes them.',
      'The tile at the disabled member keeps its own colors (no opacity), because any dimming recolors the provider\'s mark. The box, the value and the label carry the disabled skin. Built A; held for the owner in the PR (Q-C1).',
      'The tile\'s presence is a switch, on by default, backed by showCardMark (#2429 table, card mark on). The alternative is a tile that is always there.',
    ],
    unverified: [
      'The tile slot binds its height alone and both executors lock the instance to the brand-mark component\'s proportion (`aspectLock`). Modeled on the offline host and in the paste executor\'s order; that a live host keeps the lock when a designer swaps a placed field\'s tile to another network is the standing nesting caveat.',
      'No card network publishes a pixel minimum for a mark inside a field. The 20px tile is a judgment against Visa\'s "clearly legible" rule and an acquirer\'s roughly 5mm, not a verified compliance point (#2429 §7).',
      'The PCI DSS v4.0.1 SAQ A wording for pages that embed a provider\'s iframe was read only in secondary sources (#2429 §6).',
    ],
    evolution: [
      'Proposed on #2429 (2026-10-09, refreshed 2026-10-12) as TextField with a card-shaped trailing slot, then restated on #2343 (2026-10-25) once the brand-mark type existed. The owner took the 16 recommendations as a block (Q-B10 A), committed artwork for internal use (Q-B1 B), made card tiles full-bleed with the component drawing the edge (Q720 A), renamed the card kind to payment (Q780 A), and gave the generic tile the owner\'s own artwork (2026-10-27), which replaced the planned core card glyph.',
    ],
    projection: [
      'In Figma the tile is a swap that starts at the generic payment tile; a designer picks the detected card network\'s tile with the swap card mark property. Its height is bound and its width follows the tile\'s proportion; it takes no ink from the field.',
    ],
  },
});
