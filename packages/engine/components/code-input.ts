/**
 * CodeInput and CodeInput.Cell (#2428) — a field for a short one-time code, drawn as a row of cells over ONE input.
 *
 * No KB brief: `schema/kb-briefs.json` lists no code, OTP or PIN brief, and the KB's login and authentication pattern
 * is not yet briefed. Category `form`, beside the fields it sits with: the proposal on #2428 grounds it in the KB's
 * text-field and form briefs (one-time-code autocomplete as an SC 1.3.5 obligation; strip, don't scold), W3C's
 * Understanding SC 3.3.8 (one field per character is the failing case) and the platforms' single-field one-time-code
 * contracts.
 *
 * Owner decisions on #2428:
 *   Q321 (2026-10-15) A on every item of the proposal but cell count: one real input drawn as cells (1 A); its own
 *        def, not the field factory (2 A); fluid cells to a 32px floor (5 A); the ring on the active cell (6 A); no
 *        separator (7 A); no masking (8 A); status default and error (9 A); onComplete, never auto-submit (10 A); the
 *        name Code input and its aliases (13 A); its own page (14 A).
 *   Q329 (2026-10-15) A: cell count is a native `items` slot of a Code cell part, 6 by default, min 4, max 8 (#2657's
 *        slot constraints). Each cell's digit is edited on the cell. Q321.4 (Figma-only digit text properties) dropped.
 *        THE ACCEPTED TRADE-OFF: the field's status and state do not flow into slot children in Figma; the designer
 *        sets each cell's state, and code drives every cell from the one input.
 *   Q330 (2026-10-15) A: four sizes, small 44×44 with a 16px digit, medium 48×56 / 20 (the default), large 56×64 / 24,
 *        xlarge 68×72 / 40; a fill-width option sharing the row with a 32px floor. Replaces Q321.12.
 *   As-built wireframe approved 2026-10-16. Cleared for build per #2382.
 * Rules decided on #2706 that this file follows: Q345 lowercase Figma property names; Q346 a border never binds an
 * icon or text role, and a disabled border binds `color.disabled.border`; Q347 / Q359 the first member is the code
 * default, so medium leads; Q344 the cell carries the prototype reactions (Rest: While hovering and While pressing;
 * Hover: While pressing).
 *
 * THE CELL'S ID HAS NO `_` (Q394 A on #2783). Q349 gives a part used only inside its parent the `_` prefix, and Q329
 * makes the cell the slot's preferred value. The two collide: Figma leaves a `_` component out of a published library,
 * so a file using the library could not add a cell from the slot, and the slot projection refuses a `_` id as a
 * preferred value (#2657). The cell is `code-input-cell`, unprefixed and preferred in the slot, as decided; the
 * segmented-control segment, `_tab-item` and `_list-item` (Q353, Q355) meet the same collision in the rename sweep.
 *
 * ── THE CELL ─────────────────────────────────────────────────────────────────────────────────────────────────
 * `size` [medium, small, large, xlarge] × seven states = 28 members. The approved cell states are rest, hover,
 * active, filled, active filled, error and disabled; the closed state vocabulary spells active `focus-visible` and
 * active filled `focus-visible-filled`, the names Text field gives the same look (the ring and the caret). Its
 * SIZE IS A LITERAL PER SIZE (`builtSize`, Dialog's construction, Q303.5 A): Q330's 48, 64 and 72 sit on no size
 * rung, so no new token is minted and every brand draws the same cell. Paint is Text field's field chrome, key for
 * key where the state exists.
 *
 * ── THE FIELD ────────────────────────────────────────────────────────────────────────────────────────────────
 * `size` × `status` [default, error] × six states (Text field's without read-only) = 48 members. A column: a nested
 * FieldLabel, the `items` slot of six nested cells following the field's `size`, and a nested FieldMessage following
 * `status`. Each member's DEFAULT cells show its state (`variantWhen`): the filled member a full code, focus-visible-filled
 * three digits and the active fourth cell. That is a fresh insert's starting point only: a placed field's cells are
 * the designer's, per Q329.
 *
 * Field style (#2695; #2719, Q332 A and Q12 A): the cell is in `FIELD_FRAME_PARTS`, so under Underline each cell draws one
 * bottom line, 2px with the ring at the 2px offset when active and `border.danger` in error. The field's gaps stay.
 */
