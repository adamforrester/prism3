## (2026-11-11) — Agent and contributor docs: factual corrections and dead pointers from the hygiene audit

A read-only audit of the agent-facing and contributor docs against `main` at `ed24ef3f` found statements the code had moved past. This PR corrects only those, with no rule added, removed or reworded in meaning. The tightening of CLAUDE.md and CONTRIBUTING.md is a separate draft for the owner.

- **CLAUDE.md**, layer table: `tools/` is "not wired into `ci.yml`", yet two of its gates are (`exporter-comparison/gate.ts`, `claude-md-freshness/mutations.sh`), as principle 4 already says. The row now names both.
- **tools/CLAUDE.md**: "the remaining harnesses have no gate sibling" (five of them do, each named in its own section); "the gate count stays 60" (verify lists 97, and its header says not to count); "a fourth harness, undocumented until now" (it is the fourth of 14); "`gate.ts`'s seven arms" (gate.ts has nine `ARM` blocks and states no count). Each is reworded to name, not count.
- **CONTRIBUTING.md**: "the four working principles" (there are six); the pure-fold file list leaves out the release notes, which `FOLD_WRITES` and §2's own step 6 include; "Thirty-odd gates"; "the two skills that exist" (five); `lane:emitter`'s fate is "above" (it is under History, below).
- **.claude/commands/review-pr.md**: `cd web` (no `web/` since #651) becomes `cd apps/studio`. The Vercel-inputs bullet left out `apps/plugin/src/causes.ts` (#3326) and `docs/public/` (#2637), and called `packages/engine/out/**` a non-input, which it is not: `out/` is not in `EXCLUDED`. It now points at `vercel-ignore.sh`'s `PATHS` as the authority.
- **apps/studio/README.md**: `npm install … or from web/` becomes `npm ci` from the root. Engine imports are by name (`@prism3/engine/…`), not by relative path. The site build also reads `causes.ts` and copies `docs/public/` plus the guide pages. The stale "13 of 44" engine-file counts are removed.
- **apps/plugin/README.md**: five pre-#650 `engine/…` paths gain `packages/`.
- **packages/engine/README.md**: `regen.ts` writes more than "out/** + 3 schema files + 2 reports". The comment now points at its artifact lists and `EXPECTED_ARTIFACTS`, without restating the count.
- **docs/30**: the contract-history table gains its four missing rows (14.8.0, 14.11.0, 14.14.0, 14.15.0), read from the CONTRACT changelog in `version.ts`.
- **Comments**: `version.ts`'s header said a PR never edits "the changelog below", which moved to `CHANGELOG.md` (Q319.3). `lint-schema-classification.ts` quoted a CLAUDE.md sentence that left in #1312; its header now says so.

Not changed, and why: `apps/tokenpress/README.md` names a `vite.config.ts` that doesn't exist. That package is a guest, so the edit is left to its own lane. CONTRIBUTING §6's label set (40 live labels against the "15 are the whole set" text, and `type:bug` used by §4 but absent from §6) is a policy question, raised in the hygiene draft PR. Comment and doc text only: no change note.
