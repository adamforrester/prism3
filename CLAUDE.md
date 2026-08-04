# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A design-tokens-only repository — no source code, no build pipeline, no package manager. Every file is JSON. Two brands live side-by-side under `Tokens/`:

- `Tokens/Prism2/` — the PRISM design system (`nbds.pds.*` namespace), modes: `light`, `dark`, `wireframe`, plus `shared`.
- `Tokens/New Balance/` — New Balance brand tokens, modes: `desktop`, `mobile`, plus `shared`.

There is no README, no Cursor/Copilot rules. (The above describes the original hand-built `Tokens/` layer; see the Prism3 note below — that layer is now joined by a TypeScript generation engine, and the repo *is* git-tracked.)

## Prism3 — the generation engine (start here for engine work)

This repo now also contains **`Prism3/`** — a dependency-free TypeScript **token generation engine** (run via `tsx`; **no build, no `npm install`**) that *generates* the token layer from a small brand input instead of hand-authoring JSON. It is git-tracked and has its own docs. The `Tokens/` JSON above is the **legacy hand-built source and the engine's regression target** (the engine reproduces New Balance, then generalizes to new brands).

For any engine or token-generation task, read these first (they hold the durable state so work survives a context clear):
- `Prism3/docs/00-progress.md` — status, decisions log, and prioritized next steps.
- `Prism3/docs/07-e2e-journey.md` — the designer↔developer↔agent pipeline + portable-core architecture.
- `Prism3/engine/README.md` — how the engine works and how to run it.

