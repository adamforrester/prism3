## (2026-10-30) — Plugin busy states: the status strip, Stop after a set, and the yield cadence (#3170 part 2)

**Status:** plugin and panel, built as the owner decided (Q3170.1–6, all A). Copy is DRAFT under the voice standard. ENGINE
patch (change note): no committed artifact, emission or component surface moves. The component executor is unchanged
(`update-apply.ts`, `apply-theme.ts`, `write-figma.ts` and `main.ts` are outside its reach), so `EXECUTOR_REVISION` stays.

### What it does

- **A status strip at the panel's foot** (`shell/status-strip.ts`, first in the Activity drawer, above its bar row). It
  reads the read after open ("Reading this file…", indeterminate until the first page, then "page n of N") and Update
  file's run: the set or stage, n of N, a native `progress` filled by sets (or stages) done, never by time, and the
  elapsed time from the panel's own clock. After 3 s with no reading it adds "Still working on <set>". When the run ends
  it becomes the verdict line, which stays until the next action the panel starts.
- **Update file's rows** read Due, then Updating, then Updated, in the overlay's run view.
- **Every writing control is off while the run is out**, with "Update is running" on hover: Components' boxes and tier
  actions, Documentation's switches and Draw specs, the Style guides tab, and Clean up's Delete and Remove. It rides the
  one reason the panel already used after a failed restore (`writeOff`), so a new control has one place to read.
- **"Stop after <set>"** posts `update-stop`. The host reads it at the next set boundary (and before the first write, during
  the check), so the set being written finishes and the rest are not touched. The verdict names the sets it left.
- **The yield cadence.** The update posts `run-progress` and hands the thread back at every set boundary, and inside a
  set after about 50 ms of work: the executor is asked after every member (`chunk: 1`) and `paced` hands back only once
  50 ms has run, repeating the set's reading. Apply Theme hands back before each of its seven stages and every 200
  color variables (`COLOR_YIELD_EVERY`). An agent's run yields the same way and posts nothing.

### Honesty, and what #3177 still costs

The strip says only what a post told it. While the update checks the file before its first write it reads "Checking n
sets before writing", with no count and no fill: that check still runs whole-file searches in one turn (#3177), so the
strip claims nothing more until the first set boundary. Inside one member a write cannot be split, so "about 50 ms" is
50 ms or one member's write, whichever is longer.

### Decisions taken inside the arc

- The overlay still closes when the run starts (#2909's behavior); the rows' states show when it is reopened, so the
  panel stays readable and navigable (Q3170.3 A).
- A Stop during Apply Theme stops after the whole Theme step, never between its stages: a theme half written is not one
  the file can use. Its label says "Stop after Theme".
- The indeterminate bar draws no motion: what moves is what the run said.

### Tests

- `apps/plugin/test-run-progress.ts` (new, in the plugin's `test`): through the real `main.ts` over the component shim,
  the check reading, one reading per set boundary, the finish reading, the readings inside a long set under a stepped
  clock and none under a still one, no reading for an agent's run, Stop at a boundary (the next sets' stamps and records
  untouched), Stop before the first write (no version saved), and a stray Stop stopping nothing. Over the file shim:
  Apply Theme's seven stages in order, one hand-back per 200 color rows, and a paced apply writing exactly what an
  unpaced one does.
- `apps/plugin/test-open-large-file.ts`: `open/read-progress`, page 0 to 60 of 60 once each before the full read.
- `apps/studio/test-status-strip.ts` (new): the strip's words and rules.
- `test:chrome` section 3170 (shard 3): every state as drawn, light and dark at 1280 and light at 380, the controls held
  and released, and the chrome audit in the reading and running states.
- 21 mutations, each failing by name (listed in the PR).
