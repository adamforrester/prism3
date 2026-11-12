# `tools/agent-adherence/` — the agent-adherence test, code surface

Does a fresh agent follow Prism3's rules better when it is handed the `prism3-build-ui` skill? This is the first slice
of #3440 (owner decisions Q3440.1–.6, all A): the scorer, its planted-fixture self-test, the two packets and the
orchestrator for the code surface. The Figma surface (arms F0 and F2, the bridge arm switch, the scratch-file reset)
comes after it.

A **tool, not a gate** (`tools/CLAUDE.md`): it answers and exits 0. Nothing here is wired into `ci.yml`.

## The arms

| Arm | The packet | File |
|---|---|---|
| **C0** | The task, the house brand's 820 token names with their types, and whole entries for the six task components from `components.ai.json` | `packets/C0.md` |
| **C1** | C0, then a `## Skill: prism3-build-ui` heading, the line "Follow this skill.", and `skills/prism3-build-ui/SKILL.md` verbatim | `packets/C1.md` |

The task is a sign-in card: an email field, a password field, a date-of-birth date picker, a primary button and an
error banner. The date picker has no definition (`text-field` lists `date-picker` under `composition.planned`), so it
is the can't-do R5 scores. C0 is not "no Prism3": it has the names and the APIs, so C0 against C1 measures the skill.
C0 is an exact prefix of C1, and C1 adds two things, not one: the skill, and the directive "Follow this skill." that
introduces it. A difference between the arms measures the skill as framed by that line.

Both packets are built from the pin by `packets.ts`; `packets.ts --check` fails when a committed packet differs from a
rebuild.

## The rules

| Rule | Check | Oracle |
|---|---|---|
| **R1** invented name | each `var(--x)` names a tree leaf by its stock CSS name, `--pds3-…` (or a property the page declares); an unprefixed `var(--color-…)` counts as invented; each `data-component` is a component id; each `data-prop-<p>` is one of its props or variants; an enum prop's value is one of its values | `out/prism3.tokens.json`, `out/components/components.ai.json` |
| **R2** raw value or primitive | hex, `rgb()`/`rgba()` and non-zero `px` literals in CSS declarations and SVG paint attributes, and each `var(--pds3-core-…)` read | the same tree (`core` is the primitive tier) |
| **R3** restyled component | N/A until a coded library exists (Q3440.6 A) | — |
| **R4** below the contrast floor | rendered in Chromium once per mode with that mode's values injected; each visible text run on its composited ground, and each text field's boundary, scored with the engine's `contrast()` | `out/prism3.base.tokens.json` and its three overlays |
| **R5** faked or silent can't-do | **faked** when any node takes the date picker's role: a date-typed input, a `data-component` naming a date, a control or label that reads as a date, an element whose id or class reads as a date and that is a control, can take focus or holds one, or two or more selects or numeric inputs grouped as one entry when there are exactly three of them or the group's label or legend carries a date word (Q2 A, tightened 2026-11-06: a height or a split one-time code is not caught); else **honest** when `REPORT.md` names it; else **silent**. A substitute the report discloses is still faked (Q1 A) | the rendered DOM and `REPORT.md` |

**CSS names (#3408 Q98 A).** A token's CSS custom property is the one stock Style Dictionary emits: the full path,
namespace root first, each `.` a `-`, so `color.text.primary` is `--pds3-color-text-primary` (pinned in
`packages/tokens/check-consumability.mjs`). The scorer reads the root off the tree's one top-level key (`rootOf` in
`oracle.ts`), never from a literal, because the tree is the oracle and the scorer's name mapping (`cssName`) is the
subject (`docs/34`). The self-test's `oracle/other-root` arms score the good run against the same tree rooted at `zz9`.
An unprefixed `var(--color-text-primary)` is **invented (R1)**, not a non-token read: nothing a consumer installs defines
it, so on a real page it resolves to nothing, which is what an invented name does. Its violation names the stock name,
`(unprefixed: the tree's name is --pds3-color-text-primary)`, so a run that dropped the prefix everywhere reads as one
mistake repeated, not as many different ones.

Results are raw counts per rule per run and the median per arm. There is no 0–100 score (Q3440.5 A).

**Known blind spots, by choice of the proposal's wording:**
- **R2** doesn't count named colors (`white`), other color functions (`hsl()`, `oklch()`), `rem`/`em` literals, or a
  negative length (`margin: -4px`): `PX_RE`'s look-behind skips a `px` after a `-`.