The engine core is buildless (run via `tsx`), but the repo also has two npm-workspace **surfaces** that bundle it (`web` + `plugin` are the root `package.json` workspaces):
- `web/` (`@prism3/web`) — the web dashboard/theme studio (esbuild dev server); see `web/README.md`.
- `plugin/` (`@prism3/plugin`) — the Figma plugin (two-context split + typed postMessage bridge); see `plugin/README.md`. For plugin work read `Prism3/docs/18-plugin-and-host-architecture.md` (capability grounding) and `Prism3/docs/22-plugin-plan.md` (the phased build plan, #106–#110).

Workflow: one PR per feature branch off `main` → squash-merge → delete branch → sync `main`.

**Carry the `Prism3/docs/00-progress.md` entry in the feature PR itself**, not as a follow-up. Three PRs in a row (#306, #312, #315) merged without one and needed a separate docs PR to catch up, and the entry is worth most for exactly the things a diff cannot show: the diagnosis that made the fix small, the tradeoff that was deliberate, the approach tried and discarded, and any trap waiting for whoever re-verifies this later. Write it as part of the work, while that reasoning is still in hand.

## Two parallel token formats

Each brand contains the **same logical tokens twice**, in two formats. Edits usually need to land in both — they describe the same data for different consumers.

```
<Brand>/tokens/
├── raw-figma/   # Figma plugin export format
└── tokens/      # DTCG (W3C Design Tokens) format
```

### `raw-figma/*.json` — Figma variable export
Flat array under `variables[]`, file-scoped `$collection` + `$mode`. Colors are RGB float objects (`{r, g, b, a}` 0-1). References use `alias` + numeric `VariableID:*`. This is what Figma's Variables plugin reads/writes.

### `tokens/*.json` — DTCG format
Nested object tree (e.g. `nbds.pds.color.blueberry.100`). Each leaf has `$type`, `$value`, `$description`, `$extensions.figma`. Aliases use brace syntax: `"{pds.color.neutral-cool.850}"`. The `$extensions.figma.variableId` round-trips back to the raw-figma IDs.

When editing a value: change it in **both** the raw-figma file and the DTCG file, and keep the `variableId` linkage intact — it's how the two formats stay reconcilable.

## Mode organization differs per brand

- **Prism2** splits by appearance: `light/`, `dark/`, `wireframe/` each carry `brand-theme.json` + `motion.json`; primitives, typography, spacing, etc. live in `shared/`.
- **New Balance** splits by viewport: `desktop/typography.json`, `mobile/typography.json`; everything else (color, motion, focus, radius, layout, shadows, breakpoints, dimensions) lives in `shared/`.

Don't force one brand's structure onto the other.

## Naming conventions

- Prism2 tokens are namespaced `nbds.pds.<category>.<...>` — preserve this prefix.
- Token slugs in DTCG paths use kebab-case for words, dot-separated levels, with numeric scale steps as keys (`blueberry.100`, `blueberry.150`).
- The Figma exports use slash paths (`pds/color/blueberry/050`) — the `0` padding (e.g. `050`) only appears in raw-figma; DTCG drops it.
- **US English** in all *visible UI text* and all *emitted artifact prose* (`out/**`, the emitted `schema/*` files, the generated reports): `color` not `colour`, `gray` not `grey`, `-ize` not `-ise`. **Code comments and identifiers are exempt** — a deliberate carve-out, not an oversight. The hand-authored contract (`Prism3/schema/theme-schema.json`) and the engine README were converted and folded into the gate (#349); that open decision is now closed. **This is enforced, not remembered**: `npx tsx Prism3/engine/lint-us-english.ts` gates every shipped surface — `out/**`, the emitted `schema/`+report artifacts, `web/dist/*.js`, the schema contract and the engine README — and runs in CI *after* the web build. Its scope is imported from `regen.ts`, so a new emitted artifact is covered automatically. The three traps it encodes, each of which caught a previous pass (#162 → #260 → #302 → #310 → #313): a **fixed word list under-counts** — it scans the `-is(e|ed|es|ing|ation)` and `-our` *patterns* minus a false-positive set, since `colour|grey|behaviour` misses `generalised`; a **pattern alone under-counts the other way** — `grey` ends in neither suffix, so the pattern was blind to a third of the rule above and `greyscale` shipped in the schema contract past 90-file scans, which is why stems with no productive suffix get a second substring scan (`STEMS`) rather than the pattern being widened; and **source greps miss what ships** — `Prism3/engine/levers.ts` prose is inlined into `web/dist/main.js`, so the built bundle is scanned, not just the `.ts`. A false positive is fixed by adding to `NOT_EN_GB`, never by narrowing either scan.

## Working with this repo

- Path quoting: the repo root (`/Users/aforrester/Documents/Prism3`) has no spaces, but some paths inside it do (`Tokens/New Balance/`) — quote paths in Bash commands when they reach into those.
- `.DS_Store` files are present at every directory level; ignore them.
- There is nothing to build, lint, or test. Validation is by JSON parse + reference resolution; if asked to validate, check that every `{...}` alias in DTCG files resolves to an actual path, and every `alias` ID in raw-figma matches a `VariableID` defined somewhere in that brand's exports. (This applies to the `Tokens/` layer; the `Prism3/` engine has its own tests + regression — see its README.)

## Working principles (agent behavior)

Adapted from the Karpathy coding guidelines (github.com/multica-ai/andrej-karpathy-skills). The point is to turn imperative requests into declarative goals with verification loops.

1. **Think before coding.** State assumptions explicitly; surface ambiguities and tradeoffs *before* writing code. When a choice is genuinely the user's to make, ask — don't guess. (This project runs as a design dialogue; decisions get confirmed before they're built.)
2. **Simple implementation, rigorous correctness.** Write the minimum code that solves the request — no speculative abstractions or features beyond what was asked; stay dependency-free (own the math, don't pull libraries). BUT this is an accessibility / design-system domain: hold the *correctness* bar high — contrast contracts, field research (the knowledge-base + NB/Prism2 examples), and "better than the examples" are the standard, not gold-plating. Simple code, rigorous contracts — the two are not in tension.
3. **Surgical changes.** Edit only what the task needs; don't refactor adjacent code or fix unrelated pre-existing issues unless asked. One concern per PR. Preserve existing patterns, naming, and conventions.
4. **Goal-driven execution with verification.** Define verifiable success up front and loop until green. For the engine, before pushing: `npx tsx Prism3/engine/regen.ts` (regenerates every committed artifact — `out/*` plus the three emitted `schema/` files), then confirm the gates hold — `npx tsx Prism3/engine/regen.ts --check` (no committed artifact has drifted), `npx tsx Prism3/engine/test.ts` (unit tests), `npx tsx Prism3/engine/mcp-test.ts` (the MCP surface over real stdio — transport framing, 2026-07-28 conformance, and the agent journey), the NB regression, and every DTCG alias resolves + every mode contrast contract passes. The `--check` gate is the only one that reads the *committed* artifacts; every other gate runs the engine live and compares it against itself, so a stale artifact passes them all (#281). **All of these now also run in CI** (`.github/workflows/ci.yml`) on every PR and push to `main`, so the sequence is enforced rather than remembered — but run it locally first; CI is the backstop, not the workflow.
