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
- **Not in this PR:** the runs themselves, and the Figma surface.
