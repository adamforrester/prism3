## (2026-11-16) — The skill, the adherence scorer and the studio stylesheet say 14pt bold, like the sidecar (#3595)

**What.** #3588 moved the sidecar's bold large-text threshold to 18.67px (14pt is 18.667px; 18.66px is 13.995pt, #3555
F7). Three places it did not touch still said 18.66px:
- `skills/prism3-build-ui/SKILL.md`, the self-check's `large-text` kind, now says 18.67px, the figure the sidecar it
  points agents at states.
- `tools/agent-adherence/score-code.ts`'s `kindOf` scored 18.66px bold as large. It now compares with `14 * 96 / 72`
  rather than the written 18.67, because the scorer reads a computed size: a true 14pt bold computes to 18.6667px, which
  `>= 18.67` would score as body text. The selftest's mutation of `kindOf` to `>= 18.67` shows that, by name.
- `apps/studio/src/styles.css`'s #355 comment, which ships in the bundle, now says 18.67px.

The frozen packet copy (`tools/agent-adherence/packets/C1.md`) records what was sent and stays as it is. The browser
checks (`test-chrome.mjs`, `test-smoke.mjs`, `test-start-screen.mjs`) are #3588's stated exclusion and are not touched.

**Measured.**
- `test.ts` gains a #3595 arm: every committed sidecar states one `bold_min_px`, and each "<n>px bold" in the skill and
  the stylesheet is that value. The oracle is the emission and the subject is hand-written, so neither derives from the
  other. On main it fails twice, once per file; with only the skill reverted it fails once, naming the skill.
- `selftest.ts` gains `R4/bold-below-14pt` (18.66px bold tertiary text is held to 4.5:1) and `R4/bold-at-14pt` (14pt
  bold is held to 3:1). On main the first fails. `kindOf` at `>= 18.66` fails only the first, and at `>= 18.67` only the
  second.

No engine behavior moves and no artifact changes, so there is no change note.
