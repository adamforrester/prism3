# `@prism3/tokens`

The token→code leg of `docs/19`. **Only the token leg.** The component leg (web components, React,
Storybook) is genuinely blocked on the author-headless-vs-wrap decision (#252), which has no lean
recorded anywhere — so nothing component-shaped belongs here yet.

What exists today is one thing: **a gate that answers whether a stranger could consume our tokens** — measured across every brand the engine emits.

```bash
npm run -w @prism3/tokens check:consumability
```

## The rule

> **NO CUSTOM CODE.** No preprocessors, no custom transforms, no custom formats. Standard Style
> Dictionary **config options** are permitted. Anything requiring us to ship code a consumer must also
> run is a **failure**, not a fix.

That line is not arbitrary — it is Token Press's own design goal, made executable: *make the export
clean enough that a user needs no pile of transforms to use it.* It draws itself in the right place:

| | verdict | why |
|---|---|---|
| `outputReferences: true` | ✅ allowed | a config option any consumer would set |
| dropping `css/shorthand` | ✅ allowed | a config choice |
| a preprocessor reading `$extensions.prism3.modes` | ❌ **forbidden** | code every consumer inherits forever |

**The rule is enforced structurally, not by discipline.** `check-consumability.mjs` reads
`sd.consumer.mjs` as source and asserts it declares no `preprocessors` / `hooks` / `transforms` /
`register*`. That check exists because mutation testing showed the counting assertions are *blind* to a
preprocessor being added — it rewrites values and leaves every count identical. Without it, the
cheapest way to make a future failure disappear would be the exact move that destroys the gate's
meaning.

## Why the canonical tree collapses, and why that is not a defect

It is a **characterization** gate. Read against `<brand>.tokens.json`, per-mode values live under
`$extensions.prism3.modes`, which DTCG defines as *ignorable* — so a conforming consumer sees one value
per token. Measured: **556 leaves → 556 CSS variables, 1:1**, three of four modes invisible.

That was filed as #609 and originally written up here as a defect awaiting a fix. #609 resolved the
other way, and the correction matters: the canonical tree **keeps** `$extensions` as the source of
truth, and the engine emits a conforming **projection** beside it (`<brand>.base.tokens.json` plus one
`<brand>.<mode>.overlay.tokens.json` per theme mode). So the collapse above is permanent and
deliberate, and the assertions that pin it now document *why* the projection exists rather than
flagging something to fix.

Both are measured here, and they answer different questions:

- the **pinned** assertions — the canonical tree still collapses exactly as recorded. Move it and they
  fail, in either direction.
- the **projected** block — the #609 acceptance test. Base + overlay through the same stock config:
  every token present in every mode, alias references intact, each mode under its own
  `[data-theme="…"]` selector, and each overlay actually differing from base.

Same posture `regen --check` takes toward `out/`: the job is to have a **memory**, not an opinion.

## Scope — every brand, and why that mattered

The gate originally measured **one** brand (`nb`), which answered "can a stranger consume `nb`?" and
was silent on the other three. #635 widened it to the whole corpus.

Brands are **discovered** from `Prism3/engine/out/`, so a fifth is covered the day it lands. The four
known profiles are then asserted **by name**, because a gate with a scope must prove each promised
surface is represented rather than count files — if `aurora` stopped being emitted, a count-based
check would report "3 brands, all green" and the only brand with gradients would have left the corpus
unnoticed.

| brand | what it exercises that the others do not |
|---|---|
| `nb` | the legacy `nbds.*` dialect, and the hand-authored regression target |
| `aurora` | gradients (Paint Styles) + a decoupled action palette |
| `harbor` | a third input profile |
| `wendys` | the standard-dialect front door (`parseStandard` + classifier) |

**Every expectation is derived per brand.** Leaf counts, mode lists and the token root all differ —
`nb` roots at `nbds`, the rest at `prism` — so a shared literal would be one measurement standing in
for four. The page-background check reads the root off each brand's own tree and compares the
canonical build against that brand's dark projection, rather than asserting a hard-coded color.

## What widening it found: `[object Object]`

Fourteen values across the corpus reach the CSS as the literal string `[object Object]` — Style
Dictionary's output for a composite type it has no transform for.

| type | brands | count | note |
|---|---|---|---|
| `spring` | all four | 3 each | a Prism3 type with no DTCG equivalent, so no consumer has a transform for it |
| `gradient` | `aurora` | 2 | a **standard DTCG composite type** — a conforming consumer reading a conforming type gets garbage |

**Three of them are in `nb`, the brand the gate already measured.** It reported 556 leaves → 556
variables, a perfect 1:1, while three of those 556 were unusable. The count was right and the output
was broken — which is the precise shape of defect a count is structurally unable to see, and the
reason the value-integrity assertion now exists.

These are **pinned, not fixed** (#642): #635 is about measuring all four brands, and each defect it
surfaces gets its own decision, the same way #609 came out of measuring one. Widening the pin to make a future
failure go away would be the same move as adding a preprocessor — it ends the measurement.

## Independence

Per CLAUDE.md principle 4 and `docs/34`: `leaves` is counted by walking the **source JSON**, `vars` by
parsing the **emitted CSS**. Two different artifacts, read two different ways. Deriving one from the
other would make the 1:1 collapse undetectable — which is the single thing this gate exists to see.

Mutation-verified. Three mutations, three caught:

| mutation | caught by |
|---|---|
| a mode preprocessor is added | the `[RULE]` source assertions |
| `outputReferences` switched off | the `var(--` reference count + the pinned light-mode value |
| the selector changed (simulating a mode fix) | the exact-selector assertion |
| an overlay carries base values, not the mode's | the per-mode `actually differs from base` assertion |
| a brand leaves the corpus | the `[SCOPE]` by-name assertions |
| the corrupt-value scan is disabled | the per-brand `[CORRUPT]` pins |
| the token root is hard-coded to one dialect | the page-background check, on the three `prism`-rooted brands |

The first two survived the gate's first draft, which counted only names. Counting cannot see values,
references, or forbidden code. The fourth is the one this gate caught that the engine's own unit tests
could not — *which* leaves an overlay selects is independent of *what value* they carry, so every count
stayed correct. An assertion was added upstream in `Prism3/engine/test.ts` too; a contract of a
function belongs in a test of that function, not only in a gate three artifacts downstream.

## Dependency posture

Style Dictionary is **this repo's first real runtime dependency**, and it lives here — never imported
by `Prism3/engine/`. The engine's buildless, no-`npm install` invariant is what lets it bundle into the
Figma plugin sandbox; a dependency reaching into it would end that.

## Files

| file | what it is |
|---|---|
| `sd.consumer.mjs` | the naive build — a stranger's config, deliberately unhelpful to us |
| `check-consumability.mjs` | the gate: measures the gap, pins it, enforces the rule |

`sd.consumer.mjs` exports two builds: `buildConsumer` (one source, the canonical tree) and
`buildProjected` (two sources, base + one overlay). Both are the same stock config with no
preprocessor, transform or format of ours — the only difference is `source`, and `log.warnings:
'disabled'` to silence the collision notice that multi-source merging is *supposed* to raise. That is a
config **option**, not code a consumer has to run, which is the line the `[RULE]` assertions enforce.

Any future **production** config must be a second file here. It must never be merged into the consumer
one — the consumer config's value is entirely conditional on staying naive.
