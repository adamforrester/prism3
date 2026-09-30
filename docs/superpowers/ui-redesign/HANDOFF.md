# Handoff: Prism3 Studio + Plugin UI redesign lane

You are the **orchestrator for the Prism3 UI redesign**: the Studio web app and the Figma plugin panel, which are one shared UI. You run in your own cloud session and may start your own subagents for research, audits and implementation slices. The repo owner makes every design decision. You make the technical calls and keep the owner oriented.

## Read first, in this order

1. `CLAUDE.md` (repo root), all of it: the gates, worktrees, verification, gate independence, voice, US English, versioning, and the **decision boundary** (principle 6: design decisions are the owner's, always).
2. `docs/voice-standard.md`.
3. The inputs in this folder, `docs/superpowers/ui-redesign/`:
   - `owner-direction-2026-09-30.md`: **what the owner wants carried forward, and what is unsettled.**
   - `concept-c-workbench.html` and `concept-c-workbench.md`: the owner's current mockup and its note. It's a direction, not a spec.
   - `delta-since-brief.md`: what changed in the product since the brief. Verify each item against the code.
4. `docs/superpowers/specs/2026-09-26-ui-exploration-brief.md` (the product brief, including §7.1) and `docs/superpowers/specs/2026-09-26-ui-exploration-prompt.md` (the prompt that produced the concepts).
5. The current UI code: `apps/studio/src/` (`main.ts` is about 10,000 lines), `apps/plugin/src/` (host bridge, messages, main-thread actions), `apps/studio/README.md`, `apps/plugin/README.md`, `docs/18-plugin-and-host-architecture.md` and `docs/22-plugin-plan.md`.
6. Related open issues, read before proposing:
   - #896: make `main.ts` importable without a DOM, so it can be unit tested;
   - #1371: Studio/plugin UI parity;
   - #1195: plugin progress and status display;
   - #1675: segmented chips for 2–4 option controls;
   - #1727: studio italic and unknown-family preview;
   - #1556: the shared-UI file-setup trigger;
   - #506: opening against different file states;
   - #1807: parallel-merge conflicts. **Its outcome may change how progress entries and version bumps are recorded. Re-read CLAUDE.md before your first PR.**

## Phase 1: audit and proposal (no product code)

Deliver the following, then **stop and wait for the owner's answers.**

### 1. Mockup audit

Audit Concept C against the brief as amended by the delta, and against the product as it is today:
- **Coverage:** every lever in `packages/engine/schema/lever-manifest.json` (49 at handoff), every view (brief §5), every action (§6, including the new style guide generator and its options) and every state (§7, §7.1). Check each has exactly one sensible home. Say where the mockup is missing or misplaces something.
- **Lever grouping:** is each lever in the right domain? Propose moves, with reasons from the user's jobs (brief §2).
- **Modes:** the owner questions the placement and UX of the mode switcher and per-mode editing. Give 2–3 alternatives with tradeoffs, including how derived (read-only) modes, per-mode overrides and per-mode density (heights only) read.
- **Controls:**
  - apply the owner's rule: chips for a few options, selects for long lists;
  - apply less text, with "i" info affordances for explanation;
  - list every lever's proposed control type.
- **Rules:** check against brief §8 (warn don't block, Auto names its value, last good theme, destructive preview then confirm) and the host constraints: 380×420, offline, no web fonts, two contexts, serialized writes.
- **Accessibility of the tool (§8.5)** and **voice (§8.4)**.

### 2. Architecture assessment and recommendation

- **Measure today's structure:** how the UI is built, and how studio and plugin share it (the host adapter, the inlined `dist/ui.html`, the message bridge).
- **Recommend a module structure** for the shared UI. Should it be separated? Along what seams: state, lever rendering from the manifest, preview views, the Figma action panel, the host adapter?
- **Sequencing:** state whether to refactor first, redesign into the new structure, or strangle incrementally, and **why**.
- **Rendering approach:** cover state management and testability (#896). The repo's principle is to stay dependency-free (CLAUDE.md principle 2), so any framework or library is a decision to justify, not a default.
- **Gates:** say how the existing UI gates carry over: studio `test`, `test:smoke`, `check:ignore`, `lint:contrast`, plugin `test:verdict`, `test:start`, `lint-us-english` and `lint-voice` over the built bundles.

### 3. Questions for the owner

A short list, each with your recommendation and enough context to answer without digging.

### Format

- **The deliverable:** one markdown doc, `docs/superpowers/ui-redesign/phase1-audit.md`, in a PR titled "DO NOT MERGE — UI redesign phase 1: audit and proposal".
- **An artifact:** also publish a readable HTML summary as an Artifact for the owner to review, with the coverage table, the mode options and the architecture diagram.
- **Report back:** give a plain-language summary at the phase boundary.

## Phases after the owner answers (outline; plan them in detail then)

1. **Revised mockup (v4)**, incorporating the owner's answers, for owner review.
2. **Architecture slices:** the agreed refactor, as small PRs that change no behavior (pixel and behavior identical), each verified.
3. **Redesign slices**, built into the new structure one domain or view at a time, each behind the full gate list.

Each slice gets:
- `npm run verify` fully green;
- an independent review subagent;
- at least one mutation that fails a gate or test **by name**;
- a `docs/00-progress.md` entry, or whatever #1807 replaced it with.

## Working rules

- **PRs:**
  - Work on branches `ui/<slice>` in git worktrees (see CLAUDE.md).
  - Open PRs titled "DO NOT MERGE — …". **Do not merge.** Merges are done by the main orchestrator session or the owner, once review, CI and the owner's design sign-off are in.
- **Parallel work:** other lanes are active on `main`.
  - Merge `origin/main` before every push (no rebase, no force).
  - Take the next free ENGINE version above main and every open PR when a change needs a bump. UI-only changes may not; check the conventions in `version.ts`.
  - Never `pkill` by pattern; kill only your own processes.
- **Design decisions:** anything visual, interaction-level, a label, copy or a structure choice is the owner's. **Flag it with options and a recommendation; don't pick.** Prism3 names in brief §9 are kept exactly.
- **Public repo:** no client brand names in prose, and no model identifiers in commits or PRs.
- **Commit footer:** use the attribution lines your session's system reminder gives you.
