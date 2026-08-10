# Contributing to prism3

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
| [`docs/00-progress.md`](docs/00-progress.md) | The durable state log — status, decisions and why, most recent first. **Read the latest entries before starting anything**; the arc moves fast and your question may already be answered. |
| The lane doc for your work | `07-e2e-journey` (the pipeline + portable-core architecture), `18`/`22` (plugin), `11` (multi-brand north star), `23`–`26` (dashboard IA + UI conventions). Index in [`docs/`](docs/). |

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
npx tsx packages/engine/test.ts                     # unit tests — report the N/N
npx tsx packages/engine/mcp-test.ts                 # the MCP surface over real stdio — report the N/N
npx tsx packages/engine/nb-regression.ts            # must exit 0 (the New Balance reproduction)
npx tsx packages/engine/emit-dtcg.ts                # every alias resolves + every mode contrast contract passes
npx tsx packages/engine/emit-figma.ts               # the Figma import artifact
npx tsx packages/engine/regen.ts --check            # no committed artifact has drifted (#281) — the only gate reading the committed tree
npx tsx packages/engine/token-contract.ts --check   # the token-NAME contract hasn't broken (#464)
npx tsx packages/engine/lint-skills.ts              # shipped skills still make true claims
npx tsx packages/engine/lint-doc-gates.ts           # this checklist stays in sync with ci.yml (#613)
npx tsx packages/engine/lint-layout-claims.ts       # the docs describe the repo that EXISTS (#670), both
                                                    # directions: every claimed path resolves — from the
                                                    # doc's own directory, against `git ls-files` — and
                                                    # every tracked layer is named in the layout tables.
                                                    # The second half is the point: two of the three
                                                    # defects that filed this were ABSENCES, and no sweep
                                                    # for wrong strings finds a row that is not there
npx tsx packages/engine/lint-payload-manifest.ts     # every emitted artifact is classified payload or ours
                                                    # (#674). The manifest is AUTHORED, never regenerated:
                                                    # built from a scan it would classify each new artifact
                                                    # itself and call that a pass. Adding an emitted
                                                    # artifact FAILS this until a human classifies it. It
                                                    # checks a class is DECLARED, not that it is RIGHT —
                                                    # that is what the `why` on each rule is for
npx tsx packages/engine/typecheck-components.ts     # the component defs typecheck against their schema
                                                    # (#657). `tsc --noEmit` over the DECLARED scope in
                                                    # packages/engine/tsconfig.json — a check, not a
                                                    # build; the engine stays buildless and the gate
                                                    # asserts it. The half that is the point: every
                                                    # tracked def must be REPRESENTED in what tsc
                                                    # actually read, because a passing typecheck says
                                                    # nothing about which files it opened — before this,
                                                    # 1 of 5 defs was checked, via a plugin import
```

CI (`.github/workflows/ci.yml`) also runs the web and plugin gates below **on every PR,
unconditionally** — there is no "I only touched the engine" exemption, so don't skip them
locally just because your diff looks engine-only. (Two PRs shipped with `lint:classes`
silently broken because their Gates table stopped before reaching it — see `00-progress.md`.)

```bash
npm run typecheck    -w @prism3/studio      # tsc --noEmit — esbuild does NOT typecheck
npm run build        -w @prism3/studio
npm run check:ignore -w @prism3/studio      # Vercel ignore list still matches the real bundle
npm run lint:contrast -w @prism3/studio     # studio chrome clears its own contrast floors
npm run lint:classes  -w @prism3/studio     # no unreviewed class-name collision — a NEW
                                          # combination fails here until you add it to
                                          # ALLOWED in apps/studio/lint-classes.mjs
npm run typecheck -w @prism3/plugin      # BOTH contexts — main (no DOM) and ui (no figma.*)
npm run test      -w @prism3/plugin      # write / readback / persist / float / styles shims
npm run build     -w @prism3/plugin      # dist/main.js must contain 0 `node:` builtins
npm run check:consumability -w @prism3/tokens  # a STOCK Style Dictionary over EVERY emitted brand —
                                          # characterization gate: pins each brand's mode collapse
                                          # (permanent, #609); asserts as a RULE that the conforming
                                          # projection carries ZERO non-DTCG $types, checked against
                                          # the spec list not a corruption count, and pins at 2 the
                                          # standard types SD cannot serialize (#635, split by #642);
                                          # asserts the base+overlay projection reads back, and
                                          # refuses custom preprocessors
