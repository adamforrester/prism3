## (2026-10-16) — Code input: one input drawn as a row of cells, the cells in a native slot (#2428)

Built from the owner's decisions on #2428: Q321 A (all but cell count), Q329 A (cell count is a native `items` slot of
a Code cell part, 6 by default, 4 to 8), Q330 A (four sizes plus fill width), and the as-built wireframe approved
2026-10-16. Two defs in `packages/engine/components/code-input.ts`: `code-input` (48 members) and `code-input-cell` (28).
Built on #2660's items-slot pattern (merged), with current `main` merged in.

### What the build had to decide

- **The cell has no `_`.** Q349 gives a parent-only part the `_` prefix, and Q329 makes the cell the slot's
  preferred value. #2657's slot projection refuses a `_` id as a preferred value, because Figma leaves a `_` component
  out of a published library and a consuming file's slot could not offer it. Built as `code-input-cell` (recommendation
  A), confirmed by Q394 A on #2783. The rename sweep meets the same collision for the segmented-control segment,
  `_tab-item` and `_list-item`, each a preferred slot value in #2660.
- **The characters' type.** No guaranteed type role is above 18px (the contract guarantees body, label and caption),
  and the title roles' weights differ by brand (the default `strong`, prism3 `emphasis` and `strong`, nb-redesign
  `subtle` only). Q330's 20, 24 and 40px therefore bind `type.title.sm/md/2xl` with a new `typeWeight` (a fixed bold
  intent, resolved by `resolveWeightIntent` before projection, the rule `weightIntent` uses), so #1601 holds on every
  corpus brand. Small keeps Text field's `body.md.default`.