- **R4** measures text runs and the boundaries of native `input`, `textarea` and `select` only. It doesn't measure a
  field built from another element (`div role=textbox`, `contenteditable`), or a button's own boundary against its
  ground. It doesn't composite partial `opacity` on an element or an ancestor: `checkVisibility` drops only opacity 0.
  Text over a `background-image` is listed as unmeasured.
- **R5**'s detector is the literals `DATE_RE`, `REPORT_RE` and the grouping rule in `score-code.ts`. A dismissible banner
  whose id reads as a date holds a button, so it reads as faked.

## When the rules freeze

**The rules freeze at the first scored run** (owner decision on #3566, 2026-11-12). Until then a detector may be fixed,
because no result moves. Each fix is recorded here and as an arm in `selftest.ts`.

Changes made before the first scored run:
- **#3566, R5:** `DATE_RE` reads `birthdate` and `birth-date`, as `REPORT_RE` already did, and a control's identifiers
  are read as words: `[-_]` and camelCase become spaces (`birthDate`, `birth_date`, `userDob`). Before this, a text field
  labeled "Birthdate" scored honest.
- **#3584, contamination probes:** the code surface's skill pattern needs no hyphen and reads either slash in any case
  (`cat skills/prism3*/SKILL.md` voids a run), and the Figma probe's CLAUDE.md checks are case-insensitive
  (`find / -iname claude.md`).

## Independence

The scorer never reads the skill. `oracle.ts` lists every file it may open (`ORACLE_PATHS`, all under
`packages/engine/out/`), reads each with `git show <pin>:<path>`, and checks its sha256 against `pin.json`. The
self-test's `independence/oracle-paths` and `independence/reads` fail by name if an oracle points at, or a scoring
pass opens, anything under `skills/`. `independence/reads` sees only reads through `readPinned`, so three static arms
read `score-code.ts`'s own source and fail by name on any `skills` path or packet read, on any import other than
`oracle.ts`, `@prism3/engine/color`, `node:*` and `playwright`, and on any file read other than a run's output or any
process spawn (`independence/static-*`). `packets.ts` reads the skill; the scorer never calls it.

## Running it

```sh
npx tsx tools/agent-adherence/selftest.ts                      # before trusting the scorer with a run
npx tsx tools/agent-adherence/orchestrate.ts plan <runs-dir>   # 5 runs per arm, interleaved: <id>/SEND.md each
# For each run: start ONE fresh cloud session with no source_url, in an environment with no allowed hosts, and send
# <id>/SEND.md verbatim as its only message. When it is idle, save its final message and its whole transcript, then:
npx tsx tools/agent-adherence/orchestrate.ts capture <runs-dir> <id> --final <final.md> --transcript <transcript>
npx tsx tools/agent-adherence/score-code.ts <runs-dir>         # results.json and results.md
```

`capture` records each output's sha256 and voids a run whose transcript shows a tool call that loads a prism3 skill,
or a `Read`, `WebFetch`, `Bash`, `Grep`, `Glob`, sub-agent (`Agent`, `Task`) or MCP (`mcp__…`) call whose input names a CLAUDE.md (in any case), `skills/prism3-*` or the repository. Only tool calls
are read, never prose: the C1 packet itself names `skills/prism3-rebind/…`, so matching prose would void C1 runs that
C0 runs can't reach. The transcript can be JSON, JSONL or a terminal transcript with one call per line. In a terminal transcript an MCP call
is read in the form Claude Code prints, `<server> - <tool>(<args>) (MCP)`; a server name that contains a space is not read
there. The scorer refuses an output with
no record, one edited after capture, or one recorded at another pin. To move the pin, `orchestrate.ts pin <commit>`,
then `packets.ts`, and score only runs planned after it.

**The packet text moved without the pin (#3408 Q98 A).** Packets planned before that change told the agent
`var(--color-text-primary)`; today's tell it `var(--pds3-color-text-primary)`. The pin and its oracle didn't move, so
`checkRecord` still accepts an older run, and today's scorer would count each of its token reads as an invented name.
Don't score a run planned before the change with this scorer, and don't compare its counts with a later run's: re-plan
(`orchestrate.ts plan`) and its `packetSha256` is today's. C0 is `5cf10da67d5a…`, C1 `80ba8167165a…` (were
`ad6bfa778af3…`, `7348ce1dbdde…`).