npx tsx packages/engine/lint-us-english.ts # run AFTER the web build — its scope includes apps/studio/dist/*.js
npx tsx packages/engine/lint-voice.ts      # voice-standard.md §2 banned-phrase list (#617) — sibling to lint-us-english.ts, same reason it runs here
```

**Green tests are not the finish line.** The standard here is that the change is
*driven* — the web UI verified headless, the plugin driven live against a real Figma
document. Live driving has repeatedly caught what in-memory shims hid (see the #148
`getLocalVariablesAsync('COLOR')` bug in `00-progress.md`, where the shims ignored the
type filter and the FLOAT read-back would have come back empty in production).

### Adding a gate? Prove it can fail

**A gate is only as strong as the independence of the two things it compares.** If you write a
new check, mutate the thing it checks and confirm **your** gate is in the failure list — not
merely that the suite went red. That distinction has mattered more than a dozen times in this repo
(the register is in the doc below): once a mutation produced 7 failures and the new gate was not among
them, because it was asserting `helper === helper`; and a lint self-check passed every sample while a
real en-GB spelling shipped, because it re-implemented the scan instead of calling it. Read
[`docs/34-gate-independence.md`](docs/34-gate-independence.md) before writing the gate
rather than after.

The reviewer-facing half: **duplication between a gate and its subject is usually load-bearing.**
Routing both through one helper is the obvious cleanup and it silently deletes the gate, leaving
no failing test and a diff that looks like an improvement. If you're about to suggest that
cleanup, check for a comment explaining why the duplication is there.

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
`CLAUDE.md` and the latest entries in `docs/00-progress.md`, then the doc for
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

If you're using the packaged skills, `skills/prism3-theme` (authoring a brand)
and `skills/prism3-consume` (building UI from generated tokens) are the two that
exist; `.claude/commands/review-pr.md` runs an independent PR review.

---

## 5. Where things live

Keeping these separate is what stops the backlog from drifting out of sync with itself.

| Kind of thing | Home |
|---|---|
| **What shipped, what was decided and why** | `docs/00-progress.md` — narrative history, most recent first, append-only. It records *what happened*; it is not a to-do list. |
| **Actionable backlog** | **GitHub issues.** Anything someone could pick up belongs here, not in doc prose. |
| **Ideas not yet scoped** | `docs/27-future-ideas.md` — discovery-level, deliberately not issues yet. An idea graduates to an issue when it's actionable. |
| **Architecture, models, specs** | The numbered docs in `docs/`. Add a new numbered file only for a genuinely new topic area; append, don't renumber. |
| **Agent-generated design specs + implementation plans** | `docs/superpowers/specs/` and `docs/superpowers/plans/`, one dated file per piece of work (`YYYY-MM-DD-<topic>.md`). These are the *working record of a single change* — the design dialogue that preceded it and the task-by-task plan it was built from — so they ride in the feature PR and are not edited afterwards. Durable conclusions still land in `00-progress.md` and the numbered docs; this directory is not a second home for them. |

---

## 6. Issues and labels

Four templates: **feature**, **finding**, **decision needed**, **research/spike**. Title
prefix is the lane in brackets — `[engine]`, `[web]`, `[plugin]`, `[figma]`,
`[code-library]`, `[mcp]`, `[docs]`, or `[decision]`.

Every issue body opens with a `**Lane:** · **Type:** · **Source:**` line. Keep it: it's
what makes an issue readable as a brief, and it carries more than a label can.

**Optional, on the same line when they apply: `**Extends:**` and `**Related:**`** —
formalized 2026-07-29 after #269 used them well (a font-family model issue that names
what it builds on and what it's adjacent to, distinct from *where it came from*). `Source:`
answers provenance (owner direction / a review / a PR follow-up); `Extends:`/`Related:`
answer connection (what this issue builds on top of, what it sits next to) — a different
axis `Source:` was never meant to carry. Use `Extends: #NNN (one-clause why)` when this
issue is a direct continuation of another; `Related: #NNN, #MMM` for adjacency worth a
reader's attention. Optional — most issues don't need either.

### Two axes, one label from each

Labels answer two different questions, so they're two prefixed sets. **One `lane:` and one
`type:` per issue.** The prefixes are the grouping mechanism GitHub doesn't give us
natively — they sort together in the picker, and they keep the axes from reading as peers.

