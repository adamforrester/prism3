## (2026-10-01) — The mode audit's badge check is green on main and gates in CI; three unbadged sections are filed, not excused (#1887)

**STATUS: PR open from `lane/mode-audit-badges`, labeled DO NOT MERGE.** Studio test tooling, CI and docs only: no ENGINE bump, no CONTRACT bump, no change note. `apps/studio/src/**` is untouched, because it is frozen for the UI redesign lane.

**What was wrong.** `npm run -w @prism3/studio audit:modes -- --check-badges` was red on `main`: five mismatches on harbor, six on aurora. #1897 put the audit in CI without the flag for that reason. Each mismatch was diagnosed on its own, and they had two causes.

- **The audit was wrong: Density & size, Tempo, and aurora's Icon colors.** `probeSection`'s `poke` had no radio case. A radio fell through to `e.value = \`${e.value}~\``, and `change` fired on the radio already checked. The chip groups (#1675) read their option from a closure, not from `value`, so that re-picked the current option and the brand never moved. The reverse error was worse, and it was silent: Control shape's chips "proved" editable on `main` without their value changing. Re-picking a lever whose default is not stored in the brand writes the default explicitly, so the persisted blob moved anyway.
- **The studio was wrong: Links, Control shape and Buttons render no badge.** `SECTION_MODE_SCOPE` (`main.ts:755`) has no entry for any of them, so `attachModeBadges` skips them. The audit's measurement checks out against the source. Links' per-family picker writes `overrides[currentMode]`, so `per-mode` is correct. Control shape and Buttons are global levers (`csLeverStack(…, false)`), so `all-modes` is correct. This fix touches `main.ts`, so it is filed for the UI lane as **#1912** rather than made here.

**What changed.**
- **`poke` checks a different member of the radio's group** and fires `input`/`change` on that member. An unnamed radio counts as a group of one, so it reads `single-option` (unproven, never proven).
- **`KNOWN_BADGE_GAPS`**: three literal rows, each tagged with #1912. A row excuses only an exact match on page, section, expected badge and rendered badge, so if a section's measurement changes, that is a new mismatch. **A row that does not occur fails the run, naming the row and its issue.** So when the UI lane adds the map entries, CI goes red until the same PR deletes the rows.
- **CI runs the flag.** The `ci.yml` step is renamed to "Studio mode audit: its instrument, and every badge against what it measures (#1897, #1887, removed at S13)" and runs `audit:modes -- --check-badges`. The `verify.ts` row matches it, and the `CLAUDE.md` §4, `CONTRIBUTING.md` §3 and PR-template lines say what the flag adds. S13 still deletes all of it.

**Measured.** `--check-badges` exits 0 on harbor, aurora and prism3. Each run shows 49 sections compared, 3 known gaps (#1912), 46 badges inside their padding, 17 editable sections that provably move the brand, and 3 skipped controls that provably do not.

**Mutations** (each after a `wip:` commit; bundle mutations were checked non-empty with `cmp` and the bundle restored byte-identical afterward):

| Mutation | Fails | By name |
|---|---|---|
| Built bundle: `'Corner radius': 'per-mode'` → `'shared'` | `audit:modes -- --check-badges`, exit 1 | `Size & radius / Corner radius — measured EDITS -> expected badge 'per-mode', page renders 'all-modes'` |
| Remove the radio branch of `poke` (the old audit) | same, exit 1 | `Size & radius / Density & size: badged 'per-mode' but NO control here moves the brand`, and `Motion / Tempo: …` |
| Built bundle: add `'Links': 'per-mode'` (the #1912 fix, simulated) | same, exit 1 | `STALE known gap #1912: Interactive / Links … the page renders 'per-mode'. Delete the row from KNOWN_BADGE_GAPS` |
| Known row for Links says `expected: 'all-modes'` | same, exit 1 | `Interactive / Links — measured EDITS -> … NO BADGE` (not excused) plus `STALE known gap #1912: Interactive / Links` |

**Traps for whoever re-verifies.**
- **Links measures `EDITS` through an option label, not a control count.** Light and Dark show the same eight selects. What differs is the `Auto · primary 600` / `Auto · primary 450` readout in the per-family pickers, because the resolved default rung differs per mode. The verdict is right, since those pickers do write per mode. But a global select whose `Auto` label showed a per-mode readout would measure `EDITS` too. That is the signature's case 3 from the header, and it is worth knowing before trusting an `EDITS` on a new section.
- **Nothing checks that CI passes `--check-badges`.** `lint-doc-gates.ts` matches a step by script and workspace, not by flags, so deleting the flag from `ci.yml` and `verify.ts` would leave every gate green. This is the same blind spot as any other step argument, and it is noted here instead of being widened, because S13 deletes the step.
- **CI runs the default brand only (harbor).** The three brands measured the same here, but on `main` they did not (aurora's Icon colors), so a brand-specific regression would show up only in a local run on that brand.
