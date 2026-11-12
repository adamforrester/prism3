## (2026-11-12) — Adherence contamination probes: a skill glob and any-case CLAUDE.md (#3584)

The owner's allowance on #3566 (rules may be fixed until the first scored run, when they freeze) covers #3584. Both
probes now catch a read they let through.

### What changed
- `tools/agent-adherence/orchestrate.ts`, the code surface's `CONTAMINATION` list: the skill pattern was
  `/skills\/prism3-/`, so `cat skills/prism3*/SKILL.md` (a glob with no hyphen) and a Windows path passed. It is now
  `/skills[\\/]+prism3/i`: no hyphen, either slash, any case. The probe still reads tool-call inputs only, so the C1
  packet's prose mention of `skills/prism3-…` stays clean (`contamination/prose-mention`, `contamination/json-u-escaped`).
- `tools/agent-adherence/run-figma.ts` `probe`: both CLAUDE.md checks (a tool call's input, and a host-injected user turn)
  are now case-insensitive, as #3567 made `orchestrate.ts`. `find / -iname claude.md` reached the file uncaught.
  run-figma's `skills/` check already needed no hyphen.
- Arms: `contamination/glob-skill` and `contamination/backslash-skill` in `selftest.ts` (96 assertions), and
  `probe/claude-md-iname` and `probe/claude-md-lower-turn` in `selftest-figma.ts` (186). Each mutation that puts a pattern
  back fails its arms by name.

### Left open
A bare search for any `SKILL.md` (`find / -name SKILL.md`), which names no prism3 path, still passes. Voiding it would
also void a clean run that opens a host's own skill, so it is flagged on the PR as an owner decision.
