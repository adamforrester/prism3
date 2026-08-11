# prism3

A design-tokens repository with two layers: a **legacy hand-built token set** and a
dependency-free **TypeScript generation engine** that reproduces it and generalizes to new
brands. The engine is the active surface; the hand-built layer is its regression target.

**Live dashboard — <https://prism3-ds.vercel.app/>** — the engine running client-side: edit a
brand's levers and watch the ramps, the component preview and the per-mode contrast contracts
re-resolve.

> This is a signpost. The durable state — status, decisions, architecture — lives in the
> docs linked below; this file points, it doesn't restate. For agent conventions read
> [`CLAUDE.md`](CLAUDE.md); to pick up work, start with [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Layout

| Path | What it is |
|---|---|
| [`packages/engine/`](packages/engine/) | The **generation engine** — a brand is a small validated input that expands into a full token tree, AI metadata, and platform outputs (DTCG + Figma). Buildless and dependency-free; consumed by name as `@prism3/engine`. Start here for engine work. See [`packages/engine/README.md`](packages/engine/README.md). |
| [`docs/`](docs/) | The **design record** — the numbered design docs (the architecture spec, the decisions log, the open questions) plus `superpowers/` working notes. |
| [`reference/`](reference/) | The **legacy hand-built tokens** — Prism2 (`nbds.pds.*`) and New Balance, in two parallel formats (Figma variable export + DTCG). The engine's regression target, not a build output. |
| [`apps/studio/`](apps/studio/) | The **theme studio** — a browser host over the engine's shared lever/preview contracts, deployed at the link above. See [`apps/studio/README.md`](apps/studio/README.md). |
| [`apps/plugin/`](apps/plugin/) | The **Figma plugin** — the write host over the same engine core, split across Figma's two isolated contexts (main thread + UI iframe) with a typed message bridge between them. See [`apps/plugin/README.md`](apps/plugin/README.md). |
| [`apps/tokenpress/`](apps/tokenpress/) | **TokenPress** — the Figma plugin that exports Figma Variables, Text Styles, and Effect Styles *out* to DTCG. It runs the opposite direction from the engine, and it ships publicly in the Figma Community. Ported in whole rather than rewritten; it still has its own emitter and shares no code with `packages/engine/`. See [`apps/tokenpress/README.md`](apps/tokenpress/README.md). |
| [`packages/tokens/`](packages/tokens/) | The **consumability gate** — a stock Style Dictionary build over the emitted DTCG, kept deliberately naive so it answers whether a stranger could consume the output without code from us. See [`packages/tokens/README.md`](packages/tokens/README.md). |
| [`skills/`](skills/) | The **shipped product skills** — `prism3-theme` (authoring a brand) and `prism3-consume` (building UI from generated tokens), for an agent working with Prism3. Gated by `lint-skills.ts`, because a skill describing a stale API is worse than no skill. |
| [`tools/`](tools/) | **Measurement harnesses** — runnable, committed, and deliberately outside CI. Today: [`exporter-comparison/`](tools/exporter-comparison/README.md), which runs both DTCG exporters over the same brand and classifies every difference. A tool here reports; it does not fail a build. |

## Running the engine

The engine core is **buildless** — self-contained TypeScript run via `tsx`, with no build step and
no dependencies of its own (CI runs it on Node 22):

```bash
npx tsx packages/engine/test.ts            # unit tests — color math + extreme-brand contracts + design.md/CLI
npx tsx packages/engine/nb-regression.ts   # regression: generated tokens vs the real New Balance set
npx tsx packages/engine/emit-dtcg.ts       # emit the DTCG token tree; validate every alias + mode contrast contract
npx tsx packages/engine/emit-figma.ts      # emit the Figma import artifact (out/figma/<brand>/)
```

The full command list (CLI, visualize, the `emit-*` contract writers) is in
[`packages/engine/README.md`](packages/engine/README.md).

## Running the studio

The surfaces around that core — [`apps/studio/`](apps/studio/), [`apps/plugin/`](apps/plugin/),
[`packages/*`](packages/) — are npm workspaces that bundle it, so they **do** need an install:

```bash
npm install                              # from the repo root — resolves every workspace
npm run dev -w @prism3/studio            # esbuild dev server on http://127.0.0.1:5173
npm run build -w @prism3/studio          # bundle to apps/studio/dist/
```

[`apps/studio/README.md`](apps/studio/README.md) has the rest — what each stage of the shell does,
and the deploy contract behind the live link above.

## The gates (the correctness contract)

Validation here isn't a linter — it's a set of contracts every change must keep green before
merge. [`.github/workflows/ci.yml`](.github/workflows/ci.yml) is the authority on the full list and
runs every one of them on each PR; what follows is a summary of what they cover, not the checklist:

- **The engine** — the unit suite, the MCP surface driven over real stdio, and the New Balance regression (exits non-zero on a new divergence; reports aggregate ΔE00).
- **The emitted tokens** — every DTCG `{…}` alias resolves and every per-mode contrast contract passes; committed `out/*` has not drifted; the token-**name** contract has not broken.
- **Consumability** — a stock Style Dictionary over the emitted DTCG, run with a naive config on purpose, since that's the only configuration that answers whether a stranger could consume it.
- **The surfaces** — `studio` and `plugin` typecheck and build (esbuild does not typecheck), the plugin's Figma-API shim tests, and the studio chrome held to its own contrast floors and class-name rules.
- **Shipped text** — US English and the voice standard across `out/*`, the emitted contracts, the shipped skills, this file, and the built web bundle.

A PR states their results (see the [PR template](.github/pull_request_template.md)); the runnable
checklist lives in [`CONTRIBUTING.md`](CONTRIBUTING.md) §3.

## Where to go next

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — the workflow, the gates in full, how to brief an agent on this repo, and where each kind of durable state lives.
- [`docs/00-progress.md`](docs/00-progress.md) — status, the decisions log, and prioritized next steps (read this for handoff).
- [`docs/07-e2e-journey.md`](docs/07-e2e-journey.md) — the designer ↔ developer ↔ agent pipeline and the portable-core architecture.
- [`docs/10-figma-materialization.md`](docs/10-figma-materialization.md) — the `emit-figma` contract (the Figma-target shape).
- [`docs/01-token-architecture.md`](docs/01-token-architecture.md) — the architecture spec + Theme Schema contract.