import { ComponentDef } from '../component-schema';

// The cell geometry per size (owner decision Q330 A): width, height. Literal px, no new token.
const CELL_WIDTH = { medium: 48, small: 44, large: 56, xlarge: 68 };
const CELL_HEIGHT = { medium: 56, small: 44, large: 64, xlarge: 72 };

export const codeInputCell: ComponentDef = {
  id: 'code-input-cell',
  name: 'CodeInput.Cell',
  aliases: ['code-cell', 'otp-cell'],
  category: 'form',
  status: 'draft',
  summary: 'One cell of a code input: a box holding one character of the code. Used only inside a code input.',
  description:
    'One cell of a code input: a box that shows one character of the code. It is drawn, not typed into: the code input holds one real input, and each cell shows the character at its place. The active cell, where the next character goes, carries the focus ring and the caret. A cell in error takes the danger border. Used only inside a code input, which sets every cell from its input.',

  props: [
    { name: 'digit', type: 'string', required: false, description: 'The character this cell shows: one digit, or one letter in a code that allows letters. Empty until the user reaches it.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large' | 'xlarge'", values: ['small', 'medium', 'large', 'xlarge'], default: 'medium', required: false, description: 'The cell size and its character size. Set by the code input.' },
    { name: 'isActive', type: 'boolean', default: false, required: false, description: 'Whether this is the cell the next character goes into while the input has focus. Set by the code input.' },
    { name: 'isInvalid', type: 'boolean', default: false, required: false, description: 'Whether the code input is in error. Set by the code input.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Whether the code input is disabled. Set by the code input.' },
  ],

  states: ['rest', 'hover', 'filled', 'focus-visible', 'focus-visible-filled', 'disabled', 'error'],
  // Medium FIRST (owner decisions Q347 and Q359): the set's first member is the code default.
  variants: {
    size: ['medium', 'small', 'large', 'xlarge'],
  },
  axisKinds: { size: 'authoring' },

  paintKeys: ['{slot}.{state}', '{slot}'],
  typeWeight: { group: 'title', intent: 'bold' },

  tokens: {
    // ── GEOMETRY ───────────────────────────────────────────────────────────────────────────────────────────
    // The xlarge cell's corner (as-built wireframe): a 6px corner on the 68×72 display cell, 2px on the others.
    'size.medium.radius': 'radius.sm',
    'size.small.radius': 'radius.sm',
    'size.large.radius': 'radius.sm',
    'size.xlarge.radius': 'radius.lg',
    'border-width': 'border-width.hairline',
    'pad': 'space.0',
    // The focus ring at the field offset (0): the cell's own border supplies the separation, as on Text field.
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    'caret-width': 'border-width.hairline',

    // ── THE CHARACTER (owner decision Q330 A: 16, 20, 24, 40) — the body step at small, the title steps above it. No
    // guaranteed role is above 18px, and the title weights differ by brand, so the title refs name the BOLD intent
    // (`typeWeight`): `strong` here, the default brand's resolution, repointed per brand before projection.
    'size.medium.type': 'type.title.sm.strong',
    'size.small.type': 'type.body.md.default',
    'size.large.type': 'type.title.md.strong',
    'size.xlarge.type': 'type.title.2xl.strong',
    // The caret is as tall as the character's size: the icon rungs are the dimension steps at 16, 20, 24 and 40.
    'size.medium.caret-height': 'icon.size.sm',
    'size.small.caret-height': 'icon.size.xs',
    'size.large.caret-height': 'icon.size.md',
    'size.xlarge.caret-height': 'icon.size.xl',

    // ── PAINT — Text field's field chrome. A transparent fill, the neutral wash at hover, the field border stepping
    // at hover, the focus border at both active states, the danger border in error, the shared disabled skin.
    'fill': 'color.field.fill',
    'overlay.hover': 'color.interactive.neutral.overlay.hover',
    'border': 'color.field.border.rest',
    'border.hover': 'color.field.border.hover',
    'border.focus-visible': 'color.border.focus',
    'border.focus-visible-filled': 'color.border.focus',
    'border.error': 'color.border.danger',
    'label': 'color.text.primary',
    'caret': 'color.text.primary',
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay', 'fill', 'border'],
        children: ['content', 'focusRing'],
        layout: { direction: 'column', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        // Each size's cell, built at its literal width and height (owner decision Q330 A); `content` takes the height.
        builtSize: { axis: 'size', widths: CELL_WIDTH, heights: CELL_HEIGHT, grow: 'content' },
        // THE FILL-WIDTH FLOOR (owner decision Q330 A): a cell set to fill shrinks to share the row, never below 32.
        minWidth: 32,
        radius: 'size.{size}.radius',
        strokeWidth: 'border-width',
        note: 'The cell: one box per character, as wide and tall as its size sets. Set to fill, it shares the row with the other cells and stops at 32px wide.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        children: ['caret', 'digit'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'pad', inlineLabel: 'pad' },
        crossAxisFill: true,
        note: 'Centers the character, or the caret on the active empty cell.',
      },
      caret: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['caret'],
        width: 'caret-width',
        height: 'size.{size}.caret-height',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { state: ['focus-visible'] },
        note: 'The insertion point on the active empty cell, in the character ink, as tall as the character.',
      },
      digit: {
        kind: 'text',
        type: 'size.{size}.type',
        // OPTICALLY CENTERED (owner QA on #2428, 2026-10-16; option A on #2789): the text box is trimmed to the cap
        // height and the baseline, so the centered box is the figure itself. A centered LINE box left the figure off
        // center by the font's own metrics, high in a display font whose descender is deeper than the room above its
        // figures, and no line height changes that (the leading splits evenly). Figma keeps the trim in the text
        // style, so the trim detaches the character's style; its variable binds stay (see `verticalTrim`).
        verticalTrim: 'cap-height',
        presentWhen: { state: ['filled', 'focus-visible-filled', 'error'] },
        note: 'The character, centered on its figure: its box is trimmed to the cap height and the baseline. Tabular figures in code, so every digit is one width.',
      },
      focusRing: {
        kind: 'absolute',
        when: ['focus-visible', 'focus-visible-filled'],
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring on the active cell, where the next character goes.',
      },
    },
    codeOnly: [
      'the cell in code — an aria-hidden element the code input draws; it is never focusable and has no role. The one input under the cells takes focus, the name and the value.',
      'the active cell — the cell at the input\'s caret, or the last cell once the code is complete, carries the ring while the input has focus from any pointer or the keyboard (an input matches :focus-visible on a mouse focus too). It is the code input\'s caret position, never a DOM focus move.',
      'the caret — Figma draws a static bar; code draws a blinking bar on the active empty cell, or hides the native caret and draws none, and stops blinking under prefers-reduced-motion.',
      'tabular figures — the character sets `font-variant-numeric: tabular-nums`, so every digit is one width and the code does not shimmer as it fills.',
      'the character\'s optical centering — its box is trimmed to the cap height and the baseline (`text-box: trim-both cap alphabetic`, Figma\'s vertical trim), so the cell centers the figure itself, whatever the brand font\'s ascender and descender. Where `text-box` is unsupported, the box falls back to the line box, centered.',
      'the character\'s text style in Figma — vertical trim lives inside a Figma text style, so the trimmed character carries the style\'s font family, style and size as variable binds and shows no style name. Code reads the same type role.',
      'fill width — Figma keeps each cell at its size until a designer sets it to fill; code\'s `width="full"` makes every cell `flex: 1 1 0` with `min-inline-size: 32px`, and the height stays the size\'s.',
      'style — the cell\'s edge is the brand\'s Field style setting, not a prop or a Figma variant: `outline` draws a box around each cell, `underline` one line under each cell. The brand sets it once, every field takes it, and the cell set is built in that style (#2695, #2719).',
      'forced-colors — the borders become system-color borders and the active cell\'s ring a system-color outline, so the active cell still shows.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'filled', 'focus-visible', 'focus-visible-filled', 'disabled', 'error'] },
    gridAxis: 'state',
    // Q344: the cell has no pressed look, so While pressing changes it to the active cell, as a click in code does.
    pressState: 'focus-visible',
    // The digit is edited on the cell (owner decision Q329 A). "7" is the as-built wireframe's cell.
    texts: { digit: { part: 'digit', default: '7' } },
  },

  accessibility: {
    role: 'none: an aria-hidden drawing; the code input\'s one input carries the role, the name and the value',
    wcag: [
      '1.4.11 Non-text Contrast (targets 3:1 for the cell border against the page)',
      '2.4.7 Focus Visible (the ring on the active cell)',
      '2.4.13 Focus Appearance (the shared focus ring, as intent)',
    ],
    keyboard: 'None of its own: the code input\'s input takes every key.',
    focus: 'Never focused itself. While the code input\'s input has focus, the active cell shows the focus ring.',
    aria: 'aria-hidden="true". A screen reader meets the code input\'s one input and its whole value, never a cell.',
  },

  docs: {
    usage: 'Use inside CodeInput only, one cell per character of the code. In a design, add or remove cells in the code input\'s cell slot and set each cell\'s state to match the field: error cells when the field is in error, disabled cells when it is disabled. In code, the code input sets every cell.',
    do: ['Set every cell to error when the code input is in error', 'Set every cell to disabled when the code input is disabled'],
    dont: ['Place a cell outside a code input', 'Build a code input from separate inputs, one per cell'],
    contentGuidelines: 'One character per cell.',
  },

  ai: {
    primaryPurpose: 'Show one character of a one-time code inside a code input.',
    whenToUse: 'Only as a child of CodeInput.',
    avoidWhen: 'Anywhere outside a code input: a single character field is a text field, and a code is always one code input.',
    commonPartners: ['code-input'],
    triggerKeywords: ['code cell', 'otp cell', 'verification code box'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['one input per character of a one-time code'],
    supersededBy: [],
  },

  motion: {
    enter: 'None.',
    exit: 'None.',
    reduceMotion: 'The caret does not blink; the ring and borders change at once, with no transition.',
  },

  notes: {
    contested: [
      'The state names: the approved cell states say active and active filled; the closed state vocabulary has no `active`, so the cell spells them focus-visible and focus-visible-filled, Text field\'s names for the same ring and caret. Renaming them is a schema change held for the owner.',
      'The character weight: no guaranteed type role is above 18px, so the medium, large and xlarge characters take the title steps in the brand\'s bold title weight (strong on most brands), and the small one Text field\'s body step in the default weight. A brand\'s own title ladder sets the exact size.',
    ],
    unverified: [
      'An empty cell in error: the approved states draw error with a character only. A field in error with a short code shows its empty cells at rest in Figma; code draws the danger border on every cell.',
      'The character\'s vertical trim on a real host: that a layer trimmed after its style is applied keeps the style\'s variable binds (measured for the #1567 detach, not for this layer), and that the trimmed box centers the figure in the brand\'s own display font, are modeled offline only until the owner\'s QA build.',
    ],
    evolution: [
      '2026-10-15 (#2428): owner decision Q329 A, the cell as a part in the code input\'s native items slot, its character edited on the cell; Q330 A, the four sizes.',
      '2026-10-17 (#2789): the character is trimmed to its cap height and baseline, so the cell centers the figure (owner QA 2026-10-16: the digit sat too high at medium and large; option A of the owner question on #2789).',
    ],
  },
};

// THE DEFAULT CELLS (owner decision Q329 A): six, each following the field's size, its character set by override and
// its state set from the field's state, so each member opens on a picture of that state. A designer then sets each
// placed cell themselves; the field's status and state never reach a placed instance's cells (the accepted trade-off).
const CODE = ['4', '8', '1', '9', '0', '2'];
const cell = (n: number) => {
  // focus-visible: the first cell active. focus-visible-filled: three characters in, the fourth cell active.
  const partial = n < 3 ? 'filled' : n === 3 ? 'focus-visible' : 'rest';
  return {
    kind: 'nest' as const,
    nests: 'code-input-cell',
    nesting: {
      kind: 'nest-fixed' as const,
      variant: { size: 'medium', state: 'rest' },
      follow: ['size'],
      variantWhen: {
        state: {
          hover: { state: 'hover' },
          filled: { state: 'filled' },
          'focus-visible': { state: n === 0 ? 'focus-visible' : 'rest' },
          'focus-visible-filled': { state: partial },
          disabled: { state: 'disabled' },
        },
      },
    },
    overrides: { texts: { digit: CODE[n] } },
    note: `Cell ${n + 1} of the default six.`,
  };
};

export const codeInput: ComponentDef = {
  id: 'code-input',
  name: 'CodeInput',
  aliases: ['otp-input', 'one-time-code', 'verification-code', 'pin-input'],
  category: 'form',
  status: 'draft',
  summary: 'Field for a one-time code: one input, shown as a row of cells, one per character.',
  description:
    'A field for a short one-time code sent by text message, email or an authenticator app: four to eight characters. It shows the code as a row of cells, so the user sees how long the code is and how far they have got. Underneath is one input holding one string, so pasting the code or filling it from the message fills every cell. A label names it and a message under it says how many characters to enter and where the code was sent. Not for a code of unknown length or one inside a longer form (TextField with one-time-code autocomplete), and not for a password or a PIN the user keeps (PasswordField).',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The visible label (rendered as FieldLabel), such as "Verification code". Required.' },
    { name: 'length', type: 'number', default: 6, required: false, description: 'How many characters the code has, 4 to 8. Draws that many cells and caps the value at that length.' },
    { name: 'value', type: 'string', required: false, description: 'Controlled value; pair with onChange.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'Uncontrolled initial value.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called with the value after spaces and hyphens are removed.' },
    { name: 'onComplete', type: 'function', required: false, description: 'Called once with the value when it reaches `length`, and again only if the value changes and reaches it again. The page decides whether to submit.' },
    { name: 'inputMode', type: "enum: 'numeric' | 'text'", values: ['numeric', 'text'], default: 'numeric', required: false, description: 'numeric for a code of digits, text for a code with letters.' },
    { name: 'autoComplete', type: 'string', default: 'one-time-code', required: false, description: 'one-time-code by default, so the phone offers the code from the message. Never off.' },
    { name: 'helpText', type: 'string | node', required: false, description: 'Persistent guidance (rendered as FieldMessage): how many characters and where the code was sent.' },
    { name: 'validation', type: "enum: 'default' | 'error'", values: ['default', 'error'], default: 'default', required: false, description: 'error swaps every cell to the danger border, sets the message to the error status and sets aria-invalid.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The error text: too few characters, a wrong code or an expired code, each said plainly.' },
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'Whether the composed FieldMessage is shown. On by default.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large' | 'xlarge'", values: ['small', 'medium', 'large', 'xlarge'], default: 'medium', required: false, description: 'The cell size: small 44×44 with a 16px character, medium 48×56 with 20px, large 56×64 with 24px, xlarge 68×72 with 40px, meant for four-character codes.' },
    { name: 'width', type: "enum: 'auto' | 'full'", values: ['auto', 'full'], default: 'auto', required: false, description: 'auto: each cell at its size. full: the row spans its container and the cells share it, shrinking to 32px wide when they must.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled.' },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'The code is being checked; sets aria-busy and keeps the input editable.' },
    { name: 'name', type: 'string', required: false, description: 'A real <input name>, so the field works in a native <form>.' },
    { name: 'id', type: 'string', required: false, description: 'Wiring; generated if omitted.' },
  ],

  states: ['rest', 'hover', 'pending', 'filled', 'focus-visible', 'focus-visible-filled', 'disabled'],
  // Medium FIRST (owner decisions Q347 and Q359), as every field's.
  variants: {
    size: ['medium', 'small', 'large', 'xlarge'],
    status: ['default', 'error'],
  },
  axisKinds: { size: 'authoring', status: 'runtime' },

  paintKeys: ['{slot}'],

  tokens: {
    'root-gap': 'space.100',
    'cell-gap': 'space.100',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'items', 'message'],
        note: 'The field: label, the row of cells and the message, as wide as the cells.',
      },
      label: {
        kind: 'nest',
        nests: 'field-label',
        // One label size at every cell size: FieldLabel has no xlarge, and the label names the field, it does not
        // scale with the cells. Dims with the field (`variantWhen`).
        nesting: { kind: 'nest-exposed', variant: { size: 'medium', emphasis: 'secondary', weight: 'regular', state: 'rest' }, expose: ['emphasis', 'weight'], variantWhen: { state: { disabled: { state: 'disabled' } } } },
        crossAxisFill: true,
        note: 'The accessible name, composed. Its label text, required marker, emphasis and weight surface on the code input; it dims when the field is disabled.',
      },
      // THE ITEMS SLOT (owner decision Q329 A, #2649's pattern): a native slot of cells, six by default, four to eight.
      items: {
        kind: 'box',
        role: 'target',
        contentSlot: true,
        slotSettings: { minChildren: 4, maxChildren: 8, allowPreferredValuesOnly: true },
        preferred: ['code-input-cell'],
        children: ['cell1', 'cell2', 'cell3', 'cell4', 'cell5', 'cell6'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'cell-gap',
        note: 'The cells: a native slot of Cell instances, six by default, four at least and eight at most. The code is as long as the slot holds cells. In code the whole row is one target that focuses the one input.',
      },
      cell1: cell(0),
      cell2: cell(1),
      cell3: cell(2),
      cell4: cell(3),
      cell5: cell(4),
      cell6: cell(5),
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' }, follow: ['status'] },
        optional: true,
        crossAxisFill: true,
        note: 'Helper or error text, composed. Its status follows the field\'s. Shown by default.',
      },
    },
    codeOnly: [
      'code delivery pending: behavior layer (#2454). The entries below are a framework-neutral behavior contract.',
      'ONE INPUT — `<input type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" spellcheck="false">` lies over the cells, which are aria-hidden. Assistive technology meets one textbox with one name and one value. A code with letters sets inputMode text, autocapitalize characters, and drops the pattern. Never one input per cell: paste and the phone\'s code suggestion then fill one cell (W3C Understanding SC 3.3.8).',
      'NORMALIZE, THEN FILL — spaces, hyphens and dashes are removed before counting, and characters past `length` are dropped without an error. The input carries no native `maxlength`: a browser cuts pasted text to it before any handler runs, so `123-456` would arrive as `123-45` and a valid code would read as incomplete. The handler strips first, then caps at `length`. A pasted or suggested code fills every cell. Paste is never blocked.',
      'onComplete — fires once when the value reaches `length`, again only after the value changes and reaches it again. No auto-submit: the page decides, so a typo never locks a user out (SC 3.2.2).',
      'the drawn caret and the active cell — DOM focus never moves. Typing advances the active cell; Backspace removes the last character and moves the ring back; arrow keys, Home and End move the native caret and the ring follows. A click on any cell focuses the input with the caret at the end.',
      'AFTER AN ERROR — the value stays, with the caret at the end and the text selected: the next keystroke replaces the code and Backspace edits it. The field never clears itself.',
      'pending — not projected: a real state in code (the code is being checked: aria-busy and a polite "Checking code" status, the input still editable) whose look is the rest look, so it has no Figma variant.',
      'the field\'s status and state in Figma — a placed field\'s cells are the designer\'s (owner decision Q329 A): switching the field to error or disabled changes its label and message, not its cells, and the designer sets each cell. Each member\'s default cells show that member\'s state, as a fresh insert\'s starting point. In code the input drives every cell.',
      'fill width — `width="full"` makes the row `inline-size: 100%` and every cell `flex: 1 1 0` with `min-inline-size: 32px`, the gap held. In Figma a designer sets the field and each cell to fill.',
      'RTL — the cell row is `dir="ltr"` in every locale, because a code reads left to right; the label and the message follow the text direction.',
      'the SMALL size on a COARSE POINTER — the small cell\'s character is 16px, so iOS does not zoom on focus; the input under the cells is set to 16px at every size.',
      'the password-manager badge — the row keeps clear space after the last cell, so a manager\'s icon does not cover it.',
      'the label / describedby WIRING — the host ties the FieldLabel to the input, stitches the helper and the error into aria-describedby and sets aria-invalid on error. The error is not a live region while the field has focus; a result from the server goes to a polite role="status".',
    ],
  },

  figmaProperties: {
    variantAxes: ['size', 'status'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'filled', 'focus-visible', 'focus-visible-filled', 'disabled'] },
    gridAxis: 'state',
    booleans: {
      showMessage: { part: 'message', figmaName: 'message', default: true },
    },
  },

  accessibility: {
    role: 'textbox (one native <input>); the cells are aria-hidden',
    wcag: [
      '1.3.1 Info and Relationships (one labeled input, the helper and error in aria-describedby)',
      '1.3.5 Identify Input Purpose (autocomplete one-time-code)',
      '3.3.1 Error Identification / 3.3.3 Error Suggestion (the error says which case it is)',
      '3.3.8 Accessible Authentication (paste and the phone\'s code suggestion fill the whole code)',
      '3.2.2 On Input (no auto-submit)',
      '4.1.2 Name, Role, Value (one textbox, one name, one value)',
      '1.4.11 Non-text Contrast (targets 3:1 for the cell border)',
      '2.4.13 Focus Appearance (the ring on the active cell, as intent)',
      '2.5.8 Target Size (the row of cells is one target)',
    ],
    keyboard: 'One Tab stop. Typing fills the next cell; Backspace removes the last character; arrow keys, Home and End move the caret, and the active cell follows it. Paste fills every cell.',
    focus: 'Focus stays on the one input. The active cell, where the next character goes, shows the focus ring.',
    aria: 'aria-describedby names the helper and any error, aria-invalid is set in error, and aria-busy while the code is checked. No aria-label on the input: it would hide the real value. Every name is translatable; the cell row stays left to right in every locale.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case: "Verification code". Never "OTP".',
    errorPattern: 'Say which case it is: "Enter all 6 digits", "That code is wrong. Check the latest message and try again", "That code has expired. We sent a new one".',
    emptyPattern: 'The helper text says how many characters and where the code was sent: "Enter the 6-digit code sent to your phone."',
  },

  docs: {
    usage: 'Use for a short, fixed-length code sent by text message, email or an authenticator app. Say in the helper text how many characters the code has and where it was sent. For a code of variable length, use TextField with one-time-code autocomplete.',
    do: [
      'Accept a pasted or autofilled code in full, ignoring spaces and hyphens',
      'Say which error it is: too few digits, wrong code or expired code',
      'Keep the resend link and any expiry time next to the field',
    ],
    dont: [
      'Build one input per cell: paste and autofill then fill one cell',
      'Block paste or turn off autocomplete',
      'Submit on the last digit without announcing the result',
    ],
    contentGuidelines: 'Label = noun phrase, sentence case. Helper = the length and where the code went. Error = which case it is and what to do.',
  },

  ai: {
    primaryPurpose: 'Capture a short one-time code in one input, drawn as a row of cells.',
    whenToUse: 'A step whose job is a fixed-length code of four to eight characters sent by text message, email or an authenticator app.',
    avoidWhen: 'The code length is unknown or the code sits inside a longer form (TextField with one-time-code autocomplete), the value is a password or a kept PIN (PasswordField), or it is a quantity (a number input, not built yet).',
    commonPartners: ['code-input-cell', 'field-label', 'field-message', 'button', 'link'],
    triggerKeywords: ['code input', 'otp input', 'one-time code', 'verification code', 'pin input', '2fa code'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'code-input-cell', 'field-message'],
    alternativeTo: ['text-field', 'password-field'],
    replacesPatterns: ['one input per character of a one-time code', 'a code field with paste blocked', 'auto-submit on the last digit'],
    supersededBy: [],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The active cell moves at once and the caret does not blink.',
  },

  notes: {
    contested: [
      'The label size: one FieldLabel size at every cell size, because FieldLabel has no xlarge. Text field\'s label follows its size one step down.',
      'The default cells per member: each member\'s six cells show its state (filled, active, disabled). Status has no mechanism to reach a nested coordinate, so an error member\'s default cells are not in error.',
    ],
    unverified: [
      'The nested cells\' characters are set by an override inside a native slot, as List\'s item numbers are. Writing them through the plugin is unmeasured on a real host until the first Build.',
    ],
    evolution: [
      '2026-10-15 (#2428): owner decisions Q321 A (all but cell count), Q329 A (a native items slot of cells, 6 by default, 4 to 8; the cells do not follow the field\'s status or state in Figma), Q330 A (four sizes and fill width). As-built wireframe approved 2026-10-16.',
    ],
  },
};
