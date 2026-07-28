# Contributing to prism3-tokens

Most work on this repo is done by an agent with a person steering it. This guide is
written for that: what to read first, what the gates are, how to brief an agent, and
where each kind of durable state lives.

Read [`CLAUDE.md`](CLAUDE.md) too — it's the agent-facing conventions file, and its
working principles apply to humans as much as to agents.

---

## 1. Orient (five minutes)

| Read | For |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Repo conventions + the four working principles. Non-optional — agents load this automatically, so you should know what it told them. |
| [`Prism3/docs/00-progress.md`](Prism3/docs/00-progress.md) | The durable state log — status, decisions and why, most recent first. **Read the latest entries before starting anything**; the arc moves fast and your question may already be answered. |
| The lane doc for your work | `07-e2e-journey` (the pipeline + portable-core architecture), `18`/`22` (plugin), `11` (multi-brand north star), `23`–`26` (dashboard IA + UI conventions). Index in [`Prism3/docs/`](Prism3/docs/). |

The one architectural idea to hold: **the engine core is pure and dependency-free, and
every surface — web, plugin, CLI, MCP — is a thin adapter over it.** No `node:*`, no file
reads, no environment assumptions inside the theming core. Changes that blur that line
are the ones most likely to be sent back.

---

## 2. Workflow

One PR per feature branch off `main` → squash-merge → delete the branch → sync `main`.

**One concern per PR.** Surgical changes: edit what the task needs, don't refactor
adjacent code or fix unrelated pre-existing issues in passing. If you find something
else broken, open a finding and keep going.

The PR template's Gates block is the load-bearing part — fill it in with real numbers,
not ticks.

---

## 3. The gates

No build, no `npm install` for the engine — it's self-contained TypeScript run via `tsx`
(Node ≥ 20). Run these from the repo root:

```bash
npx tsx Prism3/engine/test.ts            # unit tests — report the N/N
npx tsx Prism3/engine/nb-regression.ts   # must exit 0 (the New Balance reproduction)
npx tsx Prism3/engine/emit-dtcg.ts       # every alias resolves + every mode contrast contract passes
npx tsx Prism3/engine/emit-figma.ts      # the Figma import artifact
```

If you touched a surface, add its checks:

```bash
npm run typecheck -w @prism3/web         # tsc --noEmit
npm run build     -w @prism3/web
npm run typecheck -w @prism3/plugin      # BOTH contexts — main (no DOM) and ui (no figma.*)
npm run test      -w @prism3/plugin      # write / readback / persist / float / styles shims
npm run build     -w @prism3/plugin      # dist/main.js must contain 0 `node:` builtins
```

**Green tests are not the finish line.** The standard here is that the change is
*driven* — the web UI verified headless, the plugin driven live against a real Figma
document. Live driving has repeatedly caught what in-memory shims hid (see the #148
`getLocalVariablesAsync('COLOR')` bug in `00-progress.md`, where the shims ignored the
type filter and the FLOAT read-back would have come back empty in production).

### The `out/*` discipline

Every PR states its output impact explicitly, in one of two forms:

- **byte-identical** — a validation-only, metadata, or surface change that provably
  doesn't move the emitted tokens; or
- **regenerated** — and *what* moved, in which brands and axes, and why.

Regenerating `out/*` without saying so is the single easiest way to hide a real
regression. If a committed fixture's byte-repro target moved, say so and justify it.

---

## 4. Working with an agent on this repo

The repo is built to be agent-operable — use that, but hold the line in three places.

**Point it at the durable state, not at your memory of it.** Start with "read
`CLAUDE.md` and the latest entries in `Prism3/docs/00-progress.md`, then the doc for
this lane." An agent that skips the progress log will happily re-derive a decision you
already made and settled months ago.

**The issue is the brief.** Our issue convention (What / Do / Watch-outs / Verify /
Out of scope) exists because it's directly executable — hand an agent the issue and it
has the seam, the pattern to mirror, the traps, and the definition of done. If an issue
isn't good enough to hand over cold, fix the issue before starting the work.

**Make it prove the gates, and read the proof.** Ask for the actual numbers (`925/925`,
`exit 0`, `336/336 per brand`) and the `out/*` impact. "Tests pass" is not a result.
Agents are good at this loop and bad at noticing when a gate silently stopped covering
the thing it was there to cover.

Two failure modes worth watching for specifically: **scope creep** (an agent tidying
adjacent code — principle 3 says don't), and **plausible-but-unverified claims** about
Figma or Style Dictionary APIs. This repo's precedent is to re-verify API surfaces
against current docs before building on them (Context7 or the live docs), because they
drift.

If you're using the packaged skills, `Prism3/skills/prism3-theme` (authoring a brand)
and `Prism3/skills/prism3-consume` (building UI from generated tokens) are the two that
exist; `.claude/commands/review-pr.md` runs an independent PR review.

---

## 5. Where things live

Keeping these separate is what stops the backlog from drifting out of sync with itself.

| Kind of thing | Home |
|---|---|
| **What shipped, what was decided and why** | `Prism3/docs/00-progress.md` — narrative history, most recent first, append-only. It records *what happened*; it is not a to-do list. |
| **Actionable backlog** | **GitHub issues.** Anything someone could pick up belongs here, not in doc prose. |
| **Ideas not yet scoped** | `Prism3/docs/27-future-ideas.md` — discovery-level, deliberately not issues yet. An idea graduates to an issue when it's actionable. |
| **Architecture, models, specs** | The numbered docs in `Prism3/docs/`. Add a new numbered file only for a genuinely new topic area; append, don't renumber. |

---

## 6. Issues and labels

Four templates: **feature**, **finding**, **decision needed**, **research/spike**. Title
prefix is the lane in brackets — `[engine]`, `[web]`, `[plugin]`, `[mcp]`, `[docs]`,
`[research]`, or `[decision]`.

Existing labels: `enhancement`, `finding`, `decision-needed`, `good first issue`, plus
the GitHub defaults.

**Not yet created — the lane set.** Every issue body already carries a `**Lane:**` line,
so this is vocabulary we maintain by hand in prose; as labels it makes the backlog
filterable, which is what someone picking up work actually needs:

```bash
gh label create lane:engine   --color 0E8A16 --description "The pure token generation engine"
gh label create lane:web      --color 1D76DB --description "The web dashboard / theme studio"
gh label create lane:plugin   --color 5319E7 --description "The Figma plugin (both contexts)"
gh label create lane:mcp      --color B60205 --description "MCP surface + agent-facing tooling"
gh label create lane:docs     --color 0052CC --description "Docs, specs, and durable state"
gh label create lane:research --color FBCA04 --description "Open questions and spikes"
```

Mark anything genuinely self-contained `good first issue` as you file it — it's much
harder to identify those retroactively than at the moment of writing.
