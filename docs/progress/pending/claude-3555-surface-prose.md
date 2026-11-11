## (2026-11-11) — Agent reference, served index and Figma color lines: tracker ids, labels, floors (#3555 Q-MD12, Q-MD13, Q-MD15, Q-MD16)

Part of #3555 (the 2026-11-11 metadata audit). The owner took option A on every Q-MD. This PR builds the agent-reference,
served-docs and Figma-description parts of Q-MD12, Q-MD13, Q-MD15 and Q-MD16.

- **Q-MD13 A, tracker ids in the agent reference.** Twelve agent-link command descriptions in
  `docs/public/reference/commands.json` opened with the tracker reference from their doc comment in
  `apps/plugin/src/agent-protocol.ts`: `#2265:`, `#3147 Phase 2a.`, `#3137 Q3137.7 A:`, `#3300 B.` and so on.
  `emit-agent-reference.ts` now drops a leading `#N`, the tracker qualifiers after it (a phase, an owner-question id,
  an answer letter) and its separator, and capitalizes the rest. A qualifier that carries meaning stays:
  `#2530, dev builds only: the body …` reads `Dev builds only: the body …`. The doc comments themselves are unchanged,
  since they are maintainer prose.
- **Q-MD12 A.** The `index.html` link to `llms.txt` is labeled "Agent entry point". "Agent reference" now names only
  `commands.json`, as the generator does.
- **Q-MD15 A, the Figma `border/tertiary` line.** It read "Strongest border / divider" and left out its gated floor, the
  only gated border line that did. It now states the floor the way the other lines do: "— 3:1 on background/primary".
  `lint-description-claims` holds the ratio true.
- **Q-MD16 A, register.**
  - The veil's Figma line said "Check contrast on your photo.", second person on a designer surface. It now says
    "Contrast depends on the photo."
  - The `prism3-theme` skill named the reference brand in `buttonContentSize`. It now says "a 44px button with a 12px
    label".

### Gate

`emit-agent-reference.ts` refuses to write or `--check` a reference in which any command description still opens with a
tracker id (`trackerLeads`), naming each one. The refusal reads the serialized output, not the strip function. Mutation:
the `stripTrackerLead` call was removed from `argsOf`, and `--check` failed with "would open a command description with
a tracker id", naming `update-components`, `capture-baseline`, `adopt-members`, …

### Not here

- The component-def halves of Q-MD14, Q-MD15 and Q-MD16 (the spinner and target-size citations, image-placeholder's
  Figma instruction, Badge's "never the only signal") come in the defs PRs.
