## (2026-10-31) — Capture baseline and Adopt read the file once, a page per turn (#3189)

**Status:** plugin and panel. ENGINE patch (change note): no committed artifact, emission or component surface moves. The
component executor is unchanged, so `EXECUTOR_REVISION` stays at 44 (`lint-executor-revision` agrees). New strip copy is
DRAFT, listed below.

### What it does

- **One read per run.** `captureBaselines` and `adoptMembers` (`update-plan.ts`) now read through `runHost(file, breathe)`,
  as `previewUpdate` does since #3177: every page loaded and searched a page per turn, once per criterion of
  `UPDATE_READ`, then shared by every set. Before, `main.ts` loaded every page (`loadPagesYielding`) and handed `figma`
  straight in, so `hostPorts` and then `locateSets`/`locateView` per target each searched the whole file in one turn.
  Both commands write plugin data only, which adds no node, so neither needs `rereadAfter`.
- **Readings.** Each posts `run-progress` with its own `run` (`capture`, `adopt`): `check` before the read, `work` as each
  def is reached (`done` counting the defs before it, the thread handed back after it), `finish` with every def done.
  Both are agent commands (the panel starts neither), so `main.ts` posts the readings to the panel directly, never
  through the agent's sink, which would take each one for a verdict.
- **The strip.** `stripView` takes an agent's reading (`StripAgent`) and draws it as the read after open is drawn: the
  passive kind, no Stop (the panel holds no run of its own to stop) and no clock. A panel run wins over it; it wins over
  the read after open. It clears when the agent's command ends (`agent-finished`).

### Measured on the stand-in (`test-open-large-file.ts`, 60 pages, 50 sets, every def)

| | whole-file searches | most pages searched in one turn | each page searched | time |
|---|---|---|---|---|
| Capture, before | 61 | 60 | 61 times | ~20 s |
| Capture, after | 0 | 1 | 3 times | ~2.9 s |
| Adopt, before | 58 | 60 | 58 times | ~19 s |
| Adopt, after | 0 | 1 | 3 times | ~2.9 s |

The answer and the verdict digest the same before and after (capture `48e8f46b` / `ea8490a8`, adopt `137c86a5` /
`488854b1`).

### DRAFT copy (status strip, `STRIP_COPY`)

- `agentRun.capture`: "Recording the sets as built…" and `agentRun.adopt`: "Adopting members…". These are the words
  Activity already gives the two commands (Q114 A), reused for the strip.
- `agentSub`: "An agent runs this. Details in Activity." (new).
- The count reuses `of`: "16 of 60", counting defs.

### Gates

`test-open-large-file.ts`: `capture/no-walk`, `capture/one-read`, `capture/answers`, `capture/progress` and the same four
for `adopt/`. A no-walk arm needs an answer first: a run that threw searched nothing, and must not pass for one that
searched no whole file. `test-status-strip.ts`: `agent/check`, `agent/work`, `agent/finish`, `order/agent`,
`order/agent-run`, `agent/none`. `test-write-adapter.ts`: the two new runs accepted, an unknown one dropped. Every arm was
seen to fail by name under a mutation (the PR lists them).
