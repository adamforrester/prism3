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

Every issue body opens with a `**Lane:** · **Type:** · **Source:**` line. Keep it: it's
what makes an issue readable as a brief, and it carries more than a label can.

### Current labels

| Label | Use |
|---|---|
| `finding` | A defect with evidence. |
| `decision-needed` | A fork that needs a call before work proceeds. |
| `task` | Scoped build work. (`enhancement`, a GitHub default, overlaps — prefer `task`.) |
| `lane:generator` · `lane:emitter` · `lane:token-press` | **Legacy lane vocabulary — see below.** |
| `good first issue` | Self-contained enough for someone new to the repo. |

Mark anything self-contained `good first issue` as you file it — much harder to spot
retroactively than at the moment of writing.

### The lane set

**Lanes split by verification model** — what gates the work, and therefore who (or which
agent) can pick it up. That's the useful axis for routing; it's why `emit-figma` sits with
the engine rather than with the other Figma-adjacent work.

| Lane | Covers | Gated by |
|---|---|---|
| `lane:engine` | The pure core **and `emit-figma`** | Engine tests, NB regression, byte-repro fixture, `out/*` discipline |
| `lane:web` | The dashboard / theme studio | `tsc` + build, headless drive |
| `lane:plugin` | The Figma plugin workspace | Two-context typecheck, shim tests, 0 `node:` builtins, live drive |
| `lane:figma` | **Canvas craft** — building components, canvas docs, library structure, Code Connect authoring | Design review; no code gates |
| `lane:components` | The code component library (`docs/19`) | TBD when the lane activates — Storybook, a11y, visual regression |
| `lane:mcp` | MCP surface + agent-facing tooling | Eval harness |
| `lane:docs` | Docs, specs, durable state | Review |
| `lane:research` | Open questions and spikes | A named verdict |
| `lane:token-press` | Cross-repo: Token Press ingestion / round-trip | Coordination, not code |

`emit-figma`, the plugin, and canvas work share only the word *Figma* — they have three
different verification models, so they're three lanes. Put `[emit-figma]` in the title
when you need that specificity within `lane:engine`.

### Reconciling the existing labels

The current labels (`lane:generator`, `lane:emitter`, `lane:token-press`) date from the
two-thread era — a *generator* thread and an *emitter* thread working in parallel. They
were never documented and haven't been applied since early July, so the taxonomy is
vocabulary-in-prose today. Renaming preserves the label on existing issues:

```bash
# rename — lane:generator is today's lane:engine
gh label edit lane:generator --name lane:engine --color 0E8A16 --description "Pure core + emit-figma"

# lane:emitter folds INTO lane:engine — relabel its issues (#66 and friends), then delete
gh label delete lane:emitter

# keep — still a real cross-repo lane
gh label edit lane:token-press --color D4C5F9 --description "Cross-repo: Token Press ingestion/round-trip"

# create the lanes that never had labels
gh label create lane:web        --color 1D76DB --description "The web dashboard / theme studio"
gh label create lane:plugin     --color 5319E7 --description "The Figma plugin (both contexts)"
gh label create lane:figma      --color F9D0C4 --description "Canvas craft — components, canvas docs, Code Connect"
gh label create lane:components --color 006B75 --description "The code component library (docs/19)"
gh label create lane:mcp        --color B60205 --description "MCP surface + agent-facing tooling"
gh label create lane:docs       --color 0052CC --description "Docs, specs, and durable state"
gh label create lane:research   --color FBCA04 --description "Open questions and spikes"
```

## 7. Use the tracker's structure, not prose

Three GitHub features replace conventions we currently maintain by hand. Prefer them —
prose relationships don't survive contact with a second contributor.

**Dependencies over "Blocked by:" prose.** Several issues state blocking in the body
(`**Blocked by:** #115`). Set the native dependency instead. It makes the backlog
*queryable* for what's actually ready to pick up, which is the thing a new contributor
most needs and can least work out for themselves.

**Sub-issues over checklists in epics.** A phased epic (#176 is the model — six phases as
markdown checkboxes) should carry its phases as sub-issues, so someone can take phase A1
without owning the whole arc.

**Projects for prioritisation.** Labels answer *what kind*; a project board answers
*what's next*. Keep sequencing there rather than in doc prose, which goes stale (the
07-18 progress entry still lists three issues as open that have since been closed).

Note: GitHub **issue types** are an organisation-level feature and aren't available on
this account — labels remain the type mechanism.
