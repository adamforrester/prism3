# Seeding a brand from a Figma file: engine-only vs agent (#2075 part 2 findings)

**Date:** 2026-11-17 · **Type:** working note, recommendation only · **Source:** #2075 (owner decisions Q189, Q-FS1 A, Q-BK6, Q-BK7 A) ·
**Harness:** `tools/file-seed-comparison/` · **Engine path:** `packages/engine/file-seed.ts` (`facts-seed/1`)

The owner decides from this note whether the engine-only seed is **usable**, **limited** or **different**, and which
cases, if any, should be agent-only. Nothing here decides it.

## Read this first: what the evidence can and cannot carry

1. **The engine's rules were tuned on the repo rows below.** While building `file-seed.ts` I ran it over these four
   rows. I changed three things after seeing it fail: grouping by ramp instead of by hue alone (Prism 2's two brand
   hues are 23° apart), halving roles named for an interaction state or the inverse ground, and ignoring
   selection-control sizes. So its repo-row score is a **training score**. The six external rows are the real test, and
   they are pending.
2. **No repo row has any layers.** A variable export carries none, so every repo row reads names and alias structure
   only. The usage path, for raw fills, fonts, corners and paddings by layer role, is exercised only by the unit tests.
   A non-Prism3 file **without variables** depends on that path entirely, and no row here measures it.
3. **Two of the four rows are Prism3's own emission.** Their names follow our conventions and their descriptions say
   "the brand color, exact". That is the easiest possible input.
4. **The agent path is one recorded run per row**, by a fresh agent that saw only the report and the skill. A second
   run could differ.
5. **The agent was given the same definitions the engine uses.** The new skill section says what a primary, an
   accent and a medium control height are. So the paths differ in judgment within one contract, not in the contract.

## Results, repo rows

`match` / `close` / `miss` per pick; for colors, ΔE in OKLab against the key. `extra` = a pick the key doesn't have.

| Row | Pick | Engine (confidence) | Agent |
|---|---|---|---|
| reference brand | primary | match, ΔE 0 (0.39) | match, ΔE 0 |
| | accent | extra: amber (0.64) | extra: amber |
| | families | match / match (1.0) | match / match |
| | density | match (0.7) | match |
| | radius | match, standard (0.7) | match, standard |
| | action | match, neutral (1.0) | match, neutral |
| Prism 2 | primary | match, ΔE 0 (0.81) | match, ΔE 0 |
| | accent | **close**, ΔE 0.109: two rungs dark (0.92) | match, ΔE 0 |
| | families | match / match (1.0) | match / match |
| | density | match (0.7) | match |
| | radius | match, standard (0.8) | match, standard |
| | action | match, primary (1.0) | match, primary |
| emission, default theme | primary | match, ΔE 0 (0.96) | match, ΔE 0 |
| | accent | match, ΔE 0 (1.0) | match, ΔE 0 |
| | families | match / match (1.0) | match / match |
| | density | match (0.7) | match |
| | radius | match, standard (0.7) | match, standard |
| | action | match, primary (1.0) | match, primary |
| emission, maximal example | primary | match, ΔE 0.001 (0.67) | match, ΔE 0.001 |
| | accent | **close**, ΔE 0.100: the hover-dark rung (1.0) | match, ΔE 0.027 |
| | families | match / match (1.0) | match / match |
| | density | match (0.7) | match |
| | radius | match, round (0.7) | match, round |
| | action | match, accent (1.0) | match, accent |

**Engine: 26 of 28 checks match, 2 close, 0 miss. Agent: 28 of 28.** Each row has seven checks (families count as
display and body; the action palette is the seventh, Q-BK7 A), and the reference brand's accent is `extra` for both
paths: both proposed its amber, which the key doesn't have (Q-BK6: the reference brand has no accent).

### Where the two paths differ, and why

- **The accent rung.** Both engine "close" verdicts have the same cause. The roles that point at the accent ramp rest
  on a darker rung than the brand's anchor. Prism 2's `action/accent/*/rest` uses `/750`, not `/650`; the example
  brand's interactive roles use the contrast-shifted step. The engine picks the most-referenced rung. The agent read
  that the ramp's brand-named role (Prism 2), or the step marked "exact" in a description (the emission), sits
  elsewhere. Hue is right in both: 0.5° and 0.2° off.
- **Confidence tracks the hard case.** The engine's lowest confidence, 0.39, is on the reference brand's primary. That
  row's brand red is named for promo text and the focus ring, never `primary`, and its actions are near-black. The
  agent called the same pick "medium-low" for the same reason. Both picked the right red.

