## (2026-10-14) — Figma variables: `core` primitives are hidden and unscoped, bar the font family and weight rows; `grid/columns` leaves ALL_SCOPES (#2602, owner decision Q292 A)

**What changed.** Every variable in the `core` collection is emitted with `hiddenFromPublishing: true`,
in every brand: the palette, `dimension/*`, and every `core/font/*` row, the weight-role and style-cut
rows included. Every one of them is emitted with `scopes: []` **except** `font/family/*`, which keeps
`FONT_FAMILY`, and `font/weight/*` and `font/weight-role/*`, which keep `FONT_WEIGHT` (owner decision
Q292 A, 2026-10-14). `layout`'s `grid/columns` goes from `ALL_SCOPES` to `[]`. Semantics keep their
scopes. The change is made in the three emitters (`emit-figma-color.ts`, `-dims.ts`, `-font.ts`; the
unscoped rows read one exported `PRIMITIVE_SCOPES`). The plugin's `write-figma.ts` and the paste path
(`materialise-to-figma.ts`, `mcp-steps.ts`) both write `row.scopes`/`row.hidden` off the plans those
emitters feed, so neither executor's code moved and `EXECUTOR_REVISION` is not claimed. An empty scope
code decodes to `[]` in the paste payload (`[...''] → []`).

**The diagnosis that made it small.** The PRIMITIVE comment had claimed since 2026-07-04 that
`scopes: []` behaves as ALL_SCOPES, so nothing could hide a variable from local pickers. Its evidence
was a probe in which `setBoundVariableForPaint` succeeded on an unscoped variable. That is an API bind,
and the typings say scopes "only limit the variables that are shown in pickers within the Figma UI".
The owner checked the pickers directly on 2026-10-13, on a copy of a production file: a palette step
set to `[]` left the fill picker, and its scoped neighbor stayed. The motion emitter already relied on
the correct reading. The comment, `docs/10` and the (23) test preamble are rewritten and cite the live
check.

**Why the font family and weight rows keep a scope (Q292 A).** The first build unscoped the whole
collection and failed the exporter agreement gate (`tools/exporter-comparison/gate.ts`): TokenPress
types a font variable's DTCG `$type` from its scope, so unscoped family, weight and weight-role rows
exported as `string`, `dimension` and `number` instead of `fontFamily` / `fontWeight` (69 failures over
four brands). The owner chose A over B (unscope everything and teach TokenPress to type font rows by
name) and C (accept the divergence). So those three groups stay in the font-family and font-weight
pickers and nowhere else, and the gate passes with no accepted divergence. B is filed as **#2616**,
not done here: TokenPress is the public Community plugin and a guest in this repo, so it needs its own
issue and release. Size and cut rows export the same either way, so they are unscoped now.

**Other tradeoffs.**
- **The whole collection is hidden, weight-role and cuts included.** Neither was hidden before. (23)
  used to list `core/font/weight-role/*` as visible semantic tier; it lives in `core`, and the owner's
  decision covers the collection.
- **`grid/columns` gets `[]`, not a narrower scope.** `VariableScope` (plugin-typings 1.131.0) has no
  layout-grid member, and no scope is known to show in the grid count picker. Nothing in Prism3 binds
  the variable: the grid styles bake the count as a literal.

**Gates.** A new test arm (23b) states the rules over everything that reaches a file, with literal
expectations: per-group scope sets (`["FONT_FAMILY"]`, `["FONT_WEIGHT"]`, else `[]`) and their paste
codes (`m`, `e`, else empty). It covers the in-memory emission for nb and every `examples/*.design.md`
brief, the three plugin plans, the decoded paste payloads (palette, dims-create, font-vars) and the
committed `out/figma/*` trees. Each `core` group must be represented on every path. (23), the NB font
fixture arm, `lint-cut-binding` (a cut is held to `[]`, not to FONT_STYLE) and the plugin's
`test-write` / `test-write-float` (palette and dimension primitives hidden and unscoped) moved to the
decided rule with literal expectations. Mutations, each made on a committed tree and restored after:
- `font/weight-role` drops FONT_WEIGHT → "#2602 every `core` variable is hidden from publishing and
  carries no scope, bar FONT_FAMILY on font/family and FONT_WEIGHT on font/weight and font/weight-role
  (Q292 A) … — 60 wrong", with the (23) and font-fixture arms.
- `font/weight` drops FONT_WEIGHT → the same arm, 62 wrong.
- `font/family` drops FONT_FAMILY → the same arm, 84 wrong.
- The palette regains its four scopes → the same arm, 1808 wrong.
- `grid/columns` back on ALL_SCOPES → "#2602 no emitted variable carries ALL_SCOPES …".
- The cut rows scoped FONT_STYLE again → `lint-cut-binding` fails by name.

**Trap for whoever re-verifies.** The NB palette fixture is the frozen real export, and it still
scopes every step. The fixture arm states that divergence once, as two literals (fixture four-scope
set, engine `[]`), rather than through 122 waiver rows. The font fixture is an engine snapshot, but its
scopes are no longer the oracle: emitted `core` font rows are held to the per-group literals.

**History.** The first build of this branch was made on a stale base and its single commit also
reverted #2569 (the border ladder). It was rebuilt on current `main` carrying only the #2602 files, so
#2569 is untouched here.
