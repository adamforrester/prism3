## (2026-11-19) — The Button spec supplement: what Spectacular can't see, keyed to what it writes (#2996)

**What.** The first slice of the hybrid the owner chose for #2996 (Q2996.1 A, Q2996.4): Spectacular is every
component's base spec, and Prism3 writes a supplement for its own components. `emit-spec-supplement.ts` writes
`out/specs/button.supplement.yaml` (engine {{ENGINE_VERSION}}). Its keys are Spectacular's names for the same Button:
`root`, `label`, `leadingVisual`, `trailingVisual`, `spinner` and `focusRing`, and the ten props from `appearance` to
`swapTrailingIcon`. Under `$extensions["com.prism3"]` it carries accessibility, the hit target per size (#4047's floor,
which no other emitted file carried), the code-only props, states and axis, the sync boundary, motion with its token
names, each element's RTL rule, and each element's tokens keyed by the exact `$token` path Spectacular prints
(`color/pds3/color/interactive/primary/fill/rest`). Each one maps to its DTCG path and its shipped `--pds3-` CSS name.

**How it stays a projection.** Nothing is authored for it. It composes `projectDef` (the shipped def fields),
`componentSpec` (the parts' bound tokens, the ring, the motion bindings, the axes with their Figma names) and the def's
`figmaProperties`, and it resolves names from the house brand's own Figma emission in memory.

**The gate.** `lint-spec-supplement.ts` reads a trimmed, hand-copied fixture of Spectacular's real output for the
template file's Button (`fixtures/spectacular/button.yaml`, from RESULT 83b), the authored token contract and the
committed supplement, and imports nothing from the engine. It parses both YAML files with its own reader. It fails by
arm: an element or prop Spectacular doesn't emit, or one it does emit with no entry; a Figma name that disagrees; a
`$token` path with no mapping, or one mapped to the wrong token; a code name outside the contract or not stock Style
Dictionary's spelling; and a code-only prop or state, hit target, motion or RTL block gone missing.

**A limit found on the way, measured against the published schema.** Spectacular's prop `$extensions` is open. An
anatomy element's admits only `com.figma`, and the api document admits no top-level `$extensions`. So the supplement
is a file beside `api.yaml`, keyed to it, not a patch to merge into it. A strict validator would reject a merged
document. This is an owner decision on #2996, along with the field names, the path and the payload class.

**Not done here:** the canvas JSON block (Q2996.3 B) is a later slice. The supplement is plain JSON-able data so it can
be dropped onto the canvas unchanged. Only Button gets a supplement.