### What only the agent did (outside the six picks)

None of these is scored, and each one changes the seed a reviewer would start from. Setting `actionPalette` was on
this list until Q-BK7 A made it the engine's sixth pick; it now matches on all four rows.

| Agent-only behavior | Row | Why the engine path can't do it today |
|---|---|---|
| Read variable **descriptions** ("the brand color, exact") to choose the anchor rung | both emissions | The engine reads names and counts, not prose. Descriptions in non-Prism3 files are rare and unstructured. |
| **Compiled its seed and diffed it against the file**, then added `iconContrast`, `weightRoles`, `motionPersonality` and `layout` until the rebuild matched | example | A loop over the compiler, not a reading of the report. It's the agent path's real advantage on a file with full variables. |
| Carried the file's gradient as written | Prism 2 | Out of scope for a seed. |
| Wrote review notes naming the ambiguous picks (the accent doubles as warning; 40px sits between two densities; three gray ramps) | all | The engine's equivalent is the confidence number and the evidence list. The agent's notes say *why* a pick is doubtful. |

## Results, external rows: pending

| Row | Engine | Agent |
|---|---|---|
| non-Prism3, with variables ×3 | pending | pending |
| non-Prism3, without variables ×3 | pending | pending |

The capture is read-only and runs part 1's own scan inside the file: `tools/file-seed-comparison/README.md`, "The
external rows". The reports and their answer keys stay off the repo; only verdicts come back here.

## Assessment (recommendation; the owner decides)

- **Files with named variables:** the engine-only seed looks **usable** for the six picks. Every pick landed on the
  right hue family, font and bucket, and the two misses were one rung on the accent ramp. That holds for files named
  the way these are. The external rows will show whether it survives other people's naming.
- **Beyond the six picks:** **limited.** On a fully tokenized file the agent fits more levers by compiling and
  comparing. The action palette, the one lever where the agent beat the engine on fidelity, is now the engine's sixth
  pick (Q-BK7 A) and matches on every repo row.
- **Files without variables:** **unknown.** No row measures it. This is where the paths are most likely to diverge,
  because names stop helping and only usage counts and layer roles remain.
- **Agent-only cases, so far:** none of the six picks needs the agent on this evidence. The agent-only behaviors are
  the rebuild-and-compare loop and reading prose descriptions. Whether to send a fully tokenized file to an agent for
  that loop is a product choice, not something these rows decide.

## OWNER DECISIONS (answered 2026-11-17)

Decided: **1 → A (Q-BK6)**, the reference brand has no accent and the key keeps none. **2 → A (Q-BK7)**, built: the
engine seed's sixth pick is the action palette (`file-seed.ts` header, "ACTION PALETTE"). **3 (Q-BK8)**, the owner is
collecting the six external files; they are captured read-only later and only verdicts come back. **4**, the facts
report stays `0.x` until the external rows are in. The questions as asked:

1. **Does the reference brand have an accent?** Its legacy file names an amber `text/accent` role that both paths
   picked. Its own brief declares no accent and puts danger on the red.
   (A) No accent: keep the key as written, and the amber pick scores `extra`. (B) Amber is its accent: the key gains
   it, and both paths score `match`. **Recommendation: A.** The brief is the brand's authored reading, and the amber
   doubles as the file's warning color.
2. **Should the engine seed propose the action palette as a sixth pick?** (A) Yes: action-named roles that resolve to
   a non-primary family or to the neutral set `actionPalette`, with confidence and evidence like the other picks.
   (B) No: keep five picks and let the mapping screen ask. **Recommendation: A.** Both rows where the agent beat the
   engine on fidelity turned on this one lever, and the report already carries the evidence.
3. **Which six external files, and who writes their keys?** The capture needs three non-Prism3 files with variables
   and three without, and a key written from each brand's own guidance before either path's output is read.
   **Recommendation:** the owner names the files; the orchestrator runs the capture on the Mac mini, then writes the
   keys from the files' brand guidance.
4. **The facts report stays `0.x`.** Leaving it (`/1.0`) was held for these findings (D3685.1 C). The engine path
   reads variable names, alias chains, default-mode values, text styles' families, and usage paints, fonts, radii and
   paddings. It doesn't read descriptions, effects, grids, components or library summaries. **Recommendation:** stay
   on `0.x` until the external rows are in, since the raw-file path is exactly where field needs are unknown.

## Reproduce

```bash
npx tsx tools/file-seed-comparison/compare.ts            # this note's table
npx tsx tools/file-seed-comparison/scan-script.ts selftest
```
