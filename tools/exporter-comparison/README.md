# Exporter comparison

Measures how far apart prism3's DTCG emitter and TokenPress's DTCG exporter actually are, over the
same brand. #697's Verify section asks for exactly this and notes it does not exist; this is it.

```bash
npx tsx tools/exporter-comparison/compare.ts            # nb + aurora
npx tsx tools/exporter-comparison/compare.ts nb          # one brand
npx tsx tools/exporter-comparison/compare.ts --json      # machine-readable
```

No arguments beyond a brand name, no fixtures to refresh: it reads the committed
`packages/engine/out/` and runs TokenPress's real `TokenExporter` in memory.

## What it does

1. Reads `packages/engine/out/figma/<brand>/*.json` — prism3's spec for a Figma file.
2. Adapts those into `VariableCollection` / `Variable` / `TextStyle` / `EffectStyle` shape
   (`adapt-figma-emission.ts`). The shapes come from TokenPress's own test fixtures rather than the
   Figma docs, because what matters is the subset the exporter actually reads.
3. Runs `TokenExporter.exportToZip()` in TokenPress's **default DTCG configuration** — the plugin's
   own `DEFAULT_OPTIONS`, which is also the combination its UI's `isSpecConformant()` accepts — and
   reads the ZIP back (`run-tokenpress.ts`).
4. Diffs the result against prism3's **conforming projection** (`<brand>.base` +
   `<brand>.<mode>.overlay`), which is the shape a stock consumer reads (#609), and classifies every
   difference (`compare.ts`).

**Neither exporter is modified.** Both are imported and run as they ship.

## What it has found so far

Two of the differences it reports are defects with owners, not representational disagreements:

- **#708** — every mode-varying shadow is dropped from every overlay, so a conforming consumer reading
  `base` + `dark.overlay` gets light-mode shadows in dark mode, in all four brands. Ours. This harness is
  the only thing that has caught it; every existing gate passes it.
- **#709** — `OPACITY` variables come back 100× outside DTCG's 0–1 range. TokenPress's.

## Reading the output

Five categories, and for each one a verdict: `EXPECTED` (a consequence of a decision already recorded
in #609 / #696 / #697) or `!! SURPRISING` (not predicted by any of them — the finding).

| | Category |
|---|---|
| 1 | **Paths** — present in one tree and not the other, both directions |
| 2 | **Types** — same path, different `$type` |
| 3 | **Values** — same path and type, different value, with the float32 cleanup isolated |
| 4 | **Structure** — file and directory layout, and how three mode axes land against one |
| 5 | **Bucket (c)** — the settings #703 predicted "range from inert to destructive", observed firing |

The `ADAPTATION` block above the categories reports the five workarounds the adapter needed to run at
all. Each is a finding in its own right, not harness plumbing:

- **W1** aliases are by NAME in the emission and by ID in TokenPress, so ids are minted here.
- **W2** the mode axis has to be reassembled from filenames — #697's three-axis problem, executable.
- **W3** three "collections" are Figma STYLES, not variable collections; **gradients have no channel
  at all**, so aurora's 2 are unreachable by this exporter.
- **W4** a bound text-style property has to be split into a resolved value plus a `boundVariables` entry.
- **W5** `exportToZip()` constructs its own scanner, so there is no seam to pass tokens in at — the
  only way to feed it is to install a global `figma` stub. The host *is* the seam (#703).

## This is a measurement, not a gate

Deliberately **not wired into CI**, and the difference is not a matter of taste. A gate asserts a
difference is *wrong*; almost every category here is a difference that is *right for its host*
(#697: "the two representations disagree by design, and each is right for its host"). Turning the
whole report red would be reporting a decision nobody has made.

Two categories are the exception, and they are where this should end up. **Types** and **unpaired
paths** both currently measure 0/0 on nb and 2/0 on aurora (the two gradients, with a known cause). A
type disagreement or a newly-unpaired path is a consumer-visible break in either direction, so those
two numbers are assertable *today* — the rest is not. The recommendation, stated in full in the PR
body: gate those two categories at their measured values once the harness has a home that runs on
more than the two brands here, and leave categories 3–5 reporting until #697's byte-for-byte question
is actually answered.

One thing to know before making it a gate: the verdicts in category 1 are pairing RULES
(`RENAME_RULES`, `NOT_IN_EMISSION`), and each one is an authored claim about why two differently-named
paths are the same token. A rule that stops matching silently moves paths from "paired" to "unpaired",
which is the right direction for a gate — but a rule written too loosely pairs things that are not
the same, and no gate here would notice. Read each rule's `reason` before trusting a 0.
