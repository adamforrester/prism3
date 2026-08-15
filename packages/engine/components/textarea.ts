/**
 * Textarea — the calibration def for the INHERITED SUBSTRATE (KB `components/textarea.md`,
 * `docs/40` §3). A control for free-form text expected to wrap across multiple lines.
 *
 * The brief's own framing: ~80% of this component IS `text-field`, and the interesting 20% is the
 * SIZING MODEL. So this is the first def whose job is mostly to record a delta rather than a
 * component, and the first engine instance of the `inherits:` convention the KB's `_schema.md`
 * locks for the form family.
 *
 * ── WHAT `inherits` DOES HERE, MEASURED RATHER THAN ASSUMED ─────────────────────────────────────
 *
 * **Nothing resolves it.** Grepping the engine, the only consumer of `def.inherits` is a `test.ts`
 * assertion that `iconButton.inherits === 'button'` — it RECORDS a claim, it does not merge a
 * parent. So the delta rule applies to `props`, which a human reads, and NOT to the four fields the
 * machinery reads: `states`, `variants`, `tokens` and `paintKeys` are stated locally here, in full,
 * exactly as `icon-button` states them despite inheriting `button`. Its header gives the reason and
 * it holds unchanged: *"a cheaper error than a lookup that walks `inherits` and resolves to a
 * grammar nobody reading this file can see."* A def that omitted them would not inherit them — it
 * would project unpainted.
 *
 * That distinction is the pattern this def sets, so state it once: **`inherits` is prose about
 * provenance; every field with a consumer is authored here.**
 *
 * ── THE 20%: THE SIZING MODEL, WHICH IS A SUBTRACTION FROM THE SUBSTRATE ────────────────────────
 *
 * `text-field` binds `size.{small,medium,large}.height`. **This def deliberately binds none.** Brief
 * §4: *"`size` scales typography and padding only — height is owned by `rows` / auto-grow, so the
 * single-line height tiers don't transfer."* A multi-line field is fluid in the block direction; a
 * height rung would fight `rows` and win silently. The delta the `inherits` convention exists to
 * express is, here, mostly an ABSENCE — which is worth knowing before authoring the other four,
 * because a delta you can only see by diffing against the parent is one a reader will miss.
 *
 * `rows` / `minRows` / `maxRows` are therefore the height model, and they are in LINES rather than
 * pixels for a stated reason (brief §3): a pixel floor does not survive the user raising their
 * browser font size, while a line count recomputes against the current line-height and stays locked
 * to the type scale. Nothing in the token layer expresses that — see `notes.unverified`.
 *
 * ── THE RUNG OFFSET, WHERE I MET IT (#756, `docs/28` §5.2, `docs/40` §7 step 2) ──────────────────
 *
 * `size.small.pad-x → size.sm.padding-x` and its two siblings: the def's enum is the component
 * vocabulary (`small/medium/large`), the ref is the engine's tier (`sm/md/lg`), and the engine's
 * names win. This is **not a new offset** — it is `text-field`'s exactly, inherited along with the
 * substrate it belongs to, and it agrees on every value. Recorded because the rule is that the
 * author records it where they meet it, and "the parent already did" is how the next def stops
 * doing so. Default `medium` → `md`, per the rule rather than this def's judgment.
 *
 * ── WHY `size` IS IN `props` AT ALL, WHEN THE BRIEF INHERITS IT ─────────────────────────────────
 *
 * Because `lint-rung-names.ts` reads a def's size ladder from `props.size.values` AND from
 * `variants.size` and fails when the two disagree — and an omitted prop reads as `[]`. A def that
 * binds `size.*` keys must state the enum in both places or the gate reports one ladder stated
 * twice, disagreeing. So `size` is re-declared here, and that is the gate working rather than the
 * delta rule bending: the ladder is a thing the machinery reads, which by the rule above is
 * authored locally. Its description carries the Textarea-specific narrowing (type and padding, not
 * height) instead of restating the parent's.
 */
import { ComponentDef } from '../component-schema';

