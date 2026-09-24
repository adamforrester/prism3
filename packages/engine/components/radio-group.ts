/**
 * RadioGroup — the SET (#1469, owner-directed during QA 2026-09-17). A `field-label` above a vertical
 * stack of `radio-row`s, for choosing EXACTLY ONE from a small set of mutually exclusive, all-visible
 * options. It is `checkbox-group`'s single-select twin: the same composition (a required section label
 * above a stack of labeled rows), the same auto-layout (audited part-for-part in #1475 / PR #1504,
 * `docs/superpowers/qa-2026-09-18-autolayout-audit.md`), and the same [HELD] forks — differing ONLY where
 * radio's single-select semantics force a difference, which this header enumerates so the differences read
 * as required rather than invented.
 *
 * The group is what `radio-row.ts` calls MANDATORY: *"a lone radio is meaningless — it only means 'one of
 * these', and needs siblings and a shared `name` to mean anything at all."* Where `checkbox-group` owns a
 * contract a single row cannot, this group owns the contract a single radio structurally CANNOT and without
 * which the radios are not radios at all — the shared `name` that enforces exclusivity, the single SCALAR
 * value, the single tab stop with roving tabindex, and all validation, announced once. `radio-row` filed
 * this component as the deferred #901 companion; #1469 is that companion built, now that the row exists.
 *
 * ── WHAT MIRRORS CHECKBOX-GROUP EXACTLY (the mechanical half — #1475's guidance) ───────────────────────
 *
 * The auto-layout audit (#1475) measured `checkbox-group` back off the offline host and found Prism 2's
 * `radio-button-group.json` is BYTE-FOR-BYTE the same auto-layout as `checkbox-group.json` — same VERTICAL
 * root, same `label` container, same `padding {top: 8, bottom: 8, start: 0, end: 0}`, rows `FILL`. Prism 2
 * already treats them as one shape. So this def reproduces `checkbox-group`'s structure part-for-part, and
 * the audit's instruction is explicit: match `checkbox-group` AS IT STANDS TODAY rather than invent a
 * different width/fill model (see the systemic `[HELD]` below). Mirrored verbatim:
 *   · root `container`, VERTICAL, `sizing: { x: 'fill', y: 'hug' }`, `align/justify: start`;
 *   · `gap: 'size.{size}.gap'` — the provisional size-keyed inter-row gap (`[HELD]`, below);
 *   · block padding `pad-y` = `space.100` (Prism 2's 8px), inline padding `pad-x` = `space.0` (its 0px);
 *   · a nested `field-label` configured to Prism 2's group `formLabel` (secondary · bold · required-on),
 *     size-followed; then a stack of size-followed `nest-fixed` rows.
 *
 * ── WHAT RADIO'S SINGLE-SELECT SEMANTICS FORCE (the required half, and it is NOT design) ────────────────
 *
 * These differences are dictated by what a radio IS, not chosen — encoded like the field defs encode their
 * a11y, per the #1469 brief. They are the whole delta from `checkbox-group`:
 *   · THE VALUE IS A SCALAR, not an array. `checkbox-group` owns `value: string[]` (any-number); this owns
 *     `value: string` (exactly-one). Each row's selected appearance is DERIVED — `checked = (value ===
 *     row.value)` — never an array membership test. `defaultValue`/`onChange` are scalar to match.
 *   · THE ROLE IS `radiogroup`, not `group`. The container carries `role="radiogroup"` + aria-labelledby,
 *     and each row is a native `<input type="radio">` sharing the group's `name`.
 *   · THE GROUP IS A SINGLE TAB STOP with ROVING TABINDEX and arrow navigation between options — the
 *     OPPOSITE of `checkbox-group`, where each row is its own tab stop. This is radio's headline keyboard
 *     difference and the most common radio a11y failure when got wrong; it is a code-projection concern
 *     (Figma has no accessibility tree) recorded in `accessibility` and `codeOnly`.
 *   · THERE IS NO SELECT-ALL, and none is even expressible — a select-all is a partial-selection affordance
 *     that only a MULTI-select group has. `checkbox-group` records its deliberate absence; for radio the
 *     concept does not apply at all, so this def does not carry the note.
 *   · THE SHARED `name` IS LOAD-BEARING, not a submission convenience. On `checkbox-group` `name` groups the
 *     submitted field; here the shared `name` is what enforces browser-level exclusivity, and a row setting
 *     its own breaks exclusivity outright (`radio-row.ts` header). The prop carries that stronger meaning.
 *
 * ── THE NEST CHAIN IS FOUR DEEP: `focus-ring` ← `radio-control` ← `radio-row` ← `radio-group` ────────────
 *
 * The group NESTS `radio-row` (`kind: 'nest'`, in flow), which nests `radio-control` `nest-exposed`, which
 * nests `focus-ring` — the identical four-deep shape `checkbox-group` has, one selection-control family over.
 * The group composes via the already-collapsed Row (`radio-row` projects a SIZE-ONLY 3-member set since
 * #1348), so it does NOT inherit the control's 36-member variant explosion. The rows are `nest-fixed`: the
 * group picks the default row configuration; a designer overrides each row instance's exposed
 * `selection`/`state` in place, and a code consumer derives them from the single scalar value. The group
 * does NOT re-enumerate per-row selection into its own matrix — that would be the explosion again, one layer
 * out — and for radio it would additionally be WRONG, since exactly one row is selected at a time, a
 * constraint no independent per-row axis can express. `lint-nesting`'s acyclicity arm holds the chain;
 * `test:roundtrip` is the host-truth check that the three-deep nesting composes on a real host.
 *
 * ── VERSIONING: ENGINE, NOT CONTRACT (#1252, docs/30) ───────────────────────────────────────────────────
 *
 * Adding this def moves the PROJECTED COMPONENT SURFACE (a new component-set NAME, `radio-group`), which is
 * an `ENGINE_VERSION` trigger (this bump + `lint-component-surface`). A component-set name is NOT a
 * guaranteed DTCG token PATH, so it does NOT move the versioned TOKEN contract: `schema/token-contract.json`
 * is the emitted token-name surface, and no component id lives in it. `CONTRACT_VERSION` STANDS at 11.3.0
 * (`token-contract.ts --check` reports level `none`; stamp-only `--accept`), exactly as the #1347
 * `checkbox-group` add and the #1468 row renames did.
 */
