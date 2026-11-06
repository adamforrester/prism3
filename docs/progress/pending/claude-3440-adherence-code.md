## (2026-11-06) — Agent adherence, code surface: the scorer, the packets and the orchestrator (#3440)

The first slice of #3440's single agent-adherence test, under the owner's Q3440.1–.6 (all A). `tools/agent-adherence/`
holds the scorer, its self-test, the C0 and C1 packets and the orchestrator for the code surface. A tool, not a gate.

- **The rules.** R1 (invented name), R2 (raw value or primitive), R4 (below the contrast floor) and R5 (faked or
  silent can't-do), as the proposal specifies them. R3 is N/A until a coded library exists. R4 renders the output in
  Chromium once per mode, with the mode's token values injected as custom properties, and scores the computed colors
  with the engine's `contrast()`, never the agent's declared pairs (`docs/34` shape 1).
- **Independence.** The scorer reads only `packages/engine/out/`, at a pinned commit (`pin.json`, with each file's
  sha256), through `git show`, so a later regen can't move a score. The self-test fails by name if an oracle points at
  the skill or a scoring pass opens `skills/`.
- **The slice, measured.** The six task components' whole entries are 59.7 KB of the 521 KB `components.ai.json`;
  the 820 token names are 21.7 KB. C0 is 98 KB and C1 120 KB.
- **The trap the self-test caught.** A raw hex or `rgb()` value is also a contrast failure in the modes it doesn't
  follow, so the first R2 fixtures failed R4 too. Each bad fixture now plants its raw value where no contrast is
  measured, so every arm fails by one rule only.
- **The arms differ in two things.** C0 is an exact prefix of C1, and C1 adds the skill and the line "Follow this
  skill." that introduces it, so a difference measures the skill as framed by that line.
- **Review fixes.** Contamination now reads tool calls only, never prose, so a C1 run is no longer voided for an
  escaped packet or a mention of the `skills/prism3-rebind/…` path C0 never sees; `Grep`, `Glob`, `Agent` and `Task`
  count as reads. Static arms read the source of the scorer and of every local module it imports (`oracle.ts` today),
  each with its own allow-list, because the read probe saw only `readPinned`; a module with no allow-list fails. R5's report regex reads `dob`, `birthday` and `birth date`, and
  only an interactive node can be called faked by its id or class.
- **Owner's to confirm, built as their recommended A in revertible commits:** Q1, a substitute the report discloses
  stays faked; Q2, two or more selects or numeric inputs grouped as one entry are faked.
- **Known blind spots** are listed in the README: R2 skips negative lengths; R4 doesn't measure `div role=textbox`
  fields or button boundaries, and doesn't composite partial opacity.
- **Not in this PR:** the runs themselves, and the Figma surface.
