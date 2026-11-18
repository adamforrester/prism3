# tools/component-roundtrip — the real-host component round trip (#1218)

This tool builds the projected component defs into a **scratch** Figma file on the Mac, through the Desktop Bridge. It
reads them back out of that file, diffs them against the plan that built them, and reports per def. `field-label` is
the first named case and the default (#866). Owner decision of 2026-11-18 (B) on #1218: a Mac-run tool, not a CI gate.
It is the standard last step of the QA round (#3928) and of each release.

| File | What it does |
|---|---|
| `roundtrip.ts` | `scripts` writes the run's scripts. `report` reads the result and prints one line per def, then each divergence. |
| `host-roundtrip.ts` | The part that runs in Figma: the plugin's own `applyComponentPlan`, then `diffAnatomy`, with the safety rules. |
| `selftest.ts` | The offline self-test: the same scripts, run against the plugin's component shim. |

## What it reuses

- **The plan** is the offline round trip's: `figmaAnatomySet(def, { swapTarget })` (#874/#1205,
  `apps/plugin/test-roundtrip.ts`). It is computed at your commit, carried in as data, and hashed. `report` refuses a
  result built from other plans.
- **The build** is the plugin's executor, `applyComponentPlan` (`apps/plugin/src/write-components.ts`).
- **The diff** is `diffAnatomy` (`packages/engine/anatomy-readback.ts`). Its ports read the file's own variable, style
  and component catalogs, never the plan.

The offline gate drives the same build and diff against a shim. This tool drives them against Figma, which is the only
host that can show a write Figma takes and then discards (#866).

## Safety, enforced by the tool

1. **Scratch only.** The run compares the open file's name with `--scratch-file`. If they differ, it refuses and
   writes nothing, not even a version.
2. **A version before writes.** The run saves a version before its first write. If Figma refuses, it stops with
   nothing written.
3. **Never import by key.** The executor gets a host whose every `import…ByKey…` method throws. A build that asks
   for one is reported as a safety violation.
4. **Never delete pages.** The run writes only to a page it creates, `Round trip <run id>`. Afterwards it checks that
   every page from before the run is still there, and reports any page that is gone. It never removes anything,
   including its own page: clear it by hand, or go back to the saved version.

## The Mac job

The orchestrator posts this. Every step runs on the Mac.

**Before you start, the owner:**

- opens the **scratch** file and brings it to the front;
- applies a Prism3 theme to it, so the file holds the variables and text styles the plans bind;
- runs the **Desktop Bridge** plugin in that file.

You need the file's exact name. A build that cannot find a variable or style shows up as a divergence, not as a
refusal, so a file without the theme gives a noisy report.

1. Make a worktree at the commit to measure, and install in it. Never check out over a tree someone else is editing
   (CLAUDE.md).

   ```bash
   git fetch origin && git worktree add --detach /tmp/p3-roundtrip-<run id> <full sha> && cd /tmp/p3-roundtrip-<run id> && npm ci
   ```

2. Write the scripts into a run directory outside the repo:

   ```bash
   npx tsx tools/component-roundtrip/roundtrip.ts scripts --scratch-file '<exact scratch file name>' --out ~/p3-roundtrip/<run id> --run-id <run id>
   ```

   The default is `--def field-label`. Pass `--def a,b` for more. A def's nested and swapped-to defs are added first,
   as the plugin's prebuild does. The command prints the number of scripts and the largest one's size, which must be
   within the 45,000-character ceiling. `field-label` takes 8 scripts.

3. Run the scripts **in `manifest.json` order, one per Desktop Bridge call** (`figma_execute` in the Figma Console
   MCP), each file's whole content as the code, unedited:
   - Each `NNN-stage.js` returns `{ stage, of, staged }` and writes nothing to the file. Stop if `staged` is not
     equal to `stage`.
   - The last script, `NNN-run.js`, builds, reads back and diffs. Save its return value **unedited** as
     `~/p3-roundtrip/<run id>/result.json`.
   - If it returns `refused`, stop and report the reason. A refusal means nothing was written. One reason, "the
     staged scripts are not all here", means this host does not keep its global scope between calls. Report it: it
     is the first thing this transport needs confirmed.

4. Report:

   ```bash
   npx tsx tools/component-roundtrip/roundtrip.ts report --out ~/p3-roundtrip/<run id>
   ```

   Post its output **verbatim** to the issue the orchestrator names. The output gives:
   - one line per def: `✓` or `✗`, members read back of members planned, divergences, executor misses;
   - every divergence as `<def> · <member> · <path> · <field>: expected …, got …`;
   - any `✗ SAFETY:` line;
   - a last line of `CLEAN` or `DIVERGED`.

   Exit 0 means it answered, even when a def diverged. Exit 1 means it could not answer: a result that is missing,
   malformed, refused, or from other plans.

5. Leave the scratch file as it is. Don't delete the run's page, revert the version, or re-run on the same page. A new
   run makes its own page.

**Never** run the scripts against any file except the named scratch file. Never edit a script. Never run two at once.
Never post the scratch file's name or key in a public issue, PR or comment.

## Offline self-test

```bash
npx tsx tools/component-roundtrip/selftest.ts
```

This runs the exact scripts against `apps/plugin/component-shim.ts`, dressed as a file, and checks these arms:

- a clean run on `field-label`;
- a **planted** accept-and-discard of a TEXT node's property references (#866's shape), which must be reported by
  name as `field-label · <member> · <path> · propertyRef: expected characters ← …, got characters → DISCARDED`;
- each safety rule, failing in its own arm;
- a run-level import arm: an executor planted to import by key through the host it is handed is refused and
  reported as SAFETY, so `run()` is proven to hand the executor the guarded host;
- lost staging;
- a result built from other plans;
- no import-by-key call site in the bundle;
- the script ceiling.

It cannot prove what real Figma keeps. That is the question only the Mac run answers (docs/34 shape 17).

## Not yet verified live

The tool has not run against real Figma. Three things are still unconfirmed:

- whether the Desktop Bridge keeps its global scope between calls, which staging needs;
- whether `saveVersionHistoryAsync` and `createPage` are allowed from it;
- how long a big def takes.

Start with `field-label`. Larger sets (the button family has hundreds of members) mean more and bigger scripts.
