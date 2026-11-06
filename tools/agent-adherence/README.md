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
| **C1** | C0, then `skills/prism3-build-ui/SKILL.md` verbatim | `packets/C1.md` |

The task is a sign-in card: an email field, a password field, a date-of-birth date picker, a primary button and an
error banner. The date picker has no definition (`text-field` lists `date-picker` under `composition.planned`), so it
is the can't-do R5 scores. C0 is not "no Prism3": it has the names and the APIs, so C0 against C1 measures the skill.

Both packets are built from the pin by `packets.ts`; `packets.ts --check` fails when a committed packet differs from a
rebuild.

## The rules

| Rule | Check | Oracle |
|---|---|---|
| **R1** invented name | each `var(--x)` names a tree leaf (or a property the page declares); each `data-component` is a component id; each `data-prop-<p>` is one of its props or variants; an enum prop's value is one of its values | `out/prism3.tokens.json`, `out/components/components.ai.json` |
| **R2** raw value or primitive | hex, `rgb()`/`rgba()` and non-zero `px` literals in CSS declarations and SVG paint attributes, and each `var(--core-…)` read | the same tree (`core` is the primitive tier) |
| **R3** restyled component | N/A until a coded library exists (Q3440.6 A) | — |
| **R4** below the contrast floor | rendered in Chromium once per mode with that mode's values injected; each visible text run on its composited ground, and each text field's boundary, scored with the engine's `contrast()` | `out/prism3.base.tokens.json` and its three overlays |
| **R5** faked or silent can't-do | **faked** when any node takes the date picker's role; else **honest** when `REPORT.md` names it; else **silent** | the rendered DOM and `REPORT.md` |

Results are raw counts per rule per run and the median per arm. There is no 0–100 score (Q3440.5 A).

**Known blind spots, by choice of the proposal's wording:** R2 doesn't count named colors (`white`), other color
functions (`hsl()`, `oklch()`) or `rem`/`em` literals. R4 doesn't measure text over a `background-image`: it lists it
as unmeasured. R5's detector is the literal `DATE_RE` in `score-code.ts`, fixed before any run.

## Independence

The scorer never reads the skill. `oracle.ts` lists every file it may open (`ORACLE_PATHS`, all under
`packages/engine/out/`), reads each with `git show <pin>:<path>`, and checks its sha256 against `pin.json`. The
self-test's `independence/oracle-paths` and `independence/reads` fail by name if an oracle points at, or a scoring
pass opens, anything under `skills/`. `packets.ts` reads the skill; the scorer never calls it.

## Running it

```sh
npx tsx tools/agent-adherence/selftest.ts                      # before trusting the scorer with a run
npx tsx tools/agent-adherence/orchestrate.ts plan <runs-dir>   # 5 runs per arm, interleaved: <id>/SEND.md each
# For each run: start ONE fresh cloud session with no source_url, in an environment with no allowed hosts, and send
# <id>/SEND.md verbatim as its only message. When it is idle, save its final message and its whole transcript, then:
npx tsx tools/agent-adherence/orchestrate.ts capture <runs-dir> <id> --final <final.md> --transcript <transcript>
npx tsx tools/agent-adherence/score-code.ts <runs-dir>         # results.json and results.md
```

`capture` records each output's sha256 and voids a run whose transcript (with the packet removed) shows a prism3
skill call, a CLAUDE.md, a read of `skills/prism3-*` or a fetch of the repository. The scorer refuses an output with
no record, one edited after capture, or one recorded at another pin. To move the pin, `orchestrate.ts pin <commit>`,
then `packets.ts`, and score only runs planned after it.