- **The cell sizes are literals** (`builtSize`, Dialog's construction, Q303.5 A): 48, 64 and 72 sit on no size rung.
  `lint-rung-names` gained `PINNED_LADDER_DEFS` for the families Q330 pins one rung below `md` (`title`, `icon.size` for
  the caret, `radius`) and `2xl` on its rung order.
- **Reactions on a set with no pressed look.** `reactions.ts` planned While pressing only to `pressed`. The cell's def
  names `pressState: 'focus-visible'` (pressing a cell focuses the code input), carried on the plan only where declared,
  so every other plan's `planStamp` is unchanged. `EXECUTOR_REVISION` is 36, one above main's 35 (#2938 raised main to 35; this PR moves `reactions.ts` and `write-components.ts` for `pressState`).
- **Default cells per member.** Each member's six cells show its state (`variantWhen` on `state`, which replaced
  `atState` on main in #2693): a fresh insert's picture of that
  state. A placed field's cells stay the designer's (Q329's accepted trade-off). Status has no nested mechanism, so an
  error member's default cells are not in error.
- **The cell's root part is `container`.** #2763's `lint-naming` names a root for its role; `cell` was the def's own
  noun. `container` is Text field's root name for the same bordered box.
- **Generation priority (#2713's scale).** Code input is 2, a top-level component an agent places on its own; the
  cell is 9, a part never generated alone. Its `pending` admission reads `pending — not projected: …` (#2711).
- **Active is spelled `focus-visible`.** The closed state vocabulary has no `active`; Text field's names for the same
  ring and caret are used, and the rename is held for the owner.

### Traps

- The #1392 paste check builds nest-exposed defs with a stub that keys no component, so a slot's preferred value read
  as a miss. Code input is the first nest-exposed def with a slot; the check now provides each preferred id as a built,
  keyed set, as the real build does.
- **Field style (#2719's Code input half, built here).** Q332 A names Code input a field and #2695's Q12 A sets its
  underline: one bottom line per cell, gaps unchanged, the 2px focus line and the 2px ring offset on the active cell,
  `border.danger` in error. The cell joins `FIELD_FRAME_PARTS` (`container`); `applyFieldStyle` now squares a per-size corner
  key (`size.{size}.radius`) rather than writing the template as a key. The field def binds no field chrome, so it and
  its gaps stay as authored. `test.ts` holds the cell's underline per state at every size (`#2719 code-input`).

### The digit's vertical position (owner QA 2026-10-16; option A on #2789; Q534 on 2026-10-22)

- **Measured cause.** The layout was already centered: the line box sits dead center in every cell, so the line height
  cancels (the leading splits evenly). What is left is the font. A centered line box puts a figure off center by
  ((descender − (ascender − figure height)) ÷ 2) × size. Inter is 0.0px at every size, by design. Playfair Display (prism3's
  title) sits 1.2 / 1.5 / 2.5px low at medium / large / xlarge with lining figures. The owner's test brand's display font
  sits high: its metrics are not in the repo.
- **The first fix (superseded below).** `verticalTrim: 'cap-height'` on the cell's character trims the box to the cap height and the baseline,
  measured 0.0px off center (±0.7 at the worst digit) in every font measured, at every size.
- **Host trap.** Figma stores vertical trim in the text style, and writing it on a styled layer detaches the style
  (#1567). So `claimDefaults` writes the plan's trim and the #1567 re-apply stands down for a trimmed node, in both
  executors. Both shims now model a style apply writing the style's own `NONE`, so a re-apply over the trim fails
  `#2428 code-input-cell` (plugin), `#2428 paste` (paste) and the round-trip's new `leadingTrim` predicate.
- **Paste chunks.** The trim adds about 130 B to every chunk's shell. After #2661's own shell growth that put Code
  input and Dialog over #1798's 37,800 B unit ceiling (Dialog had 76 B left on main). The strip pass now drops leading
  indentation as well as comments, on the same ground (no literal in the payload spans lines; the gate now also refuses
  a line ending in a backslash): about 1 KB off every shell. With the trim gone (below), `icon-button` packs into 16
  chunks.
- **Owner QA Q534 (2026-10-22): the character takes its text style.** In a brand's file the trimmed character had no
  style, so it kept the build's own font, the default brand's display serif. The character now carries its size's text
  style (`type.title.sm.strong` at medium, `type.body.md.default` at small, `type.title.md.strong` at large,
  `type.title.2xl.strong` at xlarge), which main's spec read-back (#2830) expects. A trim written on a styled layer
  detaches the style, so the Figma character is no longer trimmed: its line box is centered, and code still trims.
  The owner kept the style (Q560 A = Q-#2789.2 A, 2026-10-22), so `verticalTrim` and the executors' trim handling,
  which no def declared, are removed; both shims still model a style apply writing `NONE`.
  Held by `#2428 code-input` (plan), `#2428 paste` (paste executor), `#2428 code-input-cell` (plugin executor) and the
  round-trip's spec read-back.
- **Found and filed, not fixed here:** prism3's title font sets old-style figures by default, so several digits drop
  below the baseline (#2814).

### Main merge (2026-10-22)

- Code input's `status` [default, error] subset in `lint-axis-values.ts` is folded into main's identical entry for the
  choice controls (#2751), with its reason kept beside theirs.
- Main's #2714 register: the cell's child-only `whenToUse` takes the template, `onComplete` loses its code span, and the
  label pattern no longer writes an acronym in capitals.

### The one-input contract arm (review of #2789 on d3333d1e, S1)

- `#2428 code-input: the one-input contract` reads the field's and the cell's `codeOnly`, `accessibility`, `props` and
  `anatomy` against literals: exactly one `<input>`, `autocomplete="one-time-code"`, `inputmode="numeric"` matching the
  `inputMode` prop's default, one Tab stop, no `aria-label` over the value, the cells `aria-hidden` with no role and no
  focus, six cell nests in the slot, and the FieldLabel wired to the input. Before it, a change to the contract failed
  only the surface digest and the docs round-trip, both cleared by a regenerate and a re-accept.
- Main's #2926 (every field's message off by default, owner decision item 1): Code input's `showMessage` defaults off,
  boolean, prop and built node, and `code-input` joins the test's `MESSAGE_OFF_FAMILY`, as that test's header names it.
- Main's #2938 (Link current, Breadcrumbs, Search field) and #2940: the registry lists take the union, `EXECUTOR_REVISION` is 36
  over main's 35, and the artifact count is 210.
- Main's Banner (#2786) and #2932, #2931 and #2851: the registry lists take the union, `EXECUTOR_REVISION` stays 36 over
  main's 35, and the artifact count is 211. The Code Cell page sits beside the Breadcrumb Item page's new `lead`.
- `test-doc-panel`'s marker oracle read a merged repeat (×N) as one part, so Code input's second run of cells (entry 7,
  cell5–6) was checked against cell3. It now takes every part a ×N entry stands for; the drawing was right.
- **Owner decision Q-2789.3 A (2026-10-23):** Code input joins the studio's Fields section (`SETTING_SECTIONS`), and
  `test-component-groups`' rule is now "each `FIELD_FRAME_PARTS` def, or for a subcomponent the component that nests
  it, is a Fields row", the nester read from the catalog's `nests`.
- Main's Progress (#2791): the registry lists take the union, `lint-rung-names` keeps both the pinned ladder and the
  ring offset, and the artifact count is 212. The studio's Fields section opens Field options on Code input, now its
  first set.
