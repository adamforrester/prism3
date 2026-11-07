## (2026-11-07) — Code POC docs: arm 1's decisions recorded, and build-component stops claiming code it does not have (#3408 S0)

**What changed.** The code POC's arm 1 scope (#3408) was approved on 2026-11-07 with one condition (Q101 A): the docs land before any code. This is that docs PR. Docs and skill text only; no engine behavior moves, so there is no change note.

- **Six decisions, each a `Decided (2026-11-07, #3408)` heading in the doc that owns it, with an index row in `docs/42` and a baseline row in `decisions-index.json`:**
  - `docs/35` §9.1: arm 1 ships `@prism3/web-components` and `@prism3/css` (Q83 A, Q87 A).
  - `docs/35` §9.2: the class and custom-element prefix is `p3-` (Q97 A).
  - `docs/35` §9.3: `packages/tokens` also builds a shippable token output (Q99 A).
  - `docs/41` §7.1: the POC's behavior is native HTML plus a small script (Q86 A).
  - `docs/19` §10.1: arm 1's packages are generated from the defs export, with a parity gate (Q96 A).
  - `docs/19` §10.2: `password-field` is a third top-level component (Q100 A).
- **`docs/19`:** a dated POC note in the framing block. The POC's code target is web components plus vanilla HTML/CSS, not React. §3's ranking is deliberately not re-ranked until the POC reports. Notes in §2 and §8 say `@prism3/components` is superseded for the POC, and #256 is re-scoped into it.
- **`docs/35`:** `react` and `core` are marked outside the POC's scope under §2's tree and in §4. The tree itself is left as drawn, because the doc treats it as a dated proposal. §2's "a gate we run rather than something we ship" is amended per Q99 A.
- **#884 is done in the same PR:** `35` and `41` now point at each other in their framing blocks. `35` owns the naming and layout, and `41` owns what crosses the boundary.
- **`docs/41` §7.1** also records that the POC's ejected client is the first fixture for the conformance checker (#879).
- **`skills/prism3-build-component`:** the description, the opening paragraph and the `nest-exposed` note no longer say a def projects into Web Components / React, Storybook or Code Connect today. They say the def reaches Figma, docs and `.ai.json`, and that code, Storybook and Code Connect are planned (#3408).

**What stays open, named where a doc must:** Q95 (plain custom elements or Lit 3) in `docs/19` §10, and Q98 (the CSS custom-property prefix) in `docs/35` §9. §9.2's `p3-` covers classes and elements only and does not decide Q98. Q99's versioned token package is the POC's working answer to #253, and #253 stays open until the POC reports.

**A trap for whoever re-verifies this.** `lint-decisions-index.ts` checks `decisions-index.json` against the headings, not the markdown table in `docs/42`. A heading whose `docs/42` row is missing still passes, so the six table rows were checked by hand against the six headings.
