# 33 — Skills: what to adopt, what to point at a gate, and what to leave

> Prism3 already ships two skills and will need more — an internal lane for building components, and
> shipped lanes for building *with* the system. Rather than write them from scratch, we surveyed the
> field. The survey's most useful output was not a list of skills to take; it was a **rule for
> deciding**, because roughly a third of the best available skills describe work this engine already
> does deterministically. This file records the rule, the resulting adopt/adapt/skip calls, and the
> sequencing. Companion to `32-component-build-learnings.md` (the raw findings) and issue #492.

---

## 1. The deciding rule

> **Where we have a gate, an LLM skill is a regression.**

A skill that *advises* a semantic-version bump is strictly weaker than a command that *refuses the
commit*. `token-contract.ts --accept` will not record a breaking change until `CONTRACT_VERSION` has
already been raised by the increment the diff requires — no judgment, no persuasion, no drift. An
agent asked to "recommend a versioning strategy" over the same repository can only re-derive, less
reliably, a conclusion the gate already enforces.

So the survey question is never "is this skill good?" It is:

1. **Do we have a gate for this?** → Do not adopt. Point the skill at the gate instead: a one-line
   instruction to run the command and read its classification beats a page of prose reasoning.
2. **Is it a judgment we genuinely repeat by hand?** → Adapt it, keeping our checks.
3. **Does it assume the agent AUTHORS the tokens?** → Reject that phase outright. Ours are generated,
   contrast-verified and name-gated; an agent inventing a token layer is a downgrade, not a start.

Point 3 is the one that disqualifies the most external material, and it is invisible until you read
the skill's first phase.

## 2. Sources surveyed

| source | license | verdict |
|---|---|---|
| `murphytrueman/design-system-ops` — 34 skills, audit/govern/document/validate | **MIT** | adapt a subset |
| `figma/mcp-server-guide` — Figma's own agent skills | **none stated** | learn facts, invoke at runtime, copy nothing |
| `firebenders/sync-figma-token-skill` | not established | take the *model*, not the code |
| `travisvn/awesome-claude-skills` | n/a (index) | nothing in this domain yet |
| `adamforrester/brand-skills` | ours | already integrated — see §5 |

**On the Figma repo specifically:** no LICENSE file, no badge, no SPDX statement — only *"By using
the Figma MCP server and the related resources (including these skills), you agree to the Figma
Developer Terms."* An unlicensed repository grants no copying rights. So the rule there is a
requirement, not a preference: **learn the facts, write our own words, copy no text.** API behaviours
are facts about a system and are not copyrightable; the prose describing them is.

This generalizes into a policy worth keeping: **fork the judgment, defer on the API.** A skill's
opinions about sequencing are ours to rewrite and improve. Its knowledge of call shapes for an API we
do not control goes stale in a fork — so invoke the upstream skill at runtime (`figma-use` is already
declared mandatory before `use_figma`) rather than restating what it knows.

## 3. `design-system-ops` — the overlap map

Applying §1's rule to all 34 skills. **Do not adopt** (a gate already exists):

| their skill | our gate |
|---|---|
| `version-bump-advisor` | `token-contract.ts` — refuses an unbumped breaking change |
| `drift-detection` | `regen.ts --check` — 88 artifacts, byte-compared |
| `token-compliance`, `token-audit` | `scoreContractCompliance`; `isPrimitiveRef` primitive-leak warning |
| `component-api-validator` | `validateComponentDef` + `figmaPropertyErrors` |
| `schema-validator` | the hand-rolled validator over `theme-schema.json` |
| `accessibility-per-component` | the per-mode contrast contracts |
| `deprecation-process` | the `DEPRECATIONS` table + its dangling-replacement gate |
| `cicd-integration` | `.github/workflows/ci.yml` |
| `ai-component-description`, `context-engine-builder`, `metadata-schema-generator` | `.ai.json` + `ComponentDef.ai` |
| `naming-audit`, `theme-audit` | the token-name contract + mode resolution |

**Adopt / adapt** (no gate exists, and the judgment is real):

