/**
 * CheckboxGroup — the SET (#1347, OPTION B owner-decided 2026-09-15). A `field-label` above a vertical
 * stack of `checkbox-row`s, for selecting ANY NUMBER — zero to many — from a bounded set. Built from
 * Prism 2's real specs (`reference/Prism2/component-specs/checkbox-group.json`, `checkbox-row.json`,
 * `checkboxes.json`): the third and last member of the checkbox decomposition the brief named — the
 * atom (`checkbox-control`), the labelled row (`checkbox-row`) and this set — and the one that owns the
 * contract a single row structurally cannot (the value ARRAY, group-level required and ALL validation).
 *
 * ── WHAT PRISM 2 SETTLES, AND WHAT IT DOES NOT (the fork map) ────────────────────────────────────────
 *
 * Prism 2's `checkbox-group` is a single `COMPONENT` (not a `COMPONENT_SET`): a VERTICAL container
 * holding a `formLabel` (our `field-label`) configured `required · size Large · weight Bold · color
 * Secondary`, then up to six `checkboxRow`s (row 1 fixed, rows 2–6 node-visibility booleans defaulting
 * true). So the composition — a required section label above a stack of rows — is SETTLED, and this def
 * reproduces it. Several composition-model choices are NOT settled by Prism 2's spec, and per #1347 they
 * are HELD and surfaced (need_input) rather than invented; each is marked `[HELD]` where it lands:
 *
 *   · GROUP-LEVEL ERROR / VALIDATION DISPLAY. Prism 2 shows the group's `required` (via the label) but no
 *     error state, no group `field-message`, no error skin. The brief (§2, and `checkbox-row`'s own docs)
 *     says the GROUP owns validation and the error message — but gives no Prism 2 visual for it. So the
 *     group carries `required` (settled) and does NOT invent an error treatment; whether it composes a
 *     `field-message` for a group error, and what that looks like, is `[HELD]` (see `notes.unverified`).
 *   · INTER-ROW LAYOUT GAP. Prism 2's group gap is 0 — the rows self-space, because a Prism 2
 *     `checkboxRow` is a FIXED 48px box (12px block padding around a 24px control). Our `checkbox-row`
 *     deliberately HUGS its content (no Figma floor — see `checkbox-row.ts` `codeOnly`), so a 0 group gap
 *     would leave the hugging rows touching. Prism 2's spacing therefore does not map, and the gap is a
 *     genuine `[HELD]` decision. A PROVISIONAL size-keyed stack gap (`size.*.gap`, 8/8/12px on nb) is
 *     bound below — so the group's own `size` axis reaches a binding — but the value is the owner's to confirm.
 *   · SELECT-ALL AFFORDANCE. Prism 2 has none. Reproducing Prism 2 means NOT inventing one, so it is
 *     absent by design (a select-all is a parent checkbox in the `indeterminate` state — expressible from
 *     the existing parts if wanted, but not part of Prism 2's group). `[HELD]` only in the sense of
 *     confirming its absence is intended.
 *   · VARIABLE ROW COUNT. Prism 2 fakes it with six fixed rows + five visibility booleans — a Figma
 *     authoring convenience for a count that, in code, is just `children: CheckboxRow[]`. This def
 *     represents the stack with THREE fixed row nests (enough to read as "multiple"), rather than porting
 *     the six-rows-with-booleans mechanism (which would be the corpus's first boolean-toggled `nest`).
 *     The count and the boolean model are `[HELD]`.
 *   · A `size` AXIS. Prism 2's group is single-size. This def carries the family-universal `size` axis
 *     (every sibling — `field-label`, `checkbox-row`, `checkbox-control` — has it), scaling the label and
 *     the rows together via `follow`, so the group is not the one form def frozen at one size. That is a
 *     generalization of Prism 2, not a reproduction of it, and is `[HELD]` for confirmation.
 *
 * ── THE NEST CHAIN IS FOUR DEEP: `focus-ring` ← `checkbox-control` ← `checkbox-row` ← `checkbox-group` ─
 *
 * The group NESTS `checkbox-row` (`kind: 'nest'`, in flow), which nests `checkbox-control` `nest-exposed`,
 * which nests `focus-ring`. The group composes via that already-collapsed Row (`checkbox-row` projects a
 * SIZE-ONLY 3-member set since #1330), so it does NOT inherit the control's 54-member variant explosion —
 * exactly the property #1347 required. The rows are `nest-fixed` here (the group picks the default row
 * configuration; a designer overrides each row instance's own exposed `selection`/`state` in place, via
 * Figma's exposed-nested-instance properties, and a code consumer drives them from the value array). The
 * group does NOT re-enumerate per-row selection into its own matrix — that would be the explosion again,
 * one layer out. `lint-nesting`'s acyclicity arm holds the chain; nest-resolves confirms every `nests`
 * names a real def. `test:roundtrip` is the host-truth check that the nesting composes on a real host.
 *
 * ── VERSIONING: ENGINE, NOT CONTRACT (#1252, docs/30) ───────────────────────────────────────────────
 *
 * Adding this def and renaming `checkbox` → `checkbox-row` moves the PROJECTED COMPONENT SURFACE (a new
 * def, a renamed baseline key), which is an `ENGINE_VERSION` trigger. It does NOT move the versioned TOKEN
 * contract: `schema/token-contract.json` is the emitted token-name surface, and no component id or prop
 * name lives in it. So `CONTRACT_VERSION` STANDS at 10.0.0 (`token-contract.ts --check` confirms the
 * guaranteed set unchanged; `--accept` refreshes only the informational `engineVersion` stamp), exactly
 * as the #1354/#1348/#1330 decomposition PRs did. The #1347 orchestration brief called for a MAJOR
 * CONTRACT bump to 11.0.0; that is surfaced as a correction, not fabricated — see `docs/00-progress.md`.
 */
