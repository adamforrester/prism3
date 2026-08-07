# `@prism3/tokens`

The token→code leg of `docs/19`. **Only the token leg.** The component leg (web components, React,
Storybook) is genuinely blocked on the author-headless-vs-wrap decision (#252), which has no lean
recorded anywhere — so nothing component-shaped belongs here yet.

What exists today is one thing: **a gate that answers whether a stranger could consume our tokens.**

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

## Why the gate passes while the output is broken

It is a **characterization** gate. The emitter has a known defect (#609): per-mode values live under
`$extensions.prism3.modes`, which DTCG defines as *ignorable*, so every conforming consumer silently
sees one value per token — measured, **556 leaves → 556 CSS variables, 1:1**, with three of four modes
invisible.

A gate that simply went red would block every unrelated PR or get skipped. A gate that went green would
be lying. So it **pins the measured behavior** instead:

- **fix #609** → the pinned assertions fail; update them and close the issue
- **make it worse** → the pinned assertions fail
- **change nothing** → green, and the gap prints on every run so it stays visible

Same posture `regen --check` takes toward `out/`: the job is to have a **memory**, not an opinion.

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

The first two survived the gate's first draft, which counted only names. Counting cannot see values,
references, or forbidden code.

## Dependency posture

Style Dictionary is **this repo's first real runtime dependency**, and it lives here — never imported
by `Prism3/engine/`. The engine's buildless, no-`npm install` invariant is what lets it bundle into the
Figma plugin sandbox; a dependency reaching into it would end that.

## Files

| file | what it is |
|---|---|
| `sd.consumer.mjs` | the naive build — a stranger's config, deliberately unhelpful to us |
| `check-consumability.mjs` | the gate: measures the gap, pins it, enforces the rule |

A **production** config (whatever adapters #609 lands on) will be a second config here. It must never
be merged into the consumer one — the consumer config's value is entirely conditional on staying naive.