| skill | why it earns a place here |
|---|---|
| `figma-variable-audit` | **the biggest hole.** Every gate we own compares the engine to itself or its own output. Nothing verifies a *live Figma file* still matches what we emitted — a hand-edited variable in a client file is invisible today. |
| `codemod-generator` | pairs with `DEPRECATIONS` to *apply* a migration rather than describe one. Our table names the replacement path; nothing turns that into an edit. |
| `docs-coverage` | we have no measure of documentation completeness at all. |
| `contribution-workflow`, `change-communication`, `release-retrospective` | genuinely human/organizational work, outside anything a gate can hold. Highest value for the consulting practice, lowest for the engine. |
| `system-benchmark` | maturity comparison; useful in an engagement, not in CI. |

**Leave:** `session-memory` (the harness handles it), `triage`, `backlog-generator`,
`decision-record` (our `00-progress.md` decisions log already does this, in a form tied to commits),
`governance-encoder`, `component-decision-tree`, `pattern-documentation`, `usage-guidelines`,
`design-to-code-check`, `system-health`, `codebase-index`, `component-audit`.

That is **~5 to adopt out of 34** — and the small number is the point. It reflects how much of this
work Prism3 has already made mechanical.

## 4. Our own skills: the gate comes first

Two skills ship today (`Prism3/skills/prism3-theme`, `prism3-consume`) and **`prism3-theme` is already
stale**: line 82 still teaches an agent to "map adjectives → levers — the judgment the brief pays
for", which #471 replaced with a controlled vocabulary the engine resolves *and logs*. An agent
following it hand-picks numbers and loses the audit trail. Line 61 documents `radiusScale` as
number-only.

**Nothing caught that**, because skills are shipped surfaces with no gate — unlike `out/**`, the
emitted schema contracts and `web/dist`, all of which the US-English gate already scans.

So the order is not negotiable:

1. **Gate the skills first.** Mechanically checkable without judgment: every lever, token or prop name
   a skill quotes must resolve against the live manifest / schema / emitted names; every CLI
   invocation it prints must actually run; and `Prism3/skills/**` joins the US-English scan. The
   `personality` drift above is exactly what check one catches.
2. **Fix `prism3-theme`** — it is wrong today, and it is the skill most likely to be used.
3. **Then write the internal `build-component` lane**, and not before a second component has gone
   through the pipeline. Button is a sample of one; a skill written now would encode its accidents as
   rules. `docs/32` is the backlog it should draw from.
4. **Then adapt the five** from §3, starting with `figma-variable-audit`.

## 5. `brand-skills` — already integrated, and worth stating as architecture

`adamforrester/brand-skills` emits a `design.md` following the `google-labs-code/design.md` spec —
exactly what `standard-design-md.ts` names in its own header. Wendy's is a fixture in both repos. **The
two systems already interoperate**; it has simply never been written down as an architectural fact,
and it is the best existing answer to "where does a brand brief come from before Prism3 sees it."

That handshake had a live defect, found while writing this file and fixed separately: `x-prism3`
rejected the named stops the native dialect accepts, and dropped `personality` silently. Recorded
here because it is the class that matters — **an integration nobody has named is an integration
nobody tests.** The fixture we ship (`wendys.design.md`) carries no `x-prism3` block at all, so the
extension point the two systems meet at was entirely unexercised.

Open and worth closing: whether the `.brand/` schema's tiers (minimum / standard / comprehensive, per
xd-toolkit's copy — unconfirmed against the source) correspond to anything the engine reads. If they
have drifted from what `standardToBrandInput` expects, **neither repository would currently notice.**

## 6. Where skills go

The layout already exists and splits by audience. Keep it; do not invent a third location.

| location | audience |
|---|---|
| `Prism3/skills/` | **shipped** — agents building *with* Prism3 (`prism3-theme`, `prism3-consume`) |
| `.claude/commands/` | **internal** — our own workflow on this repo (`review-pr`) |

The internal `build-component` lane is the one open placement question: `review-pr` is a *command*
because it is invoked deliberately against a PR, whereas a build-a-component lane is invoked when the
task matches, which is skill-shaped. Decide once, for the class, rather than per item.
