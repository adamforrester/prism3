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
prefix is the lane in brackets — `[engine]`, `[web]`, `[plugin]`, `[figma]`,
`[code-library]`, `[mcp]`, `[docs]`, or `[decision]`.

Every issue body opens with a `**Lane:** · **Type:** · **Source:**` line. Keep it: it's
what makes an issue readable as a brief, and it carries more than a label can.

### Two axes, one label from each

Labels answer two different questions, so they're two prefixed sets. **One `lane:` and one
`type:` per issue.** The prefixes are the grouping mechanism GitHub doesn't give us
natively — they sort together in the picker, and they keep the axes from reading as peers.

**`lane:` — who picks it up, and what gates it.**

| Lane | Covers | Gated by |
|---|---|---|
| `lane:engine` | The pure core **and `emit-figma`** | Engine tests, NB regression, byte-repro fixture, `out/*` discipline |
| `lane:web` | The dashboard / theme studio | `tsc` + build, headless drive |
| `lane:plugin` | The Figma plugin workspace | Two-context typecheck, shim tests, 0 `node:` builtins, live drive |
| `lane:figma` | **Canvas craft** — building components *in Figma*, canvas docs, library structure, Code Connect authoring | Design review; no code gates |
| `lane:code-library` | The **code** component library — headless core + its projections (WC, React, Storybook, `.ai.json`, usage docs) (`docs/19`) | TBD when the lane activates — Storybook, a11y, visual regression |
| `lane:mcp` | MCP surface + agent-facing tooling | Eval harness |
| `lane:docs` | **This repo's own** specs and durable state — the numbered docs, the progress log, this file | Review |
| `lane:token-press` | Cross-repo: Token Press ingestion / round-trip | Coordination, not code |

**`type:` — what kind of work.**

| Type | Use |
|---|---|
| `type:task` | Scoped build work. |
| `type:finding` | A defect with evidence. Bug fixes are a *type*, not a lane — a Storybook bug is `lane:code-library` + `type:finding`. |
| `type:decision` | A fork that needs a call before work proceeds. |
| `type:research` | A question to investigate. Deliberately a type, not a lane: research often spans lanes (#113 covers web, Figma **and** MCP). |

Plus one flag: **`good first issue`**. Mark it as you file — much harder to spot
retroactively than at the moment of writing.

### Three boundaries that get misread

**`emit-figma` vs the plugin vs canvas work** share only the word *Figma*. Three
verification models, three lanes. Use `[emit-figma]` in the title for specificity within
`lane:engine`.

**`lane:figma` vs `lane:code-library`** — building a component *on the canvas* is design
work; building it *in code* is dev work. A component needing both gets one issue per lane,
not one issue with two labels: different gates, usually different owners.

**`lane:docs` is internal only.** Usage / client design docs are a *projection of the
component definitions* (`19 §6`), so they're `lane:code-library`. If the docs **site**
becomes real (`19 §7.5` is still open), it earns `lane:doc-site` then — not before.

### Don't pre-split a lane

`lane:code-library` will be the broadest lane, and that's deliberate. The architecture says
its outputs are one job: React is *"a thin wrapper over the same headless core… adding a
target is a wrapper, not a re-implementation"* (`19 §3`), and Storybook stories are
*generated* from the definitions (`19 §5`). Splitting WC / React / Storybook into lanes
would encode a division the architecture exists to avoid.

Carry sub-area in the **title** (`[code-library/storybook]`) — free, and needs no
migration. Promote a sub-area to a label only when its volume actually justifies it. The
debt runs one way: renaming and adding labels is free, *splitting* one across many issues
is the expensive move, and a speculative label nobody applies is worse than a missing one
(see the legacy lanes below).

The one genuine future split is a **platform consumption target** — AEM (`docs/27` Idea 2)
is a different skill set and a downstream consumer, so it earns `lane:aem` when it starts.
Create it then.

### Reconciling the existing labels

`lane:generator` / `lane:emitter` / `lane:token-press` date from the two-thread era — a
*generator* thread and an *emitter* thread working in parallel. They were never documented
and haven't been applied since early July. Renaming preserves the label on existing issues.

```bash
# rename — lane:generator is today's lane:engine
gh label edit lane:generator --name lane:engine --color 0E8A16 --description "Pure core + emit-figma"

# lane:emitter folds INTO lane:engine — relabel its issues (#66) first, then delete
gh label delete lane:emitter

# keep — still a real cross-repo lane
gh label edit lane:token-press --color D4C5F9 --description "Cross-repo: Token Press ingestion/round-trip"

# the lanes that never had labels
gh label create lane:web          --color 1D76DB --description "The web dashboard / theme studio"
gh label create lane:plugin       --color 5319E7 --description "The Figma plugin (both contexts)"
gh label create lane:figma        --color F9D0C4 --description "Canvas craft — components in Figma, canvas docs, Code Connect"
gh label create lane:code-library --color 006B75 --description "The code component library — headless core + its projections (docs/19)"
gh label create lane:mcp          --color B60205 --description "MCP surface + agent-facing tooling"
gh label create lane:docs         --color 0052CC --description "This repo's own specs and durable state"

# the type axis — rename the three bare labels, add research
gh label edit task            --name type:task     --color C2E0C6 --description "Scoped build work"
gh label edit finding         --name type:finding  --color D93F0B --description "A defect with evidence"
gh label edit decision-needed --name type:decision --color FBCA04 --description "A fork that needs a call before work proceeds"
gh label create type:research --color FEF2C0 --description "A question to investigate — often spans lanes"

# optional: 'enhancement' (a GitHub default) now collides with type:task
gh label delete enhancement
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
