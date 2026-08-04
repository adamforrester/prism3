# 31 — Descriptive vocabulary: the words a brief already uses

> A brand brief does not speak in numbers. It says *"corners are generous and the UI is dense"*, not
> `radiusScale: 2, density: compact`. The engine had no way to hear that: nine slider levers took
> bare numbers with no vocabulary at all, and a `design.md`'s prose was parsed and then discarded.
> So an agent working from a brief had to invent a number — and its guess went unrecorded, which is
> the part that matters. **A logged default is auditable; a guessed one is not.** This file records
> what the vocabulary is, where the words came from, and why the fuzzy step deliberately lives
> outside the engine.

---

## What was actually missing

Two measurements framed the work, and the first corrected an overclaim in the issue that started it.

**Only 9 levers could have taken a vocabulary, not 30.** Of 39 levers, 9 are enums that already speak
in words (`density: comfortable | compact | spacious`), and 21 are colors, objects, lists and toggles
that structurally cannot take an adjective — an OKLCH anchor is not "friendly". The genuinely
affected set was the **9 sliders**, and three of those (`layout.columns`, `disabledMin`, `baseMd`) are
bare quantities no word describes better than the number does. A 3:1 contrast floor is not "gentle".
So the target was **six**.

**Brief prose was dead weight.** `parseDesignMd` returns `{ input, prose }` and *nothing in the
engine ever read `prose`* — `theme_from_brief` used the frontmatter only. `design-md.ts`'s own header
describes that prose as "latitude an agent reads to make the judgment calls the frontmatter can't
encode", and the example briefs even annotate their intended mapping (*"energetic" → snappy tempo*).
None of it connected to anything.

## Two layers, and the seam between them

**1. Named stops.** `radiusScale: 'soft'` instead of `1.5`. An assertion about one lever.

| lever | stops |
|---|---|
| `radiusScale` | sharp 0 · modest 0.5 · standard 1 · soft 1.5 · round 2 |
| `shadow.softness` | crisp 0.4 · standard 1 · soft 1.4 · diffuse 2 |
| `neutral.chroma` | pure 0 · subtle 0.006 · tinted 0.012 · saturated 0.02 |
| `neutral.hue` | warm 60 · cool 250 |
| `layout.containerMax` | narrow 1120 · standard 1440 · wide 1680 · full 1920 |
| `layout.containerNarrow` | tight 600 · standard 720 · generous 840 · wide 960 |

`neutral.hue` is the least precise entry here and is named to admit it: hue is a circle and "warm" is
an arc, not a point. It carries only the two poles the briefs actually use (harbor: *"the greys lean
warm even though the brand runs cool"*).

**2. Personality traits.** `personality: ['soft', 'generous']` — a cross-cutting brand trait that
fills *several* levers at once. Nine of them, each moving two or more levers; a one-lever trait would
just be a slower way to write a named stop.

## Why the engine does not read the prose

The obvious design is to scan the brief's prose for these words. It was considered and rejected.

Keyword-matching free text misfires exactly where briefs are richest — *"we avoid anything playful"*,
*"less rounded than our old site"* — and it would put a fuzzy step at the center of an engine whose
entire claim is that every decision is deterministic and auditable. Instead:

> **The fuzzy step stays in the agent; the auditable step stays in the engine.**

An agent reads the prose, maps it onto the controlled vocabulary, and passes `personality: [...]`.
That is the same seam `standardToBrandInput` already draws between a loose input and a precise
`BrandInput`, and it is why `personality` is a *controlled* list rather than a place to paste brief
adjectives. Harbor's brief opens "Trustworthy, calm, maritime" and only `calm` is a trait — an agent
maps the other two onto `restrained`. That is the seam working, not a gap in it.

## Where the words came from

Not invented. Read off the three example briefs, which annotate their own mapping. Every trait cites
the brief language it came from, and that citation **ships in the note**, so a reader can audit the
inference rather than just observe it:

```
personality 'generous' → density spacious, layout.containerNarrow 840
  [aurora: "Corners are generous"; wendys: "Confident hierarchy, generous whitespace"]
```

A tenth candidate — `confident`, attested in both aurora and wendys — was dropped as redundant
against `bold` rather than shipped for the sake of a rounder number.

## Precedence, which is what makes the layer safe to add

Two rules, and an advisory layer is dangerous without both:

1. **An explicitly set lever always wins.** Personality fills only what the brief left absent, and
   says so when it declines. Without this, adding `personality` to an existing brief could quietly
   change a value the author had already chosen.
2. **Between traits, the first listed wins.** Order is the author's stated priority, and a later
   trait that wanted the same lever is *reported* rather than silently dropped.

```
personality 'soft'  → radiusScale 1.5, shadow.softness 1.4
personality 'sharp' → nothing to fill; kept radiusScale (already set by 'soft'), …
```

That attribution is load-bearing and was wrong in the first cut. The presence check ran before the
"which trait claimed this" check — but a trait-applied lever *is* present by then, so every
trait-vs-trait collision reported as `(set explicitly)`, **crediting the author for a choice the
engine made.** An audit trail that misattributes is worse than none. It was found by running the
resolver, not by reading it: the branch was unreachable and looked entirely fine.

## Unrecognized words fail loud, at both enforcement points

The first cut treated an unknown trait leniently — a note, generation continues — reasoning that a
brief should not be brittle over a word the engine merely does not know. But `theme-schema.json`
declares `personality` as a closed enum, so the two enforcement points disagreed: anything arriving
through the CLI or MCP was already hard-rejected, and the lenient branch was reachable only from the
in-memory hosts. **Two enforcement points that differ is worse than either rule alone.**

The enum won, for a reason specific to who calls this: for an agent, a hard error listing the nine
valid traits closes the loop in one turn, where a note may never be read. It throws in the engine as
well as failing the schema, because `brandTheme` is also called with in-memory input that never
touched validation — the same reasoning as the `root` slug check.

## Discoverability

An agent learns the vocabulary from `list_levers` without reading this file:

- each of the six sliders carries its `stops` map, **joined against `SLIDER_STOPS` rather than
  restated**, so the catalogue an agent reads cannot drift from the table the engine resolves against;
- `personality` appears in `nonLeverFields` with its enum. `nonLeverFields` previously dropped `enum`,
  so it could describe a closed set in prose but never name its members — `modes` had the same gap
  and is fixed by the same change.

## What this does not do

- **No per-mode stops.** `modeLevers.<mode>.radiusScale` still takes a number: a per-mode deviation
  is a precision instrument, and reaching for one means you know the value you want.
- **No new tokens.** Traits move lever *values*, so the token-name contract (docs/30) is untouched;
  a brand that declares no vocabulary emits byte-identical output.
- **No vocabulary for the numeric-by-nature levers.** `layout.columns`, `disabledMin` and `baseMd`
  keep their numbers, deliberately. Inventing words for them would make the vocabulary look complete
  while making it worse.
