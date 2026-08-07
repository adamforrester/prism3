# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

An npm-workspace monorepo for the **Prism3 design-token engine** and its surfaces. Three layers, and knowing which one you're in decides almost everything:

| Layer | What it is |
|---|---|
| `Prism3/` | The **engine** — dependency-free TypeScript, run via `tsx` (no build). Generates the token layer from a small brand input. Start here for engine work. |
| `web/`, `plugin/` | The two **surfaces** that bundle the engine (npm workspaces `@prism3/web`, `@prism3/plugin`). These build. |
| `Tokens/` | The **legacy hand-built token JSON** — Prism2 + New Balance. Read-only in practice: it is the engine's regression target, not a place to author. |

Within `Tokens/` only, the old description still holds — every file is JSON, nothing to build:

- `Tokens/Prism2/` — the PRISM design system (`nbds.pds.*` namespace), modes: `light`, `dark`, `wireframe`, plus `shared`.
- `Tokens/New Balance/` — New Balance brand tokens, modes: `desktop`, `mobile`, plus `shared`.

Also read `README.md` (the signpost) and **`CONTRIBUTING.md`** — §3 is the canonical gate list, and `Prism3/engine/lint-doc-gates.ts` enforces that it matches CI. No Cursor/Copilot rules exist.

## Prism3 — the generation engine (start here for engine work)

The engine generates the token layer instead of hand-authoring it: it reproduces New Balance from a small brand input, then generalizes to new brands. **No build, no `npm install`** — run it via `tsx`.

For any engine or token-generation task, read these first (they hold the durable state so work survives a context clear):
- `Prism3/docs/00-progress.md` — status, decisions log, and prioritized next steps.
- `Prism3/docs/07-e2e-journey.md` — the designer↔developer↔agent pipeline + portable-core architecture.
- `Prism3/engine/README.md` — how the engine works and how to run it.