import { ComponentDef } from '../component-schema';

export const radioGroup: ComponentDef = {
  id: 'radio-group',
  name: 'RadioGroup',
  aliases: ['radio-set', 'radios', 'radio-list', 'single-select', 'radio-fieldset', 'radio-button-group'],
  category: 'form',
  status: 'draft',
  description:
    'A labeled set for choosing EXACTLY ONE from a small set of mutually exclusive, all-visible options. A required section label (FieldLabel) above a vertical stack of Radio rows. Owns the contract a single radio cannot — and without which the radios are not radios at all: the shared name that enforces exclusivity, the single scalar value, the single tab stop with roving focus, and all validation, announced once for the group. Use for 2 to about 7 options where seeing them all aids the decision; past that, a Select or a filtering Combobox scans better. Not any-number selection (CheckboxGroup), not a single independent opt-in (a lone Checkbox row), not an immediate-effect setting list (a list of Switches), not the same choice collapsed (Select) or in a compact skin (Segmented Control).',

  // THE GROUP'S PUBLIC API — the contract the group owns and a single `radio-row` cannot express. The
  // per-row `checked` is DERIVED from the group's SCALAR `value`, never held on a row inside a group. This
  // is `checkbox-group`'s prop set with the single-select changes the header enumerates: `value`,
  // `defaultValue` and `onChange` are SCALAR (exactly-one), and `name` carries the stronger, load-bearing
  // exclusivity meaning.
  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The group heading, rendered as the nested FieldLabel and the group\'s accessible name (role="radiogroup" + aria-labelledby). Names the decision the set answers ("Shipping method", "How should we contact you?"), letting its rows read the abstracted-up short labels ("Standard", "Express", "Overnight"). MANDATORY for meaning: without it assistive tech announces an orphaned "radio button, 1 of 3" with no indication of what is being chosen.' },
    { name: 'value', type: 'string', required: false, description: 'The controlled SCALAR selected option value — exactly one, where CheckboxGroup owns an array. The GROUP owns it; each row\'s checked appearance is DERIVED (`checked = (value === row.value)`), never wired on the row. Pair with `onChange`; use `defaultValue` for the uncontrolled form.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'Uncontrolled initial selection — a single option value. Start EMPTY (unset) to force a deliberate choice; pre-select only where a genuinely safe recommended default exists, and never pre-select a consent-shaped option.' },
    { name: 'onChange', type: '(value: string, event) => void', required: false, description: 'Fires with the NEW scalar value when a different row is selected. The group dispatches it; a row never owns its own onChange inside a group. Keep it CHEAP — selection follows focus by default, so a screen-reader user arrowing through fires it at every step.' },
    { name: 'required', type: 'boolean', default: true, required: false, description: 'Whether an option must be chosen. Drives the nested FieldLabel\'s required marker (Prism 2\'s group defaults it on) and aria-required on the group. Group-level: an individual row never owns its own required. The required-by-default follows Prism 2\'s spec; an OPTIONAL group must instead carry an explicit "None" option, because a radio cannot be deselected — a stray click is otherwise permanent.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the group — the label\'s type and every row (control circle, label ramp, gap) together, passed into the nested FieldLabel and rows by `follow`. Prism 2\'s group is single-size; this def carries the family-universal size axis so the group is not frozen at one size.' },
    { name: 'name', type: 'string', required: false, description: 'The shared control name — LOAD-BEARING here, not a submission convenience: it is what enforces browser-level exclusivity across the set. An individual option NEVER sets its own, which would break exclusivity outright.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Disables the whole set — every row and the label dim, driven by the group\'s context (the native disabled is the source of truth). Not projected as a Figma state; Prism 2\'s group shows no disabled treatment.' },
  ],

  // No interactive state of the group's OWN — Prism 2's group is a single configuration. The rows and the
  // label carry their own states through their own defs. `disabled` and group `error` are HELD (not
  // projected) rather than invented here — see the header and `codeOnly`.
  states: ['rest'],

  // `size` ONLY — the family-universal axis (see the header `[HELD]` note). No tone/emphasis (a radio set is
  // neutral), no surface/inverse axis (#871 — a control set does not ask which ground it stands on), no
  // `orientation` axis (Prism 2 is vertical only; horizontal is HELD, not invented). `size` `follow`s into
  // the nested FieldLabel and rows, so the whole group scales as one.
  variants: {
    size: ['small', 'medium', 'large'],
  },

  // THE GROUP PAINTS NOTHING OF ITS OWN — identical to `checkbox-group`. The label ink is FieldLabel's,
  // every row's ink is `radio-row`'s (whose control ink is `radio-control`'s); the container is a
  // transparent stack. So there are no paint slots and no `paintKeys` — the only bindings this def carries
  // are STRUCTURAL (the stack gap and the block padding), which resolve through anatomy's `gap`/`padding`
  // fields, not through any paint template.

  tokens: {
    // ── THE STACK GAP [HELD], PER SIZE — mirrored from `checkbox-group` verbatim. Prism 2's group gap is 0
    // (its fixed rows self-space); our rows HUG, so a 0 gap would leave them touching. The gap is bound to
    // the `size.*.gap` rung so the group's `size` axis reaches a real binding of its own. The VALUE is
    // provisional (8/8/12px on nb — the control-to-label gap rung reused as the inter-row gap) and the exact
    // inter-row layout gap is the owner's to confirm; this def inherits whatever `checkbox-group` settles on
    // (#1475: the two groups match by SHARING a resolution, not by each guessing). Not measured from Prism 2.
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.large.gap': 'size.lg.gap',
    // ── THE GROUP'S BLOCK PADDING — Prism 2's `radio-button-group.json` container `padding {top: 8, bottom:
    // 8}` exactly (`space.100` = 8px on nb), the same 8/8 as `checkbox-group` (the audit found them
    // byte-for-byte identical here).
    'pad-y': 'space.100',
    // ── THE INLINE PADDING IS ZERO — Prism 2's container `padding {start: 0, end: 0}`, so the rows FILL the
    // group's full width. `PaddingDef.inlineLabel` is REQUIRED, so this binds `space.0` (0px, emitted in
    // every brand tier) EXPLICITLY rather than reusing `pad-y`: binding `pad-y` here would ship an 8px inline
    // inset that contradicts both Prism 2 and the rows-fill-width intent. A literal-zero slot, exactly as
    // `checkbox-group` binds its own.
    'pad-x': 'space.0',
  },

  // ── ANATOMY — a column: the nested FieldLabel above a stack of nested Radio rows ───────────────────────
  //
  // container (column) → nested `field-label` · row1 · row2 · row3. The label and rows are all in-flow
  // `nest`s (the select precedent, #1226). The label `follow`s the group's size and pins Prism 2's
  // Secondary/Bold styling; each row `follow`s the size too. THREE representative rows stand in for Prism 2's
  // variable count — the same representative-count [HELD] as `checkbox-group` (the code unit is `children:
  // RadioRow[]`). Prism 2's `radio-button-group` shows rows 3–6 default OFF (2 visible); that default-visible
  // count is a row-level [HELD], not an auto-layout concern (#1475), so it does not change the structure here.
  anatomy: {
    root: 'container',
    parts: {
      // THE GROUP CONTAINER and the a11y target (role="radiogroup"). Structure only — no `paintSlots`; it
      // keys no fill or border and draws nothing. A column that carries a comfortable WIDTH FLOOR
      // (`minWidth`, below) so the rows have a real width to span; hugs its height. `pad-y` is Prism 2's 8px
      // block padding; `pad-x` is `space.0` (0px), so the inline sides are truly zero and the rows fill the
      // group's full width — Prism 2's `{start: 0, end: 0}`.
      //
      // THE WIDTH FLOOR + ROW FILL (#1503, owner Option B: follow Prism 2) — INHERITED FROM `checkbox-group`
      // verbatim, per #1475's mandate that the two groups match by SHARING one resolution. Prism 2's
      // `radio-button-group.json` is a FIXED 320px root with each `radioButtonRow` set to FILL (byte-for-byte
      // `checkbox-group.json`); this realizes it with the container floored at `minWidth: 320` and each row
      // `crossAxisFill` (→ `layoutAlign: STRETCH`, the #1503 capability). A `minWidth` floor rather than a
      // bound width keeps the group responsive (reads at 320, flexes above), the `select` #1345 precedent.
      // 320 is the owner-cited Prism 2 literal, not a semantic role, so `CONTRACT_VERSION` stands. Whatever
      // `checkbox-group` settles is copied here — building a DIFFERENT width model is the one outcome that
      // guarantees the two never match (#1475).
      container: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'size.{size}.gap',
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        minWidth: 320,
        children: ['label', 'row1', 'row2', 'row3'],
      },
      // THE NESTED GROUP LABEL (nest-fixed, FOLLOWING size). An in-flow instance of `field-label`, configured
      // to Prism 2's group `formLabel`: emphasis SECONDARY, weight BOLD, and `required` on by its own default.
      // `size` is `follow`ed from the group so the heading scales with the set; `variant` pins the fallback
      // (medium) plus the three axes that do NOT follow (emphasis, weight, state) — `nestVariantMatch` requires
      // the coordinate to name every axis field-label projects (size, emphasis, weight, state), exactly as
      // `checkbox-group` and `select` pin all four.
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium', emphasis: 'secondary', weight: 'bold', state: 'rest' }, follow: ['size'] },
        note: 'The group heading and accessible name, composed rather than re-declared — Prism 2\'s formLabel configuration (secondary, bold, required-on). Its size follows the group; a fix to FieldLabel reaches here without a copy. It is MANDATORY: an unlabeled radio group announces "radio button, 1 of 3" with no idea what the choice is.',
      },
      // THE STACKED ROWS (nest-fixed, FOLLOWING size). Three in-flow instances of `radio-row`, each
      // `follow`ing the group's size (a `large` group nests `large` rows). `nest-fixed`, NOT `nest-exposed`:
      // the group does not surface per-row selection as its OWN properties (that would re-explode the matrix,
      // AND for radio would be wrong — exactly one row is selected at a time, a constraint no independent
      // per-row axis can express) — a designer overrides each row instance's exposed `selection`/`state` in
      // place, and a code consumer derives them from the single scalar value. `variant: { size: 'medium' }` is
      // the fallback the follow overrides per member; `radio-row` projects only `size`, so that one axis is
      // the whole coordinate. Three rows stand in for Prism 2's variable count (see the header).
      //
      // `crossAxisFill: true` (#1503) — each row STRETCHES to the group's width (`layoutAlign: STRETCH`),
      // reproducing Prism 2's `radioButtonRow: FILL`, mirroring `checkbox-group` exactly (the two match by
      // sharing this resolution). The LABEL is NOT stretched (Prism 2's label hugs above the filled rows).
      row1: {
        kind: 'nest',
        nests: 'radio-row',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium' }, follow: ['size'] },
        crossAxisFill: true,
        note: 'The first Radio row — always present. Nests the labeled row (which nests the control), following the group\'s size. Fills the group\'s width (Prism 2\'s FILL rows). Its checked state is derived from the group\'s scalar value (`checked = value === row.value`), not wired here.',
      },
      row2: {
        kind: 'nest',
        nests: 'radio-row',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium' }, follow: ['size'] },
        crossAxisFill: true,
        note: 'A second Radio row — one of the representative stack (see the header `[HELD]` on Prism 2\'s variable row count). Same nest configuration as the first, including the group-width fill.',
      },
      row3: {
        kind: 'nest',
        nests: 'radio-row',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium' }, follow: ['size'] },
        crossAxisFill: true,
        note: 'A third Radio row — completing the representative stack. In code the stack is `children: RadioRow[]` of any length; the three fixed nests stand in for that count in the projection. Fills the group\'s width like its siblings.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word (#563).
      'value / onChange — the GROUP owns the SCALAR selected value and the change callback (`value: string`, exactly one — where CheckboxGroup owns an array), and each row\'s checked appearance is DERIVED from it (`checked = value === row.value`), never wired on a row inside the group. Figma has no data model, so the projected rows show a fixed default selection; the scalar and its wiring are the code projection\'s. This is the contract the group owns and a single `radio-row` structurally cannot express — and for radio it is what makes the options mutually exclusive at all.',
      'name — the SHARED control name that enforces browser-level EXCLUSIVITY, owned by the group and load-bearing rather than a submission convenience. An individual option setting its own name breaks exclusivity outright. Figma has no DOM naming, so the shared name is the code projection\'s; the projected rows cannot show the exclusivity that makes them radios rather than toggles.',
      'roving tabindex / single tab stop — THE OPPOSITE OF CHECKBOX-GROUP, and radio\'s headline keyboard difference. The whole group is ONE tab stop: Tab moves into it and the next Tab moves out, while arrow keys move between options (wrapping, Home/End to first/last) and Space/selection-follows-focus selects. Implement with roving tabindex (the checked option at tabindex="0", siblings at -1). Making each option its own tab stop is the most common radio a11y failure. Figma has no accessibility tree and no keyboard model, so none of this is projectable — it lives in `accessibility.keyboard` and here.',
      'error / validation — GROUP-LEVEL and [HELD]. The brief says the group owns validation and carries the error message ("Select a shipping method", SC 3.3.3), with the individual rows staying neutral. Prism 2\'s spec settles no error visual for the group (no error state, no group field-message), so this def deliberately does NOT invent one: whether the group composes a nested `field-message` for the error, and what an errored group looks like, is held for owner decision. `required` IS carried (via the nested FieldLabel and aria-required); error is not. Same [HELD] as `checkbox-group`.',
      'variable row count — [HELD]. Prism 2 models the group with six fixed rows plus node-visibility booleans (rows 3–6 defaulting OFF, so 2 visible by default — one fewer than checkbox\'s three). In code the count is simply `children: RadioRow[]` of any length. This def represents the stack with three fixed row nests rather than porting the six-rows-with-booleans mechanism (which would be the corpus\'s first boolean-toggled `nest`); the count and the boolean model are held for owner confirmation, matching `checkbox-group`.',
      'orientation — [HELD]. The group `orientation` (vertical / horizontal) is `RadioGroup`\'s own axis (`radio-row` records it there); Prism 2 is vertical only. Vertical scans better and lets long option labels wrap, so it is the built default and horizontal is not invented here — a horizontal axis is held rather than guessed at, the same as `checkbox-group`.',
      'the disabled dim — a disabled GROUP dims every row and the label, driven by the group\'s context (the CSS cascade / a data-attribute), not by a prop on each row. It is [HELD] out of the Figma projection (Prism 2 shows no group disabled treatment), so a designer sees the rest configuration and a code consumer gets the dim from the group.',
      'the id / describedby WIRING and role="radiogroup" — the host generates ids, ties the FieldLabel to the group via aria-labelledby, and stitches any group message into aria-describedby. Figma has no accessibility tree and no node-to-node reference, so the nested label sits above the rows and is associated by proximity alone (the ceiling field-label already hits).',
    ],
  },

  // How this projects into Figma. `size` is the one variant axis (3 members); no `stateAxis` (the group has
  // no state of its own — `rest` alone), no `booleans` (the representative rows are fixed, not toggled — see
  // the header `[HELD]` on the row count), no `texts`/`swaps` (the group has no text or swap part of its own;
  // the label text is the nested FieldLabel's). Identical projection shape to `checkbox-group`.
  figmaProperties: {
    variantAxes: ['size'],
    booleans: {},
  },

  accessibility: {
    role: 'radiogroup (role="radiogroup" on the container, or a native <fieldset>) with aria-labelledby pointing at the FieldLabel; each row is a native <input type="radio"> sharing the group\'s name',
    wcag: [
      '1.3.1 Info and Relationships (the group structure — role="radiogroup" + the shared label — is the meaning)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion (GROUP-level, announced once)',
      '4.1.2 Name Role Value (the group name via aria-labelledby; each option carries its own checked)',
      '2.4.13 Focus Appearance / 1.4.11 Non-text Contrast (the control boundary and focus indicator, on each option)',
      '2.5.8 Target Size (each row is its own target — the group does not change that)',
    ],
    keyboard: 'THE OPPOSITE OF CHECKBOX-GROUP, and the headline. The GROUP is a SINGLE tab stop: Tab moves into the group and the next Tab moves out, while arrow keys move between options, wrapping at the ends, with Home/End jumping to first/last. Space selects the focused option, and selection FOLLOWS FOCUS by default (arrowing moves focus and selects — native <input type="radio"> behavior and the APG default). Implement with ROVING TABINDEX — one radio at tabindex="0" (the checked one, or the first if none), siblings at -1, arrow handling moving focus and calling .focus() — not aria-activedescendant. Making each option its own tab stop is the most common radio accessibility failure. NEVER override Enter (it submits the enclosing form).',
    focus: 'Focus lands on ONE option at a time (roving), not on every option in turn. On focus restore into the group (a validation error, a legend click), focus the CHECKED radio rather than blindly the first; if none is checked, the first non-disabled option. The group container is not itself focusable. Keep the :focus-visible ring INSTANT (a fade lags rapid arrow navigation) and circular (the control is full-round).',
    aria: 'Prefer role="radiogroup" on a div plus aria-labelledby over <fieldset>/<legend>: both are valid, but fieldset has flexbox/grid quirks that make it hard to style, and role="radiogroup" keeps the layout freedom while preserving the shared-label announcement. THE GROUP LABEL IS MANDATORY FOR MEANING: without it assistive tech announces an orphaned "radio button, 1 of 3". The GROUP owns required and error — aria-required and aria-invalid associate to the group and announce once; an individual option never owns its own required or error. Native inputs sharing a name give the grouping, the exclusivity and the roving-tabindex keyboard model for free. Do not double-label: the rows carry their short labels, the group carries the decision.',
  },

  content: {
    labelPattern: 'The group label NAMES THE DECISION or asks the question ("Shipping method", "How should we contact you?"), abstracting the shared word up so its rows read the short remainder ("Standard", "Express", "Overnight"). Sentence case, no trailing colon — FieldLabel\'s rules. May be visually hidden when an enclosing labeled section already frames it, but must stay programmatically present.',
    errorPattern: 'GROUP-LEVEL and specific — "Select a shipping method", stating what is wrong and how to fix it (SC 3.3.3), never "Invalid". The options stay neutral; the group carries the message. The error VISUAL is not settled by Prism 2 and is not invented here.',
    emptyPattern: 'The group starts EMPTY by default, so no option carries a pre-selected state — this forces a deliberate choice. Pre-select only where a genuinely safe recommended default exists. Empty is a one-way door, because a radio cannot be deselected: an OPTIONAL group must carry an explicit "None" or "N/A" option, or a stray click permanently pollutes the data. If a "None" option would corrupt the data model, the choice belongs in a clearable Select instead.',
  },

  docs: {
    usage: 'Use to choose exactly one of 2 to about 7 mutually exclusive, all-visible options where seeing them all aids the decision — a shipping method, a plan tier. Give the group a label that names the decision; let it own the shared name, the single scalar value, required and validation, and derive each row\'s checked state from the value rather than wiring it on the row. Compose the rows as `children`. Prefer vertical orientation, which scans better and lets long labels wrap safely. Past roughly 7 options a filtering Select or Combobox scans better; for any-number selection use a CheckboxGroup, and for an immediate-effect setting a Switch.',
    do: [
      'Give the group a label that names the decision, so its rows can read the short abstracted-up remainder',
      'Let the GROUP own the shared name, the single scalar value, required and validation — an option never manages its own',
      'Derive each row\'s checked state from the group\'s scalar value; never wire checked on a row in a group',
      'Give an optional group an explicit "None" option — a radio cannot be deselected, so a stray click is otherwise permanent',
      'Keep required and error at the group level, announced once (aria-required / aria-invalid on the group)',
      'Prefer role="radiogroup" + aria-labelledby over fieldset/legend for the layout freedom',
    ],
    dont: [
      'Set checked, onChange or name on an individual option — all three belong to the group, and an option setting its own name breaks exclusivity outright',
      'Make each option its own tab stop — the group is one stop with arrow navigation, and getting this wrong is the most common radio accessibility failure',
      'Model an any-number choice as a radio group — that is a CheckboxGroup',
      'Reach for a radio group past roughly 7 options or in tight vertical space — that is a Select',
      'Override Enter to select — Enter submits the form, and that expectation is universal',
    ],
    contentGuidelines: 'The group label names the decision; the rows carry the short options. Group errors read "Select a shipping method" rather than "Invalid".',
  },

  ai: {
    primaryPurpose: 'Choose exactly one from a bounded set via a labeled stack of Radio rows, with the group owning the shared name, the single scalar value, group-level required and all validation.',
    whenToUse: 'A small bounded single-select committed on save (shipping method, plan tier, a contact preference), where seeing all 2 to about 7 options aids the choice and the group needs one label, one required rule and one validation message.',
    avoidWhen: 'Any number of options may be chosen (CheckboxGroup — exactly-one versus any-number), a single independent opt-in with no siblings (a lone Checkbox row), the change takes effect the instant it is toggled (a Switch, or a Segmented Control), or the set runs past roughly 7 options or vertical space is tight (a Select or filtering Combobox).',
    commonPartners: ['radio-row', 'radio-control', 'field-label', 'field-message', 'form'],
    triggerKeywords: ['radio group', 'radio set', 'radios', 'single select', 'exactly one', 'pick one', 'choose one', 'mutually exclusive', 'shipping method', 'plan tier'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['radio-row', 'field-label', 'field-message', 'form'],
    alternativeTo: ['checkbox-group', 'select', 'combobox', 'segmented-control', 'switch-row'],
    supersedes: [
      'a bare set of <input type="radio"> with no shared label or group wiring',
      'a set of checkboxes misused for a mutually exclusive choice',
      'per-option required / error scattered across the options instead of owned by the group',
    ],
    supersededBy: [
      'select when the option count grows past about 5 to 7',
      'segmented-control when the presentation should be compact and take effect immediately',
    ],
  },

  notes: {
    contested: [
      'THE `size` AXIS IS A GENERALIZATION OF PRISM 2, NOT A REPRODUCTION — Prism 2\'s group is single-size (a Large label). The family-universal `size` axis is carried so the group is not the one form def frozen at one size, scaling the label and rows together by `follow`. `[HELD]`: the owner may prefer a single-size group; if so, drop the axis and pin the nested label/rows to one rung. Inherited from `checkbox-group` verbatim — the two groups match by sharing this fork\'s resolution, not by each deciding it.',
      'THE GROUP PAINTS NOTHING and so declares no `paintKeys` — like `checkbox-group`, its whole color surface is its nested children\'s. The alternative (inventing a group fill or border) is exactly the surface Prism 2\'s transparent container does not have; a stack is structure, and its ink lives one level down in `field-label` and `radio-row` (whose control ink is `radio-control`\'s).',
    ],
    unverified: [
      'THE WIDTH/FILL MODEL IS `checkbox-group`\'S RESOLVED ONE, COPIED DELIBERATELY (#1503, #1475, owner Option B). The audit found every column-stacking form group hugged its width with rows that did NOT fill it, where Prism 2 gives a fixed 320px root with rows set to FILL — because the projection could not emit cross-axis child FILL. #1503 added that capability (`crossAxisFill` → `layoutAlign: STRETCH`) plus a `minWidth` width floor, and landed it on `checkbox-group` FIRST; this def mirrors it verbatim (container `minWidth: 320`, rows `crossAxisFill`), so the two match by sharing ONE resolution rather than each guessing — building `radio-group` to a different width model is the one outcome that guarantees they never match. `test:roundtrip` asserts each row reads back `layoutAlign: STRETCH` on the offline host (a real-host confirmation is the standing nesting caveat below).',
      'THE INTER-ROW GAP IS PROVISIONAL AND `[HELD]`, inherited from `checkbox-group`. Prism 2\'s group gap is 0 because its rows are fixed boxes that self-space; our `radio-row` hugs, so a 0 gap leaves them touching. The `size.*.gap` rung (8/8/12px on nb) is bound so the group\'s `size` axis reaches a binding and the stack reads legibly, but the value is the owner\'s to set — and it is set ONCE, on `checkbox-group`, with `radio-group` following. Do not read the rung as measured from Prism 2.',
      'GROUP-LEVEL ERROR / VALIDATION DISPLAY IS `[HELD]`. The brief puts validation and the error message on the group; Prism 2 settles no visual for it. This def carries `required` (settled) and no error skin (unsettled). Whether the group nests a `field-message` for the group error, and what an errored group looks like, needs the owner — the same open question `checkbox-group` holds.',
      'THE VARIABLE ROW COUNT IS `[HELD]`. The three fixed row nests stand in for Prism 2\'s six-rows-with-booleans (rows 3–6 default off, so 2 visible by default). In code the count is simply `children: RadioRow[]` of any length. If the projection should carry a designer-toggleable count, the mechanism is the node-visibility boolean on each row nest (schema-legal, unbuilt) — the same held mechanism as `checkbox-group`. There is no radio select-all to hold (a select-all is a multi-select affordance and does not apply).',
      'THE NESTING IS UNVERIFIED ON A REAL HOST, the same way `checkbox-group`\'s is: the group nests `radio-row` (which nests `radio-control` `nest-exposed`), the deepest chain in the corpus, and whether a doubly-nested instance\'s inherited sizing and exposed properties cooperate with the group\'s auto-layout is a real-host question the offline shim cannot answer. `test:roundtrip` builds every projected def and reads it back; the symptom to look for is a row instance stretched or an exposed selection that does not surface at the group.',
    ],
  },
};