export const textarea: ComponentDef = {
  id: 'textarea',
  name: 'Textarea',
  aliases: ['text-area', 'multiline-input', 'multiline-text-field', 'textbox', 'comment-box'],
  category: 'form',
  status: 'draft',
  inherits: 'text-field',
  description:
    'A control for free-form text expected to wrap across multiple lines — comments, descriptions, messages, feedback. Shares the form-field substrate with TextField (label, helper/error, the aria-describedby wiring); differs in the sizing model, the prominence of the character counter, and who owns the Enter key. Not single-line (TextField), not formatted or structured (a rich-text editor), not code (a code editor), not a value from a known set (Select/Combobox).',

  // THE DELTA ONLY (brief §3, §15). Everything the substrate contract already carries — label,
  // value/defaultValue, onChange/onBlur/onFocus, placeholder, helpText, error, disabled, readOnly,
  // required, autoComplete, id, name, and the bundled-props/composed-slots hybrid with its internal
  // aria wiring — is `text-field`'s and is not restated. `size` is the one exception and the header
  // says why.
  props: [
    { name: 'rows', type: 'number', default: 3, required: false, description: 'Initial and minimum height, in LINES not pixels — a line count recomputes against the current line-height when the user raises their font size, where a pixel floor does not. Also a content cue: two rows signals brevity, six signals "write more". `cols` is dead on the web; width comes from CSS.' },
    { name: 'resize', type: "enum: 'none' | 'vertical' | 'auto'", values: ['none', 'vertical', 'auto'], default: 'vertical', required: false, description: 'The sizing model in ONE prop, so two props cannot contradict each other. `vertical` (the drag handle) for standalone form fields; `auto` (grow within minRows/maxRows) for composers; `none` where layout stability wins. NEVER horizontal or both — altering the inline dimension shatters grid and flex layouts for no user gain, and both research passes reached that independently.' },
    { name: 'minRows', type: 'number', required: false, description: 'Auto-grow floor, in lines. Only meaningful with resize="auto".' },
    { name: 'maxRows', type: 'number', required: false, description: 'Auto-grow cap, in lines; beyond it the field scrolls. ALWAYS set this when auto-growing — an uncapped field pushes the submit button off-screen on a long paste, which is a shipped failure in the field, not a hypothetical.' },
    { name: 'maxLength', type: 'number', required: false, description: 'Character limit, counted by GRAPHEME (Intl.Segmenter) rather than UTF-16 code unit — a flag emoji costs 4 units and a ZWJ family up to 11, so a .length limit hits non-Latin and emoji users artificially early. Enforce SOFT: allow the overflow, set aria-invalid, show the counter in error, block submit. Never the native hard maxlength, which silently truncates pasted overflow with no signal to anyone, AT users included.' },
    { name: 'showCount', type: 'boolean', default: false, required: false, description: 'The character counter — first-class here, unlike on TextField. Only ever with a real limit: a counter on an unlimited field implies a cap that does not exist.' },
    { name: 'spellCheck', type: 'boolean', required: false, description: 'Native passthrough; worth surfacing because structured input often wants it off.' },
    { name: 'submitOnEnter', type: 'boolean', default: false, required: false, description: 'Composer opt-in: Enter submits, Shift+Enter inserts a newline. NOT the base default — Enter inserting a newline is the platform contract a multi-line field advertises via aria-multiline, and hijacking it silently can lose a screen-reader user a drafted message. Whenever true, pair it with a real visible submit button and a visible "Shift+Enter for a new line" hint (SC 3.3.2).' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales type and padding ONLY — height belongs to rows / auto-grow, so the substrate\'s height tiers do not transfer. Re-declared rather than inherited because the ladder is read by the machinery (see the file header).' },
  ],

  // Identical to `text-field`'s set, and stated rather than inherited for the reason in the header.
  // No `pressed` — brief §4 is explicit that a multi-line field is not pressed the way a mobile
  // single-line field is, and `pressed` is in the closed vocabulary, so its ABSENCE here is a
  // decision rather than an omission.
  //
  // `loading` is the AI-streaming case (brief §4: content streamed into the field to rewrite or
  // summarise, carrying aria-busy). Note for #843, which asks whether `pending` and `loading` are
  // one concept spelled twice: this def makes it 2 defs saying `loading` against 2 saying `pending`,
  // which strengthens the case for adjudicating rather than settling it.
  states: ['rest', 'hover', 'focus-visible', 'disabled', 'read-only', 'loading', 'error', 'empty'],

  // `size` and `style` only — the two the substrate declares. The brief's §15 also lists `resize`
  // and `modifiers` as variant axes; neither is declared here and `notes.contested` carries both
  // arguments with their named alternatives.
  variants: {
    size: ['small', 'medium', 'large'],
    style: ['outline'], // filled / underline are theming, not an API axis (brief §4)
  },

  // The substrate's grammar, stated rather than inherited: this def's paint varies by state and by
  // nothing else (`size` is geometry, `style` has one value), so the qualified template leads and the
  // bare slot is the rest value.
  paintKeys: ['{slot}.{state}', '{slot}'],

  // INPUT CHROME ONLY, same composition call as the substrate — label and message colour/type live in
  // `field-label` / `field-message` and are composed, not re-declared here.
  //
  // TWO THINGS THIS BLOCK DOES NOT CARRY, both deliberate and both invisible unless stated:
  //
  //  1. NO `size.*.height`. The header's subtraction. Height is `rows` / auto-grow.
  //  2. NO container/input split for the error stroke. Brief §4 wants the error boundary on the
  //     CONTAINER rather than the input, so a Windows scrollbar docks inside the error ring rather
  //     than breaking it — that is a real requirement and it is an ANATOMY concern, not a token one:
  //     the same `color.border.danger` paints either node, and nothing here can say which. It lands
  //     when the anatomy block does; recorded in `notes.unverified` so it is not lost in between.
  tokens: {
    'fill': 'color.field.fill',
    'label': 'color.text.primary',
    'label.empty': 'color.field.placeholder',
    'border.rest': 'color.field.border.rest',
    'border.hover': 'color.field.border.hover',
    'border.focus-visible': 'color.border.focus',
    'border.error': 'color.border.danger',
    'border.read-only': 'color.border.secondary',
    // Focus ring — the field offset, as on the substrate. Brief §4 argues a textarea is a LARGE
    // surface and a saturated ring around a 600×400 box is noise, favouring an inset indicator. The
    // engine emits one field-ring offset and no large-surface variant, so this binds what exists and
    // the argument is recorded rather than acted on (`notes.contested`) — inventing a token here
    // would be a def authoring engine surface.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    // Disabled skin (contrast-exempt), the shared cross-cutting family. On-fill because a field
    // always has a fill, so its disabled ink always sits on `disabled.fill`.
    'disabled.fill': 'color.disabled.fill',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.border': 'color.disabled.border',
    // Geometry. Padding only — see the header.
    'radius': 'radius.sm',
    'size.small.pad-x': 'size.sm.padding-x',
    'size.small.pad-y': 'size.sm.padding-y',
    'size.medium.pad-x': 'size.md.padding-x',
    'size.medium.pad-y': 'size.md.padding-y',
    'size.large.pad-x': 'size.lg.padding-x',
    'size.large.pad-y': 'size.lg.padding-y',
  },

  accessibility: {
    role: 'textbox (native <textarea>), with the implicit aria-multiline="true"',
    wcag: [
      '4.1.3 Status Messages (the counter and over-limit live region — the most Textarea-specific SC)',
      '1.4.4 Resize Text / 1.4.10 Reflow (the field, counter and resize handle must survive 200% zoom and 320px without colliding or clipping)',
      '3.3.2 Labels or Instructions (the "Shift+Enter for a new line" hint whenever Enter submits)',
      '1.3.5 Identify Input Purpose / 1.3.1 Info and Relationships (inherited substrate wiring)',
      '3.3.1 Error Identification / 3.3.3 Error Suggestion (over-limit states the overage and how to fix it)',
      '1.4.3 Contrast / 1.4.11 Non-text Contrast / 2.4.13 Focus Appearance / 4.1.2 Name Role Value',
      '2.5.8 Target Size (the resize handle is a target)',
    ],
    keyboard: 'Native multi-line editing with undo/redo, spellcheck and IME. Enter inserts a newline — that is the contract aria-multiline advertises and the default. submitOnEnter inverts it for composers, and then Shift+Enter inserts the newline, a real submit button still exists, and the swap is stated visibly near the field.',
    focus: ':focus-visible with the field ring. A textarea is a large focus surface, so the indicator is inset on the container rather than a thick outer ring. forwardRef must reach the <textarea> itself, not the wrapper. Auto-resize must not move the caret or scroll the viewport — the measurement is synchronous with input, and it must also run on PROGRAMMATIC value changes (a reset, or AI-inserted text), which is the common auto-grow bug.',
    aria: 'The counter is the central problem and it is two nodes, not one: the visual counter is aria-hidden and updates instantly, while a separate visually-hidden node carries announcements. Two channels — the static limit folded into aria-describedby so tabbing in announces the ceiling, and a threshold-based polite live region that speaks only near the limit (per-keystroke counting makes the field unusable), escalating to assertive only on breach. Over-limit sets aria-invalid and is ANNOUNCED, never colour-only. aria-busy while content streams. Preserve the native aria-multiline; do not reconstruct a textarea from contenteditable, which loses undo/redo, spellcheck, reliable IME and form submission. Set dir="auto" so content direction can differ from UI direction, and do not run counting or auto-grow measurement mid-IME-composition.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, no trailing colon — the substrate discipline (see field-label).',
    errorPattern: 'What is wrong AND how to fix it, with the number: "Description must be under 500 characters. Remove 24 to continue." (SC 3.3.3). May replace the helper text to conserve vertical space, provided it still carries the original constraint.',
    emptyPattern: 'Label plus an optional placeholder. The placeholder may model the expected SHAPE ("Describe the issue, including steps to reproduce") but still vanishes on the first keystroke — and the recall cost is higher here than on a single-line field, because a user may write several paragraphs, tab away, and come back to a prompt that is long gone. Nothing load-bearing lives in it.',
  },

  docs: {
    usage: 'Use for free-form text expected to exceed one line — comments, descriptions, messages, feedback, multi-line addresses. Pick the sizing model by context: fixed-height-plus-scroll for a field inside a long form (so the form does not reflow as the user types), auto-grow for a composer (so the message box follows the message). Right-size the initial rows to the expected input. Compose FieldLabel above and FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain.',
    do: [
      'Set maxRows whenever auto-growing — uncapped growth pushes the submit affordance off-screen on a long paste',
      'Enforce a character limit softly (allow over, flag invalid, block submit) and count by grapheme, not by string length',
      'Announce the over-limit through the live region and aria-invalid — colour alone is not a signal',
      'Normalise \\r\\n to \\n on paste before counting or storing, and resize once per paste rather than once per inserted line',
    ],
    dont: [
      'Offer horizontal or both resize — it shatters grid and flex layouts and breaks responsive viewports',
      'Use the native maxlength attribute for substantial text — it silently swallows pasted overflow with no feedback',
      'Bake submit-on-Enter into the base component — it is a composer opt-in that always keeps a real submit button and a visible hint',
      'Reach for contenteditable to add formatting — cross the boundary to a real rich-text editor instead',
      'Drop in a one-row Textarea as a "bigger input" — the semantics and the Enter behaviour differ from TextField',
    ],
    contentGuidelines: 'Counter reads "240 / 280" or "40 characters remaining"; over-limit reads "12 characters over the limit" — constructive and numeric, never "Too long." If Enter submits, say so near the field.',
  },

  ai: {
    primaryPurpose: 'Capture multi-line free-form text with an associated label, an optional soft character limit, and a stated sizing model.',
    whenToUse: 'Comments, descriptions, messages, feedback, notes, commit-message bodies, a multi-line address — any input that predictably runs past the ~40–60 characters a single-line field shows comfortably, or that legitimately needs user-authored line breaks.',
    avoidWhen: 'The value is a single line (TextField — and do not substitute a one-row Textarea, the Enter semantics differ), needs formatting or structure such as bold, links, @-mentions or embedded media (a rich-text editor — a <textarea> holds a plain string and nothing else), is source code (a real code editor, for syntax highlighting and bracket matching), or comes from a known set (Select/Combobox). Also avoid reaching for it as a general "big box of text" when the content is genuinely structured — that is the rich-text signal.',
    commonPartners: ['field-label', 'field-message', 'button', 'icon', 'spinner', 'form'],
    triggerKeywords: ['textarea', 'text area', 'multiline', 'multi-line input', 'comment box', 'message box', 'description field', 'composer'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'button', 'icon', 'spinner', 'form'],
    // ALTERNATIVE TO text-field, not a superseder — they are siblings a designer picks between by
    // input shape. The brief flags that its external research pass typed this as
    // `supersedes: text-field` and corrects it against the prose; carried here so the corrected
    // reading is the one that reaches the engine.
    alternativeTo: ['text-field', 'rich-text-editor', 'combobox', 'select', 'code-editor'],
    supersedes: ['a one-row textarea used as a tall input', 'a contenteditable div used for plain multi-line text'],
    supersededBy: ['a rich-text editor when the content genuinely needs formatting'],
  },

  notes: {
    contested: [
      'resize as a VARIANT AXIS vs a prop — brief §15 lists `resize: [none, vertical, auto]` under `variants`, and §4 calls it "more like an author-chosen variant than a runtime state". Declared here as a prop ONLY. Two reasons: `VARIANT_AXES` is closed (#847) and does not contain `resize`, and adding it would duplicate a member already carried by the prop — the exact criticism `modifiers` carries in the vocabulary\'s own header (#845). The named alternative is to admit `resize` to `VARIANT_AXES` with a stated reason, which is the right move IF the drag handle turns out to need a projected Figma member; that is an anatomy question this def cannot answer yet.',
      'modifiers: [auto-grow, show-count] — brief §15 lists these as an axis. Not declared. `modifiers` is admitted in `VARIANT_AXES` only because it shipped, and its own documentation calls it "a bag of unrelated booleans wearing an axis\'s clothing" (#845). auto-grow is already a value of `resize` and show-count is already a boolean prop, so an axis here would state both twice. Alternative: declare it and accept the duplication for projection convenience.',
      'The focus indicator on a large surface — brief §4 argues a saturated ring around a 600×400 textarea is visual noise and favours an inset indicator or a background/border tint (Atlassian). This def binds the same `focus.ring.offset-field` the substrate does, because that is the only field ring the engine emits. The alternative is a large-surface ring token, which is engine surface a def should not author unilaterally.',
      'Enter-key ownership — submit-on-Enter is an opt-in here, never the base default. The alternative (composers invert it by default) is what chat surfaces actually ship, and the brief rejects it for the base component because silently hijacking Enter breaks the platform expectation for every non-chat use.',
      'Soft vs hard maxLength — soft, always. The alternative is the native maxlength attribute, which is one line of code and silently truncates pasted overflow; the brief rejects it on AT grounds specifically, since input simply stops being accepted with no announcement.',
      'Distinct component vs a multiline prop on TextField — Polaris and Material 3 model this as `multiline={4}` on a universal field. The practice ships a distinct component (brief §1), and the reason is machinery rather than symmetry: auto-grow measurement, resize chrome, scroll management, line-break normalisation and grapheme counting are non-overlapping with a single-line field and would tax every plain input in the app.',
      'loading vs pending as one concept spelled twice (#843) — this def declares `loading`, matching the substrate. It now stands at 2 defs `loading` / 2 defs `pending`, which is a fact for #843 rather than a decision taken here.',
    ],
    unverified: [
      'CSS `field-sizing: content` as the auto-grow mechanism — the brief calls it the biggest near-term implementation shift and prioritises it behind an @supports query with the ghost-sizer JS polyfill as fallback. It also says explicitly not to treat its own version numbers (Chromium 123+, "Firefox following") as settled. NOT verified in this pass, which was authoring rather than research; verify before any implementation reads it as current.',
      'The Polaris unbounded-growth bug cited in brief §3 and §13 as the evidence for always setting maxRows — attributed to the external research pass, no `_source-text` backing in the vault. The RULE stands on its own reasoning; the citation is what is unverified.',
      'The error stroke belongs on the CONTAINER, not the input, so a Windows scrollbar docks inside the error boundary rather than breaking it (brief §4). Real, and unexpressible today: `color.border.danger` paints either node and this def has no anatomy block to say which. Lands with the anatomy (docs/40 Arc 2 step 5) — recorded here so the requirement is not lost in the gap.',
      'Brief §4 says `size` scales "typography and padding only", and this def binds padding but NO type token — because the substrate binds none either, so there is no type role for a field value to narrow. The padding half is expressed and the typography half is not, in both defs. Whether the field family should bind a type role is a substrate question, not a Textarea one — filed as #862 rather than decided here, because a child def is the wrong place to make the family\'s type call.',
      'rows / minRows / maxRows are in LINES and therefore resolve against the computed line-height, which brief §9 warns must be the RENDERED line box rather than an assumed Latin one (Arabic, Thai and Devanagari grow differently). No token expresses a line-height for this def to bind, so the constraint lives in prose only and nothing checks it.',
    ],
  },
};
