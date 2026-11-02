## (2026-11-02) — The chrome suite can no longer hang silently: a section watchdog, bounded Shape key presses, a step limit (#3044)

**Status:** test and CI change only (`apps/studio/test-chrome.mjs`, `chrome-shards.mjs`, `ci.yml`, `lint-doc-gates.ts`).
No engine change note: no engine, studio or plugin code moves, so no bump is owed (CONTRIBUTING §2). `EXECUTOR_REVISION`
stays.

### What happened

On #3040's CI the chrome suite printed `Shape (S7)` and then nothing for 74 minutes, with no assertion failed, until
the run was cancelled. A re-run of the same commit passed. The step had no `timeout-minutes`, so it would have held the
job for GitHub's six hours, and the log could not be read while it ran.

### What can wait without a bound

`bounded` (#2550) holds the inputs it wraps, and test-chrome.mjs wrapped one (S6.3's `selectOption`). Section 24
(Shape, S7) sends five raw `page.keyboard.press` calls, and `test-bounded.mjs`'s header names exactly that: "a key
press has no bound at all". The run that hung cannot be replayed, so which call stalled is not proven. A raw key press
fits, but so does a `page.evaluate` waiting on a frame that never comes. So the fix bounds what is known to be
unbounded and adds a backstop for the rest.

### The fix

- **A section watchdog.** `enter()` arms a timer at every section guard. A section that reaches no further guard
  within 600 s fails by name with the last check it reached, `✗ section <id>: no progress for 600s, so the run stops
  here (#3044); the last check it reached: "…"`, and the run exits 1. 600 s is 2.8x the slowest healthy section
  measured locally (18-s4f, 217 s). `CHROME_SECTION_LIMIT_S` overrides it.
- **Its self-check, section 3044 (shard 3).** The suite runs itself with `--stall-self-check`: one section, entered
  through the real `runs` and `enter`, awaits a promise that never settles, under a 1 s limit. The arm requires
  exit 1 and the named line, within 30 s. The timer is not `unref`'d. In the self-check nothing else holds the event
  loop, and an unref'd timer would let Node exit 13 without the named failure.
- **S7's key presses bounded.** The Edits and reveal cases call `watchStalls` and send their five presses through
  `bounded`, so a press the renderer never takes fails by name and says where the page was. Their catches skip an
  error `bounded` already reported.
- **A step limit.** `ci.yml`'s chrome step gets `timeout-minutes: 30`. 120 healthy shard runs on main and PRs peak
  at 651 s, and 30 minutes is 2.8x that. `lint-doc-gates.ts` arm 9 holds it: `STEP_TIME_LIMITS` is a typed register
  of the steps that must carry a limit, read from the parsed tree, with a self-check that a dropped, zero or renamed
  limit is named.

### Mutations, each failing by name

- The watchdog's `setTimeout` dropped from `enter` → `✗ 3044: a section that never returns fails by name …` (exit 13).
- Its `process.exit(1)` dropped → the same arm.
- `watchStalls` dropped from S7's Edits case → `✗ S7 Shape edits: ArrowRight on radius softness, in Light: the page was
  never given watchStalls …`, one per press.
- `timeout-minutes` dropped from the chrome step (`main`'s `ci.yml`) → `❌ 1 step(s) that can hang have no time limit
  (#3044): "New shell chrome suite (UI redesign S1.2)" (\`chrome\`) has no \`timeout-minutes\` …`.

### What it does not prove

What stalled on #3040's run. If it recurs, the log now ends on the section and the last check instead of running on.