import { ComponentDef } from '../component-schema';

export const checkboxGroup: ComponentDef = {
  id: 'checkbox-group',
  name: 'CheckboxGroup',
  aliases: ['checkbox-set', 'checkboxes', 'checkbox-list', 'multiselect', 'checkbox-fieldset'],
  category: 'form',
  status: 'draft',
  description:
    'A labelled set for selecting any number — zero to many — from a bounded list of options. A required section label (FieldLabel) above a vertical stack of Checkbox rows. Owns the contract a single row cannot: the value array, group-level required, and all validation, announced once for the group. Use for a small bounded multi-select; past roughly 7-10 options a filtering multi-select Combobox scans better. Not exactly-one selection (RadioGroup), not a single independent opt-in (a lone Checkbox row), not an immediate-effect setting list (a list of Switches).',

  // THE GROUP'S PUBLIC API — the contract the brief (§2) puts on the group and a row cannot express. The
  // per-row `checked` is DERIVED from `value`, never held on a row inside a group.
  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The group heading, rendered as the nested FieldLabel and the group\'s accessible name (role="group" + aria-labelledby). Names the decision the set answers ("Notification preferences"), letting its rows read the abstracted-up short labels ("Email", "SMS", "Push").' },
    { name: 'value', type: 'string[]', required: false, description: 'The controlled array of checked option values. The GROUP owns it; each row\'s checked appearance is DERIVED (`checked = value.includes(row.value)`), never wired on the row. Pair with `onChange`; use `defaultValue` for the uncontrolled form.' },
    { name: 'defaultValue', type: 'string[]', required: false, description: 'Uncontrolled initial selection. Never pre-check a consent option — a dark pattern, and for marketing consent often unlawful (brief §7).' },
    { name: 'onChange', type: '(value: string[], event) => void', required: false, description: 'Fires with the NEW value array when any row toggles. The group dispatches it; a row never owns its own onChange inside a group.' },
    { name: 'required', type: 'boolean', default: true, required: false, description: 'Whether at least one option must be chosen. Drives the nested FieldLabel\'s required marker (Prism 2\'s group defaults it on) and aria-required on the group. Group-level: an individual row never owns its own required. [HELD] the required-by-default follows Prism 2\'s spec; a form that marks the optional minority instead sets this false.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the group — the label\'s type and every row (control square, label ramp, gap) together, passed into the nested FieldLabel and rows by `follow`. [HELD] Prism 2\'s group is single-size (Large label); this def carries the family-universal size axis so the group is not frozen at one size.' },
    { name: 'name', type: 'string', required: false, description: 'A shared control name so the set submits as one field and works uncontrolled in a native form.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Disables the whole set — every row and the label dim, driven by the group\'s context (the field\'s native disabled is the source of truth). [HELD] not projected as a Figma state; Prism 2\'s group shows no disabled treatment.' },
  ],

  // No interactive state of the group's OWN — Prism 2's group is a single configuration. The rows and the
  // label carry their own states (dimming, etc.) through their own defs. `disabled` and group `error` are
  // HELD (not projected) rather than invented here — see the header and `codeOnly`.
  states: ['rest'],

  // `size` ONLY — the family-universal axis (see the header `[HELD]` note). No tone/emphasis (a checkbox
  // set is neutral), no surface/inverse axis (#871 — a control set does not ask which ground it stands on),
  // no `orientation` axis (Prism 2 is vertical only; horizontal is HELD, not invented). `size` `follow`s
  // into the nested FieldLabel and rows, so the whole group scales as one.
  variants: {
    size: ['small', 'medium', 'large'],
  },

  // THE GROUP PAINTS NOTHING OF ITS OWN. The label ink is FieldLabel's, every row's ink is
  // checkbox-row's; the container is a transparent stack. So there are no paint slots and no `paintKeys` —
  // the only bindings this def carries are STRUCTURAL (the stack gap and the block padding), which resolve
  // through anatomy's `gap`/`padding` fields, not through any paint template. A `{slot}` grammar here
  // would name a slot that resolves to nothing at every coordinate.

  tokens: {
    // ── THE STACK GAP [HELD], PER SIZE. Prism 2's group gap is 0 (its 48px fixed rows self-space); our rows
    // HUG, so a 0 gap would leave them touching. The gap is bound to the `size.*.gap` rung so the group's
    // `size` axis reaches a real binding of its own (the group scales its spacing, not only its nested
    // children via `follow`) rather than being an axis a consumer can pick that resolves to nothing here.
    // The VALUE is provisional: `size.*.gap` is 8/8/12px on nb — the control-to-label gap rung reused as
    // the inter-row gap — and the exact inter-row layout gap (and whether the label-to-first-row gap should
    // differ from row-to-row) is the owner's to confirm. Do not read the rung as measured from Prism 2.
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.large.gap': 'size.lg.gap',
    // ── THE GROUP'S BLOCK PADDING — Prism 2's container `padding {top: 8, bottom: 8}` exactly (`space.100`
    // = 8px on nb). The inline sides are 0 (the rows FILL the group's width), so only block padding binds.
    'pad-y': 'space.100',
  },

  // ── ANATOMY — a column: the nested FieldLabel above a stack of nested Checkbox rows ─────────────────
  //
  // container (column) → nested `field-label` · row1 · row2 · row3. The label and rows are all in-flow
  // `nest`s (the select precedent, #1226). The label `follow`s the group's size and pins Prism 2's
  // Secondary/Bold styling; each row `follow`s the size too. THREE representative rows stand in for Prism
  // 2's variable count (see the header `[HELD]` — the code unit is `children: CheckboxRow[]`).
  anatomy: {
    root: 'container',
    parts: {
      // THE GROUP CONTAINER and the a11y target (role="group"). Structure only — no `paintSlots`; it keys
      // no fill or border and draws nothing. Column, filling its width so the rows span it; hugs its
      // height. `pad-y` is Prism 2's 8px block padding; the inline sides fall back to 0.
      container: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'size.{size}.gap',
        padding: { block: 'pad-y', inlineLabel: 'pad-y' },
        children: ['label', 'row1', 'row2', 'row3'],
      },
      // THE NESTED GROUP LABEL (nest-fixed, FOLLOWING size). An in-flow instance of `field-label`,
      // configured to Prism 2's group `formLabel`: emphasis SECONDARY, weight BOLD, and `required` on by
      // its own default (Prism 2's `Required` default true). `size` is `follow`ed from the group so the
      // heading scales with the set; `variant` pins the fallback (medium) plus the three axes that do NOT
      // follow (emphasis, weight, state) — `nestVariantMatch` requires the coordinate to name every axis
      // field-label projects (size, emphasis, weight, state), exactly as select pins all four.
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium', emphasis: 'secondary', weight: 'bold', state: 'rest' }, follow: ['size'] },
        note: 'The group heading and accessible name, composed rather than re-declared — Prism 2\'s formLabel configuration (secondary, bold, required-on). Its size follows the group; a fix to FieldLabel reaches here without a copy.',
      },
      // THE STACKED ROWS (nest-fixed, FOLLOWING size). Three in-flow instances of `checkbox-row`, each
      // `follow`ing the group's size (a `large` group nests `large` rows). `nest-fixed`, NOT `nest-exposed`:
      // the group does not surface per-row selection as its OWN properties (that would re-explode the
      // matrix) — a designer overrides each row instance's exposed `selection`/`state` in place, and a code
      // consumer derives them from the value array. `variant: { size: 'medium' }` is the fallback the
      // follow overrides per member; checkbox-row projects only `size`, so that one axis is the whole
      // coordinate. Three rows stand in for Prism 2's variable count (see the header).
      row1: {
        kind: 'nest',
        nests: 'checkbox-row',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium' }, follow: ['size'] },
        note: 'The first Checkbox row — always present. Nests the labelled row (which nests the control), following the group\'s size. Its checked state is derived from the group\'s value array, not wired here.',
      },
      row2: {
        kind: 'nest',
        nests: 'checkbox-row',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium' }, follow: ['size'] },
        note: 'A second Checkbox row — one of the representative stack (see the header `[HELD]` on Prism 2\'s variable row count). Same nest configuration as the first.',
      },
      row3: {
        kind: 'nest',
        nests: 'checkbox-row',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium' }, follow: ['size'] },
        note: 'A third Checkbox row — completing the representative stack. In code the stack is `children: CheckboxRow[]` of any length; the three fixed nests stand in for that count in the projection.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word (#563).
      'value / onChange — the GROUP owns the checked-value ARRAY and the change callback (`value: string[]`), and each row\'s checked appearance is DERIVED from it (`checked = value.includes(row.value)`), never wired on a row inside the group. Figma has no data model, so the projected rows show a fixed default selection; the array and its wiring are the code projection\'s. This is the contract the brief (§2) puts on the group and a single `checkbox-row` structurally cannot express.',
      'error / validation — GROUP-LEVEL and [HELD]. The brief says the group owns validation and carries the error message ("Select at least one option", SC 3.3.3), with the individual rows staying neutral. Prism 2\'s spec settles no error visual for the group (no error state, no group field-message), so this def deliberately does NOT invent one: whether the group composes a nested `field-message` for the error, and what an errored group looks like, is held for owner decision. `required` IS carried (via the nested FieldLabel and aria-required); error is not.',
      'select-all — [HELD], and absent by design. A select-all is a parent checkbox in the `indeterminate` state broadcasting partial selection, and it is expressible from the existing parts (a `checkbox-row` at `indeterminate` above the set). Prism 2\'s group has none, so reproducing Prism 2 means not adding one; its absence is confirmed rather than an oversight.',
      'variable row count — [HELD]. Prism 2 models a 2-to-6-row group with six fixed rows plus five node-visibility booleans (rows 2-6, defaulting on). In code the count is simply `children: CheckboxRow[]` of any length. This def represents the stack with three fixed row nests rather than porting the six-rows-with-booleans mechanism (which would be the corpus\'s first boolean-toggled `nest`); the count and the boolean model are held for owner confirmation.',
      'orientation — [HELD]. The brief\'s §15 names a group `orientation` (vertical / horizontal); Prism 2 is vertical only. Vertical scans better and lets long labels wrap, so it is the built default and horizontal is not invented here — a horizontal axis is held rather than guessed at.',
      'the disabled dim — a disabled GROUP dims every row and the label, driven by the group\'s context (the CSS cascade / a data-attribute), not by a prop on each row. It is [HELD] out of the Figma projection (Prism 2 shows no group disabled treatment), so a designer sees the rest configuration and a code consumer gets the dim from the group.',
      'the id / describedby WIRING and role="group" — the host generates ids, ties the FieldLabel to the group via aria-labelledby, and stitches any group message into aria-describedby. Figma has no accessibility tree and no node-to-node reference, so the nested label sits above the rows and is associated by proximity alone (the ceiling field-label already hits).',
    ],
  },

  // How this projects into Figma. `size` is the one variant axis (3 members); no `stateAxis` (the group
  // has no state of its own — `rest` alone), no `booleans` (the representative rows are fixed, not toggled
  // — see the header `[HELD]` on the row count), no `texts`/`swaps` (the group has no text or swap part of
  // its own; the label text is the nested FieldLabel's).
  figmaProperties: {
    variantAxes: ['size'],
    booleans: {},
  },

  accessibility: {
    role: 'group (role="group" on the container, or a native <fieldset>) with aria-labelledby pointing at the FieldLabel; each row is a native <input type="checkbox">',
    wcag: [
      '1.3.1 Info and Relationships (the group structure — role="group" + the shared label — is the meaning)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion (GROUP-level, announced once)',
      '4.1.2 Name Role Value (the group name via aria-labelledby; each row carries its own checked / mixed)',
      '2.5.8 Target Size (each row is its own target — the group does not change that)',
      '3.3.7 Redundant Entry (repeated consents across a form)',
    ],
    keyboard: 'Each checkbox row is its OWN Tab stop and Space toggles it — the same model as a standalone Checkbox, and the key difference from RadioGroup (one Tab stop, arrows within). The group adds no roving tabindex and no arrow navigation; it is a labelled container, not a single composite widget. NEVER override Enter (it submits the enclosing form).',
    focus: 'Focus lands on each row\'s control in turn; the group container is not itself focusable. On a validation error, move focus to the first invalid group (its label / first row) and announce the group-level message.',
    aria: 'Prefer role="group" on a div plus aria-labelledby over <fieldset>/<legend>: both are valid, but fieldset has flexbox/grid quirks that make it hard to style, and role="group" keeps the layout freedom while preserving the shared-label announcement. The GROUP owns required and error — aria-required and aria-invalid associate to the group and announce once; an individual row never owns its own required or error. Do not double-label: the rows carry their short labels, the group carries the decision.',
  },

  content: {
    labelPattern: 'The group label NAMES THE DECISION or asks the question ("Notification preferences", "Which contact methods?"), abstracting the shared word up so its rows read the short remainder ("Email", "SMS", "Push"). Sentence case, no trailing colon — FieldLabel\'s rules.',
    errorPattern: 'GROUP-LEVEL and specific — "Select at least one option", stating what is wrong and how to fix it (SC 3.3.3), never "Invalid". The rows stay neutral; the group carries the message. [HELD] the error VISUAL is not settled by Prism 2 and is not invented here.',
  },

  docs: {
    usage: 'Use to select any number — zero to many — from a bounded set, where the change is committed on save rather than applied instantly. Give the group a label that names the decision; let it own the value array, required and validation, and derive each row\'s checked state from the value array rather than wiring it on the row. Compose the rows as `children`. Past roughly 7-10 options, a filtering multi-select Combobox scans better; for exactly-one selection use a RadioGroup, and for a single independent opt-in a lone Checkbox row.',
    do: [
      'Give the group a label that names the decision, so its rows can read the short abstracted-up remainder',
      'Let the GROUP own the value array, required and validation — a row inside a group never manages its own',
      'Derive each row\'s checked state from the group\'s value array; never wire checked on a row in a group',
      'Keep required and error at the group level, announced once (aria-required / aria-invalid on the group)',
      'Prefer role="group" + aria-labelledby over fieldset/legend for the layout freedom',
    ],
    dont: [
      'Pre-check a consent option — a dark pattern, and for marketing consent often unlawful',
      'Wire checked, onChange or required on an individual row inside a group — all three belong to the group',
      'Model an exclusive one-of-many choice as a checkbox group — that is a RadioGroup',
      'Reach for a checkbox group past roughly 7-10 options — a filtering multi-select Combobox scans better',
      'Override Enter to toggle — Enter submits the form, and that expectation is universal',
    ],
    contentGuidelines: 'The group label names the decision; the rows carry the short options. Group errors read "Select at least one option" rather than "Invalid".',
  },

  ai: {
    primaryPurpose: 'Select any number — zero to many — from a bounded set via a labelled stack of Checkbox rows, with the group owning the value array, group-level required and all validation.',
    whenToUse: 'A small bounded multi-select committed on save (notification preferences, feature opt-ins, a filter set), where seeing all the options aids the choice and the group needs one label, one required rule and one validation message.',
    avoidWhen: 'Exactly one option may be chosen (RadioGroup — any-number versus exactly-one), a single independent opt-in with no siblings (a lone Checkbox row — a consent line, "remember me"), the change takes effect the instant it is toggled (a list of Switches — staged versus immediate), or the set runs past roughly 7-10 options (a filtering multi-select Combobox or Listbox).',
    commonPartners: ['checkbox-row', 'checkbox-control', 'field-label', 'field-message', 'form'],
    triggerKeywords: ['checkbox group', 'checkbox set', 'checkboxes', 'multiselect', 'select all', 'choose any', 'notification preferences', 'opt in list'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['checkbox-row', 'field-label', 'field-message', 'form'],
    alternativeTo: ['radio', 'select', 'combobox', 'switch'],
    supersedes: [
      'a bare set of <input type="checkbox"> with no shared label or group wiring',
      'per-row required / error scattered across the options instead of owned by the group',
    ],
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE `size` AXIS IS A GENERALIZATION OF PRISM 2, NOT A REPRODUCTION — Prism 2\'s group is single-size (a Large label). The family-universal `size` axis is carried so the group is not the one form def frozen at one size, scaling the label and rows together by `follow`. `[HELD]`: the owner may prefer a single-size group; if so, drop the axis and pin the nested label/rows to one rung. Recorded as a fork rather than presented as settled.',
      'THE GROUP PAINTS NOTHING and so declares no `paintKeys` — the first projecting def whose whole color surface is its nested children\'s. The alternative (inventing a group fill or border) is exactly the surface Prism 2\'s transparent container does not have; a stack is structure, and its ink lives one level down in `field-label` and `checkbox-row`.',
    ],
    unverified: [
      'THE INTER-ROW GAP IS PROVISIONAL AND `[HELD]`. Prism 2\'s group gap is 0 because its rows are fixed 48px boxes that self-space; our `checkbox-row` hugs, so a 0 gap leaves them touching and Prism 2\'s spacing does not transfer. The `size.*.gap` rung (8/8/12px on nb) is bound so the group\'s `size` axis reaches a binding and the stack reads legibly, but the value — and whether the label-to-first-row gap should differ from row-to-row — is the owner\'s to set. Do not read the rung as measured from Prism 2; it is a placeholder pending that decision.',
      'GROUP-LEVEL ERROR / VALIDATION DISPLAY IS `[HELD]`. The brief puts validation and the error message on the group; Prism 2 settles no visual for it. This def carries `required` (settled) and no error skin (unsettled). Whether the group nests a `field-message` for the group error, and what an errored group looks like (a recolored label? a message below the stack? a per-row neutral hold?), needs the owner. Building one now would invent the very thing the brief left to design.',
      'THE VARIABLE ROW COUNT AND SELECT-ALL ARE `[HELD]`. The three fixed row nests stand in for Prism 2\'s six-rows-with-booleans (a Figma convenience for `children: CheckboxRow[]`). If the projection should carry a designer-toggleable count, the mechanism is the node-visibility boolean on each row nest (the corpus\'s first boolean-toggled `nest` — schema-legal, unbuilt). A select-all parent is likewise expressible (a row at `indeterminate` above the set) and deliberately not added, since Prism 2 has none.',
      'THE NESTING IS UNVERIFIED ON A REAL HOST, the same way `checkbox-row`\'s and the other decompositions\' are: the group nests `checkbox-row` (which nests `checkbox-control` `nest-exposed`), the deepest chain in the corpus, and whether a doubly-nested instance\'s inherited sizing and exposed properties cooperate with the group\'s auto-layout is a real-host question the offline shim cannot answer. `test:roundtrip` builds every projected def and reads it back — the host-truth check #1347 named — but a three-deep nest is new ground; the symptom to look for is a row instance stretched or an exposed selection that does not surface at the group.',
    ],
  },
};
