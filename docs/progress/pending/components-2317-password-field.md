## (2026-10-14) — Password field: TextField's factory, a nested Show button on the label row (#2317, Q301)

**What landed.** TextField's def is now the first output of a shared field factory, `makeTextField` in
`components/text-field.ts` (Q301.8 A, the `makeButton` pattern), and `password-field` (PasswordField) is the second:
84 members (size × status × the seven field states), no visibility axis (Q301.6 A), its own page under Components
(Q301.9 B). The box loses TextField's trailing slot; the label sits in a row with a nested Button at its end, outside
the box (Q301.2 B): text appearance, flush, primary, emphasis weight (Q301.3 B), its size following the field's. The
default member is the hidden state, "••••••••" and "Show" (DRAFT). The code contract (Show/Hide plus a visually hidden
" password", `aria-controls`, the polite "Your password is shown" / "Your password is hidden", focus kept on the
button, `type` password↔text, autocomplete required, paste never blocked, `::-ms-reveal` hidden, back to hidden on
submit) is in `codeOnly` and `accessibility`.

**The factory is byte-identical for TextField, proved before anything else moved.** The refactor commit serialized
`textField` before and after and compared the bytes; `regen --check` moved no TextField artifact and the surface and
renames baselines did not move for it. One later TextField edit is content, not the factory: `password-field` left
`composition.planned` for `alternativeTo`, because the component-refs gate refuses a registered def in `planned`.
The factory has ONE structural switch, `edge: 'trailing-glyph' | 'toggle'`, and nothing for Number input or Card
number: they add their own when they build. The eight code-only entries the two fields share are written out in each
def, because the plugin build cuts every `codeOnly` entry to its subject and refuses one that is not a string literal
(`strip-maintainer-prose.mjs`); a shared constant was tried first and broke the plugin build. `test.ts` holds the
shared entries identical in both defs instead, so a fix to one that misses the other fails by name.

**Two engine pieces the toggle needed, and why each is the shape it is.**
- `NestingRelation.atState`. The toggle must go disabled with the field and stay at rest everywhere else, read-only
  included. `follow: ['state']` cannot do it: the field's seven states are not Button's six (`filled` and `read-only`
  have no Button member). `atState: { disabled: { state: 'disabled' } }` maps the one host state that moves it.
  Projector-only (the plan carries the resolved coordinate), validated (a state off the axis, an axis the variant
  does not name, a followed or exposed axis are each refused by name).
- `PartDef.nestTexts`, the technical risk the proposal named. Exposing the nested Button surfaces its `label` on the
  field's panel (how a designer sets "Hide"), but a set has ONE default per text property, so the nested Button read
  "Button" on every member. Both executors now write `nestTexts` onto the instance with `setProperties` (the property
  found by its name before Figma's `#id`, TEXT only; a missing one is a named miss). `EXECUTOR_REVISION` 24: main reached 23
  (#2591, #2657, #2652) before this landed. The round-trip reads the value back (`nestTexts` predicate, 168 instances), the paste payload's
  own read-back is in `test.ts` beside the exposure write, and both shims model `componentProperties` from the NESTED
  def's declared texts, never from the host's override. This also unblocks List's ordered numbers (#2319's held
  follow-up), not taken here.

**Emphasis weight is Button's text appearance, not a new axis.** Button's text appearance already binds
`type.label.*.emphasis-link`, the weight Q289.3 gave the standalone Link. So Q301.3 B needs no weight field on the
nest; `test.ts` pins the nested member's resolved label style (`label/sm|md|lg/emphasis-link`), so a Button change to
the default weight fails the Password field's assertion by name.

**Hit target.** `lint-hit-target.ts` now measures a nested control with no side of its own through the NESTED def's
tokens at the size the host nests it at (the toggle: Button's `size.md.height`, 44), and requires a host of a nested
flush Button (`FLUSH_NESTS`) to state the code-side 44×44 / 24×24 rule in its own `codeOnly`, with Button's phrases.

**Traps for whoever re-verifies.** The paste shell grew with the `nestTexts` code, so icon-button packs into 17
chunks, not 16 (re-pinned with a note). The label row is `align: 'center'`: right for a one-line label beside a
44px button, and a wrapped label centers the button on the block; field labels are three words at most by their
content rule, so this was left as is and is the place to look if a long label reads oddly. Whether the live host keeps
a nested instance's text override when a designer swaps a placed field's variant is unverified (the standing nesting
caveat; `notes.unverified`).

Fix round (owner decision Q312, 2026-10-15). Q312.2 A: the "(DRAFT)" marker leaves the two strings that ship
(`accessibility.aria` and `docs.contentGuidelines`, which reach `password-field.md` and `components.ai.json`); it stays
in the file header, `notes` and `codeOnly`. `test.ts` walks every string on the def except `notes` and
`anatomy.codeOnly` and fails on "DRAFT", so a new field is covered without a list to keep. The review's keyboard nit
was mechanical: the KEYBOARD MODEL entry was TextField's copy and named Escape-to-clear, which this field does not
have; the clause is removed (nothing added), and the entry leaves the factory's shared code-only list in the test with
an assertion of its own. Q312.1 A (layer name `toggle`) and Q312.3 A (weight follows Button) needed no change. The
`codeOnly` "(DRAFT)" still reaches `schema/component-maintainer.json`, a maintainer file; left per the decision's scope.
