## (2026-11-18) — The build rules ship in their own list, docs.implementation (#2778)

**What.** Owner decision A on #2778 (Q362): implementation rules move out of `docs.do` into a new shipped
`docs.implementation` list. The schema gains the optional field. `projectDef` emits it, so it reaches
`components.ai.json` and the component-defs export. The doc section model's "Building it in code" section, which
already reserved the slot, draws it before the props table. `lint-component-docs` counts it as a source of that
section and strips it in its F3 arm. Both authored schemas take a minor bump: `prism3-component-docs/1.2` and
`prism3-component-defs/1.6`. The build-component skill states the test that sorts a rule into `do`/`dont` or
`implementation`. 93 lines in 39 definitions moved, word for word, and comments travelled with their lines.

**The classification.** The orchestrator's proposal (on #2778, against an older main) classified every item. Its
"Impl." calls are carried over where the line still matches: 152 exactly and 33 after small rewording. 99 lines are
newer than the proposal, or were reworded past matching, and were classified here with its rubric ("only someone
writing the component's code acts on it"). 21 of those moved: focus-ring's field offset, the three Buttons'
`buttonContentSize` line, Tab's selected-from-value, Counter's code-side hit area, Pagination's two ownership and
focus lines, Search field's landmark, focus-return and cancel-glyph lines, four Card number field lines, Banner's
focus after dismiss, both Slider thumb lines, Slider's `onChangeEnd`, Code input's paste handling and Page nav's
landmark name. Lines both readers act on stay in `docs.do`, as the proposal recommended (Button's flush line among
them, so #2408's gate is unchanged).

**Held for the owner (on #2778).** Four calls the decision did not fix, each built as recommended:
1. **The 48 implementation don'ts stay in `docs.dont`.** A don't moved word for word into a list of imperatives
   reads as its opposite ("Draw the ring on the host's own border"), and the decision said move, not rewrite.
   Options: leave them (built); add `implementation` as a `{ do, dont }` pair; or reword each as "Never …" in the
   flat list. Recommendation: the "Never …" rewording, as its own PR once the owner agrees to the wording change.
2. **The flat list**, not a `{ do, dont }` pair (the proposal's decision 3). Built.
3. **The 21 new calls above**, and Card number field's "warn, rather than block" and Pagination's "give pages an
   address", which were judged Both and stay.
4. **The Figma panel** still leaves "Building it in code" out (`PANEL_OMITS`, per the wireframe), so the list ships
   to the docs page and the payloads but not the panel. Recommendation: keep it that way.

**Gates that moved with the text.** `lint-hit-target`'s `CODE_SIDE_DOC` (the flush icon buttons' and Slider thumb's
44×44 line) reads `docs.implementation` now. The test's live Q362 code-span exemption follows its seven Button lines
to their new paths. #1712's field-message scan reads the new list too.

**Measured.** A new `test.ts` #2778 block holds four representative lines in `implementation` and not in `do` in
the def, in `components.ai.json` and on the page. It names the 39 defs that carry the list and requires that no
line is in both lists. On main five of its six arms fail (the sixth, no line in both lists, holds trivially there). With the change all pass. Mutation: Checkbox.Group's value-array
line put back in `docs.do` fails "#2778 checkbox-group: the build rule ships in docs.implementation…" by name.
The shipped schema moves (additive); the token-name surface does not, so `CONTRACT_VERSION` is untouched.
