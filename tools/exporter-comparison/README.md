# Exporter comparison

Measures how far apart prism3's DTCG emitter and TokenPress's DTCG exporter actually are, over the
same brand. #697's Verify section asks for exactly this and notes it does not exist; this is it.

```bash
npx tsx tools/exporter-comparison/compare.ts            # nb + aurora
npx tsx tools/exporter-comparison/compare.ts nb          # one brand
npx tsx tools/exporter-comparison/compare.ts --json      # machine-readable
npx tsx tools/exporter-comparison/gate.ts                # the assertable subset, in CI
```

`compare.ts` reports and always exits 0. `gate.ts` is the subset that fails a build — see
[This is a measurement; the assertable subset is a gate](#this-is-a-measurement-the-assertable-subset-is-a-gate).

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

Two of the differences it reported were defects with owners, not representational disagreements. **Both
are now fixed**, and each verdict has been rewritten as the regression alarm for its own fix — so if
either prints again, it is news rather than history:

- **#708** — every mode-varying shadow was dropped from every overlay, so a conforming consumer reading
  `base` + `dark.overlay` got light-mode shadows in dark mode, in all four brands. Ours. This harness was
  the only thing that caught it; every existing gate passed it. Fixed in **#713**, which also added
  `packages/engine/lint-overlay-completeness.ts` — that gate now owns the invariant, and should go red
  before this harness does.
- **#709** — `OPACITY` variables came back 100× outside DTCG's 0–1 range. TokenPress's. Fixed in **#719**;
  `apps/tokenpress/tests/unit/opacity-percent-to-fraction.test.ts` is its regression test.

And a third, found while graduating the gate — the one that had been hiding behind a **true statement**:

- **#731** — aurora's 2 gradients. Every previous run explained these as *unreachable*: "Figma paint
  styles are neither variables nor effect styles and TokenPress's scanner has no call that returns
  them." The second clause is true and the conclusion drawn from it was not.
  `figma.getLocalPaintStylesAsync()` **exists** (`@figma/plugin-typings/plugin-api.d.ts:1481`);
  TokenPress's scanner reads four channels and paint is simply not one of them
  (`src/plugin/scanner.ts:17-20`), and it has no gradient converter at all — its own validator files
  `gradient` under "experimental — just warn, don't validate" (`utils/dtcg-validator.ts:288`).
  So this is a **capability gap in TokenPress's own lane**, the same shape as #709, and *not* a
  property of Figma's model the way motion, line-height and the typeface tier genuinely are. Those
  have no variable type to hold them; a gradient has a paint style sitting behind an uncalled API.
  The distinction decides whether the unpaired arm carves this out forever or carries a ticket.

### And one the harness found in itself

The #708 verdict went on printing **"A SHIPPING DEFECT"** after #713 fixed it, because its
guard tested the wrong artifact: it asked whether the canonical tree still carried
`$extensions.prism3.modes.dark` — the projector's **input**, true whether or not the projector emits
anything — while the claim it gated asserted something about the projector's **output**, the overlay.
A predicate like that is true in both worlds, so the verdict could not have stopped on its own.

Auditing the rest for the same shape found two more: the axis verdict tested `tokenpressDirs.length > 3`
while claiming *three different kinds* of axis are peers (one axis with four values satisfies the count),
and the collision verdict counted all 184 multi-file paths while claiming they had *different values*
(11 of nb's are identical in every file). All three now read the artifact their claim names. The #709
verdict needed no change and is left as the worked contrast — `kind: 'scale'` is computed from the
measured values, so the fix made it false and it stopped printing by itself.

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
- **W3** three "collections" are Figma STYLES, not variable collections; **TokenPress reads no paint
  channel**, so aurora's 2 gradients do not come back (#731 — the channel exists, the call does not).
- **W4** a bound text-style property has to be split into a resolved value plus a `boundVariables` entry.
- **W5** `exportToZip()` constructs its own scanner, so there is no seam to pass tokens in at — the
  only way to feed it is to install a global `figma` stub. The host *is* the seam (#703).

## This is a measurement; the assertable subset is a gate

The split is not a matter of taste. A gate asserts a difference is *wrong*; most categories here are a
difference that is *right for its host* (#697: "the two representations disagree by design, and each is
right for its host"), so turning the whole report red would report a decision nobody has made.

So `compare.ts` reports and **always exits 0**, and `gate.ts` — wired into CI — asserts the arms where
a disagreement means one exporter is *wrong* rather than *different*. It runs on **every brand with a
Figma emission**, discovered by scanning `out/figma/` with the count asserted at ≥ 3 (a discovered list
with no floor passes when the scan returns nothing).

| arm | pinned as | at |
|---|---|---|
| **types** — same path, different `$type` | RULE | 0 |
| **paired types** — different paths a RULE pairs, different `$type` (#747) | RULE | 0 |
| **type-blind pairs** — a pairing that compares no types at all (#747) | RULE | 0 |
| **axes** — every emitted collection's axis is declared, and every declaration still emitted (#697) | RULE | 0 unclassified, 0 stale |
| **unpaired, tokenpress-only** | RULE | 0 |
| **unpaired, prism3-only** | MEMORY, per path, with a cause and an issue | aurora's 2 gradients (#731) |
| **float32 leak** — the cleanup changed a value | RULE | 0 |
| **scale** — the #709 opacity 100× | RULE | 0 |

The prism3-only arm is a memory rather than a count on purpose: a count says "2 are missing and that is
fine", the memory says *which two and why*, so a third fails, **and a gradient becoming reachable also
fails**. A carve-out that cannot notice its own obsolescence is how the #708 verdict kept printing.

**Not pinned, deliberately:** category 3's value differences (202–261 per brand — the largest bucket is
pure serialization, and both spellings are valid DTCG), category 4's structure, and category 5's
bucket-C observations. The divergent axis collisions (171–173) are the tempting one and are left out
because they are a hazard created by #697's *undecided* axis question — pinning the count would freeze a
number the decision is meant to move. If they are ever pinned it must be the **divergent** count, not
the raw ~185: 11–14 are identical in every file and harmless, and conflating the two is the defect #729
fixed.

**What the green types arm used to not tell you, and what closing it took** — the original arm compared
`$type` only over paths that appear verbatim on **both** sides. Retyping TokenPress's grid branch left
the gate green, because `grid.<breakpoint>.<prop>` vs `grid.<prop>` is an axis collapse and never enters
that shared set; the same mutation on `FONT_SIZE`, which does pair verbatim, produced 66 failures. The
blind set spanned all four pairing rules — **71 paths on nb, 73 on aurora, 71 on wendys**, ~14% of each
brand's paired surface. Filed as **#747**, with that non-failing mutation as its acceptance test.

Closed. Each rule now declares a **`counterpart`** — a whole token, or a named *field* of a composite —
and the type expectation comes from the **canonical tree**, the emitter's input, never from the rule's
own claim. Blind set is **0** on all three brands, asserted rather than printed. What remains is
`againstAbsence` (65–67 per brand): pairs where one side has no leaf, so there is no second type to
compare — a different thing, and deliberately not asserted.

Two findings from doing it are worth more than the arm itself:

- **The type arm falsified one of these rules on its first run.** The `font-fluid.*` rule's prose said
  TokenPress emitted a *second copy* of the composite; the arm reported 11 disagreements per brand
  (`typography` vs `dimension`). The exporters were right and the **rule was wrong**: `font-fluid.*` is
  the composite's `fontSize` *referent*, not a copy of it — it carries no `fontFamily` and no
  `fontWeight`. The rule now says `counterpart: { field: 'fontSize' }` and the expectation resolves
  through that field. Fixed by **tightening**, which is the only honest direction; the prose had been
  read several times without anyone noticing, and a check independent enough to contradict a claim its
  own file makes is the strongest evidence available that it is not a tautology.
- **A mutation that changes nothing looks exactly like a blind spot.** Disabling the explicit
  `FONT_SIZE` check alone left the gate green — not a hole, but a *non-mutation*: it falls through to a
  defensive scope list further down, which that code's own comment says is there for this refactor.
  Both sites had to move before the behavior did. Check that what you mutated is what decides.

Why this needed #697's decision rather than more effort: a Figma variable can vary a value only **by
mode**, so prism3's non-appearance axes become modes going out and paths coming back. Carrying a type
across that collapse requires knowing *which* collections' modes are an axis — and nothing in a Figma
file records it. So it is **declared**, in `axes.ts`, and an unclassified collection fails rather than
defaulting. The declaration is load-bearing, not decorative: relabeling `layout` from `breakpoint` to
`none` produces 57 failures, because `grid.*` stops pairing at all.

One thing to know when reading it: the verdicts in category 1 are pairing RULES
(`RENAME_RULES`, `NOT_IN_EMISSION`), and each one is an authored claim about why two differently-named
paths are the same token. A rule that stops matching silently moves paths from "paired" to "unpaired",
which is the right direction for a gate — but a rule written too loosely pairs things that are not
the same, and no gate here would notice. Read each rule's `reason` before trusting a 0.

And a second thing, learned the hard way above: **a verdict's `when` must read the artifact its `claim`
names.** The mechanism gives no warning when the two come apart — a predicate that is true for a reason
the claim does not name prints forever, and prints confidently. If the honest predicate is awkward to
compute, compute it anyway; a cheap proxy does not weaken the check, it removes it and leaves prose that
looks measured. This matters more if these verdicts are ever pinned as a gate, because pinning one that
rests on a proxy bakes in a statement nobody is checking.
