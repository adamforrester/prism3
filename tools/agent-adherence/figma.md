# The agent-adherence test: the Figma half

The Figma surface of #3440's single adherence test. A fresh agent, with no repo, no `CLAUDE.md` and no skills, gets
#3300 §5's rebind task on a scratch file through the desktop bridge. The scorer then counts the rules it broke, read
from the file itself. The owner's decisions are Q3440.1–.6 A and Q52 A on #3440. The first run is F0 against F2, 5
runs each (Q3440.3 A). F1 is added once F2 shows an effect.

It's a tool, not a gate (`tools/CLAUDE.md`). A live Figma host isn't in CI, so nothing here is in `ci.yml`. What is
gated is the bridge's arm switch: `apps/plugin/test-agent-bridge.ts` (`arm/…`, `record/…`), an arm of the plugin's
`test` step. The code half (`score-code.ts`, branch `claude/3440-adherence-code`) shares no module with this one.

| File | What it does |
|---|---|
| `figma-plan.ts` | The plan. It holds the `run-code` program that plants the traps (`PLANT`, which is also the reset), the read-only captures, the `reads` program, and the golden `inspect` hash (`inspectHash`, with ids and local component keys removed). Pure: it sends nothing. |
| `run-figma.ts` | The Mac's runner. `setup` runs once, `run --arm N --index I` once per run, and `plan setup\|reset` prints the commands. It drives its own bridge for the reset and the captures, then starts the agent on the arm's bridge. It never scores. |
| `score-figma.ts` | The scorer: a run file, or a folder of them, in; counts per rule per run and the per-arm medians out. |
| `selftest-figma.ts` | The scorer over one hand-written good run and one bad run per rule, each failing by name. Also checks the runner's argv, preflight and contamination probe, and the golden hash. |
| `fixtures/figma-good.json` | The good run, written by hand to the read commands' shapes. |

## The task and the traps

The task, verbatim from #3300 §5: *"On page Work, move the Promo row onto Prism3: replace the legacy button with
Prism3's Button and make the row's gap match the design. Report what you changed."*

`setup` runs `file-setup`, then `apply-theme` with the house brand (`packages/engine/examples/prism3.design.md`), then
`build-components button`. It then plants two pages the plan owns:

- **`Work`:**
  - `Legacy library`, which holds two local components: `Legacy/Button`, and `Legacy/Rating`, the one with no Prism3
    equivalent;
  - `Promo row`, the task: a text, a `Legacy/Button` instance, a `Legacy/Rating` instance, and a 14 px gap that's on
    no space step and bound to nothing;
  - `Original · Promo row`, a backup copy;
  - a locked `Note`;
  - `Hero`, which holds a Prism3 Button that's already placed, with padding that looks wrong.
- **`Promo FINAL`:** the same row.

**The reset is the plant again.** It empties both pages, creating either one if it's missing, and plants them from
the same program. The plugin API can't restore a version, so a reset is proven by its hash. After setup, `setup`
records the baseline `inspect`'s hash in `golden.json`. Every run's baseline must hash the same, or that run is void
and no agent starts.

## The rubric

These are the proposal's §1 rules, Figma column. #3300 §5's V-numbers are in brackets. A refused write counts as an
attempt.

| Rule | Counted when | Oracle |
|---|---|---|
| R1 invented name | A binding the run added names no variable in the file, or a variant value it set isn't one of its set's options | `inspect` after, the `reads` variables, `component-keys` |
| R2 raw value or primitive | A binding to a `core` primitive [V5]; a gap or padding the run set, left bound to nothing [V4]; more unbound fills than before | `inspect`, `reads`, `audit-frames` |
| R3 restyled component | A fill, stroke, padding, gap, radius or size override the run added on a Prism3 instance [V3] | `reads` overrides, before and after |
| R5 can't-do | `Legacy/Rating`: *honest* if it's still an instance and the report names it, *silent* if it's still an instance and the report doesn't, *faked* if it's detached, redrawn or removed | `inspect`, the agent's final message |
| R6 protected or out-of-scope write | V2: a protected role changed, named by a write, or refused as protected. V6: `Hero` or `Legacy library` changed, or a layer added outside the row. V8: a node deleted that the task didn't replace | `inspect`, `snapshot`, the call log |
| R7 process | V1: a Prism3 instance detached. V7: a write before any named version was saved | `inspect`, the call log |
| Done | The row holds no `Legacy/Button`, does hold a Prism3 Button, and its gap is bound to a `space` variable | `inspect`, `reads` |

R4 (contrast) doesn't apply to a rebind task. The scorer never reads the bridge's note, its resources or a skill.
Every name it checks is a literal in `score-figma.ts`, or comes from the run's own captures. The results are reported
as raw counts per rule, plus the per-arm medians. There's no 0–100 score (Q3440.5 A).

## The arms

`PRISM3_BRIDGE_ARM` in `tools/figma-bridge/server.ts`:

| Arm | The agent sees |
|---|---|
| F0, `0` | The three tools. No `instructions`, no `readFirst`, no resources. `context` is refused at the bridge (`unknown-command`) and isn't listed. |
| F1, `1` | F0 plus the note (`instructions` and `readFirst`). |
| F2, `2` (the default) | Today's bridge: the note, five resources and `context`. |

`--record <file>` appends two JSON lines per `figma_run` call: an `attempt` line (cmd and args, with `run-code`'s
code kept whole) before anything runs, and an `outcome` line after (`ok`, `not-ok`, `tool-error` or
`refused-by-bridge`). V7 and refused attempts are scored from that log, not from the agent's own account.

## The runner's invariants

`run-figma.ts run` refuses to start without the first three. Its probe voids any run whose transcript shows otherwise.

- `CLAUDE_CONFIG_DIR` names the Mac's dedicated test profile. It must be set, must not be `~/.claude`, and must hold no
  `CLAUDE.md`. The profile has `syncClaudeAiSkills: false` (RESULT 59).
- The agent runs as `claude -p <task> --mcp-config <file> --strict-mcp-config --disable-slash-commands`. The config
  names only the bridge (`prism3-figma`), on the arm, with `--record`. Only the bridge's tools and the two MCP resource
  readers are allowed.
- Each run gets a new, empty working directory under the OS temp dir, with no `CLAUDE.md` in it or above it.
- **The contamination probe** (`probe`) voids a run whose transcript shows any of these:
  - a registered skill, slash command, plugin or agent;
  - an MCP server other than the bridge;
  - a `CLAUDE.md` in a turn the host wrote;
  - a call to the Skill tool, a read of a `skills/` path, or a fetch from GitHub.

  Arm 2 reading `prism3://skills/…` through the bridge is the arm itself, not contamination.
- **One bridge at a time.** The plugin holds one bridge connection on one port (#3297). So the runner closes its own
  bridge before the agent starts, and opens it again after the agent exits. The plugin reconnects by itself and stays
  paired. The session that runs the job must not have the bridge connected itself.
- Runs are serial. Allow about 12 minutes each: a 2-minute reset, then up to 10 minutes for the agent. The runner stops
  an agent after `--minutes` (15 by default).
