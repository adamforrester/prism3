# `@prism3/tokens`

The token→code leg of `docs/19`. **Only the token leg** — nothing component-shaped belongs here yet.

*Corrected 2026-08-12: this read "the component leg (web components, React, Storybook) is genuinely
blocked on the author-headless-vs-wrap decision (#252)." That framing is retired. #252 governs the
behavior layer, which `19` §3's re-ranked projections put at ranks 5–6; it is parked, not blocking.
The token layer this package gates is now **rank 1** — the projection both named delivery platforms
consume natively — so this workspace got more load-bearing, not less.*

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

## The projection is the standard answer, not a workaround

The section above is easy to read as an apology. It is not one, and the field evidence is worth
carrying because it changes what the projection *is*.

Style Dictionary issue **#1171** — *Multiple conditional / mode values for a single design token*,
opened 25 April 2024 — asked for exactly what the section above says is impossible: one file whose
tokens each carry several mode-conditional values. It was **closed as completed within days**, and the
resolution is the part that matters: the answer was to build **separate outputs per theme** rather
than teach one file to hold multi-valued tokens. `base` + `<mode>.overlay` is that shape. We are
following the tool's own recommended approach rather than routing around a gap in it.

The shape is also not idiosyncratic. The **DTCG Resolver Module** (preview draft, 30 July 2026)
defines **sets** of token sources merged in array order, **modifiers** carrying a `contexts` map, and
a **resolution order** deciding priority in conflicts. Our `base` is a set; each `<mode>.overlay` is a
context under a modifier. The engine converged on the standard's data model independently, before that
draft existed.

**Why we still emit plain per-mode files rather than a resolver document.** Style Dictionary issue
**#1590**, *Support for DTCG v2025.10* (open, filed 4 November 2025), tracks what v5 does and does not
yet handle. Color, border, shadow and dimension are done; **resolvers are listed as still in
progress**. A resolver document is not readable by a stock Style Dictionary today, so emitting one
would break the single promise this gate exists to keep. Re-check #1590 before proposing that change.

Two cautions, so the convergence is not over-read:

- The draft states *"do not attempt to implement this version."* This is worth knowing about, not a
  spec to conform to yet.
- The DTCG 2025.10 stable announcement advertises theming "without file duplication" while the
  mechanism lives in this separate draft. Anyone acting on "DTCG has theming now" is acting on an
  announcement rather than a spec.

The Resolver Module also scopes itself to how token files **compose**, and states it does not define
a manifest of which files belong to a distribution. Membership is a separate concern, tracked as
#674.

## Scope — every brand, and why that mattered

The gate originally measured **one** brand (`nb`), which answered "can a stranger consume `nb`?" and
was silent on the other three. #635 widened it to the whole corpus.

Brands are **discovered** from `packages/engine/out/`, so a fifth is covered the day it lands. The four
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

## What widening it found: `[object Object]`, and the split that fixed half of it

Widening the gate to all four brands (#635) found **fourteen** values reaching the CSS as the literal
string `[object Object]` — Style Dictionary's output for a composite type it has no transform for.

| type | brands | count | note |
|---|---|---|---|
| `spring` | all four | 3 each | a Prism3 type with no DTCG equivalent, so no consumer has a transform for it |
| `gradient` | `aurora` | 2 | a **standard DTCG composite type** — a conforming consumer reading a conforming type gets garbage |

**Three of them were in `nb`, the brand the gate already measured.** It reported 556 leaves → 556
variables, a perfect 1:1, while three of those 556 were unusable. The count was right and the output
was broken — which is the precise shape of defect a count is structurally unable to see, and the
reason the value-integrity assertion exists at all.

**#642 split those fourteen in two, because only one half was ours,** and the split matters more than
the twelve tokens it moved:

| | value | kind |
|---|---|---|
| **emitter-side** — non-DTCG `$type`s in the conforming projection | **0**, asserted | a **RULE** — fails the day another non-standard type ships |
| **consumer-side** — standard types a stock SD cannot serialize | **2** (`aurora` gradients), pinned | a **MEMORY** — genuinely not ours |

`spring` left the projection. Those files exist to make a conformance promise (#609), and a type no
consumer can resolve makes the promise false while producing a garbage value in the same stroke. It
stays in the canonical `<brand>.tokens.json`, which is deliberately extension-based and ours — so the
corpus total is now **2**, not 14.

`gradient` did not move, and **our token was never wrong**: it is an array of stops carrying `color`
and `position`, exactly the DTCG shape. Style Dictionary's `css` transformGroup simply ships no
gradient handler. Both candidate "fixes" are worse than the gap — pre-serializing a CSS string would
make our output **non-conforming**, and shipping a gradient transform is what the NO CUSTOM CODE rule
forbids. That rule governs what **we** ship; a consumer writing their own transform is their
configuration, not our adapter. So it stays measured as a documented consumer gap.

Note what the emitter-side check is derived from: **each emitted `$type` compared against the DTCG
spec list, not a count of `[object Object]`.** That is not a stylistic preference — a corruption count
is *structurally* blind to a non-standard type whose value is scalar. Measured, through this same stock
config:

```
--prism-motion-elevation-step: 4;     /* $type: "elevation" — invented, non-standard */
--prism-motion-grid: 8;               /* $type: "gridUnit"  — invented, non-standard */
```

Clean CSS, zero corruption, promise just as broken. A pinned count can only remember what was true when
someone wrote it down; a rule fails on the next one. Widening either number to make a failure go away is
the same move as adding a preprocessor — it ends the measurement. `docs/34` §10 carries the general
shape.

## Independence

Per CLAUDE.md principle 4 and `docs/34`: `leaves` is counted by walking the **source JSON**, `vars` by
parsing the **emitted CSS**. Two different artifacts, read two different ways. Deriving one from the
other would make the 1:1 collapse undetectable — which is the single thing this gate exists to see.

The two `DTCG_TYPES` lists are the same rule stated twice, and that is deliberate. The engine's copy
(`emit-dtcg-overlay.ts`) DECIDES what to project; this gate keeps its own. Importing the engine's would
make the emitter-side rule unfalsifiable — adding a type there would put it back in the projection
**and** simultaneously teach the gate that it conforms, so the assertion would pass while the promise
broke. Two independent transcriptions of a published spec is the point, not duplication to clean up.

Mutation-verified. Nine mutations, nine caught:

| mutation | caught by |
|---|---|
| a mode preprocessor is added | the `[RULE]` source assertions |
| `outputReferences` switched off | the `var(--` reference count + the pinned light-mode value |
| the selector changed (simulating a mode fix) | the exact-selector assertion |
| an overlay carries base values, not the mode's | the per-mode `actually differs from base` assertion |
| a brand leaves the corpus | the `[SCOPE]` by-name assertions |
| a non-DTCG `$type` reaches the projection | the `[RULE]` per-`$type` assertion, naming the paths (#642) |
| the consumer-side gradient count moves | the `[CONSUMER-GAP]` pin (#642) |
| a conforming token vanishes from the base | the by-name absentee check — *exactly* the non-DTCG tokens are absent, so a missing `color.*` fails rather than being excused as "a subset" (#642) |
| the token root is hard-coded to one dialect | the page-background check, on the three `prism`-rooted brands |

The first two survived the gate's first draft, which counted only names. Counting cannot see values,
references, or forbidden code. The fourth is the one this gate caught that the engine's own unit tests
could not — *which* leaves an overlay selects is independent of *what value* they carry, so every count
stayed correct. An assertion was added upstream in `packages/engine/test.ts` too; a contract of a
function belongs in a test of that function, not only in a gate three artifacts downstream.

## Dependency posture

Style Dictionary is **this repo's first real runtime dependency**, and it lives here — never imported
by `packages/engine/`. The engine's buildless, no-`npm install` invariant is what lets it bundle into the
Figma plugin sandbox; a dependency reaching into it would end that.

## Every platform, not only CSS (#2424)

`check-platforms.mjs` runs after the consumability gate, inside the same `check:consumability` script.
It builds every brand (the canonical tree, the base projection, and base + each mode overlay) through
`sd.platforms.mjs`, the same stranger's config asked for CSS, SCSS, JavaScript (ES module and `.d.ts`),
iOS (Swift) and Android (resource XML and Compose). Built-in transform groups and formats only, held
by the same `[RULE]` source check. The built files land in `build/platforms/<brand>/<set>/`, ignored
by git; run the script to look at them.

It asserts four things, each labeled in its output:

- **`[READS]`**: every platform file is written, every source token reaches every platform, the
  `.d.ts` declares every export, and the dark overlay moves the page background on every native
  platform.
- **`[VALUE]`**: literals per brand, typed by hand: the brand's primary hex (and its `UIColor`,
  Android and Compose forms), `16px`, `1rem`, the brand's normal duration in ms, a `1.5` line height
  and the display typeface.
- **`[VERDICT]`**: per platform × DTCG `$type`, the worst outcome any token had, pinned.
- **`[GAP #N]`**: where stock Style Dictionary writes a wrong or uncompilable value, the `[VALUE]`
  literal is that measured value, tagged with the issue tracking it.

`platform-outcomes.mjs` holds the judging, shared with the version matrix: it walks the DTCG,
resolves aliases itself and parses each written file. A value is **emitted** (as written in the
DTCG), **transformed** (into the platform's own usable form), **broken** (present but would not
compile, would not parse, or states the wrong number) or **lost** (absent).

### What it found

The full tables are in [`sd-version-matrix.md`](sd-version-matrix.md). In short:

- **Web is whole.** CSS, SCSS and JavaScript carry every type usably except gradient on CSS and
  SCSS, the known consumer gap above.
- **Native is not, on any version.** iOS, Android and Compose each break several types: px sizes
  come out 16 times too large (#2430); durations, font families, stroke styles and cubic beziers are
  written as raw text that does not compile in Swift or Kotlin (#2431); every composite becomes
  `[object Object]` (#2432); Android refuses `<integer>1.5</integer>` (#2433). Each is stock Style
  Dictionary's gap, not a DTCG defect.
- **One finding is ours:** letter spacing in `em` and the fluid container in `%` are dimension
  tokens in units DTCG 2025.10 does not allow (#2434).

### Which Style Dictionary version (#2425's preset question)

Measured, not assumed, by `tools/sd-version-matrix/`. It runs this config under 3.9.2, 4.0.0, 4.4.0,
5.0.0, 5.5.0 (this repo's lockfile) and 5.6.0, each installed in its own temp directory.

- **4.0.0 is the minimum that needs no preset.** Every version from 4.0.0 to 5.6.0 carries every
  base token to every platform, and every per-type verdict is the same on all of them.
- **3.9.2 reads none of it.** 3.x has no `usesDtcg` and reads only `value`. Renaming the keys (the
  least a preset could do, measured as a not-stock experiment) gets the tokens into JS, Swift, Android
  and Compose. But the CSS and SCSS builds then throw on composite values, and on native it breaks more
  than 4.x does: colors come out as unconverted strings, because 3.x picks transforms by the token's
  path (`color.*`, `size.*`), and ours start at the brand root.

So a consumer on 4.0 or later needs no preset. A preset for 3.x would have to rewrite paths and
values, not only keys, so it would be a second emitter. And no preset fixes native: what breaks
there are Style Dictionary transforms that our DTCG is already correct for.

## Files

| file | what it is |
|---|---|
| `sd.consumer.mjs` | the naive build — a stranger's config, deliberately unhelpful to us |
| `check-consumability.mjs` | the gate: measures the gap, pins it, enforces the rule |
| `sd.platforms.mjs` | the same stranger's config for every platform, as plain data plus one build entry point (#2424) |
| `platform-outcomes.mjs` | judges each token on each platform, read from the DTCG and the written files |
| `check-platforms.mjs` | the platform gate: reads, values, pinned verdicts |
| `sd-version-matrix.md` | the version matrix report, generated by `tools/sd-version-matrix/matrix.mjs --write` |

`sd.consumer.mjs` exports two builds: `buildConsumer` (one source, the canonical tree) and
`buildProjected` (two sources, base + one overlay). Both are the same stock config with no
preprocessor, transform or format of ours — the only difference is `source`, and `log.warnings:
'disabled'` to silence the collision notice that multi-source merging is *supposed* to raise. That is a
config **option**, not code a consumer has to run, which is the line the `[RULE]` assertions enforce.

Any future **production** config must be a second file here. It must never be merged into the consumer
one — the consumer config's value is entirely conditional on staying naive.
