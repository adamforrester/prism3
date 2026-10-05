## (2026-10-05) — UI: the Type scale and Breakpoints tooltips say their lever's description word for word (#2089)

**STATUS: branch `ui/2089-tooltip-copy`. Fixes #2089.** UI and studio tests only: no engine change, no emitted
artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. No new wording: both tooltips now carry the
owner-approved lever descriptions #2070 landed in `packages/engine/levers.ts`, copied exactly.

**What changed.** `S63.scaleTip` (`domains/type.ts`) read "How far apart the heading sizes step. …"; it now reads the
owner's 2026-10-04 wording, "Moves every heading size one step up or down the size ladder. Body, label, caption and
code stay put." `LAYOUT_DRAFT.breakpointsTip` (`domains/layout.ts`) said six or seven breakpoints run xs to 3xl, which
is wrong for six (`bpNames()` names six xs to 2xl); it now reads the `layout.breakpoints` description in full,
including "Studio keeps the first at 0px" and the default list. The issue suggested a shorter variant that kept the
Studio's "The first is always 0px"; the brief for this fix was an exact copy of the approved lever text, so the
tooltip takes the lever's sentence and its closing "The default is …" sentence too. The key stays in `LAYOUT_DRAFT`
to keep the diff to the string; its comment now says this one entry is approved text.

**The test, and why it is independent (docs/34).** `apps/studio/test-lever-tips.ts` (in `npm test`) reads
`packages/engine/schema/lever-manifest.json` from disk at test time and asserts each tooltip literal equals its
lever's `description`. The tooltips stay literals on purpose, with a comment beside each: importing the lever text
into the tooltip would make the test compare a value with itself. A missing lever key fails rather than skips.

**Mutations, each failing by name:** "one step" → "two steps" in `scaleTip` → `Type scale tooltip is
typography.typeScale's description, word for word`; "six run xs to 2xl" → "six run xs to 3xl" in `breakpointsTip`
→ `Breakpoints tooltip is layout.breakpoints's description, word for word`.

**Two comments corrected with it.** `state/layout-input.ts:17` and `test-layout-input.ts:13` paraphrased the same
wrong rule ("six or seven run xs…3xl") in code comments; both now say six run xs…2xl. Comments only, no behavior.