The two surfaces that bundle the engine:
- `web/` (`@prism3/web`) — the web dashboard/theme studio (esbuild dev server); see `web/README.md`.
- `plugin/` (`@prism3/plugin`) — the Figma plugin (two-context split + typed postMessage bridge); see `plugin/README.md`. For plugin work read `Prism3/docs/18-plugin-and-host-architecture.md` (capability grounding) and `Prism3/docs/22-plugin-plan.md` (the phased build plan, #106–#110).

Workflow: one PR per feature branch off `main` → squash-merge → delete branch → sync `main`.

**When more than one agent may be working, use a git worktree — not the shared checkout.** `git worktree add /tmp/p3-<lane> -b <branch> origin/main`, then symlink `node_modules` from the main checkout (the repo is buildless, but a fresh worktree has none, so `npx tsx` would re-download and the `web`/`plugin` builds would fail). Anything that checks out a branch in a tree someone else is editing destroys their uncommitted work: `/review-pr` did exactly that twice on 2026-08-05, once auto-stashing the other session's edits and once rebasing its branch onto an unrelated PR's commits. Recovery, if it happens to you: the checkout auto-stashes rather than deletes, so `git stash list` then `git show 'stash@{0}:<path>'` extracts single files **without popping** — popping merges two PRs' work, since the stash may hold both. `regen --check` should report **88** artifacts; `ci.yml` asserts that number. If you see a different count, check `git status` for an untracked file under `Prism3/engine/out/` before assuming drift.

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
- **US English** in all *visible UI text* and all *emitted artifact prose* (`out/**`, the emitted `schema/*` files, the generated reports): `color` not `colour`, `gray` not `grey`, `-ize` not `-ise`. **Enforced, not remembered** — `npx tsx Prism3/engine/lint-us-english.ts` gates every shipped surface and runs in CI *after* the web build (its scope covers the built bundle). Scope is imported from `regen.ts`, so a new emitted artifact is covered automatically; `schema/token-contract.json` is deliberately *not* a regen artifact (see principle 5) and so is named by hand in the gate — anything else kept out of regen needs the same line. **A false positive is fixed by adding to `NOT_EN_GB`, never by narrowing a scan.** Code comments and identifiers are exempt, *except in `web/src`*: which comments esbuild keeps in the bundle is an implementation detail, so an exemption the gate cannot see is not enforceable — write US English in `web/src` comments too. The four traps this gate encodes, each of which caught a previous pass, are documented in the file's own header; read it before touching either scan.

- **Voice.** All shipped prose follows `Prism3/docs/voice-standard.md` — the operative rules (four voice attributes, a banned-phrase list, per-channel register, tone by situation, a 5-question pre-ship check). It is short and self-contained by design: read it before writing UI strings, lever/role descriptions, emitted `$description` prose, `.ai.json` fields, READMEs, or marketing copy. The reasoning behind it is `Prism3/docs/29-tone-of-voice.md`; change the standard only by changing that. Two things to know going in: **most Prism3 prose is generated, not typed**, so applying the standard usually means editing `levers.ts` or `ai-metadata.ts` rather than a string; and the load-bearing attribute is **recessive** — Prism3 builds *other people's* brands, so in every product surface the tool's voice must not compete with the brand on screen (this is why we don't borrow the confidence about personality that first-party systems like Polaris or Material can afford). Code comments are exempt, same carve-out as US-English.

## Working with this repo

- Path quoting: some paths contain spaces (`Tokens/New Balance/`) — quote them in Bash commands. Use repo-relative paths; the absolute root differs per checkout (worktree, container, CI).
- **`Tokens/` has nothing to build, lint, or test** — validation there is JSON parse + reference resolution: every `{...}` alias in DTCG files resolves to a real path, and every raw-figma `alias` ID matches a `VariableID` defined in that brand's exports. Everywhere else, the gates in principle 4 apply.

## Working principles (agent behavior)

Adapted from the Karpathy coding guidelines (github.com/multica-ai/andrej-karpathy-skills). The point is to turn imperative requests into declarative goals with verification loops.

1. **Think before coding.** State assumptions explicitly; surface ambiguities and tradeoffs *before* writing code. When a choice is genuinely the user's to make, ask — don't guess. (This project runs as a design dialogue; decisions get confirmed before they're built.)
2. **Simple implementation, rigorous correctness.** Write the minimum code that solves the request — no speculative abstractions or features beyond what was asked; stay dependency-free (own the math, don't pull libraries). BUT this is an accessibility / design-system domain: hold the *correctness* bar high — contrast contracts, field research (the knowledge-base + NB/Prism2 examples), and "better than the examples" are the standard, not gold-plating. Simple code, rigorous contracts — the two are not in tension.
3. **Surgical changes.** Edit only what the task needs; don't refactor adjacent code or fix unrelated pre-existing issues unless asked. One concern per PR. Preserve existing patterns, naming, and conventions.
4. **Goal-driven execution with verification.** Define verifiable success up front and loop until green. **Before pushing, run the whole list below — never a subset chosen because the diff "only touched the engine."** CI runs every one of these on every PR regardless of which files changed, so a documented checklist shorter than CI's is one a diligent contributor can follow exactly and still ship broken. That is not hypothetical: two independent PRs each shipped a "gates all pass" table built faithfully off a list that had gone short, and both broke `lint:classes`.

   - **Engine** — run `npx tsx Prism3/engine/regen.ts` first (regenerates every committed artifact), then confirm: `regen.ts --check` · `test.ts` · `mcp-test.ts` · `token-contract.ts --check` · `lint-skills.ts` · `nb-regression.ts` · `lint-doc-gates.ts`, plus every DTCG alias resolving and every mode contrast contract passing.
   - **Web** — `npm run -w @prism3/web` → `typecheck` (esbuild does not typecheck, so this and `build` are not redundant) · `build` · `check:ignore` · `lint:contrast` · `lint:classes` (a NEW class-name pairing fails until it is added to `ALLOWED` in `web/lint-classes.mjs`).
   - **Plugin** — `npm run -w @prism3/plugin` → `typecheck` (both contexts) · `test` · `build` (`dist/main.js` must carry 0 `node:` builtins).
   - **Last, after the web build** — `npx tsx Prism3/engine/lint-us-english.ts`; its scope includes the built `web/dist/*.js` bundle, so running it earlier scans a stale one.

   `CONTRIBUTING.md` §3 is the canonical list with per-gate rationale, and `lint-doc-gates.ts` fails CI if it, this list, or the PR template drifts from `ci.yml`. **`regen.ts --check` is the only gate that reads the *committed* artifacts** — every other one runs the engine live and compares it against itself, so a stale committed artifact passes all of them.

   **And a gate is only as strong as the independence of the two things it compares.** A gate whose expected value is derived from the thing it checks cannot fail — and it reports that as a pass, not as silence. **So the check is not "does the suite go red" — it is: mutate the subject and confirm *your* gate is among the failures, by name.** Two consequences worth holding: DRY between a gate and its subject is a *silent deletion of the gate*, not a cleanup (the second derivation **is** the gate — say so in a comment, or someone will tidy it away); and a gate with a scope must assert each promised surface is **represented**, never merely count files. This is the most-repeated defect class in the repo's history and not one instance was ever caught by a gate — every one was found by hand. Read `Prism3/docs/34-gate-independence.md` (the rule, six sub-shapes, and the register) *before* writing a gate, not after.

5. **Versioning: names are versioned, values are not.** Two independent versions live in `Prism3/engine/version.ts`. `ENGINE_VERSION` answers *"what code produced this?"* — stamped into every emitted tree's `$extensions.generator.version` and reported as the MCP `serverInfo.version`; it bumps on any behavior change including a pure value change. `CONTRACT_VERSION` answers *"can my app still resolve the names it references?"* — it bumps **only** when the guaranteed token-name surface moves. The split is the point: a consumer hard-codes `prism.color.text.primary` and does not care that the brand's hue moved four degrees, but a rename makes that reference resolve to nothing with no error anywhere. `Prism3/schema/token-contract.json` is the committed baseline, keyed *below* the configurable root because the root is itself a lever. Removing or retyping a path is MAJOR; adding is MINOR; `brandDependent` paths never force a bump. **Never add this baseline to `regen.ts`** — regen rewrites every generated artifact, so a regenerated baseline would silently rewrite itself to agree with a deletion and both gates would go green. It is rewritten only by an explicit `npx tsx Prism3/engine/token-contract.ts --accept`, which refuses unless `CONTRACT_VERSION` has already been raised by the increment the diff requires: **a gate allowed to rewrite what it reads has no memory.** Full policy, corpus rationale and what is deliberately *not* covered: `Prism3/docs/30-versioning-and-compatibility.md`.