**`lane:` — who picks it up, and what gates it.**

| Lane | Covers | Gated by |
|---|---|---|
| `lane:engine` | The pure core **and `emit-figma`** | Engine tests, NB regression, byte-repro fixture, `out/*` discipline |
| `lane:studio` | The dashboard / theme studio (`apps/studio`, `@prism3/studio`) | `tsc` + build, headless drive |
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

Plus two routing flags, both optional: **`good first issue`** (self-contained enough for
someone new to the repo) and **`help wanted`** (needs attention beyond the usual). Mark
`good first issue` as you file — much harder to spot retroactively than at the moment of
writing.

**`priority:now`** — the one label that answers "what's helpful to pick up first," which
`lane:`/`type:` deliberately don't (they answer *what kind*, not *what order*). Applied to
issues with **no stated blocker** — read literally: no `**Depends on:**` line in the body,
and (for a `type:decision`) nothing waiting on an owner call first. It is *not* a ranking
within that set — just the readiness filter. Computed once (2026-07-28) from the
`Depends on:` chains written into issue bodies across the custom-mode-arc and
code-library backlog passes; nobody's maintaining it as issues open and close, so treat it
as a snapshot to re-derive, not a live feed. Only `priority:now` exists — no
`priority:next`/`priority:later`; an unused tier is worse than no tier (see `lane:emitter`'s
fate, above). Add those only once there's something real to put in them.

These 15 are the whole set. GitHub's stock labels were removed deliberately: `bug`,
`documentation`, and `question` collided with `type:finding` / `lane:docs` /
`type:research`, and `duplicate` / `invalid` / `wontfix` are better served by the native
`state_reason` on close. If you find yourself wanting a new label, check it isn't a
sub-area that belongs in the title first (see below).

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

### History (why some old issues look different)

The taxonomy above went live 2026-07-28. Before it, labels were `lane:generator` /
`lane:emitter` / `lane:token-press` plus bare `task` / `finding` / `decision-needed` —
vocabulary from the two-thread era, when a *generator* thread and an *emitter* thread ran
in parallel. Those were renamed in place (so closed issues kept their labels),
`lane:emitter` folded into `lane:engine`, and the colliding GitHub stock labels were
removed.

Nothing here to run — this note exists so an old issue's label history reads sensibly.

## 7. Use the tracker's structure, not prose

Three GitHub features replace conventions we currently maintain by hand. Prefer them —
prose relationships don't survive contact with a second contributor.

**Dependencies over "Blocked by:" prose, where you can set them.** GitHub's native
issue-to-issue "blocked by"/"blocking" is a UI feature (Issues → Development sidebar) and
a GraphQL mutation; the GitHub MCP tooling used in agent sessions here **cannot write it**
— only read it (`issue_dependencies_summary`) — so an agent can't set this for you. If a
dependency matters, set it yourself in the UI, or ask an agent to hand you a `gh api
graphql` command. Otherwise state it in the body as `**Depends on:** #NNN` and accept that
it's prose until someone sets the real one. (Audited 2026-07-28: of the 12 open issues at
the time, only #112 had a stated blocker, and it referenced #115 — already closed. So
there was nothing live to convert; the note was corrected instead. See #112's comments.)

**Sub-issues over checklists in epics.** A phased epic (#176 is the model) should carry
its phases as sub-issues (`sub_issue_write` in the GitHub MCP *can* do this), so someone
can take one phase without owning the whole arc. Done for #176: A1/A2/B/C1/C2/D are now
issues #246–#251, nested under #176 in that order. Their sequencing (A2 needs A1, C1 needs
A1+B, C2 needs C1, D needs A1+C1) is stated as `**Depends on:**` prose in each body for the
same reason — no write access to native dependencies from here.

**Projects for prioritisation — still the right long-term tool, not yet built.** Labels
answer *what kind*; a project board answers *what's next*, with visual ordering and status
a label can't carry. `priority:now` (§6) is the interim, lower-cost stand-in — computed
once, not a live view — because this GitHub MCP setup has no Projects-write access, only
`gh`/the web UI does. Build the board there if the curation overhead is worth it for the
team; keep sequencing off doc prose either way, which goes stale (the 07-18 progress entry
still lists three issues as open that have since been closed).

Note: GitHub **issue types** are an organisation-level feature and aren't available on
this account — labels remain the type mechanism.
