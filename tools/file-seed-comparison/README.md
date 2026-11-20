# tools/file-seed-comparison — engine-only seed vs agent seed (#2075 part 2)

Two ways to turn a file facts report (#2075 part 1) into a starting brand, run over one test set and scored against
one hand-written answer key. A tool, not a gate: it answers and exits 0. The findings are in
`docs/superpowers/2075-seed-comparison-findings.md`; the owner decides from them.

| File | What it is |
|---|---|
| `compare.ts` | The harness. Runs the engine path live, reads the agent fixtures, scores both. |
| `answer-key.json` | The expected seed per row, written by hand, each value citing its source. |
| `agent/<row>.design.md` | The agent path's recorded output for each repo row (procedure below). |
| `snapshots.ts` | Builds the repo rows' snapshots from Figma variable exports already in the repo. |
| `scan-script.ts` | The external rows' capture: a `use_figma` script that runs part 1's scan in the open file, and the join. |

```bash
npx tsx tools/file-seed-comparison/compare.ts                    # the scored table
npx tsx tools/file-seed-comparison/compare.ts --json
npx tsx tools/file-seed-comparison/compare.ts --reports <dir>    # also write each row's report (the agent's input)
npx tsx tools/file-seed-comparison/compare.ts --external <dir>   # add the external rows (below)
npx tsx tools/file-seed-comparison/scan-script.ts selftest       # the capture script, end to end, against a shim
```

## The test set

| Row | Source | What it exercises |
|---|---|---|
| `reference-brand` | the reference brand's legacy variable export (`reference/`) | a hand-built system whose brand color is not named `primary`, whose actions are near-black |
| `prism2` | Prism 2's variable export (`reference/`) | named brand ramps, three modes, a second brand hue 23° from the first |
| `emission-prism3` | the engine's own Figma emission for the default theme | a Prism3-built file, variables and text styles |
| `emission-aurora` | the same for the maximal example brand | an action color decoupled onto an accent |
| `external-variables-1…3` | **pending**: non-Prism3 files with variables | names written by someone other than us |
| `external-raw-1…3` | **pending**: non-Prism3 files with no variables | the usage path, which no repo row reaches |

Every repo row is variables (and text styles) with no layers: a variable export has none. **The usage path (raw
fills, fonts, radii and paddings by layer role) is exercised only by the unit tests and the external rows.**

## The agent path, repeatable

The agent sees the report and the skill, nothing else.

1. `npx tsx tools/file-seed-comparison/compare.ts --reports <scratch>/reports` writes each row's report.
2. Copy each report to an anonymous name (`file-a.json`, …) so the file name gives nothing away.
3. Start one fresh agent per report, with no conversation history, and give it this brief. Change only the paths and the id.

   > Write a Prism3 `design.md` seed for the file facts report at `<path>` by following
   > `skills/prism3-theme/SKILL.md`, especially "Starting from a file facts report". Use `id: <file-x>`. Pick primary,
   > an accent (`brandColors` entry named `accent`) only if the file has one, neutral, `typography.families`,
   > `density` and `radiusScale`, with one `#` comment per pick naming the facts behind it. Run the compile loop
   > until it exits 0. Your only evidence is the report: do not read `packages/engine/examples/`,
   > `packages/engine/out/`, `reference/`, `tools/`, `docs/`, `apps/` or `packages/engine/file-seed.ts`, and do not
   > search the repo for names in the report. Write only to `<scratch>`.

4. Copy each result to `agent/<row>.design.md` unedited and re-run `compare.ts`.

Re-recording replaces the fixture. Commit the new fixture alone, so the diff shows what the agent changed. One run
per row is one sample: an agent's output varies between runs, and the findings say so.

## The external rows

These need real Figma files that Prism3 did not build. The procedure below is **read-only**. The reports name
pages, styles and components, so **they stay off the repo**, and only the verdicts go into the findings.

### Capture, on the Mac mini (for the orchestrator to hand over)

For each file (three with local variables, three with none; none of them a Prism3 file):

1. **Open the file in Figma as a viewer, or on a duplicate.** The scan writes nothing (part 1's plugin suite runs
   it under a write-logging shim and fails on any write), but a duplicate keeps the original out of reach anyway.
   No plugin needs to be running.
2. In this checkout on the Mac: `npx tsx tools/file-seed-comparison/scan-script.ts print 0 > chunk-script-0.js`.
3. Run `chunk-script-0.js` as one `use_figma` call against that file. It loads every page, runs part 1's
   `scanOpenFile`, and returns `{ format, chunk, chunks, length, fnv, text }`. Save the returned value, unedited, as
   `<out>/<row>/chunk-0.json`.
4. For `n` = 1 to `chunks − 1`: `print <n>`, run it, save as `<out>/<row>/chunk-<n>.json`. **Don't edit the file
   between calls.** Every call rescans, and `join` refuses chunks that disagree.
5. `npx tsx tools/file-seed-comparison/scan-script.ts join <out>/<row> --out <out>/<row>.report.json`. If it
   refuses, capture again from step 2.
6. Note, per row, whether the file has local variables, and the report's `coverage` line. Return the
   `<row>.report.json` files over a private channel, never a commit, a PR, an issue or a comment.

The script runs no network call and calls no method that changes a node, a variable or a style. Never run it with
the agent link's write commands, and never against the master file or the template file.

### Score, off the repo

In a private directory `<ext>`:

- `<row>.report.json` for each captured row.
- `answer-key.json` in this directory's shape, for those rows. It's written by hand from what the file's owner says
  the brand is (brand guidelines, the designer), **before** either path's output is read.
- `agent/<row>.design.md`, recorded by the agent procedure above.

Then `npx tsx tools/file-seed-comparison/compare.ts --external <ext>`. Copy the verdicts only (no colors, fonts or
names) into the findings' external table.

## Scoring

- **Primary and accent**: ΔE in OKLab (the OKLCH distance) and the hue gap. `match` ≤ 0.03; `close` ≤ 0.10 or the
  same hue family (≤ 15°, both chromatic); else `miss`. No accent in the key: a pick is `extra`.
- **Families**: display and body, each `match` on the name.
- **Density**: `match` when equal.
- **Radius**: the nearest engine stop (sharp 0, modest 0.5, standard 1, soft 1.5, round 2); `match` when equal.
- **Action palette** (owner decision Q-BK7 A): `primary`, `accent` or `neutral`, `primary` when the seed leaves
  `actionPalette` unset; `match` when equal.

The agent's design.md is read through the engine's parser and the CLI's vocabulary resolution, so a lever set by a
word (`radiusScale: soft`, `personality`) is scored as the engine reads it.
